#!/usr/bin/env node
// AIData ingestion pipeline runner.
//   npx tsx pipeline/runner.ts                → run enabled series that are due
//   npx tsx pipeline/runner.ts --all          → run all enabled series
//   npx tsx pipeline/runner.ts --series=code  → run one series
//   npx tsx pipeline/runner.ts --catalog      → register orgs/datasets/series in catalog
//   npx tsx pipeline/runner.ts --setup        → install crontab entry
import { execSync } from 'child_process';
import { getSupabase } from './lib/supabase';
import { upsertObservations } from './lib/upsert';
import { isHkBusinessDay } from './lib/business-days';
import { adapterForCode, adapters } from './adapters';
import type { SeriesRow } from './lib/types';

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const opt = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};

const CRON_LINE =
  '23 */6 * * * cd /root/.openclaw/workspace/aidata && npx tsx pipeline/runner.ts >> /var/log/aidata-pipeline.log 2>&1';

interface SummaryRow {
  series: string;
  adapter: string;
  status: string;
  rows: number;
  next_run: string;
  error?: string;
}

async function loadDueSeries(all: boolean, onlyCode?: string): Promise<SeriesRow[]> {
  const supabase = getSupabase();
  let query = supabase.from('series').select('*').eq('enabled', true);
  if (onlyCode) query = query.eq('code', onlyCode);
  else if (!all) query = query.or('next_run_at.is.null,next_run_at.lte.' + new Date().toISOString());
  const { data, error } = await query.order('code');
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesRow[];
}

async function runPipeline(): Promise<void> {
  const now = new Date();
  console.log(`\n=== aidata pipeline run — ${now.toISOString()} (HKT ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short' }).format(now)}) ===`);

  const all = flag('all');
  const onlyCode = opt('series');
  const due = await loadDueSeries(all, onlyCode);
  if (due.length === 0) {
    console.log('no series due.');
    return;
  }

  // business-day gate for daily HK series (HIBOR not published on HK holidays/weekends)
  const hkDailyRunnable = isHkBusinessDay(now);

  const summary: SummaryRow[] = [];
  // group due series by adapter so each adapter runs once
  const byAdapter = new Map<string, SeriesRow[]>();
  for (const s of due) {
    const adapter = adapterForCode(s.code);
    if (!adapter) {
      summary.push({ series: s.code, adapter: '(none)', status: 'error', rows: 0, next_run: '-', error: 'no adapter registered' });
      continue;
    }
    if (s.frequency === 'daily' && s.code.startsWith('hkma_') && !hkDailyRunnable) {
      summary.push({ series: s.code, adapter: adapter.id, status: 'skipped (non-business day)', rows: 0, next_run: s.next_run_at ?? '-' });
      continue;
    }
    const list = byAdapter.get(adapter.id) ?? [];
    list.push(s);
    byAdapter.set(adapter.id, list);
  }

  for (const [adapterId, seriesList] of byAdapter) {
    const adapter = adapters.find((a) => a.id === adapterId)!;
    const codes = new Set(seriesList.map((s) => s.code));
    console.log(`\n▶ adapter ${adapterId} (${seriesList.length} series due)`);
    let results;
    try {
      results = await adapter.run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const s of seriesList) {
        await getSupabase().from('series').update({ last_status: 'error', last_error: msg.slice(0, 500) }).eq('id', s.id);
        summary.push({ series: s.code, adapter: adapterId, status: 'error', rows: 0, next_run: '-', error: msg });
      }
      continue;
    }
    for (const s of seriesList) {
      const result = results.find((r) => r.code === s.code);
      if (!result) {
        summary.push({ series: s.code, adapter: adapterId, status: 'error', rows: 0, next_run: '-', error: 'adapter returned no data for series' });
        continue;
      }
      const outcome = await upsertObservations(s, result.points);
      const nextRun = await getSupabase().from('series').select('next_run_at').eq('id', s.id).maybeSingle();
      summary.push({
        series: s.code,
        adapter: adapterId,
        status: outcome.status,
        rows: outcome.rows,
        next_run: nextRun.data?.next_run_at ? new Date(nextRun.data.next_run_at).toISOString().slice(0, 16) : '-',
        error: outcome.error,
      });
    }
  }

  console.log('\n=== summary ===');
  console.table(summary.map(({ series, adapter, status, rows, next_run, error }) => ({
    series, adapter, status, rows, next_run, error: error ? error.slice(0, 80) : '',
  })));
  const errors = summary.filter((r) => r.status === 'error').length;
  console.log(`done: ${summary.length - errors} ok, ${errors} error(s).`);
}

function setupCron(): void {
  const existing = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf8' });
  if (existing.includes('aidata-pipeline')) {
    console.log('crontab entry already present:\n' + CRON_LINE);
    return;
  }
  const next = existing.trimEnd() + (existing.trim() ? '\n' : '') + CRON_LINE + '\n';
  execSync(`printf %s ${JSON.stringify(next)} | crontab -`);
  console.log('crontab installed:\n' + CRON_LINE);
}

async function main(): Promise<void> {
  try {
    if (flag('setup')) {
      setupCron();
      return;
    }
    if (flag('catalog')) {
      const { runCatalog } = await import('./catalog');
      await runCatalog();
      return;
    }
    await runPipeline();
  } catch (e) {
    console.error('pipeline failed:', e);
    process.exitCode = 1;
  }
}

void main();
