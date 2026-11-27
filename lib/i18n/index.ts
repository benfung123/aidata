import { cookies } from 'next/headers';
import { cache } from 'react';
import zh from './zh.json';
import en from './en.json';
import type { Lang } from '@/lib/types';
import { DEFAULT_LANG, isLang } from './shared';

export type Dict = typeof zh;

const dicts: Record<Lang, Dict> = { zh, en };

export { SUPPORTED_LANGS, DEFAULT_LANG, isLang, htmlLangAttr } from './shared';

// Server-side: read the 'lang' cookie. Cached per request.
export const getLang = cache(async (): Promise<Lang> => {
  const store = await cookies();
  return isLang(store.get('lang')?.value) ? (store.get('lang')?.value as Lang) : DEFAULT_LANG;
});

export async function getDict(): Promise<Dict> {
  const lang = await getLang();
  return dicts[lang];
}

export function dictFor(lang: Lang): Dict {
  return dicts[lang];
}
