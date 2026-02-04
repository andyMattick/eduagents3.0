/**
 * Pipeline Integration: Orchestrates Asteroid/Astronaut/Simulation system
 * Bridges the new type system with the existing React pipeline
 */

import { Asteroid, Astronaut, AssignmentSimulationResults } from '../types/simulation';
import { StudentFeedback, Tag } from '../types/pipeline';
import { generateAsteroids, recalculateNoveltyScores } from './analysis/asteroidGenerator';
import { getAllAstronauts, getAccessibilityProfileAstronauts } from './simulation/astronautGenerator';
import { runAssignmentSimulation } from './simulation/simulationEngine';

/**
 * Phase 1: Extract Asteroids from assignment text
 */
export function extractAsteroidsFromText(
  assignmentText: string,
  subject?: string,
): Asteroid[] {
  const asteroids = generateAsteroids(assignmentText, subject);
  return recalculateNoveltyScores(asteroids);
}

/**
 * Phase 2: Select Astronauts based on profile filters
 */
export function selectAstronauts(options?: {
  includeAccessibilityProfiles?: boolean;
  includeStandardLearners?: boolean;
  customAstronauts?: Astronaut[];
}): Astronaut[] {
  const {
    includeAccessibilityProfiles = true,
    includeStandardLearners = true,
    customAstronauts = [],
  } = options || {};

  let astronauts: Astronaut[] = [];

  if (includeAccessibilityProfiles) {
    astronauts.push(...getAccessibilityProfileAstronauts());
  }

  if (includeStandardLearners) {
    // Get standard learners by filtering out accessibility profiles
    const allAstronauts = getAllAstronauts();
    const standardLearners = allAstronauts.filter(a => !a.IsAccessibilityProfile);
    astronauts.push(...standardLearners);
  }

  if (customAstronauts.length > 0) {
    astronauts.push(...customAstronauts);
  }

  // Remove duplicates
  const seen = new Set<string>();
  return astronauts.filter(a => {
    if (seen.has(a.StudentId)) return false;
    seen.add(a.StudentId);
    return true;
  });
}

/**
 * Phase 3: Run simulation engine
 */
export function simulateAssignment(
  asteroids: Asteroid[],
  astronauts: Astronaut[],
  assignmentId?: string,
): AssignmentSimulationResults {
  if (asteroids.length === 0 || astronauts.length === 0) {
    throw new Error('Cannot simulate: need at least one asteroid and one astronaut');
  }
  return runAssignmentSimulation(asteroids, astronauts, assignmentId);
}

/**
 * Convert simulation results to StudentFeedback array (for compatibility with existing pipeline)
 */
export function convertSimulationToFeedback(
  results: AssignmentSimulationResults,
): StudentFeedback[] {
  const feedback: StudentFeedback[] = [];

  for (const studentResult of results.studentResults) {
    feedback.push({
      studentPersona: studentResult.personaName,
      feedbackType: 'suggestion',
      content: `${studentResult.personaName} estimated to score ${studentResult.estimatedGrade} (${studentResult.estimatedScore}%)`,
      timeToCompleteMinutes: studentResult.totalTimeMinutes,
      understoodConcepts: [],
      struggledWith: [],
      estimatedGrade: studentResult.estimatedGrade,
      atRiskProfile: studentResult.atRisk,
      atRiskFactors: studentResult.riskFactors,
      engagementScore: studentResult.engagement.final,
    });
  }

  return feedback;
}

/**
 * End-to-end pipeline: Text → Asteroids → Simulation → Feedback
 */
export async function runFullSimulationPipeline(
  assignmentText: string,
  options?: {
    subject?: string;
    gradeLevel?: string;
    includeAccessibilityProfiles?: boolean;
    includeStandardLearners?: boolean;
  },
): Promise<{
  asteroids: Asteroid[];
  astronauts: Astronaut[];
  simulationResults: AssignmentSimulationResults;
  studentFeedback: StudentFeedback[];
}> {
  // Phase 1: Extract asteroids
  const asteroids = extractAsteroidsFromText(assignmentText, options?.subject);

  // Phase 2: Select astronauts
  const astronauts = selectAstronauts({
    includeAccessibilityProfiles: options?.includeAccessibilityProfiles !== false,
    includeStandardLearners: options?.includeStandardLearners !== false,
  });

  // Phase 3: Simulate
  const simulationResults = simulateAssignment(asteroids, astronauts);

  // Convert to feedback format
  const studentFeedback = convertSimulationToFeedback(simulationResults);

  return {
    asteroids,
    astronauts,
    simulationResults,
    studentFeedback,
  };
}
