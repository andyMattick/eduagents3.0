/**
 * Convert Asteroid (lightweight problem representation) to UniversalProblem
 * for storage in the problem bank with full pedagogical metadata
 */

import { Asteroid } from '../../types/simulation';
import { UniversalProblem, CognitiveMetadata, ClassificationMetadata, StructureMetadata, AnalysisMetadata } from '../../types/universalPayloads';

/**
 * Convert an Asteroid to a UniversalProblem
 * Maps simple asteroid data to fully-structured UniversalProblem format
 */
export function asteroidToUniversalProblem(
  asteroid: Asteroid,
  documentId: string,
  sectionId: string,
  subject: string,
): UniversalProblem {
  // Generate hierarchical problem ID
  const problemId = asteroid.ProblemId || `${sectionId}_P${asteroid.SequenceIndex || 1}`;

  // Build cognitive metadata from asteroid
  const cognitive: CognitiveMetadata = {
    bloomsLevel: asteroid.BloomLevel || 'Understand',
    complexityLevel: asteroid.LinguisticComplexity 
      ? Math.ceil(asteroid.LinguisticComplexity * 5) // Convert 0-1 to 1-5 scale
      : 2,
    linguisticComplexity: asteroid.LinguisticComplexity || 0.5,
    estimatedTimeSeconds: asteroid.EstimatedTimeSeconds || estimateTimeFromBloom(asteroid.BloomLevel || 'Understand'),
    keyConceptsRequired: extractKeyConceptsFromText(asteroid.ProblemText),
    assessmentType: asteroid.TestType || 'short_answer',
    requiresCalculation: asteroid.TestType === 'calculation',
    requiresWriting: asteroid.TestType === 'free_response' || asteroid.TestType === 'essay',
    multiPart: asteroid.MultiPart || false,
  };

  // Build classification metadata
  const classification: ClassificationMetadata = {
    subject: subject || asteroid.Subject || 'General',
    gradeLevel: inferGradeLevel(asteroid),
    difficulty: inferDifficulty(asteroid.BloomLevel || 'Understand'),
    format: asteroid.TestType || 'short_answer',
    domainArea: extractDomainArea(asteroid.ProblemText),
  };

  // Build structure metadata
  const structure: StructureMetadata = {
    length: asteroid.ProblemLength || countWords(asteroid.ProblemText),
    hasStemAndChoices: asteroid.TestType === 'multiple_choice',
    hasScaffold: asteroid.HasTips || false,
    hasRubric: false, // Not determined from asteroid
    canBeAutoScored: asteroid.TestType === 'multiple_choice' || asteroid.TestType === 'calculation',
    hasSourceContext: !!asteroid.SourceContext,
  };

  // Build analysis metadata
  const analysis: AnalysisMetadata = {
    noveltyScore: asteroid.NoveltyScore || 0.5,
    priorKnowledge: asteroid.PriorKnowledge || 0.5,
    similarityToPrevious: asteroid.SimilarityToPrevious || 0,
    generatedAt: new Date().toISOString(),
    analyzerVersion: '1.0',
  };

  return {
    problemId,
    documentId,
    subject: subject || asteroid.Subject || 'General',
    sectionId,
    content: asteroid.ProblemText,
    cognitive,
    classification,
    structure,
    analysis,
    version: '1.0',
  };
}

/**
 * Estimate time based on Bloom level
 */
function estimateTimeFromBloom(bloomLevel: string): number {
  const estimates: Record<string, number> = {
    'Remember': 60,
    'Understand': 120,
    'Apply': 180,
    'Analyze': 300,
    'Evaluate': 360,
    'Create': 420,
  };
  return estimates[bloomLevel] || 120;
}

/**
 * Infer grade level from complexity and Bloom level (heuristic)
 */
function inferGradeLevel(asteroid: Asteroid): string {
  const complexity = asteroid.LinguisticComplexity || 0.5;
  const bloom = asteroid.BloomLevel || 'Understand';

  // Higher Bloom levels and complexity suggest higher grades
  const bloomWeight = {
    'Remember': 0.5,
    'Understand': 1,
    'Apply': 1.5,
    'Analyze': 2,
    'Evaluate': 2.5,
    'Create': 3,
  }[bloom] || 1;

  const score = (complexity * 2.5 + bloomWeight) / 3.5;

  if (score < 0.8) return 'K-2';
  if (score < 1.3) return '3-5';
  if (score < 1.8) return '6-8';
  if (score < 2.3) return '9-10';
  return '11-12';
}

/**
 * Infer difficulty from Bloom level
 */
function inferDifficulty(bloomLevel: string): 'easy' | 'medium' | 'hard' {
  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    'Remember': 'easy',
    'Understand': 'easy',
    'Apply': 'medium',
    'Analyze': 'medium',
    'Evaluate': 'hard',
    'Create': 'hard',
  };
  return difficultyMap[bloomLevel] || 'medium';
}

/**
 * Extract domain area from problem text (heuristic)
 */
function extractDomainArea(text: string): string {
  const text_lower = text.toLowerCase();

  if (text_lower.includes('math') || text_lower.includes('calculate') || text_lower.includes('equation')) return 'Mathematics';
  if (text_lower.includes('science') || text_lower.includes('experiment') || text_lower.includes('biology')) return 'Science';
  if (text_lower.includes('read') || text_lower.includes('word') || text_lower.includes('grammar')) return 'Language Arts';
  if (text_lower.includes('history') || text_lower.includes('event') || text_lower.includes('date')) return 'Social Studies';
  return 'General';
}

/**
 * Extract key concepts from problem text (simple extraction)
 */
function extractKeyConceptsFromText(text: string): string[] {
  // Simple keyword extraction (in production, use NLP)
  const concepts: string[] = [];

  // Look for capitalized words (likely proper nouns/concepts)
  const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  concepts.push(...capitalized.filter((c, i) => i < 5)); // Limit to first 5

  return concepts.length > 0 ? concepts : ['Problem Solving'];
}

/**
 * Count words in problem text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
