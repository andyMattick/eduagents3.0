/**
 * Smart Question Parser: Breaks assignments into discrete, student-facing questions
 * Handles HTML structure, question indicators, line breaks, and numbered items
 */

import { BloomLevel } from './types';

/**
 * Represents a single parsed question with metadata
 */
export interface ParsedQuestion {
  QuestionId: string;
  Text: string; // Clean, rendered version (not raw HTML)
  OriginalHTML?: string; // Original markup for reference
  Metadata: {
    BloomLevel: BloomLevel;
    LinguisticComplexity: number; // 0.0-1.0
    NoveltyScore: number; // 0.0-1.0
    SimilarityToPrevious: number; // 0.0-1.0
    ProblemLength: number; // word count
    MultiPart: boolean;
    QuestionType: 'multiple_choice' | 'short_answer' | 'essay' | 'fill_in_blank' | 'matching' | 'other';
  };
}

/**
 * Clean HTML: Strip tags but preserve text content and structure
 */
function cleanHTML(html: string): string {
  // Remove script and style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Preserve line breaks and structure
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(p|div|blockquote|li)>/gi, '\n');
  cleaned = cleaned.replace(/<li>/gi, '• ');

  // Remove all remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleaned;
  cleaned = textarea.value;

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Collapse spaces
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Detect question type based on content patterns
 */
function detectQuestionType(
  text: string,
): 'multiple_choice' | 'short_answer' | 'essay' | 'fill_in_blank' | 'matching' | 'other' {
  const lower = text.toLowerCase();

  // Multiple choice: A) B) C) D) or • A • B • C patterns
  if (/[a)\]]\s+(a|b|c|d)\s*[)\]]/i.test(text) || /[•\-]\s+[a-d]\./i.test(text)) {
    return 'multiple_choice';
  }

  // Fill-in-the-blank: underscores, dashes, brackets
  if (/_{3,}|—{2,}|\[____+\]/.test(text)) {
    return 'fill_in_blank';
  }

  // Matching: numbered items with left-right pairing
  if (/\d+\.\s+.*—|←|→/.test(text)) {
    return 'matching';
  }

  // Essay: longer questions asking for explanation
  if (
    /\b(explain|discuss|evaluate|analyze|describe|compare|contrast|justify|argue)\b/i.test(
      lower,
    ) &&
    text.split(' ').length > 30
  ) {
    return 'essay';
  }

  // Short answer: typical interrogative start
  if (/^(what|when|where|who|why|how|which|define|list|name|identify)/i.test(lower)) {
    return 'short_answer';
  }

  return 'other';
}

/**
 * Detect if a question is multi-part
 * Looks for sub-questions: (a), (b), (c) or 1), 2), 3) or i), ii), iii)
 */
function isMultiPart(text: string): boolean {
  // Pattern: (a) (b) (c) or a) b) c) or a. b. c.
  const multiPartPattern = /\([a-z]\)|[a-z]\)\s|\(?[i]{1,3}\)|\(?[a-z]\.\s/;
  return multiPartPattern.test(text);
}

/**
 * Detect if a line is a question (not a heading, instruction, or descriptor)
 */
function isQuestion(text: string): boolean {
  const trimmed = text.trim();

  // Skip empty lines
  if (trimmed.length === 0) return false;

  // Skip lines that are just HTML tags or metadata
  if (/^<[^>]+>$/.test(trimmed)) return false;

  // Skip very short fragments
  if (trimmed.length < 10) return false;

  // Must contain a question indicator
  const questionIndicators = [
    /\?$/, // Ends with question mark
    /^(what|when|where|who|why|how|which|define|list|name|identify|circle|choose|select|match|write|explain|describe|analyze|evaluate|compare|contrast|discuss|justify|argue|true|false|correct|find|solve|calculate|compute|determine)/i,
    /fill\s*(in|the\s*blank)/i,
    /match\s*(the|column|item)/i,
    /\([a-z]\)|[a-z]\)\s/, // Has sub-questions
  ];

  return questionIndicators.some(pattern => pattern.test(trimmed));
}

/**
 * Split text into candidate question segments
 * Uses HTML structure, numbered lists, and question markers
 */
function segmentText(text: string): string[] {
  const segments: string[] = [];
  let current = '';

  // Split by common delimiters
  const lines = text.split(/\n+/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this is a question marker (1. 2. 3. or a) b) c) etc.)
    const isQuestionMarker = /^[\d]+[\.\)]\s|^[a-zA-Z][\.\)]\s|^[-•]\s/.test(trimmed);

    if (isQuestionMarker && current.trim()) {
      // Save previous question
      segments.push(current.trim());
      current = trimmed;
    } else {
      // Continue building current question
      if (current) {
        current += '\n' + trimmed;
      } else {
        current = trimmed;
      }
    }
  }

  // Don't forget the last one
  if (current.trim()) {
    segments.push(current.trim());
  }

  // If segmentation failed, treat entire text as one question
  if (segments.length === 0) {
    segments.push(text.trim());
  }

  return segments;
}

/**
 * Classify Bloom level based on action verbs
 */
function classifyBloomLevel(text: string): BloomLevel {
  const lower = text.toLowerCase();

  const bloomKeywords: Record<BloomLevel, string[]> = {
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
      'summarize',
      'translate',
    ],
    Apply: [
      'apply',
      'calculate',
      'change',
      'compute',
      'construct',
      'develop',
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
      'categorize',
      'criticize',
      'differentiate',
      'distinguish',
      'examine',
      'investigate',
      'question',
      'separate',
      'why',
    ],
    Evaluate: [
      'argue',
      'assess',
      'critique',
      'defend',
      'evaluate',
      'judge',
      'justify',
      'prioritize',
      'recommend',
      'support',
      'test',
      'validate',
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

  let highestLevel: BloomLevel = 'Remember';
  let maxMatches = 0;

  for (const [level, keywords] of Object.entries(bloomKeywords) as [BloomLevel, string[]][]) {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      highestLevel = level;
    }
  }

  return highestLevel;
}

/**
 * Calculate linguistic complexity (0.0-1.0)
 * Based on word length, sentence length, vocabulary difficulty
 */
function calculateComplexity(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (wordCount === 0) return 0;

  // Average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;

  // Average sentence length
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
  const jargonCount = technicalTerms.filter(term => text.toLowerCase().includes(term)).length;

  // Flesch-Kincaid simplified (0.0-1.0)
  const wordLengthFactor = Math.min(avgWordLength / 8, 1); // Max 8 letters
  const sentenceLengthFactor = Math.min(avgSentenceLength / 20, 1); // Max 20 words per sentence
  const jargonFactor = Math.min(jargonCount / 5, 1); // Max 5 technical terms

  return Math.min(1.0, wordLengthFactor * 0.4 + sentenceLengthFactor * 0.4 + jargonFactor * 0.2);
}

/**
 * Calculate similarity between two texts (0.0-1.0) using Jaccard index
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Main function: Parse assignment into discrete questions with metadata
 */
export function parseQuestionsFromAssignment(
  assignmentHTML: string,
  _subject?: string,
): ParsedQuestion[] {
  // Clean the HTML first
  const cleanedText = cleanHTML(assignmentHTML);

  // Segment into questions
  const segments = segmentText(cleanedText);

  // Filter to actual questions
  const questionTexts = segments.filter(isQuestion);

  // If no questions found, use all segments
  const finalQuestions = questionTexts.length > 0 ? questionTexts : segments;

  // Parse each question
  const parsedQuestions: ParsedQuestion[] = finalQuestions.map((text, index) => {
    const previousQuestion = index > 0 ? finalQuestions[index - 1] : '';
    const similarity = calculateSimilarity(text, previousQuestion);

    return {
      QuestionId: `question_${index + 1}`,
      Text: text,
      OriginalHTML: assignmentHTML,
      Metadata: {
        BloomLevel: classifyBloomLevel(text),
        LinguisticComplexity: calculateComplexity(text),
        NoveltyScore: 1 - similarity, // Inverse of similarity
        SimilarityToPrevious: similarity,
        ProblemLength: text.split(/\s+/).length,
        MultiPart: isMultiPart(text),
        QuestionType: detectQuestionType(text),
      },
    };
  });

  // Recalculate novelty scores to be average distance from all others
  return recalculateNoveltyScores(parsedQuestions);
}

/**
 * Recalculate novelty based on similarity to ALL other questions
 */
export function recalculateNoveltyScores(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions.map((question, index) => {
    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < questions.length; i++) {
      if (i !== index) {
        const similarity = calculateSimilarity(question.Text, questions[i].Text);
        totalSimilarity += similarity;
        count++;
      }
    }

    const avgSimilarity = count > 0 ? totalSimilarity / count : 0;

    return {
      ...question,
      Metadata: {
        ...question.Metadata,
        SimilarityToPrevious: calculateSimilarity(
          question.Text,
          index > 0 ? questions[index - 1].Text : '',
        ),
        NoveltyScore: Math.min(1.0, 1 - avgSimilarity),
      },
    };
  });
}

/**
 * Format a ParsedQuestion for display to a student
 * Renders clean text without markup
 */
export function formatQuestionForStudent(question: ParsedQuestion): string {
  return question.Text;
}
