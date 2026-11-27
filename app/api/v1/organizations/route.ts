import { NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getPublicSupabase();
  const [{ data: orgs }, { data: ds }] = await Promise.all([
    supabase.from('organizations').select('*').order('name_en', { ascending: true }),
    supabase.from('datasets').select('organization_id').eq('status', 'published'),
  ]);

  const counts = new Map<string, number>();
  for (const d of ds ?? []) {
    const oid = (d as { organization_id: string | null }).organization_id;
    if (oid) counts.set(oid, (counts.get(oid) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      data: (orgs ?? []).map((o) => ({
        slug: o.slug,
        name: { en: o.name_en, zh: o.name_zh },
        website: o.website,
        dataset_count: counts.get(o.id) ?? 0,
      })),
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
