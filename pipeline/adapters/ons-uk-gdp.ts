// ONS UK GDP quarterly — series IHYR (UKEA).
// Title (verified 2026-11): "Gross Domestic Product: q-on-q4 growth rate CVM SA %"
// → quarter-on-quarter growth rate, chained volume measures, seasonally adjusted, %.
// Source: https://www.ons.gov.uk (Open Government Licence v3.0).
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';

const SOURCE_URL =
  'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/ukea/data';

export const onsUkGdp: Adapter = {
  id: 'ons-uk-gdp',
  codePrefixes: ['ons_uk_gdp_'],
  seriesMeta: [
    {
      code: 'ons_uk_gdp_quarterly',
      nameEn: 'UK GDP q-on-q growth rate (chained volume, seasonally adjusted)',
      nameZh: '英國本地生產總值按季增長率（連鎖量度，經季節調整）',
      unit: '%',
      frequency: 'quarterly',
      sourceUrl: 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/ukea',
      dataUrl: 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/ukea/data',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ONS ${res.status}`);
    const json = (await res.json()) as {
      quarters?: { date: string; value: string }[];
    };
    const points: SeriesPoint[] = [];
    for (const q of json.quarters ?? []) {
      const m = q.date.match(/^(\d{4})\s+(Q[1-4])$/);
      if (!m) continue;
      const value = Number(q.value);
      if (!Number.isFinite(value)) continue;
      points.push({ period: `${m[1]}-${m[2]}`, value, raw: { date: q.date } });
    }
    return [{ code: 'ons_uk_gdp_quarterly', points }];
  },
};
