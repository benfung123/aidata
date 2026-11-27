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
  ('aidata',   'AIData (Personal)',  'AIData（個人）',  'https://aidata.vercel.app');

-- No seed datasets — real official datasets are registered by the pipeline
-- (pipeline/runner.ts + adapters). See supabase/pipeline-schema.sql.

