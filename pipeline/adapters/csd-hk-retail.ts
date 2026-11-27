// CSD HK retail sales monthly — pending reverse-engineering of the web_table API.
// Target table: https://www.censtatd.gov.hk/en/web_table.html?id=620-67001
import type { Adapter, AdapterSeriesResult } from '../lib/types';

export const csdHkRetail: Adapter = {
  id: 'csd-hk-retail',
  codePrefixes: ['csd_hk_retail_'],
  seriesMeta: [
    {
      code: 'csd_hk_retail_value_index',
      nameEn: 'Hong Kong retail sales value index',
      nameZh: '香港零售業銷貨價值指數',
      unit: 'index (Oct 2019–Sep 2020 = 100)',
      frequency: 'monthly',
      sourceUrl: 'https://www.censtatd.gov.hk/en/web_table.html?id=620-67001',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    throw new Error('pending: CSD web_table API endpoint not yet reverse-engineered');
  },
};
