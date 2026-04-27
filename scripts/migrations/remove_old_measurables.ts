/**
 * scripts/migrations/remove_old_measurables.ts
 *
 * Migration: Remove legacy measurable fields (cognitiveLoad, readingLoad,
 * vocabularyDifficulty, vocabLevel) from any stored simulation artifact
 * payloads in `prism_v4_teacher_studio_artifacts`.
 *
 * Measurables are computed at runtime by vectorToMeasurables() and are not
 * persisted to `prism_v4_documents`. However, earlier simulation runs may
 * have written artifact payloads (via the old single/multi simulation routes)
 * that contain the legacy fields. This script strips them.
 *
 * Usage:
 *   npx tsx scripts/migrations/remove_old_measurables.ts
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { supabaseAdmin } from "../../lib/supabase";

const LEGACY_FIELDS = [
  "cognitiveLoad",
  "readingLoad",
  "vocabularyDifficulty",
  "vocabLevel",
] as const;

const TABLE = "prism_v4_teacher_studio_artifacts";
const PAGE_SIZE = 100;

type ArtifactRow = {
  id: string;
  payload: Record<string, unknown> | null;
};

function stripLegacyFields(payload: Record<string, unknown>): {
  changed: boolean;
  cleaned: Record<string, unknown>;
} {
  const cleaned = { ...payload };
  let changed = false;

  for (const field of LEGACY_FIELDS) {
    if (field in cleaned) {
      delete cleaned[field];
      changed = true;
    }
  }

  // Strip from nested measurables arrays (e.g. payload.profiles[].measurables[])
  const profiles = cleaned.profiles as Array<{ measurables?: Record<string, unknown>[] }> | undefined;
  if (Array.isArray(profiles)) {
    for (const profile of profiles) {
      if (Array.isArray(profile.measurables)) {
        for (const m of profile.measurables) {
          for (const field of LEGACY_FIELDS) {
            if (field in m) {
              delete m[field];
              changed = true;
            }
          }
        }
      }
    }
  }

  // Strip from payload.items[] (shortcircuit-style payloads)
  const items = cleaned.items as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(items)) {
    for (const item of items) {
      for (const field of LEGACY_FIELDS) {
        if (field in item) {
          delete item[field];
          changed = true;
        }
      }
    }
  }

  return { changed, cleaned };
}

async function fetchPage(offset: number): Promise<ArtifactRow[]> {
  const { url, key } = supabaseAdmin();

  const reqUrl = new URL(`${url}/rest/v1/${TABLE}`);
  reqUrl.searchParams.set("select", "id,payload");
  reqUrl.searchParams.set("offset", String(offset));
  reqUrl.searchParams.set("limit", String(PAGE_SIZE));

  const res = await fetch(reqUrl.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as ArtifactRow[];
}

async function patchRow(id: string, payload: Record<string, unknown>): Promise<void> {
  const { url, key } = supabaseAdmin();

  const reqUrl = new URL(`${url}/rest/v1/${TABLE}`);
  reqUrl.searchParams.set("id", `eq.${id}`);

  const res = await fetch(reqUrl.toString(), {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) {
    throw new Error(`PATCH failed for id=${id} (${res.status}): ${await res.text()}`);
  }
}

async function main() {
  console.log(`[migration] Starting legacy measurable field removal from ${TABLE}`);

  let offset = 0;
  let totalScanned = 0;
  let totalPatched = 0;

  while (true) {
    const rows = await fetchPage(offset);
    if (rows.length === 0) break;

    for (const row of rows) {
      totalScanned += 1;

      if (!row.payload || typeof row.payload !== "object") continue;

      const { changed, cleaned } = stripLegacyFields(row.payload);
      if (!changed) continue;

      await patchRow(row.id, cleaned);
      totalPatched += 1;
      console.log(`[migration] Patched artifact ${row.id}`);
    }

    offset += PAGE_SIZE;
    if (rows.length < PAGE_SIZE) break;
  }

  console.log(`[migration] Done. Scanned: ${totalScanned}, patched: ${totalPatched}.`);
}

main().catch((err) => {
  console.error("[migration] ERROR:", err);
  process.exit(1);
});
