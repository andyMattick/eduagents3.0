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

export async function fetchConceptMatchIntel(
  req: ConceptMatchIntelRequest
): Promise<ConceptMatchIntelResponse> {
  const res = await fetch(`${BASE}/intel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Intel request failed");
  }
  return res.json();
}

export async function fetchTestEvidence(
  concept: string,
  items: ConceptMatchIntelRequest["assessment"]["items"]
): Promise<TestEvidenceResponse> {
  const res = await fetch(
    `${BASE}/test-evidence?concept=${encodeURIComponent(concept)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  req: ConceptMatchGenerateRequest
): Promise<ConceptMatchGenerateResponse> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Generate request failed");
  }
  return res.json();
}
