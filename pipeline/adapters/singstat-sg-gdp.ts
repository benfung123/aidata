import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';

// SingStat Table Builder developer API — verified 2026-11-27: no API key required,
// just a browser-like User-Agent + Accept: application/json.
// Table M015651 = "Gross Domestic Product At Current Prices, By Industry (SSIC 2020), Quarterly"
// (the brief's M015941 is real/chained GDP by industry — swapped to the current-price table).
const TABLE_ID = 'M015651';
const API = `https://tablebuilder.singstat.gov.sg/api/table/tabledata/${TABLE_ID}`;

const meta: AdapterSeriesMeta = {
  code: 'singstat_sg_gdp_quarterly',
  nameEn: 'Singapore GDP at current market prices',
  nameZh: '新加坡以當時市價計算的本地生產總值',
  unit: 'S$ million',
  frequency: 'quarterly',
  sourceUrl: 'https://tablebuilder.singstat.gov.sg/table/TS/M015651',
};

interface SgRow { seriesNo: string; rowText: string; uoM: string; columns: { key: string; value: string }[] }
interface SgResponse { Data?: { title?: string; row?: SgRow[] }; StatusCode?: number; Message?: string }

export const singstatSgGdp: Adapter = {
  id: 'singstat-sg-gdp',
  codePrefixes: ['singstat_sg_gdp'],
  seriesMeta: [meta],
  run: async (): Promise<AdapterSeriesResult[]> => {
    const res = await fetch(API, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' },
    });
    if (!res.ok) throw new Error(`SingStat ${TABLE_ID}: HTTP ${res.status}`);
    const json = (await res.json()) as SgResponse;
    if (json.StatusCode !== 200 || !json.Data?.row) {
      throw new Error(`SingStat ${TABLE_ID}: ${json.Message || JSON.stringify(json.Data).slice(0, 120)}`);
    }
    const total = json.Data.row.find((r) => r.seriesNo === '1');
    if (!total) throw new Error('SingStat: series 1 (GDP at current market prices) not found');
    const points = total.columns
      .map((c) => {
        const m = c.key.match(/^(\d{4})\s+(\d)Q$/); // "1975 1Q"
        if (!m) return null;
        return { period: `${m[1]}-Q${m[2]}`, value: Number(c.value), raw: { row: total.rowText, key: c.key } };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && Number.isFinite(p.value));
    return [{ code: meta.code, points }];
  },
};
