import Link from 'next/link';
import type { Metadata } from 'next';
import { getDict, getLang } from '@/lib/i18n';
import { getPublicSupabase } from '@/lib/supabase/server';
import type { Organization } from '@/lib/types';

export const metadata: Metadata = {
  title: '機構 Organizations',
};

interface OrgWithCount extends Organization {
  dataset_count: number;
}

export default async function OrganizationsPage() {
  const lang = await getLang();
  const dict = await getDict();
  const supabase = await getPublicSupabase();

  const [{ data: orgs }, { data: links }] = await Promise.all([
    supabase.from('organizations').select('*').order('name_en', { ascending: true }),
    supabase
      .from('datasets')
      .select('id, organization_id')
      .eq('status', 'published'),
  ]);

  const counts = new Map<string, number>();
  for (const d of links ?? []) {
    const oid = (d as { organization_id: string | null }).organization_id;
    if (oid) counts.set(oid, (counts.get(oid) ?? 0) + 1);
  }

  const rows: OrgWithCount[] = (orgs ?? []).map((o: Organization) => ({
    ...o,
    dataset_count: counts.get(o.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">{dict.organizations.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{rows.length} {dict.organizations.title}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((o) => (
          <Link
            key={o.id}
            href={`/organizations/${o.slug}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">
              {lang === 'zh' ? o.name_zh : o.name_en}
            </h2>
            {lang === 'zh' && o.name_en !== o.name_zh && (
              <p className="mt-0.5 text-sm text-slate-500">{o.name_en}</p>
            )}
            {lang === 'en' && o.name_zh !== o.name_en && (
              <p className="mt-0.5 text-sm text-slate-500">{o.name_zh}</p>
            )}
            <p className="mt-2 text-sm text-blue-700">
              {o.dataset_count} {dict.organizations.datasets}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
