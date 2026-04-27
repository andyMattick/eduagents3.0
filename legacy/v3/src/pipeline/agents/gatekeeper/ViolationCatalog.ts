export enum ViolationType {
  MissingField = "missing_field",
  InvalidJSON = "invalid_json",
  WrongDifficulty = "wrong_difficulty",
  WrongCognitiveProcess = "wrong_cognitive_process",
  WrongPacing = "wrong_pacing",
  WrongSlotType = "wrong_slot_type",
  WrongSlotCount = "wrong_slot_count",
  WrongOrdering = "wrong_ordering",
  TopicMismatch = "topic_mismatch",
  ScopeMismatch = "scope_mismatch",
  FormatViolation = "format_violation",
  OperandOutOfRange = "operand_out_of_range",
  MathClarityViolation = "math_clarity_violation",
  StandardsMismatch = "standards_mismatch",
}

export interface Violation {
  type: ViolationType;
  message: string;
  severity: "low" | "medium" | "high";
  culprit: "writer" | "architect";
  field?: string;
}
