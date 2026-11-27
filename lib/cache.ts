import { unstable_cache } from 'next/cache';

/**
 * Cache a Supabase data fetch across requests (shared data cache).
 * Pages stay dynamic (lang cookie), but DB reads collapse to one
 * cross-region round trip per revalidation window.
 */
export function cachedFetch<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  revalidateSeconds = 300,
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, keyParts, { revalidate: revalidateSeconds });
}
