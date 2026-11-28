// Immigration Department (ImmD) visa / entry-permit application statistics.
// Verified 2026-11-28: open-data CSVs under
//   https://www.immd.gov.hk/opendata/eng/law-and-security/visas/
// One series per scheme, annual approved applications (persons).
// ASMTP/IANG/GEP/TechTAS use the maintained set7 "received and approved" files
// (current through 2025); the older set4 "approved" files for those schemes
// were abandoned by ImmD after 2020. TTPS/student/dependant set4 files are current.
// Note: QMAS (優才) is omitted — ImmD only publishes "quota allotted" for QMAS,
// not approved applications.
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';
import { parseCsv } from '../lib/csd';

const IMMD_BASE = 'https://www.immd.gov.hk/opendata/eng/law-and-security/visas';

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; aidata-pipeline/1.0)' };

interface VisaSpec {
  code: string;
  file: string;
  nameEn: string;
  nameZh: string;
}

const SPECS: VisaSpec[] = [
  {
    code: 'immd_hk_visa_ttops',
    file: 'statistics_applications_received_approved_TTPS.csv',
    nameEn: 'Top Talent Pass Scheme (TTPS) applications approved',
    nameZh: '高端人才通行證計劃獲批准申請',
  },
  {
    code: 'immd_hk_visa_asmtp',
    file: 'Statistics_Applications_Received_Approved_ASMTP_EN.csv',
    nameEn: 'Admission Scheme for Mainland Talents and Professionals (ASMTP) applications approved',
    nameZh: '輸入內地人才計劃獲批准申請',
  },
  {
    code: 'immd_hk_visa_iang',
    file: 'Statistics_Applications_Received_Approved_IANG_EN.csv',
    nameEn: 'Immigration Arrangements for Non-local Graduates (IANG) applications approved',
    nameZh: '非本地畢業生留港／回港就業安排獲批准申請',
  },
  {
    code: 'immd_hk_visa_gep',
    file: 'Statistics_Applications_Received_Approved_GEP_EN.csv',
    nameEn: 'General Employment Policy (GEP) applications approved',
    nameZh: '一般就業政策獲批准申請',
  },
  {
    code: 'immd_hk_visa_techtas',
    file: 'Statistics_Applications_Received_Approved_TechTAS_EN.csv',
    nameEn: 'Technology Talent Admission Scheme (TechTAS) applications approved',
    nameZh: '科技人才入境計劃獲批准申請',
  },
  {
    code: 'immd_hk_visa_student',
    file: 'statistics_applications_approved_student.csv',
    nameEn: 'Student visa / entry permit applications approved',
    nameZh: '學生簽證／進入許可獲批准申請',
  },
  {
    code: 'immd_hk_visa_dependant',
    file: 'statistics_applications_approved_dependant.csv',
    nameEn: 'Dependant visa / entry permit applications approved',
    nameZh: '受養人簽證／進入許可獲批准申請',
  },
];

const metas: AdapterSeriesMeta[] = SPECS.map((s) => ({
  code: s.code,
  nameEn: s.nameEn,
  nameZh: s.nameZh,
  unit: 'persons',
  frequency: 'annual',
  sourceUrl: 'https://data.gov.hk/en-data/organization/hk-immd',
  dataUrl: `${IMMD_BASE}/${s.file}`,
}));

export const immdHkVisa: Adapter = {
  id: 'immd-hk-visa',
  codePrefixes: ['immd_hk_visa_'],
  seriesMeta: metas,
  run: async (): Promise<AdapterSeriesResult[]> => {
    return Promise.all(
      SPECS.map(async (spec): Promise<AdapterSeriesResult> => {
        const url = `${IMMD_BASE}/${spec.file}`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`ImmD ${spec.file}: HTTP ${res.status}`);
        const rows = parseCsv(await res.text());
        if (rows.length === 0) return { code: spec.code, points: [] };

        // pick the "…approved…" column (TTPS CSV also has a "received" column and Remarks)
        const headers = Object.keys(rows[0]);
        const approvedCol = headers.find((h) => h.toLowerCase().includes('approved'));
        if (!approvedCol) throw new Error(`ImmD ${spec.file}: no approved column in ${headers.join(',')}`);
        const yearCol = headers.find((h) => h.toLowerCase() === 'year') ?? headers[0];

        const byPeriod = new Map<string, number>();
        for (const r of rows) {
          const year = (r[yearCol] ?? '').trim();
          const v = Number((r[approvedCol] ?? '').replaceAll(' ', '').trim());
          if (!/^\d{4}$/.test(year) || !Number.isFinite(v)) continue;
          byPeriod.set(year, v); // dedupe (TechTAS 2019 appears twice; last wins)
        }
        return {
          code: spec.code,
          points: [...byPeriod.entries()]
            .map(([period, value]) => ({ period, value }))
            .sort((a, b) => a.period.localeCompare(b.period)),
        };
      }),
    );
  },
};
