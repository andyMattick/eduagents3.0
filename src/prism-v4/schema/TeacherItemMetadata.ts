export interface TeacherItemMetadata {
  points?: number;
  rubric?: string;
  sampleSolution?: string;
  intendedComplexity?: number; // 0-1
  partialCreditEnabled?: boolean;
}