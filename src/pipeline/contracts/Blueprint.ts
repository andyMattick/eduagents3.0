import { UnifiedAssessmentRequest } from "./UnifiedAssessmentRequest";

export interface Blueprint {
  uar: UnifiedAssessmentRequest;

  writerPrompt: string;

  // Room to grow: planning + constraints
  plan: {
    questionCount: number;
    questionTypes: string[]; // e.g. ["multipleChoice", "shortAnswer", "constructedResponse"]
    targetDifficulty: "introductory" | "onLevel" | "challenge";
    estimatedTimeMinutes: number;
  };

  constraints: {
    mustAlignToTopic: boolean;
    avoidTrickQuestions: boolean;
    avoidSensitiveContent: boolean;
    respectTimeLimit: boolean;
  };
}
