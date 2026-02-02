import { StudentSimulation, BloomLevel, RubricCriterion } from './types';

interface StudentPersona {
  name: string;
  type: 'advanced' | 'proficient' | 'developing' | 'struggling';
  readingLevel: number; // 0.5x to 2x
  bloomComfortMax: BloomLevel;
  concentrationMinutes: number;
}

const STUDENT_PERSONAS: StudentPersona[] = [
  {
    name: 'Advanced Learner (Aisha)',
    type: 'advanced',
    readingLevel: 1.5,
    bloomComfortMax: 'Create',
    concentrationMinutes: 90,
  },
  {
    name: 'Proficient Learner (Jordan)',
    type: 'proficient',
    readingLevel: 1.0,
    bloomComfortMax: 'Analyze',
    concentrationMinutes: 60,
  },
  {
    name: 'Developing Learner (Mei)',
    type: 'developing',
    readingLevel: 0.7,
    bloomComfortMax: 'Apply',
    concentrationMinutes: 45,
  },
  {
    name: 'Struggling Learner (Carlos)',
    type: 'struggling',
    readingLevel: 0.5,
    bloomComfortMax: 'Understand',
    concentrationMinutes: 30,
  },
];

const BLOOM_COMFORT_MAP: Record<BloomLevel, number> = {
  Remember: 95,
  Understand: 90,
  Apply: 75,
  Analyze: 60,
  Evaluate: 45,
  Create: 30,
};

/**
 * Simulate student performance on an assignment
 */
export function simulateStudentPerformance(
  assignmentContent: string,
  estimatedTimeMinutes: number,
  bloomDistribution: Record<BloomLevel, number>,
  rubric?: RubricCriterion[],
  numTasks: number = 5
): StudentSimulation[] {
  return STUDENT_PERSONAS.map((persona, idx) => {
    const simulation = simulateSingleStudent(
      persona,
      assignmentContent,
      estimatedTimeMinutes,
      bloomDistribution,
      rubric,
      numTasks
    );
    simulation.id = `student-${idx + 1}`;
    return simulation;
  });
}

function simulateSingleStudent(
  persona: StudentPersona,
  content: string,
  estimatedTime: number,
  bloomDistribution: Record<BloomLevel, number>,
  rubric?: RubricCriterion[],
  numTasks: number = 5
): StudentSimulation {
  // Adjust time based on reading level
  const adjustedTime = estimatedTime * persona.readingLevel;

  // Determine if student completes assignment
  const canCompleteInTime = adjustedTime < persona.concentrationMinutes;

  // Calculate understood vs struggled tasks
  const understood: string[] = [];
  const struggledWith: string[] = [];
  const confusionPoints: string[] = [];

  let completedTasks = 0;

  // Simulate task-by-task progress
  Object.entries(bloomDistribution).forEach(([level, count]) => {
    const bloomLevel = level as BloomLevel;
    const comfortLevel = BLOOM_COMFORT_MAP[bloomLevel];

    // Adjust comfort based on persona
    const personaComfortBonus = getPersonaBloomBonus(persona, bloomLevel);
    const adjustedComfort = Math.max(0, comfortLevel + personaComfortBonus);

    for (let i = 0; i < (count || 0); i++) {
      const taskId = `task-${completedTasks + 1}`;
      const taskName = `${bloomLevel} Level Task ${completedTasks + 1}`;

      if (adjustedComfort > 70) {
        understood.push(taskName);
      } else if (adjustedComfort > 40) {
        struggledWith.push(taskName);
        if (Math.random() > 0.5) {
          confusionPoints.push(`Confusion with ${bloomLevel} thinking: ${taskName}`);
        }
      } else {
        struggledWith.push(taskName);
        confusionPoints.push(`Could not complete ${bloomLevel} task: ${taskName}`);
      }

      completedTasks++;
      
      // Check if student runs out of time
      if (!canCompleteInTime && adjustedTime < persona.concentrationMinutes * 0.7) {
        break;
      }
    }

    if (!canCompleteInTime) {
      return; // exit loop early
    }
  });

  // Determine grade
  const grade = calculateGrade(persona.type, understood.length, struggledWith.length, numTasks);
  const estimatedScore = calculateScore(persona.type, understood.length, struggledWith.length, rubric);

  // Determine if student checks out
  const checkoutRisk = getCheckoutRisk(persona.type, struggledWith.length, confusionPoints.length);
  const checkedOut = Math.random() < checkoutRisk;

  return {
    id: '', // set by caller
    persona: persona.name,
    timeToCompleteMinutes: Math.ceil(adjustedTime),
    understood,
    struggledWith,
    confusionPoints,
    estimatedGrade: grade,
    estimatedScore,
    checkedOutAt: checkedOut ? `After ${struggledWith.length} tasks` : undefined,
    completedAt: canCompleteInTime ? 'On time' : 'Extended time needed',
    dropoffReason: checkedOut ? `Too many ${persona.bloomComfortMax}-level tasks` : undefined,
  };
}

/**
 * Get comfort bonus/penalty for persona's Bloom level strength
 */
function getPersonaBloomBonus(persona: StudentPersona, bloomLevel: BloomLevel): number {
  const bloomOrder = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const personaMaxIdx = bloomOrder.indexOf(persona.bloomComfortMax);
  const taskIdx = bloomOrder.indexOf(bloomLevel);

  if (taskIdx <= personaMaxIdx) {
    return 15; // comfortable
  } else if (taskIdx === personaMaxIdx + 1) {
    return -10; // slightly challenging
  } else if (taskIdx === personaMaxIdx + 2) {
    return -25; // very challenging
  } else {
    return -40; // far beyond comfort
  }
}

/**
 * Calculate risk of student checking out
 */
function getCheckoutRisk(type: 'advanced' | 'proficient' | 'developing' | 'struggling', struggledCount: number, confusionCount: number): number {
  const baseRisk: Record<string, number> = {
    advanced: 0.05,
    proficient: 0.15,
    developing: 0.35,
    struggling: 0.60,
  };

  let risk = baseRisk[type] || 0.2;

  // Increase risk based on struggles
  risk += struggledCount * 0.1;
  risk += confusionCount * 0.15;

  return Math.min(risk, 0.95); // cap at 95%
}

/**
 * Calculate estimated grade
 */
function calculateGrade(
  type: 'advanced' | 'proficient' | 'developing' | 'struggling',
  understoodCount: number,
  struggledCount: number,
  totalTasks: number
): string {
  const successRate = understoodCount / (understoodCount + struggledCount || 1);

  if (successRate >= 0.9) return 'A';
  if (successRate >= 0.8) return 'B+';
  if (successRate >= 0.7) return 'B';
  if (successRate >= 0.6) return 'C+';
  if (successRate >= 0.5) return 'C';
  if (successRate >= 0.4) return 'D';
  return 'F';
}

/**
 * Calculate estimated numeric score out of 100
 */
function calculateScore(
  type: 'advanced' | 'proficient' | 'developing' | 'struggling',
  understoodCount: number,
  struggledCount: number,
  rubric?: RubricCriterion[]
): number {
  const baseScore: Record<string, number> = {
    advanced: 95,
    proficient: 85,
    developing: 72,
    struggling: 60,
  };

  let score = baseScore[type] || 75;

  // Adjust based on performance
  const completedTasks = understoodCount + struggledCount;
  if (completedTasks > 0) {
    const taskSuccessRate = understoodCount / completedTasks;
    const adjustment = (taskSuccessRate - 0.7) * 20; // ±20 points
    score += adjustment;
  }

  // Adjust based on rubric difficulty
  if (rubric) {
    const avgPointValue = rubric.reduce((sum, c) => sum + c.maxPoints, 0) / rubric.length;
    if (avgPointValue > 10) score -= 5; // harder rubric
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}
