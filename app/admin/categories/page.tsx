import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import { dictFor } from '@/lib/i18n';
import type { Category } from '@/lib/types';
import { CategoryRow, NewCategoryForm } from '@/components/admin/CategoryForms';

export const metadata = { title: '管理分類 Admin — Categories' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const dict = dictFor('zh');
  const supabase = await createServerSupabaseWithCookies();
  const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{dict.admin.categories}</h1>
      <div className="mt-6 space-y-3">
        {(cats ?? []).map((c: Category) => (
          <CategoryRow key={c.id} category={c} />
        ))}
        {(cats ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            —
          </p>
        )}
      </div>
      <div className="mt-6">
        <NewCategoryForm />
      </div>
    </div>
  );
}
