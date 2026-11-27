import Link from 'next/link';
import { getDict, getLang } from '@/lib/i18n';
import { getPublicSupabase } from '@/lib/supabase/server';
import type { Category, Dataset } from '@/lib/types';
import DatasetCard from '@/components/DatasetCard';
import { formatCount } from '@/lib/format';

interface CategoryWithCount extends Category {
  dataset_count: number;
}

async function getStats() {
  const supabase = await getPublicSupabase();
  const [datasets, orgs, resources, api] = await Promise.all([
    supabase
      .from('datasets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true }),
    supabase.from('resources').select('id', { count: 'exact', head: true }),
    supabase
      .from('datasets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('api_enabled', true),
  ]);
  return {
    datasets: datasets.count ?? 0,
    organizations: orgs.count ?? 0,
    resources: resources.count ?? 0,
    apiEnabled: api.count ?? 0,
  };
}

async function getCategories(): Promise<CategoryWithCount[]> {
  const supabase = await getPublicSupabase();
  const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const { data: links } = await supabase
    .from('dataset_categories')
    .select('category_id');

  const counts = new Map<string, number>();
  for (const l of links ?? []) {
    counts.set(l.category_id, (counts.get(l.category_id) ?? 0) + 1);
  }

  return (cats ?? []).map((c: Category) => ({
    ...c,
    dataset_count: counts.get(c.id) ?? 0,
  }));
}

async function getLatestDatasets(): Promise<Dataset[]> {
  const supabase = await getPublicSupabase();
  const { data } = await supabase
    .from('datasets')
    .select('*, organizations(*)')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(8);
  return (data ?? []) as Dataset[];
}

export default async function HomePage() {
  const lang = await getLang();
  const dict = await getDict();
  const [stats, categories, latest] = await Promise.all([
    getStats(),
    getCategories(),
    getLatestDatasets(),
  ]);

  const statsItems = [
    { value: stats.datasets, label: dict.home.stats.datasets },
    { value: stats.organizations, label: dict.home.stats.organizations },
    { value: stats.resources, label: dict.home.stats.resources },
    { value: stats.apiEnabled, label: dict.home.stats.apiEnabled },
  ];

  return (
    <div>
      {/* hero */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {dict.home.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            {dict.home.heroSubtitle}
          </p>
          <form action="/datasets" method="get" className="mx-auto mt-8 flex max-w-xl items-center gap-2">
            <input
              type="search"
              name="q"
              placeholder={dict.nav.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-blue-700 px-5 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-800"
            >
              {dict.home.searchButton}
            </button>
          </form>
        </div>
      </section>

      {/* stats strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-6 sm:grid-cols-4 sm:px-6">
          {statsItems.map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <div className="text-2xl font-bold text-blue-700 sm:text-3xl">
                {formatCount(s.value)}
              </div>
              <div className="mt-1 text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">
          {dict.home.categoriesTitle}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/datasets?category=${c.slug}`}
              className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="text-3xl">{c.icon ?? '📁'}</div>
              <div className="mt-2 font-medium text-slate-900">
                {lang === 'zh' ? c.name_zh : c.name_en}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {c.dataset_count} {dict.datasets.title}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* latest datasets */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {dict.home.latestTitle}
          </h2>
          <Link
            href="/datasets"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            {dict.home.viewAll} →
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {dict.home.noDatasets}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {latest.map((d) => (
              <DatasetCard key={d.id} dataset={d} lang={lang} />
            ))}
          </div>
        )}
      </section>

      {/* about */}
      <section id="about" className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-xl font-bold text-slate-900">
            {dict.home.aboutTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            {dict.home.aboutBody}
          </p>
        </div>
      </section>
    </div>
  );
}
