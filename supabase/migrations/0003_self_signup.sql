-- Self-signup: shop owners manage their own shop; admins (super admin) still manage every shop.
-- Run in Supabase SQL Editor. Runs in one transaction: either everything applies or nothing does.
begin;

-- One account = one shop. Shops created by the admin before self-signup keep owner_id = null.
alter table public.clients
  add column owner_id uuid unique references auth.users (id) on delete set null,
  add column is_disabled boolean not null default false;

-- True when the caller is an admin or owns the client. security definer so policies on clients can call it
-- without recursing into clients' own RLS.
create or replace function public.can_manage(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or exists (select 1 from public.clients where id = p_client_id and owner_id = auth.uid());
$$;

-- Storage paths start with the client id; a folder that is not a UUID yields null instead of a cast error.
create or replace function public.safe_uuid(p text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

-- Owners may edit their shop's details, but not who owns it, whether it is disabled, or its slug (printed in QR codes).
create or replace function public.guard_client_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() and (
    new.owner_id is distinct from old.owner_id
    or new.is_disabled is distinct from old.is_disabled
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Không được đổi chủ shop, trạng thái khóa hoặc đường dẫn.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger clients_guard_update before update on public.clients
  for each row execute function public.guard_client_update();

-- Replace the admin-only policies.
drop policy "admin all" on public.clients;
drop policy "admin all" on public.products;
drop policy "admin all" on public.content_posts;
drop policy "admin all" on public.menus;
drop policy "admin all" on public.menu_categories;
drop policy "admin all" on public.menu_items;
drop policy "public read clients" on public.clients;
drop policy "public read products" on public.products;
drop policy "public read published menus" on public.menus;
drop policy "public read published categories" on public.menu_categories;
drop policy "public read published items" on public.menu_items;

create policy "manage read" on public.clients for select using (public.can_manage(id));
create policy "owner insert" on public.clients for insert with check (
  public.is_admin() or (owner_id = auth.uid() and not is_disabled)
);
create policy "manage update" on public.clients for update using (public.can_manage(id)) with check (public.can_manage(id));
create policy "admin delete" on public.clients for delete using (public.is_admin());

create policy "manage all" on public.products for all
  using (public.can_manage(client_id)) with check (public.can_manage(client_id));
create policy "manage all" on public.content_posts for all
  using (public.can_manage(client_id)) with check (public.can_manage(client_id));
create policy "manage all" on public.menus for all
  using (public.can_manage(client_id)) with check (public.can_manage(client_id));
create policy "manage all" on public.menu_categories for all
  using (exists (select 1 from public.menus m where m.id = menu_id and public.can_manage(m.client_id)))
  with check (exists (select 1 from public.menus m where m.id = menu_id and public.can_manage(m.client_id)));
create policy "manage all" on public.menu_items for all
  using (exists (
    select 1 from public.menu_categories c join public.menus m on m.id = c.menu_id
    where c.id = category_id and public.can_manage(m.client_id)
  ))
  with check (exists (
    select 1 from public.menu_categories c join public.menus m on m.id = c.menu_id
    where c.id = category_id and public.can_manage(m.client_id)
  ));

-- Public pages: a disabled shop disappears together with its products and menu.
create policy "public read clients" on public.clients for select using (not is_disabled);
create policy "public read products" on public.products for select using (
  exists (select 1 from public.clients c where c.id = client_id and not c.is_disabled)
);
create policy "public read published menus" on public.menus for select using (
  is_published and exists (select 1 from public.clients c where c.id = client_id and not c.is_disabled)
);
create policy "public read published categories" on public.menu_categories for select using (
  exists (
    select 1 from public.menus m join public.clients c on c.id = m.client_id
    where m.id = menu_id and m.is_published and not c.is_disabled
  )
);
create policy "public read published items" on public.menu_items for select using (
  exists (
    select 1 from public.menu_categories mc
    join public.menus m on m.id = mc.menu_id
    join public.clients c on c.id = m.client_id
    where mc.id = category_id and m.is_published and not c.is_disabled
  )
);

-- Storage: the first folder of every path is the client id.
drop policy "admin all originals" on storage.objects;
drop policy "admin write public-assets" on storage.objects;

create policy "manage originals" on storage.objects for all
  using (bucket_id = 'originals' and public.can_manage(public.safe_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'originals' and public.can_manage(public.safe_uuid((storage.foldername(name))[1])));
create policy "manage public-assets" on storage.objects for all
  using (bucket_id = 'public-assets' and public.can_manage(public.safe_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'public-assets' and public.can_manage(public.safe_uuid((storage.foldername(name))[1])));

-- One row per AI call, written before calling Gemini, to enforce daily limits on the shared free-tier quota.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('menu', 'post', 'image')),
  created_at timestamptz not null default now()
);
create index ai_usage_client_id_created_at_idx on public.ai_usage (client_id, created_at);
create index ai_usage_created_at_idx on public.ai_usage (created_at);

alter table public.ai_usage enable row level security;
create policy "manage read" on public.ai_usage for select using (public.can_manage(client_id));
create policy "manage insert" on public.ai_usage for insert with check (public.can_manage(client_id) and user_id = auth.uid());

-- Calls across all shops since p_since, for the global daily cap. Returns only a count.
create or replace function public.ai_usage_global_count(p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.ai_usage where created_at >= p_since;
$$;
revoke execute on function public.ai_usage_global_count(timestamptz) from public, anon;
grant execute on function public.ai_usage_global_count(timestamptz) to authenticated;

-- Super admin dashboard: every shop with its owner's email and today's AI calls (Vietnam time).
create or replace function public.admin_list_clients()
returns table (
  id uuid,
  name text,
  slug text,
  type text,
  is_disabled boolean,
  owner_email text,
  menu_published boolean,
  ai_today integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      c.id, c.name, c.slug, c.type, c.is_disabled,
      u.email::text,
      coalesce(m.is_published, false),
      (select count(*)::integer from public.ai_usage a
        where a.client_id = c.id
          and a.created_at >= (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')),
      c.created_at
    from public.clients c
    left join auth.users u on u.id = c.owner_id
    left join public.menus m on m.client_id = c.id
    order by c.created_at desc;
end;
$$;
revoke execute on function public.admin_list_clients() from public, anon;
grant execute on function public.admin_list_clients() to authenticated;

commit;
