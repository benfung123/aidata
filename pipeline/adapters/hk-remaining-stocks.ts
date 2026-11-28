// HK first-hand private residential "remaining stocks" (貨尾) proxy indicators.
//
// The Housing Bureau (HB) quarterly "Statistics on Private Housing Supply in the
// Primary Market" publishes the official unsold-unit counts, but ONLY as PDF
// (https://www.hb.gov.hk/eng/publications/housing/private/pshpm/index.html) — no
// machine-readable route exists (verified 2026-11-28: XLS/XLSX/CSV 404, CKAN org
// hk-hb has no such dataset). Per scope decision, this adapter ships the official
// machine-readable proxies instead:
//
//   1. LandsD issued presale consents for residential developments (CSDI WFS → CSV).
//      Each feature = one issued consent (project phase), with issue year/month and
//      number of residential units. Full archive back to 1999-04. Verified 2026-11-28.
//   2. Buildings Department Monthly Digests (data.gov.hk static CSVs):
//      Md13 = occupation permits issued (domestic units → official completion count),
//      Md17 = completion of new buildings (domestic GFA). Back to 2011-06.
//
// What is NOT obtainable machine-readably (documented for the catalog page):
//   - actual unsold-unit counts / district breakdown / developer breakdown (HB PDF only).
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta, SeriesPoint } from '../lib/types';
import { parseCsv } from '../lib/csd';

const LANDSD_CSV =
  'https://portal.csdi.gov.hk/server/services/common/landsd_rcd_1637303511514_65978/MapServer/WFSServer?service=wfs&request=GetFeature&typename=csdi:LAO_PCRD&outputFormat=CSV';
const LANDSD_PAGE = 'https://data.gov.hk/en-data/dataset/hk-landsd-openmap-lao-pcrd';
const BD_DIGEST_PAGE = 'https://www.bd.gov.hk/en/whats-new/monthly-digests/index.html';
const BD_MD13_CSV = 'https://static.data.gov.hk/bd/opendata/monthlydigests/Md13.csv';
const BD_MD17_CSV = 'https://static.data.gov.hk/bd/opendata/monthlydigests/Md17.csv';

const metas: AdapterSeriesMeta[] = [
  {
    code: 'landsd_hk_pc_consents',
    nameEn: 'HK issued presale consents — residential developments (monthly count)',
    nameZh: '香港已批預售樓花同意書（住宅發展項目）每月宗數',
    unit: '宗',
    frequency: 'monthly',
    sourceUrl: LANDSD_PAGE,
    dataUrl: LANDSD_CSV,
  },
  {
    code: 'landsd_hk_pc_units',
    nameEn: 'HK residential units under issued presale consents (monthly)',
    nameZh: '香港已批預售樓花同意書涵蓋住宅單位數目（每月）',
    unit: '個',
    frequency: 'monthly',
    sourceUrl: LANDSD_PAGE,
    dataUrl: LANDSD_CSV,
  },
  {
    code: 'bd_hk_completions_units',
    nameEn: 'HK domestic units in new buildings with occupation permits issued (monthly)',
    nameZh: '香港新建築物獲發入伙紙的住宅單位數目（屋宇署每月摘要，每月）',
    unit: '個',
    frequency: 'monthly',
    sourceUrl: BD_DIGEST_PAGE,
    dataUrl: BD_MD13_CSV,
  },
  {
    code: 'bd_hk_completions_gfa',
    nameEn: 'HK domestic gross floor area of completed new buildings (monthly, sq m)',
    nameZh: '香港新建築物落成的住宅總樓面面積（每月，平方米）',
    unit: '平方米',
    frequency: 'monthly',
    sourceUrl: BD_DIGEST_PAGE,
    dataUrl: BD_MD17_CSV,
  },
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

const pad2 = (n: string | number): string => String(n).padStart(2, '0');

/**
 * LandsD WFS CSV columns are aliased (SEARCHxx_EN/NSEARCHxx_EN). Verified mapping
 * against DescribeFeatureType (2026-11-28):
 *   SEARCH01/02 = Issue_Year / Issue_Month; NSEARCH13 = No. of Residential Units
 * (thousands-separated, e.g. "1,415"). One row = one issued consent (project phase).
 */
function aggregatePresaleConsents(rows: Record<string, string>[]): {
  consents: Map<string, number>;
  units: Map<string, number>;
} {
  const consents = new Map<string, number>();
  const units = new Map<string, number>();
  for (const r of rows) {
    const y = (r.SEARCH01_EN ?? '').trim();
    const m = (r.SEARCH02_EN ?? '').trim();
    if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m)) continue;
    const period = `${y}-${pad2(Number(m))}`;
    const uRaw = (r.NSEARCH13_EN ?? '').replaceAll(',', '').trim();
    const u = uRaw === '' ? 0 : Number(uRaw);
    consents.set(period, (consents.get(period) ?? 0) + 1);
    units.set(period, (units.get(period) ?? 0) + (Number.isFinite(u) ? u : 0));
  }
  return { consents, units };
}

/** BD monthly-digest CSV: Year, Month columns (1-based month, no zero padding). */
function digestPoints(
  rows: Record<string, string>[],
  column: string,
): SeriesPoint[] {
  return rows
    .map((r) => {
      const y = (r.Year ?? '').trim();
      const m = (r.Month ?? '').trim();
      const v = Number((r[column] ?? '').replaceAll(',', '').trim());
      if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !Number.isFinite(v)) return null;
      return { period: `${y}-${pad2(Number(m))}`, value: v };
    })
    .filter((p): p is SeriesPoint => p !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export const hkRemainingStocks: Adapter = {
  id: 'hk-remaining-stocks',
  codePrefixes: ['landsd_hk_pc_', 'bd_hk_completions_'],
  seriesMeta: metas,
  async run(): Promise<AdapterSeriesResult[]> {
    const [pcText, md13Text, md17Text] = await Promise.all([
      fetchText(LANDSD_CSV),
      fetchText(BD_MD13_CSV),
      fetchText(BD_MD17_CSV),
    ]);

    const { consents, units } = aggregatePresaleConsents(parseCsv(pcText));
    const toPoints = (m: Map<string, number>): SeriesPoint[] =>
      [...m.entries()]
        .map(([period, value]) => ({ period, value }))
        .sort((a, b) => a.period.localeCompare(b.period));

    const md13 = parseCsv(md13Text);
    const md17 = parseCsv(md17Text);

    return [
      { code: 'landsd_hk_pc_consents', points: toPoints(consents) },
      { code: 'landsd_hk_pc_units', points: toPoints(units) },
      { code: 'bd_hk_completions_units', points: digestPoints(md13, 'Total no. of domestic units#') },
      { code: 'bd_hk_completions_gfa', points: digestPoints(md17, 'Domestic GFA') },
    ];
  },
};
