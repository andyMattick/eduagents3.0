/**
 * Phase 3: Intent Extraction from Teacher Materials
 * 
 * Analyzes uploaded lesson plans, notes, slides to extract
 * pedagogical intent and design constraints for assignment generation
 */

import { BloomLevel } from './types';
import {
  AssignmentIntentTags,
  ProblemType,
  CognitiveLoadTarget,
  NoveltyPreference,
} from '../../types/assignmentGeneration';

/**
 * Bloom level keywords for intent extraction
 */
const BLOOM_KEYWORDS: Record<BloomLevel, string[]> = {
  Remember: ['define', 'list', 'name', 'identify', 'label', 'recall', 'state', 'write'],
  Understand: ['explain', 'describe', 'discuss', 'interpret', 'summarize', 'paraphrase', 'convert', 'classify', 'distinguish'],
  Apply: ['use', 'demonstrate', 'solve', 'execute', 'implement', 'practice', 'calculate', 'construct'],
  Analyze: ['examine', 'compare', 'contrast', 'distinguish', 'differentiate', 'break down', 'categorize', 'outline'],
  Evaluate: ['judge', 'justify', 'critique', 'assess', 'defend', 'appraise', 'conclude', 'verify'],
  Create: ['design', 'invent', 'create', 'compose', 'generate', 'synthesize', 'develop', 'produce'],
};

/**
 * Instructional tone indicators
 */
const TONE_INDICATORS = {
  exploratory: ['discover', 'explore', 'investigate', 'inquiry', 'wonder', 'question', 'guess', 'hypothesize'],
  evaluative: ['assess', 'measure', 'test', 'evaluate', 'grade', 'score', 'quiz', 'exam'],
  scaffolded: ['step-by-step', 'guideline', 'hints', 'tips', 'scaffold', 'support', 'guide', 'assist'],
  challenge: ['challenge', 'extend', 'stretch', 'advanced', 'difficult', 'complex', 'open-ended'],
};

/**
 * Extract Bloom levels present in text
 */
function extractBloomLevels(text: string): Partial<Record<BloomLevel, number>> {
  const lower = text.toLowerCase();
  const bloomCounts: Partial<Record<BloomLevel, number>> = {};

  (Object.keys(BLOOM_KEYWORDS) as BloomLevel[]).forEach(level => {
    const keywords = BLOOM_KEYWORDS[level];
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > 0) {
      bloomCounts[level] = count;
    }
  });

  // Normalize to distribution (0-1 for each level)
  const total = Object.values(bloomCounts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    (Object.keys(bloomCounts) as BloomLevel[]).forEach(level => {
      bloomCounts[level]! = bloomCounts[level]! / total;
    });
  }

  return bloomCounts;
}

/**
 * Extract instructional tone from materials
 */
function extractInstructionalTone(
  text: string
): 'exploratory' | 'evaluative' | 'scaffolded' | 'challenge' {
  const lower = text.toLowerCase();
  const scores = {
    exploratory: 0,
    evaluative: 0,
    scaffolded: 0,
    challenge: 0,
  };

  (Object.keys(scores) as Array<keyof typeof scores>).forEach(tone => {
    scores[tone] = TONE_INDICATORS[tone].filter(indicator =>
      lower.includes(indicator)
    ).length;
  });

  const maxTone = (Object.keys(scores) as Array<keyof typeof scores>).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  return maxTone;
}

/**
 * Extract key concepts from materials
 */
function extractKeyConcepts(text: string, _topic: string): string[] {
  // Look for capitalized phrases, definition patterns, and topic-related terms
  const sentences = text.split(/[.!?]/);
  const concepts: string[] = [];

  sentences.forEach(sentence => {
    // Look for patterns like "concept is", "concept refers to", etc.
    const conceptMatch = sentence.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|refers|means|describes)/i);
    if (conceptMatch) {
      concepts.push(conceptMatch[1]);
    }

    // Look for emphasized terms (in quotes or with special markers)
    const quotedMatch = sentence.match(/"([^"]+)"/);
    if (quotedMatch) {
      concepts.push(quotedMatch[1]);
    }
  });

  // Remove duplicates and limit
  return [...new Set(concepts)].slice(0, 5);
}

/**
 * Extract learning objectives from materials
 */
function extractLearningObjectives(text: string): string[] {
  const objectives: string[] = [];
  
  // Look for common objective patterns
  const patterns = [
    /students?\s+(?:will|should)\s+([^.!?]+)/gi,
    /learning\s+objective[s]?:?\s*([^.!?]+)/gi,
    /by\s+(?:the\s+)?end\s+of\s+(?:this|the)\s+(?:lesson|unit|class)[,:]?\s*([^.!?]+)/gi,
    /(?:upon\s+)?completion[,:]?\s*(?:students?\s+)?(?:will|should)?\s*([^.!?]+)/gi,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const objective = match[1].trim();
      if (objective.length > 10 && objective.length < 200) {
        objectives.push(objective);
      }
    }
  });

  // Remove duplicates
  return [...new Set(objectives)].slice(0, 5);
}

/**
 * Estimate time from content hints
 */
function estimateExecutionTime(text: string, problemCount?: number): number {
  let estimate = 30; // baseline

  // Look for time hints in text
  if (/\b30\s*(?:minutes|mins?)\b/i.test(text)) estimate = 30;
  else if (/\b45\s*(?:minutes|mins?)\b/i.test(text)) estimate = 45;
  else if (/\b60\s*(?:minutes|mins?)\b/i.test(text)) estimate = 60;
  else if (/\b90\s*(?:minutes|mins?)\b/i.test(text)) estimate = 90;
  else if (/\bclass\s+period/i.test(text)) estimate = 45; // typical class period

  // Adjust for problem count if provided
  if (problemCount) {
    // Rough estimate: 3-5 min per problem
    estimate = Math.max(estimate, problemCount * 3);
  }

  return estimate;
}

/**
 * Determine preferred problem types from Bloom distribution
 */
function inferProblemTypes(bloomDist: Partial<Record<BloomLevel, number>>): ProblemType[] {
  const types: ProblemType[] = [];

  // Map Bloom levels to problem types
  if (bloomDist.Remember || bloomDist.Understand) {
    types.push('multiple-choice', 'short-answer');
  }
  if (bloomDist.Apply || bloomDist.Analyze) {
    types.push('procedural', 'conceptual');
  }
  if (bloomDist.Evaluate) {
    types.push('free-response');
  }
  if (bloomDist.Create) {
    types.push('creative', 'interpretive');
  }

  return types.length > 0 ? types : ['procedural', 'conceptual'];
}

/**
 * Infer cognitive load target from materials
 */
function inferCognitiveLoadTarget(bloomDist: Partial<Record<BloomLevel, number>>): CognitiveLoadTarget {
  // If heavy in higher Bloom levels, use bell-curve
  const higherBloom = (bloomDist.Analyze || 0) + (bloomDist.Evaluate || 0) + (bloomDist.Create || 0);
  if (higherBloom > 0.4) {
    return 'bell-curve';
  }

  // If heavy in lower levels, use low or medium
  const lowerBloom = (bloomDist.Remember || 0) + (bloomDist.Understand || 0);
  if (lowerBloom > 0.6) {
    return 'low';
  }

  return 'medium';
}

/**
 * Main intent extraction function
 * Analyzes teacher-uploaded materials to extract pedagogical intent
 */
export function extractIntentFromMaterials(
  uploadedText: string,
  topic: string = 'General',
  _gradeLevel?: string
): AssignmentIntentTags {
  // Extract components
  const bloomDist = extractBloomLevels(uploadedText);
  const tone = extractInstructionalTone(uploadedText);
  const concepts = extractKeyConcepts(uploadedText, topic);
  const objectives = extractLearningObjectives(uploadedText);
  const estimatedTime = estimateExecutionTime(uploadedText);
  const problemTypes = inferProblemTypes(bloomDist);
  const cognitiveLoad = inferCognitiveLoadTarget(bloomDist);

  // Determine if tips should be included based on tone and Bloom distribution
  const includeTips = tone === 'scaffolded' || 
    (bloomDist.Understand || 0) > 0.3 ||
    tone === 'exploratory';

  // Determine novelty preference based on assignment intent
  let noveltyPreference: NoveltyPreference = 'medium';
  if (tone === 'exploratory' || tone === 'challenge') {
    noveltyPreference = 'high';
  } else if (tone === 'evaluative' || cognitiveLoad === 'low') {
    noveltyPreference = 'low';
  }

  // Calculate extraction confidence (based on how much content was found)
  const confidence = Math.min(
    0.95,
    0.5 +
      (Object.keys(bloomDist).length / 6) * 0.2 +
      (concepts.length / 5) * 0.15 +
      (objectives.length / 5) * 0.15
  );

  return {
    topic,
    inferredBloomDistribution: bloomDist,
    preferredProblemTypes: problemTypes,
    cognitiveLoadTarget: cognitiveLoad,
    noveltyPreference,
    includeTips,
    estimatedTime,
    keyConcepts: concepts,
    learningObjectives: objectives,
    instructionalTone: tone,
    extractionConfidence: confidence,
  };
}

/**
 * Validate and enhance intent tags
 */
export function refineIntentTags(
  intent: AssignmentIntentTags,
  overrides?: Partial<AssignmentIntentTags>
): AssignmentIntentTags {
  // Apply any user overrides
  if (overrides) {
    return { ...intent, ...overrides };
  }
  return intent;
}
