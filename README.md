# AIData

Bilingual (繁體中文 primary / English) open-data catalog web app, styled after data.gov.hk.
Next.js 15 App Router · TypeScript · Tailwind CSS v4 · Supabase · Vercel.

**Live:** https://aidata-liart.vercel.app

## Stack

- **Next.js 15+** (App Router, flat `app/` — no `src/`), React 19, Tailwind v4, TypeScript
- **Supabase** — Postgres + REST + Auth (email magic link)
- **Vercel** — deploys from `main`
- Minimal deps: `@supabase/supabase-js`, `@supabase/ssr` only. No UI kits — hand-rolled Tailwind.

## Features (v0.1)

- 🏠 Home: hero search, live stats (datasets / orgs / resources / API-enabled), category tiles, latest datasets, About
- 📚 `/datasets` — catalog with sidebar filters (category / organization / format / API-available), sort, search, pagination (24/page)
- 📄 `/datasets/[slug]` — detail with metadata, resources table, developer API hint + copy button, related datasets, view counter
- 🏢 `/organizations` — org directory + per-org dataset lists
- 🌐 Language toggle (`zh` default / `en`) via cookie; labels from `lib/i18n/{zh,en}.json`
- 🔌 Public JSON API: `/api/v1/datasets`, `/api/v1/datasets/{slug}`, `/api/v1/categories`, `/api/v1/organizations` (published only, `Cache-Control: s-maxage=60`)
- 🔐 Admin (`/admin`): magic-link login, allowlisted to `benfung123@gmail.com` only; dashboard stats; dataset CRUD with resource repeater; org/category CRUD; all labels 繁中

## Environment variables

Create `.env.local` (gitignored):

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (server only — never commit) |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://aidata-liart.vercel.app` |

All four are also set on the Vercel project (Production + Preview + Dev targets).

## Database

`supabase/schema.sql` — full schema: `organizations`, `categories`, `datasets`, `resources`, `dataset_categories`, updated_at trigger, indexes.

**RLS:**
- `anon` — SELECT only: orgs/categories (all rows); datasets with `status='published'`; resources & dataset_categories only when parent dataset is published
- `authenticated` + email = `benfung123@gmail.com` (see `is_admin()` in `supabase/admin-rls.sql`) — full INSERT/UPDATE/DELETE

`supabase/seed.sql` — 6 categories, 2 orgs, 2 sample published datasets (bilingual) with resources.
`supabase/apply.py` — applies SQL via Supabase Management API (`POST /v1/projects/{ref}/database/query`), splits on statement boundaries.

Apply order: `schema.sql` → `seed.sql` → `admin-rls.sql`.

## Admin login

1. Go to `/login`, enter `benfung123@gmail.com`
2. Supabase Auth emails a magic link (PKCE flow → `/auth/callback` exchanges the code for a session)
3. `/admin/*` is guarded by middleware: no session → redirect to `/login`; session with wrong email → 未授權 + sign out

Default Supabase email rate limit applies (~1 magic link / hour / address on free tier).

Supabase Auth config (already set on the project): `site_url` = app URL, `uri_allow_list` = `{SITE_URL}/auth/callback` + `http://localhost:3000/auth/callback`.

## Public JSON API examples

```
GET /api/v1/datasets?q=weather&category=environment&page=1&per_page=24
GET /api/v1/datasets/hk-weather-sample
GET /api/v1/categories
GET /api/v1/organizations
```

Response shape: `{ data: [...], meta: { total, page, per_page } }`. Fields: `slug`, `title{en,zh}`, `description{en,zh}`, `organization`, `categories[]`, `update_frequency`, `api_enabled`, `view_count`, `updated_at`, `resources[]`.

## Local dev

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # must pass before push
```

## Known gaps / next steps

- Magic-link emails come from Supabase default template/sender (custom SMTP TBD)
- Dataset list in admin caps at 100 rows (no pagination yet)
- `middleware.ts` convention is deprecated in Next 16 (`proxy` is the future name) — still works, migrate later
- `aidata.vercel.app` domain was taken by another project; app lives at `aidata-liart.vercel.app` (custom domain TBD)
- No automated tests (v0.1)
- **Crawler/importer for real open data — out of scope for v0.1** (Ben builds next)
