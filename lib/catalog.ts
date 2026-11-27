import { getPublicSupabase } from '@/lib/supabase/server';
import { cachedFetch } from '@/lib/cache';
import {
  getPublishedDatasets,
  getAllCategories,
  getAllOrganizations,
} from '@/lib/public-data';
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

// Raw link tables for filter counts — cached, not per-request.
const getCategoryLinks = cachedFetch(
  async (): Promise<{ category_id: string; dataset_id: string }[]> => {
    const supabase = await getPublicSupabase();
    const { data } = await supabase.from('dataset_categories').select('category_id, dataset_id');
    return (data ?? []) as { category_id: string; dataset_id: string }[];
  },
  ['category-links'],
  300,
);

export async function fetchDatasets(f: DatasetFilters): Promise<CatalogResult> {
  const page = Math.max(1, f.page ?? 1);
  const perPage = Math.min(100, Math.max(1, f.perPage ?? 24));

  const [all, orgs, cats] = await Promise.all([
    getPublishedDatasets(),
    getAllOrganizations(),
    getAllCategories(),
  ]);
  const orgSlugSet = new Set(f.organizationSlugs ?? []);
  const catSlugSet = new Set(f.categorySlugs ?? []);
  const fmtSet = new Set(f.formats ?? []);
  const q = f.q?.trim().toLowerCase() ?? '';

  let filtered = all.filter((d) => {
    if (q) {
      const hay = [d.title_en, d.title_zh, d.description_en, d.description_zh]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (orgSlugSet.size > 0) {
      const slug = d.organizations?.slug;
      if (!slug || !orgSlugSet.has(slug)) return false;
    }
    if (catSlugSet.size > 0) {
      const slugs = datasetCategories(d).map((c) => c.slug);
      if (!slugs.some((s) => catSlugSet.has(s))) return false;
    }
    if (fmtSet.size > 0) {
      const formats = (d.resources ?? []).map((r) => r.format);
      // every api_enabled dataset is downloadable as CSV via ?format=csv
      const offers = d.api_enabled ? [...formats, 'CSV'] : formats;
      if (!offers.some((fmt) => fmtSet.has(fmt))) return false;
    }
    if (f.api && !d.api_enabled) return false;
    return true;
  });

  if (f.sort === 'title') {
    filtered = [...filtered].sort((a, b) => a.title_en.localeCompare(b.title_en));
  }

  const total = filtered.length;
  const from = (page - 1) * perPage;
  return { datasets: filtered.slice(from, from + perPage), total, page, perPage };
}

export interface FilterOptions {
  categories: (Category & { dataset_count: number })[];
  organizations: (Organization & { dataset_count: number })[];
  formats: { format: string; count: number }[];
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const [cats, links, orgs, datasets] = await Promise.all([
    getAllCategories(),
    getCategoryLinks(),
    getAllOrganizations(),
    getPublishedDatasets(),
  ]);
  const publishedIds = new Set(datasets.map((d) => d.id));

  const catCounts = new Map<string, number>();
  for (const l of links) {
    if (publishedIds.has(l.dataset_id)) {
      catCounts.set(l.category_id, (catCounts.get(l.category_id) ?? 0) + 1);
    }
  }

  const orgCounts = new Map<string, number>();
  const fmtCounts = new Map<string, number>();
  for (const d of datasets) {
    if (d.organization_id) orgCounts.set(d.organization_id, (orgCounts.get(d.organization_id) ?? 0) + 1);
    const formats = (d.resources ?? []).map((r) => r.format);
    // AIData CSV export endpoint counts as a CSV format offering
    if (d.api_enabled && !formats.includes('CSV')) formats.push('CSV');
    for (const fmt of formats) {
      fmtCounts.set(fmt, (fmtCounts.get(fmt) ?? 0) + 1);
    }
  }

  return {
    categories: cats.map((c) => ({ ...c, dataset_count: catCounts.get(c.id) ?? 0 })),
    organizations: orgs.map((o) => ({ ...o, dataset_count: orgCounts.get(o.id) ?? 0 })),
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
