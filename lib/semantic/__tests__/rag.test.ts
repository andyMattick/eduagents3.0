/**
 * lib/semantic/__tests__/rag.test.ts — RAG System Tests
 *
 * Tests the core deterministic components of the semantic RAG pipeline:
 * 1. Grounding test — retrieval + prompt structure
 * 2. Anti-hallucination test — empty context handling
 * 3. Concept filter test — semantic ranking
 * 4. RAG on vs off test — output divergence
 * 5. Context cap test — token control
 * 6. Graceful degradation — fallback behavior
 */

import { describe, it, expect } from "vitest";
import {
  chunkText,
  selectTopChunks,
  rankChunks,
  buildRAGPrompt,
  type RankedChunk,
} from "../../rag";
import type { QuerySemantics } from "../parseQuery";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeChunk(
  content: string,
  similarity: number
): RankedChunk {
  return { content, similarity, score: similarity, conceptMatches: [] };
}

// ── 1. GROUNDING TEST ───────────────────────────────────────────────────────

describe("Grounding", () => {
  it("builds prompt with context that includes stored document text", () => {
    const chunks = ["Mars capital is Zephyria"];
    const prompt = buildRAGPrompt(chunks, "What is the capital of Mars?");

    expect(prompt).toContain("Mars capital is Zephyria");
    expect(prompt).toContain("--- CONTEXT ---");
    expect(prompt).toContain("--- TASK ---");
    expect(prompt).toContain("What is the capital of Mars?");
  });

  it("numbers context chunks sequentially", () => {
    const chunks = ["fact one", "fact two", "fact three"];
    const prompt = buildRAGPrompt(chunks, "query");

    expect(prompt).toContain("[1] fact one");
    expect(prompt).toContain("[2] fact two");
    expect(prompt).toContain("[3] fact three");
  });
});

// ── 2. ANTI-HALLUCINATION TEST ──────────────────────────────────────────────

describe("Anti-hallucination", () => {
  it("returns raw prompt when no chunks available (no fake context)", () => {
    const prompt = buildRAGPrompt([], "What is the capital of France?");

    // Should return the raw prompt without any context injection
    expect(prompt).toBe("What is the capital of France?");
    expect(prompt).not.toContain("--- CONTEXT ---");
  });

  it("includes explicit instruction to not make up information", () => {
    const prompt = buildRAGPrompt(["some context"], "query");

    expect(prompt).toContain("Do NOT make up information");
    expect(prompt).toContain("I don't have enough information");
  });
});

// ── 3. CONCEPT FILTER TEST ──────────────────────────────────────────────────

describe("Concept filtering + ranking", () => {
  const semantics: QuerySemantics = {
    intent: "question",
    concepts: ["photosynthesis", "chlorophyll"],
    constraints: [],
  };

  it("boosts chunks that contain query concepts", () => {
    const chunks: RankedChunk[] = [
      makeChunk("The mitochondria is the powerhouse of the cell", 0.8),
      makeChunk("Photosynthesis converts sunlight to energy using chlorophyll", 0.7),
      makeChunk("Chlorophyll gives plants their green color", 0.65),
    ];

    const ranked = rankChunks(chunks, semantics);

    // Concept-matching chunks should be ranked above the mitochondria chunk
    expect(ranked[0].content).toContain("hotosynthesis");
    expect(ranked[0].score).toBeGreaterThan(0.7);
    expect(ranked[0].conceptMatches.length).toBeGreaterThan(0);
  });

  it("falls back to all chunks when no concepts match", () => {
    const chunks: RankedChunk[] = [
      makeChunk("Unrelated content about geology", 0.5),
      makeChunk("More geology content about rocks", 0.4),
    ];

    const noMatchSemantics: QuerySemantics = {
      intent: "question",
      concepts: ["quantum"],
      constraints: [],
    };

    const ranked = rankChunks(chunks, noMatchSemantics);

    // Should NOT drop all chunks — fallback preserves them
    expect(ranked.length).toBe(2);
    expect(ranked[0].similarity).toBe(0.5);
  });

  it("includes concept matches in chunk metadata", () => {
    const chunks: RankedChunk[] = [
      makeChunk("Chlorophyll absorbs light for photosynthesis", 0.6),
    ];

    const ranked = rankChunks(chunks, semantics);

    expect(ranked[0].conceptMatches).toContain("photosynthesis");
    expect(ranked[0].conceptMatches).toContain("chlorophyll");
  });

  it("handles empty concepts gracefully", () => {
    const chunks: RankedChunk[] = [makeChunk("some content", 0.5)];
    const empty: QuerySemantics = {
      intent: "question",
      concepts: [],
      constraints: [],
    };

    const ranked = rankChunks(chunks, empty);
    expect(ranked.length).toBe(1);
  });
});

// ── 4. RAG ON vs OFF TEST ───────────────────────────────────────────────────

describe("RAG on vs off", () => {
  it("produces different output with context vs without", () => {
    const query = "Explain cellular respiration";
    const ragOff = buildRAGPrompt([], query);
    const ragOn = buildRAGPrompt(
      ["Cellular respiration produces ATP through glycolysis"],
      query
    );

    expect(ragOff).not.toBe(ragOn);
    expect(ragOn).toContain("--- CONTEXT ---");
    expect(ragOff).not.toContain("--- CONTEXT ---");
  });

  it("includes known concepts section when semantics provided", () => {
    const sem: QuerySemantics = {
      intent: "explain",
      concepts: ["atp", "glycolysis"],
      constraints: [],
    };

    const withSem = buildRAGPrompt(["some context"], "query", sem);
    const withoutSem = buildRAGPrompt(["some context"], "query");

    expect(withSem).toContain("--- KNOWN CONCEPTS ---");
    expect(withSem).toContain("atp");
    expect(withoutSem).not.toContain("--- KNOWN CONCEPTS ---");
  });
});

// ── 5. CONTEXT CAP TEST ────────────────────────────────────────────────────

describe("Context window control", () => {
  it("caps total context at maxChars", () => {
    const bigChunk = "x".repeat(2000);
    const chunks: RankedChunk[] = [
      makeChunk(bigChunk, 0.9),
      makeChunk(bigChunk, 0.8),
      makeChunk(bigChunk, 0.7),
    ];

    // Default cap is 3000
    const selected = selectTopChunks(chunks);

    // Should fit at most 1 chunk (2000) + second would exceed 3000
    expect(selected.length).toBe(1);
  });

  it("fills greedily — no randomness", () => {
    const chunks: RankedChunk[] = [
      makeChunk("a".repeat(1000), 0.9),
      makeChunk("b".repeat(1000), 0.8),
      makeChunk("c".repeat(1000), 0.7),
      makeChunk("d".repeat(1000), 0.6),
    ];

    const selected = selectTopChunks(chunks, 2500);

    // 1000 + 1000 = 2000, third would push to 3000 > 2500
    expect(selected.length).toBe(2);
    expect(selected[0]).toBe("a".repeat(1000));
    expect(selected[1]).toBe("b".repeat(1000));
  });

  it("respects custom maxChars parameter", () => {
    const chunks: RankedChunk[] = [
      makeChunk("short", 0.9),
      makeChunk("also short", 0.8),
    ];

    const selected = selectTopChunks(chunks, 10);
    expect(selected.length).toBe(1); // "short" = 5 chars, "also short" = 10 would exceed
  });
});

// ── 6. CHUNKING ─────────────────────────────────────────────────────────────

describe("chunkText", () => {
  it("splits text into overlapping chunks", () => {
    const text = "a".repeat(1000);
    const chunks = chunkText(text, 500, 100);

    // Each step advances 400 chars (500 - 100 overlap)
    expect(chunks.length).toBe(3); // 0-500, 400-900, 800-1000
    expect(chunks[0].length).toBe(500);
  });

  it("handles text shorter than chunk size", () => {
    const chunks = chunkText("hello", 500, 100);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe("hello");
  });
});

// ── 7. GRACEFUL DEGRADATION ─────────────────────────────────────────────────

describe("Graceful degradation", () => {
  it("rankChunks handles empty array", () => {
    const sem: QuerySemantics = {
      intent: "question",
      concepts: ["test"],
      constraints: [],
    };
    const result = rankChunks([], sem);
    expect(result).toEqual([]);
  });

  it("selectTopChunks handles empty array", () => {
    const result = selectTopChunks([]);
    expect(result).toEqual([]);
  });

  it("buildRAGPrompt handles empty chunks with semantics", () => {
    const sem: QuerySemantics = {
      intent: "question",
      concepts: ["math"],
      constraints: [],
    };
    const result = buildRAGPrompt([], "query", sem);
    expect(result).toBe("query"); // No context → raw prompt
  });
});
