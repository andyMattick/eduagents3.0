export type QuestionType =
  | "mcq"
  | "short"
  | "extended"
  | "diagram"
  | "image"
  | (string & {}); // extensible

export interface UAR {
  version: "1.0";
  userId: string;
  domain: string;
  grade: string;
  assessmentType: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyPreference?: "easy" | "medium" | "hard" | "mixed";
  timeLimitMinutes?: number;
  teacherPreferences?: Record<string, any>;
  media?: Record<string, any>;
  customFeatures?: Record<string, any>;
}
