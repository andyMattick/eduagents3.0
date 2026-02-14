/**
 * Autonomous Problem Refinement
 * 
 * After Writer generates a problem, this service:
 * 1. Searches Problem Bank for similar problems that failed
 * 2. Extracts lessons learned (what caused confusion/low engagement)
 * 3. Calls Writer again to refine the problem
 * 
 * Teachers never see this - it's an internal feedback loop for autonomous improvement.
 */

import { UniversalProblem } from '../../types/universalPayloads';
import { SimilarProblemResult, ProblemBankEntry } from '../../types/problemBank';

/**
 * Find similar problems in Problem Bank that have poor success metrics
 * 
 * "Similar" means:
 * - Same subject
 * - Same or adjacent Bloom level
 * - Overlapping keywords/topics
 */
export function findSimilarUnsuccessfulProblems(
  generatedProblem: UniversalProblem,
  problemBankEntries: ProblemBankEntry[],
  teacherId: string
): SimilarProblemResult[] {
  if (!problemBankEntries.length) return [];

  const results: SimilarProblemResult[] = [];

  // Extract features of generated problem for comparison
  const genBloom = generatedProblem.cognitive?.bloomLevel?.toLowerCase() || '';
  const genSubject = generatedProblem.classification?.topics?.[0]?.toLowerCase() || '';
  const genKeywords = extractKeywords(generatedProblem.content);

  // Score each Problem Bank entry by similarity
  for (const entry of problemBankEntries) {
    // Skip entries that don't have success metrics
    if (!entry.successMetrics) continue;

    // Skip if success rate is high (not unsuccessful)
    if (entry.successMetrics.averageSuccessRate > 0.7) continue;

    const entryBloom = entry.problem.cognitive?.bloomLevel?.toLowerCase() || '';
    const entrySubject = entry.problem.classification?.topics?.[0]?.toLowerCase() || '';
    const entryKeywords = extractKeywords(entry.problem.content);

    // Calculate similarity score
    let similarity = 0;
    let reasons: string[] = [];

    // Subject match (high weight)
    if (genSubject && entrySubject && genSubject === entrySubject) {
      similarity += 0.3;
      reasons.push('Same subject');
    }

    // Bloom level match or adjacent level (medium weight)
    const bloomDist = bloomDistance(genBloom, entryBloom);
    if (bloomDist <= 1) {
      similarity += 0.25 - bloomDist * 0.05;
      reasons.push(`Similar cognitive level (${genBloom})`);
    }

    // Keyword overlap (medium weight)
    const keywordOverlap = computeKeywordSimilarity(genKeywords, entryKeywords);
    similarity += keywordOverlap * 0.25;
    if (keywordOverlap > 0.3) {
      reasons.push(`Overlapping topics (${keywordOverlap.toFixed(0)}% match)`);
    }

    // Penalize if unsuccessful due to other reasons (optional)
    if (entry.successMetrics.flaggedAsProblematic) {
      similarity += 0.2; // Boost if explicitly marked problematic
      reasons.push('Marked as problematic');
    }

    if (similarity > 0.4) {
      results.push({
        entryId: entry.id,
        problem: entry.problem,
        similarity,
        successMetrics: entry.successMetrics,
        reason: reasons.join('; '),
      });
    }
  }

  // Sort by similarity descending
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 3); // Top 3 most similar
}

/**
 * Extract learning points from unsuccessful similar problems
 */
export function extractLearningPoints(similarProblems: SimilarProblemResult[]): string[] {
  const learnings: string[] = [];

  for (const similar of similarProblems) {
    if (!similar.successMetrics) continue;

    const metrics = similar.successMetrics;

    // High confusion → problem wording is unclear
    if (metrics.averageConfusionSignals > 2) {
      learnings.push(
        `Avoid confusing wording like "${extractPhrase(similar.problem.content, 20)}" - ` +
        `it caused high confusion in similar problems. Simplify language and provide clarity.`
      );
    }

    // Low engagement → problem is boring or disconnected
    if (metrics.averageEngagementScore < 0.5) {
      learnings.push(
        `Create more engaging problems - similar problems with this topic had low student engagement. ` +
        `Add context, relatable examples, or interesting scenario.`
      );
    }

    // Low success → problem is too hard or misleading
    if (metrics.averageSuccessRate < 0.3) {
      learnings.push(
        `Problem is too difficult or misleading. Similar problems had <30% success rate. ` +
        `Provide scaffolding, hints, or break into smaller steps.`
      );
    }

    // Expert suggested improvements
    if (metrics.suggestedImprovements?.length) {
      learnings.push(
        `Previous teacher feedback: ${metrics.suggestedImprovements.slice(0, 2).join('; ')}`
      );
    }
  }

  return [...new Set(learnings)]; // Deduplicate
}

/**
 * Build a refinement prompt for Gemini
 * Tells LLM: "This problem is good, but similar ones failed because X. Adjust to avoid Y."
 */
export function buildRefinementPrompt(
  generatedProblemText: string,
  bloomLevel: string,
  subject: string,
  learningsFromSimilar: string[]
): string {
  const refinementContext =
    learningsFromSimilar.length > 0
      ? `LESSONS FROM SIMILAR PROBLEMS THAT PERFORMED POORLY:\n${learningsFromSimilar
          .map((l, i) => `${i + 1}. ${l}`)
          .join('\n')}\n\nREFINE THE PROBLEM TO AVOID THESE ISSUES while maintaining ${bloomLevel} level.`
      : '';

  return `You are a problem refinement expert. The Writer has generated a problem for ${subject} at Bloom's level ${bloomLevel}.

${refinementContext || '(No similar problems to learn from yet)'}

ORIGINAL PROBLEM:
${generatedProblemText}

YOUR TASK:
1. Keep the core concept and Bloom's level (${bloomLevel})
2. If refinement context given: Address EACH issue mentioned
3. Improve clarity, engagement, or scaffolding WITHOUT changing difficulty
4. Return ONLY the refined problem text, no explanation

Return the refined problem:`;
}

/**
 * Extract keywords from problem text for similarity matching
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction: split on spaces, remove common words
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'been',
    'be',
    'have',
    'has',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'must',
    'and',
    'or',
    'but',
    'not',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'if',
    'that',
    'this',
    'these',
    'those',
  ]);

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4 && !commonWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

/**
 * Compute keyword similarity between two problem texts
 * Returns 0-1 score
 */
function computeKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (!keywords1.length || !keywords2.length) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = [...set1].filter(k => set2.has(k)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Distance between two Bloom levels (0 = same, 5 = opposites)
 */
function bloomDistance(level1: string, level2: string): number {
  const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const idx1 = levels.indexOf(level1);
  const idx2 = levels.indexOf(level2);

  if (idx1 < 0 || idx2 < 0) return 999; // Invalid level

  return Math.abs(idx1 - idx2);
}

/**
 * Extract a meaningful phrase from problem text (first N words)
 */
function extractPhrase(text: string, maxWords: number): string {
  const words = text.split(/\s+/).slice(0, maxWords);
  return words.join(' ') + (text.split(/\s+/).length > maxWords ? '...' : '');
}

/**
 * Configuration for refinement behavior
 */
export interface RefinementConfig {
  enabled: boolean;
  maxSimilarProblems: number; // How many similar problems to look at (default: 3)
  successThreshold: number; // Only refine if similar problems have success rate below this (default: 0.7)
  minSimilarity: number; // Minimum similarity score to consider (default: 0.4)
}

/**
 * Public API: Main refinement function
 * 
 * Takes a newly generated problem and autonomously improves it
 * based on what failed in similar problems from the Problem Bank
 */
export async function refineGeneratedProblem(
  generatedProblem: UniversalProblem,
  problemBankEntries: ProblemBankEntry[],
  teacherId: string,
  refinementCaller?: (refinementPrompt: string) => Promise<string>,
  config?: Partial<RefinementConfig>
): Promise<UniversalProblem> {
  const settings: RefinementConfig = {
    enabled: true,
    maxSimilarProblems: 3,
    successThreshold: 0.7,
    minSimilarity: 0.4,
    ...config,
  };

  if (!settings.enabled) {
    return generatedProblem; // Return unrefined
  }

  // Find similar problems that were unsuccessful
  const similar = findSimilarUnsuccessfulProblems(
    generatedProblem,
    problemBankEntries,
    teacherId
  ).slice(0, settings.maxSimilarProblems);

  if (!similar.length) {
    // No learning opportunities found
    console.log('[ProblemRefinement] No unsuccessful similar problems found - using original');
    return generatedProblem;
  }

  console.log('[ProblemRefinement] Found', similar.length, 'unsuccessful similar problems');

  // Extract learning points
  const learnings = extractLearningPoints(similar);

  if (!learnings.length) {
    console.log('[ProblemRefinement] No learnings extracted - using original');
    return generatedProblem;
  }

  // Build refinement prompt
  const refinementPrompt = buildRefinementPrompt(
    generatedProblem.content,
    generatedProblem.cognitive?.bloomLevel || 'Unknown',
    generatedProblem.classification?.topics?.[0] || 'Unknown',
    learnings
  );

  console.log('[ProblemRefinement] Refining problem based on:', learnings.length, 'lessons');

  // Call Gemini to refine (if caller provided)
  let refinedContent = generatedProblem.content;
  if (refinementCaller) {
    try {
      refinedContent = await refinementCaller(refinementPrompt);
      console.log('[ProblemRefinement] Successfully refined problem');
    } catch (error) {
      console.warn('[ProblemRefinement] Refinement failed, using original:', error);
    }
  }

  // Return problem with refined content
  return {
    ...generatedProblem,
    content: refinedContent,
    // Mark that this was autonomously refined
    notes: (generatedProblem.notes || '') + `\n[AUTO-REFINED based on ${similar.length} similar problems]`,
  };
}
