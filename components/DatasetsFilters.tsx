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

/*
 * data.gov.hk-style filter: dropdown selects (category / organization /
 * format), API checkbox, search field, and an ALWAYS-visible 清除全部.
 * Selects apply instantly; 搜尋 submits the text query.
 */
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

  const hasActiveFilters =
    current.q ||
    current.category.length > 0 ||
    current.organization.length > 0 ||
    current.format.length > 0 ||
    current.api;

  const selectCls =
    'w-full appearance-none rounded-full border border-slate-300 bg-white py-2 pl-4 pr-8 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
  const chevron = (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      viewBox="0 0 20 20" fill="currentColor" aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );

  const renderSelect = (
    id: string,
    label: string,
    options: FilterOption[],
    selected: string[],
    param: string,
  ) => (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={selected[0] ?? ''}
          onChange={(e) => apply({ [param]: e.target.value || null })}
          className={selectCls}
        >
          <option value="">{label}：{dict.datasets.allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {label}：{o.label}（{o.count}）
            </option>
          ))}
        </select>
        {chevron}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
          apply({ q: input.value.trim() || null });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20" fill="currentColor" aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={current.q}
            placeholder={dict.datasets.searchPlaceholder}
            className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
        >
          {dict.home.searchButton}
        </button>
      </form>

      {renderSelect('filter-category', dict.datasets.category, categories, current.category, 'category')}
      {renderSelect('filter-org', dict.datasets.organization, organizations, current.organization, 'organization')}
      {renderSelect('filter-format', dict.datasets.format, formats, current.format, 'format')}

      {/* api available */}
      <label className="flex cursor-pointer items-center gap-2.5 px-1 py-1.5 text-sm text-slate-900">
        <input
          type="checkbox"
          checked={current.api}
          onChange={() => apply({ api: current.api ? null : '1' })}
          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
        />
        <span className="font-medium">{dict.datasets.apiAvailable}</span>
      </label>

      {/* sort */}
      <div className="relative">
        <label htmlFor="filter-sort" className="sr-only">
          {dict.datasets.sort}
        </label>
        <select
          id="filter-sort"
          value={current.sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className={selectCls}
        >
          <option value="updated">{dict.datasets.sort}：{dict.datasets.sortNewest}</option>
          <option value="title">{dict.datasets.sort}：{dict.datasets.sortTitle}</option>
        </select>
        {chevron}
      </div>

      {/* clear all — always visible (data.gov.hk pattern) */}
      <button
        type="button"
        onClick={() => router.push('/datasets')}
        disabled={!hasActiveFilters}
        className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 001.448.389 5.5 5.5 0 019.71-2.461l.31.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
            clipRule="evenodd"
          />
        </svg>
        {dict.datasets.clearFilters}
      </button>
    </div>
  );
}
