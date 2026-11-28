// Resource upsert keyed by (dataset_id, name_en) — for resources whose URL
// changes over time (e.g. "latest monthly CSV"). Keeps a single row always
// pointing at the freshest source, unlike catalog.ts's url-keyed upsert.
import { getSupabase } from './supabase';

export interface ResourceRow {
  name_en: string;
  name_zh: string;
  format: string;
  url: string;
  sort_order: number;
}

export async function upsertResourceByName(datasetId: string, row: ResourceRow): Promise<void> {
  const supabase = getSupabase();
  const { data: ex } = await supabase
    .from('resources')
    .select('id')
    .eq('dataset_id', datasetId)
    .eq('name_en', row.name_en)
    .maybeSingle();
  if (ex) {
    const { error } = await supabase.from('resources').update(row).eq('id', ex.id);
    if (error) throw new Error(`resource update ${row.name_en}: ${error.message}`);
  } else {
    const { error } = await supabase.from('resources').insert({ ...row, dataset_id: datasetId });
    if (error) throw new Error(`resource insert ${row.name_en}: ${error.message}`);
  }
}
