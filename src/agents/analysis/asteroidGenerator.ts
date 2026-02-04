/**
 * Asteroid Generator: Decomposes assignment text into discrete problems
 * Tags each problem with Bloom's taxonomy, complexity, and novelty scores
 */

import { Asteroid } from '../../types/simulation';
import { BloomLevel } from './types';

/**
 * Splits assignment text into discrete problems
 * Looks for common problem markers: numbers, letters, bullet points
 */
function extractProblems(text: string): string[] {
  const lines = text.split(/\n/).filter(line => line.trim());
  const problems: string[] = [];
  let currentProblem = '';

  for (const line of lines) {
    // Check if this line starts a new problem
    const isNewProblem = /^[\d]+[\.\)]\s|^[a-zA-Z][\.\)]\s|^[-•]\s/.test(line.trim());

    if (isNewProblem && currentProblem.trim()) {
      problems.push(currentProblem.trim());
      currentProblem = line;
    } else {
      currentProblem += '\n' + line;
    }
  }

  if (currentProblem.trim()) {
    problems.push(currentProblem.trim());
  }

  // If no obvious delimiter, treat entire text as one problem
  if (problems.length === 0) {
    problems.push(text);
  }

  return problems;
}

/**
 * Classify a problem's Bloom level based on instruction verbs
 */
function classifyBloomLevel(problemText: string): BloomLevel {
  const lowerText = problemText.toLowerCase();

  // Create mapping of verbs to Bloom levels
  const bloomVerbs: Record<BloomLevel, string[]> = {
    Remember: [
      'define',
      'describe',
      'identify',
      'label',
      'list',
      'match',
      'name',
      'recall',
      'recognize',
      'repeat',
      'state',
      'what',
      'when',
      'where',
      'who',
    ],
    Understand: [
      'classify',
      'compare',
      'contrast',
      'demonstrate',
      'discuss',
      'explain',
      'illustrate',
      'interpret',
      'outline',
      'paraphrase',
      'predict',
      'relate',
      'show',
      'summarize',
      'translate',
    ],
    Apply: [
      'apply',
      'change',
      'compute',
      'construct',
      'develop',
      'discover',
      'dramatize',
      'employ',
      'illustrate',
      'modify',
      'operate',
      'practice',
      'produce',
      'solve',
      'use',
    ],
    Analyze: [
      'analyze',
      'appraise',
      'break down',
      'categorize',
      'criticize',
      'debate',
      'detect',
      'diagram',
      'differentiate',
      'distinguish',
      'examine',
      'investigate',
      'question',
      'separate',
      'why',
    ],
    Evaluate: [
      'appraise',
      'argue',
      'assess',
      'critique',
      'defend',
      'evaluate',
      'judge',
      'justify',
      'prioritize',
      'prove',
      'recommend',
      'support',
      'test',
      'validate',
      'verify',
    ],
    Create: [
      'assemble',
      'compose',
      'construct',
      'create',
      'design',
      'develop',
      'formulate',
      'generate',
      'hypothesize',
      'invent',
      'organize',
      'plan',
      'propose',
      'synthesize',
      'write',
    ],
  };

  // Count matches for each level
  const levelScores: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  for (const [level, verbs] of Object.entries(bloomVerbs)) {
    for (const verb of verbs) {
      if (lowerText.includes(verb)) {
        levelScores[level as BloomLevel]++;
      }
    }
  }

  // Return level with highest score
  const sorted = Object.entries(levelScores).sort((a, b) => b[1] - a[1]);
  return (sorted[0][0] as BloomLevel) || 'Remember';
}

/**
 * Calculate linguistic complexity (0.0-1.0)
 * Uses sentence length, word frequency, and technical jargon indicators
 */
function calculateLinguisticComplexity(problemText: string): number {
  const words = problemText.split(/\s+/);
  const wordCount = words.length;
  const sentences = problemText.split(/[.!?]+/).filter(s => s.trim());
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(wordCount, 1);
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1);

  // Technical jargon detection
  const technicalTerms = [
    'algorithm',
    'derivative',
    'photosynthesis',
    'catalyst',
    'hypothesis',
    'theorem',
    'coefficient',
    'paradigm',
  ];
  const jargonCount = technicalTerms.filter(term =>
    problemText.toLowerCase().includes(term),
  ).length;

  // Flesch-Kincaid simplified scoring (0.0-1.0)
  // Longer words = higher complexity
  const wordLengthFactor = Math.min(avgWordLength / 8, 1); // max 8 letters
  // Longer sentences = higher complexity
  const sentenceLengthFactor = Math.min(avgSentenceLength / 20, 1); // max 20 words
  // Jargon = higher complexity
  const jargonFactor = Math.min(jargonCount / 5, 1); // max 5 technical terms

  return Math.min(1.0, (wordLengthFactor * 0.4 + sentenceLengthFactor * 0.4 + jargonFactor * 0.2));
}

/**
 * Calculate cosine similarity between two texts
 * Returns value 0.0-1.0
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Generate Asteroids (tagged problems) from assignment text
 */
export function generateAsteroids(assignmentText: string, subject?: string): Asteroid[] {
  const problemTexts = extractProblems(assignmentText);
  const asteroids: Asteroid[] = [];

  for (let i = 0; i < problemTexts.length; i++) {
    const problemText = problemTexts[i];
    const problemLength = problemText.split(/\s+/).length;

    // Calculate similarity to previous problem
    let similarityToPrevious = 0;
    if (i > 0) {
      similarityToPrevious = calculateSimilarity(problemText, problemTexts[i - 1]);
    }

    const asteroid: Asteroid = {
      ProblemId: `asteroid_${i + 1}`,
      ProblemText: problemText,
      ProblemLength: problemLength,
      MultiPart: /[a-z]\)|\(i\)|\(ii\)/.test(problemText), // Detect subparts
      BloomLevel: classifyBloomLevel(problemText),
      LinguisticComplexity: calculateLinguisticComplexity(problemText),
      SimilarityToPrevious: similarityToPrevious,
      NoveltyScore: 1 - similarityToPrevious,
      SequenceIndex: i + 1,
      Subject: subject,
      TestType: 'free_response', // Default; can be refined later
    };

    asteroids.push(asteroid);
  }

  return asteroids;
}

/**
 * Recalculate novelty scores based on all problems
 * Updates NoveltyScore to be average dissimilarity from all other problems
 */
export function recalculateNoveltyScores(asteroids: Asteroid[]): Asteroid[] {
  return asteroids.map((asteroid, index) => {
    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < asteroids.length; i++) {
      if (i !== index) {
        const similarity = calculateSimilarity(asteroid.ProblemText, asteroids[i].ProblemText);
        totalSimilarity += similarity;
        count++;
      }
    }

    const avgSimilarity = count > 0 ? totalSimilarity / count : 0;

    return {
      ...asteroid,
      SimilarityToPrevious: calculateSimilarity(
        asteroid.ProblemText,
        index > 0 ? asteroids[index - 1].ProblemText : '',
      ),
      NoveltyScore: Math.min(1.0, 1 - avgSimilarity),
    };
  });
}
