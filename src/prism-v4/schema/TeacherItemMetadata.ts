export interface TeacherItemMetadata {
  points?: number;
  rubric?: string;
  sampleSolution?: string;
  intendedDifficulty?: number; // 0-1
  partialCreditEnabled?: boolean;
}