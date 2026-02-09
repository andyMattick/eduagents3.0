/**
 * Professional Assessment Template Types & Configuration
 * 
 * Defines the structure and formatting rules for generating professional
 * Word and PDF assessments that conform to the approved template standard.
 * 
 * Standards implemented:
 * - Serif font (Times New Roman, Georgia) 11-12pt
 * - 1.5x line spacing
 * - 24px question spacing
 * - Keep questions together on pages (no page breaks mid-problem)
 * - Professional metadata header
 * - Optional tips with 💡 icon
 * - Paragraph formatting controls (keep with next, keep together)
 */

/**
 * Question Format: Determines answer space and option structure
 */
export type QuestionFormat =
  | 'multiple-choice' // ☐ A, B, C, D
  | 'true-false' // ☐ True ☐ False
  | 'short-answer' // 3-5 blank lines
  | 'free-response'; // 6-10 blank lines

/**
 * Page Layout Configuration
 */
export interface PageLayoutConfig {
  fontFamily: 'Georgia' | 'TimesNewRoman' | 'Garamond';
  fontSize: 11 | 12; // points
  lineSpacing: 1.5 | 2.0; // multiplier
  questionSpacing: 24; // pixels/points
  margins: {
    top: number; // mm
    bottom: number; // mm
    left: number; // mm
    right: number; // mm
  };
  pageNumbering: {
    enabled: boolean;
    format: 'Page X of Y';
    position: 'footer';
  };
}

/**
 * Professional Assessment Header Metadata
 */
export interface AssessmentHeaderMetadata {
  title: string; // e.g., "QUIZ: Course Material"
  timeLimit?: number; // minutes
  questionCount: number;
  assessmentType: 'formative' | 'summative'; // e.g., "Formative", "Summative"
  baseDocument?: string; // e.g., "Biotech Draft.docx"
  includeStudentInfoFields: boolean; // "Student Name: ___, Date: ___"
}

/**
 * Section Configuration within Assignment
 */
export interface AssessmentSection {
  title: string; // e.g., "Section 1: Genetics Basics"
  instructions?: string; // Optional section-specific instructions
  KeepTogether: boolean; // Word paragraph control
  PageBreakBefore: boolean; // Only between major sections, not mid-problem
}

/**
 * Problem Block: Includes question text, options, tips, and answer space
 */
export interface AssessmentProblem {
  // Core content
  questionNumber: number;
  questionText: string;
  format: QuestionFormat;

  // Multiple-choice specific
  multipleChoiceOptions?: Array<{
    letter: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }>;

  // Tip/hint (optional)
  hasTip: boolean;
  tipText?: string; // Displayed in italic with 💡 icon

  // Metadata (for internal use, hidden from student)
  bloomLevel?: 1 | 2 | 3 | 4 | 5 | 6; // 1=Remember, 6=Create
  estimatedTimeMinutes?: number;
  problemLength?: number; // word count

  // Layout controls
  KeepTogether: boolean; // Keep entire problem block on same page
  KeepWithNext: boolean; // Keep question with answer space (Word)
  WidowOrphanControl: boolean; // Prevent single lines on new page
}

/**
 * Complete Assessment Document Structure
 */
export interface AssessmentDocument {
  metadata: AssessmentHeaderMetadata;
  sections: AssessmentSection[];
  problems: AssessmentProblem[];
  pageLayout: PageLayoutConfig;
  
  // Rendering hints
  hideMetadataFields?: boolean; // Hide Bloom/complexity from student view
  exportFormat?: 'docx' | 'pdf'; // Target format
}

/**
 * Default Page Layout for Professional Assessments
 */
export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  fontFamily: 'TimesNewRoman',
  fontSize: 12,
  lineSpacing: 1.5,
  questionSpacing: 24,
  margins: {
    top: 20, // mm
    bottom: 20, // mm
    left: 20, // mm
    right: 20, // mm
  },
  pageNumbering: {
    enabled: true,
    format: 'Page X of Y',
    position: 'footer',
  },
};

/**
 * Helper: Calculate answer space (blank lines) based on question format
 */
export function getAnswerSpaceLines(format: QuestionFormat): number {
  switch (format) {
    case 'multiple-choice':
      return 0; // Options provided
    case 'true-false':
      return 0; // Options provided
    case 'short-answer':
      return 3; // 3-5 lines
    case 'free-response':
      return 8; // 6-10 lines
    default:
      return 5;
  }
}

/**
 * Helper: Create checkbox symbol for Word/PDF
 */
export function getCheckboxSymbol(): string {
  return '☐'; // Unicode checkbox
}

/**
 * Helper: Get tip icon
 */
export function getTipIcon(): string {
  return '💡';
}

/**
 * Paragraph formatting rules for Word document
 */
export interface WordParagraphStyle {
  keepWithNext: boolean;
  keepTogether: boolean;
  widowControl: boolean;
  spacingBefore?: number; // points
  spacingAfter?: number; // points
}

/**
 * Standard paragraph styles for assessment elements
 */
export const WORD_PARAGRAPH_STYLES: Record<string, WordParagraphStyle> = {
  questionNumber: {
    keepWithNext: true,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 12,
    spacingAfter: 6,
  },
  questionText: {
    keepWithNext: true,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 0,
    spacingAfter: 6,
  },
  answerOption: {
    keepWithNext: true,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 3,
    spacingAfter: 3,
  },
  answerSpace: {
    keepWithNext: false,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 6,
    spacingAfter: 12,
  },
  tipText: {
    keepWithNext: false,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 6,
    spacingAfter: 12,
  },
  sectionHeader: {
    keepWithNext: true,
    keepTogether: true,
    widowControl: true,
    spacingBefore: 24,
    spacingAfter: 12,
  },
};
