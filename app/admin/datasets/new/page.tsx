import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import { dictFor } from '@/lib/i18n';
import DatasetForm from '@/components/admin/DatasetForm';

export const metadata = { title: '新增數據集 New Dataset' };
export const dynamic = 'force-dynamic';

export default async function NewDatasetPage() {
  const dict = dictFor('zh');
  const supabase = await createServerSupabaseWithCookies();
  const [{ data: orgs }, { data: cats }] = await Promise.all([
    supabase.from('organizations').select('id, name_zh, name_en').order('name_en'),
    supabase.from('categories').select('id, name_zh, name_en').order('sort_order'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{dict.admin.newDataset}</h1>
      <DatasetForm organizations={orgs ?? []} categories={cats ?? []} />
    </div>
  );
}
