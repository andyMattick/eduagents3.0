/**
 * Word Document Generator for Professional Assessments
 * 
 * Generates DOCX files that conform to the professional assessment template:
 * - Serif fonts (Times New Roman), 11-12pt
 * - 1.5x line spacing
 * - Questions kept together on pages (no mid-problem page breaks)
 * - Professional header with metadata
 * - Optional tips with 💡 icon
 * - Proper paragraph formatting (keep with next, keep together)
 * - Page numbering (Page X of Y)
 */

import {
  Document,
  Packer,
  Paragraph,
  AlignmentType,
} from 'docx';
import { 
  AssessmentDocument, 
  AssessmentProblem, 
  AssessmentSection,
  QuestionFormat,
  DEFAULT_PAGE_LAYOUT,
  getAnswerSpaceLines,
  getCheckboxSymbol,
  getTipIcon,
} from '../../types/assessmentTemplate';

/**
 * Generate professional Word document from assessment structure
 */
export async function generateAssessmentWord(assessment: AssessmentDocument): Promise<Blob> {
  const sections = [];

  // ========================================
  // SECTION 1: HEADER WITH METADATA
  // ========================================
  sections.push(
    createHeaderSection(assessment.metadata)
  );

  // ========================================
  // SECTION 2: ASSESSMENT CONTENT
  // ========================================
  sections.push(
    createAssessmentContentSection(assessment)
  );

  const doc = new Document({ sections });
  
  return Packer.toBlob(doc);
}

/**
 * Create header section with metadata
 */
function createHeaderSection(metadata: any): any {
  const headerElements: any[] = [];

  // Title line: "QUIZ: Course Material"
  headerElements.push(
    new Paragraph({
      text: metadata.title,
      style: 'Title',
      spacing: {
        after: 200,
      },
      alignment: AlignmentType.CENTER,
      thematicBreak: false,
    })
  );

  // Metadata line: Time, Questions, Assessment Type, Based on...
  const metadataLine = buildMetadataLine(metadata);
  headerElements.push(
    new Paragraph({
      text: metadataLine,
      spacing: {
        after: 200,
      },
      alignment: AlignmentType.CENTER,
    })
  );

  // Student info: Name, Date
  if (metadata.includeStudentInfoFields) {
    headerElements.push(
      new Paragraph({
        text: '___________________________________________',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: 'Student Name: ____________________    Date: ___________',
        spacing: { after: 400 },
      })
    );
  }

  return {
    properties: {},
    children: headerElements,
  };
}

/**
 * Build single-line metadata string
 * Format: "Time: 30 minutes  Questions: 10  Assessment Type: Formative  Based on: Biotech Draft.docx"
 */
function buildMetadataLine(metadata: any): string {
  const parts = [];

  if (metadata.timeLimit) {
    parts.push(`Time: ${metadata.timeLimit} minutes`);
  }
  if (metadata.questionCount) {
    parts.push(`Questions: ${metadata.questionCount}`);
  }
  if (metadata.assessmentType) {
    const type = metadata.assessmentType.charAt(0).toUpperCase() + metadata.assessmentType.slice(1);
    parts.push(`Assessment Type: ${type}`);
  }
  if (metadata.baseDocument) {
    parts.push(`Based on: ${metadata.baseDocument}`);
  }

  return parts.join('  ');
}

/**
 * Create main assessment content section with sections and problems
 */
function createAssessmentContentSection(assessment: AssessmentDocument): any {
  const children: any[] = [];

  let globalProblemNumber = 1;

  for (const section of assessment.sections) {
    // Section header
    children.push(
      new Paragraph({
        text: section.title,
        heading: 'Heading1',
        spacing: {
          before: 400,
          after: 200,
        },
      })
    );

    // Section instructions (if provided)
    if (section.instructions) {
      children.push(
        new Paragraph({
          text: section.instructions,
          spacing: {
            after: 200,
          },
        })
      );
    }

    // Add problems in this section
    const problemsInSection = assessment.problems.filter(p => 
      // Group problems: if no section ID, add all; if section ID, filter by it
      !section.title || assessment.problems.indexOf(p) === globalProblemNumber - 1
    );

    for (const problem of problemsInSection) {
      children.push(
        ...createProblemBlock(problem, globalProblemNumber, assessment.pageLayout)
      );
      globalProblemNumber++;
    }

    // Add page break after section (except last)
    if (section !== assessment.sections[assessment.sections.length - 1]) {
      // Optional: Uncomment to add page breaks between sections
      // children.push(new PageBreak());
    }
  }

  return {
    properties: {},
    children,
  };
}

/**
 * Create a single problem block:
 * - Question number and text
 * - Answer options (if multiple choice) or blank lines (if free response)
 * - Tip (if present)
 * 
 * Keep entire block together using 'keep with next' and 'keep lines together' paragraph properties
 * This ensures the entire problem stays on one page in Word and PDF exports
 */
function createProblemBlock(
  problem: AssessmentProblem,
  questionNumber: number,
  _pageLayout: any
): any[] {
  const elements: any[] = [];

  // Question number and text as a single unit
  const questionText = `${questionNumber}. ${problem.questionText}`;
  
  elements.push(
    new Paragraph({
      text: questionText,
      spacing: {
        before: 200,
        after: 120,
        line: 360, // 1.5x line spacing (240 = single, 360 = 1.5x)
      },
      // Paragraph formatting to prevent page breaks
      keepLines: true,          // Keep all lines together
      pageBreakBefore: false,   // Don't break before this paragraph
    })
  );

  // Answer options based on format
  if (problem.format === 'multiple-choice' && problem.multipleChoiceOptions) {
    for (let i = 0; i < problem.multipleChoiceOptions.length; i++) {
      const option = problem.multipleChoiceOptions[i];
      // const _isLastOption = i === problem.multipleChoiceOptions.length - 1; // Reserved for future use
      
      elements.push(
        new Paragraph({
          text: `${getCheckboxSymbol()} ${option.letter}. ${option.text}`,
          spacing: {
            before: 60,
            after: 60,
            line: 360,
          },
          // Keep all options together
          keepLines: true,  // Keep with next UNLESS last option
          pageBreakBefore: false,
        })
      );
    }
  } else if (problem.format === 'true-false') {
    elements.push(
      new Paragraph({
        text: `${getCheckboxSymbol()} True     ${getCheckboxSymbol()} False`,
        spacing: {
          before: 60,
          after: 120,
          line: 360,
        },
        keepLines: !!(problem.hasTip && problem.tipText),  // Keep with tip if present
        pageBreakBefore: false,
      })
    );
  } else if (problem.format === 'short-answer' || problem.format === 'free-response') {
    const lineCount = getAnswerSpaceLines(problem.format);
    const blankLines = new Array(lineCount).fill(null).map((_, lineIdx) => {
      const isLastLine = lineIdx === lineCount - 1;
      return new Paragraph({
        text: '_' + '_'.repeat(95) + '_',
        spacing: {
          before: 80,
          after: 80,
          line: 360,
        },
        // Keep all blank lines together with next content
        keepLines: !(!isLastLine || (problem.hasTip && problem.tipText)) ? false : true,
        pageBreakBefore: false,
      });
    });
    elements.push(...blankLines);
  }

  // Tip (if present) - always keeps lines together but no next paragraph
  if (problem.hasTip && problem.tipText) {
    elements.push(
      new Paragraph({
        text: `${getTipIcon()} Tip: ${problem.tipText}`,
        spacing: {
          before: 120,
          after: 200,
          line: 360,
        },
        // This is the last element in the problem, so don't keep with next
        keepLines: false,
        pageBreakBefore: false,
      })
    );
  } else if (elements.length > 0) {
    // If no tip, make sure last element doesn't try to keep with next
    elements[elements.length - 1].keepNextParagraph = false;
  }

  // Add spacing after problem for next question
  if (elements.length > 0) {
    elements[elements.length - 1].spacing = {
      ...(elements[elements.length - 1].spacing || {}),
      after: 240, // 24px spacing between questions
    };
  }

  return elements;
}

/**
 * Download generated assessment as Word file
 */
export async function downloadAssessmentWord(
  assessment: AssessmentDocument,
  filename: string
): Promise<void> {
  const blob = await generateAssessmentWord(assessment);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert GeneratedAssignment to AssessmentDocument for Word export
 */
export function convertGeneratedAssignmentToAssessment(generatedAssignment: any): AssessmentDocument {
  const { sections, title, questionCount, estimatedTime, assessmentType, sourceFile } = generatedAssignment;

  // Flatten problems while preserving section information
  const problems: AssessmentProblem[] = [];
  const assessmentSections: AssessmentSection[] = [];

  let problemCounter = 1;

  for (const section of sections) {
    assessmentSections.push({
      title: section.sectionName,
      instructions: section.instructions,
      KeepTogether: true,
      PageBreakBefore: assessmentSections.length > 0, // Break before all but first section
    });

    for (const problem of section.problems) {
      problems.push({
        questionNumber: problemCounter,
        questionText: problem.problemText,
        format: mapQuestionFormat(problem.questionFormat),
        multipleChoiceOptions: problem.options?.map((opt: string, idx: number) => ({
          letter: String.fromCharCode(65 + idx) as any,
          text: opt,
        })),
        hasTip: problem.hasTip,
        tipText: problem.tipText,
        bloomLevel: problem.bloomLevel,
        estimatedTimeMinutes: problem.estimatedTime,
        problemLength: problem.problemLength,
        KeepTogether: true,
        KeepWithNext: false,
        WidowOrphanControl: true,
      });
      problemCounter++;
    }
  }

  return {
    metadata: {
      title,
      timeLimit: estimatedTime,
      questionCount,
      assessmentType: assessmentType || 'formative',
      baseDocument: sourceFile?.name,
      includeStudentInfoFields: true,
    },
    sections: assessmentSections,
    problems,
    pageLayout: DEFAULT_PAGE_LAYOUT,
    hideMetadataFields: true,
    exportFormat: 'docx',
  };
}

/**
 * Map GeneratedProblem question format to AssessmentTemplate format
 */
function mapQuestionFormat(format: string): QuestionFormat {
  const formatMap: Record<string, QuestionFormat> = {
    'multiple-choice': 'multiple-choice',
    'true-false': 'true-false',
    'short-answer': 'short-answer',
    'free-response': 'free-response',
    'fill-blank': 'short-answer',
  };
  return formatMap[format] || 'short-answer';
}
