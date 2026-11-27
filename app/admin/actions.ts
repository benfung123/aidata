'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseWithCookies } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'benfung123@gmail.com';

// ============ helpers ============

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'dataset';
}

async function uniqueSlug(table: 'datasets' | 'organizations' | 'categories', base: string, excludeId?: string): Promise<string> {
  const supabase = await createServerSupabaseWithCookies();
  let candidate = base;
  for (let i = 2; ; i++) {
    let query = supabase.from(table).select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
}

export interface ActionState {
  ok: boolean;
  message: string;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/datasets');
  revalidatePath('/organizations');
  revalidatePath('/admin');
  revalidatePath('/api/v1/datasets');
}

// ============ auth ============

export async function signOutAction() {
  const supabase = await createServerSupabaseWithCookies();
  await supabase.auth.signOut();
  redirect('/login');
}

// ============ datasets ============

interface ResourceInput {
  id?: string;
  name_en: string;
  name_zh: string;
  format: string;
  url: string;
  size_mb: string;
}

function parseResources(formData: FormData): ResourceInput[] {
  const raw = str(formData, 'resources_json');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({
        id: typeof r.id === 'string' && r.id ? r.id : undefined,
        name_en: String(r.name_en ?? '').trim(),
        name_zh: String(r.name_zh ?? '').trim(),
        format: String(r.format ?? 'CSV'),
        url: String(r.url ?? '').trim(),
        size_mb: String(r.size_mb ?? '').trim(),
      }))
      .filter((r) => r.name_en || r.name_zh || r.url);
  } catch {
    return [];
  }
}

const FORMATS = ['CSV', 'JSON', 'XML', 'XLSX', 'GEOJSON', 'API', 'HTML'];
const FREQUENCIES = ['實時', '每日', '每週', '每月', '每季', '每年', '不定期'];

export async function saveDataset(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id') || undefined;
  const title_en = str(formData, 'title_en');
  const title_zh = str(formData, 'title_zh');
  const organization_id = str(formData, 'organization_id');
  const status = str(formData, 'status') === 'published' ? 'published' : 'draft';

  if (!title_en) return { ok: false, message: 'Title (English) is required.' };
  if (!title_zh) return { ok: false, message: 'Title (Chinese) is required.' };
  if (!organization_id) return { ok: false, message: 'Organization is required.' };

  const supabase = await createServerSupabaseWithCookies();
  const slug = await uniqueSlug('datasets', slugify(title_en), id);

  const update_frequency = str(formData, 'update_frequency');
  const categories = formData.getAll('categories').map(String).filter(Boolean);
  const resources = parseResources(formData);

  const payload = {
    slug,
    title_en,
    title_zh,
    description_en: str(formData, 'description_en') || null,
    description_zh: str(formData, 'description_zh') || null,
    organization_id,
    update_frequency: FREQUENCIES.includes(update_frequency) ? update_frequency : '不定期',
    license: str(formData, 'license') || null,
    status,
    api_enabled: formData.get('api_enabled') === 'on',
  };

  let datasetId = id;
  if (id) {
    const { error } = await supabase.from('datasets').update(payload).eq('id', id);
    if (error) return { ok: false, message: error.message };
    await supabase.from('resources').delete().eq('dataset_id', id);
    await supabase.from('dataset_categories').delete().eq('dataset_id', id);
  } else {
    const { data, error } = await supabase.from('datasets').insert(payload).select('id').single();
    if (error || !data) return { ok: false, message: error?.message ?? 'insert failed' };
    datasetId = (data as { id: string }).id;
  }

  // categories
  if (categories.length > 0 && datasetId) {
    await supabase
      .from('dataset_categories')
      .insert(categories.map((cid) => ({ dataset_id: datasetId, category_id: cid })));
  }

  // resources
  if (resources.length > 0 && datasetId) {
    await supabase.from('resources').insert(
      resources.map((r, i) => ({
        dataset_id: datasetId,
        name_en: r.name_en || r.name_zh,
        name_zh: r.name_zh || r.name_en,
        format: FORMATS.includes(r.format) ? r.format : 'CSV',
        url: r.url,
        size_bytes: r.size_mb ? Math.round(Number(r.size_mb) * 1024 * 1024) : null,
        sort_order: i,
      })),
    );
  }

  revalidateAll();
  return { ok: true, message: id ? 'updated' : 'created' };
}

export async function deleteDataset(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id');
  if (!id) return { ok: false, message: 'missing id' };
  const supabase = await createServerSupabaseWithCookies();
  const { error } = await supabase.from('datasets').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: 'deleted' };
}

// ============ organizations ============

export async function saveOrganization(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id') || undefined;
  const name_en = str(formData, 'name_en');
  const name_zh = str(formData, 'name_zh');
  if (!name_en) return { ok: false, message: 'Name (English) is required.' };
  if (!name_zh) return { ok: false, message: 'Name (Chinese) is required.' };

  const supabase = await createServerSupabaseWithCookies();
  const slug = await uniqueSlug('organizations', slugify(name_en), id);
  const payload = {
    slug,
    name_en,
    name_zh,
    website: str(formData, 'website') || null,
  };

  let error: { message: string } | null = null;
  if (id) {
    const res = await supabase.from('organizations').update(payload).eq('id', id);
    error = res.error;
  } else {
    const res = await supabase.from('organizations').insert(payload);
    error = res.error;
  }

  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: id ? 'updated' : 'created' };
}

export async function deleteOrganization(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id');
  if (!id) return { ok: false, message: 'missing id' };
  const supabase = await createServerSupabaseWithCookies();
  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: 'deleted' };
}

// ============ categories ============

export async function saveCategory(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id') || undefined;
  const name_en = str(formData, 'name_en');
  const name_zh = str(formData, 'name_zh');
  if (!name_en) return { ok: false, message: 'Name (English) is required.' };
  if (!name_zh) return { ok: false, message: 'Name (Chinese) is required.' };

  const supabase = await createServerSupabaseWithCookies();
  const slug = await uniqueSlug('categories', slugify(name_en), id);
  const payload = {
    slug,
    name_en,
    name_zh,
    icon: str(formData, 'icon') || null,
    sort_order: Number(str(formData, 'sort_order')) || 0,
  };

  let error: { message: string } | null = null;
  if (id) {
    const res = await supabase.from('categories').update(payload).eq('id', id);
    error = res.error;
  } else {
    const res = await supabase.from('categories').insert(payload);
    error = res.error;
  }

  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: id ? 'updated' : 'created' };
}

export async function deleteCategory(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id');
  if (!id) return { ok: false, message: 'missing id' };
  const supabase = await createServerSupabaseWithCookies();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: 'deleted' };
}
