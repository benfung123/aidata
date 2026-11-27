import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';

type SeriesRow = {
  id: string;
  code: string;
  name_en: string | null;
  name_zh: string | null;
  unit: string | null;
  frequency: string;
};

type ObsRow = { series_id: string; period: string; value: number };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const perSeries = Math.min(Math.max(parseInt(limitParam ?? '500', 10) || 500, 1), 20000);

  const supabase = await getPublicSupabase();

  const { data: dataset } = await supabase
    .from('datasets')
    .select('id, slug, api_enabled, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!dataset) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: seriesRows } = await supabase
    .from('series')
    .select('id, code, name_en, name_zh, unit, frequency')
    .eq('dataset_id', dataset.id)
    .order('code');

  const series = (seriesRows ?? []) as SeriesRow[];
  if (series.length === 0) {
    return NextResponse.json({
      data: { dataset: slug, series: [] },
      meta: { count: 0, limit: perSeries },
    });
  }

  const { data: obsRows } = await supabase
    .from('observations')
    .select('series_id, period, value')
    .in(
      'series_id',
      series.map((s) => s.id),
    )
    .order('period', { ascending: false })
    .limit(perSeries * series.length);

  const bySeries = new Map<string, ObsRow[]>();
  for (const row of (obsRows ?? []) as ObsRow[]) {
    const list = bySeries.get(row.series_id) ?? [];
    if (list.length < perSeries) {
      list.push(row);
      bySeries.set(row.series_id, list);
    }
  }

  return NextResponse.json(
    {
      data: {
        dataset: slug,
        series: series.map((s) => ({
          code: s.code,
          name: { en: s.name_en, zh: s.name_zh },
          unit: s.unit,
          frequency: s.frequency,
          count: bySeries.get(s.id)?.length ?? 0,
          observations: (bySeries.get(s.id) ?? [])
            .slice()
            .reverse()
            .map((o) => ({ period: o.period, value: o.value })),
        })),
      },
      meta: { count: series.length, limit: perSeries },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
