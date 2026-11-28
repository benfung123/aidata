// ONS (UK) — unemployment rate aged 16 and over, seasonally adjusted, monthly.
// Series MGSX, dataset LMS.
// Source: https://www.ons.gov.uk (Open Government Licence v3.0).
// Verified 2026-11-28: JSON endpoint live, history from 1971, latest 2026 AUG = 4.6.
// (Legacy api.ons.gov.uk retired 2024-11; the page-level /data JSON and the
//  /generator CSV route both work — JSON used here.)
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';

const SOURCE_URL =
  'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms/data';

const MON: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

export const onsUkUnemployment: Adapter = {
  id: 'ons-uk-unemployment',
  codePrefixes: ['ons_uk_unemployment_'],
  seriesMeta: [
    {
      code: 'ons_uk_unemployment_rate',
      nameEn: 'UK unemployment rate (aged 16+, seasonally adjusted)',
      nameZh: '英國失業率（16歲或以上，經季節調整）',
      unit: '%',
      frequency: 'monthly',
      sourceUrl:
        'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms',
      dataUrl: SOURCE_URL,
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ONS ${res.status}`);
    const json = (await res.json()) as {
      months?: { date: string; value: string }[];
    };
    const points: SeriesPoint[] = [];
    for (const m of json.months ?? []) {
      const hit = m.date.match(/^(\d{4})\s+([A-Z]{3})$/);
      if (!hit) continue;
      const mm = MON[hit[2]];
      const value = Number(m.value);
      if (!mm || !Number.isFinite(value)) continue;
      points.push({ period: `${hit[1]}-${mm}`, value, raw: { date: m.date } });
    }
    if (points.length === 0) throw new Error('ONS: no monthly observations parsed for MGSX');
    return [{ code: 'ons_uk_unemployment_rate', points }];
  },
};
