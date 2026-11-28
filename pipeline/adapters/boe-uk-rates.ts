// Bank of England (UK) — official Bank Rate and SONIA, daily.
// Source: BoE Interactive Statistical Database (IADB) CSV endpoint — no key required.
// Verified 2026-11-28: live CSV confirmed (Bank Rate 3.75% → raised to 4.00% on 05 Nov 2026).
// Series codes: IUDBEDR (Bank Rate), IUDSOIA (SONIA).
// Licence: reuse permitted with acknowledgement ("Source: Bank of England").
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';

const IADB = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SERIES = [
  { code: 'boe_uk_bank_rate', iadb: 'IUDBEDR', en: 'UK Bank Rate (official base rate)', zh: '英國官方銀行利率（基準利率）' },
  { code: 'boe_uk_sonia', iadb: 'IUDSOIA', en: 'Sterling Overnight Index Average (SONIA)', zh: '英鎊隔夜平均利率（SONIA）' },
] as const;

function csvUrl(seriesCode: string, from: string, to: string): string {
  const params = new URLSearchParams({
    'csv.x': 'yes',
    SeriesCodes: seriesCode,
    UsingCodes: 'Y',
    CSVF: 'TN',
    VPD: 'Y',
    Datefrom: from,
    Dateto: to,
  });
  return `${IADB}?${params.toString()}`;
}

/** "02 Nov 2026" → "2026-11-02"; returns null on unexpected formats. */
function parseDate(cell: string): string | null {
  const m = cell.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const mm = MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mm < 0) return null;
  return `${m[3]}-${String(mm + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

async function fetchSeries(iadbCode: string): Promise<SeriesPoint[]> {
  const now = new Date();
  // IADB Dateto excludes the given month — ask for next month's day 1 so the
  // current month's observations (e.g. a Nov rate hike) are included.
  const to = `01/${MON[(now.getUTCMonth() + 1) % 12]}/${now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()}`;
  const url = csvUrl(iadbCode, '01/Jan/1975', to);
  const res = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`BoE IADB ${res.status} for ${iadbCode}`);
  const text = await res.text();
  if (!text.includes('DATE')) throw new Error(`BoE IADB returned non-CSV for ${iadbCode} (maintenance?)`);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const points: SeriesPoint[] = [];
  for (const line of lines) {
    const [dateCell, valueCell] = line.split(',');
    if (dateCell?.trim() === 'DATE') continue; // header
    const period = parseDate(dateCell ?? '');
    const value = Number(valueCell);
    if (!period || !Number.isFinite(value)) continue;
    points.push({ period, value, raw: { [iadbCode]: value } });
  }
  if (points.length === 0) throw new Error(`BoE IADB: no observations parsed for ${iadbCode}`);
  return points;
}

// Resource link uses a rolling 2-year window (computed at catalog/import time)
// so the downloadable CSV on the dataset page stays current.
function rollingCsvUrl(seriesCode: string): string {
  const now = new Date();
  const from = `01/Jan/${now.getUTCFullYear() - 1}`;
  const to = `01/${MON[(now.getUTCMonth() + 1) % 12]}/${now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()}`;
  return csvUrl(seriesCode, from, to);
}

export const boeUkRates: Adapter = {
  id: 'boe-uk-rates',
  codePrefixes: ['boe_uk_'],
  seriesMeta: SERIES.map((s) => ({
    code: s.code,
    nameEn: s.en,
    nameZh: s.zh,
    unit: '%',
    frequency: 'daily' as const,
    sourceUrl: 'https://www.bankofengland.co.uk/boeapps/database/',
    dataUrl: rollingCsvUrl(s.iadb),
  })),
  async run(): Promise<AdapterSeriesResult[]> {
    const out: AdapterSeriesResult[] = [];
    for (const s of SERIES) {
      out.push({ code: s.code, points: await fetchSeries(s.iadb) });
    }
    return out;
  },
};
