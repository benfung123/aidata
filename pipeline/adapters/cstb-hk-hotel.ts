// CSTB / HKTB hotel statistics via tourism.gov.hk open CSVs (data.gov.hk).
// Verified 2026-11-28 (CKAN packages under hk-cstb, e.g.
// hk-cstb-cstb_tc-tc-number-of-hotel-rooms-by-category):
//   roomstock by category: /datagovhk/hotelrooms/Number_of_hotel_rooms_in_Hong_Kong_by_hotel_category_en.csv
//     — monthly from 2021-08; CSTB stopped publishing the by-category split
//       after 2024-06 (trailing N/A rows); numbers contain space separators.
//   total roomstock:        /datagovhk/hotelrooms/number_of_hotel_rooms_en.csv (monthly, current).
//   overall occupancy rate: /datagovhk/hotelroomoccupancy/hotel_room_occupancy_rate_monthly_en.csv.
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta, SeriesPoint } from '../lib/types';
import { parseCsv } from '../lib/csd';

const CSTB_BASE = 'https://www.tourism.gov.hk/datagovhk';
const ROOMSTOCK_URL = `${CSTB_BASE}/hotelrooms/Number_of_hotel_rooms_in_Hong_Kong_by_hotel_category_en.csv`;
const ROOMS_TOTAL_URL = `${CSTB_BASE}/hotelrooms/number_of_hotel_rooms_en.csv`;
const OCC_URL = `${CSTB_BASE}/hotelroomoccupancy/hotel_room_occupancy_rate_monthly_en.csv`;

const SOURCE_URL = 'https://data.gov.hk/en-data/dataset/hk-cstb-cstb_tc-tc-hotel-room-occupancy-rate';

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' };

async function fetchCsv(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`CSTB ${url}: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

/** "202108" → "2021-08"; anything else → null. */
function toPeriod(ym: string): string | null {
  if (!/^\d{6}$/.test(ym)) return null;
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}`;
}

function toNum(raw: string): number | null {
  const n = Number(raw.replaceAll(' ', '').trim());
  return Number.isFinite(n) ? n : null;
}

interface RoomColSpec {
  code: string;
  nameEn: string;
  nameZh: string;
  match: RegExp;
}

const ROOM_COLS: RoomColSpec[] = [
  { code: 'cstb_hk_hotel_rooms_hightariff_a', nameEn: 'High Tariff A hotel rooms', nameZh: '高房價酒店房間（甲級高價）', match: /high tariff a/i },
  { code: 'cstb_hk_hotel_rooms_hightariff_b', nameEn: 'High Tariff B hotel rooms', nameZh: '中房價酒店房間（乙級高價）', match: /high tariff b/i },
  { code: 'cstb_hk_hotel_rooms_medium', nameEn: 'Medium tariff hotel rooms', nameZh: '中價酒店房間', match: /medium tariff/i },
];

const metas: AdapterSeriesMeta[] = [
  {
    code: 'cstb_hk_hotel_rooms_total',
    nameEn: 'Hong Kong hotel rooms (total)',
    nameZh: '香港酒店房間總數',
    unit: 'rooms',
    frequency: 'monthly',
    sourceUrl: SOURCE_URL,
    dataUrl: ROOMS_TOTAL_URL,
  },
  ...ROOM_COLS.map((c) => ({
    code: c.code,
    nameEn: c.nameEn,
    nameZh: c.nameZh,
    unit: 'rooms',
    frequency: 'monthly' as const,
    sourceUrl: SOURCE_URL,
    dataUrl: ROOMSTOCK_URL,
  })),
  {
    code: 'cstb_hk_hotel_occupancy_rate',
    nameEn: 'Hong Kong hotel room occupancy rate (all hotels)',
    nameZh: '香港酒店房間入住率（所有酒店）',
    unit: '%',
    frequency: 'monthly',
    sourceUrl: SOURCE_URL,
    dataUrl: OCC_URL,
  },
];

export const cstbHkHotel: Adapter = {
  id: 'cstb-hk-hotel',
  codePrefixes: ['cstb_hk_hotel_'],
  seriesMeta: metas,
  run: async (): Promise<AdapterSeriesResult[]> => {
    const results: AdapterSeriesResult[] = [];

    // total rooms
    const totalRows = await fetchCsv(ROOMS_TOTAL_URL);
    const totalPts: SeriesPoint[] = [];
    for (const r of totalRows) {
      const period = toPeriod(r['Year-month'] ?? r['Year-Month'] ?? '');
      const v = toNum(Object.values(r)[1] ?? '');
      if (period && v !== null) totalPts.push({ period, value: v });
    }
    results.push({ code: 'cstb_hk_hotel_rooms_total', points: totalPts });

    // rooms by category (trailing N/A months are skipped by toNum)
    const stockRows = await fetchCsv(ROOMSTOCK_URL);
    const headers = stockRows.length > 0 ? Object.keys(stockRows[0]) : [];
    for (const col of ROOM_COLS) {
      const header = headers.find((h) => col.match.test(h));
      const pts: SeriesPoint[] = [];
      if (header) {
        for (const r of stockRows) {
          const period = toPeriod(r['Year-Month'] ?? '');
          const v = toNum(r[header] ?? '');
          if (period && v !== null) pts.push({ period, value: v });
        }
      }
      results.push({ code: col.code, points: pts });
    }

    // overall occupancy rate
    const occRows = await fetchCsv(OCC_URL);
    const occPts: SeriesPoint[] = [];
    for (const r of occRows) {
      const ym = r['Year-Month'] ?? '';
      const period = toPeriod(ym);
      const v = toNum(Object.values(r)[1] ?? '');
      if (period && v !== null) occPts.push({ period, value: v });
    }
    results.push({ code: 'cstb_hk_hotel_occupancy_rate', points: occPts });

    return results;
  },
};
