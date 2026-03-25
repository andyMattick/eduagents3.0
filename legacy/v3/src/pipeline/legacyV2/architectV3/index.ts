// @ts-nocheck
import { ArchitectV3Input, ArchitectV3Output } from "./types";
import { buildPlan } from "./planner";
import { UnifiedTeacherStyleProfile } from "../schema/unifiedSchema";
import { feasibilityPrecheck } from "./planner/feasibilityPlanner";

export async function runArchitectV3(input: ArchitectV3Input): Promise<ArchitectV3Output> {
  const plan = buildPlan(input);
  const feasibilityReport = feasibilityPrecheck(input);

    return {
    plan,
    feasibilityReport,
    styleConstraints: deriveStyleConstraints(input.teacherProfile),
    derivedStructuralConstraints: {
        preferMultipleChoice: plan.slots.some(s => s.questionType === "multipleChoice")
        }
    };

}

function deriveStyleConstraints(teacherProfile: UnifiedTeacherStyleProfile) {
  return {
    voice: teacherProfile.voice ?? "neutral",
    pacing: teacherProfile.pacing ?? "normal",
    formattingPatterns: teacherProfile.formatting_patterns ?? [],
    questionTypePreferences: teacherProfile.question_type_preferences ?? {},
    rigorCurve: teacherProfile.rigor_curve ?? []
  };
}


