/**
 * Philosopher Interpreter
 *
 * Executes the complete diagnostic simulation engine (v13):
 * - Generates 20 synthetic student personas
 * - Simulates performance across all problems
 * - Detects clusters using statistical thresholds
 * - Computes severity scores mathematically
 * - Generates ranked feedback with evidence
 * - Returns 6 SVG visualizations
 *
 * Fully deterministic, math-driven, production-grade.
 */

import { UniversalProblem } from '../../types/universalPayloads';
import {
  executePhilosopher,
  PhilosopherOutput,
  PhilosopherFeedbackItem,
} from './philosopherEngine';

import {
  FeedbackItem,
  VisualizationBundle,
  TeacherFeedbackOptions,
} from '../types/pipeline';

/**
 * Payload sent to the Philosopher
 */
export interface PhilosopherPayload {
  problems: UniversalProblem[];
  generationContext: {
    subject: string;
    gradeBand: string;
    timeTargetMinutes: number;
  };
}

/**
 * Philosopher response (fully deterministic from our engine)
 */
export interface PhilosopherResponse extends PhilosopherOutput {
  // Extends the engine output directly
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
 * Call the Philosopher diagnostic engine
 * 
 * Executes the full v13 specification:
 * 1. Generates 20 synthetic students
 * 2. Simulates problem performance for each
 * 3. Aggregates metrics
 * 4. Derives dynamic thresholds (μ ± σ)
 * 5. Detects clusters
 * 6. Computes severity scores
 * 7. Generates ranked feedback
 * 8. Returns 6 SVG visualizations
 *
 * @param payload - Configuration (problems + generation context)
 * @returns Complete feedback bundle with visualizations
 */
export async function callPhilosopherWithVisualizations(
  payload: PhilosopherPayload
): Promise<TeacherFeedbackOptions> {
  try {
    // Store payload for debugging
    lastPhilosopherPayload = { ...payload };

    console.log('[Philosopher] Executing diagnostic engine v13', {
      problemsCount: payload.problems?.length || 0,
      subject: payload.generationContext?.subject,
      gradeBand: payload.generationContext?.gradeBand,
    });

    // Execute the full engine
    const result = await executePhilosopher(
      payload.problems,
      payload.generationContext
    );

    console.log('[Philosopher] Engine complete:', {
      feedbackItems: result.rankedFeedback.length,
      clusters: result.metadata?.clusterCount,
      predictedTime: result.metadata?.predictedTotalTime,
      riskLevel: result.metadata?.overallRiskLevel,
    });

    // Convert engine feedback to pipeline FeedbackItem format
    const convertedFeedback: FeedbackItem[] = result.rankedFeedback.map(
      (item: PhilosopherFeedbackItem, idx: number) => ({
        id: `feedback_${idx}`,
        title: categoryToTitle(item.category),
        priority: item.priority,
        category: categoryMap(item.category),
        description: item.evidence,
        affectedProblems: payload.problems
          .filter((_, i) => item.affectedProblems.includes(i))
          .map((p) => p.problemId),
        recommendation: item.recommendation,
        estimatedImpact: item.priority === 'high' ? 'high' : item.priority === 'medium' ? 'medium' : 'low',
      })
    );

    // Return in standard TeacherFeedbackOptions format
    const output: TeacherFeedbackOptions = {
      rankedFeedback: convertedFeedback,
      visualizations: {
        clusterHeatMap: result.visualizations.confusionHeatmapSVG,
        bloomComplexityScatter: result.visualizations.bloomMismatchChartSVG,
        confusionDensityMap: result.visualizations.confusionHeatmapSVG,
        fatigueCurve: result.visualizations.fatigueCurveSVG,
        topicRadarChart: result.visualizations.pacingChartSVG,
        sectionRiskMatrix: result.visualizations.successDistributionSVG,
      },
    };

    return output;
  } catch (error) {
    console.error('[Philosopher] Error executing engine:', error);

    // Graceful fallback
    return {
      rankedFeedback: [
        {
          title: 'Analysis Incomplete',
          priority: 'low',
          category: 'clarity',
          description: 'The Philosopher diagnostic could not be completed.',
          recommendation: 'Please review assignment and try again.',
          estimatedImpact: 'low',
        },
      ],
      visualizations: {
        clusterHeatMap: generateErrorSVG('Confusion Heatmap'),
        bloomComplexityScatter: generateErrorSVG('Bloom Analysis'),
        confusionDensityMap: generateErrorSVG('Confusion Density'),
        fatigueCurve: generateErrorSVG('Fatigue Curve'),
        topicRadarChart: generateErrorSVG('Topic Coverage'),
        sectionRiskMatrix: generateErrorSVG('Risk Matrix'),
      },
    };
  }
}

/**
 * Helper: Convert engine feedback category to pipeline category
 */
function categoryMap(
  category: 'confusion' | 'engagement' | 'time' | 'clarity' | 'alignment'
): 'clarity' | 'engagement' | 'accessibility' | 'difficulty' | 'pacing' | 'coverage' {
  const map: {
    [key in 'confusion' | 'engagement' | 'time' | 'clarity' | 'alignment']: 'clarity' | 'engagement' | 'accessibility' | 'difficulty' | 'pacing' | 'coverage';
  } = {
    confusion: 'clarity',
    engagement: 'pacing',
    time: 'difficulty',
    clarity: 'clarity',
    alignment: 'coverage',
  };
  return map[category];
}

/**
 * Helper: Convert category to friendly title
 */
function categoryToTitle(
  category: 'confusion' | 'engagement' | 'time' | 'clarity' | 'alignment'
): string {
  const titles: {
    [key in 'confusion' | 'engagement' | 'time' | 'clarity' | 'alignment']: string;
  } = {
    confusion: 'Student Confusion Detected',
    engagement: 'Fatigue and Disengagement',
    time: 'Time Misalignment',
    clarity: 'Clarity Issues',
    alignment: 'Bloom Level Alignment',
  };
  return titles[category];
}

/**
 * Generate error SVG for fallback
 */
function generateErrorSVG(title: string): string {
  return `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="#f3f4f6" stroke="#ccc"/>
      <text x="200" y="100" text-anchor="middle" font-size="16" fill="#666">${title}</text>
      <text x="200" y="130" text-anchor="middle" font-size="12" fill="#999">Analysis unavailable</text>
    </svg>
  `;
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
        item.recommendation
      );
    })
  );
}
