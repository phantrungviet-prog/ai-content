-- One catalog per client: products are the catalog, and each menu item links to the product with its name.
-- Run in Supabase SQL Editor after 0003. Runs in one transaction: either everything applies or nothing does.
-- Safe to run again: steps that already happened are skipped (a partial run once left a project half-migrated).
begin;

alter table public.menu_items add column if not exists product_id uuid references public.products (id) on delete set null;
create index if not exists menu_items_product_id_idx on public.menu_items (product_id);
create index if not exists products_client_id_lower_name_idx on public.products (client_id, lower(trim(name)));

-- Featured products are the ones the public site (/s/[slug]) shows. Menus can create dozens of products,
-- so new ones are not featured; products that existed before this migration are, so live sites stay the same.
-- The backfill runs only when the column is created, so a rerun does not star products made from menus.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'is_featured'
  ) then
    alter table public.products add column is_featured boolean not null default false;
    update public.products set is_featured = true;
  end if;
end;
$$;

-- A menu item may only point to a product of the same client (otherwise an owner could show another shop's photos).
drop policy if exists "manage all" on public.menu_items;
create policy "manage all" on public.menu_items for all
  using (exists (
    select 1 from public.menu_categories c join public.menus m on m.id = c.menu_id
    where c.id = category_id and public.can_manage(m.client_id)
  ))
  with check (exists (
    select 1 from public.menu_categories c join public.menus m on m.id = c.menu_id
    where c.id = category_id and public.can_manage(m.client_id)
      and (product_id is null or exists (select 1 from public.products p where p.id = product_id and p.client_id = m.client_id))
  ));

-- Same contract as before (replaces the whole menu atomically, security invoker so RLS applies), and now
-- links each item to the client's product with the same name (case-insensitive), creating it if missing and
-- copying the item's price onto it. Renaming an item therefore creates a new product; the old one stays.
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
  v_item jsonb;
  v_item_index integer;
  v_name text;
  v_price integer;
  v_product_id uuid;
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

    for v_item, v_item_index in
      select value, ordinality::integer from jsonb_array_elements(v_category -> 'items') with ordinality
    loop
      v_name := trim(v_item ->> 'name');
      v_price := (v_item ->> 'price')::integer;

      select id into v_product_id from public.products
      where client_id = p_client_id and lower(trim(name)) = lower(v_name)
      order by created_at
      limit 1;

      if v_product_id is null then
        insert into public.products (client_id, name, price, description)
        values (p_client_id, v_name, v_price, nullif(v_item ->> 'description', ''))
        returning id into v_product_id;
      elsif v_price is not null then
        -- Items priced only by size (options) leave the product's price alone.
        update public.products set price = v_price where id = v_product_id and price is distinct from v_price;
      end if;

      insert into public.menu_items (category_id, name, description, price, options, is_available, sort_order, product_id)
      values (
        v_category_id,
        v_name,
        nullif(v_item ->> 'description', ''),
        v_price,
        coalesce(v_item -> 'options', '[]'::jsonb),
        coalesce((v_item ->> 'is_available')::boolean, true),
        v_item_index,
        v_product_id
      );
    end loop;
  end loop;
end;
$$;

commit;
