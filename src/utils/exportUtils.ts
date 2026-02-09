/**
 * Export Utilities
 * 
 * Functions for generating Word and PDF exports of assignments
 * with formatting, styling, and multi-format support
 * 
 * NEW: Professional Assessment Template Support
 * - generateAssessmentWord() for Word exports with template formatting
 * - generateAssessmentPDF() for PDF exports with template formatting
 * - Helper functions for converting GeneratedAssignment to AssessmentDocument
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  downloadAssessmentWord,
  convertGeneratedAssignmentToAssessment,
} from '../agents/export/generateWordAssessment';
import {
  downloadAssessmentPDF,
} from '../agents/export/generatePDFAssessment';

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'json';
  includeMetadata: boolean;
  includeStudentFeedback: boolean;
  includeAnalytics: boolean;
  theme: 'light' | 'dark';
}

/**
 * Generate a plain text export
 */
export const exportToText = (
  assignmentText: string,
  title: string,
  metadata?: any
): string => {
  let output = '';

  // Header
  output += `ASSIGNMENT EXPORT\n`;
  output += `================\n\n`;

  if (title) {
    output += `Title: ${title}\n`;
  }

  if (metadata) {
    output += `Grade Level: ${metadata.gradeLevel || 'N/A'}\n`;
    output += `Subject: ${metadata.subject || 'N/A'}\n`;
    output += `Difficulty: ${metadata.difficulty || 'N/A'}\n`;
    output += `Export Date: ${new Date().toLocaleString()}\n`;
  }

  output += `\n---\n\n`;
  output += `ASSIGNMENT CONTENT\n`;
  output += `------------------\n\n`;
  output += assignmentText;

  return output;
};

/**
 * Generate a JSON export (for re-import or archival)
 */
export const exportToJSON = (
  assignmentText: string,
  title: string,
  tags: any[],
  studentFeedback: any[],
  metadata?: any
): string => {
  const data = {
    exportDate: new Date().toISOString(),
    format: 'assignment-v1',
    assignment: {
      title,
      content: assignmentText,
      metadata,
    },
    analysis: {
      tags,
      studentFeedback,
    },
  };

  return JSON.stringify(data, null, 2);
};

/**
 * Generate a PDF export using html2canvas
 */
export const exportToPDF = async (
  htmlContent: string
): Promise<string | null> => {
  try {
    // Create a temporary div with the content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.padding = '20px';
    tempDiv.style.maxWidth = '800px';
    tempDiv.style.backgroundColor = 'white';
    document.body.appendChild(tempDiv);

    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Clean up
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate dimensions to fit page
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('dataurlstring');
  } catch (error) {
    console.error('PDF export failed:', error);
    return null;
  }
};

/**
 * Download file helper
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generate HTML preview for export
 */
export const generateHTMLPreview = (
  assignmentText: string,
  title: string,
  tags?: any[],
  metadata?: any
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Assignment'}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f9f9f9;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
          color: #5b7cfa;
          border-bottom: 3px solid #5b7cfa;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        .metadata {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f0f4ff;
          border-radius: 6px;
          font-size: 14px;
        }
        .metadata-item {
          display: flex;
          flex-direction: column;
        }
        .metadata-label {
          font-weight: 600;
          color: #5b7cfa;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .metadata-value {
          color: #333;
          margin-top: 4px;
        }
        .content {
          margin-top: 30px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: #5b7cfa;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title || 'Assignment'}</h1>
        
        ${metadata ? `
          <div class="metadata">
            <div class="metadata-item">
              <span class="metadata-label">Grade Level</span>
              <span class="metadata-value">${metadata.gradeLevel || 'N/A'}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Subject</span>
              <span class="metadata-value">${metadata.subject || 'N/A'}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Difficulty</span>
              <span class="metadata-value">${metadata.difficulty || 'N/A'}</span>
            </div>
          </div>
        ` : ''}

        <div class="content">${assignmentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

        ${tags && tags.length > 0 ? `
          <div class="tags">
            ${tags.map((tag) => `<span class="tag">${tag.name || tag}</span>`).join('')}
          </div>
        ` : ''}

        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Export document preview modal content as PDF
 */
export const exportDocumentPreviewPDF = async (
  modalElementId: string,
  filename: string
): Promise<boolean> => {
  try {
    const modalElement = document.getElementById(modalElementId);
    if (!modalElement) {
      console.error('Modal element not found');
      return false;
    }

    // Convert element to canvas
    const canvas = await html2canvas(modalElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate dimensions to fit page
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download the PDF
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Document preview PDF export failed:', error);
    return false;
  }
};

// ============================================================================
// PROFESSIONAL ASSESSMENT TEMPLATE EXPORTS (NEW)
// ============================================================================
// These functions export GeneratedAssignment objects as professional,
// formatted Word and PDF documents following the approved template standard.

/**
 * Export GeneratedAssignment as professional Word document
 * 
 * @param generatedAssignment - The assignment to export
 * @param filename - Output filename (without extension)
 * @returns Promise that resolves when download completes
 * 
 * @example
 * const success = await exportAssignmentAsWord(generatedAssignment, 'Quiz_Genetics');
 */
export const exportAssignmentAsWord = async (
  generatedAssignment: any,
  filename: string
): Promise<void> => {
  try {
    const assessment = convertGeneratedAssignmentToAssessment(generatedAssignment);
    await downloadAssessmentWord(assessment, filename);
  } catch (error) {
    console.error('Failed to export assignment as Word:', error);
    throw error;
  }
};

/**
 * Export GeneratedAssignment as professional PDF document
 * 
 * @param generatedAssignment - The assignment to export
 * @param filename - Output filename (without extension)
 * @returns Promise that resolves when download completes
 * 
 * @example
 * const success = await exportAssignmentAsPDF(generatedAssignment, 'Quiz_Genetics');
 */
export const exportAssignmentAsPDF = async (
  generatedAssignment: any,
  filename: string
): Promise<void> => {
  try {
    const assessment = convertGeneratedAssignmentToAssessment(generatedAssignment);
    await downloadAssessmentPDF(assessment, filename);
  } catch (error) {
    console.error('Failed to export assignment as PDF:', error);
    throw error;
  }
};

/**
 * Get a preview of the professional assessment template
 * 
 * @param generatedAssignment - The assignment to preview
 * @returns HTML string of the preview
 */
export const generateAssessmentPreviewHTML = (generatedAssignment: any): string => {
  const { title, sections, questionCount, estimatedTime, assessmentType } = generatedAssignment;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Times New Roman', Georgia, serif;
          line-height: 1.5;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          background: #f5f5f5;
        }
        .assessment {
          background: white;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 18pt;
        }
        .metadata {
          font-size: 11pt;
          margin-bottom: 10px;
        }
        .student-info {
          font-size: 11pt;
          margin: 15px 0;
        }
        .section-header {
          font-weight: bold;
          font-size: 13pt;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        .problem {
          margin: 20px 0;
          padding: 10px;
          border-left: 3px solid #ddd;
          padding-left: 15px;
          font-size: 11pt;
        }
        .problem-number {
          font-weight: bold;
          display: inline;
        }
        .problem-text {
          display: inline;
        }
        .options {
          margin: 8px 0 8px 20px;
          font-size: 11pt;
        }
        .option {
          margin: 4px 0;
        }
        .answer-lines {
          margin: 10px 0;
          border-bottom: 1px solid #ccc;
          height: 20px;
          margin-bottom: 5px;
        }
        .tip {
          font-style: italic;
          color: #666;
          margin: 10px 0 10px 20px;
          font-size: 10pt;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 10pt;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="assessment">
        <div class="header">
          <h1>${title}</h1>
          <div class="metadata">
            Time: ${estimatedTime} minutes | Questions: ${questionCount} | 
            Assessment Type: ${assessmentType ? assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1) : 'Formative'}
          </div>
          <div class="student-info">
            Student Name: ______________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: __________
          </div>
        </div>
  `;

  let problemNumber = 1;
  for (const section of sections) {
    html += `<div class="section-header">${section.sectionName}</div>`;
    if (section.instructions) {
      html += `<div style="font-style: italic; margin-bottom: 10px;">${section.instructions}</div>`;
    }

    for (const problem of section.problems) {
      html += `<div class="problem">`;
      html += `<span class="problem-number">${problemNumber}.</span> `;
      html += `<span class="problem-text">${problem.problemText}</span>`;

      if (problem.questionFormat === 'multiple-choice' && problem.options) {
        html += `<div class="options">`;
        const letters = ['A', 'B', 'C', 'D', 'E'];
        for (let i = 0; i < problem.options.length; i++) {
          html += `<div class="option">☐ ${letters[i]}. ${problem.options[i]}</div>`;
        }
        html += `</div>`;
      } else if (problem.questionFormat === 'true-false') {
        html += `<div class="options">☐ True &nbsp;&nbsp;&nbsp; ☐ False</div>`;
      } else if (problem.questionFormat === 'short-answer' || problem.questionFormat === 'free-response') {
        const lineCount = problem.questionFormat === 'short-answer' ? 3 : 8;
        for (let i = 0; i < lineCount; i++) {
          html += `<div class="answer-lines"></div>`;
        }
      }

      if (problem.hasTip && problem.tipText) {
        html += `<div class="tip">💡 Tip: ${problem.tipText}</div>`;
      }

      html += `</div>`;
      problemNumber++;
    }
  }

  html += `
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

/**
 * Export assignment as both Word and PDF with single call
 * 
 * @param generatedAssignment - The assignment to export
 * @param baseFilename - Base filename (without extension)
 * @param formats - Array of formats to export ('docx', 'pdf', or both)
 */
export const exportAssignmentAsBundle = async (
  generatedAssignment: any,
  baseFilename: string,
  formats: ('docx' | 'pdf')[] = ['docx', 'pdf']
): Promise<void> => {
  try {
    for (const format of formats) {
      if (format === 'docx') {
        await exportAssignmentAsWord(generatedAssignment, baseFilename);
      } else if (format === 'pdf') {
        await exportAssignmentAsPDF(generatedAssignment, baseFilename);
      }
    }
  } catch (error) {
    console.error('Failed to export assignment bundle:', error);
    throw error;
  }
};

