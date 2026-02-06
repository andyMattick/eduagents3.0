/**
 * Convert ExtractedProblem objects to Asteroid format
 * Bridges Phase 1 (Document parsing) to Phase 2 (Problem analysis)
 */

import { ExtractedProblem } from '../analysis/documentStructureParser';
import { Asteroid } from '../../types/simulation';

export function convertExtractedProblemsToAsteroids(
  problems: ExtractedProblem[],
  subject: string = 'General',
  options?: { sequenceOffset?: number }
): Asteroid[] {
  const sequenceOffset = options?.sequenceOffset || 0;

  return problems.map((problem, index) => {
    // Map detected question type to TestType
    const testTypeMap: Record<string, 'multiple_choice' | 'short_answer' | 'free_response'> = {
      multiple_choice: 'multiple_choice',
      true_false: 'short_answer',
      matching: 'short_answer',
      fill_in_blank: 'short_answer',
      short_answer: 'short_answer',
      frq_essay: 'free_response',
      calculation: 'free_response',
    };

    const testType = testTypeMap[problem.detectedQuestionType.toLowerCase()] || 'short_answer';

    return {
      ProblemId: problem.problemId,
      ProblemText: problem.text,
      ProblemLength: problem.length,
      MultiPart: problem.isMultipart,
      BloomLevel: problem.bloomLevels[0] || 'Remember',
      LinguisticComplexity: problem.linguisticComplexity || problem.complexity,
      SimilarityToPrevious: problem.similarity,
      NoveltyScore: problem.novelty,
      SequenceIndex: sequenceOffset + index + 1,
      TestType: testType,
      Subject: subject,
      EstimatedTimeSeconds: (problem.estimatedTimeMinutes || 1) * 60,
    };
  });
}
