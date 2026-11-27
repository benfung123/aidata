// HKMA HIBOR daily — HK Interbank Interest Rates.
// Source: https://api.hkma.gov.hk (Open API, no key). One series per tenor.
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';

const SOURCE_URL =
  'https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hk-interbank-ir-daily';
const PAGE_SIZE = 100;

const TENORS = [
  { field: 'ir_overnight', code: 'hkma_hibor_overnight', en: 'HIBOR Overnight', zh: '港元隔夜銀行同業拆息' },
  { field: 'ir_1w', code: 'hkma_hibor_1w', en: 'HIBOR 1-week', zh: '港元一週銀行同業拆息' },
  { field: 'ir_1m', code: 'hkma_hibor_1m', en: 'HIBOR 1-month', zh: '港元一個月銀行同業拆息' },
  { field: 'ir_3m', code: 'hkma_hibor_3m', en: 'HIBOR 3-month', zh: '港元三個月銀行同業拆息' },
  { field: 'ir_6m', code: 'hkma_hibor_6m', en: 'HIBOR 6-month', zh: '港元六個月銀行同業拆息' },
  { field: 'ir_9m', code: 'hkma_hibor_9m', en: 'HIBOR 9-month', zh: '港元九個月銀行同業拆息' },
  { field: 'ir_12m', code: 'hkma_hibor_12m', en: 'HIBOR 12-month', zh: '港元一年銀行同業拆息' },
] as const;

interface HkmaRecord {
  end_of_day: string;
  [key: string]: unknown;
}

async function fetchPage(offset: number): Promise<HkmaRecord[]> {
  const url = `${SOURCE_URL}?pagesize=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HKMA ${res.status} at offset ${offset}`);
  const json = (await res.json()) as { result?: { records?: HkmaRecord[] } };
  return json.result?.records ?? [];
}

export const hkmaHibor: Adapter = {
  id: 'hkma-hibor',
  codePrefixes: ['hkma_hibor_'],
  seriesMeta: TENORS.map((t) => ({
    code: t.code,
    nameEn: t.en,
    nameZh: t.zh,
    unit: '% p.a.',
    frequency: 'daily' as const,
    sourceUrl: 'https://www.hkma.gov.hk/eng/market-data/hk-interbank-ir/hk-interbank-ir-daily/',
    dataUrl: 'https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hk-interbank-ir-daily',
  })),
  async run(): Promise<AdapterSeriesResult[]> {
    const byCode = new Map<string, SeriesPoint[]>(TENORS.map((t) => [t.code, []]));

    let offset = 0;
    for (;;) {
      const records = await fetchPage(offset);
      for (const rec of records) {
        for (const t of TENORS) {
          const v = rec[t.field];
          if (typeof v !== 'number' || !Number.isFinite(v)) continue;
          byCode.get(t.code)!.push({ period: rec.end_of_day, value: v, raw: { [t.field]: v } });
        }
      }
      if (records.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return TENORS.map((t) => ({ code: t.code, points: byCode.get(t.code)! }));
  },
};
