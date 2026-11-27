'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { Dict } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface DatasetsFiltersProps {
  dict: Dict;
  lang: Lang;
  categories: FilterOption[];
  organizations: FilterOption[];
  formats: FilterOption[];
  current: {
    q: string;
    category: string[];
    organization: string[];
    format: string[];
    api: boolean;
    sort: 'updated' | 'title';
  };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function DatasetsFilters({
  dict,
  lang,
  categories,
  organizations,
  formats,
  current,
}: DatasetsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = useCallback(
    (patch: Record<string, string[] | string | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        params.delete(key);
        if (value === null || value === false || value === '' || (Array.isArray(value) && value.length === 0)) continue;
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
      // always reset to page 1 when filters change
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/datasets?${qs}` : '/datasets');
    },
    [router, searchParams],
  );

  const labelCls = 'mb-2 block text-sm font-semibold text-slate-900';
  const itemCls = 'flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-900';
  const countCls = 'ml-auto text-xs text-slate-400';

  return (
    <div className="space-y-6">
      {/* search */}
      <div>
        <label className={labelCls} htmlFor="filter-q">{dict.datasets.searchPlaceholder}</label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
            apply({ q: input.value.trim() || null });
          }}
          className="flex gap-2"
        >
          <input
            id="filter-q"
            type="search"
            name="q"
            defaultValue={current.q}
            placeholder={dict.datasets.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            {dict.home.searchButton}
          </button>
        </form>
      </div>

      {/* category */}
      <div>
        <span className={labelCls}>{dict.datasets.category}</span>
        <div className="space-y-1.5">
          {categories.map((c) => (
            <label key={c.value} className={itemCls}>
              <input
                type="checkbox"
                checked={current.category.includes(c.value)}
                onChange={() => apply({ category: toggle(current.category, c.value) })}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span className="truncate">{c.label}</span>
              <span className={countCls}>{c.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* organization */}
      <div>
        <span className={labelCls}>{dict.datasets.organization}</span>
        <div className="space-y-1.5">
          {organizations.map((o) => (
            <label key={o.value} className={itemCls}>
              <input
                type="checkbox"
                checked={current.organization.includes(o.value)}
                onChange={() => apply({ organization: toggle(current.organization, o.value) })}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span className="truncate">{o.label}</span>
              <span className={countCls}>{o.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* format */}
      <div>
        <span className={labelCls}>{dict.datasets.format}</span>
        <div className="space-y-1.5">
          {formats.map((f) => (
            <label key={f.value} className={itemCls}>
              <input
                type="checkbox"
                checked={current.format.includes(f.value)}
                onChange={() => apply({ format: toggle(current.format, f.value) })}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span className="truncate">{f.value}</span>
              <span className={countCls}>{f.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* api available */}
      <label className={itemCls}>
        <input
          type="checkbox"
          checked={current.api}
          onChange={() => apply({ api: current.api ? null : '1' })}
          className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
        />
        <span className="font-medium text-slate-900">{dict.datasets.apiAvailable}</span>
      </label>

      {/* sort */}
      <div>
        <label className={labelCls} htmlFor="filter-sort">{dict.datasets.sort}</label>
        <select
          id="filter-sort"
          value={current.sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-600"
        >
          <option value="updated">{dict.datasets.sortNewest}</option>
          <option value="title">{dict.datasets.sortTitle}</option>
        </select>
      </div>

      {/* clear all */}
      {(current.category.length > 0 ||
        current.organization.length > 0 ||
        current.format.length > 0 ||
        current.api ||
        current.q) && (
        <button
          type="button"
          onClick={() => router.push('/datasets')}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-blue-600 hover:text-blue-700"
        >
          {dict.datasets.clearFilters}
        </button>
      )}
    </div>
  );
}
