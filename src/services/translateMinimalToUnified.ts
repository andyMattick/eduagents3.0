import { MinimalTeacherIntent, UnifiedAssessmentRequest } from "../components/Pipeline/contracts/assessmentContracts";

export function translateMinimalToUnified(
  intent: MinimalTeacherIntent
): UnifiedAssessmentRequest {
  return {
    //
    // Core teacher inputs (inferred)
    //
    title: `${intent.course} – ${intent.unit}`,
    gradeLevel: intent.studentLevel,
    subject: intent.course,

    //
    // Source materials
    //
    sourceDocuments: intent.sourceDocuments,
    exampleAssessment: intent.exampleAssessment,

    //
    // Problem generation parameters (inferred)
    //
    numProblems: inferNumProblems(intent.time),
    difficultyProfile: inferDifficulty(intent.studentLevel),

    //
    // Focus areas (inferred)
    //
    focusAreas: inferFocus(intent.assignmentType),
    emphasis: [],
    classroomContext: intent.additionalDetails ?? "",
    notesForWriter: "",

    //
    // Rubric alignment (optional)
    //
    rubricGoals: [],

    //
    // Student modeling (none for minimal)
    //
    studentProfiles: [],

    //
    // Advanced options
    //
    allowAIEnhancements: true,
    preserveTeacherStyle: true,

    //
    // Versioning
    //
    pipelineVersion: "v2",
    studentInteraction: []
  };
}

// --- Simple inference helpers ---
function inferNumProblems(time: string): number {
  if (time.includes("short") || time.includes("quick")) return 3;
  if (time.includes("long") || time.includes("extended")) return 10;
  return 5;
}

function inferDifficulty(level: string) {
  if (level.toLowerCase().includes("advanced")) return { target: 0.8 };
  if (level.toLowerCase().includes("beginner")) return { target: 0.3 };
  return { target: 0.5 };
}

function inferFocus(assignmentType: string): string[] {
  if (assignmentType.toLowerCase().includes("essay")) return ["writing", "reasoning"];
  if (assignmentType.toLowerCase().includes("quiz")) return ["recall", "accuracy"];
  return ["general understanding"];
}
