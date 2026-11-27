// SingStat Singapore GDP quarterly — needs free API key (SINGSTAT_API_KEY), else skips.
// Target table: https://tablebuilder.singstat.gov.sg/table/TS/M015941
import type { Adapter, AdapterSeriesResult } from '../lib/types';

export const singstatSgGdp: Adapter = {
  id: 'singstat-sg-gdp',
  codePrefixes: ['singstat_sg_gdp_'],
  seriesMeta: [
    {
      code: 'singstat_sg_gdp_quarterly',
      nameEn: 'Singapore GDP at current market prices (quarterly)',
      nameZh: '新加坡本地生產總值（按季，當時市價）',
      unit: 'S$ million',
      frequency: 'quarterly',
      sourceUrl: 'https://tablebuilder.singstat.gov.sg/table/TS/M015941',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    if (!process.env.SINGSTAT_API_KEY) {
      throw new Error('pending: SINGSTAT_API_KEY not set — register free key at singstat.gov.sg');
    }
    throw new Error('pending: SingStat Table Builder API client not yet implemented');
  },
};
