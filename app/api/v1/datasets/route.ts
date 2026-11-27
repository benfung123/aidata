import { NextRequest, NextResponse } from 'next/server';
import { fetchDatasets, datasetCategories } from '@/lib/catalog';
import type { Dataset } from '@/lib/types';

function serialize(d: Dataset) {
  const org = d.organizations ?? null;
  return {
    slug: d.slug,
    title: { en: d.title_en, zh: d.title_zh },
    description: { en: d.description_en, zh: d.description_zh },
    organization: org
      ? { slug: org.slug, name: { en: org.name_en, zh: org.name_zh } }
      : null,
    categories: datasetCategories(d).map((c) => ({
      slug: c.slug,
      name: { en: c.name_en, zh: c.name_zh },
    })),
    update_frequency: d.update_frequency,
    license: d.license,
    api_enabled: d.api_enabled,
    view_count: d.view_count,
    updated_at: d.updated_at,
    resources: (d.resources ?? []).map((r) => ({
      name: { en: r.name_en, zh: r.name_zh },
      format: r.format,
      url: r.url,
      size_bytes: r.size_bytes,
    })),
  };
}

function splitParam(v: string | null): string[] {
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const perPage = Math.min(100, Math.max(1, Number(sp.get('per_page')) || 24));
  const page = Math.max(1, Number(sp.get('page')) || 1);

  const result = await fetchDatasets({
    q: sp.get('q')?.trim() || undefined,
    categorySlugs: splitParam(sp.get('category')),
    organizationSlugs: splitParam(sp.get('organization')),
    formats: splitParam(sp.get('format')),
    api: sp.get('api') === '1' || sp.get('api') === 'true' || undefined,
    sort: sp.get('sort') === 'title' ? 'title' : 'updated',
    page,
    perPage,
  });

  return NextResponse.json(
    {
      data: result.datasets.map(serialize),
      meta: { total: result.total, page: result.page, per_page: result.perPage },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
