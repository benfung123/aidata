// RVD (Rating and Valuation Department) monthly statistics XLS access.
// Verified 2026-11-28: machine-readable history files at /doc/en/statistics/his_data_N.xls
// (old-format BIFF workbooks, one table per file, three sheets each:
// "Monthly 按月" first — that is the only sheet we parse).
// Values are strings with cosmetic padding, "(…)" <20-transaction markers and
// "*" provisional flags; 1999 = 100.
import * as XLSX from 'xlsx';
import { pad2 } from './csd';
import type { SeriesPoint } from './types';

export const RVD_STATS_BASE = 'https://www.rvd.gov.hk/doc/en/statistics';

const RVD_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' };

/** Download an RVD his_data_N.xls workbook. */
export async function fetchRvdXls(name: string): Promise<XLSX.WorkBook> {
  const url = `${RVD_STATS_BASE}/${name}`;
  const res = await fetch(url, { headers: RVD_HEADERS });
  if (!res.ok) throw new Error(`RVD ${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: 'buffer' });
}

/** Coerce an XLS cell to a finite number, or null for text/markers/empties. */
export function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[()]/g, '').replace(/\*/g, '').trim();
  if (s === '' || s === '-' || s === 'N.A.' || s === 'N/A') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Locate the value column belonging to a header label ("All Classes",
 * "Overall", "Rents", "Prices"): the column within 4 to the right of the
 * label whose data cells are mostly numeric (labels sit on merged cells,
 * so the value column is offset by 1–2 from the label itself).
 */
export function findValueCol(rows: unknown[][], label: string): number {
  let labelIdx = -1;
  for (const r of rows.slice(0, 12)) {
    for (let i = 0; i < r.length; i++) {
      if (typeof r[i] === 'string' && (r[i] as string).trim() === label) {
        labelIdx = i;
        break;
      }
    }
    if (labelIdx >= 0) break;
  }
  if (labelIdx < 0) throw new Error(`RVD: header label "${label}" not found`);
  let best = -1;
  let bestCount = 0;
  const width = Math.max(...rows.slice(0, 12).map((r) => r.length));
  for (let c = labelIdx + 1; c <= labelIdx + 4 && c < width; c++) {
    let count = 0;
    for (const r of rows.slice(10)) {
      if (toNum(r[c]) !== null) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  if (best < 0) throw new Error(`RVD: no numeric value column after "${label}"`);
  return best;
}

/** Expose the raw row matrix of a sheet (shared by multi-series workbooks). */
export function utilsSheetRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
}

/**
 * Parse the Monthly sheet of an RVD index workbook into series points.
 * Layout: col 1 = year (only on the first row of each year block), col 5 = month.
 */
export function parseMonthlyIndex(sheet: XLSX.WorkSheet, valueCol: number): SeriesPoint[] {
  const rows = utilsSheetRows(sheet);
  const points: SeriesPoint[] = [];
  let year: number | null = null;
  for (const r of rows) {
    const y = toNum(r[1]);
    if (y !== null && y > 1900 && y < 2100) year = Math.trunc(y);
    const m = toNum(r[5]);
    if (year === null || m === null || m < 1 || m > 12) continue;
    const v = toNum(r[valueCol]);
    if (v === null) continue;
    points.push({ period: `${year}-${pad2(Math.trunc(m))}`, value: v });
  }
  // dedupe by period (keep last) — guards against duplicated rows in source files
  const byPeriod = new Map(points.map((p) => [p.period, p]));
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}
