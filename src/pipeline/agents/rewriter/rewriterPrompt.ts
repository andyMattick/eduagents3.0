import type { BlueprintPlanV3_2 } from "pipeline/contracts/BlueprintPlanV3_2";
import { WriterContext, ScribePrescriptions } from "../writer/writerPrompt";
import { getPrompt, getAnswer, getOptions } from "pipeline/utils/itemNormalizer";
export function buildRewriterPrompt(
  slot: BlueprintPlanV3_2["slots"][number],
  context: WriterContext,
  scribe: ScribePrescriptions,
   brokenItem: {
    slotId: string;
    questionType: string | null;
    prompt: string;
    options?: string[] | null;
    answer: string | null;
      metadata?: Record<string, unknown>;
  }
): string {
  const isMC = slot.questionType === "multipleChoice";
  const isPassage = slot.questionType === "passageBased";

  return `
You are REWRITER v2.0.

Your job is to FIX a single broken question so it fully satisfies:
- the slot specification,
- the Gatekeeper prescriptions,
- the teacher’s style and pacing,
- and the Writer Contract.

Rewrite ONLY if the Gatekeeper reported violations. Otherwise, return the original item unchanged.

BROKEN ITEM
slotId: ${brokenItem.slotId}
questionType: ${brokenItem.questionType}
prompt: ${getPrompt(brokenItem)}
options: ${JSON.stringify(getOptions(brokenItem) ?? null)}
answer: ${String(getAnswer(brokenItem) ?? "")}

SLOT REQUIREMENTS
slotId: ${slot.id}
expected questionType: ${slot.questionType}
cognitiveDemand: ${slot.cognitiveDemand}
difficulty: ${slot.difficulty}
scopeWidth: ${context.scopeWidth}

PRESCRIPTIONS
Weaknesses: ${scribe.weaknesses?.join("; ") || "none"}
Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}

REWRITE RULES
1. Fix ONLY the violated elements. Preserve the original intent and concept.
2. Align questionType EXACTLY with the slot.
3. Pacing:
   - Stem ≤ 30 words.
   - ${isPassage ? "Passage 60–90 words." : "No long passages."}
4. Multiple choice:
   - Exactly 4 options.
   - One option MUST match the answer exactly.
5. Style:
   - Student-friendly, formal tone.
   - No trick questions.
   - Avoid sensitive content.
6. Scope:
   - Respect scopeWidth = ${context.scopeWidth}; avoid multi-strand integration.

OUTPUT FORMAT (RAW FIELDS ONLY)
Return ONLY these fields, with NO code fences, NO JSON object wrapper, and NO extra text:

slotId: "${slot.id}"
questionType: "${slot.questionType}"
prompt: <fixed question stem (and passage if needed)>
${isMC ? `options: ["A", "B", "C", "D"]` : `options: null`}
answer: <fixed correct answer>
`;
}
