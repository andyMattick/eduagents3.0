/**
 * Core Simulation Engine: Models student-problem interactions
 * Takes Asteroids + Astronauts as input
 * Produces StudentProblemInput objects for every (Student, Problem) pair
 */

import {
  Asteroid,
  Astronaut,
  StudentProblemInput,
  StudentProblemOutput,
  StudentAssignmentSimulation,
  AssignmentSimulationResults,
} from '../../types/simulation';

/**
 * Calculate perceived success: How likely is this student to perceive themselves as successful?
 * Based on mismatch between student ability and problem Bloom level
 */
function calculatePerceivedSuccess(student: Astronaut, asteroid: Asteroid): number {
  const bloomWeights: Record<string, number> = {
    Remember: 1.0, // Easy
    Understand: 1.8,
    Apply: 2.5,
    Analyze: 3.2,
    Evaluate: 3.8,
    Create: 4.5, // Hardest
  };

  const bloomRequirement = bloomWeights[asteroid.BloomLevel] || 2.5;

  // Average student ability (weighted toward reading for comprehension tasks)
  const studentAbility =
    student.ProfileTraits.ReadingLevel * 0.4 +
    student.ProfileTraits.MathFluency * 0.3 +
    student.ProfileTraits.Confidence * 0.3;

  // Normalize to 0-5 scale
  const normalizedAbility = studentAbility * 5;

  // Perceived success drops if ability < requirement
  // Formula: max(0.1, 1 - (requirement - ability) / 5)
  const successProbability = Math.max(0.1, 1 - (bloomRequirement - normalizedAbility) / 5);

  return Math.min(1.0, successProbability);
}

/**
 * Calculate time on task: How long will this student spend on this problem?
 */
function calculateTimeOnTask(student: Astronaut, asteroid: Asteroid): number {
  // Base time: roughly 1 second per word of problem text
  const baseTime = asteroid.ProblemLength * 1.0;

  // Complexity multiplier: higher complexity = more time
  const complexityMultiplier = 1 + asteroid.LinguisticComplexity * 1.5;

  // Bloom level multiplier: higher cognitive load = more time
  const bloomWeights: Record<string, number> = {
    Remember: 1.0,
    Understand: 1.3,
    Apply: 1.6,
    Analyze: 2.0,
    Evaluate: 2.3,
    Create: 2.8,
  };
  const bloomMultiplier = bloomWeights[asteroid.BloomLevel] || 1.5;

  // Student reading speed factor: lower reading level = more time
  const readingSpeedFactor = 1 + (1 - student.ProfileTraits.ReadingLevel) * 1.0;

  const totalSeconds =
    baseTime * complexityMultiplier * bloomMultiplier * readingSpeedFactor;

  return Math.round(totalSeconds);
}

/**
 * Calculate confusion signals: How many confusion triggers are present?
 */
function calculateConfusionSignals(student: Astronaut, asteroid: Asteroid): number {
  let signals = 0;

  // High novelty triggers confusion
  if (asteroid.NoveltyScore > 0.75) {
    signals += 2;
  } else if (asteroid.NoveltyScore > 0.5) {
    signals += 1;
  }

  // High complexity triggers confusion (especially for lower-ability students)
  if (asteroid.LinguisticComplexity > 0.7 && student.ProfileTraits.ReadingLevel < 0.6) {
    signals += 2;
  } else if (asteroid.LinguisticComplexity > 0.7) {
    signals += 1;
  }

  // Bloom mismatch triggers confusion (problem too hard)
  const bloomWeights: Record<string, number> = {
    Remember: 0,
    Understand: 1,
    Apply: 2,
    Analyze: 3,
    Evaluate: 4,
    Create: 5,
  };
  const studentLevel = student.ProfileTraits.Confidence * 3; // Rough ability estimate
  const problemLevel = bloomWeights[asteroid.BloomLevel] || 2;
  if (problemLevel - studentLevel > 2) {
    signals += 3;
  } else if (problemLevel - studentLevel > 1) {
    signals += 1;
  }

  // ADHD overlay: frequent context switches confusing
  if (student.Overlays.includes('adhd') && asteroid.MultiPart) {
    signals += 1;
  }

  return signals;
}

/**
 * Calculate engagement score: How engaged will this student be?
 * Based on novelty, success probability, and fatigue
 */
function calculateEngagementScore(
  student: Astronaut,
  asteroid: Asteroid,
  fatigueIndex: number,
): number {
  // Novelty is engaging (sweet spot: 0.4-0.7)
  const noveltyScore =
    asteroid.NoveltyScore > 0.7
      ? Math.max(0, 1 - (asteroid.NoveltyScore - 0.7) * 0.5) // Too novel = overwhelming
      : asteroid.NoveltyScore > 0.3
        ? 1.0 // Sweet spot
        : 0.5; // Too familiar = boring

  // Success probability is engaging
  const successScore = calculatePerceivedSuccess(student, asteroid);

  // Fatigue reduces engagement
  const fatigueEffect = 1 - fatigueIndex * 0.5;

  // Student confidence boosts engagement
  const confidenceBoost = 0.5 + student.ProfileTraits.Confidence * 0.5;

  // Combine factors
  const engagement =
    noveltyScore * 0.3 + successScore * 0.3 + fatigueEffect * 0.3 + confidenceBoost * 0.1;

  return Math.min(1.0, Math.max(0, engagement));
}

/**
 * Simulate a single (student, problem) interaction
 */
function simulateStudentProblemPair(
  student: Astronaut,
  asteroid: Asteroid,
  cumulativeFatigue: number,
): StudentProblemInput {
  const perceiveSuccess = calculatePerceivedSuccess(student, asteroid);
  const timeOnTask = calculateTimeOnTask(student, asteroid);
  const confusionSignals = calculateConfusionSignals(student, asteroid);
  const engagement = calculateEngagementScore(student, asteroid, cumulativeFatigue);

  // Time pressure: assume 60-minute assignment
  const remainingTime = 60 * 60; // seconds
  const timePressureIndex = remainingTime > 0 ? (timeOnTask / remainingTime) * 2 : 1.0;

  // Fatigue compounds over the assignment
  const fatigueIndex = Math.min(
    1.0,
    cumulativeFatigue + (1 - perceiveSuccess) * 0.1 + timeOnTask / 3600,
  );

  return {
    StudentId: student.StudentId,
    ProblemId: asteroid.ProblemId,
    TestType: asteroid.TestType || 'free_response',
    ProblemLength: asteroid.ProblemLength,
    MultiPart: asteroid.MultiPart,
    BloomLevel: asteroid.BloomLevel,
    LinguisticComplexity: asteroid.LinguisticComplexity,
    SimilarityToPrevious: asteroid.SimilarityToPrevious,
    NoveltyScore: asteroid.NoveltyScore,
    PerceivedSuccess: perceiveSuccess,
    TimeOnTask: timeOnTask,
    TimePressureIndex: timePressureIndex,
    FatigueIndex: fatigueIndex,
    ConfusionSignals: confusionSignals,
    EngagementScore: engagement,
    NarrativeTags: student.NarrativeTags,
    Overlays: student.Overlays,
  };
}

/**
 * Convert StudentProblemInput to StudentProblemOutput
 */
function generateProblemOutput(
  input: StudentProblemInput,
  asteroid: Asteroid,
): StudentProblemOutput {
  // Determine correctness: higher perceived success = higher probability
  const actualCorrect = Math.random() < input.PerceivedSuccess;

  // Confusion level
  const confusionLevel: 'low' | 'medium' | 'high' =
    input.ConfusionSignals < 2 ? 'low' : input.ConfusionSignals < 4 ? 'medium' : 'high';

  // Engagement level
  const engagementLevel: 'low' | 'medium' | 'high' =
    input.EngagementScore < 0.35
      ? 'low'
      : input.EngagementScore < 0.65
        ? 'medium'
        : 'high';

  // Generate feedback
  const feedback =
    actualCorrect && input.PerceivedSuccess > 0.7
      ? `${input.StudentId} demonstrated strong understanding of this problem.`
      : !actualCorrect && confusionLevel === 'high'
        ? `${input.StudentId} may need additional support with this problem type.`
        : `${input.StudentId} showed moderate progress on this problem.`;

  return {
    studentId: input.StudentId,
    problemId: input.ProblemId,
    timeToCompleteSeconds: input.TimeOnTask,
    percentageSuccessful: input.PerceivedSuccess * 100,
    confusionLevel,
    engagementLevel,
    feedback,
  };
}

/**
 * Run full assignment simulation for a single student
 */
export function simulateStudentAssignment(
  student: Astronaut,
  asteroids: Asteroid[],
): StudentAssignmentSimulation {
  const problemResults: StudentProblemOutput[] = [];
  let cumulativeFatigue = 0;
  let totalTimeSeconds = 0;
  const confusionPoints: string[] = [];
  const engagementTrajectory: number[] = [];

  for (const asteroid of asteroids) {
    const input = simulateStudentProblemPair(student, asteroid, cumulativeFatigue);
    const output = generateProblemOutput(input, asteroid);

    problemResults.push(output);
    totalTimeSeconds += input.TimeOnTask;
    cumulativeFatigue = input.FatigueIndex;

    engagementTrajectory.push(input.EngagementScore);

    if (output.confusionLevel === 'high') {
      confusionPoints.push(asteroid.ProblemId);
    }
  }

  // Estimate grade based on performance
  const avgSuccessRate =
    problemResults.reduce((sum, p) => sum + p.percentageSuccessful, 0) /
    Math.max(problemResults.length, 1) /
    100;

  const estimatedScore = Math.round(avgSuccessRate * 100);
  const estimatedGrade =
    avgSuccessRate > 0.9
      ? 'A'
      : avgSuccessRate > 0.8
        ? 'B'
        : avgSuccessRate > 0.7
          ? 'C'
          : avgSuccessRate > 0.6
            ? 'D'
            : 'F';

  // Check if at-risk
  const atRisk =
    estimatedGrade === 'D' ||
    estimatedGrade === 'F' ||
    confusionPoints.length > asteroids.length * 0.5;

  return {
    studentId: student.StudentId,
    personaName: student.PersonaName,
    totalTimeMinutes: Math.round(totalTimeSeconds / 60),
    estimatedScore,
    estimatedGrade,
    problemResults,
    engagement: {
      initial: engagementTrajectory[0] || 0.5,
      atMidpoint: engagementTrajectory[Math.floor(engagementTrajectory.length / 2)] || 0.5,
      final: engagementTrajectory[engagementTrajectory.length - 1] || 0.5,
      trend:
        engagementTrajectory[engagementTrajectory.length - 1] >
        engagementTrajectory[0]
          ? 'improving'
          : engagementTrajectory[engagementTrajectory.length - 1] <
              engagementTrajectory[0]
            ? 'declining'
            : 'stable',
    },
    fatigue: {
      initial: 0,
      peak: Math.max(...problemResults.map((_, i) => (i + 1) * 0.1)),
      final: cumulativeFatigue,
    },
    confusionPoints,
    atRisk,
    riskFactors: atRisk
      ? [
          estimatedGrade === 'F' ? 'Very low performance' : '',
          confusionPoints.length > 0 ? `Confusion on ${confusionPoints.length} problems` : '',
          cumulativeFatigue > 0.8 ? 'High fatigue' : '',
        ].filter(Boolean)
      : [],
  };
}

/**
 * Run full simulation: All Asteroids × All Astronauts
 */
export function runAssignmentSimulation(
  asteroids: Asteroid[],
  astronauts: Astronaut[],
  assignmentId?: string,
): AssignmentSimulationResults {
  const studentResults = astronauts.map(student =>
    simulateStudentAssignment(student, asteroids),
  );

  // Calculate aggregated analytics
  const totalTimeMinutes = Math.round(
    studentResults.reduce((sum, s) => sum + s.totalTimeMinutes, 0) / studentResults.length,
  );

  const averageScore = Math.round(
    studentResults.reduce((sum, s) => sum + s.estimatedScore, 0) / studentResults.length,
  );

  const completionRate = Math.round(
    ((studentResults.filter(s => s.estimatedGrade !== 'F').length / studentResults.length) *
      100) as any,
  );

  // Identify common confusion points
  const confusionCounts: Record<string, number> = {};
  for (const student of studentResults) {
    for (const problemId of student.confusionPoints) {
      confusionCounts[problemId] = (confusionCounts[problemId] || 0) + 1;
    }
  }
  const commonConfusionPoints = Object.entries(confusionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const atRiskCount = studentResults.filter(s => s.atRisk).length;

  return {
    assignmentId: assignmentId || `assignment_${Date.now()}`,
    timestamp: new Date().toISOString(),
    asteroids,
    astronauts,
    studentResults,
    aggregatedAnalytics: {
      averageTimeMinutes: totalTimeMinutes,
      averageScore,
      completionRate,
      bloomCoverage: {
        Remember: (asteroids.filter(a => a.BloomLevel === 'Remember').length / asteroids.length) * 100,
        Understand: (asteroids.filter(a => a.BloomLevel === 'Understand').length / asteroids.length) * 100,
        Apply: (asteroids.filter(a => a.BloomLevel === 'Apply').length / asteroids.length) * 100,
        Analyze: (asteroids.filter(a => a.BloomLevel === 'Analyze').length / asteroids.length) * 100,
        Evaluate: (asteroids.filter(a => a.BloomLevel === 'Evaluate').length / asteroids.length) * 100,
        Create: (asteroids.filter(a => a.BloomLevel === 'Create').length / asteroids.length) * 100,
      },
      commonConfusionPoints,
      atRiskStudentCount: atRiskCount,
    },
  };
}
