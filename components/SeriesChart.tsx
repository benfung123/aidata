/*
 * SVG line chart — zero dependencies, brand palette.
 * Shared y-scale across series; last value annotated like a ticker chart.
 * ('use client' so the YoY toggle wrapper can re-render it interactively.)
 */
'use client';

import type { Lang } from '@/lib/types';

export interface ChartSeriesInput {
  name: string;
  unit: string | null;
  points: { period: string; value: number }[];
}

const COLORS = ['#003329', '#15909c', '#4aa8ab', '#807775', '#0b6e63', '#89c6cc', '#b9dde0'];

const W = 760;
const H = 300;
const PAD = { l: 66, r: 18, t: 16, b: 38 };

function fmtY(v: number, lang: Lang): string {
  if (Number.isInteger(v) && Math.abs(v) >= 10000) {
    return new Intl.NumberFormat(lang === 'zh' ? 'zh-HK' : 'en-GB', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-HK' : 'en-GB', {
    maximumFractionDigits: 2,
  }).format(v);
}

export default function SeriesChart({
  series,
  lang,
}: {
  series: ChartSeriesInput[];
  lang: Lang;
}) {
  const usable = series
    .map((s) => ({ ...s, color: COLORS[series.indexOf(s) % COLORS.length] }))
    .filter((s) => s.points.length >= 2);
  if (usable.length === 0) return null;

  // downsample each series to <=700 display points (keep first + last)
  const sampled = usable.map((s) => {
    const pts = s.points;
    if (pts.length <= 700) return { ...s, pts };
    const stride = Math.ceil(pts.length / 700);
    const out = [];
    for (let i = 0; i < pts.length - 1; i += stride) out.push(pts[i]);
    out.push(pts[pts.length - 1]);
    return { ...s, pts: out };
  });

  const n = Math.max(...sampled.map((s) => s.pts.length));
  let minY = Math.min(...sampled.flatMap((s) => s.pts.map((p) => p.value)));
  let maxY = Math.max(...sampled.flatMap((s) => s.pts.map((p) => p.value)));
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const pad = (maxY - minY) * 0.08;
  minY -= pad;
  maxY += pad;

  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (n - 1)) * iw;
  const y = (v: number) => PAD.t + ih - ((v - minY) / (maxY - minY)) * ih;

  const Y_TICKS = 4;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => minY + ((maxY - minY) * i) / Y_TICKS);
  const X_TICKS = Math.min(6, n);
  const xTickIdx = Array.from({ length: X_TICKS }, (_, i) =>
    Math.round((i / (X_TICKS - 1)) * (n - 1)),
  );

  const single = sampled.length === 1;

  return (
    <div className="mt-4">
      {single ? (
        <p className="mb-2 text-sm font-semibold text-slate-900">
          {sampled[0].name}
          {sampled[0].unit ? <span className="ml-2 text-xs font-normal text-slate-500">{sampled[0].unit}</span> : null}
        </p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {sampled.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={sampled.map((s) => s.name).join(', ')}>
        {/* y gridlines + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#d9d1ce' : '#f0edec'} strokeWidth={t === 0 && minY < 0 && maxY > 0 ? 1.5 : 1} />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#807775">
              {fmtY(t, lang)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {xTickIdx.map((i, k) => {
          const period = sampled.reduce<string | null>(
            (acc, s) => acc ?? (i < s.pts.length ? s.pts[i].period : null),
            null,
          );
          return (
            <text key={k} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#807775">
              {period ?? ''}
            </text>
          );
        })}
        {/* lines */}
        {sampled.map((s) => {
          const d = s.pts
            .map((p, i) => {
              const xi = x((i / (s.pts.length - 1)) * (n - 1));
              return `${i === 0 ? 'M' : 'L'}${xi.toFixed(1)},${y(p.value).toFixed(1)}`;
            })
            .join(' ');
          const last = s.pts[s.pts.length - 1];
          const lx = x(W ? n - 1 : 0);
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={lx} cy={y(last.value)} r={3.5} fill={s.color} />
              {(single || sampled.length <= 3) && (
                <text x={lx - 8} y={y(last.value) - 8} textAnchor="end" fontSize="11" fontWeight={600} fill={s.color}>
                  {fmtY(last.value, lang)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
