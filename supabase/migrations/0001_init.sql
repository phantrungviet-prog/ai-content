-- Schema for the AI content tool. Run once in Supabase: SQL Editor -> paste -> Run.

-- Only users listed here may use the admin tool. Signing up alone grants nothing.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Encoded in printed QR codes: never change it once a client goes live.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type text not null default 'restaurant' check (type in ('shop', 'restaurant')),
  logo_url text,
  phone text,
  zalo text,
  address text,
  map_url text,
  intro text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  price integer check (price >= 0),
  description text,
  original_image_path text,
  studio_image_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index products_client_id_idx on public.products (client_id);

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  platform text not null check (platform in ('facebook', 'tiktok', 'description')),
  tone text,
  body text not null,
  hashtags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index content_posts_client_id_idx on public.content_posts (client_id);

-- One menu per client.
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  title text,
  is_published boolean not null default false,
  source_image_paths text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);
create index menu_categories_menu_id_idx on public.menu_categories (menu_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  name text not null,
  description text,
  -- VND; null when the menu shows no single price (e.g. only size variants).
  price integer check (price >= 0),
  -- [{ "label": "Size L", "price": 35000 }]
  options jsonb not null default '[]',
  image_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index menu_items_category_id_idx on public.menu_items (category_id);

-- Row level security: admins do everything; anonymous visitors only read published menus.
alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.content_posts enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy "admins read self" on public.admins for select using (user_id = auth.uid());

create policy "admin all" on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.content_posts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.menus for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.menu_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());

create policy "public read clients" on public.clients for select using (true);
create policy "public read products" on public.products for select using (true);
create policy "public read published menus" on public.menus for select using (is_published);
create policy "public read published categories" on public.menu_categories for select using (
  exists (select 1 from public.menus m where m.id = menu_id and m.is_published)
);
create policy "public read published items" on public.menu_items for select using (
  exists (
    select 1 from public.menu_categories c join public.menus m on m.id = c.menu_id
    where c.id = category_id and m.is_published
  )
);

-- Storage: raw uploads stay private; processed images are public.
insert into storage.buckets (id, name, public) values ('originals', 'originals', false), ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

create policy "admin all originals" on storage.objects for all
  using (bucket_id = 'originals' and public.is_admin())
  with check (bucket_id = 'originals' and public.is_admin());
create policy "admin write public-assets" on storage.objects for all
  using (bucket_id = 'public-assets' and public.is_admin())
  with check (bucket_id = 'public-assets' and public.is_admin());

-- Replaces a client's whole menu atomically, so a failed save never leaves a live menu half-empty.
-- security invoker: the caller's RLS policies still apply.
-- p_categories: [{ "name": "...", "items": [{ "name", "description", "price", "options", "is_available" }] }]
create or replace function public.save_menu(p_client_id uuid, p_title text, p_published boolean, p_categories jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_menu_id uuid;
  v_category_id uuid;
  v_category jsonb;
  v_category_index integer;
begin
  insert into public.menus (client_id, title, is_published, updated_at)
  values (p_client_id, p_title, p_published, now())
  on conflict (client_id) do update
    set title = excluded.title, is_published = excluded.is_published, updated_at = now()
  returning id into v_menu_id;

  delete from public.menu_categories where menu_id = v_menu_id;

  for v_category, v_category_index in
    select value, ordinality::integer from jsonb_array_elements(p_categories) with ordinality
  loop
    insert into public.menu_categories (menu_id, name, sort_order)
    values (v_menu_id, v_category ->> 'name', v_category_index)
    returning id into v_category_id;

    insert into public.menu_items (category_id, name, description, price, options, is_available, sort_order)
    select
      v_category_id,
      item ->> 'name',
      nullif(item ->> 'description', ''),
      (item ->> 'price')::integer,
      coalesce(item -> 'options', '[]'::jsonb),
      coalesce((item ->> 'is_available')::boolean, true),
      ordinality::integer
    from jsonb_array_elements(v_category -> 'items') with ordinality as t(item, ordinality);
  end loop;
end;
$$;
