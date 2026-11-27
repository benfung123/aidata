'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLang } from '@/lib/i18n/shared';
import type { Dict } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

const COOKIE_NAME = 'lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default function LanguageToggle({ dict, initialLang }: { dict: Dict; initialLang: Lang }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1];
    if (cookie && isLang(cookie) && cookie !== lang) {
      setLang(cookie);
    }
  }, [lang]);

  function switchTo(next: Lang) {
    if (next === lang) return;
    setLang(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  const base =
    'rounded px-2.5 py-1 text-sm font-medium transition-colors ';

  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => switchTo('zh')}
        className={
          base +
          (lang === 'zh'
            ? 'bg-blue-700 text-white'
            : 'text-slate-600 hover:text-blue-700')
        }
        aria-pressed={!mounted ? initialLang === 'zh' : lang === 'zh'}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={
          base +
          (lang === 'en'
            ? 'bg-blue-700 text-white'
            : 'text-slate-600 hover:text-blue-700')
        }
        aria-pressed={!mounted ? initialLang === 'en' : lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
