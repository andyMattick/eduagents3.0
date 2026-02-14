/**
 * Per-Problem Cognitive Analyzer (REFACTORED)
 * 
 * UNIVERSAL, SUBJECT-AGNOSTIC
 * 
 * For each problem/subpart:
 * - Contextual Bloom classification (not just verbs)
 * - Procedural complexity (1-5)
 * - Time estimation
 * 
 * Does NOT handle:
 * - Topic classification (that comes from subject profile)
 * - Problem type classification (that comes from subject profile)
 * - Any subject-specific logic
 */

import {
  CognitiveMetadata,
  BloomLevel,
  ProceduralComplexity,
} from './diagnosticTypes';

// ============================================================================
// CONTEXTUAL BLOOM CLASSIFICATION
// ============================================================================

const BLOOM_VERBS = {
  Remember: ['define', 'list', 'recall', 'identify', 'name', 'state', 'label', 'match', 'memorize', 'repeat', 'recognize'],
  Understand: ['explain', 'describe', 'summarize', 'paraphrase', 'interpret', 'classify', 'discuss', 'distinguish'],
  Apply: ['use', 'demonstrate', 'solve', 'illustrate', 'apply', 'calculate', 'complete', 'execute', 'implement'],
  Analyze: ['compare', 'contrast', 'analyze', 'examine', 'organize', 'differentiate', 'categorize', 'break down'],
  Evaluate: ['evaluate', 'justify', 'assess', 'critique', 'judge', 'defend', 'recommend', 'argue'],
  Create: ['design', 'create', 'develop', 'propose', 'construct', 'generate', 'plan', 'synthesize', 'compose'],
};

interface BloomContext {
  verb: string;
  requiresComparison: boolean;
  requiresJustification: boolean;
  requiDesInterpretation: boolean;
  requiresMultipleSteps: boolean;
  requiresCreativity: boolean;
  requiresOpenEndedness: boolean;
}

/**
 * Extract reasoning steps from problem text
 */
function countReasoningSteps(text: string): number {
  let steps = 1;
  
  // Multi-part indicators
  if (/(a\)|i\)|\(a\)|\(i\))/.test(text)) steps += text.match(/(a\)|i\)|\(a\)|\(i\))/g)?.length || 0;
  if (/then|next|after|subsequently/.test(text.toLowerCase())) steps += 2;
  if (/and|both/.test(text.toLowerCase())) steps += 1;
  if (/given|assume|suppose/.test(text.toLowerCase())) steps += 1;
  
  return Math.min(steps, 10);
}

/**
 * Analyze verb in context
 */
function analyzeVerbContext(text: string, verb: string): BloomContext {
  const lower = text.toLowerCase();
  
  return {
    verb,
    requiresComparison: /compare|contrast|difference|similar|versus|unlike|both/.test(lower),
    requiresJustification: /why|because|explain|justify|reason|due to/.test(lower),
    requiDesInterpretation: /interpret|what does|what would|what if|implication|consequence/.test(lower),
    requiresMultipleSteps: /step|procedure|process|after|then|next|subsequently/.test(lower),
    requiresCreativity: /create|design|develop|propose|invent|imagine|construct/.test(lower),
    requiresOpenEndedness: /your opinion|discuss|argue|evaluate|assess|think about|consider/.test(lower),
  };
}

/**
 * Contextual Bloom classification - NOT just verb-based
 * 
 * UNIVERSAL: Works for any subject
 */
export function classifyBloomContextual(text: string): { level: BloomLevel; confidence: number; reasoning: string; contextDependent: boolean; reasoningSteps: number } {
  const lower = text.toLowerCase();
  let detectedVerb: string | null = null;
  let initialLevel: BloomLevel = 'Understand';
  
  // Find first matching bloom verb
  for (const [level, verbs] of Object.entries(BLOOM_VERBS)) {
    for (const v of verbs) {
      if (lower.includes(v)) {
        detectedVerb = v;
        initialLevel = level as BloomLevel;
        break;
      }
    }
    if (detectedVerb) break;
  }
  
  // Adjust based on context
  const context = analyzeVerbContext(text, detectedVerb || 'unknown');
  let finalLevel = initialLevel;
  let reasoning = `Based on verb "${detectedVerb}": ${initialLevel}`;
  const reasoningSteps = countReasoningSteps(text);
  
  // Context-based adjustments
  if (context.requiresComparison && initialLevel === 'Understand') {
    finalLevel = 'Analyze';
    reasoning += `. Requires comparison (Analyze level).`;
  }
  
  if (context.requiresJustification && ['Understand', 'Apply'].includes(initialLevel)) {
    finalLevel = finalLevel === 'Analyze' ? 'Evaluate' : 'Analyze';
    reasoning += `. Requires justification (elevated to ${finalLevel} level).`;
  }
  
  if (context.requiDesInterpretation && initialLevel === 'Understand') {
    finalLevel = 'Apply';
    reasoning += `. Requires interpretation (elevated to Apply level).`;
  }
  
  if (context.requiresMultipleSteps && reasoningSteps > 3) {
    if (!['Evaluate', 'Create'].includes(finalLevel)) {
      finalLevel = 'Analyze';
    }
    reasoning += `. Multi-step procedure (${reasoningSteps} steps).`;
  }
  
  if (context.requiresOpenEndedness && finalLevel !== 'Create') {
    finalLevel = 'Evaluate';
    reasoning += `. Open-ended response required (Evaluate level).`;
  }
  
  if (context.requiresCreativity) {
    finalLevel = 'Create';
    reasoning += `. Requires original creation (Create level).`;
  }
  
  return {
    level: finalLevel,
    confidence: detectedVerb ? 0.85 : 0.6,
    reasoning,
    reasoningSteps,
    contextDependent: context.requiresComparison || context.requiresJustification || context.requiDesInterpretation,
  };
}

// ============================================================================
// PROCEDURAL COMPLEXITY (1-5, independent of Bloom)
// ============================================================================

export function calculateProceduralComplexity(text: string): ProceduralComplexity {
  let score = 1;
  
  // 1 = Recall (< 50 words, single fact)
  if (text.split(/\s+/).length > 50) score = 2;
  
  // 2 = Single-step (calculation, formula application)
  if (/formula|calculate|plug in|substitute|equation|formula/.test(text.toLowerCase())) score = 2;
  
  // 3 = Multi-step procedure (multiple operations sequence)
  if (/(step|first|then|next|after|subsequently)/i.test(text)) score = Math.max(score, 3);
  if (/(a\)|b\)|c\)|i\)|ii\)|iii\))/.test(text) && text.split(/(a\)|b\)|c\)|i\)|ii\)|iii\))/g).length > 3) score = Math.max(score, 3);
  
  // 4 = Multi-concept integration (requires connecting multiple ideas)
  if (/(integrate|combine|relationship|connection|link|interaction|both|and).*(concept|idea|principle)/i.test(text)) score = Math.max(score, 4);
  if (/(given|assume|suppose)/i.test(text) && text.split(/\s+/).length > 200) score = Math.max(score, 4);
  
  // 5 = Abstract reasoning/synthesis (new concepts, creative thinking)
  if (/(design|create|propose|develop|synthesize|invent|construct)/i.test(text)) score = 5;
  if (/hypothetical|if different|imagine|what if|suppose/.test(text.toLowerCase())) score = Math.max(score, 5);
  
  return (Math.min(score, 5) as ProceduralComplexity);
}

// ============================================================================
// TIME ESTIMATION
// ============================================================================

interface TimeBreakdown {
  reading: number;
  comprehension: number;
  computation: number;
  reasoning: number;
  writing: number;
}

export function estimateTime(text: string, complexity: ProceduralComplexity, bloomLevel: BloomLevel): { total: number; breakdown: TimeBreakdown } {
  const wordCount = text.split(/\s+/).length;
  
  // Reading: 200 words per minute for normal text
  const reading = Math.ceil(wordCount / 200);
  
  // Comprehension varies by complexity
  const comprehensionMap: Record<ProceduralComplexity, number> = { 1: 0.5, 2: 1, 3: 2, 4: 3, 5: 5 };
  const comprehension = comprehensionMap[complexity];
  
  // Computation: detect calculators steps
  const calculationSteps = (text.match(/calculate|compute|solve|determine|find|standard error|mean|proportion/gi) || []).length;
  const computation = calculationSteps * 1.5;
  
  // Reasoning varies by Bloom level
  const bloomTimeMap: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 1,
    Apply: 2,
    Analyze: 3,
    Evaluate: 4,
    Create: 5,
  };
  const reasoning = bloomTimeMap[bloomLevel];
  
  // Writing: detect if open-ended response required
  const writing = /explain|describe|discuss|essay|write|compose|argue|justify/i.test(text) ? 3 : 0;
  
  const total = reading + comprehension + computation + reasoning + writing;
  
  return {
    total: Math.max(1, Math.round(total * 10) / 10),
    breakdown: {
      reading,
      comprehension,
      computation,
      reasoning,
      writing,
    },
  };
}

// ============================================================================
// NOTE ON CLASSIFICATION
// ============================================================================

/**
 * DESIGN PRINCIPLE: Classification (topics, problem types) is NOT handled here
 * 
 * Why?
 * - Topics are subject-specific (Statistics topics ≠ English topics)
 * - Problem types are subject-specific (Statistics types ≠ Math types)
 * - They should be loaded from SubjectProfile JSON, not hardcoded
 * 
 * This module provides ONLY universal cognitive analysis.
 * Classification happens at a higher level using the SubjectProfile.
 */

// ============================================================================
// MAIN COGNITIVE ANALYZER (Universal, no classification)
// ============================================================================

/**
 * Analyze cognitive dimensions of problem
 * Returns ONLY cognitive metadata (universal dimensions)
 * Does NOT return topic/type classification (those come from subject profile)
 */
export function analyzeCognitiveDimensions(text: string): CognitiveMetadata {
  const bloomData = classifyBloomContextual(text);
  const complexity = calculateProceduralComplexity(text);
  const { total: estimatedTime, breakdown: timeBreakdown } = estimateTime(text, complexity, bloomData.level);
  const linguisticComplexity = calculateLinguisticComplexity(text);
  
  return {
    bloomsLevel: bloomData.level,
    bloomsConfidence: bloomData.confidence,
    bloomsReasoning: bloomData.reasoning,
    bloomsContextDependent: bloomData.contextDependent,
    
    complexityLevel: complexity,
    
    estimatedTimeMinutes: estimatedTime,
    timeBreakdown: {
      readingMinutes: timeBreakdown.reading,
      comprehensionMinutes: timeBreakdown.comprehension,
      computationMinutes: timeBreakdown.computation,
      reasoningMinutes: timeBreakdown.reasoning,
      writingMinutes: timeBreakdown.writing,
    },
    
    linguisticComplexity,
    reasoningStepsRequired: bloomData.reasoningSteps,
    proceduralWeight: calculateProceduralWeight(text, complexity),
  };
}

/**
 * Calculate procedural vs conceptual weight (0-1)
 * 0 = purely conceptual
 * 1 = purely procedural
 * Universal calculation, no subject-specific logic
 */
function calculateProceduralWeight(text: string, complexity: ProceduralComplexity): number {
  const lower = text.toLowerCase();
  let weight = 0.5; // Start neutral
  
  // Procedural indicators
  if (/calculate|compute|solve|determine|formula|equation|step|procedure|algorithm/i.test(lower)) {
    weight += 0.3;
  }
  
  // Conceptual indicators
  if (/explain|interpret|why|concept|theory|principle|understand|meaning/i.test(lower)) {
    weight -= 0.2;
  }
  
  // Balance by complexity
  if (complexity <= 2) weight += 0.2;
  if (complexity >= 4) weight -= 0.1;
  
  return Math.max(0, Math.min(1, weight));
}

// ============================================================================
// LINGUISTIC COMPLEXITY (Flesch-Kincaid Grade Level normalized to 0-1)
// ============================================================================

export function calculateLinguisticComplexity(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).length;
  const syllables = countSyllables(text);
  
  if (sentences === 0 || words === 0) return 0.5;
  
  // Flesch-Kincaid Grade Level
  const gradeLevel = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
  
  // Normalize to 0-1 (0 = college level, 1 = graduate level)
  // Grade 7 = 0.3, Grade 12 = 0.7, Grade 16+ = 1.0
  const normalized = Math.min(Math.max((gradeLevel - 7) / 9, 0), 1);
  
  return normalized;
}

/**
 * Approximate syllable count
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z]+\b/gi) || [];
  let syllableCount = 0;
  
  for (const word of words) {
    syllableCount += Math.max(1, (word.match(/[aeiou]+/gi) || []).length);
  }
  
  return syllableCount;
}


