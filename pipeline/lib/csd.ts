// CSD (censtatd.gov.hk) open data access.
// Reverse-engineered 2026-11-27 from /js/cnds_cdm.js + /js/cnsd_web_table.js:
//   1. table metadata:  GET /data/table_{tableId}_comp.json        → theme_id + stat vars
//   2. observations:    GET /data/MDT_{themeId}_{tableId}_{sv}_{sp}.csv
// stat_pres is sanitized: '%'→'percent', '$'→'dollar', '/'→'slash'
export const CSD_BASE = 'https://www.censtatd.gov.hk';

export interface CsdComponent {
  stat_var: string;
  stat_pres: string;
  display_order: string;
}

export interface CsdComp {
  tb_code: string;
  theme_id: string;
  since: string;
  table_component_list: CsdComponent[];
}

const CSD_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' };

export async function fetchComp(tableId: string): Promise<CsdComp> {
  const res = await fetch(`${CSD_BASE}/data/table_${tableId}_comp.json`, { headers: CSD_HEADERS });
  if (!res.ok) throw new Error(`CSD comp ${tableId}: HTTP ${res.status}`);
  return (await res.json()) as CsdComp;
}

export function mdtUrl(themeId: string, tableId: string, statVar: string, statPres: string): string {
  const clean = (s: string) => s.replaceAll('/', 'slash').replaceAll('%', 'percent').replaceAll('$', 'dollar');
  return `${CSD_BASE}/data/MDT_${themeId}_${tableId}_${clean(statVar)}_${clean(statPres)}.csv`;
}

// Minimal RFC4180-ish CSV parser (handles quotes; CSD files are plain but be safe)
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export async function fetchMdt(themeId: string, tableId: string, statVar: string, statPres: string): Promise<Record<string, string>[]> {
  const url = mdtUrl(themeId, tableId, statVar, statPres);
  const res = await fetch(url, { headers: CSD_HEADERS });
  if (!res.ok) throw new Error(`CSD MDT ${url}: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

export function pad2(n: string | number): string {
  return String(n).padStart(2, '0');
}
