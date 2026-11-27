'use client';

import { useState } from 'react';
import SeriesChart, { type ChartSeriesInput } from './SeriesChart';

interface Props {
  levels: ChartSeriesInput[];
  /** YoY series (unit %); empty/undefined → no toggle shown */
  yoy?: ChartSeriesInput[];
  levelLabel: string;
  yoyLabel: string;
  lang: 'en' | 'zh';
}

export default function SeriesChartToggle({ levels, yoy, levelLabel, yoyLabel, lang }: Props) {
  const hasYoy = !!yoy && yoy.length > 0;
  const [mode, setMode] = useState<'level' | 'yoy'>('level');

  const btn = (active: boolean) =>
    `rounded-full px-4 py-1 text-xs font-semibold transition-colors ${
      active
        ? 'bg-blue-700 text-white shadow-sm'
        : 'border border-slate-300 bg-white text-slate-600 hover:border-blue-600 hover:text-blue-700'
    }`;

  return (
    <div>
      {hasYoy && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('level')}
            className={btn(mode === 'level')}
            aria-pressed={mode === 'level'}
          >
            {levelLabel}
          </button>
          <button
            type="button"
            onClick={() => setMode('yoy')}
            className={btn(mode === 'yoy')}
            aria-pressed={mode === 'yoy'}
          >
            {yoyLabel}
          </button>
        </div>
      )}
      <SeriesChart lang={lang} series={mode === 'yoy' && hasYoy ? (yoy as ChartSeriesInput[]) : levels} />
    </div>
  );
}
