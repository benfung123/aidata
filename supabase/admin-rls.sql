-- Tighten write access: only the admin email may INSERT/UPDATE/DELETE.
-- Run AFTER schema.sql (which creates the broader authenticated policies this replaces).

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select auth.jwt() ->> 'email' = 'benfung123@gmail.com';
$$;

drop policy if exists "organizations_auth_all" on public.organizations;
create policy "organizations_admin_all" on public.organizations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_auth_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "datasets_auth_all" on public.datasets;
create policy "datasets_admin_all" on public.datasets
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "resources_auth_all" on public.resources;
create policy "resources_admin_all" on public.resources
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "dataset_categories_auth_all" on public.dataset_categories;
create policy "dataset_categories_admin_all" on public.dataset_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
