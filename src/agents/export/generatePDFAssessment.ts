/**
 * PDF Document Generator for Professional Assessments
 * 
 * Generates PDF files that conform to the professional assessment template:
 * - Serif fonts (Times New Roman), 11-12pt
 * - 1.5x line spacing
 * - Questions kept together on pages (no mid-problem page breaks)
 * - Professional header with metadata
 * - Optional tips with 💡 icon
 * - Proper spacing and layout
 * - Page numbering (Page X of Y)
 */

import jsPDF from 'jspdf';
import {
  AssessmentDocument,
  AssessmentProblem,
  AssessmentSection,
  DEFAULT_PAGE_LAYOUT,
  getAnswerSpaceLines,
  getCheckboxSymbol,
  getTipIcon,
} from '../../types/assessmentTemplate';

/**
 * Generate professional PDF from assessment structure
 */
export async function generateAssessmentPDF(assessment: AssessmentDocument): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margins = DEFAULT_PAGE_LAYOUT.margins;
  const fontSize = DEFAULT_PAGE_LAYOUT.fontSize;

  const leftMargin = margins.left;
  const rightMargin = margins.right;
  const topMargin = margins.top;
  const bottomMargin = margins.bottom;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Set default font
  doc.setFont('Times New Roman', 'normal');
  doc.setFontSize(fontSize);

  let yPosition = topMargin; // Current Y position on page
  const pageHeightUsable = pageHeight - topMargin - bottomMargin;

  // ========================================
  // RENDER HEADER
  // ========================================
  yPosition = renderHeader(
    doc,
    assessment.metadata,
    leftMargin,
    yPosition,
    contentWidth,
    fontSize
  );

  // Add some spacing after header
  yPosition += 6;

  // ========================================
  // RENDER ASSESSMENT CONTENT
  // ========================================
  let globalProblemNumber = 1;

  for (const section of assessment.sections) {
    // Check if we need a page break for section
    if (yPosition > pageHeightUsable * 0.8) {
      doc.addPage();
      yPosition = topMargin;
    }

    // Render section header
    yPosition = renderSectionHeader(
      doc,
      section,
      leftMargin,
      yPosition,
      contentWidth,
      fontSize
    );

    // Render problems in section
    for (const problem of assessment.problems) {
      // Check if entire problem block fits on current page
      const problemHeight = estimateProblemHeight(problem, contentWidth, fontSize);

      if (yPosition + problemHeight > pageHeightUsable) {
        // Start new page for this problem
        doc.addPage();
        yPosition = topMargin;
      }

      // Render problem block
      yPosition = renderProblemBlock(
        doc,
        problem,
        globalProblemNumber,
        leftMargin,
        yPosition,
        contentWidth,
        fontSize
      );

      globalProblemNumber++;
    }
  }

  // Add page numbers at the end
  addPageNumbers(doc, fontSize);

  return doc;
}

/**
 * Render header section with metadata
 */
function renderHeader(
  doc: jsPDF,
  metadata: any,
  leftMargin: number,
  startY: number,
  contentWidth: number,
  fontSize: number
): number {
  let yPos = startY;

  // Title: "QUIZ: Course Material"
  doc.setFont('Times New Roman', 'bold');
  doc.setFontSize(fontSize + 2);
  doc.text(metadata.title, leftMargin + contentWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Metadata line
  doc.setFont('Times New Roman', 'normal');
  doc.setFontSize(fontSize);
  const metadataLine = buildMetadataLine(metadata);
  const metadataLines = doc.splitTextToSize(metadataLine, contentWidth);
  doc.text(metadataLines, leftMargin + contentWidth / 2, yPos, { align: 'center' });
  yPos += metadataLines.length * 5 + 4;

  // Student info fields
  if (metadata.includeStudentInfoFields) {
    doc.setFont('Times New Roman', 'normal');
    doc.setFontSize(fontSize);
    doc.text('Student Name: ________________________     Date: __________', leftMargin, yPos);
    yPos += 8;
  }

  // Divider line
  doc.setDrawColor(150, 150, 150);
  doc.line(leftMargin, yPos, leftMargin + contentWidth, yPos);
  yPos += 6;

  return yPos;
}

/**
 * Build metadata line string
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
 * Render section header
 */
function renderSectionHeader(
  doc: jsPDF,
  section: AssessmentSection,
  leftMargin: number,
  startY: number,
  contentWidth: number,
  fontSize: number
): number {
  let yPos = startY + 4;

  // Section title
  doc.setFont('Times New Roman', 'bold');
  doc.setFontSize(fontSize + 1);
  doc.text(section.title, leftMargin, yPos);
  yPos += 6;

  // Section instructions (if provided)
  if (section.instructions) {
    doc.setFont('Times New Roman', 'italic');
    doc.setFontSize(fontSize);
    const instructionLines = doc.splitTextToSize(section.instructions, contentWidth);
    doc.text(instructionLines, leftMargin, yPos);
    yPos += instructionLines.length * 5 + 2;
  }

  return yPos;
}

/**
 * Render a single problem block
 */
function renderProblemBlock(
  doc: jsPDF,
  problem: AssessmentProblem,
  questionNumber: number,
  leftMargin: number,
  startY: number,
  contentWidth: number,
  fontSize: number
): number {
  let yPos = startY;
  const lineHeight = fontSize * 0.4; // Approximate line height

  // Question number and text
  const questionText = `${questionNumber}. ${problem.questionText}`;
  doc.setFont('Times New Roman', 'normal');
  doc.setFontSize(fontSize);
  const questionLines = doc.splitTextToSize(questionText, contentWidth);
  
  for (const line of questionLines) {
    doc.text(line, leftMargin, yPos);
    yPos += lineHeight;
  }
  yPos += 2;

  // Answer options based on format
  if (problem.format === 'multiple-choice' && problem.multipleChoiceOptions) {
    for (const option of problem.multipleChoiceOptions) {
      const optionText = `${getCheckboxSymbol()} ${option.letter}. ${option.text}`;
      const optionLines = doc.splitTextToSize(optionText, contentWidth - 5);
      
      for (const line of optionLines) {
        doc.text(line, leftMargin + 5, yPos);
        yPos += lineHeight;
      }
      yPos += 1;
    }
  } else if (problem.format === 'true-false') {
    const truefalseText = `${getCheckboxSymbol()} True     ${getCheckboxSymbol()} False`;
    doc.text(truefalseText, leftMargin, yPos);
    yPos += lineHeight;
  } else if (problem.format === 'short-answer' || problem.format === 'free-response') {
    const lineCount = getAnswerSpaceLines(problem.format);
    
    for (let i = 0; i < lineCount; i++) {
      doc.setDrawColor(200, 200, 200);
      doc.line(leftMargin, yPos + lineHeight, leftMargin + contentWidth, yPos + lineHeight);
      yPos += lineHeight + 1;
    }
  }

  yPos += 2;

  // Tip (if present)
  if (problem.hasTip && problem.tipText) {
    doc.setFont('Times New Roman', 'italic');
    const tipText = `${getTipIcon()} Tip: ${problem.tipText}`;
    const tipLines = doc.splitTextToSize(tipText, contentWidth);
    
    for (const line of tipLines) {
      doc.text(line, leftMargin, yPos);
      yPos += lineHeight;
    }
    yPos += 2;
  }

  // Space between problems (24px ≈ 6mm)
  yPos += 4;

  return yPos;
}

/**
 * Estimate height of a problem block (in mm)
 */
function estimateProblemHeight(
  problem: AssessmentProblem,
  _contentWidth: number,
  fontSize: number
): number {
  let height = 0;
  const lineHeight = fontSize * 0.4 + 1; // mm per line

  // Question text (estimate 40 chars per line)
  const questionLines = Math.ceil(problem.questionText.length / 40);
  height += questionLines * lineHeight;

  // Answer options
  if (problem.format === 'multiple-choice' && problem.multipleChoiceOptions) {
    height += problem.multipleChoiceOptions.length * lineHeight;
  } else if (problem.format === 'true-false') {
    height += lineHeight;
  } else if (problem.format === 'short-answer' || problem.format === 'free-response') {
    const lineCount = getAnswerSpaceLines(problem.format);
    height += lineCount * lineHeight;
  }

  // Tip
  if (problem.hasTip && problem.tipText) {
    const tipLines = Math.ceil(problem.tipText.length / 40);
    height += tipLines * lineHeight;
  }

  // Spacing
  height += 6;

  return height;
}

/**
 * Add page numbers in footer
 */
function addPageNumbers(doc: jsPDF, fontSize: number): void {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('Times New Roman', 'normal');
  doc.setFontSize(fontSize - 1);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageNum = `Page ${i} of ${pageCount}`;
    doc.text(pageNum, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
}

/**
 * Download generated assessment as PDF file
 */
export async function downloadAssessmentPDF(
  assessment: AssessmentDocument,
  filename: string
): Promise<void> {
  const pdf = await generateAssessmentPDF(assessment);
  pdf.save(`${filename}.pdf`);
}

/**
 * Export to Blob for further processing
 */
export async function generateAssessmentPDFBlob(assessment: AssessmentDocument): Promise<Blob> {
  const pdf = await generateAssessmentPDF(assessment);
  return Promise.resolve(pdf.output('blob') as Blob);
}
