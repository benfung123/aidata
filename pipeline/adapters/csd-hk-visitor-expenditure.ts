// CSD per-capita spending of visitors — table 650-80004, theme 122 (VISITOR).
// Verified 2026-11-28: SPEND_CAP/Raw_hkd_d, annual (CCYY) × VISTYPE (1 = overnight,
// 2 = same-day) × REGION (blank = all markets, CN = mainland China).
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';
import { fetchMdt, CSD_BASE } from '../lib/csd';

const TABLE_ID = '650-80004';
const SPEND_URL = `${CSD_BASE}/data/MDT_122_${TABLE_ID}_SPEND_CAP_Raw_hkd_d.csv`;

interface SpendSpec {
  code: string;
  vistype: string;
  region: string;
  nameEn: string;
  nameZh: string;
}

const SPECS: SpendSpec[] = [
  {
    code: 'csd_hk_visitor_spend_percap_overnight',
    vistype: '1',
    region: '',
    nameEn: 'Per-capita spending of overnight visitors (all markets)',
    nameZh: '過夜旅客人均消費（所有市場）',
  },
  {
    code: 'csd_hk_visitor_spend_percap_same_day',
    vistype: '2',
    region: '',
    nameEn: 'Per-capita spending of same-day in-town visitors (all markets)',
    nameZh: '不過夜旅客人均消費（所有市場）',
  },
  {
    code: 'csd_hk_visitor_spend_percap_overnight_mainland',
    vistype: '1',
    region: 'CN',
    nameEn: 'Per-capita spending of overnight visitors from mainland China',
    nameZh: '中國內地過夜旅客人均消費',
  },
];

const metas: AdapterSeriesMeta[] = SPECS.map((s) => ({
  code: s.code,
  nameEn: s.nameEn,
  nameZh: s.nameZh,
  unit: 'HKD',
  frequency: 'annual',
  sourceUrl: `${CSD_BASE}/en/web_table.html?id=${TABLE_ID}`,
  dataUrl: SPEND_URL,
}));

export const csdHkVisitorExpenditure: Adapter = {
  id: 'csd-hk-visitor-expenditure',
  codePrefixes: ['csd_hk_visitor_spend'],
  seriesMeta: metas,
  run: async (): Promise<AdapterSeriesResult[]> => {
    const rows = await fetchMdt('122', TABLE_ID, 'SPEND_CAP', 'Raw_hkd_d');
    return SPECS.map((spec) => ({
      code: spec.code,
      points: rows
        .filter((r) => r.VISTYPE === spec.vistype && r.REGION === spec.region)
        .map((r) => ({ period: r.CCYY, value: Number(r.obs_value) }))
        .filter((p) => Number.isFinite(p.value)),
    }));
  },
};
