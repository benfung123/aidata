// Catalog registration: orgs, categories, datasets, resources, series rows.
// Run: npx tsx pipeline/runner.ts --catalog
// Idempotent — upserts by slug / code.
import { getSupabase } from './lib/supabase';
import { adapters } from './adapters';
import type { Frequency } from './lib/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aidata-liart.vercel.app';

// adapter id → catalog dataset slug
const ADAPTER_DATASET: Record<string, string> = {
  'hkma-hibor': 'hk-hibor',
  'ons-uk-gdp': 'uk-gdp',
  'ons-uk-unemployment': 'uk-unemployment',
  'csd-hk-gdp': 'hk-gdp',
  'csd-hk-unemployment': 'hk-unemployment',
  'csd-hk-retail': 'hk-retail-sales',
  'singstat-sg-gdp': 'sg-gdp',
  'mom-sg-unemployment': 'sg-unemployment',
  'boe-uk-rates': 'uk-bank-rate',
  'mas-sg-sora': 'sg-sora',
  'landsd-hk-land-transactions': 'hk-land-transactions',
  'csd-hk-visitor-arrivals': 'hk-visitor-arrivals',
  'csd-hk-visitor-expenditure': 'hk-visitor-expenditure',
  'cstb-hk-hotel': 'hk-hotel-supply',
  'immd-hk-visa': 'hk-visa-approvals',
  'rvd-hk-property-indices': 'hk-property-indices',
};

const ORGS = [
  { slug: 'hkma', name_en: 'Hong Kong Monetary Authority', name_zh: '香港金融管理局', website: 'https://www.hkma.gov.hk' },
  { slug: 'csd', name_en: 'Census and Statistics Department', name_zh: '政府統計處', website: 'https://www.censtatd.gov.hk' },
  { slug: 'ons', name_en: 'Office for National Statistics', name_zh: '英國國家統計局', website: 'https://www.ons.gov.uk' },
  { slug: 'singstat', name_en: 'Singapore Department of Statistics', name_zh: '新加坡統計局', website: 'https://www.singstat.gov.sg' },
  { slug: 'mom_sg', name_en: 'Ministry of Manpower (Singapore)', name_zh: '新加坡人力部', website: 'https://www.mom.gov.sg' },
  { slug: 'landsd', name_en: 'Lands Department (HKSAR)', name_zh: '地政總署', website: 'https://www.landsd.gov.hk' },
  { slug: 'boe', name_en: 'Bank of England', name_zh: '英倫銀行', website: 'https://www.bankofengland.co.uk' },
  { slug: 'mas_sg', name_en: 'Monetary Authority of Singapore', name_zh: '新加坡金融管理局', website: 'https://www.mas.gov.sg' },
  { slug: 'cstb', name_en: 'Culture, Sports and Tourism Bureau', name_zh: '文化體育及旅遊局', website: 'https://www.hktb.com' },
  { slug: 'immd', name_en: 'Immigration Department (HKSAR)', name_zh: '入境事務處', website: 'https://www.immd.gov.hk' },
  { slug: 'rvd', name_en: 'Rating and Valuation Department (HKSAR)', name_zh: '差餉物業估價署', website: 'https://www.rvd.gov.hk' },
];

interface DatasetDef {
  slug: string;
  org: string;
  categories: string[];
  title_en: string;
  title_zh: string;
  desc_en: string;
  desc_zh: string;
  frequency: string; // catalog display text
  license: string;
  source_url: string; // original page → HTML resource
  /** extra source links registered as resources (for catalog-only datasets) */
  extraResources?: { name_en: string; name_zh: string; format: string; url: string; sort_order: number }[];
}

const DATASETS: DatasetDef[] = [
  {
    slug: 'hk-hibor',
    org: 'hkma',
    categories: ['finance'],
    title_en: 'HKD Interbank Offered Rates (HIBOR)',
    title_zh: '港元銀行同業拆息（HIBOR）',
    desc_en: 'Daily Hong Kong interbank interest rates for overnight, 1-week, 1-month, 3-month, 6-month, 9-month and 12-month tenors, published by the Hong Kong Monetary Authority.',
    desc_zh: '香港金融管理局每日公布的港元銀行同業拆息，涵蓋隔夜、一週、一個月、三個月、六個月、九個月及十二個月期。',
    frequency: '每日',
    license: 'https://www.hkma.gov.hk/eng/about-us/official-documents/',
    source_url: 'https://www.hkma.gov.hk/eng/market-data/hk-interbank-ir/hk-interbank-ir-daily/',
  },
  {
    slug: 'hk-gdp',
    org: 'csd',
    categories: ['economy'],
    title_en: 'Hong Kong Gross Domestic Product',
    title_zh: '香港本地生產總值',
    desc_en: 'Quarterly Gross Domestic Product of Hong Kong, compiled and published by the Census and Statistics Department.',
    desc_zh: '政府統計處編製及按季公布的香港本地生產總值。',
    frequency: '每季',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.censtatd.gov.hk/en/web_table.html?id=31',
  },
  {
    slug: 'hk-unemployment',
    org: 'csd',
    categories: ['economy'],
    title_en: 'Hong Kong Unemployment Rate',
    title_zh: '香港失業率',
    desc_en: 'Monthly seasonally adjusted unemployment rate for Hong Kong, from the General Household Survey conducted by the Census and Statistics Department.',
    desc_zh: '政府統計處綜合住戶統計調查的每月失業率（經季節調整）。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.censtatd.gov.hk/en/web_table.html?id=210-06103',
  },
  {
    slug: 'hk-retail-sales',
    org: 'csd',
    categories: ['economy'],
    title_en: 'Hong Kong Retail Sales',
    title_zh: '香港零售業銷貨額',
    desc_en: 'Monthly retail sales value index for Hong Kong, published by the Census and Statistics Department.',
    desc_zh: '政府統計處每月公布的香港零售業銷貨價值指數。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.censtatd.gov.hk/en/web_table.html?id=620-67001',
  },
  {
    slug: 'uk-gdp',
    org: 'ons',
    categories: ['economy'],
    title_en: 'UK Gross Domestic Product',
    title_zh: '英國本地生產總值',
    desc_en: 'Quarterly UK GDP quarter-on-quarter growth rate (chained volume measures, seasonally adjusted), from the Office for National Statistics UKEA dataset.',
    desc_zh: '英國國家統計局 UKEA 數據集的英國本地生產總值按季增長率（連鎖量度，經季節調整）。',
    frequency: '每季',
    license: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    source_url: 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/ukea',
  },
  {
    slug: 'sg-gdp',
    org: 'singstat',
    categories: ['economy'],
    title_en: 'Singapore Gross Domestic Product',
    title_zh: '新加坡本地生產總值',
    desc_en: 'Quarterly Singapore GDP at current market prices, from the Singapore Department of Statistics Table Builder.',
    desc_zh: '新加坡統計局 Table Builder 公布的新加坡本地生產總值（當時市價，按季）。',
    frequency: '每季',
    license: 'https://www.singstat.gov.sg/terms-and-conditions',
    source_url: 'https://tablebuilder.singstat.gov.sg/table/TS/M015651',
  },
  {
    slug: 'sg-unemployment',
    org: 'mom_sg',
    categories: ['economy'],
    title_en: 'Singapore Unemployment Rate',
    title_zh: '新加坡失業率',
    desc_en: 'Monthly seasonally adjusted unemployment rate for Singapore, from the Ministry of Manpower statistical tables.',
    desc_zh: '新加坡人力部統計表每月公布的新加坡失業率（經季節調整）。',
    frequency: '每月',
    license: 'https://www.mom.gov.sg/terms-of-use',
    source_url: 'https://stats.mom.gov.sg/publications/statistical-tables-unemployment/',
  },
  {
    slug: 'hk-land-transactions',
    org: 'landsd',
    categories: ['housing', 'economy'],
    title_en: 'HK Land Transaction Applications (LandsD)',
    title_zh: '香港土地交易申請（地政總署）',
    desc_en: 'Monthly summary of non-NTEH land transaction applications — land exchange, lease modification, lot extension and private treaty grant — newly received and under processing, published by the Lands Department via data.gov.hk.',
    desc_zh: '地政總署每月經 data.gov.hk 公布的非新界豁免管制土地交易申請摘要，涵蓋土地交換、契約修訂、地段延長及私人條約批地的新收與處理中個案。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://data.gov.hk/en-data/dataset/hk-landsd-openmap-summary-land-transaction-applications',
  },
  {
    slug: 'hk-presale-consent',
    org: 'landsd',
    categories: ['housing'],
    title_en: 'HK Presale Consent & Consent to Assign (LandsD)',
    title_zh: '香港預售樓花及轉讓同意（地政總署）',
    desc_en: 'Lands Department consents for the presale of uncompleted residential/non-residential developments and consents to assign. Monthly pending-application reports (PDF since 1994), issued-consent geospatial data (GML via CSDI), and quarterly press-release statistics.',
    desc_zh: '地政總署就未完成住宅／非住宅發展項目的預售樓花同意及轉讓同意書。每月處理中申請報告（1994 年起 PDF）、已批同意地理數據（經 CSDI 提供 GML）及每季新聞公報統計。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.landsd.gov.hk/en/resources/land-info-stat/dev-control-compliance/consent.html',
    extraResources: [
      {
        name_en: 'Monthly pending applications (PDF, latest: 2026-10)',
        name_zh: '每月處理中申請報告（PDF，最新：2026-10）',
        format: 'PDF',
        url: 'https://www.landsd.gov.hk/doc/en/consent/monthly/t2_2610wac_e.pdf',
        sort_order: 2,
      },
      {
        name_en: 'Issued presale consent — GML via CSDI geoportal',
        name_zh: '已批預售同意 — 經 CSDI 地理資訊門戶提供 GML',
        format: 'GML',
        url: 'https://portal.csdi.gov.hk/geoportal/?datasetId=landsd_rcd_1637303511514_65978',
        sort_order: 3,
      },
      {
        name_en: 'data.gov.hk dataset (issued presale consent, residential)',
        name_zh: 'data.gov.hk 數據集（已批預售同意，住宅）',
        format: 'HTML',
        url: 'https://data.gov.hk/en-data/dataset/hk-landsd-openmap-lao-pcrd',
        sort_order: 4,
      },
    ],
  },
  {
    slug: 'uk-bank-rate',
    org: 'boe',
    categories: ['finance', 'economy'],
    title_en: 'UK Bank Rate & SONIA',
    title_zh: '英國官方銀行利率及 SONIA',
    desc_en: 'Daily official Bank Rate set by the Monetary Policy Committee and the Sterling Overnight Index Average (SONIA), from the Bank of England Interactive Statistical Database. Reuse permitted with acknowledgement ("Source: Bank of England").',
    desc_zh: '英倫銀行互動統計數據庫每日公布的貨幣政策委員會官方銀行利率及英鎊隔夜平均利率（SONIA）。註明出處（“Source: Bank of England”）後可重用。',
    frequency: '每日',
    license: 'https://www.bankofengland.co.uk/statistics',
    source_url: 'https://www.bankofengland.co.uk/boeapps/database/',
  },
  {
    slug: 'uk-unemployment',
    org: 'ons',
    categories: ['economy'],
    title_en: 'UK Unemployment Rate',
    title_zh: '英國失業率',
    desc_en: 'Monthly UK unemployment rate (aged 16 and over, seasonally adjusted), series MGSX from the Labour Force Survey, published by the Office for National Statistics.',
    desc_zh: '英國國家統計局勞動力調查（Labour Force Survey）每月公布的英國失業率（16 歲或以上，經季節調整），系列編號 MGSX。',
    frequency: '每月',
    license: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    source_url: 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms',
  },
  {
    slug: 'sg-sora',
    org: 'mas_sg',
    categories: ['finance'],
    title_en: 'Singapore Overnight Rate Average (SORA)',
    title_zh: '新加坡隔夜利率平均（SORA）',
    desc_en: 'Daily SORA and 3-month compounded SORA published by the Monetary Authority of Singapore — the benchmark for most floating-rate Singapore home loans since SOR (ceased 2023) and SIBOR (ceased end-2024) were retired.',
    desc_zh: '新加坡金融管理局每日公布的新加坡隔夜利率平均及三個月複合 SORA——自 SOR（2023 年停用）及 SIBOR（2024 年底停用）退役後，大部分浮息按揭所用之基準。',
    frequency: '每日',
    license: 'https://www.mas.gov.sg/terms-and-conditions',
    source_url: 'https://www.mas.gov.sg/monetary-policy/sora',
  },
  {
    slug: 'hk-visitor-arrivals',
    org: 'csd',
    categories: ['tourism', 'economy'],
    title_en: 'Hong Kong Visitor Arrivals',
    title_zh: '香港旅客入境人次',
    desc_en: 'Monthly total visitor arrivals to Hong Kong, plus the annual overnight / same-day in-town split and average length of stay, from the Census and Statistics Department inbound tourism tables (650-80001, 650-80005).',
    desc_zh: '政府統計處入境旅遊統計表（650-80001、650-80005）：每月旅客入境總人次，以及按年劃分的過夜／不過夜旅客人次與平均逗留時間。',
    frequency: '每月 / 每年',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.censtatd.gov.hk/en/web_table.html?id=650-80001',
  },
  {
    slug: 'hk-visitor-expenditure',
    org: 'csd',
    categories: ['tourism', 'economy'],
    title_en: 'Hong Kong Per-capita Visitor Spending',
    title_zh: '香港旅客人均消費',
    desc_en: 'Annual per-capita spending of overnight and same-day in-town visitors to Hong Kong (all markets, plus mainland China overnight visitors), compiled by the Census and Statistics Department from the Visitor Expenditure Survey (table 650-80004).',
    desc_zh: '政府統計處旅客消費統計調查（表 650-80004）：過夜及不過夜旅客人均消費（所有市場及中國內地過夜旅客），按年公布。',
    frequency: '每年',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.censtatd.gov.hk/en/web_table.html?id=650-80004',
  },
  {
    slug: 'hk-hotel-supply',
    org: 'cstb',
    categories: ['tourism'],
    title_en: 'HK Hotel Room Supply & Occupancy (CSTB)',
    title_zh: '香港酒店房間供應及入住率（文體旅局）',
    desc_en: 'Monthly Hong Kong hotel room supply (total and by category: High Tariff A, High Tariff B, Medium) and overall hotel room occupancy rate, published by the Culture, Sports and Tourism Bureau / Hong Kong Tourism Board. CSTB only publishes roughly the last five years; the by-category room breakdown stopped updating after 2024-06.',
    desc_zh: '文化體育及旅遊局／香港旅遊發展局每月公布的香港酒店房間供應（總數及高房價甲級、高房價乙級、中價分類）及整體酒店房間入住率。文體旅局僅提供約最近五年數據；分類房間供應自 2024-06 起停止更新。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://data.gov.hk/en-data/dataset/hk-cstb-cstb_tc-tc-hotel-room-occupancy-rate',
  },
  {
    slug: 'hk-visa-approvals',
    org: 'immd',
    categories: ['economy'],
    title_en: 'HK Visa / Entry Permit Applications Approved (ImmD)',
    title_zh: '香港簽證／進入許可獲批准申請（入境處）',
    desc_en: 'Annual visa / entry-permit applications approved by the Immigration Department for Hong Kong admission schemes: Top Talent Pass (TTPS), ASMTP, IANG, General Employment Policy, TechTAS, student and dependant visas. QMAS is not included — ImmD publishes only quota-allotted statistics for QMAS.',
    desc_zh: '入境事務處每年公布的人才入境計劃獲批准申請：高端人才通行證計劃（高才通）、輸入內地人才計劃（專才）、非本地畢業生留港／回港就業安排（IANG）、一般就業政策、科技人才入境計劃、學生及受養人簽證／進入許可。優才計劃（QMAS）不在此列——入境處僅公布其配額分配統計。',
    frequency: '每年',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://data.gov.hk/en-data/organization/hk-immd',
  },
  {
    slug: 'hk-property-indices',
    org: 'rvd',
    categories: ['housing', 'economy'],
    title_en: 'HK Private Property Price & Rental Indices (RVD)',
    title_zh: '香港私人物業售價及租金指數（差估署）',
    desc_en: 'Monthly private property indices for Hong Kong (1999 = 100) published by the Rating and Valuation Department: domestic price and rental indices (all classes), office price and rental indices (all grades), retail and flatted-factory price and rental indices, from the machine-readable history workbooks.',
    desc_zh: '差餉物業估價署每月公布的香港私人物業指數（1999 年 = 100）：私人住宅售價及租金指數（所有類別）、私人寫字樓售價及租金指數（所有級別）、私人零售業樓宇及分層工廠大廈售價與租金指數，取自官方歷史數據工作簿。',
    frequency: '每月',
    license: 'https://data.gov.hk/en/terms-and-conditions',
    source_url: 'https://www.rvd.gov.hk/en/publications/property_market_statistics.html',
  },
];

async function upsertBySlug(table: string, slug: string, row: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase();
  const { data: existing } = await supabase.from(table).select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    const { error } = await supabase.from(table).update(row).eq('id', existing.id);
    if (error) throw new Error(`${table} update ${slug}: ${error.message}`);
    return existing.id as string;
  }
  const { data, error } = await supabase.from(table).insert({ ...row, slug }).select('id').single();
  if (error) throw new Error(`${table} insert ${slug}: ${error.message}`);
  return data.id as string;
}

export async function runCatalog(): Promise<void> {
  const supabase = getSupabase();
  console.log('— catalog registration —');
  const orgIds: Record<string, string> = {};
  const catIds: Record<string, string> = {};

  for (const org of ORGS) {
    orgIds[org.slug] = await upsertBySlug('organizations', org.slug, org);
  }

  // categories: ensure the core ones exist, reuse the rest
  const { data: cats } = await supabase.from('categories').select('*');
  for (const c of cats ?? []) catIds[c.slug] = c.id;
  const ENSURE_CATS = [
    { slug: 'finance', name_en: 'Finance', name_zh: '金融', icon: '💰', sort_order: 6 },
    { slug: 'economy', name_en: 'Economy', name_zh: '經濟', icon: '📈', sort_order: 7 },
    { slug: 'housing', name_en: 'Housing & Land', name_zh: '房屋及土地', icon: '🏘️', sort_order: 8 },
    { slug: 'tourism', name_en: 'Tourism', name_zh: '旅遊', icon: '🧳', sort_order: 9 },
  ];
  for (const c of ENSURE_CATS) {
    if (catIds[c.slug]) continue;
    const { data, error } = await supabase
      .from('categories')
      .insert(c)
      .select('id').single();
    if (error) throw new Error(`${c.slug} insert: ${error.message}`);
    catIds[c.slug] = data.id;
    console.log(`  + category ${c.slug}`);
  }

  const nowIso = new Date().toISOString();
  for (const d of DATASETS) {
    const datasetId = await upsertBySlug('datasets', d.slug, {
      title_en: d.title_en,
      title_zh: d.title_zh,
      description_en: d.desc_en,
      description_zh: d.desc_zh,
      organization_id: orgIds[d.org],
      update_frequency: d.frequency,
      license: d.license,
      status: 'published',
      api_enabled: true,
    });

    // resources: aidata API + original source page + dataset-specific extras
    const resources = [
      { name_en: 'AIData JSON API', name_zh: 'AIData JSON API', format: 'API', url: `${SITE}/api/v1/datasets/${d.slug}`, sort_order: 0 },
      { name_en: 'Source page (HTML)', name_zh: '來源網頁（HTML）', format: 'HTML', url: d.source_url, sort_order: 1 },
      ...(d.extraResources ?? []),
    ];
    for (const r of resources) {
      const { data: ex } = await supabase.from('resources').select('id').eq('dataset_id', datasetId).eq('url', r.url).maybeSingle();
      if (ex) {
        const { error } = await supabase.from('resources').update(r).eq('id', ex.id);
        if (error) throw new Error(`resource update ${r.url}: ${error.message}`);
      } else {
        const { error } = await supabase.from('resources').insert({ ...r, dataset_id: datasetId });
        if (error) throw new Error(`resource insert ${r.url}: ${error.message}`);
      }
    }

    // category links
    for (const catSlug of d.categories) {
      await supabase
        .from('dataset_categories')
        .upsert({ dataset_id: datasetId, category_id: catIds[catSlug] }, { onConflict: 'dataset_id,category_id' });
    }
  }

  // register series for every adapter
  for (const adapter of adapters) {
    const datasetSlug = ADAPTER_DATASET[adapter.id];
    const { data: ds } = await supabase.from('datasets').select('id').eq('slug', datasetSlug).maybeSingle();
    if (!ds) throw new Error(`dataset ${datasetSlug} missing for ${adapter.id}`);
    for (const meta of adapter.seriesMeta) {
      const { data: ex } = await supabase.from('series').select('id').eq('code', meta.code).maybeSingle();
      if (ex) {
        await supabase.from('series').update({
          dataset_id: ds.id, name_en: meta.nameEn, name_zh: meta.nameZh,
          unit: meta.unit, frequency: meta.frequency as Frequency, source_url: meta.sourceUrl,
        }).eq('id', ex.id);
      } else {
        await supabase.from('series').insert({
          dataset_id: ds.id, code: meta.code, name_en: meta.nameEn, name_zh: meta.nameZh,
          unit: meta.unit, frequency: meta.frequency, source_url: meta.sourceUrl,
          next_run_at: nowIso, last_status: 'never',
        });
      }
    }

    // register raw data-file/API links as resources (idempotent by url).
    // Shared endpoints (same dataUrl for several series) keep a plain name;
    // per-series files get the series code appended.
    const byUrl = new Map<string, string[]>();
    for (const meta of adapter.seriesMeta) {
      if (!meta.dataUrl) continue;
      const list = byUrl.get(meta.dataUrl) ?? [];
      list.push(meta.code);
      byUrl.set(meta.dataUrl, list);
    }
    for (const [url, codes] of byUrl) {
      const isCsv =
        url.includes('csv.x=yes') || // BoE IADB CSV endpoint is an .asp URL
        url.split('?')[0].toLowerCase().endsWith('.csv');
      const shared = codes.length > 1;
      const baseEn = isCsv ? 'Source data file (CSV)' : 'Source data API (JSON)';
      const baseZh = isCsv ? '原始數據檔案（CSV）' : '原始數據 API（JSON）';
      const res = {
        name_en: shared ? baseEn : `${baseEn} · ${codes[0]}`,
        name_zh: shared ? baseZh : `${baseZh} · ${codes[0]}`,
        format: isCsv ? 'CSV' : 'JSON',
        url,
        sort_order: 2,
      };
      const { data: exR } = await supabase.from('resources').select('id').eq('dataset_id', ds.id).eq('url', res.url).maybeSingle();
      if (exR) {
        const { error } = await supabase.from('resources').update(res).eq('id', exR.id);
        if (error) throw new Error(`resource update ${res.url}: ${error.message}`);
      } else {
        const { error } = await supabase.from('resources').insert({ ...res, dataset_id: ds.id });
        if (error) throw new Error(`resource insert ${res.url}: ${error.message}`);
      }
    }
  }

  const { count } = await supabase.from('series').select('*', { count: 'exact', head: true });
  console.log(`catalog done: ${ORGS.length} orgs, ${DATASETS.length} datasets, ${count ?? '?'} series registered.`);
}
