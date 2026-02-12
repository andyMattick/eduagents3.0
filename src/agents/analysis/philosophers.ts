/**
 * Philosopher Interpreter
 *
 * Orchestrates Space Camp Philosopher API calls and attaches generated visualizations
 * to the returned feedback. The Philosopher returns only rankedFeedback; visualizations
 * are generated locally by your system.
 *
 * Key Principle: Philosopher never generates visuals—your system does.
 */

import {
  generateClusterHeatMap,
  generateBloomComplexityScatter,
  generateConfusionDensityMap,
  generateFatigueCurve,
  generateTopicRadarChart,
  generateSectionRiskMatrix,
} from '../analytics/visualizations';

import {
  FeedbackItem,
  VisualizationBundle,
  TeacherFeedbackOptions,
} from '../types/pipeline';

/**
 * Payload sent to the Philosopher (Space Camp)
 */
export interface PhilosopherPayload {
  assignmentText: string;
  problems: any[]; // UniversalProblem[]
  studentSimulations: any[]; // StudentSimulation[]
  documentMetadata: {
    gradeLevel?: string;
    subject?: string;
    difficulty?: string;
  };
  teacherNotes?: string;
  processingOptions?: {
    focusAreas?: string[];
    iterationNumber?: number;
  };
}

/**
 * Philosopher response (what comes back from Space Camp)
 */
export interface PhilosopherResponse {
  rankedFeedback: FeedbackItem[];
  analysisContent?: string;
  recommendations?: string[];
}

// Store the last payload for debugging/verification
let lastPhilosopherPayload: PhilosopherPayload | null = null;

/**
 * Get the last Philosopher payload (for debugging)
 */
export function getLastPhilosopherPayload(): PhilosopherPayload | null {
  return lastPhilosopherPayload;
}

/**
 * Call the Philosopher endpoint at Space Camp and attach visualizations
 *
 * @param payload - Configuration for the Philosopher
 * @returns Complete feedback bundle with visualizations
 */
export async function callPhilosopherWithVisualizations(
  payload: PhilosopherPayload
): Promise<TeacherFeedbackOptions> {
  try {
    // Store payload for debugging
    lastPhilosopherPayload = {
      ...payload,
      assignmentText: payload.assignmentText.substring(0, 500), // Truncate for storage
    };

    console.log('[Philosopher] Calling Space Camp with payload:', {
      problemsCount: payload.problems?.length || 0,
      simulationsCount: payload.studentSimulations?.length || 0,
      metadata: payload.documentMetadata,
    });

    // Call the Philosopher
    const philosopherResponse = await callPhilosopher(payload);

    console.log('[Philosopher] Received response with', philosopherResponse.rankedFeedback?.length || 0, 'feedback items');

    // Generate visualizations (these are deterministic and always succeed)
    const visualizations = generateVisualizations(
      payload.problems,
      payload.studentSimulations
    );

    console.log('[Philosopher] Generated', Object.keys(visualizations).filter(k => visualizations[k as keyof VisualizationBundle]).length, 'visualizations');

    // Combine feedback and visualizations
    const result: TeacherFeedbackOptions = {
      rankedFeedback: philosopherResponse.rankedFeedback,
      visualizations,
    };

    return result;
  } catch (error) {
    console.error('[Philosopher] Error calling Philosopher:', error);

    // Graceful fallback: return empty feedback with visualizations still generated
    return {
      rankedFeedback: [
        {
          title: 'Analysis Unavailable',
          priority: 'low',
          category: 'clarity',
          description: 'The Philosopher analysis could not be completed at this time.',
          recommendation: 'Please try again or contact support.',
        },
      ],
      visualizations: generateVisualizations(
        payload.problems,
        payload.studentSimulations
      ),
    };
  }
}

/**
 * Internal: Call the actual Philosopher API (Space Camp)
 * This is the interface to the backend service
 *
 * @param payload - Configuration for the Philosopher
 * @returns Raw Philosopher response
 */
async function callPhilosopher(payload: PhilosopherPayload): Promise<PhilosopherResponse> {
  // TODO: Replace with actual API endpoint to Space Camp
  // This is currently a mock implementation

  const mockResponse: PhilosopherResponse = {
    rankedFeedback: [
      {
        title: 'Balance Bloom Levels',
        priority: 'high',
        category: 'coverage',
        description: 'The assignment focuses heavily on "Remember" and "Understand" levels, with limited "Apply" and "Analyze".',
        affectedProblems: payload.problems?.slice(0, 3).map((p: any) => p.id) || [],
        recommendation: 'Rewrite 2-3 problems to increase cognitive demand. Focus on application-level scenarios.',
        estimatedImpact: 'high',
      },
      {
        title: 'Reduce Fatigue in Later Section',
        priority: 'high',
        category: 'pacing',
        description: 'Student personas show sharp fatigue increase in the final 4 problems. This section is both long and difficult.',
        affectedProblems: payload.problems?.slice(-4).map((p: any) => p.id) || [],
        recommendation: 'Break this section into two shorter segments with a checkpoint. Consider simplifying complexity.',
        estimatedImpact: 'high',
      },
      {
        title: 'Clarify Problem 5 Language',
        priority: 'medium',
        category: 'clarity',
        description: 'Problem 5 has high confusion signals among visual learners and lower-reading students.',
        affectedProblems: payload.problems?.[4] ? [payload.problems[4].id] : [],
        recommendation: 'Add concrete examples and break multi-part questions into separate items.',
        estimatedImpact: 'medium',
      },
      {
        title: 'Add Accessibility Variants',
        priority: 'medium',
        category: 'accessibility',
        description: 'Some problems could be formatted more accessibly for ADHD and dyslexic learners.',
        recommendation: 'Provide shortened versions of long problems and use sans-serif fonts in export.',
        estimatedImpact: 'medium',
      },
    ],
  };

  return mockResponse;
}

/**
 * Generate all visualizations from data
 * Internal helper - always succeeds with graceful fallbacks
 *
 * @param problems - Array of problems
 * @param simulations - Array of student simulations
 * @returns VisualizationBundle with all charts
 */
function generateVisualizations(problems: any[], simulations: any[]): VisualizationBundle {
  const visualizations: VisualizationBundle = {};

  try {
    visualizations.clusterHeatMap = generateClusterHeatMap(simulations, problems);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate cluster heat map:', e);
  }

  try {
    visualizations.bloomComplexityScatter = generateBloomComplexityScatter(problems);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate Bloom complexity scatter:', e);
  }

  try {
    visualizations.confusionDensityMap = generateConfusionDensityMap(simulations);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate confusion density map:', e);
  }

  try {
    visualizations.fatigueCurve = generateFatigueCurve(simulations);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate fatigue curve:', e);
  }

  try {
    visualizations.topicRadarChart = generateTopicRadarChart(problems);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate topic radar chart:', e);
  }

  try {
    visualizations.sectionRiskMatrix = generateSectionRiskMatrix(simulations, problems);
  } catch (e) {
    console.warn('[Philosopher] Failed to generate section risk matrix:', e);
  }

  return visualizations;
}

/**
 * Type guard: Check if response is valid TeacherFeedbackOptions
 */
export function isValidTeacherFeedbackOptions(value: any): value is TeacherFeedbackOptions {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.rankedFeedback) &&
    value.rankedFeedback.length > 0 &&
    value.rankedFeedback.every((item: any) => {
      return (
        item.title &&
        item.priority &&
        item.category &&
        item.description &&
        item.recommendation
      );
    })
  );
}
