/**
 * Learner Profile Weighting & Time Estimation System
 * 
 * Allows assigning weights/proportions to student profiles
 * and estimating completion time with confidence intervals
 */

/**
 * Weighted learner profile with proportion
 */
export interface WeightedLearnerProfile {
  profileId: string;          // e.g., "struggling-readers", "ell", "gifted"
  label: string;              // Display label
  weight: number;             // Proportion 0-100 (represents percentage)
  characteristics: string[];  // Key traits affecting time estimation
}

/**
 * Composition of the simulated class
 */
export interface ClassComposition {
  profiles: WeightedLearnerProfile[];
  totalStudents?: number;
  description?: string;
}

/**
 * Time estimation with confidence interval
 */
export interface TimeEstimate {
  meanTimeMinutes: number;    // Average time to completion
  confidenceInterval95: [number, number]; // [lower, upper] bounds
  standardDeviationMinutes: number;
  baseTimeMinutes: number;    // Time for typical student
  estimatedStudentCount?: number; // For class-level estimates
  perQuestionBreakdown?: QuestionTimeEstimate[];
}

/**
 * Time estimate for a single question
 */
export interface QuestionTimeEstimate {
  questionIndex: number;
  bloomLevel: number;         // 1-6
  estimatedMinutes: number;
  confidenceInterval95: [number, number];
  affectedProfiles: string[]; // Which profiles struggle most with this
}

/**
 * Learner profile characteristics for time estimation
 */
export const LEARNER_PROFILE_CHARACTERISTICS: Record<string, {
  timeMultiplier: number;     // 1.0 = baseline, 1.5 = 50% slower
  bloomLevelAdjustment: number; // +/- adjustment to perceived difficulty
  variabilityFactor: number;  // How consistent their performance is (0.5-1.5)
  strengths: string[];
  struggles: string[];
}> = {
  'struggling-readers': {
    timeMultiplier: 1.4,
    bloomLevelAdjustment: 0.5,
    variabilityFactor: 1.3,
    strengths: ['verbal-instruction', 'visual-aids', 'examples'],
    struggles: ['dense-text', 'complex-vocabulary', 'reading-comprehension'],
  },
  'ell': {
    timeMultiplier: 1.35,
    bloomLevelAdjustment: 0.3,
    variabilityFactor: 1.2,
    strengths: ['visual-learning', 'concrete-examples', 'scaffolding'],
    struggles: ['idioms', 'abstract-concepts', 'cultural-references'],
  },
  'gifted': {
    timeMultiplier: 0.7,
    bloomLevelAdjustment: -0.8,
    variabilityFactor: 0.6,
    strengths: ['complex-analysis', 'creative-thinking', 'rapid-processing'],
    struggles: ['patience-with-basics', 'attention-to-detail'],
  },
  'adhd': {
    timeMultiplier: 1.2,
    bloomLevelAdjustment: 0.2,
    variabilityFactor: 1.4,
    strengths: ['active-learning', 'hands-on-activities', 'short-bursts'],
    struggles: ['sustained-focus', 'long-assignments', 'reading-heavy'],
  },
  'visual-learners': {
    timeMultiplier: 0.9,
    bloomLevelAdjustment: -0.2,
    variabilityFactor: 0.8,
    strengths: ['diagrams', 'charts', 'visual-organization'],
    struggles: ['text-only', 'verbal-instructions', 'abstract-theory'],
  },
  'kinesthetic-learners': {
    timeMultiplier: 1.1,
    bloomLevelAdjustment: 0.1,
    variabilityFactor: 0.9,
    strengths: ['hands-on', 'movement', 'practical-application'],
    struggles: ['passive-learning', 'theory-focused', 'sitting-still'],
  },
};

/**
 * Calculate weighted average of profile characteristics
 */
export function calculateClassCharacteristics(composition: ClassComposition) {
  const totalWeight = composition.profiles.reduce((sum, p) => sum + p.weight, 0) || 100;
  
  let avgTimeMultiplier = 0;
  let avgBloomAdjustment = 0;
  let avgVariability = 0;

  for (const profile of composition.profiles) {
    const char = LEARNER_PROFILE_CHARACTERISTICS[profile.profileId];
    if (char) {
      const weight = profile.weight / totalWeight;
      avgTimeMultiplier += char.timeMultiplier * weight;
      avgBloomAdjustment += char.bloomLevelAdjustment * weight;
      avgVariability += char.variabilityFactor * weight;
    }
  }

  return {
    avgTimeMultiplier,
    avgBloomAdjustment,
    avgVariability,
  };
}

/**
 * Estimate time to completion for an assignment
 * Returns mean time and 95% confidence interval
 */
export function estimateCompletionTime(
  wordCount: number,
  questionCount: number,
  bloomLevel: number,
  composition?: ClassComposition | WeightedLearnerProfile[]
): TimeEstimate {
  // Normalize input
  const profiles = Array.isArray(composition) 
    ? composition 
    : composition?.profiles || [];

  // Base time calculation (typical student)
  // Approximately 0.5-1 minute per 100 words
  const wordBasedTime = (wordCount / 200);
  
  // Add time per question based on Bloom level
  // Remember/Understand: 1-2 min, Apply: 2-3 min, Analyze: 3-4 min, Evaluate/Create: 4-6 min
  const bloomTimePerQuestion = [1.5, 1.8, 2.5, 3.5, 4.5, 5.5][Math.round(bloomLevel) - 1] || 3;
  const questionBasedTime = (questionCount * bloomTimePerQuestion);

  const baseTimeMinutes = Math.max(2, wordBasedTime + questionBasedTime);

  // Apply class composition multipliers
  const classChar = calculateClassCharacteristics(
    Array.isArray(composition)
      ? { profiles: composition }
      : composition || { profiles: [] }
  );

  const meanTimeMinutes = baseTimeMinutes * classChar.avgTimeMultiplier;
  
  // Calculate standard deviation (more variability = wider CI)
  // Range: typically 30-50% of mean time
  const stdDev = meanTimeMinutes * (0.35 * classChar.avgVariability);

  // 95% CI = mean ± 1.96 * std dev
  const marginOfError = 1.96 * stdDev;
  const lower = Math.max(1, meanTimeMinutes - marginOfError);
  const upper = meanTimeMinutes + marginOfError;

  return {
    meanTimeMinutes: Number(meanTimeMinutes.toFixed(1)),
    confidenceInterval95: [Number(lower.toFixed(1)), Number(upper.toFixed(1))],
    standardDeviationMinutes: Number(stdDev.toFixed(1)),
    baseTimeMinutes: Number(baseTimeMinutes.toFixed(1)),
    estimatedStudentCount: Array.isArray(composition) 
      ? undefined
      : composition?.totalStudents,
  };
}

/**
 * Estimate time per individual question
 */
export function estimateQuestionTime(
  questionIndex: number,
  bloomLevel: number,
  composition?: ClassComposition | WeightedLearnerProfile[]
): QuestionTimeEstimate {
  // Base time by Bloom level
  const bloomTimeMap = [1.5, 1.8, 2.5, 3.5, 4.5, 5.5];
  const baseQuestionTime = bloomTimeMap[Math.round(bloomLevel) - 1] || 3;

  const classChar = calculateClassCharacteristics(
    Array.isArray(composition)
      ? { profiles: composition }
      : composition || { profiles: [] }
  );

  const meanTime = baseQuestionTime * classChar.avgTimeMultiplier;
  const stdDev = meanTime * (0.4 * classChar.avgVariability); // Higher variability per question
  const marginOfError = 1.96 * stdDev;

  // Identify at-risk profiles (those with worst time multipliers)
  const profilesAtRisk = (Array.isArray(composition) ? composition : composition?.profiles || [])
    .filter(p => (LEARNER_PROFILE_CHARACTERISTICS[p.profileId]?.timeMultiplier || 1) > 1.2)
    .map(p => p.profileId);

  return {
    questionIndex,
    bloomLevel,
    estimatedMinutes: Number(meanTime.toFixed(1)),
    confidenceInterval95: [
      Number(Math.max(0.5, meanTime - marginOfError).toFixed(1)),
      Number((meanTime + marginOfError).toFixed(1))
    ],
    affectedProfiles: profilesAtRisk,
  };
}

/**
 * Validate and normalize profile weights
 */
export function normalizeProfileWeights(profiles: WeightedLearnerProfile[]): WeightedLearnerProfile[] {
  const total = profiles.reduce((sum, p) => sum + p.weight, 0);
  if (total === 0) return profiles;

  return profiles.map(p => ({
    ...p,
    weight: (p.weight / total) * 100,
  }));
}

/**
 * Create a class composition from selected profiles
 */
export function createClassComposition(
  selectedProfiles: Record<string, number> // { profileId: weight }
): ClassComposition {
  const profiles = Object.entries(selectedProfiles)
    .filter(([_, weight]) => weight > 0)
    .map(([profileId, weight]) => ({
      profileId,
      label: LEARNER_PROFILE_CHARACTERISTICS[profileId]?.label || profileId,
      weight,
      characteristics: LEARNER_PROFILE_CHARACTERISTICS[profileId]?.strengths || [],
    }));

  const normalizedProfiles = normalizeProfileWeights(profiles);

  return {
    profiles: normalizedProfiles,
    description: `Class composition: ${normalizedProfiles
      .map(p => `${p.weight.toFixed(0)}% ${p.label}`)
      .join(', ')}`,
  };
}

/**
 * Get at-risk profiles for an assignment
 */
export function identifyAtRiskProfiles(
  composition: ClassComposition,
  difficultyLevel: 'easy' | 'intermediate' | 'hard'
): string[] {
  const atRisk: string[] = [];

  // High complexity assignments affect struggling readers and ELL
  if (difficultyLevel === 'hard') {
    atRisk.push(...['struggling-readers', 'ell']);
  }

  // Intermediate complexity may affect ADHD students
  if (['intermediate', 'hard'].includes(difficultyLevel)) {
    atRisk.push('adhd');
  }

  return [...new Set(atRisk)]; // Remove duplicates
}
