import type { Adapter, SeriesPoints, SeriesMeta } from '../lib/types';
import { fetchMdt, fetchComp, CSD_BASE } from '../lib/csd';

const TABLE_ID = '210-06103'; // headline unemployment rate (seasonally adjusted)
const STAT_VAR = 'UR';
const STAT_PRES = 'Rate_1dp_%_n';

const meta: SeriesMeta = {
  code: 'csd_hk_unemployment_rate',
  nameEn: 'Hong Kong unemployment rate (seasonally adjusted)',
  nameZh: '香港失業率（經季節性調整）',
  unit: '%',
  frequency: 'monthly',
  sourceUrl: `${CSD_BASE}/en/web_table.html?id=210-06103`,
};

export const adapter: Adapter = {
  id: 'csd-hk-unemployment',
  codePrefixes: ['csd_hk_unemployment'],
  seriesMeta: [meta],
  run: async (): Promise<SeriesPoints[]> => {
    const comp = await fetchComp(TABLE_ID);
    const rows = await fetchMdt(comp.theme_id, TABLE_ID, STAT_VAR, STAT_PRES);
    const points = rows
      // headline = all ages (AGE blank), both sexes (SEX blank), monthly rows (M3M set);
      // rows with blank M3M are annual averages → excluded
      .filter((r) => r.M3M !== '' && (r.AGE ?? '') === '' && (r.SEX ?? '') === '')
      .map((r) => ({
        period: `${r.CCYY}-${String(Number(r.M3M)).padStart(2, '0')}`,
        value: Number(r.obs_value),
        raw: r,
      }))
      .filter((p) => Number.isFinite(p.value));
    return [{ series: meta, points }];
  },
};
