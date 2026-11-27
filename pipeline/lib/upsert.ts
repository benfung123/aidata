// Observation upsert + series bookkeeping + run audit.
import { getSupabase } from './supabase';
import type { Frequency, SeriesPoint, SeriesRow } from './types';

const HKT = 'Asia/Hong_Kong';

/** next_run_at per frequency. daily → next day 18:00 HKT; monthly → +1 month; quarterly → +3 months. */
export function nextRunAt(freq: Frequency, from: Date = new Date()): Date {
  switch (freq) {
    case 'daily': {
      const d = new Date(from.getTime());
      d.setDate(d.getDate() + 1);
      // 18:00 HKT = 10:00 UTC
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0, 0));
    }
    case 'weekly':
      return new Date(from.getTime() + 7 * 24 * 3600 * 1000);
    case 'monthly': {
      const d = new Date(from.getTime());
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case 'quarterly': {
      const d = new Date(from.getTime());
      d.setMonth(d.getMonth() + 3);
      return d;
    }
    case 'annual': {
      const d = new Date(from.getTime());
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case 'irregular':
      return new Date(from.getTime() + 24 * 3600 * 1000);
  }
}

export interface UpsertOutcome {
  rows: number;
  status: 'ok' | 'error';
  error?: string;
}

/** Upsert points for one series (by code), update bookkeeping, write a pipeline_runs row. */
export async function upsertObservations(
  series: SeriesRow,
  points: SeriesPoint[],
): Promise<UpsertOutcome> {
  const supabase = getSupabase();
  const startedAt = new Date();
  let rows = 0;

  try {
    for (let i = 0; i < points.length; i += 500) {
      const batch = points.slice(i, i + 500).map((p) => ({
        series_id: series.id,
        period: p.period,
        value: p.value,
        raw: p.raw ?? null,
      }));
      const { error } = await supabase
        .from('observations')
        .upsert(batch, { onConflict: 'series_id,period' });
      if (error) throw new Error(error.message);
      rows += batch.length;
    }

    const finishedAt = new Date();
    const patch = {
      last_run_at: startedAt.toISOString(),
      last_status: 'ok',
      last_error: null,
      next_run_at: nextRunAt(series.frequency).toISOString(),
    };
    await supabase.from('series').update(patch).eq('id', series.id);
    await supabase.from('pipeline_runs').insert({
      series_code: series.code,
      status: 'ok',
      rows_upserted: rows,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
    });
    return { rows, status: 'ok' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from('series').update({
      last_run_at: startedAt.toISOString(),
      last_status: 'error',
      last_error: message.slice(0, 500),
      next_run_at: nextRunAt(series.frequency).toISOString(),
    }).eq('id', series.id);
    await supabase.from('pipeline_runs').insert({
      series_code: series.code,
      status: 'error',
      rows_upserted: rows,
      error: message.slice(0, 500),
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    });
    return { rows, status: 'error', error: message };
  }
}
