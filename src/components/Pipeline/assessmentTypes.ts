export interface AssessmentTypeDefinition {
  id: string;
  label: string;
  purpose: string;
  recommendedTime: { min: number; max: number };
  typicalLength: string;
  skillScope: string;
  cognitiveDepth: string;
  emotionalLoad: string;
  predictionUse: string;
  problemTypes: string[];
  constraints: string[];
  prohibitions: string[];
  additionalDetailsHint: string;
}



export const ASSESSMENT_TYPES: Record<string, AssessmentTypeDefinition> = {
  worksheet: {
  id: "worksheet",
  label: "Worksheet",
  purpose: "Practice and reinforcement",
  recommendedTime: { min: 10, max: 25 },
  typicalLength: "6–12 problems",
  skillScope: "1–3 related skills",
  cognitiveDepth: "Low–Moderate",
  emotionalLoad: "Low",
  predictionUse: "Practice patterns and fluency",
  problemTypes: [
    "Skill practice",
    "Short problems",
    "Scaffolded items",
    "Repetition for mastery"
  ],
  constraints: [
    "Should reinforce previously taught skills",
    "Should include clear, simple problems"
  ],
  prohibitions: [
    "No heavy reading",
    "No trick questions",
    "No high-stakes difficulty"
  ],
  additionalDetailsHint:
    "Tell the system which skills need reinforcement or which problems should be scaffolded."
},

testReview: {
  id: "testReview",
  label: "Test Review",
  purpose: "Prepare students for an upcoming test",
  recommendedTime: { min: 15, max: 30 },
  typicalLength: "6–10 problems",
  skillScope: "Broad (unit-level)",
  cognitiveDepth: "Mixed (recall to application)",
  emotionalLoad: "Low–Moderate",
  predictionUse: "Identify weak areas before the test",
  problemTypes: [
    "Mixed review problems",
    "Recall + application",
    "One of each major skill",
    "Short word problems"
  ],
  constraints: [
    "Should reflect the structure of the upcoming test",
    "Should include a mix of difficulty levels"
  ],
  prohibitions: [
    "No new learning",
    "No extremely difficult problems"
  ],
  additionalDetailsHint:
    "Tell the system the unit being reviewed and any specific skills students struggled with."
},
 
    bellRinger: {
    id: "bellRinger",
    label: "Bell-Ringer",
    purpose: "Activate prior knowledge",
    recommendedTime: { min: 3, max: 7 },
    typicalLength: "1–2 short problems",
    skillScope: "Narrow (1–2 skills max)",
    cognitiveDepth: "Low–Moderate",
    emotionalLoad: "Low",
    predictionUse: "Surface misconceptions",
    problemTypes: ["Quick checks", "Warm-up recall", "Simple application"],
    constraints: ["Should be quick", "Should target prior knowledge"],
    prohibitions: [
      "Require multi-step modeling",
      "Require new learning",
      "Contain heavy word problems"
    ],
    additionalDetailsHint:
      "Tell the system what prior knowledge students need activated."
  },

  exitTicket: {
    id: "exitTicket",
    label: "Exit Ticket",
    purpose: "Measure today’s objective",
    recommendedTime: { min: 5, max: 5 },
    typicalLength: "1–2 focused problems",
    skillScope: "Single objective",
    cognitiveDepth: "Moderate",
    emotionalLoad: "Low",
    predictionUse: "Immediate mastery check",
    problemTypes: ["Direct skill check", "Single-step application"],
    constraints: ["Must align to today’s objective"],
    prohibitions: [],
    additionalDetailsHint:
      "Tell the system today’s objective or the exact skill you want checked."
  },

  quiz: {
    id: "quiz",
    label: "Quiz",
    purpose: "Short-term retention & accuracy",
    recommendedTime: { min: 10, max: 20 },
    typicalLength: "3–6 problems",
    skillScope: "2–4 related skills",
    cognitiveDepth: "Moderate–High",
    emotionalLoad: "Moderate",
    predictionUse: "Performance distribution",
    problemTypes: ["Mixed skills", "Moderate reasoning", "Short word problems"],
    constraints: ["Should sample multiple related skills"],
    prohibitions: [],
    additionalDetailsHint:
      "Tell the system which 2–4 skills you want emphasized."
  },

  test: {
    id: "test",
    label: "Test",
    purpose: "Summative evaluation",
    recommendedTime: { min: 30, max: 60 },
    typicalLength: "8–15 problems",
    skillScope: "Broad",
    cognitiveDepth: "Multi-level (apply + analyze)",
    emotionalLoad: "Moderate–High",
    predictionUse: "Mastery classification",
    problemTypes: ["Application", "Analysis", "Multi-step reasoning"],
    constraints: ["Should include multiple cognitive levels"],
    prohibitions: [],
    additionalDetailsHint:
      "Tell the system the unit scope and any required problem types."
  }
};
