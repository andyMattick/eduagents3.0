import type { BlueprintPlanV3_2 } from "@/types/Blueprint";
import type { GeneratedItem } from "../writer/types";

interface GatekeeperViolation {
  slotId: string;
  type: string;
  message: string;
}

interface GatekeeperValidationResult {
  ok: boolean;
  violations: GatekeeperViolation[];
}

export class Gatekeeper {
  static validate(
    blueprint: BlueprintPlanV3_2,
    items: GeneratedItem[]
  ): GatekeeperValidationResult {
    const violations: GatekeeperViolation[] = [];
    const uar = blueprint.uar ?? {};

    for (const slot of blueprint.slots) {
      const item = items.find(i => i.slotId === slot.id);

      if (!item) {
        violations.push({
          slotId: slot.id,
          type: "missing_item",
          message: "Writer did not generate an item for this slot."
        });
        continue;
      }

      //
      // 1. Question type match
      //
      if (item.questionType !== slot.questionType) {
        violations.push({
          slotId: slot.id,
          type: "question_type_mismatch",
          message: `Expected ${slot.questionType}, got ${item.questionType}.`
        });
      }

      //
      // 2. Topic/domain grounding
      //
      const promptLower = item.prompt.toLowerCase();
      if (uar.topic && !promptLower.includes(uar.topic.toLowerCase())) {
        violations.push({
          slotId: slot.id,
          type: "topic_mismatch",
          message: `Prompt must reference topic "${uar.topic}".`
        });
      }

      if (uar.course && !promptLower.includes(uar.course.toLowerCase())) {
        violations.push({
          slotId: slot.id,
          type: "domain_mismatch",
          message: `Prompt must be grounded in domain "${uar.course}".`
        });
      }

      //
      // 3. MCQ structural rules
      //
      if (slot.questionType === "multipleChoice") {
        if (!Array.isArray(item.options) || item.options.length !== 4) {
          violations.push({
            slotId: slot.id,
            type: "mcq_options_invalid",
            message: "Multiple-choice questions must have exactly 4 options."
          });
        }

        if (!item.options?.includes(item.answer ?? "")) {
          violations.push({
            slotId: slot.id,
            type: "mcq_answer_mismatch",
            message: "Answer must match one of the provided options."
          });
        }
      } else {
        if ("options" in item) {
          violations.push({
            slotId: slot.id,
            type: "mcq_options_unexpected",
            message: "Non-MC questions must not include an options array."
          });
        }
      }

      //
      // 4. Cognitive demand (Bloom-aligned)
      //
      if (slot.cognitiveDemand) {
        const bloom = {
          remember: ["define", "identify", "recall", "list", "state"],
          understand: ["explain", "summarize", "describe", "interpret"],
          apply: ["solve", "use", "calculate", "apply"],
          analyze: ["compare", "contrast", "categorize", "analyze"],
          evaluate: ["justify", "critique", "evaluate"]
        };

        const verbs = (bloom as Record<string, string[]>)[slot.cognitiveDemand as string] ?? [];
        const matchesVerb = verbs.some((v: string) => promptLower.includes(v));

        if (!matchesVerb) {
          violations.push({
            slotId: slot.id,
            type: "cognitive_demand_mismatch",
            message: `Prompt does not reflect Bloom level "${slot.cognitiveDemand}".`
          });
        }
      }

      //
      // 5. Difficulty alignment (light heuristic)
      //
      if (slot.difficulty === "easy" && promptLower.includes("prove")) {
        violations.push({
          slotId: slot.id,
          type: "difficulty_mismatch",
          message: "Easy questions must not require proof-level reasoning."
        });
      }

      //
      // 6. Avoid list
      //
      if (uar.avoidList) {
        for (const forbidden of uar.avoidList) {
          if (promptLower.includes(forbidden.toLowerCase())) {
            violations.push({
              slotId: slot.id,
              type: "forbidden_content",
              message: `Prompt contains forbidden content: "${forbidden}".`
            });
          }
        }
      }

      //
      // 7. Misconceptions
      //
      if (uar.misconceptions) {
        for (const misconception of uar.misconceptions) {
          if (!promptLower.includes(misconception.toLowerCase())) {
            violations.push({
              slotId: slot.id,
              type: "missing_misconception_alignment",
              message: `Prompt does not address required misconception: "${misconception}".`
            });
          }
        }
      }

      //
      // 8. Pacing sanity
      //
      if (slot.pacing === "normal" && item.prompt.length > 300) {
        violations.push({
          slotId: slot.id,
          type: "pacing_violation",
          message: "Prompt too long for pacing=normal."
        });
      }

      //
      // 9. Scope width (soft check)
      //
      if (blueprint.scopeWidth === "narrow") {
        const commaCount = (item.prompt.match(/,/g) || []).length;
        if (commaCount > 3) {
          violations.push({
            slotId: slot.id,
            type: "scope_width_violation",
            message: "Narrow scope questions must not integrate multiple strands."
          });
        }
      }
    }

    return {
      ok: violations.length === 0,
      violations
    };
  }
}
