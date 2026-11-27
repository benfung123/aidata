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
  'csd-hk-gdp': 'hk-gdp',
  'csd-hk-unemployment': 'hk-unemployment',
  'csd-hk-retail': 'hk-retail-sales',
  'singstat-sg-gdp': 'sg-gdp',
  'mom-sg-unemployment': 'sg-unemployment',
};

const ORGS = [
  { slug: 'hkma', name_en: 'Hong Kong Monetary Authority', name_zh: '香港金融管理局', website: 'https://www.hkma.gov.hk' },
  { slug: 'csd', name_en: 'Census and Statistics Department', name_zh: '政府統計處', website: 'https://www.censtatd.gov.hk' },
  { slug: 'ons', name_en: 'Office for National Statistics', name_zh: '英國國家統計局', website: 'https://www.ons.gov.uk' },
  { slug: 'singstat', name_en: 'Singapore Department of Statistics', name_zh: '新加坡統計局', website: 'https://www.singstat.gov.sg' },
  { slug: 'mom_sg', name_en: 'Ministry of Manpower (Singapore)', name_zh: '新加坡人力部', website: 'https://www.mom.gov.sg' },
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

  // categories: ensure economy exists, reuse the rest
  const { data: cats } = await supabase.from('categories').select('*');
  for (const c of cats ?? []) catIds[c.slug] = c.id;
  if (!catIds.economy) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ slug: 'economy', name_en: 'Economy', name_zh: '經濟', icon: '📈', sort_order: 7 })
      .select('id').single();
    if (error) throw new Error(`economy insert: ${error.message}`);
    catIds.economy = data.id;
    console.log('  + category economy');
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

    // resources: aidata API + original source page
    const resources = [
      { name_en: 'AIData JSON API', name_zh: 'AIData JSON API', format: 'API', url: `${SITE}/api/v1/datasets/${d.slug}`, sort_order: 0 },
      { name_en: 'Source page (HTML)', name_zh: '來源網頁（HTML）', format: 'HTML', url: d.source_url, sort_order: 1 },
    ];
    for (const r of resources) {
      const { data: ex } = await supabase.from('resources').select('id').eq('dataset_id', datasetId).eq('url', r.url).maybeSingle();
      if (ex) {
        await supabase.from('resources').update(r).eq('id', ex.id);
      } else {
        await supabase.from('resources').insert({ ...r, dataset_id: datasetId });
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

      // register the raw data-file/API link as a resource (idempotent by url)
      if (meta.dataUrl) {
        const isCsv = meta.dataUrl.split('?')[0].toLowerCase().endsWith('.csv');
        const res = {
          name_en: isCsv ? 'Source data file (CSV)' : 'Source data API (JSON)',
          name_zh: isCsv ? '原始數據檔案（CSV）' : '原始數據 API（JSON）',
          format: isCsv ? 'CSV' : 'JSON',
          url: meta.dataUrl,
          sort_order: 2,
        };
        const { data: exR } = await supabase.from('resources').select('id').eq('dataset_id', ds.id).eq('url', res.url).maybeSingle();
        if (exR) await supabase.from('resources').update(res).eq('id', exR.id);
        else await supabase.from('resources').insert({ ...res, dataset_id: ds.id });
      }
    }
  }

  const { count } = await supabase.from('series').select('*', { count: 'exact', head: true });
  console.log(`catalog done: ${ORGS.length} orgs, ${DATASETS.length} datasets, ${count ?? '?'} series registered.`);
}
