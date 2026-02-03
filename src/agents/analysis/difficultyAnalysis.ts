/**
 * Assignment Difficulty Analysis & Calculation
 * 
 * Determines assignment difficulty based on:
 * - Bloom's taxonomy level distribution
 * - Readability metrics (Flesch-Kincaid, etc.)
 * - Question complexity
 * - Grade level expectations
 */

import { BloomDistribution } from './assignmentTypes';

export interface DifficultyAnalysis {
  difficulty: 'easy' | 'intermediate' | 'hard';
  bloomLevel: number; // 1-6 average (Bloom's taxonomy)
  readabilityGrade: number; // Flesch-Kincaid grade level
  complexityScore: number; // 0-100
  justification: string;
  confidence: number; // 0-1
}

/**
 * Calculate difficulty based on Bloom's taxonomy distribution
 */
export function calculateDifficultyFromBloom(bloomDistribution: BloomDistribution): 'easy' | 'intermediate' | 'hard' {
  // Calculate weighted average of Bloom levels
  const totalWeight = bloomDistribution.remember + bloomDistribution.understand + 
                      bloomDistribution.apply + bloomDistribution.analyze + 
                      bloomDistribution.evaluate + bloomDistribution.create;
  
  if (totalWeight === 0) return 'intermediate';

  const weightedAverage = 
    (bloomDistribution.remember * 1 + 
     bloomDistribution.understand * 2 + 
     bloomDistribution.apply * 3 + 
     bloomDistribution.analyze * 4 + 
     bloomDistribution.evaluate * 5 + 
     bloomDistribution.create * 6) / totalWeight;

  // Map Bloom average to difficulty
  if (weightedAverage <= 2.0) return 'easy';
  if (weightedAverage <= 4.0) return 'intermediate';
  return 'hard';
}

/**
 * Calculate Flesch-Kincaid grade level
 * Returns estimated US grade level (0-18+)
 */
export function calculateFleschKincaidGrade(text: string): number {
  // Remove extra whitespace
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // Count syllables, words, sentences
  const words = cleanText.split(/\s+/).length;
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim()).length || 1;
  const syllables = countSyllables(cleanText);

  // Flesch-Kincaid formula: (0.39 * W/S) + (11.8 * Sy/W) - 15.59
  const grade = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
  
  return Math.max(0, Math.min(grade, 18));
}

/**
 * Estimate syllable count (approximate)
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let syllableCount = 0;

  for (const word of words) {
    // Remove punctuation
    const cleanWord = word.replace(/[^a-z]/g, '');
    
    if (cleanWord.length <= 3) {
      syllableCount += 1;
    } else {
      // Count vowel groups
      let vowelGroupCount = 0;
      let previousWasVowel = false;
      
      for (const char of cleanWord) {
        const isVowel = 'aeiou'.includes(char);
        if (isVowel && !previousWasVowel) {
          vowelGroupCount++;
        }
        previousWasVowel = isVowel;
      }
      
      // Adjust for silent e
      if (cleanWord.endsWith('e')) {
        vowelGroupCount--;
      }
      
      // Ensure at least 1 syllable
      syllableCount += Math.max(1, vowelGroupCount);
    }
  }

  return Math.max(1, syllableCount);
}

/**
 * Calculate question complexity score (0-100)
 */
export function calculateComplexityScore(
  bloomLevel: number,
  readabilityGrade: number,
  wordCount: number,
  questionCount: number,
  hasEvidence: boolean,
  hasTransitions: boolean
): number {
  let score = 0;

  // Bloom level contribution (0-35 points)
  score += (bloomLevel / 6) * 35;

  // Readability contribution (0-25 points)
  // Higher grade level = higher complexity
  const normalizedGrade = Math.min(readabilityGrade / 12, 1); // Normalize to 0-1
  score += normalizedGrade * 25;

  // Text length contribution (0-15 points)
  const normalizedLength = Math.min(wordCount / 500, 1); // 500+ words = max complexity
  score += normalizedLength * 15;

  // Question complexity bonus (0-15 points)
  const avgWordsPerQuestion = wordCount / Math.max(questionCount, 1);
  const normalizedQComplexity = Math.min(avgWordsPerQuestion / 200, 1);
  score += normalizedQComplexity * 15;

  // Evidence requirement bonus (0-5 points)
  if (hasEvidence) score += 5;

  // Transition words bonus (0-5 points)
  if (hasTransitions) score += 5;

  return Math.round(score);
}

/**
 * Perform full difficulty analysis
 */
export function analyzeDifficulty(
  text: string,
  bloomDistribution?: BloomDistribution,
  gradeLevel?: string
): DifficultyAnalysis {
  const wordCount = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length || 1;
  const questionCount = text.split(/\?/).length - 1 || 1;
  const hasEvidence = /example|evidence|research/i.test(text);
  const hasTransitions = /however|therefore|moreover|additionally/i.test(text);

  const readabilityGrade = calculateFleschKincaidGrade(text);
  
  // Calculate Bloom level from distribution or estimate
  let bloomLevel = 3; // Default to middle level
  if (bloomDistribution) {
    const totalWeight = bloomDistribution.remember + bloomDistribution.understand + 
                        bloomDistribution.apply + bloomDistribution.analyze + 
                        bloomDistribution.evaluate + bloomDistribution.create;
    if (totalWeight > 0) {
      bloomLevel = (bloomDistribution.remember * 1 + 
                   bloomDistribution.understand * 2 + 
                   bloomDistribution.apply * 3 + 
                   bloomDistribution.analyze * 4 + 
                   bloomDistribution.evaluate * 5 + 
                   bloomDistribution.create * 6) / totalWeight;
    }
  }

  const complexityScore = calculateComplexityScore(
    bloomLevel,
    readabilityGrade,
    wordCount,
    questionCount,
    hasEvidence,
    hasTransitions
  );

  // Determine difficulty based on complexity score
  let difficulty: 'easy' | 'intermediate' | 'hard';
  if (complexityScore < 35) difficulty = 'easy';
  else if (complexityScore < 65) difficulty = 'intermediate';
  else difficulty = 'hard';

  // Adjust based on grade level expectations
  let gradeAdjustment = 0;
  if (gradeLevel) {
    const gradeLevelNum = parseInt(gradeLevel.split('-')[0]) || 6;
    // If readability is significantly below grade level, reduce difficulty
    if (readabilityGrade < gradeLevelNum - 2) {
      gradeAdjustment = -15;
    }
    // If readability is significantly above grade level, increase difficulty
    if (readabilityGrade > gradeLevelNum + 3) {
      gradeAdjustment = 15;
    }
  }

  const adjustedComplexity = Math.max(0, Math.min(100, complexityScore + gradeAdjustment));
  
  if (adjustedComplexity < 35) difficulty = 'easy';
  else if (adjustedComplexity < 65) difficulty = 'intermediate';
  else difficulty = 'hard';

  return {
    difficulty,
    bloomLevel: Number(bloomLevel.toFixed(2)),
    readabilityGrade: Number(readabilityGrade.toFixed(1)),
    complexityScore: adjustedComplexity,
    justification: generateDifficultyJustification(
      adjustedComplexity,
      bloomLevel,
      readabilityGrade,
      gradeLevel
    ),
    confidence: 0.75, // Default confidence
  };
}

function generateDifficultyJustification(
  complexity: number,
  bloomLevel: number,
  readabilityGrade: number,
  gradeLevel?: string
): string {
  const bloomName = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'][
    Math.floor(bloomLevel) - 1
  ] || 'Apply';

  let justification = `Complexity score: ${complexity.toFixed(0)}/100. `;
  justification += `Average Bloom level: ${bloomLevel.toFixed(1)} (${bloomName}). `;
  justification += `Readability grade: ${readabilityGrade.toFixed(1)}.`;

  if (gradeLevel) {
    const expectedGrade = parseInt(gradeLevel.split('-')[0]) || 6;
    const gradeDiff = readabilityGrade - expectedGrade;
    if (Math.abs(gradeDiff) > 2) {
      justification += ` Text is ${gradeDiff > 0 ? 'above' : 'below'} grade level by ~${Math.abs(gradeDiff).toFixed(1)} grades.`;
    }
  }

  return justification;
}

/**
 * Difficulty levels for UI display
 */
export const DIFFICULTY_LEVELS = {
  easy: {
    label: 'Easy',
    description: 'Low complexity, foundational concepts, shorter length',
    color: 'green',
    complexityRange: [0, 35],
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Moderate complexity, mixed cognitive levels, standard length',
    color: 'yellow',
    complexityRange: [35, 65],
  },
  hard: {
    label: 'Hard',
    description: 'High complexity, advanced concepts, longer or dense text',
    color: 'red',
    complexityRange: [65, 100],
  },
};
