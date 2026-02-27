/**
 * runWriterChunkDebug.ts
 *
 * Dev tool for testing the adaptive chunked writer end-to-end.
 *
 * Usage (browser console or component):
 *
 *   import { runWriterChunkDebug, testParseChunk } from "@/pipeline/devTools/runWriterChunkDebug";
 *
 *   // 1. Full adaptive writer run against a real UAR:
 *   const result = await runWriterChunkDebug(myUAR);
 *   console.log(result);
 *
 *   // 2. Isolated parseChunk test (no LLM call):
 *   const parsed = testParseChunk(`
 *     {"slotId":"s1","questionType":"multipleChoice","prompt":"What is X?","options":["A","B","C","D"],"answer":"A"}
 *     <END_OF_PROBLEM>
 *     {"slotId":"s2","questionType":"shortAnswer","prompt":"Explain Y.","answer":"Y is ..."}
 *     <END_OF_PROBLEM>
 *   `);
 *   console.log(parsed);
 */

import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { runArchitect } from "@/pipeline/agents/architect";
import { writerAdaptive } from "@/pipeline/agents/writer/chunk/writerAdaptive";
import { parseChunk, END_SENTINEL } from "@/pipeline/agents/writer/chunk/parseChunk";
import { SCRIBE } from "@/pipeline/agents/scribe";
import { Gatekeeper } from "@/pipeline/agents/gatekeeper/Gatekeeper";
import { runBuilder } from "@/pipeline/agents/builder";

// ---------------------------------------------------------------------------
// 1. Full adaptive writer debug run
// ---------------------------------------------------------------------------

export async function runWriterChunkDebug(uar: UnifiedAssessmentRequest) {
  // Step 1 — Architect produces blueprint
  const blueprint = await runArchitect({ uar, agentId: "debug", compensation: null } as any);

  // Step 2 — SCRIBE prescriptions (in-memory, may be empty on first run)
  const scribePrescriptions = SCRIBE.getWriterPrescriptions();

  // Step 3 — Adaptive writer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { items, telemetry } = await writerAdaptive(
    blueprint.plan as any,
    blueprint.uar,
    scribePrescriptions
  );

  // Step 4 — Final batch Gatekeeper pass (same as pipeline)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gatekeeperResult = Gatekeeper.validate(blueprint.plan as any, items);

  // Step 5 — Builder: assemble FinalAssessment
  const finalAssessment = await runBuilder({ items, blueprint });

  // Step 6 — Count invariant check
  const slotCount = blueprint.plan.slots.length;
  const countOk = items.length === slotCount;

  return {
    uar,
    blueprint: blueprint.plan,
    items,
    finalAssessment,
    telemetry,
    gatekeeperResult,
    invariant: {
      expected: slotCount,
      actual: items.length,
      ok: countOk,
    },
    summary: {
      truncationEvents: telemetry.truncationEvents,
      rewriteCount: telemetry.rewriteCount,
      gatekeeperViolations: telemetry.gatekeeperViolations,
      chunkSizes: telemetry.chunkSizes,
      finalProblemCount: telemetry.finalProblemCount,
      allGatekeeperViolations: gatekeeperResult.violations,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Isolated parseChunk smoke test (no LLM)
// ---------------------------------------------------------------------------

export interface ParseChunkTestCase {
  label: string;
  raw: string;
}

/**
 * Run parseChunk against a raw string and return the result.
 * Useful for verifying truncation detection logic without making any LLM calls.
 */
export function testParseChunk(raw: string) {
  return parseChunk(raw);
}

/**
 * A battery of built-in smoke tests for parseChunk.
 * Call from the console: runParseChunkSmoke()
 */
export function runParseChunkSmoke() {
  const SEP = END_SENTINEL;

  const cases: ParseChunkTestCase[] = [
    {
      label: "CLEAN — 2 valid items",
      raw: `{"slotId":"s1","questionType":"shortAnswer","prompt":"What is X?","answer":"X"}${SEP}{"slotId":"s2","questionType":"shortAnswer","prompt":"What is Y?","answer":"Y"}${SEP}`,
    },
    {
      label: "TRUNCATED — missing final sentinel",
      raw: `{"slotId":"s1","questionType":"shortAnswer","prompt":"What is X?","answer":"X"}${SEP}{"slotId":"s2","questionType":"shortAnswer","prompt":"What is Y?","answ`,
    },
    {
      label: "TRUNCATED — bad JSON in second block",
      raw: `{"slotId":"s1","questionType":"shortAnswer","prompt":"What is X?","answer":"X"}${SEP}{CORRUPT JSON HERE}${SEP}`,
    },
    {
      label: "CLEAN — 1 MCQ item",
      raw: `{"slotId":"s1","questionType":"multipleChoice","prompt":"What is X?","options":["A","B","C","D"],"answer":"A"}${SEP}`,
    },
    {
      label: "TRUNCATED — no sentinel at all, valid JSON",
      // parseChunk salvages the JSON but still marks truncated=true
      // so the engine knows the LLM is dropping sentinels.
      raw: `{"slotId":"s1","questionType":"shortAnswer","prompt":"What is X?","answer":"X"}`,
    },
    {
      label: "CLEAN — markdown fences stripped",
      raw: `\`\`\`json\n{"slotId":"s1","questionType":"shortAnswer","prompt":"What is X?","answer":"X"}\n\`\`\`${SEP}`,
    },
  ];

  const results = cases.map(({ label, raw }) => {
    const result = parseChunk(raw);
    return {
      label,
      truncated: result.truncated,
      itemCount: result.items.length,
      failedBlocks: result.failedBlocks.length,
      pass:
        label.startsWith("CLEAN") ? !result.truncated : result.truncated,
    };
  });

  console.table(results);
  const allPass = results.every((r) => r.pass);
  console.log(allPass ? "✅ All smoke tests passed" : "❌ Some smoke tests FAILED");
  return results;
}
