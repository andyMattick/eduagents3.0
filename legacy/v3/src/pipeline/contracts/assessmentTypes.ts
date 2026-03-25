// src/pipeline/contracts/assessmentTypes.ts

export const ASSESSMENT_TYPES = {
  bellRinger: {
    label: "Bell Ringer",
    purpose: "Quick warm-up to activate prior knowledge.",
    recommendedTime: { min: 3, max: 5 },
    typicalLength: "1–3 short problems",
    problemTypes: [
      "Recall",
      "Quick checks",
      "Simple application",
    ],
    prohibitions: [
      "Long reading passages",
      "Multi-step reasoning",
      "Extended writing",
    ],
  },

  exitTicket: {
    label: "Exit Ticket",
    purpose: "Check understanding at the end of a lesson.",
    recommendedTime: { min: 3, max: 5 },
    typicalLength: "1–2 problems",
    problemTypes: [
      "Single skill check",
      "Short explanation",
    ],
    prohibitions: [
      "Multi-part tasks",
      "Heavy computation",
    ],
  },

  quiz: {
    label: "Quiz",
    purpose: "Assess short-term mastery of recent content.",
    recommendedTime: { min: 20, max: 35 },
    typicalLength: "5–10 problems",
    problemTypes: [
      "Mixed recall",
      "Application",
      "Short reasoning",
    ],
    prohibitions: [
      "Full essays",
      "Long modeling tasks",
    ],
  },

  test: {
    label: "Test",
    purpose: "Assess mastery across a full unit.",
    recommendedTime: { min: 40, max: 60 },
    typicalLength: "10–20 problems",
    problemTypes: [
      "Multi-step reasoning",
      "Application",
      "Modeling",
    ],
    prohibitions: [
      "Overly open-ended tasks",
      "Project-style prompts",
    ],
  },

  worksheet: {
    label: "Worksheet",
    purpose: "Provide structured practice on a focused skill.",
    recommendedTime: { min: 10, max: 20 },
    typicalLength: "5–15 problems",
    problemTypes: [
      "Skill practice",
      "Procedural fluency",
    ],
    prohibitions: [
      "Extended writing",
      "High abstraction",
    ],
  },

  testReview: {
    label: "Test Review",
    purpose: "Prepare students for an upcoming test.",
    recommendedTime: { min: 30, max: 45 },
    typicalLength: "8–15 problems",
    problemTypes: [
      "Mixed review",
      "Application",
      "Short reasoning",
    ],
    prohibitions: [
      "Brand-new content",
      "Unrelated topics",
    ],
  },
} as const;

export type AssessmentTypeKey = keyof typeof ASSESSMENT_TYPES;
