/**
 * teacherRewrite.ts
 *
 * Post-Builder targeted rewrite.  Takes the *final* built assessment
 * (with numbered items, answer keys, metadata) and the teacher's
 * free-text comments, and asks the LLM to apply *only* the requested
 * changes.  Returns a patched FinalAssessment.
 *
 * This is separate from the in-pipeline Rewriter (which operates on
 * writerDraft slots before Builder).  Here we operate on the finished
 * product so the teacher gets exactly what they asked for.
 */

import { callAI } from "@/config/aiConfig";
import type { FinalAssessment } from "@/pipeline/agents/builder/FinalAssessment";

export interface TeacherRewriteInput {
  finalAssessment: FinalAssessment;
  teacherComments: string;
  /** Optional – passed for alignment context only */
  blueprint?: any;
}

function buildTeacherRewritePrompt(input: TeacherRewriteInput): string {
  const { finalAssessment, teacherComments, blueprint } = input;

  const blueprintHint = blueprint?.plan
    ? `\nBLUEPRINT CONTEXT (for alignment, do NOT change structure):\n${JSON.stringify({
        slots: (blueprint.plan.slots ?? []).length,
        cognitiveDistribution: blueprint.plan.cognitiveDistribution,
        difficultyProfile: blueprint.plan.difficultyProfile,
      })}\n`
    : "";

  return `You are TEACHER-REWRITER, a targeted editing agent.

A teacher has reviewed their generated assessment and wants specific changes.
Apply ONLY the changes the teacher requested.  Do NOT alter questions the teacher
did not mention.  Preserve all metadata (slotId, questionType, bloomLevel, etc.)
unless the teacher's instructions specifically require changing them.

RULES:
- Keep the same total number of items
- Do not change answer keys unless the teacher asked for it
- Preserve questionType unless the teacher explicitly asks to convert format
- If the teacher references questions by number, map to 1-based item index
- Return a complete FinalAssessment JSON — not a diff
${blueprintHint}
CURRENT ASSESSMENT:
${JSON.stringify(finalAssessment, null, 2)}

TEACHER COMMENTS:
${teacherComments}

OUTPUT:
Return ONLY a valid JSON object matching the FinalAssessment schema:
{
  "title": "...",
  "items": [ ... ],
  "totalItems": ...,
  "metadata": { ... },
  "cognitiveDistribution": { ... }
}
`;
}

export async function runTeacherRewrite(
  input: TeacherRewriteInput
): Promise<FinalAssessment> {
  const prompt = buildTeacherRewritePrompt(input);
  const raw = await callAI(prompt);

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Teacher rewrite did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as FinalAssessment;

  // Basic sanity checks
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("Teacher rewrite returned an assessment with no items array");
  }

  // Carry over metadata that the LLM may have dropped
  if (!parsed.metadata && input.finalAssessment.metadata) {
    parsed.metadata = input.finalAssessment.metadata;
  }

  if (!parsed.cognitiveDistribution && input.finalAssessment.cognitiveDistribution) {
    parsed.cognitiveDistribution = input.finalAssessment.cognitiveDistribution;
  }

  parsed.totalItems = parsed.items.length;

  return parsed;
}
