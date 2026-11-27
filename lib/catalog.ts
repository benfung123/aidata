import { getPublicSupabase } from '@/lib/supabase/server';
import type { Dataset, Lang, Category, Organization } from '@/lib/types';

export interface DatasetFilters {
  q?: string;
  categorySlugs?: string[];
  organizationSlugs?: string[];
  formats?: string[];
  api?: boolean;
  sort?: 'updated' | 'title';
  page?: number;
  perPage?: number;
}

export interface CatalogResult {
  datasets: Dataset[];
  total: number;
  page: number;
  perPage: number;
}

async function idsBySlugs(table: 'organizations' | 'categories', slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const supabase = await getPublicSupabase();
  const { data } = await supabase.from(table).select('id').in('slug', slugs);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

export async function fetchDatasets(f: DatasetFilters): Promise<CatalogResult> {
  const supabase = await getPublicSupabase();
  const page = Math.max(1, f.page ?? 1);
  const perPage = Math.min(100, Math.max(1, f.perPage ?? 24));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const [orgIds, catIds] = await Promise.all([
    f.organizationSlugs?.length ? idsBySlugs('organizations', f.organizationSlugs) : Promise.resolve([] as string[]),
    f.categorySlugs?.length ? idsBySlugs('categories', f.categorySlugs) : Promise.resolve([] as string[]),
  ]);

  const useResJoin = (f.formats?.length ?? 0) > 0;
  const useCatJoin = catIds.length > 0;

  let select = '*, organizations(*), resources(*), dataset_categories(categories(*))';
  if (useResJoin) select = select.replace('resources(*)', 'resources!inner(*)');
  if (useCatJoin) select = select.replace('dataset_categories(categories(*))', 'dataset_categories!inner(categories(*))');

  let query: any = supabase
    .from('datasets')
    .select(select, { count: 'exact' })
    .eq('status', 'published');

  if (f.q) {
    const term = `%${f.q}%`;
    query = query.or(
      `title_en.ilike.${term},title_zh.ilike.${term},description_en.ilike.${term},description_zh.ilike.${term}`,
    );
  }
  if (orgIds.length > 0) query = query.in('organization_id', orgIds);
  if (useCatJoin) query = query.in('dataset_categories.category_id', catIds);
  if (f.formats && f.formats.length > 0) query = query.in('resources.format', f.formats);
  if (f.api) query = query.eq('api_enabled', true);

  query =
    f.sort === 'title'
      ? query.order('title_en', { ascending: true })
      : query.order('updated_at', { ascending: false });

  const { data, count, error } = await query.range(from, to);
  if (error) {
    console.error('fetchDatasets error', error.message);
    return { datasets: [], total: 0, page, perPage };
  }
  return { datasets: (data ?? []) as Dataset[], total: count ?? 0, page, perPage };
}

export interface FilterOptions {
  categories: (Category & { dataset_count: number })[];
  organizations: (Organization & { dataset_count: number })[];
  formats: { format: string; count: number }[];
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const supabase = await getPublicSupabase();

  const [{ data: cats }, { data: links }, { data: orgs }, { data: ds }, { data: resources }] =
    await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('dataset_categories').select('category_id, dataset_id'),
      supabase.from('organizations').select('*').order('name_en', { ascending: true }),
      supabase.from('datasets').select('id, organization_id').eq('status', 'published'),
      supabase.from('resources').select('format, dataset_id'),
    ]);

  const publishedIds = new Set((ds ?? []).map((d: { id: string }) => d.id));

  const catCounts = new Map<string, number>();
  for (const l of links ?? []) {
    const row = l as { category_id: string; dataset_id: string };
    if (publishedIds.has(row.dataset_id)) {
      catCounts.set(row.category_id, (catCounts.get(row.category_id) ?? 0) + 1);
    }
  }

  const orgCounts = new Map<string, number>();
  for (const d of ds ?? []) {
    const oid = (d as { organization_id: string | null }).organization_id;
    if (oid) orgCounts.set(oid, (orgCounts.get(oid) ?? 0) + 1);
  }

  const fmtCounts = new Map<string, number>();
  for (const r of resources ?? []) {
    const row = r as { format: string; dataset_id: string };
    if (publishedIds.has(row.dataset_id)) {
      fmtCounts.set(row.format, (fmtCounts.get(row.format) ?? 0) + 1);
    }
  }

  return {
    categories: (cats ?? []).map((c: Category) => ({
      ...c,
      dataset_count: catCounts.get(c.id) ?? 0,
    })),
    organizations: (orgs ?? []).map((o: Organization) => ({
      ...o,
      dataset_count: orgCounts.get(o.id) ?? 0,
    })),
    formats: Array.from(fmtCounts.entries())
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => a.format.localeCompare(b.format)),
  };
}

export function datasetCategories(dataset: Dataset): Category[] {
  return (dataset.dataset_categories ?? [])
    .map((dc) => (dc as unknown as { categories: Category }).categories)
    .filter(Boolean);
}
