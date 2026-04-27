/**
 * ConceptMatch Client-Side Service
 */
import type {
  ConceptMatchIntelRequest,
  ConceptMatchIntelResponse,
  TestEvidenceResponse,
  ConceptMatchGenerateRequest,
  ConceptMatchGenerateResponse,
} from "../prism-v4/schema/domain/ConceptMatch";

const BASE = "/api/v4/concept-match";

function buildHeaders(userId?: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
}

/* ── Session-scoped analysis cache ───────────────────────────────────────
   Keyed by a lightweight content hash so identical prep+assessment pairs
   never hit the LLM more than once per browser session. This eliminates
   the repeated 8k–12k alignment + prep-extraction + canonicalization calls
   when the teacher navigates away and returns to the analysis panel.
──────────────────────────────────────────────────────────────────────── */

function makeIntelCacheKey(req: ConceptMatchIntelRequest): string {
  // Cheap deterministic checksum — not cryptographic, just sufficient to
  // distinguish different content without hashing the whole payload.
  const raw =
    req.prep.rawText.slice(0, 800) +
    "|" +
    req.assessment.items
      .map((i) => `${i.itemNumber}:${i.rawText.slice(0, 60)}`)
      .join(",");
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0; // keep unsigned 32-bit
  }
  return `cm_intel_${h.toString(16)}`;
}

function readIntelCache(key: string): ConceptMatchIntelResponse | null {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as ConceptMatchIntelResponse) : null;
  } catch {
    return null;
  }
}

function writeIntelCache(key: string, data: ConceptMatchIntelResponse): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable (SSR, private mode, quota full) — safe to ignore.
  }
}

export async function fetchConceptMatchIntel(
  req: ConceptMatchIntelRequest,
  userId?: string | null
): Promise<ConceptMatchIntelResponse> {
  const key = makeIntelCacheKey(req);
  const cached = readIntelCache(key);
  if (cached) return cached;

  const res = await fetch(`${BASE}/intel`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(userId),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Intel request failed");
  }
  const data: ConceptMatchIntelResponse = await res.json();
  writeIntelCache(key, data);
  return data;
}

/** Evict the session-storage cache entry for a given request payload.
 *  Call this when the teacher explicitly requests a fresh analysis. */
export function invalidateConceptMatchIntelCache(req: ConceptMatchIntelRequest): void {
  try {
    sessionStorage.removeItem(makeIntelCacheKey(req));
  } catch {
    // ignore
  }
}

export async function fetchTestEvidence(
  concept: string,
  items: ConceptMatchIntelRequest["assessment"]["items"],
  userId?: string | null
): Promise<TestEvidenceResponse> {
  const res = await fetch(
    `${BASE}/test-evidence?concept=${encodeURIComponent(concept)}`,
    {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(userId),
      body: JSON.stringify({ items }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Test evidence request failed");
  }
  return res.json();
}

export async function fetchConceptMatchGenerate(
  req: ConceptMatchGenerateRequest,
  userId?: string | null
): Promise<ConceptMatchGenerateResponse> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(userId),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Generate request failed");
  }
  return res.json();
}
