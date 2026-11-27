import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDict, getLang } from '@/lib/i18n';
import { getPublicSupabase } from '@/lib/supabase/server';
import type { Dataset, Organization } from '@/lib/types';
import DatasetCard from '@/components/DatasetCard';

async function getOrg(slug: string): Promise<Organization | null> {
  const supabase = await getPublicSupabase();
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Organization) ?? null;
}

async function getOrgDatasets(orgId: string): Promise<Dataset[]> {
  const supabase = await getPublicSupabase();
  const { data } = await supabase
    .from('datasets')
    .select('*, organizations(*), resources(*), dataset_categories(categories(*))')
    .eq('organization_id', orgId)
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  return (data ?? []) as Dataset[];
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getLang();
  const dict = await getDict();

  const org = await getOrg(slug);
  if (!org) notFound();

  const datasets = await getOrgDatasets(org.id);
  const name = lang === 'zh' ? org.name_zh : org.name_en;
  const altName = lang === 'zh' ? org.name_en : org.name_zh;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/organizations" className="text-sm font-medium text-blue-700 hover:underline">
        ← {dict.organizations.title}
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
        {altName !== name && <p className="mt-1 text-slate-500">{altName}</p>}
        {org.website && (
          <p className="mt-2 text-sm">
            <span className="text-slate-500">{dict.organizations.website}: </span>
            <a
              href={org.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 hover:underline"
            >
              {org.website.replace(/^https?:\/\//, '')} ↗
            </a>
          </p>
        )}
        <p className="mt-3 text-sm text-blue-700">
          {datasets.length} {dict.organizations.datasets}
        </p>
      </div>

      {datasets.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {dict.organizations.noDatasets}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <DatasetCard key={d.id} dataset={d} lang={lang} />
          ))}
        </div>
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
  const org = await getOrg(slug);
  if (!org) return {};
  const lang = await getLang();
  return { title: lang === 'zh' ? org.name_zh : org.name_en };
}
