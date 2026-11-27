'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { saveDataset } from '@/app/admin/actions';
import { dictFor } from '@/lib/i18n/dicts';
import type { Category, Dataset, Organization, Resource } from '@/lib/types';

const dict = dictFor('zh');

const FORMATS = ['CSV', 'JSON', 'XML', 'XLSX', 'GEOJSON', 'API', 'HTML'];
const FREQUENCIES = [
  { value: '實時', label: dict.admin.frequencyRealtime },
  { value: '每日', label: dict.admin.frequencyDaily },
  { value: '每週', label: dict.admin.frequencyWeekly },
  { value: '每月', label: dict.admin.frequencyMonthly },
  { value: '每季', label: dict.admin.frequencyQuarterly },
  { value: '每年', label: dict.admin.frequencyYearly },
  { value: '不定期', label: dict.admin.frequencyIrregular },
];

interface ResourceRow {
  key: string;
  id?: string;
  name_en: string;
  name_zh: string;
  format: string;
  url: string;
  size_mb: string;
}

let keySeq = 0;
function newResource(partial: Partial<ResourceRow> = {}): ResourceRow {
  keySeq += 1;
  return {
    key: `r${keySeq}`,
    name_en: '',
    name_zh: '',
    format: 'CSV',
    url: '',
    size_mb: '',
    ...partial,
  };
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

export default function DatasetForm({
  organizations,
  categories,
  initial,
}: {
  organizations: Pick<Organization, 'id' | 'name_zh' | 'name_en'>[];
  categories: Pick<Category, 'id' | 'name_zh' | 'name_en'>[];
  initial?: Dataset | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveDataset, { ok: false, message: '' });

  const initialCats = new Set(
    (initial?.dataset_categories ?? []).map(
      (dc) => (dc as unknown as { categories: Category }).categories?.id,
    ),
  );
  const initialResources: ResourceRow[] = (initial?.resources ?? [])
    .sort((a: Resource, b: Resource) => a.sort_order - b.sort_order)
    .map((r: Resource) =>
      newResource({
        id: r.id,
        name_en: r.name_en,
        name_zh: r.name_zh,
        format: r.format,
        url: r.url,
        size_mb: r.size_bytes ? (r.size_bytes / 1024 / 1024).toFixed(2) : '',
      }),
    );

  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(Array.from(initialCats).filter(Boolean) as string[]),
  );
  const [resources, setResources] = useState<ResourceRow[]>(initialResources);

  useEffect(() => {
    if (state.ok && state.message === 'created') {
      const t = setTimeout(() => router.push('/admin'), 600);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateResource(key: string, patch: Partial<ResourceRow>) {
    setResources((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('resources_json', JSON.stringify(resources));
    formAction(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {dict.admin.datasets}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="title_zh">{dict.admin.titleZh} *</label>
            <input id="title_zh" name="title_zh" required defaultValue={initial?.title_zh ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="title_en">{dict.admin.titleEn} *</label>
            <input id="title_en" name="title_en" required defaultValue={initial?.title_en ?? ''} className={inputCls} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="description_zh">{dict.admin.descZh}</label>
            <textarea id="description_zh" name="description_zh" rows={4} defaultValue={initial?.description_zh ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="description_en">{dict.admin.descEn}</label>
            <textarea id="description_en" name="description_en" rows={4} defaultValue={initial?.description_en ?? ''} className={inputCls} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="organization_id">{dict.admin.organization} *</label>
            <select id="organization_id" name="organization_id" required defaultValue={initial?.organization_id ?? ''} className={inputCls}>
              <option value="">—</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name_zh} / {o.name_en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="update_frequency">{dict.admin.updateFrequency}</label>
            <select id="update_frequency" name="update_frequency" defaultValue={initial?.update_frequency ?? '不定期'} className={inputCls}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="license">{dict.admin.license}</label>
            <input id="license" name="license" defaultValue={initial?.license ?? ''} placeholder="https://…" className={inputCls} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="api_enabled"
              defaultChecked={initial?.api_enabled ?? false}
              className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
            {dict.admin.apiEnabled}
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">{dict.admin.status}</label>
            <select id="status" name="status" defaultValue={initial?.status ?? 'draft'} className={inputCls + ' w-auto'}>
              <option value="draft">{dict.admin.statusDraft}</option>
              <option value="published">{dict.admin.statusPublished}</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <span className={labelCls}>{dict.admin.categoriesLabel}</span>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  checked={selectedCats.has(c.id)}
                  onChange={() => toggleCat(c.id)}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                />
                {c.name_zh}
              </label>
            ))}
            {categories.length === 0 && <span className="text-sm text-slate-400">—</span>}
          </div>
        </div>
      </div>

      {/* resources */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{dict.admin.resourcesLabel}</h2>
          <button
            type="button"
            onClick={() => setResources((prev) => [...prev, newResource()])}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-blue-600 hover:text-blue-700"
          >
            + {dict.admin.addResource}
          </button>
        </div>

        {resources.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            —
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {resources.map((r, idx) => (
              <div key={r.key} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResources((prev) => prev.filter((x) => x.key !== r.key))}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    {dict.admin.remove}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={r.name_zh}
                    onChange={(e) => updateResource(r.key, { name_zh: e.target.value })}
                    placeholder={dict.admin.resourceNameZh}
                    className={inputCls}
                  />
                  <input
                    value={r.name_en}
                    onChange={(e) => updateResource(r.key, { name_en: e.target.value })}
                    placeholder={dict.admin.resourceNameEn}
                    className={inputCls}
                  />
                  <select
                    value={r.format}
                    onChange={(e) => updateResource(r.key, { format: e.target.value })}
                    className={inputCls}
                    aria-label={dict.admin.resourceFormat}
                  >
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    value={r.size_mb}
                    onChange={(e) => updateResource(r.key, { size_mb: e.target.value })}
                    placeholder={dict.admin.resourceSizeMb}
                    inputMode="decimal"
                    className={inputCls}
                  />
                  <input
                    value={r.url}
                    onChange={(e) => updateResource(r.key, { url: e.target.value })}
                    placeholder={dict.admin.resourceUrl}
                    className={inputCls + ' sm:col-span-2'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {state.message && (
        <p
          className={`rounded-lg border p-3 text-sm ${
            state.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.ok ? `✓ ${dict.admin.saved}` : state.message}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? dict.admin.saving : dict.admin.save}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          {dict.admin.backToAdmin}
        </button>
      </div>
    </form>
  );
}
