import Link from 'next/link';
import { dictFor } from '@/lib/i18n';
import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import type { Dataset } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/Badges';
import DeleteButton from '@/components/admin/DeleteButton';
import { deleteDataset } from './actions';

export const metadata = { title: '管理面板 Admin' };

export default async function AdminDashboard() {
  const dict = dictFor('zh');
  const supabase = await createServerSupabaseWithCookies();

  const [{ data: datasets }, { count: totalCount }, { count: publishedCount }, { count: draftCount }, { count: resourcesCount }, { count: apiCount }] =
    await Promise.all([
      supabase
        .from('datasets')
        .select('*, organizations(*)')
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase.from('datasets').select('id', { count: 'exact', head: true }),
      supabase.from('datasets').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('datasets').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('resources').select('id', { count: 'exact', head: true }),
      supabase.from('datasets').select('id', { count: 'exact', head: true }).eq('api_enabled', true),
    ]);

  const rows = (datasets ?? []) as Dataset[];
  const stats = [
    { label: dict.admin.datasets, value: totalCount ?? 0 },
    { label: dict.admin.statusPublished, value: publishedCount ?? 0 },
    { label: dict.admin.statusDraft, value: draftCount ?? 0 },
    { label: dict.admin.resourcesLabel, value: resourcesCount ?? 0 },
    { label: dict.admin.apiEnabled, value: apiCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{dict.admin.dashboard}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-700">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">{dict.admin.title}</th>
              <th className="px-4 py-3 font-medium">{dict.admin.organization}</th>
              <th className="px-4 py-3 font-medium">{dict.admin.status}</th>
              <th className="px-4 py-3 font-medium">{dict.admin.updated}</th>
              <th className="px-4 py-3 font-medium">{dict.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{d.title_zh}</div>
                  <div className="text-xs text-slate-500">{d.title_en}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {d.organizations ? d.organizations.name_zh : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={d.status}
                    draftLabel={dict.admin.statusDraft}
                    publishedLabel={dict.admin.statusPublished}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(d.updated_at, 'zh')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/datasets/${d.id}/edit`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {dict.admin.edit}
                    </Link>
                    <form
                      action={async (fd) => {
                        'use server';
                        await deleteDataset({ ok: false, message: '' }, fd);
                      }}
                    >
                      <input type="hidden" name="id" value={d.id} />
                      <DeleteButton
                        label={dict.admin.delete}
                        confirmMessage={dict.admin.deleteConfirm}
                      />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {dict.admin.datasets} — 0
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
