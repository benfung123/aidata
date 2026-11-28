// RVD private property price & rental indices (差餉物業估價署).
// Source: machine-readable monthly history workbooks linked from
// https://www.rvd.gov.hk/en/publications/property_market_statistics.html
// (his_data_3/4/8/9/12/14.xls — verified 2026-11-28, updated ~monthly).
// All indices: 1999 = 100, Monthly sheet (first sheet) parsed.
import type { Adapter, AdapterSeriesResult, AdapterSeriesMeta } from '../lib/types';
import { fetchRvdXls, findValueCol, parseMonthlyIndex, utilsSheetRows, RVD_STATS_BASE } from '../lib/rvd';

const SOURCE_URL = 'https://www.rvd.gov.hk/en/publications/property_market_statistics.html';

interface RvdSpec {
  code: string;
  file: string;
  label: string;
  nameEn: string;
  nameZh: string;
}

const SPECS: RvdSpec[] = [
  {
    code: 'rvd_hk_price_index_domestic',
    file: 'his_data_4.xls',
    label: 'All Classes',
    nameEn: 'Private domestic price index — all classes (territory-wide)',
    nameZh: '私人住宅售價指數（所有類別，全港）',
  },
  {
    code: 'rvd_hk_rental_index_domestic',
    file: 'his_data_3.xls',
    label: 'All Classes',
    nameEn: 'Private domestic rental index — all classes (territory-wide)',
    nameZh: '私人住宅租金指數（所有類別，全港）',
  },
  {
    code: 'rvd_hk_rental_index_offices',
    file: 'his_data_8.xls',
    label: 'Overall',
    nameEn: 'Private office rental index — all grades',
    nameZh: '私人寫字樓租金指數（所有級別）',
  },
  {
    code: 'rvd_hk_price_index_offices',
    file: 'his_data_9.xls',
    label: 'Overall',
    nameEn: 'Private office price index — all grades',
    nameZh: '私人寫字樓售價指數（所有級別）',
  },
  {
    code: 'rvd_hk_rental_index_retail',
    file: 'his_data_12.xls',
    label: 'Rents',
    nameEn: 'Private retail rental index',
    nameZh: '私人零售業樓宇租金指數',
  },
  {
    code: 'rvd_hk_price_index_retail',
    file: 'his_data_12.xls',
    label: 'Prices',
    nameEn: 'Private retail price index',
    nameZh: '私人零售業樓宇售價指數',
  },
  {
    code: 'rvd_hk_rental_index_flatted_factories',
    file: 'his_data_14.xls',
    label: 'Rents',
    nameEn: 'Private flatted factory rental index',
    nameZh: '私人分層工廠大廈租金指數',
  },
  {
    code: 'rvd_hk_price_index_flatted_factories',
    file: 'his_data_14.xls',
    label: 'Prices',
    nameEn: 'Private flatted factory price index',
    nameZh: '私人分層工廠大廈售價指數',
  },
];

const metas: AdapterSeriesMeta[] = SPECS.map((s) => ({
  code: s.code,
  nameEn: s.nameEn,
  nameZh: s.nameZh,
  unit: 'index',
  frequency: 'monthly',
  sourceUrl: SOURCE_URL,
  dataUrl: `${RVD_STATS_BASE}/${s.file}`,
}));

export const rvdHkPropertyIndices: Adapter = {
  id: 'rvd-hk-property-indices',
  codePrefixes: ['rvd_hk_'],
  seriesMeta: metas,
  run: async (): Promise<AdapterSeriesResult[]> => {
    // fetch each workbook once, parse every series that reads it
    const files = [...new Set(SPECS.map((s) => s.file))];
    const byFile = new Map<string, Promise<Map<string, ReturnType<typeof parseMonthlyIndex>>>>();
    for (const file of files) {
      byFile.set(
        file,
        (async () => {
          const wb = await fetchRvdXls(file);
          const sheetName = wb.SheetNames[0];
          if (!sheetName || !sheetName.toLowerCase().includes('monthly')) {
            throw new Error(`RVD ${file}: first sheet "${sheetName}" is not the monthly sheet`);
          }
          const sheet = wb.Sheets[sheetName];
          const rows = utilsSheetRows(sheet);
          const out = new Map<string, ReturnType<typeof parseMonthlyIndex>>();
          for (const spec of SPECS.filter((s) => s.file === file)) {
            if (!out.has(spec.label)) {
              out.set(spec.label, parseMonthlyIndex(sheet, findValueCol(rows, spec.label)));
            }
          }
          return out;
        })(),
      );
    }
    return Promise.all(
      SPECS.map(async (spec) => {
        const points = (await byFile.get(spec.file)!).get(spec.label)!;
        return { code: spec.code, points };
      }),
    );
  },
};
