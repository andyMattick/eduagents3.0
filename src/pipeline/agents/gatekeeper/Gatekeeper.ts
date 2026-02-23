import { Violation, ViolationType } from "./ViolationCatalog";
import { GatekeeperReport } from "./GatekeeperReport";

export class Gatekeeper {
  static validate(blueprint: any, assessment: any): GatekeeperReport {
    const violations: Violation[] = [];

    //
    // 1. JSON validity
    //
    if (!assessment || typeof assessment !== "object") {
      violations.push({
        type: ViolationType.InvalidJSON,
        message: "Assessment is not valid JSON.",
        severity: "high",
        culprit: "writer"
      });
    }

    //
    // 2. Required fields
    //
    const requiredFields = ["questions", "metadata"];
    for (const field of requiredFields) {
      if (!assessment?.[field]) {
        violations.push({
          type: ViolationType.MissingField,
          message: `Missing required field: ${field}`,
          severity: "high",
          culprit: "writer",
          field
        });
      }
    }

    //
    // 3. Slot count
    //
    if (assessment?.questions?.length !== blueprint?.slots?.length) {
      violations.push({
        type: ViolationType.WrongSlotCount,
        message: "Number of questions does not match blueprint slot count.",
        severity: "high",
        culprit: "writer"
      });
    }

    //
    // 4. Slot type fidelity
    //
    blueprint?.slots?.forEach((slot: any, index: number) => {
      const q = assessment?.questions?.[index];
      if (!q) return;

      if (q.type !== slot.type) {
        violations.push({
          type: ViolationType.WrongSlotType,
          message: `Question ${index + 1} type mismatch.`,
          severity: "medium",
          culprit: "writer"
        });
      }
    });

    //
    // 5. Difficulty alignment
    //
    blueprint?.slots?.forEach((slot: any, index: number) => {
      const q = assessment?.questions?.[index];
      if (!q) return;

      if (q.difficulty !== slot.difficultyModifier) {
        violations.push({
          type: ViolationType.WrongDifficulty,
          message: `Question ${index + 1} difficulty mismatch.`,
          severity: "medium",
          culprit: "writer"
        });
      }
    });

    //
    // 6. Cognitive process alignment
    //
    blueprint?.slots?.forEach((slot: any, index: number) => {
      const q = assessment?.questions?.[index];
      if (!q) return;

      if (q.cognitiveProcess !== slot.cognitiveProcess) {
        violations.push({
          type: ViolationType.WrongCognitiveProcess,
          message: `Question ${index + 1} cognitive process mismatch.`,
          severity: "medium",
          culprit: "writer"
        });
      }
    });

    //
    // 7. Topic/scope alignment
    //
    if (assessment?.metadata?.topic !== blueprint?.uar?.topic) {
      violations.push({
        type: ViolationType.TopicMismatch,
        message: "Topic does not match blueprint.",
        severity: "high",
        culprit: "architect"
      });
    }

    if (assessment?.metadata?.scope !== blueprint?.plan?.scopeWidth) {
      violations.push({
        type: ViolationType.ScopeMismatch,
        message: "Scope does not match blueprint.",
        severity: "high",
        culprit: "architect"
      });
    }

    //
    // 8. Passed?
    //
    const passed = violations.length === 0;

    //
    // 9. Governance metadata
    //
    const blueprintVersion = blueprint?.version ?? 1;
    const writerVersion = assessment?.version ?? 1;

    const violationCount = violations.length;

    const severitySummary = {
      low: violations.filter(v => v.severity === "low").length,
      medium: violations.filter(v => v.severity === "medium").length,
      high: violations.filter(v => v.severity === "high").length
    };

    //
    // 10. Return GatekeeperReport
    //
    return {
      passed,
      violations,
      blueprintVersion,
      writerVersion,
      timestamp: new Date().toISOString(),
      violationCount,
      severitySummary
    };
  }
}
