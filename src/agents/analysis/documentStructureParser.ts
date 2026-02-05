/**
 * Document Structure Parser (MVP - TEMPORARY)
 * 
 * ⚠️  IMPORTANT: This is Phase 1 placeholder parsing.
 * 
 * Will be REPLACED by Claude API in Phase 2 for:
 * - Better multipart question handling (1a, 1b, 1c)
 * - Table and complex structure extraction
 * - Improved novelty scoring across large document sets
 * - Semantic understanding of question intent
 * 
 * Current limitations documented in: src/agents/analysis/README_PARSER_MVP.md
 * For now: use well-formatted documents with clear section headers (Part A, Part B, etc.)
 * 
 * Decomposes documents into hierarchical structure: sections[] → problems[] → subparts[]
 * Extracts comprehensive problem metadata for Asteroid optimization
 */

import { BloomLevel } from './types';

/**
 * Represents a single subpart within a problem
 * (for multi-part questions like 1a, 1b, 1c)
 */
export interface ProblemSubpart {
  id: string;
  text: string;
  bloomLevels: BloomLevel[];
  order: number; // a, b, c... (represented as 0, 1, 2...)
}

/**
 * Represents a discrete problem within a section
 * Contains all core traits required for Asteroid optimization
 */
export interface ExtractedProblem {
  problemId: string;
  sectionId: string;
  text: string;
  
  // Seven core traits for Asteroid lifecycle
  isMultipart: boolean;
  bloomLevels: BloomLevel[]; // Can have multiple levels (e.g., "Understand" + "Analyze")
  problemType: 'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative';
  complexity: number; // 0.0-1.0 (combines linguistic + cognitive load)
  novelty: number; // 0.0-1.0 (1.0 = completely new, 0.0 = exact duplicate)
  similarity: number; // 0.0-1.0 (similarity to known/previous problems)
  hasTips: boolean; // true if problem includes formulas, hints, or guiding instructions
  
  // Detection metadata
  detectedQuestionType: string; // multiple_choice, true_false, matching, fill_in_blank, short_answer, frq_essay, calculation
  questionTypeConfidence: number; // 0.0-1.0 confidence in detection
  
  // Structure metadata
  structure: 'single-part' | 'multi-part';
  length: number; // word count
  subparts: ProblemSubpart[];
  
  // Optional metadata
  questionType?: 'multiple_choice' | 'short_answer' | 'essay' | 'fill_in_blank' | 'matching' | 'other';
  linguisticComplexity?: number; // 0.0-1.0 (Flesch-Kincaid normalized)
  estimatedTimeMinutes?: number;
  relatedConcepts?: string[];
  isAccessibilityRelevant?: boolean;
}

/**
 * Represents a section/chapter within a document
 * Contains multiple problems
 */
export interface DocumentSection {
  sectionId: string;
  title: string;
  content: string;
  problems: ExtractedProblem[];
  orderIndex: number;
  complexity?: number; // Average complexity of section
}

/**
 * Represents the complete hierarchical structure of a parsed document
 */
export interface DocumentStructure {
  documentId: string;
  title: string;
  totalProblems: number;
  totalSubparts: number;
  sections: DocumentSection[];
  overallComplexity: number; // Average across all problems
  bloomDistribution: Record<BloomLevel, number>; // Count per level
  estimatedTotalTimeMinutes: number;
  metadata: {
    subject?: string;
    gradeLevel?: string;
    documentType?: string;
    pageCount?: number;
  };
}

/**
 * Detect if a problem includes tips, formulas, hints, or scaffolding language
 * Returns true if problem contains:
 * - Formulaic expressions (equations, math symbols)
 * - Directive phrases ("Use the formula…", "Remember that…", "Step 1:…")
 * - Scaffolding language or embedded hints
 */
function detectTips(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Formulaic expressions and math symbols
  const formulaPatterns = [
    /\d+\s*[+\-×÷*]/,           // Math operations: 2 + 3, 5 - 2
    /[=≈≠<>≤≥]/,               // Comparison operators
    /\$.*?\$/,                  // LaTeX-style math
    /√|∫|∑|π|∞|Σ|∏/,           // Math symbols
    /x\^2|y\^3|\^[0-9]/,        // Exponents
    /log|sin|cos|tan|ln|exp/,   // Trig/math functions
    /\[.*?\].*?formula/i,       // Formula in brackets
  ];
  
  // Directive phrases and scaffolding language
  const directivePhrases = [
    /use\s+(?:the\s+)?formula/i,
    /use\s+(?:the\s+)?equation/i,
    /use\s+(?:the\s+)?method/i,
    /apply\s+(?:the\s+)?(?:formula|rule|theorem)/i,
    /remember\s+that/i,
    /recall\s+that/i,
    /note\s+that/i,
    /hint\s*:/i,
    /tip\s*:/i,
    /step\s+\d+\s*:/i,
    /first\s*,|second\s*,|third\s*,|finally/i,  // Sequence markers
    /given\s+that/i,
    /assume\s+that/i,
    /for\s+example/i,
    /such\s+as/i,
    /(?:the\s+)?(?:formula|equation|method)\s+is/i,
    /(?:where|in\s+which)/i,  // Variable definitions
    /let\s+[a-z]\s*=/i,        // Variable assignment
    /\\[a-z]+\{/,              // LaTeX commands
  ];
  
  // Check for formulaic expressions
  const hasFormula = formulaPatterns.some(pattern => pattern.test(text));
  
  // Check for directive phrases
  const hasDirective = directivePhrases.some(pattern => pattern.test(lowerText));
  
  // Check for scaffolding indicators (numbered lists, bullet points with instructions)
  const hasScaffolding = /^[\s]*(?:\d+\.|[•\-\*])\s+(?:step|instruction|note|example|hint)/im.test(text);
  
  return hasFormula || hasDirective || hasScaffolding;
}

/**
 * Classify Bloom level based on action verbs in the text
 */
function classifyBloomLevel(text: string): BloomLevel[] {
  const lowerText = text.toLowerCase();
  const bloomLevels: BloomLevel[] = [];

  const bloomVerbs: Record<BloomLevel, string[]> = {
    Remember: ['define', 'describe', 'identify', 'label', 'list', 'match', 'name', 'recall', 'recognize', 'state', 'what', 'when', 'where', 'who'],
    Understand: ['classify', 'compare', 'contrast', 'demonstrate', 'discuss', 'explain', 'illustrate', 'interpret', 'outline', 'paraphrase', 'predict', 'summarize'],
    Apply: ['apply', 'calculate', 'construct', 'develop', 'modify', 'operate', 'practice', 'produce', 'solve', 'use', 'compute', 'discover'],
    Analyze: ['analyze', 'appraise', 'categorize', 'criticize', 'distinguish', 'examine', 'investigate', 'question', 'separate', 'why', 'differentiate'],
    Evaluate: ['argue', 'assess', 'critique', 'defend', 'evaluate', 'judge', 'justify', 'prioritize', 'grade', 'recommend'],
    Create: ['assemble', 'compose', 'construct', 'create', 'design', 'develop', 'formulate', 'generate', 'organize', 'synthesize', 'write'],
  };

  for (const [level, verbs] of Object.entries(bloomVerbs)) {
    if (verbs.some(verb => new RegExp(`\\b${verb}\\b`).test(lowerText))) {
      bloomLevels.push(level as BloomLevel);
    }
  }

  // If no verbs found, default to "Understand"
  return bloomLevels.length > 0 ? bloomLevels : ['Understand'];
}

/**
 * Classify problem type based on content patterns
 */
function classifyProblemType(text: string): 'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative' {
  // Procedural: has steps, "how", "method", "process"
  if (/\b(step|procedure|method|process|algorithm|how to|calculate|compute|solve)\b/i.test(text)) {
    return 'procedural';
  }
  
  // Creative: "create", "design", "compose", "invent"
  if (/\b(create|design|compose|invent|write|develop|build|make)\b/i.test(text)) {
    return 'creative';
  }
  
  // Interpretive: "interpret", "analyze", "discuss", "evaluate", "compare"
  if (/\b(interpret|analyze|discuss|evaluate|compare|contrast|critique|discuss|argue)\b/i.test(text)) {
    return 'interpretive';
  }
  
  // Conceptual: "explain", "describe", "define", "understand"
  if (/\b(explain|describe|define|understand|concept|theory|principle|reason)\b/i.test(text)) {
    return 'conceptual';
  }
  
  return 'mixed';
}

/**
 * Calculate linguistic complexity (0.0-1.0) using Flesch-Kincaid Grade Level
 */
function calculateLinguisticComplexity(text: string): number {
  const words = text.split(/\s+/).length;
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const syllables = text.split(/\b/).reduce((count, word) => {
    // Approximate syllable count (simplified)
    const syllableEstimate = Math.max(1, (word.match(/[aeiou]/gi) || []).length);
    return count + syllableEstimate;
  }, 0);

  // Flesch-Kincaid Grade Level formula
  const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  
  // Normalize to 0.0-1.0 scale (assume K-12 is 0-12, college is 12-16)
  const normalized = Math.min(1.0, Math.max(0.0, gradeLevel / 16));
  return normalized;
}

/**
 * Detect if a text segment is multi-part (has subparts like a, b, c or i, ii, iii)
 */
function detectMultipart(text: string): boolean {
  // Pattern: (a) (b) (c) or a) b) c) or a. b. c. or i) ii) iii)
  const multiPartPattern = /\([a-z]\)|[a-z]\)\s|[a-z]\.\s|\([i]{1,3}\)|\b[i]{1,3}\)/;
  return multiPartPattern.test(text);
}

/**
 * Extract subparts from multi-part problems
 */
function extractSubparts(problemText: string): ProblemSubpart[] {
  const subparts: ProblemSubpart[] = [];
  const lines = problemText.split(/\n+/);
  
  let currentSubpart: { marker: string; text: string; lines: string[] } | null = null;
  
  for (const line of lines) {
    // Match pattern: (a) text or a) text or a. text
    const match = line.match(/^[\s]*[(\[]?([a-z])[.\)]/i);
    
    if (match) {
      // Save previous subpart
      if (currentSubpart) {
        subparts.push({
          id: `${currentSubpart.marker}`,
          text: currentSubpart.lines.join('\n').trim(),
          bloomLevels: classifyBloomLevel(currentSubpart.lines.join(' ')),
          order: currentSubpart.marker.charCodeAt(0) - 'a'.charCodeAt(0),
        });
      }
      
      // Start new subpart
      const cleanedLine = line.replace(/^[\s]*[(\[]?[a-z][.\)]\s*/, '');
      currentSubpart = {
        marker: match[1].toLowerCase(),
        text: cleanedLine,
        lines: [cleanedLine],
      };
    } else if (currentSubpart) {
      currentSubpart.lines.push(line);
    }
  }
  
  // Don't forget the last subpart
  if (currentSubpart) {
    subparts.push({
      id: `${currentSubpart.marker}`,
      text: currentSubpart.lines.join('\n').trim(),
      bloomLevels: classifyBloomLevel(currentSubpart.lines.join(' ')),
      order: currentSubpart.marker.charCodeAt(0) - 'a'.charCodeAt(0),
    });
  }
  
  return subparts;
}

/**
 * Calculate novelty score based on uniqueness of problem content
 * In a real system, this would use vector similarity to a known problem database
 * For now, we use a heuristic based on content length and specificity
 */
function calculateNoveltyScore(problemText: string, otherProblems: string[] = []): number {
  // High novelty: long, specific, unique language
  const hasSpecificNumbers = /\d+/.test(problemText);
  const hasUniqueContext = problemText.length > 100;
  
  // Start with baseline novelty
  let novelty = 0.6;
  
  // Add points for specificity
  if (hasSpecificNumbers) novelty += 0.1;
  if (hasUniqueContext) novelty += 0.2;
  
  // Reduce for similarity to other problems
  if (otherProblems.length > 0) {
    // Simple Jaccard similarity check
    const words = new Set(problemText.toLowerCase().split(/\s+/));
    const similarities = otherProblems.map(other => {
      const otherWords = new Set(other.toLowerCase().split(/\s+/));
      const intersection = new Set([...words].filter(x => otherWords.has(x)));
      const union = new Set([...words, ...otherWords]);
      return intersection.size / union.size;
    });
    
    const maxSimilarity = Math.max(...similarities);
    novelty *= (1 - Math.min(maxSimilarity, 0.5)); // Up to 50% penalty for similarity
  }
  
  return Math.min(1.0, Math.max(0.0, novelty));
}

/**
 * Main function: Parse document into hierarchical structure
 * 
 * ⚠️  MVP IMPLEMENTATION
 * This is a placeholder parser that will be replaced with Claude API in Phase 2.
 * It works for well-formatted documents but has limitations with:
 * - Complex multipart questions (1a, 1b, 1ii, etc.)
 * - Tables and structured layouts
 * - Semantic understanding of problem intent
 * 
 * The API contract (input/output types) will remain the same when AI replaces this.
 * 
 * Extracts sections, problems, and subparts with comprehensive metadata
 */
export async function parseDocumentStructure(
  documentText: string,
  options: {
    documentTitle?: string;
    subject?: string;
    gradeLevel?: string;
    documentType?: string;
  } = {}
): Promise<DocumentStructure> {
  const documentId = `doc-${Date.now()}`;
  const sections: DocumentSection[] = [];
  
  // Split document into sections (markdown headers OR plain text patterns)
  let sectionTexts: string[] = [];
  
  // First try markdown headers
  const markdownSplit = documentText.split(/^#{1,3}\s+/m).filter(s => s.trim());
  
  if (markdownSplit.length > 1) {
    // Markdown headers found
    sectionTexts = markdownSplit;
  } else {
    // Try plain text section patterns: "Part A:", "Part B:", "Section 1:", etc.
    // Find all section header positions and split using those
    const sectionMatches = Array.from(documentText.matchAll(/^(?:Part|Chapter|Section|Unit)\s+[A-Za-z0-9]+[:\s]/gm));
    
    if (sectionMatches.length > 0) {
      // Found section headers - split on them using positions
      for (let i = 0; i < sectionMatches.length; i++) {
        const startPos = sectionMatches[i].index || 0;
        const endPos = (i + 1 < sectionMatches.length) ? (sectionMatches[i + 1].index || 0) : documentText.length;
        const sectionText = documentText.substring(startPos, endPos).trim();
        if (sectionText) {
          sectionTexts.push(sectionText);
        }
      }
    } else {
      // No sections found, treat entire document as one section
      sectionTexts = [documentText];
    }
  }
  
  let allProblems: ExtractedProblem[] = [];
  let bloomDistribution: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };
  
  // Extract section titles from the original document
  const sectionTitleMatches = Array.from(
    documentText.matchAll(/^(?:Part|Chapter|Section|Unit)\s+[A-Za-z0-9]+[:\s].*$/gm)
  ).map(m => m[0]);
  
  for (let sectionIdx = 0; sectionIdx < sectionTexts.length; sectionIdx++) {
    const sectionText = sectionTexts[sectionIdx];
    
    // Use matched title or generate one
    const sectionTitle = sectionTitleMatches[sectionIdx] || `Section ${sectionIdx + 1}`;
    const content = sectionText;
    
    // Extract problems from section
    const problemSegments = extractProblems(content);
    const problems: ExtractedProblem[] = [];
    const problemTexts: string[] = [];
    
    for (let pIdx = 0; pIdx < problemSegments.length; pIdx++) {
      const problemText = problemSegments[pIdx];
      const isMultipart = detectMultipart(problemText);
      const subparts = isMultipart ? extractSubparts(problemText) : [];
      
      const wordCount = problemText.split(/\s+/).length;
      const bloomLevels = classifyBloomLevel(problemText);
      const linguisticComplexity = calculateLinguisticComplexity(problemText);
      const costImplexity = (linguisticComplexity + bloomLevels.length * 0.1) / 2;
      const novelty = calculateNoveltyScore(problemText, problemTexts);
      const similarity = 1 - novelty;
      const { type: detectedType, confidence: typeConfidence } = detectProblemTypeWithConfidence(problemText);
      
      const problem: ExtractedProblem = {
        problemId: `P-${String(sectionIdx + 1).padStart(2, '0')}-${String(pIdx + 1).padStart(2, '0')}`,
        sectionId: `S-${String(sectionIdx + 1).padStart(2, '0')}`,
        text: problemText,
        isMultipart,
        bloomLevels,
        problemType: classifyProblemType(problemText),
        complexity: costImplexity,
        novelty,
        similarity,
        hasTips: detectTips(problemText),
        detectedQuestionType: detectedType,
        questionTypeConfidence: typeConfidence,
        structure: isMultipart ? 'multi-part' : 'single-part',
        length: wordCount,
        subparts,
        linguisticComplexity,
        questionType: undefined, // Could detect more specifically
        estimatedTimeMinutes: Math.ceil((wordCount / 100) * (1 + linguisticComplexity + bloomLevels.length * 0.05)),
      };
      
      problems.push(problem);
      problemTexts.push(problemText);
      allProblems.push(problem);
      
      // Update Bloom distribution
      for (const bloom of bloomLevels) {
        bloomDistribution[bloom]++;
      }
    }
    
    const section: DocumentSection = {
      sectionId: `S-${String(sectionIdx + 1).padStart(2, '0')}`,
      title: sectionTitle,
      content,
      problems,
      orderIndex: sectionIdx,
      complexity: problems.length > 0
        ? problems.reduce((sum, p) => sum + p.complexity, 0) / problems.length
        : 0,
    };
    
    sections.push(section);
  }
  
  // Calculate overall metrics
  const totalSubparts = allProblems.reduce((sum, p) => sum + p.subparts.length, 0);
  const overallComplexity = allProblems.length > 0
    ? allProblems.reduce((sum, p) => sum + p.complexity, 0) / allProblems.length
    : 0;
  const estimatedTotalTimeMinutes = allProblems.reduce((sum, p) => sum + (p.estimatedTimeMinutes || 0), 0);
  
  return {
    documentId,
    title: options.documentTitle || 'Untitled Document',
    totalProblems: allProblems.length,
    totalSubparts,
    sections,
    overallComplexity,
    bloomDistribution,
    estimatedTotalTimeMinutes,
    metadata: {
      subject: options.subject,
      gradeLevel: options.gradeLevel,
      documentType: options.documentType,
    },
  };
}

/**
 * Detect problem type with confidence score
 * Covers: multiple choice, true/false, matching, fill-in-blank, short answer, essay/FRQ, calculation
 */
function detectProblemTypeWithConfidence(text: string): { type: string; confidence: number } {
  let scores: Record<string, number> = {
    multiple_choice: 0,
    true_false: 0,
    matching: 0,
    fill_in_blank: 0,
    short_answer: 0,
    frq_essay: 0,
    calculation: 0,
  };

  // Multiple Choice: A) B) C) D) or (A) (B) (C) (D)
  if (/[A-D]\)[\s]|[(][A-D][)][\s]/i.test(text)) {
    scores.multiple_choice += 0.8;
    if (/^[A-D]\)|[(][A-D][)]/gim.test(text)) {
      scores.multiple_choice += 0.2; // Strong confidence if multiple options
    }
  }

  // True/False
  if (/^(true|false)[.?!]|^\(true\)|^\(false\)/im.test(text) || /true or false|t or f|t\/f/i.test(text)) {
    scores.true_false += 0.9;
  }

  // Matching: "Match the following", "Match each", "Associate"
  if (/match\s+(each|the following|these)|associate|draw a line/i.test(text)) {
    scores.matching += 0.95;
  }

  // Fill-in-the-blank: underscores, dashes, or "fill in"
  if (/_{3,}|[-]{5,}|fill[\s-]?in|blank|^[\s]*___/i.test(text)) {
    scores.fill_in_blank += 0.85;
  }

  // Short Answer: signals like "explain in 1-2 sentences", "briefly", "answer"
  if (/explain in (\d+-?)?\d+ sentences|briefly explain|in your own words|describe|what is|how would|answer|brief|concise/i.test(text)) {
    scores.short_answer += 0.7;
  }

  // FRQ/Essay: "essay", "discuss", "analyze", "evaluate", longer prompts
  if (/essay|discuss|analyze|evaluate|write|argument|response|interpret|reflect|compare and contrast/i.test(text)) {
    scores.frq_essay += 0.75;
    if (text.split(/\s+/).length > 50) {
      scores.frq_essay += 0.15; // Longer text = likely essay
    }
  }

  // Calculation: math symbols, formulas, "calculate", "solve"
  if (/calculate|solve|compute|simplify|find|determine the value|^[\s]*[\d+\-*/()\[\]x^a-z]+[\s]*=|formula|equation/i.test(text)) {
    scores.calculation += 0.8;
    if (/\d+\s*[+\-×÷*]|[=≈≠<>≤≥]|√|π|\^|x\^2/i.test(text)) {
      scores.calculation += 0.15;
    }
  }

  // Find highest confidence type
  let maxConfidence = -1;
  let detectedType = 'short_answer'; // default
  for (const [type, conf] of Object.entries(scores)) {
    if (conf > maxConfidence) {
      maxConfidence = conf;
      detectedType = type;
    }
  }

  return { type: detectedType, confidence: Math.min(1.0, maxConfidence) };
}

/**
 * Extract problems from content text
 * Intelligently detects:
 * - Numbered (1. 2. 3.) or lettered (a, b, c) question markers
 * - FRQ (Free Response Question) patterns
 * - Problems separated by double newlines or explicit markers
 * - Question boundaries based on question marks
 */
function extractProblems(text: string): string[] {
  const lines = text.split(/\n/).filter(line => line.trim());
  const problems: string[] = [];
  let currentProblem = '';

  for (const line of lines) {
    // Check if this line starts a new problem (number or letter marker)
    const isNumberedMarker = /^[\d]+[\.\)]\s|^[\d]+\.\s/.test(line.trim());
    const isLetteredMarker = /^[a-zA-Z][\.\)]\s/.test(line.trim());
    const isBulletMarker = /^[-•*]\s/.test(line.trim());
    const isFRQMarker = /^(FRQ|Free Response Question|Question)\s*[\d]*[\.\:)]?\s/i.test(line.trim());
    
    const isNewProblem = isNumberedMarker || isLetteredMarker || isBulletMarker || isFRQMarker;

    if (isNewProblem && currentProblem.trim()) {
      problems.push(currentProblem.trim());
      currentProblem = line;
    } else if (isBulletMarker && currentProblem.trim() && !isLetteredMarker && !isNumberedMarker) {
      // For bullet points, check if they're main bullets (new problems) vs sub-bullets
      problems.push(currentProblem.trim());
      currentProblem = line;
    } else {
      currentProblem += (currentProblem ? '\n' : '') + line;
    }
  }

  if (currentProblem.trim()) {
    problems.push(currentProblem.trim());
  }

  // If no explicit markers, try splitting on double newlines or long question-like text
  if (problems.length <= 1 && text.trim()) {
    // Try splitting on double line breaks
    const doubleBrokePs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 20);
    if (doubleBrokePs.length > 1) {
      return doubleBrokePs;
    }
    
    // Try splitting on sentences ending with ? followed by a question
    const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
    if (sentences.length > 1) {
      const problemCandidates = sentences
        .map(s => s.trim())
        .filter(s => s.length > 30 && /[?!]/.test(s));
      if (problemCandidates.length > 1) {
        return problemCandidates;
      }
    }
  }

  // If still nothing, treat entire text as one problem
  if (problems.length === 0 && text.trim()) {
    problems.push(text.trim());
  }

  return problems;
}
