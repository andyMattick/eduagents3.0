export interface TeacherStyleProfile {
  voice: string;
  question_type_preferences: Record<string, number>;
  rigor_curve: number[];
  pacing: string;
  formatting_patterns: string[];
}
