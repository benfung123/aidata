// CSD visitor arrivals — monthly totals (table 650-80001) plus the annual
// overnight / same-day split and average length of stay (table 650-80005).
// Verified 2026-11-28: theme 122 (VISITOR).
//   650-80001 VIS_ARR/Raw_per_n  — CCYY × MM × REGION; blank REGION = world total.
//   650-80005 VIS_ARR/Raw_per_n  — CCYY × VISTYPE (1 = overnight, 2 = same-day).
//   650-80005 LEN_STAY/Raw_1dp_on_n — average nights, VISTYPE 1 only; 2022 is
//     published as 0 with a suppression flag (border closure) → zero values dropped.
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';
import { fetchMdt, CSD_BASE } from '../lib/csd';

const MONTHLY_TABLE = '650-80001';
const ANNUAL_TABLE = '650-80005';

const ARR_MONTHLY_URL = `${CSD_BASE}/data/MDT_122_${MONTHLY_TABLE}_VIS_ARR_Raw_per_n.csv`;
const ARR_TYPE_URL = `${CSD_BASE}/data/MDT_122_${ANNUAL_TABLE}_VIS_ARR_Raw_per_n.csv`;
const STAY_URL = `${CSD_BASE}/data/MDT_122_${ANNUAL_TABLE}_LEN_STAY_Raw_1dp_on_n.csv`;

const metas: AdapterSeriesMeta[] = [
  {
    code: 'csd_hk_visitor_arrivals',
    nameEn: 'Hong Kong visitor arrivals (total)',
    nameZh: '香港旅客入境總人次',
    unit: 'persons',
    frequency: 'monthly',
    sourceUrl: `${CSD_BASE}/en/web_table.html?id=${MONTHLY_TABLE}`,
    dataUrl: ARR_MONTHLY_URL,
  },
  {
    code: 'csd_hk_visitor_arrivals_overnight',
    nameEn: 'Hong Kong visitor arrivals — overnight',
    nameZh: '香港過夜旅客入境人次',
    unit: 'persons',
    frequency: 'annual',
    sourceUrl: `${CSD_BASE}/en/web_table.html?id=${ANNUAL_TABLE}`,
    dataUrl: ARR_TYPE_URL,
  },
  {
    code: 'csd_hk_visitor_arrivals_same_day',
    nameEn: 'Hong Kong visitor arrivals — same-day in-town',
    nameZh: '香港不過夜（同日離境）旅客入境人次',
    unit: 'persons',
    frequency: 'annual',
    sourceUrl: `${CSD_BASE}/en/web_table.html?id=${ANNUAL_TABLE}`,
    dataUrl: ARR_TYPE_URL,
  },
  {
    code: 'csd_hk_visitor_avg_stay_nights',
    nameEn: 'Average length of stay of overnight visitors',
    nameZh: '過夜旅客平均逗留時間',
    unit: 'nights',
    frequency: 'annual',
    sourceUrl: `${CSD_BASE}/en/web_table.html?id=${ANNUAL_TABLE}`,
    dataUrl: STAY_URL,
  },
];

export const csdHkVisitorArrivals: Adapter = {
  id: 'csd-hk-visitor-arrivals',
  codePrefixes: ['csd_hk_visitor_arrivals', 'csd_hk_visitor_avg_stay'],
  seriesMeta: metas,
  run: async (): Promise<AdapterSeriesResult[]> => {
    const [monthly, byType, stay] = await Promise.all([
      fetchMdt('122', MONTHLY_TABLE, 'VIS_ARR', 'Raw_per_n'),
      fetchMdt('122', ANNUAL_TABLE, 'VIS_ARR', 'Raw_per_n'),
      fetchMdt('122', ANNUAL_TABLE, 'LEN_STAY', 'Raw_1dp_on_n'),
    ]);

    const monthlyTotal = monthly
      .filter((r) => r.MM !== '' && r.REGION === '') // blank MM = annual subtotal
      .map((r) => ({
        period: `${r.CCYY}-${String(Number(r.MM)).padStart(2, '0')}`,
        value: Number(r.obs_value),
      }))
      .filter((p) => Number.isFinite(p.value));

    const byTypePoints = (vistype: string) =>
      byType
        .filter((r) => r.VISTYPE === vistype)
        .map((r) => ({ period: r.CCYY, value: Number(r.obs_value) }))
        .filter((p) => Number.isFinite(p.value));

    const stayPoints = stay
      .filter((r) => r.VISTYPE === '1')
      .map((r) => ({ period: r.CCYY, value: Number(r.obs_value) }))
      .filter((p) => Number.isFinite(p.value) && p.value > 0);

    return [
      { code: 'csd_hk_visitor_arrivals', points: monthlyTotal },
      { code: 'csd_hk_visitor_arrivals_overnight', points: byTypePoints('1') },
      { code: 'csd_hk_visitor_arrivals_same_day', points: byTypePoints('2') },
      { code: 'csd_hk_visitor_avg_stay_nights', points: stayPoints },
    ];
  },
};
