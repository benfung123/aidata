import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDict, getLang } from '@/lib/i18n';
import { fetchDatasets, fetchFilterOptions } from '@/lib/catalog';
import DatasetCard from '@/components/DatasetCard';
import DatasetsFilters from '@/components/DatasetsFilters';
import Pagination from '@/components/Pagination';

export const metadata: Metadata = {
  title: '數據集 Datasets',
};

interface SearchParams {
  q?: string;
  category?: string;
  organization?: string;
  format?: string;
  api?: string;
  sort?: string;
  page?: string;
}

function splitParam(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export default async function DatasetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const lang = await getLang();
  const dict = await getDict();

  const filters = {
    q: sp.q?.trim() ?? '',
    category: splitParam(sp.category),
    organization: splitParam(sp.organization),
    format: splitParam(sp.format),
    api: sp.api === '1' || sp.api === 'true',
    sort: sp.sort === 'title' ? ('title' as const) : ('updated' as const),
    page: Math.max(1, Number(sp.page) || 1),
    perPage: 24,
  };

  const [options, result] = await Promise.all([
    fetchFilterOptions(),
    fetchDatasets({
      q: filters.q || undefined,
      categorySlugs: filters.category,
      organizationSlugs: filters.organization,
      formats: filters.format,
      api: filters.api || undefined,
      sort: filters.sort,
      page: filters.page,
      perPage: filters.perPage,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / filters.perPage));

  const filterQuery: Record<string, string> = {};
  if (filters.q) filterQuery.q = filters.q;
  if (filters.category.length) filterQuery.category = filters.category.join(',');
  if (filters.organization.length) filterQuery.organization = filters.organization.join(',');
  if (filters.format.length) filterQuery.format = filters.format.join(',');
  if (filters.api) filterQuery.api = '1';
  if (filters.sort !== 'updated') filterQuery.sort = filters.sort;

  const hasActiveFilters =
    filters.q ||
    filters.category.length > 0 ||
    filters.organization.length > 0 ||
    filters.format.length > 0 ||
    filters.api;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{dict.datasets.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {result.total} {dict.datasets.results}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* sidebar */}
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            {dict.datasets.filters}
          </h2>
          <Suspense fallback={null}>
            <DatasetsFilters
              dict={dict}
              lang={lang}
              categories={options.categories.map((c) => ({
                value: c.slug,
                label: lang === 'zh' ? c.name_zh : c.name_en,
                count: c.dataset_count,
              }))}
              organizations={options.organizations.map((o) => ({
                value: o.slug,
                label: lang === 'zh' ? o.name_zh : o.name_en,
                count: o.dataset_count,
              }))}
              formats={options.formats.map((f) => ({
                value: f.format,
                label: f.format,
                count: f.count,
              }))}
              current={filters}
            />
          </Suspense>
        </aside>

        {/* results */}
        <section>
          {result.datasets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">{dict.datasets.empty}</p>
              {hasActiveFilters && (
                <a
                  href="/datasets"
                  className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
                >
                  {dict.datasets.clearFilters} →
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {result.datasets.map((d) => (
                  <DatasetCard key={d.id} dataset={d} lang={lang} />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={totalPages}
                basePath="/datasets"
                query={filterQuery}
                lang={lang}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
