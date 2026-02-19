import {
  MinimalTeacherIntent,
  UnifiedAssessmentRequest
} from "../components/Pipeline/contracts/assessmentContracts";

export function translateMinimalToUnified(
  intent: MinimalTeacherIntent
): UnifiedAssessmentRequest {
  return {
    //
    // Core teacher inputs
    //
    title: `${intent.course} – ${intent.unit}`,
    gradeLevels: intent.gradeLevels ?? [],
    subject: intent.course,

    // Required
    assessmentType: intent.assessmentType,
    time: intent.time,

    //
    // Source materials
    //
    sourceDocuments: intent.sourceDocuments ?? [],
    exampleAssessment: intent.exampleAssessment,

    //
    // Problem generation parameters
    //
    numProblems: inferNumProblems(intent.time),
    difficultyProfile: inferDifficulty(intent.studentLevel),

    //
    // Focus areas + teacher notes
    //
    focusAreas: inferFocus(intent.assessmentType),
    emphasis: [],
    classroomContext: intent.additionalDetails ?? "",
    notesForWriter: intent.additionalDetails ?? "",

    //
    // Rubric alignment
    //
    rubricGoals: [],

    //
    // Student modeling
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

//
// ─────────────────────────────────────────────
//   Inference Helpers
// ─────────────────────────────────────────────
//

function inferNumProblems(time: number): number {
  if (time <= 5) return 1;     // bell-ringer / exit ticket
  if (time <= 15) return 4;    // quiz / worksheet
  if (time <= 30) return 8;    // test review
  return 12;                   // test
}

function inferGradeLevel(intent: MinimalTeacherIntent): string {
  // If teacher explicitly selected grade levels, use them
  if (intent.gradeLevels && intent.gradeLevels.length > 0) {
    return intent.gradeLevels.join(", ");
  }

  // Otherwise infer from studentLevel (old behavior)
  return intent.studentLevel;
}


function inferDifficulty(level: string) {
  const lower = level.toLowerCase();
  if (lower.includes("advanced")) return { target: 0.8 };
  if (lower.includes("beginner")) return { target: 0.3 };
  return { target: 0.5 };
}

function inferFocus(assessmentType: string): string[] {
  switch (assessmentType) {
    case "bellRinger":
      return ["prior knowledge activation"];
    case "exitTicket":
      return ["today's objective"];
    case "quiz":
      return ["retention", "accuracy"];
    case "worksheet":
      return ["practice", "fluency"];
    case "testReview":
      return ["unit review"];
    case "test":
      return ["summative evaluation"];
    default:
      return ["general understanding"];
  }
}
