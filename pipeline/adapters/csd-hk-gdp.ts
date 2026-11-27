import type { Adapter, SeriesPoints, SeriesMeta } from '../lib/types';
import { fetchMdt, fetchComp, CSD_BASE } from '../lib/csd';

const TABLE_ID = '310-31001'; // old web_table id=31 → GDP
// nominal GDP, current market prices, HK$ million
const STAT_VAR = 'CUR';
const STAT_PRES = 'Raw_M_hkd_d';

const meta: SeriesMeta = {
  code: 'csd_hk_gdp_quarterly',
  nameEn: 'Hong Kong GDP at current market prices',
  nameZh: '香港以當時市價計算的本地生產總值',
  unit: 'HK$ million',
  frequency: 'quarterly',
  sourceUrl: `${CSD_BASE}/en/web_table.html?id=31`,
};

export const adapter: Adapter = {
  id: 'csd-hk-gdp',
  codePrefixes: ['csd_hk_gdp'],
  seriesMeta: [meta],
  run: async (): Promise<SeriesPoints[]> => {
    // theme id is looked up from comp.json at runtime
    const comp = await fetchComp(TABLE_ID);
    const rows = await fetchMdt(comp.theme_id, TABLE_ID, STAT_VAR, STAT_PRES);
    const points = rows
      .filter((r) => r.Q !== '') // quarterly rows only; blank Q = annual
      .map((r) => ({
        period: `${r.CCYY}-Q${r.Q}`,
        value: Number(r.obs_value),
        raw: r,
      }))
      .filter((p) => Number.isFinite(p.value));
    return [{ series: meta, points }];
  },
};
