// CSD HK GDP quarterly — pending reverse-engineering of the web_table API.
// Target: https://www.censtatd.gov.hk/en/web_table.html?id=31
import type { Adapter, AdapterSeriesResult } from '../lib/types';

export const csdHkGdp: Adapter = {
  id: 'csd-hk-gdp',
  codePrefixes: ['csd_hk_gdp_'],
  seriesMeta: [
    {
      code: 'csd_hk_gdp_quarterly',
      nameEn: 'Hong Kong GDP (quarterly)',
      nameZh: '香港本地生產總值（按季）',
      unit: 'HK$ million',
      frequency: 'quarterly',
      sourceUrl: 'https://www.censtatd.gov.hk/en/web_table.html?id=31',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    throw new Error('pending: CSD web_table API endpoint not yet reverse-engineered');
  },
};
