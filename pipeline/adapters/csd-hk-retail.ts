import type { Adapter, SeriesPoints, SeriesMeta } from '../lib/types';
import { fetchMdt, fetchComp, CSD_BASE } from '../lib/csd';

const TABLE_ID = '620-67001'; // retail sales
// retail sales VALUE index (all retail outlets), raw index
const STAT_VAR = 'VAL_IDX_RS';
const STAT_PRES = 'Raw_1dp_idx_n';

const meta: SeriesMeta = {
  code: 'csd_hk_retail_value_index',
  nameEn: 'Hong Kong retail sales value index',
  nameZh: '香港零售業銷貨價值指數',
  unit: 'index',
  frequency: 'monthly',
  sourceUrl: `${CSD_BASE}/en/web_table.html?id=620-67001`,
};

export const adapter: Adapter = {
  id: 'csd-hk-retail',
  codePrefixes: ['csd_hk_retail'],
  seriesMeta: [meta],
  run: async (): Promise<SeriesPoints[]> => {
    const comp = await fetchComp(TABLE_ID);
    const rows = await fetchMdt(comp.theme_id, TABLE_ID, STAT_VAR, STAT_PRES);
    const points = rows
      .filter((r) => r.MM !== '') // monthly rows; blank MM = annual total
      .map((r) => ({
        period: `${r.CCYY}-${String(Number(r.MM)).padStart(2, '0')}`,
        value: Number(r.obs_value),
        raw: r,
      }))
      .filter((p) => Number.isFinite(p.value));
    return [{ series: meta, points }];
  },
};
