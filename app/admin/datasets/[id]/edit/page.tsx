import { notFound } from 'next/navigation';
import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import { dictFor } from '@/lib/i18n';
import type { Dataset } from '@/lib/types';
import DatasetForm from '@/components/admin/DatasetForm';

export const metadata = { title: '編輯數據集 Edit Dataset' };
export const dynamic = 'force-dynamic';

export default async function EditDatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dict = dictFor('zh');
  const supabase = await createServerSupabaseWithCookies();

  const [{ data: dataset }, { data: orgs }, { data: cats }] = await Promise.all([
    supabase
      .from('datasets')
      .select('*, resources(*), dataset_categories(categories(*))')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('organizations').select('id, name_zh, name_en').order('name_en'),
    supabase.from('categories').select('id, name_zh, name_en').order('sort_order'),
  ]);

  if (!dataset) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {dict.admin.edit} — {dataset.title_zh}
      </h1>
      <DatasetForm organizations={orgs ?? []} categories={cats ?? []} initial={dataset as Dataset} />
    </div>
  );
}
