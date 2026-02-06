import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import './ExportButtons.css';
import { AssignmentContent } from './DocumentReviewExport';

interface ExportButtonsProps {
  assignment: AssignmentContent;
  includeMetadata?: boolean;
  includeTips?: boolean;
  includeAnalytics?: boolean;
  analyticsData?: {
    bloomHistogram?: Record<string, number>;
    averageComplexity?: number;
    totalEstimatedTime?: number;
    studentFeedbackSummary?: string;
  };
}

/**
 * Export Buttons Component
 * Provides PDF and Word export functionality for assignments
 */
export function ExportButtons({
  assignment,
  includeMetadata = true,
  includeTips = true,
  includeAnalytics = false,
  analyticsData,
}: ExportButtonsProps) {
  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(assignment.title, margin, yPosition);
      yPosition += 10;

      // Metadata
      if (includeMetadata) {
        pdf.setFontSize(10);
        pdf.setFont('Helvetica', 'normal');

        if (assignment.gradeLevel) {
          pdf.text(`Grade Level: ${assignment.gradeLevel}`, margin, yPosition);
          yPosition += 5;
        }
        if (assignment.type) {
          pdf.text(`Type: ${assignment.type}`, margin, yPosition);
          yPosition += 5;
        }
        if (assignment.topic) {
          pdf.text(`Topic: ${assignment.topic}`, margin, yPosition);
          yPosition += 5;
        }
        if (assignment.metadata?.totalTime) {
          pdf.text(`Estimated Time: ${assignment.metadata.totalTime} minutes`, margin, yPosition);
          yPosition += 5;
        }

        yPosition += 5;
      }

      // Problems
      pdf.setFontSize(12);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('Problems', margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');

      assignment.problems.forEach((problem, index) => {
        // Problem number and text
        const problemNumber = `${index + 1}. `;
        const maxWidth = contentWidth - 10;
        const splitProblem = pdf.splitTextToSize(problem.text, maxWidth);

        // Check if we need a new page
        if (yPosition + splitProblem.length * 5 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFont('Helvetica', 'bold');
        pdf.text(problemNumber, margin, yPosition);
        pdf.setFont('Helvetica', 'normal');

        splitProblem.forEach((line: string, lineIndex: number) => {
          if (lineIndex === 0) {
            pdf.text(line, margin + 7, yPosition);
          } else {
            pdf.text(line, margin + 7, yPosition + lineIndex * 5);
          }
        });

        yPosition += splitProblem.length * 5 + 3;

        // Tips
        if (includeTips && problem.tips) {
          const splitTips = pdf.splitTextToSize(`💡 ${problem.tips}`, contentWidth - 10);
          pdf.setFont('Helvetica', 'italic');
          pdf.setTextColor(184, 134, 11); // Dark gold

          splitTips.forEach((line: string, lineIndex: number) => {
            pdf.text(line, margin + 5, yPosition + lineIndex * 5);
          });

          yPosition += splitTips.length * 5 + 2;
          pdf.setTextColor(0);
          pdf.setFont('Helvetica', 'normal');
        }

        yPosition += 3;
      });

      // Analytics section
      if (includeAnalytics && analyticsData) {
        pdf.addPage();
        yPosition = margin;

        pdf.setFontSize(14);
        pdf.setFont('Helvetica', 'bold');
        pdf.text('📊 Analytics & Insights', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('Helvetica', 'normal');

        if (analyticsData.bloomHistogram) {
          pdf.text('Bloom Level Distribution:', margin, yPosition);
          yPosition += 5;

          Object.entries(analyticsData.bloomHistogram).forEach(([level, count]) => {
            pdf.text(`  ${level}: ${count} problems`, margin + 5, yPosition);
            yPosition += 4;
          });

          yPosition += 2;
        }

        if (analyticsData.averageComplexity !== undefined) {
          pdf.text(
            `Average Complexity: ${(analyticsData.averageComplexity * 100).toFixed(1)}%`,
            margin,
            yPosition
          );
          yPosition += 5;
        }

        if (analyticsData.totalEstimatedTime) {
          pdf.text(`Total Estimated Time: ${analyticsData.totalEstimatedTime} minutes`, margin, yPosition);
          yPosition += 5;
        }
      }

      // Save PDF
      pdf.save(`${assignment.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportWord = async () => {
    try {
      const sections = [];

      // Title Paragraph
      sections.push(
        new Paragraph({
          text: assignment.title,
          style: 'Heading1',
          spacing: { after: 200 },
        })
      );

      // Metadata
      if (includeMetadata) {
        if (assignment.gradeLevel || assignment.type || assignment.topic) {
          const metadataTable = new Table({
            width: { size: 100, type: 'pct' },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('Property')],
                    shading: { fill: 'E7E6E6' },
                  }),
                  new TableCell({
                    children: [new Paragraph('Value')],
                    shading: { fill: 'E7E6E6' },
                  }),
                ],
              }),
              ...(assignment.gradeLevel
                ? [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph('Grade Level')],
                        }),
                        new TableCell({
                          children: [new Paragraph(assignment.gradeLevel)],
                        }),
                      ],
                    }),
                  ]
                : []),
              ...(assignment.type
                ? [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph('Type')],
                        }),
                        new TableCell({
                          children: [new Paragraph(assignment.type)],
                        }),
                      ],
                    }),
                  ]
                : []),
              ...(assignment.topic
                ? [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph('Topic')],
                        }),
                        new TableCell({
                          children: [new Paragraph(assignment.topic)],
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          });

          sections.push(metadataTable);
          sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }
      }

      // Problems
      sections.push(
        new Paragraph({
          text: 'Problems',
          style: 'Heading2',
          spacing: { before: 200, after: 100 },
        })
      );

      assignment.problems.forEach((problem, index) => {
        sections.push(
          new Paragraph({
            text: `${index + 1}. ${problem.text}`,
            spacing: { after: 100 },
            indent: { left: 200 },
          })
        );

        if (includeTips && problem.tips) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `💡 Tip: ${problem.tips}`,
                  italics: true,
                  color: '666666',
                }),
              ],
              spacing: { after: 100 },
              indent: { left: 400 },
            })
          );
        }

        if (includeTips && problem.bloomLevel) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Bloom Level: ${problem.bloomLevel}`,
                  size: 18,
                  color: '999999',
                }),
              ],
              spacing: { after: 150 },
              indent: { left: 400 },
            })
          );
        }
      });

      // Analytics
      if (includeAnalytics && analyticsData) {
        sections.push(
          new Paragraph({
            text: 'Analytics & Insights',
            style: 'Heading2',
            spacing: { before: 400, after: 100 },
            pageBreakBefore: true,
          })
        );

        if (analyticsData.bloomHistogram) {
          sections.push(
            new Paragraph({
              text: 'Bloom Level Distribution',
              style: 'Heading3',
              spacing: { before: 100, after: 100 },
            })
          );

          const bloomRows = Object.entries(analyticsData.bloomHistogram).map(
            ([level, count]) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(level)],
                  }),
                  new TableCell({
                    children: [new Paragraph(String(count))],
                  }),
                ],
              })
          );

          sections.push(
            new Table({
              width: { size: 100, type: 'pct' },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('Level')],
                      shading: { fill: 'E7E6E6' },
                    }),
                    new TableCell({
                      children: [new Paragraph('Count')],
                      shading: { fill: 'E7E6E6' },
                    }),
                  ],
                }),
                ...bloomRows,
              ],
            })
          );

          sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }

        if (analyticsData.averageComplexity !== undefined) {
          sections.push(
            new Paragraph({
              text: `Average Complexity: ${(analyticsData.averageComplexity * 100).toFixed(1)}%`,
              spacing: { after: 100 },
            })
          );
        }

        if (analyticsData.totalEstimatedTime) {
          sections.push(
            new Paragraph({
              text: `Total Estimated Time: ${analyticsData.totalEstimatedTime} minutes`,
              spacing: { after: 100 },
            })
          );
        }

        if (analyticsData.studentFeedbackSummary) {
          sections.push(
            new Paragraph({
              text: `Feedback: ${analyticsData.studentFeedbackSummary}`,
              spacing: { after: 100 },
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            children: sections,
          },
        ],
      });

      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${assignment.title.replace(/\s+/g, '_')}.docx`);
      });
    } catch (error) {
      console.error('Error exporting Word document:', error);
      alert('Failed to export Word document. Please try again.');
    }
  };

  return (
    <div className="export-buttons">
      <button className="export-button pdf-button" onClick={handleExportPDF} title="Export as PDF">
        <span className="button-icon">📄</span>
        PDF
      </button>
      <button className="export-button word-button" onClick={handleExportWord} title="Export as Word document">
        <span className="button-icon">📝</span>
        Word
      </button>
    </div>
  );
}
