/**
 * api/v4/concept-match/conceptNormalization.ts
 *
 * Canonical concept engine: embedding → clustering → LLM canonicalization.
 *
 * Produces a canonicalMap (rawConcept → canonicalLabel) and a deduplicated
 * list of canonicalLabels that downstream prep extraction anchors against.
 *
 * Token cost: embeddings are negligible; LLM canonicalization ~1k–2k tokens.
 */

// ── Embedding ───────────────────────────────────────────────────────────────

async function batchEmbedConcepts(
  concepts: string[]
): Promise<number[][]> {
  if (concepts.length === 0) return [];
  return concepts.map((concept) => {
    const dims = 48;
    const vector = new Array<number>(dims).fill(0);
    for (let i = 0; i < concept.length; i++) {
      vector[i % dims] += (concept.charCodeAt(i) % 89) / 89;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm > 0 ? vector.map((value) => value / norm) : vector;
  });
}

// ── Cosine similarity ────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Embedding-based clustering ────────────────────────────────────────────────

/**
 * Groups concepts by cosine similarity using a greedy single-link approach.
 * Falls back to grouping exact-lowercase duplicates when embeddings are empty.
 */
function clusterEmbeddings(
  concepts: string[],
  embeddings: number[][],
  threshold = 0.88
): string[][] {
  const assigned = new Array<boolean>(concepts.length).fill(false);
  const clusters: string[][] = [];

  // If embeddings are all empty (API failure), fall back to lowercase grouping
  const hasEmbeddings = embeddings.some((e) => e.length > 0);
  if (!hasEmbeddings) {
    const byLower = new Map<string, string[]>();
    for (const c of concepts) {
      const key = c.toLowerCase().trim();
      if (!byLower.has(key)) byLower.set(key, []);
      byLower.get(key)!.push(c);
    }
    return Array.from(byLower.values());
  }

  for (let i = 0; i < concepts.length; i++) {
    if (assigned[i]) continue;
    const cluster: string[] = [concepts[i]!];
    assigned[i] = true;
    for (let j = i + 1; j < concepts.length; j++) {
      if (assigned[j]) continue;
      const sim = cosineSimilarity(embeddings[i]!, embeddings[j]!);
      if (sim >= threshold) {
        cluster.push(concepts[j]!);
        assigned[j] = true;
      }
    }
    clusters.push(cluster);
  }

  return clusters;
}

// ── LLM canonicalization ──────────────────────────────────────────────────────

/**
 * Given a cluster of semantically-equivalent concept strings, ask the LLM
 * to pick (or compose) the best canonical label.
 */
async function canonicalizeCluster(
  cluster: string[],
  callLLM: (prompt: string) => Promise<string>
): Promise<string> {
  if (cluster.length === 1) return cluster[0]!.trim();

  const prompt = `You are a curriculum terminology specialist.
Below is a group of concept names that all refer to the same underlying topic.
Pick ONE canonical label — preferably the most precise, grade-appropriate, and standard curriculum term.
If none is ideal, compose a clean, concise label.

Concept variants:
${cluster.map((c) => `  - ${c}`).join("\n")}

Return ONLY the canonical concept name — no explanation, no punctuation, no extra text.`;

  try {
    const result = await callLLM(prompt);
    const cleaned = result.trim().replace(/^["']|["']$/g, "").trim();
    return cleaned || cluster[0]!.trim();
  } catch {
    return cluster[0]!.trim();
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export type NormalizationResult = {
  canonicalMap: Record<string, string>; // raw concept → canonical label
  canonicalLabels: string[];             // deduplicated canonical labels (ordered)
};

/**
 * Full normalization pipeline:
 *  1. Deduplicate input concepts by lowercase
 *  2. Embed unique concepts via LLM text-embedding
 *  3. Cluster by cosine similarity
 *  4. LLM-canonicalize each cluster
 *  5. Build a raw→canonical lookup map
 */
export async function normalizeConcepts(
  rawConcepts: string[],
  callLLM: (prompt: string) => Promise<string>
): Promise<NormalizationResult> {
  if (rawConcepts.length === 0) {
    return { canonicalMap: {}, canonicalLabels: [] };
  }

  // Step 1: unique set preserving first-seen casing
  const seenLower = new Map<string, string>(); // lower → first-seen raw
  for (const c of rawConcepts) {
    const key = c.toLowerCase().trim();
    if (key && !seenLower.has(key)) seenLower.set(key, c.trim());
  }
  const uniqueConcepts = Array.from(seenLower.values());

  // Step 2: embed
  const embeddings = await batchEmbedConcepts(uniqueConcepts);

  // Step 3: cluster
  const clusters = clusterEmbeddings(uniqueConcepts, embeddings);

  // Step 4: canonicalize each cluster (batch LLM calls)
  const canonicalLabels: string[] = [];
  const rawToCanonical: Record<string, string> = {};

  for (const cluster of clusters) {
    const canonical = await canonicalizeCluster(cluster, callLLM);
    canonicalLabels.push(canonical);
    for (const variant of cluster) {
      rawToCanonical[variant] = canonical;
      // Also map lowercase-normalized inputs so downstream .map() works
      rawToCanonical[variant.toLowerCase().trim()] = canonical;
    }
  }

  // Step 5: build final canonicalMap keyed by every original raw concept
  const canonicalMap: Record<string, string> = {};
  for (const raw of rawConcepts) {
    const key = raw.toLowerCase().trim();
    canonicalMap[raw] =
      rawToCanonical[raw] ?? rawToCanonical[key] ?? raw;
  }

  return { canonicalMap, canonicalLabels };
}
