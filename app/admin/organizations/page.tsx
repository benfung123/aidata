import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import { dictFor } from '@/lib/i18n';
import type { Organization } from '@/lib/types';
import { NewOrgForm, OrgRow } from '@/components/admin/OrgForms';

export const metadata = { title: '管理機構 Admin — Organizations' };
export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  const dict = dictFor('zh');
  const supabase = await createServerSupabaseWithCookies();
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('name_en', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{dict.admin.organizations}</h1>
      <div className="mt-6 space-y-3">
        {(orgs ?? []).map((o: Organization) => (
          <OrgRow key={o.id} org={o} />
        ))}
        {(orgs ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            —
          </p>
        )}
      </div>
      <div className="mt-6">
        <NewOrgForm />
      </div>
    </div>
  );
}
