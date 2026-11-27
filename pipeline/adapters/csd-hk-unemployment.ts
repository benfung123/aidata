// CSD HK unemployment monthly — pending reverse-engineering of the web_table API.
// Target table: https://www.censtatd.gov.hk/en/web_table.html?id=210-06103
import type { Adapter, AdapterSeriesResult } from '../lib/types';

export const csdHkUnemployment: Adapter = {
  id: 'csd-hk-unemployment',
  codePrefixes: ['csd_hk_unemployment_'],
  seriesMeta: [
    {
      code: 'csd_hk_unemployment_rate',
      nameEn: 'Hong Kong unemployment rate (seasonally adjusted)',
      nameZh: '香港失業率（經季節調整）',
      unit: '%',
      frequency: 'monthly',
      sourceUrl: 'https://www.censtatd.gov.hk/en/web_table.html?id=210-06103',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    throw new Error('pending: CSD web_table API endpoint not yet reverse-engineered');
  },
};
