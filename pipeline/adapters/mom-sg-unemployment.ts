import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';
import { parseCsv } from '../lib/csd';

// MOM Singapore monthly seasonally adjusted unemployment rate.
// The stats page links an isomer-hosted CSV whose UUID changes per release —
// so we resolve the current CSV URL from the page each run.
const PAGE = 'https://stats.mom.gov.sg/publications/statistical-tables-unemployment/';
const FILE_RE = /href="(https:\/\/isomer-user-content[^"]*mrsd_82_monthly_sa_ur_line\.csv)"/;

const meta: AdapterSeriesMeta = {
  code: 'mom_sg_unemployment_rate',
  nameEn: 'Singapore unemployment rate (seasonally adjusted)',
  nameZh: '新加坡失業率（經季節性調整）',
  unit: '%',
  frequency: 'monthly',
  sourceUrl: PAGE,
};

export const momSgUnemployment: Adapter = {
  id: 'mom-sg-unemployment',
  codePrefixes: ['mom_sg_unemployment'],
  seriesMeta: [meta],
  run: async (): Promise<AdapterSeriesResult[]> => {
    const pageRes = await fetch(PAGE, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' } });
    if (!pageRes.ok) throw new Error(`MOM page: HTTP ${pageRes.status}`);
    const html = await pageRes.text();
    const m = html.match(FILE_RE);
    if (!m) throw new Error('MOM: mrsd_82 CSV link not found on publications page (page layout changed?)');
    const csvRes = await fetch(m[1], { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' } });
    if (!csvRes.ok) throw new Error(`MOM CSV: HTTP ${csvRes.status}`);
    const rows = parseCsv(await csvRes.text());
    const points = rows
      .map((r) => ({
        period: r.month, // already YYYY-MM
        value: Number(r.seasonally_adjusted_overall_unemployment_rate),
        raw: {
          resident_rate: r.seasonally_adjusted_resident_unemployment_rate,
          citizen_rate: r.seasonally_adjusted_citizen_unemployment_rate,
        },
      }))
      .filter((p) => /^\d{4}-\d{2}$/.test(p.period) && Number.isFinite(p.value));
    if (points.length === 0) throw new Error('MOM: no monthly rows parsed');
    return [{ code: meta.code, points }];
  },
};
