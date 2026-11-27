// Shared types for the AIData ingestion pipeline.

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';

export interface SeriesPoint {
  /** YYYY-MM-DD | YYYY-MM | YYYY-Qn */
  period: string;
  value: number;
  raw?: Record<string, unknown>;
}

export interface AdapterSeriesResult {
  code: string;
  points: SeriesPoint[];
}

export interface AdapterSeriesMeta {
  code: string;
  nameEn: string;
  nameZh: string;
  unit: string;
  frequency: Frequency;
  sourceUrl: string;
}

export interface Adapter {
  /** unique id, e.g. 'hkma-hibor' */
  id: string;
  /** series code prefixes this adapter handles, e.g. ['hkma_hibor_'] */
  codePrefixes: string[];
  /** static metadata for every series this adapter can emit */
  seriesMeta: AdapterSeriesMeta[];
  /** fetch all points for all of the adapter's series */
  run(): Promise<AdapterSeriesResult[]>;
}

export interface SeriesRow {
  id: string;
  dataset_id: string | null;
  code: string;
  name_en: string | null;
  name_zh: string | null;
  unit: string | null;
  frequency: Frequency;
  source_url: string | null;
  last_run_at: string | null;
  last_status: string;
  last_error: string | null;
  next_run_at: string | null;
  enabled: boolean;
}
