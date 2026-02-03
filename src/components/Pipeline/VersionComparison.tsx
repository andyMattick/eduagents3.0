import { useState, useRef } from 'react';
import { TagChange, VersionAnalysis } from '../../types/pipeline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

interface Props {
  original: string;
  rewritten: string;
  summary: string;
  tagChanges: TagChange[];
  versionAnalysis?: VersionAnalysis | null;
  onReset: () => void;
  onRewrite?: (suggestions: string) => Promise<void>;
  onReanalyzeStudents?: () => Promise<void>;
}

export function VersionComparison({
  original,
  rewritten,
  summary,
  tagChanges,
  versionAnalysis,
  onReset,
  onRewrite,
  onReanalyzeStudents,
}: Props) {
  const [showStudentView, setShowStudentView] = useState(false);
  const [showHTMLView, setShowHTMLView] = useState(false);
  const [showWordPreview, setShowWordPreview] = useState(false);
  const [wordPreviewContent, setWordPreviewContent] = useState<JSX.Element | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [teacherSuggestions, setTeacherSuggestions] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Export to PDF with HTML rendering
  const exportStudentViewPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Render the HTML content to canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210 - 20; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Add title
      pdf.setFontSize(16);
      pdf.text('Assignment - Student View', 10, position);
      position += 10;

      // Add image
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= 297 - position; // A4 height minus title

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save('assignment-student-view.pdf');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Helper function to convert HTML to Word paragraphs with better formatting
  const convertHTMLToWordElements = (html: string): (Paragraph | any)[] => {
    const paragraphs: (Paragraph | any)[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const processNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          paragraphs.push(new Paragraph({
            text: text,
            spacing: { line: 360, after: 120 },
          }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const text = el.textContent || '';
          if (text.trim()) {
            const headingLevels: Record<string, HeadingLevel> = {
              'h1': HeadingLevel.HEADING_1,
              'h2': HeadingLevel.HEADING_2,
              'h3': HeadingLevel.HEADING_3,
              'h4': HeadingLevel.HEADING_4,
              'h5': HeadingLevel.HEADING_5,
              'h6': HeadingLevel.HEADING_6,
            };
            paragraphs.push(new Paragraph({
              text: text,
              heading: headingLevels[tagName],
              spacing: { before: 240, after: 120, line: 360 },
            }));
          }
        } else if (tagName === 'p') {
          const text = el.textContent || '';
          if (text.trim()) {
            paragraphs.push(new Paragraph({
              text: text,
              spacing: { line: 360, after: 120 },
            }));
          }
        } else if (tagName === 'br') {
          paragraphs.push(new Paragraph({ text: '', spacing: { after: 60 } }));
        } else if (tagName === 'ul' || tagName === 'ol') {
          const items = el.querySelectorAll('li');
          items.forEach((li, index) => {
            const text = li.textContent || '';
            const bullet = tagName === 'ol' ? `${index + 1}. ` : '• ';
            paragraphs.push(new Paragraph({
              text: bullet + text,
              spacing: { line: 360, after: 80 },
              indent: { left: 720 },
            }));
          });
        } else if (tagName === 'li') {
          // Skip - handled by ul/ol
        } else if (['div', 'span', 'article', 'section'].includes(tagName)) {
          // Process children
          node.childNodes.forEach(child => processNode(child));
        } else {
          // For other tags, process children
          node.childNodes.forEach(child => processNode(child));
        }
      }
    };

    doc.body.childNodes.forEach(node => processNode(node));
    return paragraphs;
  };

  // Preview Word export before downloading
  const previewWordExport = async () => {
    try {
      const elements = convertHTMLToWordElements(rewritten);
      const previewHTML = (
        <div style={{ fontFamily: 'Calibri, sans-serif', lineHeight: '1.5', color: '#333' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Assignment - Student View</h1>
          {elements.map((elem, idx) => {
            const text = elem.text || '';
            const isHeading = elem.heading !== undefined;
            
            if (isHeading) {
              const sizes: Record<number, string> = {
                1: '24px', 2: '20px', 3: '18px', 4: '16px', 5: '14px', 6: '12px'
              };
              return (
                <h2
                  key={idx}
                  style={{
                    fontSize: sizes[elem.heading] || '16px',
                    fontWeight: 'bold',
                    marginTop: '16px',
                    marginBottom: '8px',
                  }}
                >
                  {text}
                </h2>
              );
            }
            return (
              <p key={idx} style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {text}
              </p>
            );
          })}
        </div>
      );
      setWordPreviewContent(previewHTML);
      setShowWordPreview(true);
    } catch (error) {
      console.error('Word preview error:', error);
      alert('Failed to generate preview.');
    }
  };

  // Export to Word with proper formatting
  const exportStudentViewWord = async () => {
    try {
      const docElements: (Paragraph | any)[] = [];

      // Title
      docElements.push(
        new Paragraph({
          text: 'Assignment - Student View',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 240 },
        })
      );

      // Convert HTML with better formatting
      const elements = convertHTMLToWordElements(rewritten);
      docElements.push(...elements);

      // Create and download Word document
      const wordDoc = new Document({
        sections: [
          {
            children: docElements,
          },
        ],
      });

      const blob = await Packer.toBlob(wordDoc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'assignment-student-view.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Word export error:', error);
      alert('Failed to export Word document. Please try again.');
    }
  };

  // Handle rewrite with teacher suggestions
  const handleRewriteWithSuggestions = async () => {
    if (!teacherSuggestions.trim()) {
      alert('Please enter your suggestions before rewriting.');
      return;
    }

    if (!onRewrite) {
      alert('Rewrite functionality not available.');
      return;
    }

    setIsRewriting(true);
    try {
      await onRewrite(teacherSuggestions);
      setTeacherSuggestions('');
      alert('Assignment rewritten with your suggestions!');
    } catch (error) {
      console.error('Rewrite error:', error);
      alert('Failed to rewrite. Please try again.');
    } finally {
      setIsRewriting(false);
    }
  };

  // Handle re-analyzing students with updated assignment
  const handleReanalyzeStudents = async () => {
    if (!onReanalyzeStudents) {
      alert('Re-analyze functionality not available.');
      return;
    }

    setIsReanalyzing(true);
    try {
      await onReanalyzeStudents();
      alert('Student analysis updated!');
    } catch (error) {
      console.error('Re-analyze error:', error);
      alert('Failed to re-analyze. Please try again.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (showStudentView) {
    const hasHTML = /<[^>]*>/.test(rewritten);

    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>📚 Student View</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          This is how students will see the final assignment. Print-friendly and ready for distribution.
        </p>

        {/* Print-Friendly Assignment View */}
        <div
          ref={contentRef}
          style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            marginBottom: '16px',
            minHeight: '400px',
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#333',
            fontFamily: 'Georgia, serif',
            pageBreakInside: 'avoid',
          }}
        >
          {hasHTML ? (
            <div
              dangerouslySetInnerHTML={{ __html: rewritten }}
              style={{
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#333',
              }}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {rewritten}
            </div>
          )}
        </div>

        {/* Answer Lines for Students */}
        {!hasHTML && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #e0e0e0',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Answer Space</h3>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ marginBottom: '40px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#666' }}>Question {i}:</div>
                <div
                  style={{
                    borderBottom: '2px solid #333',
                    minHeight: '100px',
                    marginBottom: '20px',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPDFPreview(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            👁️ Preview PDF
          </button>
          <button
            onClick={previewWordExport}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            👁️ Preview Word Export
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🖨️ Print
          </button>
          <button
            onClick={() => setShowStudentView(false)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ← Back to Comparison
          </button>
        </div>

        {/* Word Preview Modal */}
        {showWordPreview && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '24px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>📄 Word Export Preview</h3>
                <button
                  onClick={() => setShowWordPreview(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  border: '1px solid #ddd',
                  padding: '20px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  backgroundColor: '#f9f9f9',
                  minHeight: '300px',
                }}
              >
                {wordPreviewContent}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowWordPreview(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowWordPreview(false);
                    exportStudentViewWord();
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  ✓ Download Word File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {showPDFPreview && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: '900px',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '24px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>📄 PDF Preview</h3>
                <button
                  onClick={() => setShowPDFPreview(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  border: '2px solid #ddd',
                  padding: '20px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  backgroundColor: '#f9f9f9',
                  minHeight: '400px',
                }}
              >
                {contentRef.current && (
                  <div
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      color: '#333',
                    }}
                  >
                    {contentRef.current.innerHTML && (
                      <div dangerouslySetInnerHTML={{ __html: contentRef.current.innerHTML }} />
                    )}
                  </div>
                )}
                {!contentRef.current && (
                  <p style={{ color: '#999' }}>Loading preview...</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowPDFPreview(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => {
                    setShowPDFPreview(false);
                    exportStudentViewPDF();
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  ✓ Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '4px' }}>Step 4: Review Assignment & Export</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Compare original and rewritten versions. Download or start over.
        </p>
      </div>

      {/* View Toggle */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>View Mode:</span>
        <button
          onClick={() => setShowHTMLView(false)}
          style={{
            padding: '6px 12px',
            backgroundColor: !showHTMLView ? '#007bff' : '#e9ecef',
            color: !showHTMLView ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: showHTMLView ? 'normal' : 'bold',
          }}
        >
          📖 Rendered View
        </button>
        <button
          onClick={() => setShowHTMLView(true)}
          style={{
            padding: '6px 12px',
            backgroundColor: showHTMLView ? '#007bff' : '#e9ecef',
            color: showHTMLView ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: showHTMLView ? 'bold' : 'normal',
          }}
        >
          {'<>'} HTML View
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333' }}>Summary of Changes</h3>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#e8f4f8',
            border: '1px solid #b3e5fc',
            borderRadius: '6px',
            color: '#01579b',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: 0 }}>{summary}</p>
        </div>
      </div>

      {versionAnalysis && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#333' }}>Overall Metrics</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Engagement Score Change
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: versionAnalysis.engagementScoreDelta > 0 ? '#28a745' : '#dc3545' }}>
                {versionAnalysis.engagementScoreDelta > 0 ? '+' : ''}
                {(versionAnalysis.engagementScoreDelta * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {versionAnalysis.originalEngagementScore.toFixed(2)} → {versionAnalysis.rewrittenEngagementScore.toFixed(2)}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Reading Time Change
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: versionAnalysis.timeToReadDelta < 0 ? '#28a745' : '#ffc107' }}>
                {versionAnalysis.timeToReadDelta < 0 ? '' : '+'}
                {Math.round(versionAnalysis.timeToReadDelta)}s
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {Math.round(versionAnalysis.originalTimeToRead)}s → {Math.round(versionAnalysis.rewrittenTimeToRead)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {tagChanges.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#333' }}>Tag Changes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {tagChanges.map((change) => (
              <div
                key={change.tag}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{change.tag}</h4>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: change.delta > 0 ? '#28a745' : change.delta < 0 ? '#dc3545' : '#999',
                    marginBottom: '8px',
                  }}
                >
                  {change.delta > 0 ? '↑' : change.delta < 0 ? '↓' : '→'} {(change.delta * 100).toFixed(0)}%
                </div>
                {change.fromConfidence !== undefined && change.toConfidence !== undefined && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {(change.fromConfidence * 100).toFixed(0)}% → {(change.toConfidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h3 style={{ color: '#333' }}>Original Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#555',
              whiteSpace: showHTMLView ? 'pre-wrap' : 'normal',
              wordWrap: 'break-word',
            }}
          >
            {showHTMLView ? (
              <code style={{ fontSize: '11px', color: '#d73a49', fontFamily: 'monospace' }}>
                {original}
              </code>
            ) : /<[^>]*>/.test(original) ? (
              <div dangerouslySetInnerHTML={{ __html: original }} />
            ) : (
              original
            )}
          </div>
        </div>

        <div>
          <h3 style={{ color: '#333' }}>Rewritten Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f8f0',
              border: '2px solid #28a745',
              borderRadius: '6px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: '1.6',
              color: showHTMLView ? '#d73a49' : '#2d5016',
              whiteSpace: showHTMLView ? 'pre-wrap' : 'normal',
              wordWrap: 'break-word',
            }}
          >
            {showHTMLView ? (
              <code style={{ fontSize: '11px', color: '#d73a49', fontFamily: 'monospace' }}>
                {rewritten}
              </code>
            ) : /<[^>]*>/.test(rewritten) ? (
              <div dangerouslySetInnerHTML={{ __html: rewritten }} />
            ) : (
              rewritten
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setShowStudentView(true)}
          style={{
            padding: '10px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          👁️ View Student Version
        </button>
        {onReanalyzeStudents && (
          <button
            onClick={handleReanalyzeStudents}
            disabled={isReanalyzing}
            style={{
              padding: '10px 24px',
              backgroundColor: isReanalyzing ? '#ccc' : '#ffc107',
              color: isReanalyzing ? '#666' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isReanalyzing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {isReanalyzing ? '⏳ Re-analyzing...' : '🔄 Re-analyze Students'}
          </button>
        )}
        <button
          onClick={onReset}
          style={{
            padding: '10px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Start Over
        </button>
      </div>

      {/* Teacher Suggestions Section */}
      {onRewrite && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>💡 Teacher Suggestions</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
            Have feedback or changes for the assignment? Describe them below and we'll rewrite it based on your suggestions.
          </p>
          <textarea
            value={teacherSuggestions}
            onChange={(e) => setTeacherSuggestions(e.target.value)}
            placeholder="Example: Make the questions more challenging, add more emphasis on critical thinking, clarify the rubric criteria..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              color: '#333',
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />
          <button
            onClick={handleRewriteWithSuggestions}
            disabled={isRewriting || !teacherSuggestions.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isRewriting || !teacherSuggestions.trim() ? '#ccc' : '#007bff',
              color: isRewriting || !teacherSuggestions.trim() ? '#666' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRewriting || !teacherSuggestions.trim() ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {isRewriting ? '⏳ Rewriting...' : '✏️ Rewrite with Suggestions'}
          </button>
        </div>
      )}
    </div>
  );
}
