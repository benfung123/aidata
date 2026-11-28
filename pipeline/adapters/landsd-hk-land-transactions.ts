// LandsD (HK) — monthly summary of land transaction applications.
// Dataset: "Summary of land transaction applications received and under processing"
// (non-NTEH land exchange, lease modification, lot extension, private treaty grant).
// Source: data.gov.hk CKAN → hk-landsd-openmap-summary-land-transaction-applications
// Verified 2026-11-28: 2026-10 CSVs return HTTP 200; matrix layout parsed below.
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';
import { latestLandsdSummaryCsvs } from '../lib/datagovhk';
import { upsertResourceByName } from '../lib/resources';
import { getSupabase } from '../lib/supabase';

const CKAN_PAGE =
  'https://data.gov.hk/en-data/dataset/hk-landsd-openmap-summary-land-transaction-applications';
const CKAN_API =
  'https://data.gov.hk/en-data/api/3/action/package_show?id=hk-landsd-openmap-summary-land-transaction-applications';

const TX_TYPES = [
  { key: 'land_exchange', en: 'Land Exchange', zh: '土地交換' },
  { key: 'lease_modification', en: 'Lease Modification', zh: '契約修訂' },
  { key: 'lot_extension', en: 'Lot Extension', zh: '地段延長' },
  { key: 'private_treaty_grant', en: 'Private Treaty Grant', zh: '私人條約批地' },
] as const;

type Flow = 'received' | 'under_processing';

const FLOW_META: Record<Flow, { en: string; zh: string; totalEn: string; totalZh: string }> = {
  received: {
    en: 'newly received',
    zh: '新收',
    totalEn: 'HK land transaction applications — newly received (total cases)',
    totalZh: '香港新收土地交易申請（總數，宗）',
  },
  under_processing: {
    en: 'under processing',
    zh: '處理中',
    totalEn: 'HK land transaction applications — under processing (total cases)',
    totalZh: '香港處理中土地交易申請（總數，宗）',
  },
};

function seriesMetaFor(flow: Flow, type?: (typeof TX_TYPES)[number]) {
  const flowMeta = FLOW_META[flow];
  return {
    code: type ? `landsd_land_tx_${flow}_${type.key}` : `landsd_land_tx_${flow}_total`,
    nameEn: type
      ? `HK land transaction ${type.en} — ${flowMeta.en} (cases)`
      : flowMeta.totalEn,
    nameZh: type
      ? `香港土地交易（${type.zh}）${flowMeta.zh}（宗）`
      : flowMeta.totalZh,
    unit: '宗',
    frequency: 'monthly' as const,
    sourceUrl: CKAN_PAGE,
    dataUrl: CKAN_API,
  };
}

const MON_ABBR: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parse the LandsD monthly matrix CSV.
 * Layout: row 0 "Date,Oct-26"; row 1 "Transaction Type,Land Exchange,Lease Modification,
 * Lot Extension,Private Treaty Grant"; district rows; then the first "Total" row holds
 * the per-type grand totals. Later sections (Use, …) are ignored.
 */
export function parseSummaryCsv(text: string): { period: string; counts: number[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.split(',').map((c) => c.trim()))
    .filter((l) => l.length > 1);

  const dateCell = lines[0]?.[1] ?? '';
  const dm = dateCell.match(/^([A-Za-z]{3})-(\d{2})$/);
  const mm = dm ? MON_ABBR[dm[1].toLowerCase()] : undefined;
  if (!dm || !mm) throw new Error(`LandsD CSV: unparseable Date cell "${dateCell}"`);
  const period = `20${dm[2]}-${mm}`;

  const headerIdx = lines.findIndex((l) => l[0] === 'Transaction Type');
  if (headerIdx < 0) throw new Error('LandsD CSV: Transaction Type header row missing');
  // only columns with a non-empty type name (trailing cells are padding)
  const nCols = lines[headerIdx].slice(1).filter((c) => c !== '').length;

  const totalRow = lines.find((l, i) => i > headerIdx && /^total$/i.test(l[0]));
  if (!totalRow) throw new Error('LandsD CSV: Total row missing');

  const counts: number[] = [];
  for (let c = 1; c <= nCols; c++) {
    const v = Number(totalRow[c]);
    counts.push(Number.isFinite(v) ? v : 0);
  }
  return { period, counts };
}

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`LandsD CSV ${res.status}: ${url}`);
  return res.text();
}

export const landsdHkLandTransactions: Adapter = {
  id: 'landsd-hk-land-transactions',
  codePrefixes: ['landsd_land_tx_'],
  seriesMeta: [
    seriesMetaFor('received'),
    seriesMetaFor('under_processing'),
    ...TX_TYPES.map((t) => seriesMetaFor('received', t)),
    ...TX_TYPES.map((t) => seriesMetaFor('under_processing', t)),
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    const latest = await latestLandsdSummaryCsvs();
    console.log(`  LandsD summary month: ${latest.month}`);

    // keep the dataset page pointing at the freshest monthly CSVs
    const { data: ds } = await getSupabase()
      .from('datasets').select('id').eq('slug', 'hk-land-transactions').maybeSingle();
    if (ds) {
      await upsertResourceByName(ds.id as string, {
        name_en: 'Latest monthly summary — Under Processing (CSV)',
        name_zh: `最新每月摘要 — 處理中（CSV，${latest.month}）`,
        format: 'CSV',
        url: latest.underProcessingUrl!,
        sort_order: 3,
      });
      if (latest.receivedUrl) {
        await upsertResourceByName(ds.id as string, {
          name_en: 'Latest monthly summary — New Received (CSV)',
          name_zh: `最新每月摘要 — 新收（CSV，${latest.month}）`,
          format: 'CSV',
          url: latest.receivedUrl,
          sort_order: 4,
        });
      }
    }

    const results = new Map<string, SeriesPoint[]>();
    const push = (flow: Flow, parsed: { period: string; counts: number[] }) => {
      const total = parsed.counts.reduce((a, b) => a + b, 0);
      results.set(`landsd_land_tx_${flow}_total`, [
        { period: parsed.period, value: total, raw: { month: latest.month } },
      ]);
      TX_TYPES.forEach((t, i) => {
        results.set(`landsd_land_tx_${flow}_${t.key}`, [
          { period: parsed.period, value: parsed.counts[i] ?? 0, raw: { month: latest.month } },
        ]);
      });
    };

    push('under_processing', parseSummaryCsv(await fetchCsv(latest.underProcessingUrl!)));

    if (latest.receivedUrl) {
      try {
        push('received', parseSummaryCsv(await fetchCsv(latest.receivedUrl)));
      } catch (e) {
        // Received file listed in CKAN but not yet published — keep under-processing data.
        console.log(`  LandsD received CSV unavailable: ${e instanceof Error ? e.message : e}`);
      }
    }

    return this.seriesMeta.map((m) => ({ code: m.code, points: results.get(m.code) ?? [] }));
  },
};
