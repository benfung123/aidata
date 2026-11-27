import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDict, getLang } from '@/lib/i18n';
import { getPublicSupabase } from '@/lib/supabase/server';
import { datasetCategories } from '@/lib/catalog';
import { getDatasetBySlug, getPublishedDatasets, getSeriesBundle } from '@/lib/public-data';
import type { Dataset } from '@/lib/types';
import { formatBytes, formatDate } from '@/lib/format';
import { FormatBadge, ApiBadge, CsvBadge } from '@/components/Badges';
import CopyButton from '@/components/CopyButton';
import DatasetCard from '@/components/DatasetCard';
import SeriesChart from '@/components/SeriesChart';

const PREVIEW_POINTS = 12;
// chart reads deeper history (cached per dataset, downsampled for display)
const CHART_POINTS = 8000;

async function incrementViews(id: string, current: number): Promise<void> {
  const supabase = await getPublicSupabase();
  // fire-and-forget; trigger ignores view_count for updated_at
  supabase
    .from('datasets')
    .update({ view_count: current + 1 })
    .eq('id', id)
    .then(() => {}, () => {});
}

async function getRelated(dataset: Dataset): Promise<Dataset[]> {
  const cats = datasetCategories(dataset);
  if (cats.length === 0) return [];
  const catIds = new Set(cats.map((c) => c.id));
  const all = await getPublishedDatasets();
  return all
    .filter((d) => d.id !== dataset.id && datasetCategories(d).some((c) => catIds.has(c.id)))
    .slice(0, 4);
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getLang();
  const dict = await getDict();

  const dataset = await getDatasetBySlug(slug);
  if (!dataset) notFound();

  void incrementViews(dataset.id, dataset.view_count);

  const title = lang === 'zh' ? dataset.title_zh : dataset.title_en;
  const desc = (lang === 'zh' ? dataset.description_zh : dataset.description_en) ?? '';
  const org = dataset.organizations;
  const cats = datasetCategories(dataset);
  const resources = [...(dataset.resources ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const related = await getRelated(dataset);
  const seriesPreview = await getSeriesBundle(dataset.id, PREVIEW_POINTS);
  const chartBundle =
    seriesPreview.length > 0 ? await getSeriesBundle(dataset.id, CHART_POINTS) : [];

  const apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aidata-liart.vercel.app'}/api/v1/datasets/${dataset.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/datasets"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← {dict.detail.backToDatasets}
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <div className="flex items-center gap-1.5">
            {dataset.api_enabled && <CsvBadge label={dict.datasets.csvBadge} />}
            {dataset.api_enabled && <ApiBadge label={dict.datasets.apiBadge} />}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          {org && (
            <Link
              href={`/organizations/${org.slug}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {lang === 'zh' ? org.name_zh : org.name_en}
            </Link>
          )}
          <span>
            {dict.detail.updated} {formatDate(dataset.updated_at, lang)}
          </span>
          <span>
            {dict.detail.viewCount} {dataset.view_count}
          </span>
        </div>

        {/* meta grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaItem label={dict.detail.updateFrequency}>
            {dataset.update_frequency ?? '—'}
          </MetaItem>
          <MetaItem label={dict.detail.license}>
            {dataset.license ? (
              <a
                href={dataset.license}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-700 hover:underline"
              >
                {dataset.license.replace(/^https?:\/\//, '').slice(0, 40)}…
              </a>
            ) : (
              '—'
            )}
          </MetaItem>
          <MetaItem label={dict.detail.categories}>
            <span className="flex flex-wrap gap-1.5">
              {cats.length === 0
                ? '—'
                : cats.map((c) => (
                    <Link
                      key={c.id}
                      href={`/datasets?category=${c.slug}`}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-blue-600 hover:text-blue-700"
                    >
                      {lang === 'zh' ? c.name_zh : c.name_en}
                    </Link>
                  ))}
            </span>
          </MetaItem>
          <MetaItem label="API">{dataset.api_enabled ? '✓' : '—'}</MetaItem>
        </div>

        {/* description */}
        {desc && (
          <div className="prose-sm mt-6 max-w-none whitespace-pre-line text-slate-700">
            {desc}
          </div>
        )}
      </div>

      {/* resources */}
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{dict.detail.resourcesTitle}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">{dict.detail.resourceName}</th>
                <th className="py-2 pr-4 font-medium">{dict.detail.resourceFormat}</th>
                <th className="py-2 pr-4 font-medium">{dict.detail.resourceSize}</th>
                <th className="py-2 font-medium">{dict.detail.resourceLink}</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 text-slate-900">
                    {lang === 'zh' ? r.name_zh : r.name_en}
                  </td>
                  <td className="py-3 pr-4">
                    <FormatBadge format={r.format} />
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatBytes(r.size_bytes)}</td>
                  <td className="py-3">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {dict.detail.externalLink} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* collected data preview */}
      {seriesPreview.length > 0 && (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{dict.detail.dataTitle}</h2>
            {dataset.api_enabled && (
              <div className="flex items-center gap-4">
                <a
                  href={`/api/v1/datasets/${dataset.slug}/series?format=csv`}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
                >
                  ⬇ {dict.detail.dataCsvLink}
                </a>
                <a
                  href={`/api/v1/datasets/${dataset.slug}/series`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  {dict.detail.dataJsonLink} ↗
                </a>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-6">
            <SeriesChart
              lang={lang}
              series={chartBundle
                .filter((s) => s.observations.length >= 2)
                .map((s) => ({
                  name: (lang === 'zh' ? s.name_zh : s.name_en) ?? s.code,
                  unit: s.unit,
                  points: s.observations,
                }))}
            />
            {seriesPreview.map((s) => (
              <div key={s.code}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {lang === 'zh' ? s.name_zh ?? s.code : s.name_en ?? s.code}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {s.frequency}
                    {s.unit ? ` · ${s.unit}` : ''}
                  </span>
                </div>
                {s.observations.length === 0 ? (
                  <p className="mt-2 text-xs italic text-slate-400">{dict.detail.dataEmpty}</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-1.5 pr-4 font-medium">{dict.detail.dataPeriod}</th>
                          <th className="py-1.5 font-medium">{dict.detail.dataValue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.observations.map((o) => (
                          <tr key={o.period} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 pr-4 text-slate-600">{o.period}</td>
                            <td className="py-1.5 text-slate-900">
                              {o.value.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-GB')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* developer API hint */}
      {dataset.api_enabled && (
        <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">{dict.detail.apiBoxTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{dict.detail.apiBoxBody}</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-2 pl-4">
            <code className="flex-1 overflow-x-auto text-sm text-slate-800">{apiUrl}</code>
            <CopyButton text={apiUrl} copyLabel={dict.detail.copy} copiedLabel={dict.detail.copied} />
          </div>
        </section>
      )}

      {/* related */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">{dict.detail.relatedTitle}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {related.map((d) => (
              <DatasetCard key={d.id} dataset={d} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await getPublicSupabase();
  const { data } = await supabase
    .from('datasets')
    .select('title_en, title_zh, description_en, description_zh')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!data) return {};
  const lang = await getLang();
  return {
    title: lang === 'zh' ? data.title_zh : data.title_en,
    description: (lang === 'zh' ? data.description_zh : data.description_en) ?? undefined,
  };
}
