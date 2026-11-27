// Small time-series math helpers for chart derivations.

export interface PeriodPoint {
  period: string;
  value: number;
}

/**
 * Year-over-year growth (%). Works for annual ('2023'), monthly ('2026-03')
 * and quarterly ('2026-Q3') periods. Daily/full-date periods are unsupported
 * and yield an empty array (chart hides the toggle).
 */
export function computeYoY(points: PeriodPoint[], _frequency: string): PeriodPoint[] {
  const parse = (p: string): { y: number; sub: string } | null => {
    let m = p.match(/^(\d{4})-Q([1-4])$/);
    if (m) return { y: Number(m[1]), sub: `Q${m[2]}` };
    m = p.match(/^(\d{4})-(\d{2})$/);
    if (m) return { y: Number(m[1]), sub: m[2] };
    if (/^\d{4}$/.test(p)) return { y: Number(p), sub: '' };
    return null;
  };

  const byKey = new Map<string, number>();
  for (const p of points) {
    const k = parse(p.period);
    if (k) byKey.set(`${k.y}|${k.sub}`, p.value);
  }

  const out: PeriodPoint[] = [];
  for (const p of points) {
    const k = parse(p.period);
    if (!k) continue;
    const prev = byKey.get(`${k.y - 1}|${k.sub}`);
    if (prev == null || prev === 0) continue;
    out.push({
      period: p.period,
      value: +(((p.value - prev) / Math.abs(prev)) * 100).toFixed(2),
    });
  }
  return out;
}
