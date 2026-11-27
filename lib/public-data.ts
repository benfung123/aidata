// Cached public-catalog data layer.
// All public pages read through here so Supabase is hit at most once
// per revalidation window, regardless of traffic.
import { getPublicSupabase } from '@/lib/supabase/server';
import { cachedFetch } from '@/lib/cache';
import type { Category, Dataset, Organization } from '@/lib/types';

const DATASET_SELECT = '*, organizations(*), resources(*), dataset_categories(categories(*))';

export const getPublishedDatasets = cachedFetch(
  async (): Promise<Dataset[]> => {
    const supabase = await getPublicSupabase();
    const { data } = await supabase
      .from('datasets')
      .select(DATASET_SELECT)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });
    return (data ?? []) as Dataset[];
  },
  ['published-datasets'],
  300,
);

export const getAllCategories = cachedFetch(
  async (): Promise<Category[]> => {
    const supabase = await getPublicSupabase();
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    return (data ?? []) as Category[];
  },
  ['all-categories'],
  3600,
);

export const getAllOrganizations = cachedFetch(
  async (): Promise<Organization[]> => {
    const supabase = await getPublicSupabase();
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name_en', { ascending: true });
    return (data ?? []) as Organization[];
  },
  ['all-organizations'],
  3600,
);

export interface SiteStats {
  datasets: number;
  organizations: number;
  resources: number;
  apiEnabled: number;
}

/** Derived from the cached lists — zero extra DB round trips. */
export async function getStats(): Promise<SiteStats> {
  const [datasets, orgs] = await Promise.all([getPublishedDatasets(), getAllOrganizations()]);
  return {
    datasets: datasets.length,
    organizations: orgs.length,
    resources: datasets.reduce((n, d) => n + (d.resources?.length ?? 0), 0),
    apiEnabled: datasets.filter((d) => d.api_enabled).length,
  };
}

export const getDatasetBySlug = cachedFetch(
  async (slug: string): Promise<Dataset | null> => {
    const supabase = await getPublicSupabase();
    const { data } = await supabase
      .from('datasets')
      .select(DATASET_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    return (data as Dataset) ?? null;
  },
  ['dataset-by-slug'],
  300,
);

export interface SeriesBundle {
  code: string;
  name_en: string | null;
  name_zh: string | null;
  unit: string | null;
  frequency: string;
  observations: { period: string; value: number }[];
}

export const getSeriesBundle = cachedFetch(
  async (datasetId: string, limitPerSeries: number): Promise<SeriesBundle[]> => {
    const supabase = await getPublicSupabase();
    const { data: seriesRows } = await supabase
      .from('series')
      .select('id, code, name_en, name_zh, unit, frequency')
      .eq('dataset_id', datasetId)
      .order('code');
    const series = (seriesRows ?? []) as {
      id: string;
      code: string;
      name_en: string | null;
      name_zh: string | null;
      unit: string | null;
      frequency: string;
    }[];
    if (series.length === 0) return [];

    const { data: obsRows } = await supabase
      .from('observations')
      .select('series_id, period, value')
      .in(
        'series_id',
        series.map((s) => s.id),
      )
      .order('period', { ascending: false })
      .limit(limitPerSeries * series.length);

    const grouped = new Map<string, { period: string; value: number }[]>();
    for (const row of (obsRows ?? []) as {
      series_id: string;
      period: string;
      value: number;
    }[]) {
      const list = grouped.get(row.series_id) ?? [];
      if (list.length < limitPerSeries) {
        list.push({ period: row.period, value: row.value });
        grouped.set(row.series_id, list);
      }
    }

    return series.map((s) => ({
      code: s.code,
      name_en: s.name_en,
      name_zh: s.name_zh,
      unit: s.unit,
      frequency: s.frequency,
      observations: (grouped.get(s.id) ?? []).slice().reverse(),
    }));
  },
  ['series-bundle'],
  300,
);
