import zh from './zh.json';
import en from './en.json';
import type { Lang } from '@/lib/types';

// Client-safe dictionaries — no server-only imports (next/headers) in this module.

export type Dict = typeof zh;

const dicts: Record<Lang, Dict> = { zh, en };

export function dictFor(lang: Lang): Dict {
  return dicts[lang];
}
