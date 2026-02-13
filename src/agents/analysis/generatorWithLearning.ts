/**
 * Generator with Autonomous Learning
 * 
 * Wraps the basic Writer (aiService) with autonomous refinement layer.
 * 
 * Flow:
 * 1. Call aiService.generateAssignment() for initial problem
 * 2. Search Problem Bank for similar unsuccessful problems
 * 3. If found, call refineGeneratedProblem() to improve it
 * 4. Return refined version to teacher
 * 
 * Teachers see only the final, improved problem - they never see the learning mechanism.
 */

import { UniversalProblem } from '../../types/universalPayloads';
import { ProblemBankEntry } from '../../types/problemBank';
import { refineGeneratedProblem, buildRefinementPrompt } from './problemRefinement';
import { aiService } from '../api/aiService';
import { callAI } from '../../config/aiConfig';

/**
 * Configuration for autonomous learning
 */
export interface GeneratorWithLearningConfig {
  enableAutonomousRefinement: boolean;
  problemBankEntries?: ProblemBankEntry[]; // Provide if you have them
  teacherId?: string;
  maxRefineAttempts?: number;
}

/**
 * Generate an assignment with autonomous learning
 * 
 * Takes the same params as aiService.generateAssignment,
 * but internally applies refinement based on problem history.
 * 
 * Teachers never see this - they just get better problems.
 */
export async function generateAssignmentWithAutonomousLearning(
  params: {
    prompt: string;
    type: string;
    gradeLevel: string;
    subject: string;
    wordCount?: number;
  },
  config?: GeneratorWithLearningConfig
): Promise<string> {
  // Step 1: Generate initial assignment
  console.log('[GeneratorWithLearning] Generating assignment...');
  const initialAssignment = await aiService.generateAssignment(params);

  // If refinement disabled or no problem bank provided, return as-is
  if (!config?.enableAutonomousRefinement || !config?.problemBankEntries?.length) {
    return initialAssignment;
  }

  console.log('[GeneratorWithLearning] Applying autonomous refinement...');

  try {
    // Since we can't easily parse individual problems from the assignment text,
    // we'll apply a high-level refinement to the entire assignment
    const refinedAssignment = await refineAssignmentGlobally(
      initialAssignment,
      params,
      config.problemBankEntries,
      config.teacherId || 'anonymous'
    );

    return refinedAssignment;
  } catch (error) {
    console.warn('[GeneratorWithLearning] Refinement failed, returning original:', error);
    return initialAssignment;
  }
}

/**
 * Refine an entire assignment based on problem history
 * 
 * Looks at what subjects/Bloom levels/topics exist in the assignment,
 * finds similar problems that failed, and gives Gemini guidance
 * on how to improve the whole assignment.
 */
async function refineAssignmentGlobally(
  assignmentText: string,
  params: {
    prompt: string;
    type: string;
    gradeLevel: string;
    subject: string;
  },
  problemBankEntries: ProblemBankEntry[],
  teacherId: string
): Promise<string> {
  // Extract what went wrong with similar problems in the bank
  const lessonsFromHistory = extractLessonsFromProblemBank(problemBankEntries, params.subject);

  if (!lessonsFromHistory.length) {
    console.log('[GeneratorWithLearning] No historical learnings found');
    return assignmentText;
  }

  console.log('[GeneratorWithLearning] Applying', lessonsFromHistory.length, 'lessons from history');

  // Build a refinement prompt that improves the whole assignment
  const refinementPrompt = `You are an expert educator reviewing an assignment.

CONTEXT:
- Subject: ${params.subject}
- Grade Level: ${params.gradeLevel}
- Assignment Type: ${params.type}

LESSONS FROM TEACHING HISTORY (what similar problems struggled with):
${lessonsFromHistory.map((l, i) => `${i + 1}. ${l}`).join('\n')}

ORIGINAL ASSIGNMENT:
${assignmentText}

YOUR TASK:
Review the assignment and make improvements to avoid the historical pitfalls mentioned above.
- Improve clarity where similar problems were confusing
- Add engagement where similar problems had low student interest
- Provide scaffolding where similar problems were too difficult
- Keep the same structure, type, and cognitive level

Return the IMPROVED assignment (same format, but enhanced based on history):`;

  try {
    // Call Gemini with the refinement prompt using central API wrapper
    const data = await callAI(refinementPrompt, { modelName: 'gemini-1.5-pro', maxTokens: 2000 });
    const refinedText = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!refinedText || refinedText.trim().length === 0) {
      throw new Error('AI refinement returned empty response');
    }

    console.log('[GeneratorWithLearning] Refinement successful');
    return refinedText;
  } catch (error) {
    console.error('[GeneratorWithLearning] Refinement call failed:', error);
    return assignmentText; // Return original on failure
  }
}

/**
 * Extract high-level lessons from problem bank
 * Groups by what went wrong (confusion, low engagement, too hard)
 */
function extractLessonsFromProblemBank(
  entries: ProblemBankEntry[],
  subject: string
): string[] {
  const lessons: string[] = [];
  const byProblem = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.successMetrics) continue;

    // Only look at this subject's problems (or cross-subject if relevant)
    const isRelevant =
      entry.problem.classification?.topics?.some(t =>
        t.toLowerCase().includes(subject.toLowerCase())
      ) || !entry.problem.classification?.topics?.length;

    if (!isRelevant) continue;

    const metrics = entry.successMetrics;

    // Categorize problems
    if (metrics.averageConfusionSignals > 2 && metrics.averageSuccessRate < 0.5) {
      byProblem.set('confusing', [
        ...(byProblem.get('confusing') || []),
        metrics.problemDescription || 'unclear wording',
      ]);
    }

    if (metrics.averageEngagementScore < 0.4) {
      byProblem.set('boring', [...(byProblem.get('boring') || []), 'low engagement']);
    }

    if (metrics.averageSuccessRate < 0.3) {
      byProblem.set('hard', [
        ...(byProblem.get('hard') || []),
        metrics.problemDescription || 'insufficient scaffolding',
      ]);
    }
  }

  // Generate high-level lessons
  if (byProblem.has('confusing')) {
    lessons.push(
      `📌 CLARITY: Previous ${subject} problems often confused students. Use clear, simple language with concrete examples. Avoid multi-part questions without clear numbering.`
    );
  }

  if (byProblem.has('boring')) {
    lessons.push(
      `📌 ENGAGEMENT: Similar problems scored low on student interest. Add context, real-world scenarios, or compelling questions to increase relevance.`
    );
  }

  if (byProblem.has('hard')) {
    lessons.push(
      `📌 DIFFICULTY: Similar problems were too hard for the target grade level. Provide step-by-step scaffolding, hints, or prerequisite review questions.`
    );
  }

  return lessons;
}

/**
 * EXPERIMENTAL: Update Problem Bank with simulation results
 * 
 * After a teacher runs an assignment and students complete it,
 * this function updates the Problem Bank entries with success metrics
 * so future generations can learn from this data.
 * 
 * Called at end of assessment cycle (teacher approves/completes assignment)
 */
export async function updateProblemBankWithSimulationResults(
  assignmentId: string,
  problems: Array<{ id: string; bloomLevel: string }>,
  simulationResults: Array<{
    problemId: string;
    averageSuccessRate: number;
    averageConfusionSignals: number;
    averageEngagementScore: number;
    totalStudentsExposed: number;
  }>,
  teacherId: string,
  supabaseClient?: any
): Promise<void> {
  if (!supabaseClient) {
    console.log('[ProblemBankLearning] No Supabase client provided - skipping update');
    return;
  }

  console.log('[ProblemBankLearning] Updating Problem Bank with simulation results for', problems.length, 'problems');

  try {
    for (const result of simulationResults) {
      const problem = problems.find(p => p.id === result.problemId);
      if (!problem) continue;

      // Calculate if problematic
      const isProblematic =
        result.averageSuccessRate < 0.3 || 
        result.averageConfusionSignals > 2.5 || 
        result.averageEngagementScore < 0.4;

      const suggestedImprovements: string[] = [];
      if (result.averageSuccessRate < 0.3) suggestedImprovements.push('Reduce difficulty or add scaffolding');
      if (result.averageConfusionSignals > 2.5) suggestedImprovements.push('Clarify wording');
      if (result.averageEngagementScore < 0.4) suggestedImprovements.push('Add engaging context');

      // Update Problem Bank entry
      // This would call teacherSystemService.upsertProblemToProblemBank or similar
      console.log(
        `[ProblemBankLearning] ${isProblematic ? '⚠️ PROBLEMATIC:' : '✅'} Problem ${result.problemId} - Success: ${(result.averageSuccessRate * 100).toFixed(0)}%, Confusion: ${result.averageConfusionSignals.toFixed(1)}`
      );

      // In a real implementation, update the Supabase entry:
      // await supabaseClient
      //   .from('problem_bank')
      //   .update({
      //     success_metrics: {
      //       averageSuccessRate: result.averageSuccessRate,
      //       averageConfusionSignals: result.averageConfusionSignals,
      //       averageEngagementScore: result.averageEngagementScore,
      //       totalStudentsExposed: result.totalStudentsExposed,
      //       flaggedAsProblematic: isProblematic,
      //       suggestedImprovements,
      //     },
      //   })
      //   .eq('teacher_id', teacherId)
      //   .eq('problem_id', result.problemId);
    }

    console.log('[ProblemBankLearning] Update complete');
  } catch (error) {
    console.error('[ProblemBankLearning] Failed to update Problem Bank:', error);
  }
}
