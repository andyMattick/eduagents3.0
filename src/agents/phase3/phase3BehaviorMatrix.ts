/**
 * Phase 3: Intent Extraction & Behavior Matrix Implementation
 * 
 * Orchestrates the behavior matrix: determines what system actions to take
 * based on the selected Goal + Source combination
 */

import {
  Phase3Goal,
  Phase3Source,
  Phase3BehaviorSpec,
  PHASE3_BEHAVIOR_MATRIX,
  AssignmentIntentTags,
  Phase3Context,
} from '../../types/assignmentGeneration';

/**
 * Get the behavior specification for a goal + source combination
 */
export function getBehaviorSpec(goal: Phase3Goal, source: Phase3Source): Phase3BehaviorSpec {
  return PHASE3_BEHAVIOR_MATRIX[goal][source];
}

/**
 * Extract instructional intent from uploaded source materials
 * 
 * Used when source = 'hasNotes'
 * Analyzes the uploaded document to infer:
 * - Learning objectives
 * - Bloom level emphasis
 * - Key concepts covered
 * - Instructional tone
 */
export async function extractIntentFromSource(
  sourceText: string,
  _gradeLevel: string,
  _subject: string
): Promise<AssignmentIntentTags> {
  // In production, this would call an AI service to analyze the text
  // For now, use heuristics and simple NLP

  // Extract learning objectives (sentences with keywords like "students will", "learn", "understand")
  const learningObjectives = extractLearningObjectives(sourceText);

  // Identify key concepts
  const keyConcepts = extractKeyConcepts(sourceText);

  // Infer Bloom distribution from language patterns
  const inferredBloomDistribution = inferBloomDistribution(sourceText);

  // Detect instructional tone
  const instructionalTone = detectInstructionalTone(sourceText);

  // Estimate completion time
  const estimatedTime = estimateTime(sourceText, keyConcepts.length);

  return {
    topic: extractTopic(sourceText),
    inferredBloomDistribution,
    preferredProblemTypes: ['short-answer', 'free-response', 'conceptual'],
    cognitiveLoadTarget: 'bell-curve',
    noveltyPreference: 'medium',
    includeTips: true,
    estimatedTime,
    keyConcepts,
    learningObjectives,
    instructionalTone,
    extractionConfidence: 0.75, // Confidence that heuristics worked well
  };
}

/**
 * Determine system actions based on Phase 3 context
 */
export async function executePhase3Behavior(
  context: Phase3Context
): Promise<{
  shouldExtractIntent: boolean;
  shouldGenerateProblems: boolean;
  shouldAnalyzeAssignment: boolean;
  shouldScoreNovelty: boolean;
  shouldScorePriorKnowledge: boolean;
  nextStep: string;
  systemPromptKey: string;
  briefing: string;
}> {
  const spec = getBehaviorSpec(context.goal, context.source);

  // Generate a user-friendly briefing
  const briefing = generateBriefing(context.goal, context.source);

  return {
    shouldExtractIntent: spec.extractIntent,
    shouldGenerateProblems: spec.generateProblems,
    shouldAnalyzeAssignment: spec.analyzeAssignment,
    shouldScoreNovelty: spec.scoreNovelty,
    shouldScorePriorKnowledge: spec.scorePriorKnowledge,
    nextStep: spec.nextStep,
    systemPromptKey: spec.systemPromptKey,
    briefing,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract learning objectives from source text
 */
function extractLearningObjectives(sourceText: string): string[] {
  // Look for patterns like:
  // - "students will be able to..."
  // - "by the end of this unit..."
  // - "learning objectives:"
  // - "goals:" followed by bullet points

  const objectives: string[] = [];
  const patterns = [
    /students?\s+(?:will\s+)?(?:be\s+)?able\s+to\s+([^.\n]+)/gi,
    /learning\s+objectives?:\s*\n?(.+?)(?:\n|$)/gi,
    /goals?:\s*\n?(.+?)(?:\n|$)/gi,
    /by\s+the\s+end\s+of\s+(?:this\s+)?(?:unit|week|lesson)[^.]*\s+students?\s+(?:will\s+)?(?:be\s+)?able\s+to\s+([^.\n]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceText)) !== null) {
      const objective = match[1]?.trim();
      if (objective && objective.length < 200) {
        objectives.push(objective);
      }
    }
  }

  return Array.from(new Set(objectives)).slice(0, 10); // Limit to 10 unique objectives
}

/**
 * Extract key concepts from source text
 */
function extractKeyConcepts(sourceText: string): string[] {
  // Look for capitalized phrases, bolded/italicized terms, section headers
  const concepts: string[] = [];

  // Pattern 1: Capitalized phrases (likely concepts)
  const capitalizedMatches = sourceText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  concepts.push(...capitalizedMatches.slice(0, 10));

  // Pattern 2: Terms in section headers
  const headerMatches = sourceText.match(/#{1,6}\s+([^\n]+)/g) || [];
  concepts.push(...headerMatches.map(h => h.replace(/^#+\s+/, '')));

  return Array.from(new Set(concepts)).slice(0, 15); // Unique, limit to 15
}

/**
 * Infer Bloom level distribution from language patterns
 */
function inferBloomDistribution(
  sourceText: string
): Partial<Record<string, number>> {
  // Count Bloom-related keywords
  const bloomKeywords = {
    Remember: ['define', 'list', 'name', 'identify', 'label', 'recall'],
    Understand: ['explain', 'describe', 'interpret', 'summarize', 'classify'],
    Apply: ['demonstrate', 'use', 'solve', 'calculate', 'apply', 'implement'],
    Analyze: ['analyze', 'break down', 'compare', 'contrast', 'examine'],
    Evaluate: ['evaluate', 'judge', 'critique', 'assess', 'determine'],
    Create: ['create', 'design', 'compose', 'generate', 'hypothesize'],
  };

  const distribution: Partial<Record<string, number>> = {};
  const textLower = sourceText.toLowerCase();

  for (const [level, keywords] of Object.entries(bloomKeywords)) {
    let count = 0;
    for (const keyword of keywords) {
      const matches = textLower.match(new RegExp(keyword, 'g'));
      count += matches ? matches.length : 0;
    }
    if (count > 0) {
      distribution[level] = count;
    }
  }

  // Normalize to percentages
  const values = Object.values(distribution);
  const total = values.length > 0 ? values.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) : 1;
  for (const level in distribution) {
    const val = distribution[level];
    if (val !== undefined) {
      distribution[level] = Math.round((val / total) * 100) / 100;
    }
  }

  return distribution;
}

/**
 * Detect instructional tone from language patterns
 */
function detectInstructionalTone(
  sourceText: string
): 'exploratory' | 'evaluative' | 'scaffolded' | 'challenge' {
  const textLower = sourceText.toLowerCase();

  // Count tone indicators
  const exploratory = ['explore', 'discover', 'investigate', 'wonder', 'curious'];
  const evaluative = ['quiz', 'test', 'exam', 'assessment', 'evaluate'];
  const scaffolded = ['step', 'guide', 'help', 'hint', 'example', 'tip'];
  const challenge = ['difficult', 'advanced', 'challenge', 'stretch', 'race'];

  const scores = {
    exploratory: countMatches(textLower, exploratory),
    evaluative: countMatches(textLower, evaluative),
    scaffolded: countMatches(textLower, scaffolded),
    challenge: countMatches(textLower, challenge),
  };

  // Return highest scoring tone
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'scaffolded') as 'exploratory' | 'evaluative' | 'scaffolded' | 'challenge';
}

/**
 * Extract topic from source text
 */
function extractTopic(sourceText: string): string {
  // Try to extract topic from first heading or title-like text
  const headingMatch = sourceText.match(/#\s+([^\n]+)/);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Fallback: use first capitalized phrase
  const phraseMatch = sourceText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
  return phraseMatch ? phraseMatch[0] : 'Unknown Topic';
}

/**
 * Estimate completion time based on content
 */
function estimateTime(sourceText: string, conceptCount: number): number {
  // Rough heuristic: 1 concept ≈ 3-5 minutes
  // Plus 10 minutes base for introduction/summary
  const baseTime = 10;
  const conceptTime = conceptCount * 4;
  const textLength = sourceText.length / 100; // ~5 minutes per 500 words
  return Math.max(15, Math.min(120, baseTime + conceptTime + textLength));
}

/**
 * Count how many keywords from a list appear in text
 */
function countMatches(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const matches = text.match(new RegExp(keyword, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Generate a user-friendly briefing for the selected goal + source
 */
function generateBriefing(goal: Phase3Goal, source: Phase3Source): string {
  const briefings: Record<Phase3Goal, Record<Phase3Source, string>> = {
    create: {
      hasNotes:
        '📝 Analyzing your notes to extract learning objectives and key concepts... I\'ll generate a balanced assignment that covers these areas with good novelty distribution.',
      noNotes:
        '📝 Ready to create a new assignment! Just tell me the topic, grade level, and what Bloom levels you want to emphasize.',
    },
    analyze: {
      hasNotes:
        '🔬 Comparing your assignment to your notes... I\'ll identify which concepts are covered, any gaps, and score each problem by Bloom level and novelty.',
      noNotes:
        '🔬 Analyzing your assignment structure... I\'ll break down the Bloom levels, estimate time to completion, and highlight potential issues.',
    },
    refine: {
      hasNotes:
        '🛠️ I\'ll use your notes to identify improvements: better scaffolding where needed, improved Bloom balance, and reduced redundancy.',
      noNotes:
        '🛠️ Ready to refine your assignment! Tell me what aspects you\'d like me to improve, and I\'ll regenerate it accordingly.',
    },
  };

  return briefings[goal][source];
}

/**
 * Validate Phase 3 context before processing
 */
export function validatePhase3Context(context: Phase3Context): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!context.goal || !context.source) {
    errors.push('Missing goal or source selection');
  }

  if (
    context.source === 'hasNotes' &&
    (!context.input || !('uploadedFile' in context.input))
  ) {
    errors.push('Source=hasNotes requires uploaded file');
  }

  if (
    context.source === 'noNotes' &&
    (!context.input || !('topic' in context.input) || !context.input.topic)
  ) {
    errors.push('Source=noNotes requires topic');
  }

  // Goal-specific validation
  if ((context.goal === 'analyze' || context.goal === 'refine') && !context.existingAssignment) {
    errors.push(`Goal=${context.goal} requires existing assignment`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
