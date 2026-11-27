import type { Lang } from '@/lib/types';

// Client-safe i18n constants & helpers — do NOT import next/headers here.

export const SUPPORTED_LANGS: Lang[] = ['zh', 'en'];
export const DEFAULT_LANG: Lang = 'zh';

export function isLang(v: string | undefined | null): v is Lang {
  return v === 'zh' || v === 'en';
}

export function getLangFromCookieSync(cookieValue: string | undefined): Lang {
  return isLang(cookieValue) ? cookieValue : DEFAULT_LANG;
}

export function htmlLangAttr(lang: Lang): string {
  return lang === 'zh' ? 'zh-Hant' : 'en';
}
