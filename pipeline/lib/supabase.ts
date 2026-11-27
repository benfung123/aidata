// Service-role Supabase client for pipeline runs. NEVER import from app code.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// minimal .env loader (KEY=VALUE lines) for aidata/.env regardless of cwd.
// .env always WINS over inherited shell env for these two pipeline-specific vars
// (the VM exports SUPABASE_URL for other projects — learned 2026-11-27).
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../../.env');
try {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'SUPABASE_URL' || key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SINGSTAT_API_KEY') {
      process.env[key] = value;
    } else if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
} catch {
  // .env missing — rely on real env vars
}

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — check aidata/.env');
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
