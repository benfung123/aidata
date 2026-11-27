import Link from 'next/link';
import type { Dataset, Lang } from '@/lib/types';
import { dictFor } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { FormatBadge, ApiBadge } from '@/components/Badges';

export default function DatasetCard({
  dataset,
  lang,
}: {
  dataset: Dataset;
  lang: Lang;
}) {
  const dict = dictFor(lang);
  const title = lang === 'zh' ? dataset.title_zh : dataset.title_en;
  const desc = lang === 'zh' ? dataset.description_zh : dataset.description_en;
  const org = dataset.organizations;
  const formats = Array.from(new Set((dataset.resources ?? []).map((r) => r.format)));

  return (
    <Link
      href={`/datasets/${dataset.slug}`}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold text-slate-900">{title}</h3>
        {dataset.api_enabled && <ApiBadge label={dict.datasets.apiBadge} />}
      </div>
      {org && (
        <p className="mt-1 text-sm text-blue-700">
          {lang === 'zh' ? org.name_zh : org.name_en}
        </p>
      )}
      {desc && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{desc}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {formats.map((f) => (
          <FormatBadge key={f} format={f} />
        ))}
        <span className="ml-auto">
          {dict.datasets.updated} {formatDate(dataset.updated_at, lang)}
        </span>
      </div>
    </Link>
  );
}
