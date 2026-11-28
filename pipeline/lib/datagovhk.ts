// data.gov.hk CKAN API client.
// Verified 2026-11-28: the CKAN action API lives under the locale prefix
//   https://data.gov.hk/en-data/api/3/action/package_search|package_show
// (the unprefixed /api/3/action path 404s).
// Docs: https://data.gov.hk/en-datasets/api

const CKAN_BASE = 'https://data.gov.hk/en-data/api/3/action';

export interface CkanResource {
  name?: string;
  format?: string;
  url?: string;
}

export interface CkanPackage {
  name?: string;
  title?: string;
  notes?: string;
  resources?: CkanResource[];
}

export async function ckanPackageShow(id: string): Promise<CkanPackage> {
  const res = await fetch(`${CKAN_BASE}/package_show?id=${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`data.gov.hk CKAN ${res.status} for ${id}`);
  const json = (await res.json()) as { success: boolean; result?: CkanPackage };
  if (!json.success || !json.result) throw new Error(`data.gov.hk CKAN package_show failed for ${id}`);
  return json.result;
}

// ─── LandsD: Summary of land transaction applications ────────────────────────
// Dataset: hk-landsd-openmap-summary-land-transaction-applications
// Monthly CSVs, one "New Received" + one "Under Processing" per month,
// each in English / Traditional Chinese. Latest verified month: 2026-10.

export const LANDSD_SUMMARY_PACKAGE_ID = 'hk-landsd-openmap-summary-land-transaction-applications';

export interface LandsdMonthlyCsvs {
  /** YYYY-MM */
  month: string;
  receivedUrl?: string;
  underProcessingUrl?: string;
}

const SUMMARY_RE =
  /(20\d{2}-\d{2}) Summary of Land Transaction (New Received|Under Processing) \(English/;

/** Resolve the newest month with an Under-Processing CSV, via CKAN resource metadata. */
export async function latestLandsdSummaryCsvs(): Promise<LandsdMonthlyCsvs> {
  const pkg = await ckanPackageShow(LANDSD_SUMMARY_PACKAGE_ID);
  const byMonth = new Map<string, { received?: string; underProcessing?: string }>();

  for (const r of pkg.resources ?? []) {
    const m = SUMMARY_RE.exec(r.name ?? '');
    if (!m || !r.url) continue;
    const entry = byMonth.get(m[1]) ?? {};
    if (m[2] === 'New Received') entry.received = r.url;
    else entry.underProcessing = r.url;
    byMonth.set(m[1], entry);
  }

  const months = [...byMonth.keys()].sort();
  for (let i = months.length - 1; i >= 0; i--) {
    const hit = byMonth.get(months[i])!;
    if (hit.underProcessing) {
      return { month: months[i], receivedUrl: hit.received, underProcessingUrl: hit.underProcessing };
    }
  }
  throw new Error('no LandsD monthly summary CSV found in CKAN metadata');
}
