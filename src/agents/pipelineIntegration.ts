/**
 * Pipeline Integration: Orchestrates Asteroid/Astronaut/Simulation system
 * Bridges the new type system with the existing React pipeline
 */

import { Asteroid, Astronaut, AssignmentSimulationResults } from '../types/simulation';
import { StudentFeedback, Tag } from '../types/pipeline';
import { generateAsteroids, recalculateNoveltyScores } from './analysis/asteroidGenerator';
import { getAllAstronauts, getAccessibilityProfileAstronauts } from './simulation/astronautGenerator';
import { runAssignmentSimulation } from './simulation/simulationEngine';
import { applyOverlaysStrategically, debugOverlayAssignment } from './simulation/overlayStrategy';

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
 * NOTE: This function is no longer used in Phase 1 (Space Camp handles astronaut generation on backend).
 * Kept for reference and future compatibility.
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
 * Phase 2b: Apply strategic overlays to astronauts based on problem characteristics
 * 
 * CRITICAL WORKFLOW (Phase 4):
 * - Astronauts are generated with EMPTY Overlays arrays
 * - This function analyzes problem characteristics (Bloom levels, complexity, time)
 * - Assigns overlays DETERMINISTICALLY based on 6 strategic rules
 * - Same problems → same overlays for same astronaut (reproducible)
 */
export function applyStrategicOverlaysToAstronauts(
  asteroids: Asteroid[],
  astronauts: Astronaut[],
  options?: {
    debug?: boolean; // If true, log overlay assignment reasoning
  }
): Astronaut[] {
  if (asteroids.length === 0) {
    // No problems to analyze; return astronauts unchanged
    return astronauts;
  }

  // Convert asteroids to problem characteristics for overlay strategy
  const problemCharacteristics = asteroids.map(ast => ({
    BloomLevel: ast.BloomLevel,
    LinguisticComplexity: ast.LinguisticComplexity,
    EstimatedTimeMinutes: ast.EstimatedTimeMinutes,
    SequenceIndex: asteroids.indexOf(ast),
  }));

  // Apply overlays strategically
  const astronautsWithOverlays = applyOverlaysStrategically(astronauts, problemCharacteristics);

  // If debugging enabled, log the assignment reasoning
  if (options?.debug) {
    const debugInfo = debugOverlayAssignment(astronauts, problemCharacteristics);
    console.log('[Phase 4: Strategic Overlay Assignment]', debugInfo);
  }

  return astronautsWithOverlays;
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
 * NOTE: This function is deprecated in Phase 1 (Space Camp handles simulation on backend).
 * Kept for reference and demo purposes only.
 */
export async function runFullSimulationPipeline(
  assignmentText: string,
  options?: {
    subject?: string;
    gradeLevel?: string;
    includeAccessibilityProfiles?: boolean;
    includeStandardLearners?: boolean;
    debug?: boolean; // Enable overlay assignment debugging
  },
): Promise<{
  asteroids: Asteroid[];
  astronauts: Astronaut[];
  simulationResults: AssignmentSimulationResults;
  studentFeedback: StudentFeedback[];
}> {
  // PHASE 1 NOTE: This pipeline is no longer used in the main React pipeline.
  // Space Camp (backend) now handles astronaut selection and simulation.
  // This function kept for reference and demo work (demoRunner.ts).
  
  // Phase 1: Extract asteroids
  const asteroids = extractAsteroidsFromText(assignmentText, options?.subject);

  // Phase 2: Select astronauts (deprecated - Space Camp does this)
  let astronauts = selectAstronauts({
    includeAccessibilityProfiles: options?.includeAccessibilityProfiles !== false,
    includeStandardLearners: options?.includeStandardLearners !== false,
  });

  // Phase 2b (NEW - Phase 4): Apply strategic overlays based on problem characteristics
  // This applies overlays DETERMINISTICALLY based on asteroid field analysis
  astronauts = applyStrategicOverlaysToAstronauts(asteroids, astronauts, {
    debug: options?.debug === true,
  });

  // Phase 3: Simulate (deprecated - Space Camp does this)
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
