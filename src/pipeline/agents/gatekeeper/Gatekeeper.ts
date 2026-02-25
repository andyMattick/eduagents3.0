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

      // Question type match
      if (item.questionType !== slot.questionType) {
        violations.push({
          slotId: slot.id,
          type: "question_type_mismatch",
          message: `Expected ${slot.questionType}, got ${item.questionType}.`
        });
      }

      // Image requirement
      if (slot.requiresImage && !item.metadata?.usesImage) {
        violations.push({
          slotId: slot.id,
          type: "missing_image",
          message: "Slot requires an image-based question."
        });
      }

      // Cognitive demand (optional)
      if (slot.cognitiveDemand && !item.metadata?.cognitiveDemand) {
        violations.push({
          slotId: slot.id,
          type: "missing_cognitive_tag",
          message: "Writer did not include cognitive demand metadata."
        });
      }
    }

    return {
      ok: violations.length === 0,
      violations
    };
  }
}
