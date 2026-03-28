import { useEffect, useState } from "react";

import type { IntentProduct, IntentProductPayload } from "../../prism-v4/schema/integration/IntentProduct";
import { buildInstructionalUnitOverrideId } from "../../prism-v4/teacherFeedback";
import { cleanupProductPayload } from "./utils/cleanup";

function groupLessonScaffolds(scaffolds: Array<{ concept: string; level: "low" | "medium" | "high"; strategy: string }>) {
  return scaffolds.reduce<Map<string, typeof scaffolds>>((map, scaffold) => {
    const bucket = map.get(scaffold.concept) ?? [];
    bucket.push(scaffold);
    map.set(scaffold.concept, bucket);
    return map;
  }, new Map());
}

function parseConceptList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toConceptWeights(concepts: string[]) {
  return concepts.reduce<Record<string, number>>((accumulator, concept) => {
    accumulator[concept] = 1;
    return accumulator;
  }, {});
}

function InstructionalMapConceptEditor(props: {
  sessionId: string;
  product: Extract<IntentProductPayload, { kind: "instructional-map" }>;
  onRefresh: () => Promise<void>;
}) {
  const { sessionId, product, onRefresh } = props;
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(product.unitConceptAlignment.map((entry) => [entry.unitId, entry.concepts.join(", ")])));
  const [provenance, setProvenance] = useState<Record<string, "inferred" | "teacher-adjusted">>({});
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
  const [statusByUnitId, setStatusByUnitId] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(product.unitConceptAlignment.map((entry) => [entry.unitId, entry.concepts.join(", ")])));
  }, [product]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProvenance() {
      const results = await Promise.all(product.unitConceptAlignment.map(async (entry) => {
        try {
          const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(buildInstructionalUnitOverrideId(sessionId, entry.unitId))}`);
          if (!response.ok) {
            return [entry.unitId, "inferred"] as const;
          }
          const payload = await response.json().catch(() => ({}));
          return [entry.unitId, payload?.overrides?.concepts ? "teacher-adjusted" : "inferred"] as const;
        } catch {
          return [entry.unitId, "inferred"] as const;
        }
      }));

      if (!isCancelled) {
        setProvenance(Object.fromEntries(results));
      }
    }

    void loadProvenance();
    return () => {
      isCancelled = true;
    };
  }, [product, sessionId]);

  async function saveUnitConcepts(unitId: string, currentConcepts: string[]) {
    setSavingUnitId(unitId);
    setStatusByUnitId((current) => ({ ...current, [unitId]: "" }));

    try {
      const concepts = parseConceptList(drafts[unitId] ?? "");
      const response = await fetch("/api/v4/teacher-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: "00000000-0000-4000-8000-000000000001",
          documentId: sessionId,
          sessionId,
          unitId,
          scope: "instructional-unit",
          target: "concepts",
          aiValue: toConceptWeights(currentConcepts),
          teacherValue: toConceptWeights(concepts),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to save unit concepts.");
      }

      setProvenance((current) => ({ ...current, [unitId]: "teacher-adjusted" }));
      setStatusByUnitId((current) => ({ ...current, [unitId]: "Saved" }));
      await onRefresh();
    } catch (error) {
      setStatusByUnitId((current) => ({ ...current, [unitId]: error instanceof Error ? error.message : "Failed to save unit concepts." }));
    } finally {
      setSavingUnitId(null);
    }
  }

  return (
    <div className="v4-product-card v4-product-span">
      <h3>Instructional Units</h3>
      <div className="v4-document-list">
        {product.unitConceptAlignment.map((entry) => (
          <article key={entry.unitId} className="v4-document-card">
            <div className="v4-document-card-header">
              <div>
                <h4>{entry.title}</h4>
                <p>{entry.sourceFileNames.join(", ")}</p>
              </div>
              <span className="v4-pill">{provenance[entry.unitId] === "teacher-adjusted" ? "Teacher-adjusted concepts" : "Inferred concepts"}</span>
            </div>
            <label className="v4-upload-field">
              <span>Concepts</span>
              <input
                aria-label={`Concepts for ${entry.title}`}
                value={drafts[entry.unitId] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [entry.unitId]: event.target.value }))}
                placeholder="concept.one, concept.two"
              />
            </label>
            <p className="v4-body-copy">Anchors: {entry.anchorNodeIds.length}. Documents: {entry.documentIds.length}.</p>
            <div className="v4-upload-actions">
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void saveUnitConcepts(entry.unitId, entry.concepts)} disabled={savingUnitId === entry.unitId}>
                {savingUnitId === entry.unitId ? "Saving..." : "Save concepts"}
              </button>
              {statusByUnitId[entry.unitId] ? <span className="v4-upload-name">{statusByUnitId[entry.unitId]}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type ProductViewerProps = {
  product: IntentProduct;
  sessionId?: string;
  onInstructionalMapRefresh?: () => Promise<void>;
  variant?: "app" | "print";
  showAnswerGuidance?: boolean;
};

export function getProductTitle(product: IntentProduct) {
  const payload = product.payload as IntentProductPayload;
  if ("title" in payload && typeof payload.title === "string") {
    return payload.title;
  }
  if (payload.kind === "summary") {
    return "Summary";
  }
  if (payload.kind === "compare-documents") {
    return "Document Comparison";
  }
  if (payload.kind === "merge-documents") {
    return "Merged Document Set";
  }
  if (payload.kind === "sequence") {
    return "Instructional Sequence";
  }
  if (payload.kind === "curriculum-alignment") {
    return "Curriculum Alignment";
  }
  if (payload.kind === "instructional-map") {
    return "Instructional Map";
  }
  if (payload.kind === "test") {
    return "Assessment Draft";
  }
  if (payload.kind === "review") {
    return "Review Plan";
  }
  if (payload.kind === "lesson") {
    return "Lesson Plan";
  }
  if (payload.kind === "unit") {
    return "Unit Plan";
  }
  return product.intentType;
}

function renderResponseLines(count = 4) {
  return (
    <div className="v4-print-response-lines" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => <div key={index} className="v4-print-response-line" />)}
    </div>
  );
}

function getResponseLineCount(options: {
  difficulty?: "low" | "medium" | "high" | string;
  cognitiveDemand?: "recall" | "procedural" | "conceptual" | "modeling" | "analysis" | string;
}) {
  if (options.cognitiveDemand === "analysis" || options.cognitiveDemand === "modeling" || options.difficulty === "high") {
    return 6;
  }
  if (options.cognitiveDemand === "conceptual" || options.difficulty === "medium") {
    return 5;
  }
  return 4;
}

function toPrintHeading(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function renderPrintProduct(payload: IntentProductPayload, options: { showAnswerGuidance: boolean }) {
  if (payload.kind === "test") {
    return (
      <article className="v4-print-product v4-print-product-test">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Overview</h2>
          <p className="v4-print-paragraph">{payload.overview}</p>
          <p className="v4-print-meta">Estimated duration: {payload.estimatedDurationMinutes} minutes. Total items: {payload.totalItemCount}.</p>
        </section>
        {payload.sections.map((section, sectionIndex) => (
          <section key={section.concept} className="v4-print-section v4-print-major-section v4-print-test-section">
            <p className="v4-print-section-kicker">Section {sectionIndex + 1}</p>
            <h2 className="v4-print-section-title">{toPrintHeading(section.concept)}</h2>
            <ol className="v4-print-numbered">
              {section.items.map((item) => (
                <li key={item.itemId} className="v4-print-item">
                  <p className="v4-print-question">{item.prompt}</p>
                  {renderResponseLines(getResponseLineCount({ difficulty: item.difficulty, cognitiveDemand: item.cognitiveDemand }))}
                </li>
              ))}
            </ol>
          </section>
        ))}
        {options.showAnswerGuidance && (
          <section className="v4-print-section v4-print-major-section v4-print-teacher-section v4-print-test-answer-key">
            <h2 className="v4-print-section-title">Teacher Notes (Optional)</h2>
            <h3 className="v4-print-subsection-title">Answer Guidance</h3>
            <ol className="v4-print-numbered">
              {payload.sections.flatMap((section) => section.items).map((item, index) => (
                <li key={item.itemId} className="v4-print-item">
                  <p className="v4-print-answer-guidance"><strong>{index + 1}.</strong> {item.answerGuidance}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    );
  }

  if (payload.kind === "lesson") {
    const scaffoldGroups = groupLessonScaffolds(payload.scaffolds);
    const lessonSections: Array<{ label: string; segments: typeof payload.warmUp }> = [
      { label: "Warm-Up", segments: payload.warmUp },
      { label: "Concept Introduction", segments: payload.conceptIntroduction },
      { label: "Guided Practice", segments: payload.guidedPractice },
      { label: "Independent Practice", segments: payload.independentPractice },
      { label: "Exit Ticket", segments: payload.exitTicket },
    ];

    return (
      <article className="v4-print-product v4-print-product-lesson">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Learning Objectives</h2>
          <ul className="v4-print-list">{payload.learningObjectives.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
        {payload.prerequisiteConcepts.length > 0 && (
          <section className="v4-print-section">
            <h2 className="v4-print-section-title">Prerequisites</h2>
            <ul className="v4-print-list">{payload.prerequisiteConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </section>
        )}
        {lessonSections.map((section) => (
          <section
            key={section.label}
            className={`v4-print-section v4-print-major-section v4-print-lesson-section ${section.label === "Guided Practice" ? "v4-print-lesson-practice" : ""} ${section.label === "Exit Ticket" ? "v4-print-lesson-exit-ticket" : ""}`.trim()}
          >
            <h2 className="v4-print-section-title">{section.label}</h2>
            <ol className="v4-print-numbered">
              {section.segments.map((segment) => (
                <li key={segment.title} className="v4-print-item">
                  <p className="v4-print-question"><strong>{segment.title}</strong></p>
                  <p className="v4-print-paragraph">{segment.description}</p>
                  {renderResponseLines(section.label === "Guided Practice" || section.label === "Independent Practice" ? 4 : section.label === "Exit Ticket" ? 3 : 2)}
                </li>
              ))}
            </ol>
          </section>
        ))}
        {payload.scaffolds.length > 0 && (
          <section className="v4-print-section v4-print-teacher-section">
            <h2 className="v4-print-section-title">Scaffolds</h2>
            {[...scaffoldGroups.entries()].map(([concept, entries]) => (
              <div key={concept} className="v4-print-scaffold-group">
                <h3 className="v4-print-subsection-title">{concept}</h3>
                <ul className="v4-print-list">{entries.map((entry) => <li key={`${entry.concept}-${entry.level}-${entry.strategy}`}>{entry.strategy}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {payload.misconceptions.length > 0 && (
          <section className="v4-print-section">
            <h2 className="v4-print-section-title">Misconceptions</h2>
            <ul className="v4-print-list">{payload.misconceptions.map((entry) => <li key={entry.trigger}><strong>{entry.trigger}</strong>: {entry.correction}</li>)}</ul>
          </section>
        )}
        {payload.teacherNotes.length > 0 && (
          <section className="v4-print-section v4-print-teacher-section">
            <h2 className="v4-print-section-title">Teacher Notes</h2>
            <ul className="v4-print-list">{payload.teacherNotes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            {renderResponseLines(3)}
          </section>
        )}
      </article>
    );
  }

  if (payload.kind === "review") {
    return (
      <article className="v4-print-product v4-print-product-review">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Overview</h2>
          <p className="v4-print-paragraph">{payload.overview}</p>
          <p className="v4-print-meta">Concepts covered: {payload.sections.map((entry) => entry.concept).join(", ")}.</p>
        </section>
        {payload.sections.map((section) => (
          <section key={section.concept} className="v4-print-section v4-print-major-section v4-print-review-section">
            <h2 className="v4-print-section-title">{section.concept}</h2>
            <div className="v4-print-review-rationale">
              <p className="v4-print-paragraph"><strong>Rationale:</strong> {section.rationale}</p>
            </div>
            <div className="v4-print-review-points">
              <h3 className="v4-print-subsection-title">Review Points</h3>
              <ul className="v4-print-list">{section.reviewPoints.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
            <div className="v4-print-review-practice">
              <h3 className="v4-print-subsection-title">Practice Prompts</h3>
              <ol className="v4-print-numbered">
                {section.practicePrompts.map((entry) => (
                  <li key={entry} className="v4-print-item">
                    <p className="v4-print-question">{entry}</p>
                    {renderResponseLines(3)}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </article>
    );
  }

  if (payload.kind === "instructional-map") {
    return (
      <article className="v4-print-product v4-print-product-instructional-map">
        <section className="v4-print-section v4-print-map-concepts">
          <h2 className="v4-print-section-title">Concepts</h2>
          <ul className="v4-print-list">{payload.conceptGraph.nodes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-units">
          <h2 className="v4-print-section-title">Units</h2>
          <table className="v4-print-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Concepts</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {payload.unitConceptAlignment.map((entry) => (
                <tr key={entry.unitId}>
                  <td>{entry.title}</td>
                  <td>{entry.concepts.join(", ") || "None listed"}</td>
                  <td>{entry.sourceFileNames.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-anchors">
          <h2 className="v4-print-section-title">Anchors</h2>
          <ul className="v4-print-list">
            {payload.unitConceptAlignment.map((entry) => <li key={`${entry.unitId}-anchors`}>{entry.title}: {entry.anchorNodeIds.length} anchor(s)</li>)}
          </ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-relationships">
          <h2 className="v4-print-section-title">Relationships</h2>
          <ul className="v4-print-list">
            {payload.conceptGraph.edges.length > 0
              ? payload.conceptGraph.edges.map((entry, index) => <li key={`${entry.from}-${entry.to}-${index}`}>{entry.from}{" -> "}{entry.to}</li>)
              : <li>No explicit concept relationships were generated.</li>}
          </ul>
          <p className="v4-print-meta">Representations: {payload.representationGraph.nodes.join(", ") || "None listed"}.</p>
        </section>
      </article>
    );
  }

  if (payload.kind === "unit") {
    return (
      <article className="v4-print-product v4-print-product-unit">
        <section className="v4-print-section v4-print-unit-sequence">
          <h2 className="v4-print-section-title">Lesson Sequence</h2>
          <ol className="v4-print-numbered">{payload.lessonSequence.map((entry) => <li key={entry.documentId}><strong>{entry.sourceFileName}</strong>: {entry.rationale}</li>)}</ol>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-unit-concept-map">
          <h2 className="v4-print-section-title">Concept Map</h2>
          <ul className="v4-print-list">{payload.conceptMap.map((entry) => <li key={entry.concept}>{entry.concept}{entry.prerequisites.length > 0 ? ` -> prerequisites: ${entry.prerequisites.join(", ")}` : ""}</li>)}</ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-unit-assessments">
          <h2 className="v4-print-section-title">Suggested Assessments</h2>
          <ul className="v4-print-list">{payload.suggestedAssessments.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "summary") {
    return (
      <article className="v4-print-product v4-print-product-summary">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Summary</h2>
          <p className="v4-print-paragraph">{payload.overallSummary}</p>
        </section>
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Cross-Document Takeaways</h2>
          <ul className="v4-print-list">{payload.crossDocumentTakeaways.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "problem-extraction") {
    return (
      <article className="v4-print-product v4-print-product-problem-extraction">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Problems</h2>
          <ol className="v4-print-numbered">{payload.problems.map((entry) => <li key={entry.problemId}>{entry.text}</li>)}</ol>
        </section>
      </article>
    );
  }

  if (payload.kind === "concept-extraction") {
    return (
      <article className="v4-print-product v4-print-product-concept-extraction">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Concepts</h2>
          <ul className="v4-print-list">{payload.concepts.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "curriculum-alignment") {
    return (
      <article className="v4-print-product v4-print-product-curriculum-alignment">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Standards Coverage</h2>
          <ul className="v4-print-list">{payload.standardsCoverage.map((entry) => <li key={entry.standardId}>{entry.standardId}: {entry.coverage}</li>)}</ul>
        </section>
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Gaps</h2>
          <ul className="v4-print-list">{payload.gaps.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "compare-documents") {
    return (
      <article className="v4-print-product v4-print-product-compare-documents">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Shared Concepts</h2>
          <ul className="v4-print-list">{payload.sharedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "merge-documents") {
    return (
      <article className="v4-print-product v4-print-product-merge-documents">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Merged Concepts</h2>
          <ul className="v4-print-list">{payload.mergedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "sequence") {
    return (
      <article className="v4-print-product v4-print-product-sequence">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Recommended Order</h2>
          <ol className="v4-print-numbered">{payload.recommendedOrder.map((entry) => <li key={entry.documentId}><strong>{entry.sourceFileName}</strong>: {entry.rationale}</li>)}</ol>
        </section>
      </article>
    );
  }

  return <pre className="v4-debug-block">{JSON.stringify(payload, null, 2)}</pre>;
}

export function ProductViewer(props: ProductViewerProps) {
  const { product, sessionId, onInstructionalMapRefresh, variant = "app", showAnswerGuidance = false } = props;
  const payload = cleanupProductPayload(product.payload as IntentProductPayload);

  if (variant === "print") {
    return renderPrintProduct(payload, { showAnswerGuidance });
  }

  function renderAppProduct() {
    if (payload.kind === "lesson") {
      const scaffoldGroups = groupLessonScaffolds(payload.scaffolds);
      const lessonSections: Array<{ label: string; segments: typeof payload.warmUp }> = [
        { label: "Warm-up", segments: payload.warmUp },
        { label: "Concept Introduction", segments: payload.conceptIntroduction },
        { label: "Guided Practice", segments: payload.guidedPractice },
        { label: "Independent Practice", segments: payload.independentPractice },
        { label: "Exit Ticket", segments: payload.exitTicket },
      ];

      return (
        <div className="v4-product-grid">
          <div className="v4-product-card">
            <h3>Learning Objectives</h3>
            <ul>{payload.learningObjectives.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Prerequisites</h3>
            <ul>{payload.prerequisiteConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card v4-product-span">
            <h3>Lesson Flow</h3>
            <div className="v4-segment-grid">
              {lessonSections.map((section) => (
                <div key={section.label} className="v4-segment-column">
                  <h4>{section.label}</h4>
                  {section.segments.map((segment) => (
                    <div key={segment.title} className="v4-segment-card">
                      <strong>{segment.title}</strong>
                      <p>{segment.description}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="v4-product-card">
            <h3>Misconceptions</h3>
            <ul>{payload.misconceptions.map((entry) => <li key={entry.trigger}>{entry.trigger}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Scaffolds</h3>
            {[...scaffoldGroups.entries()].map(([concept, entries]) => (
              <div key={concept}>
                <strong>{concept}</strong>
                <ul>{entries.map((entry) => <li key={`${entry.concept}-${entry.level}-${entry.strategy}`}>{entry.strategy}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="v4-product-card">
            <h3>Teacher Notes</h3>
            <ul>{payload.teacherNotes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "unit") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Lesson Sequence</h3>
            <ol>{payload.lessonSequence.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}: {entry.rationale}</li>)}</ol>
          </div>
          <div className="v4-product-card">
            <h3>Concept Map</h3>
            <ul>{payload.conceptMap.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Assessments</h3>
            <ul>{payload.suggestedAssessments.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "instructional-map") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card">
            <h3>Concept Graph</h3>
            <p>{payload.conceptGraph.nodes.length} nodes, {payload.conceptGraph.edges.length} edges</p>
            <ul>{payload.conceptGraph.nodes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Representation Graph</h3>
            <p>{payload.representationGraph.nodes.length} nodes, {payload.representationGraph.edges.length} edges</p>
          </div>
          <div className="v4-product-card v4-product-span">
            <h3>Document Alignment</h3>
            <ul>{payload.documentConceptAlignment.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}: {entry.concepts.join(", ") || "No concepts extracted"}</li>)}</ul>
          </div>
          {sessionId && onInstructionalMapRefresh ? <InstructionalMapConceptEditor sessionId={sessionId} product={payload} onRefresh={onInstructionalMapRefresh} /> : null}
        </div>
      );
    }

    if (payload.kind === "curriculum-alignment") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Standards Coverage</h3>
            <ul>{payload.standardsCoverage.map((entry) => <li key={entry.standardId}>{entry.standardId}: {entry.coverage}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Gaps</h3>
            <ul>{payload.gaps.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Suggested Fixes</h3>
            <ul>{payload.suggestedFixes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "compare-documents") {
      return <div className="v4-product-card"><h3>Shared Concepts</h3><ul>{payload.sharedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>;
    }

    if (payload.kind === "merge-documents") {
      return <div className="v4-product-card"><h3>Merged Concepts</h3><ul>{payload.mergedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>;
    }

    if (payload.kind === "sequence") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Recommended Order</h3>
            <ol>
              {payload.recommendedOrder.map((entry) => (
                <li key={entry.documentId}>
                  <strong>{entry.sourceFileName}</strong>: {entry.rationale}
                </li>
              ))}
            </ol>
          </div>
          <div className="v4-product-card">
            <h3>Bridging Concepts</h3>
            <ul>{payload.bridgingConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Missing Prerequisites</h3>
            <ul>{payload.missingPrerequisites.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "review") {
      return <div className="v4-product-card"><h3>Review Sections</h3><ul>{payload.sections.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul></div>;
    }

    if (payload.kind === "test") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Assessment Sections</h3>
            <p>{payload.overview}</p>
            {payload.sections.map((entry) => (
              <div key={entry.concept} className="v4-segment-card">
                <strong>{entry.concept}</strong>
                <ul>{entry.items.map((item) => <li key={item.itemId}>{item.prompt}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (payload.kind === "problem-extraction") {
      return <div className="v4-product-card"><h3>Problems</h3><ul>{payload.problems.map((entry) => <li key={entry.problemId}>{entry.text}</li>)}</ul></div>;
    }

    if (payload.kind === "concept-extraction") {
      return <div className="v4-product-card"><h3>Concepts</h3><ul>{payload.concepts.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul></div>;
    }

    if (payload.kind === "summary") {
      return <div className="v4-product-card"><h3>Summary</h3><p>{payload.overallSummary}</p></div>;
    }

    return <pre className="v4-debug-block">{JSON.stringify(payload, null, 2)}</pre>;
  }

  return (
    <>
      {payload.domain ? (
        <div className="v4-product-domain">
          <strong>Domain:</strong> {payload.domain}
        </div>
      ) : null}
      {renderAppProduct()}
    </>
  );
}