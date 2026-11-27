-- AIData v0.1 — seed data (bilingual zh-Hant primary)

-- ============ categories ============
insert into public.categories (slug, name_en, name_zh, icon, sort_order) values
  ('transport',    'Transport',    '交通', '🚇', 1),
  ('environment',  'Environment',  '環境', '🌿', 2),
  ('health',       'Health',       '醫療', '🏥', 3),
  ('finance',      'Finance',      '金融', '💰', 4),
  ('housing',      'Housing',      '房屋', '🏠', 5),
  ('education',    'Education',    '教育', '🎓', 6);

-- ============ organizations ============
insert into public.organizations (slug, name_en, name_zh, website) values
  ('aidata',   'AIData (Personal)',  'AIData（個人）',  'https://aidata.vercel.app'),
  ('demo-org', 'Demo Organization',  '示範機構',        'https://example.com');

-- ============ datasets ============
with org_aidata as (select id from public.organizations where slug = 'aidata'),
     org_demo   as (select id from public.organizations where slug = 'demo-org')
insert into public.datasets
  (slug, title_en, title_zh, description_en, description_zh,
   organization_id, update_frequency, license, status, api_enabled, view_count)
values
  ('hk-weather-sample',
   'Hong Kong Weather Observation Sample',
   '香港天氣觀測樣本數據',
   'Sample hourly weather observations from Hong Kong Observatory automatic weather stations, including temperature, relative humidity, wind speed and rainfall for demonstration purposes.',
   '香港天文台自動氣象站每小時天氣觀測樣本數據，包括氣溫、相對濕度、風速及降雨量，僅作示範用途。',
   (select id from org_aidata),
   '每小時', 'https://data.gov.hk/en/terms-and-conditions', 'published', true, 0),
  ('hk-transport-api-sample',
   'Hong Kong Transport API Sample',
   '香港交通數據 API 樣本',
   'Sample dataset wrapping common Hong Kong transport open-data feeds (MTR next train, KMB ETA) as a unified JSON API for developer evaluation.',
   '將香港常用交通開放數據（港鐵下一班車、九巴預計到站時間）整合為統一 JSON API 的樣本數據集，供開發者評估使用。',
   (select id from org_demo),
   '實時', 'https://data.gov.hk/en/terms-and-conditions', 'published', true, 0);

-- ============ resources ============
with ds_weather  as (select id from public.datasets where slug = 'hk-weather-sample'),
     ds_transport as (select id from public.datasets where slug = 'hk-transport-api-sample')
insert into public.resources
  (dataset_id, name_en, name_zh, format, url, size_bytes, sort_order)
values
  ((select id from ds_weather),
   'Hourly weather observations (CSV sample)',
   '每小時天氣觀測（CSV 樣本）',
   'CSV', 'https://example.com/data/hk-weather-hourly-sample.csv', 204800, 0),
  ((select id from ds_weather),
   'Station metadata (JSON)',
   '氣象站元數據（JSON）',
   'JSON', 'https://example.com/data/hk-weather-stations.json', 40960, 1),
  ((select id from ds_transport),
   'Unified transport API endpoint',
   '綜合交通 API 端點',
   'API', 'https://api.example.com/v1/transport/eta', null, 0),
  ((select id from ds_transport),
   'API usage documentation (HTML)',
   'API 使用說明（HTML）',
   'HTML', 'https://example.com/docs/transport-api', null, 1);

-- ============ dataset_categories ============
with ds_weather   as (select id from public.datasets where slug = 'hk-weather-sample'),
     ds_transport as (select id from public.datasets where slug = 'hk-transport-api-sample'),
     cat_env      as (select id from public.categories where slug = 'environment'),
     cat_transport as (select id from public.categories where slug = 'transport')
insert into public.dataset_categories (dataset_id, category_id) values
  ((select id from ds_weather), (select id from cat_env)),
  ((select id from ds_transport), (select id from cat_transport));
