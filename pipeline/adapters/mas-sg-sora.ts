// MAS (Singapore) — Singapore Overnight Rate Average (SORA), daily.
// Source: MAS datastore API (legacy open-data endpoint, no key required).
//   GET https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=…
// ⚠ Verified partially 2026-11-28 (Saturday): eservices.mas.gov.sg serves a maintenance
//   page on weekends — retry on a weekday before declaring the endpoint dead.
//   The SORA resource_id still needs one weekday confirmation; set it via env:
//     MAS_SORA_RESOURCE_ID  (datastore resource id for the Domestic Interest Rates dataset)
//     MAS_SORA_FIELD        (default "sora" — overnight SORA)
//     MAS_SORA_3M_FIELD     (default "comp_sora_3m" — 3-month compounded SORA)
// Publication: every Singapore business day ~9am (next business day for the prior day's rate).
// Note: SOR ceased 2023-06-30; SIBOR (1M/3M) ceased end-2024 — SORA is the sole surviving benchmark.
import type { Adapter, AdapterSeriesResult, SeriesPoint } from '../lib/types';

const ENDPOINT = 'https://eservices.mas.gov.sg/api/action/datastore/search.json';
const PAGE = 1000; // datastore rows per request
const MAX_PAGES = 15; // ≈ 15k business days of history

const RESOURCE_ID = process.env.MAS_SORA_RESOURCE_ID;
const FIELDS = {
  overnight: process.env.MAS_SORA_FIELD ?? 'sora',
  compounded3m: process.env.MAS_SORA_3M_FIELD ?? 'comp_sora_3m',
} as const;

interface MasRecord {
  end_of_day?: string;
  [key: string]: unknown;
}

export const masSgSora: Adapter = {
  id: 'mas-sg-sora',
  codePrefixes: ['mas_sg_sora'],
  seriesMeta: [
    {
      code: 'mas_sg_sora',
      nameEn: 'Singapore Overnight Rate Average (SORA)',
      nameZh: '新加坡隔夜利率平均（SORA）',
      unit: '%',
      frequency: 'daily',
      sourceUrl: 'https://www.mas.gov.sg/monetary-policy/sora',
      dataUrl: 'https://eservices.mas.gov.sg/statistics/dir/DomesticInterestRates.aspx',
    },
    {
      code: 'mas_sg_sora_3m_compounded',
      nameEn: '3-month compounded SORA',
      nameZh: '三個月複合新加坡隔夜利率平均',
      unit: '%',
      frequency: 'daily',
      sourceUrl: 'https://www.mas.gov.sg/monetary-policy/sora',
      dataUrl: 'https://eservices.mas.gov.sg/statistics/dir/DomesticInterestRates.aspx',
    },
  ],
  async run(): Promise<AdapterSeriesResult[]> {
    if (!RESOURCE_ID) {
      throw new Error(
        'MAS_SORA_RESOURCE_ID not set — SORA datastore id pending weekday verification (MAS eservices is down for weekend maintenance)',
      );
    }

    const overnight: SeriesPoint[] = [];
    const compounded3m: SeriesPoint[] = [];

    for (let offset = 0; offset < PAGE * MAX_PAGES; offset += PAGE) {
      const params = new URLSearchParams({
        resource_id: RESOURCE_ID,
        limit: String(PAGE),
        offset: String(offset),
        sort: 'end_of_day asc',
      });
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MAS datastore ${res.status} at offset ${offset}`);
      const text = await res.text();
      if (text.trimStart().startsWith('<')) {
        throw new Error('MAS eservices returned HTML (weekend maintenance window) — retry on a weekday');
      }
      const json = (await JSON.parse(text)) as {
        success?: boolean;
        result?: { records?: MasRecord[] };
      };
      const records = json.result?.records ?? [];
      for (const rec of records) {
        if (!rec.end_of_day) continue;
        const v1 = Number(rec[FIELDS.overnight]);
        if (Number.isFinite(v1)) {
          overnight.push({ period: rec.end_of_day, value: v1, raw: { [FIELDS.overnight]: v1 } });
        }
        const v3 = Number(rec[FIELDS.compounded3m]);
        if (Number.isFinite(v3)) {
          compounded3m.push({ period: rec.end_of_day, value: v3, raw: { [FIELDS.compounded3m]: v3 } });
        }
      }
      if (records.length < PAGE) break;
    }

    if (overnight.length === 0) {
      throw new Error('MAS datastore: no SORA observations parsed (check MAS_SORA_FIELD name)');
    }
    return [
      { code: 'mas_sg_sora', points: overnight },
      { code: 'mas_sg_sora_3m_compounded', points: compounded3m },
    ];
  },
};
