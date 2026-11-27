// MOM Singapore unemployment monthly — pending XLSX download discovery.
// Target: https://stats.mom.gov.sg/publications/statistical-tables-unemployment/
import type { Adapter, AdapterSeriesResult } from '../lib/types';

export const momSgUnemployment: Adapter = {
  id: 'mom-sg-unemployment',
  codePrefixes: ['mom_sg_unemployment_'],
  seriesMeta: [
    {
      code: 'mom_sg_unemployment_rate',
      nameEn: 'Singapore unemployment rate (seasonally adjusted)',
      nameZh: '新加坡失業率（經季節調整）',
      unit: '%',
      frequency: 'monthly',
      sourceUrl: 'https://stats.mom.gov.sg/publications/statistical-tables-unemployment/',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    throw new Error('pending: MOM XLSX download URL not yet discovered');
  },
};
