-- AIData v0.1 — database schema
-- Bilingual open-data catalog (zh-Hant primary / English)

-- ============ organizations ============
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_zh text not null,
  website text,
  created_at timestamptz not null default now()
);

-- ============ categories ============
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_zh text not null,
  icon text,
  sort_order int not null default 0
);

-- ============ datasets ============
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_zh text not null,
  description_en text,
  description_zh text,
  organization_id uuid references public.organizations(id) on delete set null,
  update_frequency text,
  license text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  api_enabled boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ resources ============
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  name_en text not null,
  name_zh text not null,
  format text not null check (format in ('CSV','JSON','XML','XLSX','GEOJSON','API','HTML','PDF','GML')),
  url text not null,
  size_bytes bigint,
  sort_order int not null default 0
);

-- ============ dataset_categories ============
create table if not exists public.dataset_categories (
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (dataset_id, category_id)
);

-- ============ updated_at trigger on datasets ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  -- only bump updated_at when something other than view_count changed
  if to_jsonb(new) - 'view_count' is distinct from to_jsonb(old) - 'view_count' then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists datasets_set_updated_at on public.datasets;
create trigger datasets_set_updated_at
  before update on public.datasets
  for each row execute function public.set_updated_at();

-- ============ indexes ============
create index if not exists datasets_status_idx on public.datasets(status);
create index if not exists datasets_organization_id_idx on public.datasets(organization_id);
create index if not exists resources_dataset_id_idx on public.resources(dataset_id);

-- ============ RLS ============
alter table public.organizations enable row level security;
alter table public.categories enable row level security;
alter table public.datasets enable row level security;
alter table public.resources enable row level security;
alter table public.dataset_categories enable row level security;

-- anon: read organizations / categories (all rows)
drop policy if exists "organizations_anon_select" on public.organizations;
create policy "organizations_anon_select" on public.organizations
  for select to anon using (true);

drop policy if exists "categories_anon_select" on public.categories;
create policy "categories_anon_select" on public.categories
  for select to anon using (true);

-- anon: datasets published only
drop policy if exists "datasets_anon_select" on public.datasets;
create policy "datasets_anon_select" on public.datasets
  for select to anon using (status = 'published');

-- anon: resources only when parent dataset published
drop policy if exists "resources_anon_select" on public.resources;
create policy "resources_anon_select" on public.resources
  for select to anon using (
    exists (
      select 1 from public.datasets d
      where d.id = dataset_id and d.status = 'published'
    )
  );

-- anon: dataset_categories only for published datasets
drop policy if exists "dataset_categories_anon_select" on public.dataset_categories;
create policy "dataset_categories_anon_select" on public.dataset_categories
  for select to anon using (
    exists (
      select 1 from public.datasets d
      where d.id = dataset_id and d.status = 'published'
    )
  );

-- authenticated: full write access on every table
drop policy if exists "organizations_auth_all" on public.organizations;
create policy "organizations_auth_all" on public.organizations
  for all to authenticated using (true) with check (true);

drop policy if exists "categories_auth_all" on public.categories;
create policy "categories_auth_all" on public.categories
  for all to authenticated using (true) with check (true);

drop policy if exists "datasets_auth_all" on public.datasets;
create policy "datasets_auth_all" on public.datasets
  for all to authenticated using (true) with check (true);

drop policy if exists "resources_auth_all" on public.resources;
create policy "resources_auth_all" on public.resources
  for all to authenticated using (true) with check (true);

drop policy if exists "dataset_categories_auth_all" on public.dataset_categories;
create policy "dataset_categories_auth_all" on public.dataset_categories
  for all to authenticated using (true) with check (true);
