/**
 * Phase 3: Novelty & Prior Knowledge Scoring
 * 
 * Scores generated problems against source materials to detect:
 * - Novelty: How much is the problem new vs. paraphrased from source?
 * - Prior Knowledge: Was this concept covered in the source materials?
 */

import { Asteroid } from '../../types/simulation';

/**
 * Novelty Score Options
 */
export interface NoveltyScore {
  /** 0.0-1.0: How unique is this problem compared to source content? */
  noveltyScore: number;
  
  /** Type of derivation: exact match, paraphrased, or completely novel */
  derivationType: 'exact-match' | 'paraphrased' | 'novel';
  
  /** If paraphrased/exact, which source concept was it derived from? */
  sourceReference?: string;
  
  /** Confidence in this assessment (0.0-1.0) */
  confidence: number;
}

/**
 * Prior Knowledge Score Options
 */
export interface PriorKnowledgeScore {
  /** 0.0-1.0: How much was this concept covered in source? */
  priorKnowledge: number;
  
  /** Which concepts from the problem appeared in source? */
  coveredConcepts: string[];
  
  /** Which concepts are new/absent from source? */
  newConcepts: string[];
  
  /** Recommendations for scaffolding (higher if low prior knowledge) */
  scaffoldingRecommendation: 'high' | 'medium' | 'low';
  
  /** Confidence in this assessment (0.0-1.0) */
  confidence: number;
}

/**
 * Score novelty of a generated problem against source material
 * 
 * Algorithm:
 * - Extract key concepts from problem
 * - Compare to source content via similarity metrics
 * - Exact match (>0.95 sim) → novelty: low, derivationType: exact-match
 * - Partial match (0.6-0.95 sim) → novelty: medium, derivationType: paraphrased
 * - No match (<0.6 sim) → novelty: high, derivationType: novel
 */
export async function scoreNovelty(
  problem: Asteroid,
  sourceContent: string,
  sourceContext?: string
): Promise<NoveltyScore> {
  // Extract key concepts from problem
  const problemConcepts = extractConceptsFromProblem(problem.ProblemText);
  
  // Extract concepts from source
  const sourceConcepts = extractConceptsFromText(sourceContent);
  
  // Calculate similarity between problem and source
  const similarity = calculateConceptSimilarity(problemConcepts, sourceConcepts);
  
  // Determine derivation type and novelty score
  let derivationType: 'exact-match' | 'paraphrased' | 'novel';
  let noveltyScore: number;
  let confidence: number;
  
  if (similarity > 0.95) {
    // Exact or near-exact match
    derivationType = 'exact-match';
    noveltyScore = 0.1; // Low novelty
    confidence = 0.95;
  } else if (similarity > 0.6) {
    // Paraphrased or heavily adapted
    derivationType = 'paraphrased';
    noveltyScore = 0.5; // Medium novelty
    confidence = 0.85;
  } else {
    // Completely novel
    derivationType = 'novel';
    noveltyScore = 0.9; // High novelty
    confidence = 0.9;
  }
  
  const sourceSegment = findMatchingSourceSection(problemConcepts, sourceContent);

  return {
    noveltyScore,
    derivationType,
    sourceReference: sourceSegment,
    confidence,
  };
}

/**
 * Score prior knowledge coverage for a generated problem against source material
 * 
 * Algorithm:
 * - Extract key concepts from problem
 * - Scan source for those concepts
 * - high prior knowledge = concepts present in source
 * - low prior knowledge = concepts absent from source → increase scaffolding
 */
export async function scorePriorKnowledge(
  problem: Asteroid,
  sourceContent: string
): Promise<PriorKnowledgeScore> {
  // Extract concepts from problem
  const problemConcepts = extractConceptsFromProblem(problem.ProblemText);
  
  // Check which concepts appear in source
  const sourceText = sourceContent.toLowerCase();
  const coveredConcepts: string[] = [];
  const newConcepts: string[] = [];
  
  for (const concept of problemConcepts) {
    if (sourceText.includes(concept.toLowerCase())) {
      coveredConcepts.push(concept);
    } else {
      newConcepts.push(concept);
    }
  }
  
  // Calculate prior knowledge score
  const coveredRatio = coveredConcepts.length / (problemConcepts.length || 1);
  const priorKnowledge = coveredRatio; // 0.0-1.0
  
  // Recommend scaffolding based on coverage
  let scaffoldingRecommendation: 'high' | 'medium' | 'low';
  if (priorKnowledge < 0.3) {
    scaffoldingRecommendation = 'high'; // Many new concepts → need lots of help
  } else if (priorKnowledge < 0.7) {
    scaffoldingRecommendation = 'medium'; // Mixed → moderate help
  } else {
    scaffoldingRecommendation = 'low'; // Most concepts covered → minimal help
  }
  
  return {
    priorKnowledge,
    coveredConcepts,
    newConcepts,
    scaffoldingRecommendation,
    confidence: 0.85, // Reasonable confidence from concept matching
  };
}

/**
 * Apply novelty & prior knowledge scores to an Asteroid
 */
export function enrichAsteroidWithScores(
  asteroid: Asteroid,
  noveltyScore: NoveltyScore,
  priorKnowledgeScore: PriorKnowledgeScore
): Asteroid {
  return {
    ...asteroid,
    NoveltyScore: noveltyScore.noveltyScore,
    PriorKnowledge: priorKnowledgeScore.priorKnowledge,
    SourceContext: {
      sourceConcept: noveltyScore.sourceReference,
      sourceReference: noveltyScore.sourceReference,
      derivationType: noveltyScore.derivationType,
    },
    // Optionally adjust HasTips based on prior knowledge
    HasTips: priorKnowledgeScore.scaffoldingRecommendation !== 'low' || asteroid.HasTips,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract key concepts from problem text using simple NLP
 * (In production, could use more sophisticated NER or ML models)
 */
function extractConceptsFromProblem(problemText: string): string[] {
  // Simple extraction: compound words, technical terms, proper nouns
  const words = problemText.split(/[\s\-,.:;!?()]+/);
  
  // Filter out common words and keep meaningful ones
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'if', 'then', 'which', 'what', 'why', 'how', 'who', 'when', 'where',
    'could', 'would', 'should', 'must', 'can', 'will', 'do', 'does',
    'that', 'this', 'it', 'its', 'to', 'of', 'in', 'on', 'at', 'by',
    'for', 'with', 'from', 'as', 'be', 'been', 'being', 'have', 'has', 'had',
  ]);
  
  const concepts = words
    .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
    .map(word => word.toLowerCase());
  
  return Array.from(new Set(concepts)); // Deduplicate
}

/**
 * Extract key concepts from source text
 */
function extractConceptsFromText(text: string): string[] {
  const words = text.split(/[\s\-,.:;!?()]+/);
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'if', 'then', 'which', 'what', 'why', 'how', 'who', 'when', 'where',
    'could', 'would', 'should', 'must', 'can', 'will', 'do', 'does',
    'that', 'this', 'it', 'its', 'to', 'of', 'in', 'on', 'at', 'by',
    'for', 'with', 'from', 'as', 'be', 'been', 'being', 'have', 'has', 'had',
  ]);
  
  const concepts = words
    .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
    .map(word => word.toLowerCase());
  
  return Array.from(new Set(concepts));
}

/**
 * Calculate similarity between two concept sets (Jaccard similarity)
 * Returns 0.0-1.0 where 1.0 = identical sets
 */
function calculateConceptSimilarity(concepts1: string[], concepts2: string[]): number {
  const set1 = new Set(concepts1);
  const set2 = new Set(concepts2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0.0;
  return intersection.size / union.size;
}

/**
 * Find which section of source content matches the problem
 */
function findMatchingSourceSection(
  problemConcepts: string[],
  sourceContent: string
): string | undefined {
  // Simple heuristic: find the first sentence containing the most problem concepts
  const sentences = sourceContent.split(/[.!?]+/);
  
  let bestMatch: { sentence: string; matchCount: number } = {
    sentence: '',
    matchCount: 0,
  };
  
  for (const sentence of sentences) {
    const matchCount = problemConcepts.filter(concept =>
      sentence.toLowerCase().includes(concept.toLowerCase())
    ).length;
    
    if (matchCount > bestMatch.matchCount) {
      bestMatch = { sentence: sentence.trim(), matchCount };
    }
  }
  
  return bestMatch.matchCount > 0 ? bestMatch.sentence.substring(0, 100) : undefined;
}

/**
 * Mass score all asteroids against source material
 */
export async function scoreAllAsteroids(
  asteroids: Asteroid[],
  sourceContent: string
): Promise<Asteroid[]> {
  const scoredAsteroids: Asteroid[] = [];
  
  for (const asteroid of asteroids) {
    const novelty = await scoreNovelty(asteroid, sourceContent);
    const priorKnowledge = await scorePriorKnowledge(asteroid, sourceContent);
    const enriched = enrichAsteroidWithScores(asteroid, novelty, priorKnowledge);
    scoredAsteroids.push(enriched);
  }
  
  return scoredAsteroids;
}
