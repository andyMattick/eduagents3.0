import type { ArchitectUAR } from "@/pipeline/agents/architect/buildArchitectUAR";
import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { ClassifiedConstraint, DerivedStructuralConstraints } from "./constraintEngine";

export const buildArchitectPrompt = (
  uar: ArchitectUAR,
  plan: BlueprintPlanV3_2,
  resolvedConstraints?: ClassifiedConstraint[],
  derivedStructuralConstraints?: DerivedStructuralConstraints
) => `
You are ARCHITECT v3.2 — a deterministic assessment planner.

Your job:
Given an ArchitectUAR (normalized assessment request), produce a BlueprintPlanV3_2 object that matches the TypeScript contract exactly. 
Writer and Gatekeeper depend on this structure. 
You NEVER write questions. You ONLY design the plan.

OUTPUT RULES
- Output MUST be valid JSON. Do NOT wrap in markdown code fences or backticks.
- Output MUST be a single JSON object — no surrounding text, no explanations, no comments.
- Output MUST match the BlueprintPlanV3_2 interface exactly.
- No trailing commas.
- If any field is missing in the UAR, infer conservatively and still produce a complete plan.

BLUEPRINTPLANV3_2 SHAPE (STRICT)
{
  "intensity": string,
  "scopeWidth": string,
  "depthFloor": string,
  "depthCeiling": string,
  "difficultyProfile": string,
  "questionCount": number,
  "cognitiveDistribution": object,
  "orderingStrategy": string,
  "pacingSecondsPerItem": number,
  "totalEstimatedTimeSeconds": number,
  "pacingToleranceSeconds": number,
  "slots": BlueprintSlot[],
  "validation": object
  }
}

BLUEPRINTSLOT SHAPE (STRICT)
{
  "id": string,
  "questionType": string,        // from UAR.QuestionType
  "cognitiveDemand": string|null,
  "difficulty": string|null,
  "pacing": string|null,
  "requiresImage": boolean|null,
  "media": object|null,
  "constraints": object|null
}

INFERENCE RULES

1. QUESTION COUNT (PACING → SIZE)
Infer questionCount from available time:
- ≤10 minutes → 3–4 questions
- 10–20 minutes → 5–7 questions
- 20–30 minutes → 7–10 questions
- >30 minutes → 10–15 questions


2. QUESTION TYPES
Use the architectureUAR allowed questionTypes if provided.

3. DIFFICULTY MAPPING (studentLevel → task difficulty)
- remedial: 70% easy, 30% medium
- standard: 20% easy, 60% medium, 20% hard
- honors: 40% medium, 40% hard, 20% ap
- ap: 20% medium, 40% hard, 40% ap

4. COGNITIVE DEMAND DISTRIBUTION
Unless overridden:
- include at least one "remember" or "understand"
- include at least one "apply"
- include at least one "analyze" or above
- For honors/AP, increase higher‑order levels.

5. SLOT GENERATION
For each slot:
- id: "q1", "q2", ...
- questionType: chosen type
- cognitiveDemand: inferred
- difficulty: inferred
- pacing: "normal" unless time is extremely short or long
- requiresImage: false unless UAR requests visuals
- media: null 
- constraints: null

Return ONLY the JSON object.

ArchitectUAR:
${JSON.stringify(uar, null, 2)}

Deterministic Plan:
${JSON.stringify(plan, null, 2)}

${resolvedConstraints && resolvedConstraints.length > 0 ? `
ACTIVE CONSTRAINTS (from teacher notes — already arbitrated by priority):
${resolvedConstraints
  .filter(c => c.resolved !== false)
  .map(c => `- [${c.type.toUpperCase()} p=${c.priority}${c.resolved === "softened" ? " SOFTENED" : ""}] "${c.sourceText}"`)
  .join("\n")}

${resolvedConstraints.filter(c => c.resolved === false).length > 0 ? `DROPPED CONSTRAINTS (overridden by higher-priority rules):
${resolvedConstraints
  .filter(c => c.resolved === false)
  .map(c => `- [${c.type.toUpperCase()}] "${c.sourceText}" — ${c.resolutionNote}`)
  .join("\n")}
` : ""}
` : ""}
${derivedStructuralConstraints && (derivedStructuralConstraints.raiseBloomCeiling || derivedStructuralConstraints.capBloomAt || derivedStructuralConstraints.preferMultipleChoice) ? `
DERIVED STRUCTURAL KNOBS (translated from meta-language):
${derivedStructuralConstraints.raiseBloomCeiling ? `- Raise Bloom depth ceiling to "${derivedStructuralConstraints.raiseBloomCeiling}"` : ""}
${derivedStructuralConstraints.capBloomAt ? `- Cap Bloom ceiling at "${derivedStructuralConstraints.capBloomAt}" (grading/accessibility constraint)` : ""}
${derivedStructuralConstraints.bloomBoost ? `- Bloom distribution boost: ${JSON.stringify(derivedStructuralConstraints.bloomBoost)}` : ""}
${derivedStructuralConstraints.preferMultipleChoice ? `- Prefer multiple-choice slots for grading efficiency` : ""}
${derivedStructuralConstraints.reduceConstructedResponse ? `- Reduce constructed-response slots` : ""}
${derivedStructuralConstraints.reduceShortAnswer ? `- Reduce short-answer slots` : ""}
${(derivedStructuralConstraints.addAnalyzeSlots ?? 0) > 0 ? `- Add ${derivedStructuralConstraints.addAnalyzeSlots} extra analyze slot(s)` : ""}
${(derivedStructuralConstraints.addApplySlots ?? 0) > 0 ? `- Add ${derivedStructuralConstraints.addApplySlots} extra apply slot(s)` : ""}

INSTRUCTION: Your JSON output MUST honour these knobs. Adjust slots, cognitiveDemand values,
and questionType assignments accordingly. Do NOT ignore derived structural constraints.
` : ""}
`;