import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Lang } from '@/lib/types';
import { DEFAULT_LANG, isLang } from './shared';
import { dictFor, type Dict } from './dicts';

const dicts = { zh: dictFor('zh'), en: dictFor('en') };

export type { Dict };
export { SUPPORTED_LANGS, DEFAULT_LANG, isLang, htmlLangAttr } from './shared';
export { dictFor } from './dicts';

// Server-side: read the 'lang' cookie. Cached per request.
export const getLang = cache(async (): Promise<Lang> => {
  const store = await cookies();
  const v = store.get('lang')?.value;
  return isLang(v) ? v : DEFAULT_LANG;
});

export async function getDict(): Promise<Dict> {
  const lang = await getLang();
  return dicts[lang];
}
