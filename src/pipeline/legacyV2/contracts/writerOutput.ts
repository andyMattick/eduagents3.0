export interface WriterOutput {
  metadata: {
    version: string;
    gradeLevels: string[];
    course: string;
    topic: string;
    assessmentType: string;
    estimatedTimeMinutes: number;
  };
  questions: {
    id: string;
    slotIndex: number;
    type: "multipleChoice" | "shortAnswer" | "constructedResponse";
    stem: string;
    options: string[] | null;
    correctAnswer: string | string[];
    explanation: string;
    cognitiveProcess: "remember" | "understand" | "apply" | "analyze" | "evaluate";
    estimatedDifficulty: "easy" | "medium" | "hard";
    estimatedTimeSeconds: number;
    misconceptionTags: string[];
  }[];
  answerKey: {
    questionId: string;
    correctAnswer: string | string[];
    explanation: string;
  }[];
}
