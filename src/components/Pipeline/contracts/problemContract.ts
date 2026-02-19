export type QuestionType =
  | "multipleChoice"
  | "trueFalse"
  | "shortAnswer"
  | "fillInTheBlank"
  | "openResponse"
  | "essay"
  | "matching"
  | "ordering"
  | "labeling"
  | "frq"
  | "dbq"
  | "leq"
  | "saq";


export interface ProblemPayload {
  problemId: string;
  question: string;
  answer: string;
  questionType: QuestionType;
  bloomLevel:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create";
  complexity: number; // 0–1
}
