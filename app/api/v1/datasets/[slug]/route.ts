import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';
import { datasetCategories } from '@/lib/catalog';
import type { Dataset } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await getPublicSupabase();
  const { data } = await supabase
    .from('datasets')
    .select('*, organizations(*), resources(*), dataset_categories(categories(*))')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  const d = data as Dataset | null;
  if (!d) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const org = d.organizations ?? null;
  return NextResponse.json(
    {
      data: {
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
        created_at: d.created_at,
        updated_at: d.updated_at,
        resources: [...(d.resources ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => ({
            name: { en: r.name_en, zh: r.name_zh },
            format: r.format,
            url: r.url,
            size_bytes: r.size_bytes,
          })),
      },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
