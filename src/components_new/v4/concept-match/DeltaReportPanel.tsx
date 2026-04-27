import type { ConceptMatchGenerateResponse } from "../../../prism-v4/schema/domain/ConceptMatch";

interface ReviewResult {
  review_sections: Array<{ title: string; explanation: string; example?: string }>;
  summary: string;
}

interface TestResult {
  test_items: Array<{ question_number: number; question_text: string; answer: string; explanation: string }>;
  test_summary: string;
}

type ExtendedGenerateResponse = ConceptMatchGenerateResponse & {
  reviewResult?: ReviewResult;
  testResult?: TestResult;
};

interface Props {
  result: ExtendedGenerateResponse;
}

export function DeltaReportPanel({ result }: Props) {
  const { deltas, original, updated } = result;

  return (
    <div className="cm-panel">
      <p className="cm-kicker">Results</p>
      <h2>Delta Report</h2>

      {deltas.length > 0 ? (
        <ul className="cm-delta-list">
          {deltas.map((d, i) => (
            <li key={i}>
              <span className="cm-delta-target">{d.target}</span>
              {d.description}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#433228" }}>No changes applied.</p>
      )}

      <h3 style={{ marginTop: "1.5rem" }}>Updated Documents</h3>
      <div className="cm-pdf-row">
        {updated.prepPdfUrl && (
          <a href={updated.prepPdfUrl} target="_blank" rel="noopener noreferrer" className="cm-pdf-link">
            New Review
          </a>
        )}
        {updated.testPdfUrl && (
          <a href={updated.testPdfUrl} target="_blank" rel="noopener noreferrer" className="cm-pdf-link">
            New Test
          </a>
        )}
      </div>

      <h3 style={{ marginTop: "1.5rem" }}>Original Documents</h3>
      <div className="cm-pdf-row">
        {original.prepPdfUrl && (
          <a href={original.prepPdfUrl} target="_blank" rel="noopener noreferrer" className="cm-pdf-link">
            Original Prep
          </a>
        )}
        {original.testPdfUrl && (
          <a href={original.testPdfUrl} target="_blank" rel="noopener noreferrer" className="cm-pdf-link">
            Original Test
          </a>
        )}
      </div>

      {/* Inline generated content (when PDFs aren't available yet) */}
      {result.reviewResult && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Generated Review</h3>
          {result.reviewResult.review_sections.map((s, i) => (
            <div key={i} className="cm-evidence-item">
              <h3>{s.title}</h3>
              <p>{s.explanation}</p>
              {s.example && <p style={{ fontStyle: "italic", color: "#9c4d2b" }}>{s.example}</p>}
            </div>
          ))}
        </div>
      )}

      {result.testResult && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Generated Test</h3>
          {result.testResult.test_items.map((item, i) => (
            <div key={i} className="cm-evidence-item">
              <div className="cm-evidence-item-header">
                <span>Q{item.question_number}</span>
              </div>
              <p>{item.question_text}</p>
              <p style={{ fontStyle: "italic", color: "#3a7a3a" }}>Answer: {item.answer}</p>
            </div>
          ))}
        </div>
      )}

      <div className="cm-action-row" style={{ marginTop: "1.5rem" }}>
        <button className="cm-btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
