const COMPLEXITY_CAP_BY_ASSESSMENT_TYPE: Record<string, number> = {
  bellRinger: 4,
  exitTicket: 4,
  quiz: 9,
  worksheet: 12,
  testReview: 14,
  test: 16,
};

const DEFAULT_COMPLEXITY_CAP = 10;

export function getComplexityCapForAssessmentType(assessmentType: string): number {
  const normalized = String(assessmentType ?? "").trim();
  return COMPLEXITY_CAP_BY_ASSESSMENT_TYPE[normalized] ?? DEFAULT_COMPLEXITY_CAP;
}

export { COMPLEXITY_CAP_BY_ASSESSMENT_TYPE, DEFAULT_COMPLEXITY_CAP };