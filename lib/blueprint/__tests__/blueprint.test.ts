/**
 * lib/blueprint/__tests__/blueprint.test.ts — Blueprint Engine Tests
 *
 * Tests:
 * 1. Blueprint structure enforcement
 * 2. Concept enforcement (only blueprint concepts appear)
 * 3. Question type mapping
 * 4. Output validation (concept coverage, type coverage)
 * 5. Correction prompt generation
 * 6. Graceful degradation (empty inputs)
 * 7. Deduplication
 * 8. Prompt structure
 */

import { describe, it, expect } from "vitest";
import {
  buildBlueprint,
  buildBlueprintPrompt,
  type Blueprint,
} from "../buildBlueprint";
import {
  validateOutput,
  buildCorrectionPrompt,
} from "../validateOutput";
import type { QuerySemantics, DocumentSemantics } from "../../semantic/parseQuery";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSem(overrides: Partial<QuerySemantics> = {}): QuerySemantics {
  return {
    intent: "generate",
    concepts: ["photosynthesis", "chloroplasts", "glucose"],
    constraints: [],
    ...overrides,
  };
}

function makeDocSem(overrides: Partial<DocumentSemantics> = {}): DocumentSemantics {
  return {
    topic: "Plant Biology",
    concepts: ["light reactions", "calvin cycle"],
    relationships: ["chloroplasts contain chlorophyll"],
    misconceptions: ["plants get energy from soil"],
    ...overrides,
  };
}

// ── 1. BLUEPRINT STRUCTURE ──────────────────────────────────────────────────

describe("Blueprint structure", () => {
  it("produces a valid blueprint with all required fields", () => {
    const bp = buildBlueprint({
      semantics: makeSem(),
      intent: "Generate questions about photosynthesis",
    });

    expect(bp.topic).toBeTruthy();
    expect(bp.skills.length).toBeGreaterThan(0);
    expect(bp.concepts.length).toBeGreaterThan(0);
    expect(bp.questionPlan.length).toBeGreaterThan(0);
    expect(Array.isArray(bp.misconceptions)).toBe(true);
  });

  it("maps intent to appropriate skills", () => {
    const generate = buildBlueprint({
      semantics: makeSem({ intent: "generate" }),
      intent: "generate quiz",
    });
    expect(generate.skills).toContain("understand");
    expect(generate.skills).toContain("apply");

    const compare = buildBlueprint({
      semantics: makeSem({ intent: "compare" }),
      intent: "compare concepts",
    });
    expect(compare.skills).toContain("analyze");
    expect(compare.skills).toContain("evaluate");
  });

  it("creates one question slot per concept", () => {
    const sem = makeSem({ concepts: ["a", "b", "c"] });
    const bp = buildBlueprint({ semantics: sem, intent: "test" });

    expect(bp.questionPlan.length).toBe(3);
    expect(bp.questionPlan[0].concept).toBe("a");
    expect(bp.questionPlan[1].concept).toBe("b");
    expect(bp.questionPlan[2].concept).toBe("c");
  });
});

// ── 2. CONCEPT ENFORCEMENT ──────────────────────────────────────────────────

describe("Concept enforcement", () => {
  it("blueprint concepts come from semantics, not invented", () => {
    const sem = makeSem({ concepts: ["mitosis", "meiosis"] });
    const bp = buildBlueprint({ semantics: sem, intent: "quiz" });

    // Every concept in the blueprint must come from the input
    for (const c of bp.concepts) {
      const fromQuery = sem.concepts.includes(c);
      // Could also come from docSem, but with no docSem it must be from query
      expect(fromQuery).toBe(true);
    }
  });

  it("merges query and document concepts without duplicates", () => {
    const sem = makeSem({ concepts: ["photosynthesis", "glucose"] });
    const docSem = makeDocSem({ concepts: ["glucose", "light reactions"] });

    const bp = buildBlueprint({
      semantics: sem,
      documentSemantics: docSem,
      intent: "test",
    });

    // glucose should appear only once
    const glucoseCount = bp.concepts.filter((c) => c === "glucose").length;
    expect(glucoseCount).toBe(1);

    // Should include concepts from both sources
    expect(bp.concepts).toContain("photosynthesis");
    expect(bp.concepts).toContain("light reactions");
  });

  it("includes misconceptions from document semantics", () => {
    const bp = buildBlueprint({
      semantics: makeSem(),
      documentSemantics: makeDocSem(),
      intent: "test",
    });

    expect(bp.misconceptions).toContain("plants get energy from soil");
  });
});

// ── 3. QUESTION TYPE MAPPING ────────────────────────────────────────────────

describe("Question type mapping", () => {
  it("question types derive from skills, not random", () => {
    const bp = buildBlueprint({
      semantics: makeSem({ intent: "generate" }),
      intent: "generate",
    });

    for (const slot of bp.questionPlan) {
      expect(["multiple_choice", "short_answer", "true_false", "open_ended"]).toContain(
        slot.type
      );
      expect(slot.skill).toBeTruthy();
      expect(slot.concept).toBeTruthy();
    }
  });

  it("understand skill maps to short_answer", () => {
    const sem = makeSem({ intent: "question", concepts: ["topic"] });
    const bp = buildBlueprint({ semantics: sem, intent: "test" });

    // "question" intent → ["remember", "understand"]
    // First concept gets "remember" → "multiple_choice"
    expect(bp.questionPlan[0].type).toBe("multiple_choice");
  });
});

// ── 4. OUTPUT VALIDATION ────────────────────────────────────────────────────

describe("Output validation", () => {
  const blueprint: Blueprint = {
    topic: "Photosynthesis",
    skills: ["understand", "apply"],
    concepts: ["chloroplasts", "glucose"],
    questionPlan: [
      { type: "multiple_choice", skill: "understand", concept: "chloroplasts" },
      { type: "short_answer", skill: "apply", concept: "glucose" },
    ],
    misconceptions: [],
  };

  it("validates output that covers all concepts and types", () => {
    const output = `
      1. What are chloroplasts?
      a) Cell organelles that perform photosynthesis
      b) Cell membranes
      c) Mitochondria

      2. Briefly explain how glucose is produced.
      Answer: Glucose is produced through the Calvin cycle...
    `;

    const result = validateOutput(output, blueprint);
    expect(result.valid).toBe(true);
    expect(result.missingConcepts).toEqual([]);
    expect(result.score).toBe(1);
  });

  it("detects missing concepts", () => {
    const output = "What are chloroplasts? a) organelles b) membranes c) walls";
    const result = validateOutput(output, blueprint);

    expect(result.missingConcepts).toContain("glucose");
    expect(result.valid).toBe(false);
  });

  it("detects missing question types", () => {
    const output = "Chloroplasts and glucose are important in photosynthesis.";
    const result = validateOutput(output, blueprint);

    // No MC markers (a/b/c) or short answer markers
    expect(result.valid).toBe(false);
  });

  it("returns score between 0 and 1", () => {
    const output = "nothing relevant";
    const result = validateOutput(output, blueprint);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

// ── 5. CORRECTION PROMPT ────────────────────────────────────────────────────

describe("Correction prompt", () => {
  it("includes missing concepts in the correction", () => {
    const bp: Blueprint = {
      topic: "Biology",
      skills: ["understand"],
      concepts: ["dna", "rna"],
      questionPlan: [{ type: "short_answer", skill: "understand", concept: "dna" }],
      misconceptions: [],
    };

    const validation = validateOutput("Only about dna", bp);
    const correction = buildCorrectionPrompt("Only about dna", validation, bp);

    expect(correction).toContain("rna");
    expect(correction).toContain("REQUIRED CORRECTIONS");
  });
});

// ── 6. GRACEFUL DEGRADATION ─────────────────────────────────────────────────

describe("Graceful degradation", () => {
  it("handles empty concepts", () => {
    const bp = buildBlueprint({
      semantics: makeSem({ concepts: [] }),
      intent: "generate assessment",
    });

    expect(bp.topic).toBeTruthy();
    // Should extract fallback from intent
    expect(bp.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty semantics", () => {
    const bp = buildBlueprint({
      semantics: { intent: "question", concepts: [], constraints: [] },
      intent: "What is math?",
    });

    expect(bp.topic).toBeTruthy();
    expect(bp.skills.length).toBeGreaterThan(0);
  });

  it("validateOutput handles empty blueprint concepts", () => {
    const bp: Blueprint = {
      topic: "test",
      skills: ["understand"],
      concepts: [],
      questionPlan: [],
      misconceptions: [],
    };

    const result = validateOutput("any output", bp);
    expect(result.valid).toBe(true);
    expect(result.score).toBe(1);
  });
});

// ── 7. PROMPT STRUCTURE ─────────────────────────────────────────────────────

describe("Blueprint prompt structure", () => {
  const bp: Blueprint = {
    topic: "Fractions",
    skills: ["understand"],
    concepts: ["numerator", "denominator"],
    questionPlan: [
      { type: "multiple_choice", skill: "understand", concept: "numerator" },
    ],
    misconceptions: ["bigger denominator means bigger fraction"],
  };

  it("includes all four sections", () => {
    const prompt = buildBlueprintPrompt(bp, ["context chunk"], "Generate quiz");

    expect(prompt).toContain("--- BLUEPRINT ---");
    expect(prompt).toContain("--- CONTEXT ---");
    expect(prompt).toContain("--- INSTRUCTIONS ---");
    expect(prompt).toContain("--- TASK ---");
  });

  it("embeds blueprint as JSON", () => {
    const prompt = buildBlueprintPrompt(bp, [], "task");
    expect(prompt).toContain('"topic": "Fractions"');
    expect(prompt).toContain('"numerator"');
  });

  it("includes context chunks when available", () => {
    const prompt = buildBlueprintPrompt(bp, ["fact about fractions"], "task");
    expect(prompt).toContain("[1] fact about fractions");
  });

  it("handles empty context gracefully", () => {
    const prompt = buildBlueprintPrompt(bp, [], "task");
    expect(prompt).toContain("no document context available");
  });

  it("instructs LLM to follow blueprint exactly", () => {
    const prompt = buildBlueprintPrompt(bp, [], "task");
    expect(prompt).toContain("Follow the blueprint EXACTLY");
    expect(prompt).toContain("Do NOT invent concepts outside the blueprint");
  });
});
