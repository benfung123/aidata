import { NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getPublicSupabase();
  const [{ data: cats }, { data: links }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('dataset_categories').select('category_id, dataset_id'),
  ]);

  const counts = new Map<string, number>();
  for (const l of links ?? []) {
    const row = l as { category_id: string };
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      data: (cats ?? []).map((c) => ({
        slug: c.slug,
        name: { en: c.name_en, zh: c.name_zh },
        icon: c.icon,
        dataset_count: counts.get(c.id) ?? 0,
      })),
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
