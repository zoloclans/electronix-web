-- ELECTRONIX / SUPABASE
-- Ejecuta este archivo una vez en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  stock integer not null default 0 check (stock >= 0),
  tiers jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists "Catalog public read" on public.products;
create policy "Catalog public read"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "Admin insert products" on public.products;
create policy "Admin insert products"
on public.products
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Admin update products" on public.products;
create policy "Admin update products"
on public.products
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "Admin delete products" on public.products;
create policy "Admin delete products"
on public.products
for delete
to authenticated
using ((select auth.uid()) is not null);

-- Bucket público para imágenes.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public product images read" on storage.objects;
create policy "Public product images read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admin product images insert" on storage.objects;
create policy "Admin product images insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and (select auth.uid()) is not null);

drop policy if exists "Admin product images update" on storage.objects;
create policy "Admin product images update"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and (select auth.uid()) is not null)
with check (bucket_id = 'product-images' and (select auth.uid()) is not null);

drop policy if exists "Admin product images delete" on storage.objects;
create policy "Admin product images delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and (select auth.uid()) is not null);

-- Datos iniciales.
insert into public.products (slug,name,stock,tiers,images,active,display_order)
values
(
  'pic18f57q43',
  'PIC18F57Q43',
  18,
  '[{"min":1,"price":145},{"min":6,"price":140},{"min":12,"price":136}]'::jsonb,
  '[]'::jsonb,
  true,
  1
),
(
  'pic18f47q10',
  'PIC18F47Q10',
  24,
  '[{"min":1,"price":139},{"min":6,"price":134},{"min":12,"price":130}]'::jsonb,
  '[]'::jsonb,
  true,
  2
),
(
  'epm240t100c5',
  'CPLD EPM240T100C5',
  10,
  '[{"min":1,"price":89},{"min":4,"price":84},{"min":8,"price":80}]'::jsonb,
  '[]'::jsonb,
  true,
  3
),
(
  'usb-blaster',
  'USB BLASTER',
  30,
  '[{"min":1,"price":39},{"min":5,"price":36},{"min":10,"price":33}]'::jsonb,
  '[]'::jsonb,
  true,
  4
)
on conflict (slug) do nothing;
