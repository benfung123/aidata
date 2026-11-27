import type { ResourceFormat } from '@/lib/types';

const COLORS: Record<ResourceFormat, string> = {
  CSV: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  JSON: 'bg-amber-50 text-amber-700 border-amber-200',
  XML: 'bg-purple-50 text-purple-700 border-purple-200',
  XLSX: 'bg-green-50 text-green-700 border-green-200',
  GEOJSON: 'bg-teal-50 text-teal-700 border-teal-200',
  API: 'bg-blue-50 text-blue-700 border-blue-200',
  HTML: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function FormatBadge({ format }: { format: ResourceFormat }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${COLORS[format] ?? COLORS.HTML}`}
    >
      {format}
    </span>
  );
}

export function ApiBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
      {label}
    </span>
  );
}

export function StatusBadge({ status, draftLabel, publishedLabel }: { status: 'draft' | 'published'; draftLabel: string; publishedLabel: string }) {
  const published = status === 'published';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        published
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      {published ? publishedLabel : draftLabel}
    </span>
  );
}
