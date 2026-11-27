// DB row types for AIData

export type Lang = 'zh' | 'en';

export interface Organization {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  website: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  icon: string | null;
  sort_order: number;
}

export type DatasetStatus = 'draft' | 'published';
export type ResourceFormat = 'CSV' | 'JSON' | 'XML' | 'XLSX' | 'GEOJSON' | 'API' | 'HTML';

export interface Dataset {
  id: string;
  slug: string;
  title_en: string;
  title_zh: string;
  description_en: string | null;
  description_zh: string | null;
  organization_id: string | null;
  update_frequency: string | null;
  license: string | null;
  status: DatasetStatus;
  api_enabled: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined fields (optional)
  organizations?: Organization | null;
  resources?: Resource[];
  dataset_categories?: { categories: Category }[];
}

export interface Resource {
  id: string;
  dataset_id: string;
  name_en: string;
  name_zh: string;
  format: ResourceFormat;
  url: string;
  size_bytes: number | null;
  sort_order: number;
}

export interface DatasetCategory {
  dataset_id: string;
  category_id: string;
}

export type Localized<T extends { name_en: string; name_zh: string }> = T;

// pick localized string from a bilingual pair
export function pickLang(
  pair: { en: string | null; zh: string | null } | null | undefined,
  lang: Lang,
): string {
  if (!pair) return '';
  if (lang === 'zh') return pair.zh ?? pair.en ?? '';
  return pair.en ?? pair.zh ?? '';
}
