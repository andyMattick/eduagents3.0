import { ProblemPayload } from "../contracts/problemContract";
export interface OrderedProblem extends ProblemPayload {
  orderIndex: number;
  estimatedTimeMinutes: number;
}

export interface DifficultyBandSummary {
  band: "low" | "medium" | "high";
  count: number;
}

export interface QuestionTypeSummary {
  questionType: string;
  count: number;
}

export interface AstronomerReport {
  orderedProblems: OrderedProblem[];
  totalEstimatedTimeMinutes: number;
  difficultyBands: DifficultyBandSummary[];
  questionTypeSummary: QuestionTypeSummary[];
}
