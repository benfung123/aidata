import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';
import { cachedFetch } from '@/lib/cache';

type SeriesRow = {
  id: string;
  code: string;
  name_en: string | null;
  name_zh: string | null;
  unit: string | null;
  frequency: string;
};

type ObsRow = { series_id: string; period: string; value: number };

type ApiSeriesBundle = {
  code: string;
  name_en: string | null;
  name_zh: string | null;
  unit: string | null;
  frequency: string;
  observations: { period: string; value: number }[];
};

// Cached per (datasetId, limit) — pipeline updates at most daily, so a
// 5-minute data cache is invisible to consumers but kills repeat DB scans.
const getApiSeriesBundle = cachedFetch(
  async (datasetId: string, limit: number): Promise<ApiSeriesBundle[]> => {
    const supabase = await getPublicSupabase();
    const { data: seriesRows } = await supabase
      .from('series')
      .select('id, code, name_en, name_zh, unit, frequency')
      .eq('dataset_id', datasetId)
      .order('code');
    const series = (seriesRows ?? []) as SeriesRow[];
    if (series.length === 0) return [];

    // fetch per-series: a single .in() query with a global limit starves
    // later series when one has more rows than the limit. Page through in
    // ascending ranges — PostgREST clamps any single response to max_rows.
    const obsBySeries = new Map<string, ObsRow[]>();
    await Promise.all(
      series.map(async (s) => {
        const out: ObsRow[] = [];
        const pageSize = 1000;
        let from = 0;
        while (out.length < limit) {
          const take = Math.min(pageSize, limit - out.length);
          const { data } = await supabase
            .from('observations')
            .select('series_id, period, value')
            .eq('series_id', s.id)
            .order('period', { ascending: false })
            .range(from, from + take - 1);
          const rows = (data ?? []) as ObsRow[];
          out.push(...rows);
          if (rows.length < take) break;
          from += take;
        }
        obsBySeries.set(s.id, out.slice().reverse());
      }),
    );

    return series.map((s) => ({
      code: s.code,
      name_en: s.name_en,
      name_zh: s.name_zh,
      unit: s.unit,
      frequency: s.frequency,
      observations: (obsBySeries.get(s.id) ?? []).map((o) => ({
        period: o.period,
        value: o.value,
      })),
    }));
  },
  ['api-series-bundle'],
  300,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const isCsv = request.nextUrl.searchParams.get('format') === 'csv';
  // JSON: default 500/series (API consumers page through); CSV export: all rows
  const maxCap = isCsv ? 200000 : 20000;
  const fallback = isCsv ? maxCap : 500;
  const perSeries = Math.min(
    Math.max(parseInt(limitParam ?? String(fallback), 10) || fallback, 1),
    maxCap,
  );

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

  const series = await getApiSeriesBundle(dataset.id as string, perSeries);

  if (isCsv) {
    const esc = (v: string | null | undefined) => {
      const s = v ?? '';
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header =
      'series_code,series_name_en,series_name_zh,unit,frequency,period,value';
    const lines = series.flatMap((s) =>
      s.observations.map(
        (o) =>
          `${esc(s.code)},${esc(s.name_en)},${esc(s.name_zh)},${esc(s.unit)},${esc(
            s.frequency,
          )},${esc(o.period)},${o.value}`,
      ),
    );
    const csv = '\uFEFF' + [header, ...lines].join('\r\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.csv"`,
        'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
      },
    });
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
          count: s.observations.length,
          observations: s.observations,
        })),
      },
      meta: { count: series.length, limit: perSeries },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
