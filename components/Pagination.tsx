import Link from 'next/link';

export default function Pagination({
  page,
  totalPages,
  basePath,
  query,
  lang,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string>;
  lang: 'zh' | 'en';
}) {
  if (totalPages <= 1) return null;

  function href(p: number): string {
    const params = new URLSearchParams(query);
    if (p > 1) params.set('page', String(p));
    else params.delete('page');
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const itemCls =
    'flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700';
  const activeCls =
    'flex h-9 min-w-9 items-center justify-center rounded-lg border border-blue-700 bg-blue-700 px-2 text-sm font-medium text-white';

  // compact page list with ellipsis
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const prevLabel = lang === 'zh' ? '上一頁' : 'Prev';
  const nextLabel = lang === 'zh' ? '下一頁' : 'Next';

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={itemCls}>
          ← {prevLabel}
        </Link>
      ) : (
        <span className={`${itemCls} pointer-events-none opacity-40`}>← {prevLabel}</span>
      )}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <Link key={p} href={href(p)} className={p === page ? activeCls : itemCls} aria-current={p === page ? 'page' : undefined}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className={itemCls}>
          {nextLabel} →
        </Link>
      ) : (
        <span className={`${itemCls} pointer-events-none opacity-40`}>{nextLabel} →</span>
      )}
    </nav>
  );
}
