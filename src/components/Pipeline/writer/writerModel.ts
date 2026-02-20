// src/components/Pipeline/writer/writerModels.ts


export const BLOOM_DISTRIBUTIONS_BY_LEVEL = {
  default: {
    remember: 0.1,
    understand: 0.25,
    apply: 0.25,
    analyze: 0.2,
    evaluate: 0.1,
    create: 0.1,
  },
};

export const COMPLEXITY_RANGES = {
  default: { min: 0.3, max: 0.7 },
};

export const ESTIMATED_QUESTIONS_BY_TIME = {
  "10-min": { min: 3, max: 6 },
  "20-min": { min: 5, max: 10 },
  "30-min": { min: 8, max: 14 },
};

// Estimated minutes per problem type
export const TIME_PER_PROBLEM_TYPE: Record<string, number> = {
  "multiple-choice": 1.0,
  "true-false": 0.5,
  "short-answer": 2.0,
  "fill-in-the-blank": 1.5,
  "matching": 3.0,
  "multi-select": 1.5,
  "constructed-response": 4.0,
  "essay": 8.0,
};

export const BLOOM_TIME_MULTIPLIER: Record<string, number> = {
  remember: 0.8,
  understand: 1.0,
  apply: 1.2,
  analyze: 1.4,
  evaluate: 1.6,
  create: 2.0,
};

export function complexityTimeMultiplier(complexity: number): number {
  if (complexity < 0.3) return 0.9;
  if (complexity < 0.6) return 1.0;
  if (complexity < 0.8) return 1.2;
  return 1.4;
}

export function estimateProblemTime(problem: {
  questionType: string;
  bloomLevel: string;
  complexity: number;
}): number {
  const base = TIME_PER_PROBLEM_TYPE[problem.questionType] ?? 1.5;

  const bloom = BLOOM_TIME_MULTIPLIER[problem.bloomLevel] ?? 1.0;

  const complexity = complexityTimeMultiplier(problem.complexity);

  return base * bloom * complexity;
}

export function estimateAssessmentTime(problems: any[]): {
  totalMinutes: number;
  perProblem: number[];
} {
  const perProblem = problems.map((p) => estimateProblemTime(p));

  const totalMinutes = perProblem.reduce((a, b) => a + b, 0);

  return {
    totalMinutes: Math.round(totalMinutes),
    perProblem: perProblem.map((t) => Math.round(t)),
  };
}


export function getTimeBucket(time: string): keyof typeof ESTIMATED_QUESTIONS_BY_TIME {
  if (!time) return "20-min";
  const t = time.toLowerCase();
  if (t.includes("10")) return "10-min";
  if (t.includes("30")) return "30-min";
  return "20-min";
}
