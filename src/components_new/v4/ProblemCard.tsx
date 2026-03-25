import type { FormEvent } from "react";
import { useState } from "react";

import type { Problem } from "../../prism-v4/schema/domain";
import type { DocumentSemanticInsights, ProblemTagVector } from "../../prism-v4/schema/semantic";
import type { NarratorLens } from "../../prism-v4/narrator/types";

import { ProblemVector } from "./ProblemVector";
import { TeacherNarrativePanel } from "./TeacherNarrativePanel";

const BLOOM_OPTIONS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
const REPRESENTATION_OPTIONS = ["equation", "table", "graph", "paragraph", "diagram", "map", "timeline", "experiment", "primarySource"] as const;
const LOCAL_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function multiStepScoreToExpectedSteps(value: number) {
  return Math.min(6, Math.max(1, Math.round(1 + clamp01(value) * 5)));
}

function expectedStepsToMultiStepScore(value: number) {
  return clamp01((value - 1) / 5);
}

function topBloomLevel(vector: ProblemTagVector) {
	return Object.entries(vector.cognitive.bloom).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "remember";
}

function parseConcepts(value: string) {
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.reduce<Record<string, number>>((accumulator, concept) => {
			accumulator[concept] = 1;
			return accumulator;
		}, {});
}

function formatExpectedSteps(vector: ProblemTagVector) {
  const baseline = vector.reasoning?.expectedSteps;
  const adjusted = vector.reasoning?.adjustedExpectedSteps;

  if (typeof adjusted !== "number" && typeof baseline !== "number") {
    return "Not inferred";
  }

  if (typeof baseline === "number" && typeof adjusted === "number" && baseline !== adjusted) {
    return `${adjusted} (adjusted from ${baseline})`;
  }

  return String(adjusted ?? baseline);
}

function formatConfidence(vector: ProblemTagVector) {
  const baseline = vector.reasoning?.templateConfidence;
  const adjusted = vector.reasoning?.adjustedTemplateConfidence;

  if (typeof adjusted !== "number" && typeof baseline !== "number") {
    return "No template confidence available";
  }

  if (typeof baseline === "number" && typeof adjusted === "number" && Math.abs(baseline - adjusted) > 0.001) {
    return `${baseline.toFixed(2)} -> ${adjusted.toFixed(2)}`;
  }

  return (adjusted ?? baseline ?? 0).toFixed(2);
}

function buildMatchedPatternList(vector: ProblemTagVector) {
  return [...new Set([...(vector.reasoning?.templateIds ?? []), ...(vector.reasoning?.teacherTemplateIds ?? [])])];
}

function ProvenanceBadge(props: { vector: ProblemTagVector }) {
  const { vector } = props;
  const source = vector.reasoning?.selectedTemplateSource === "teacher" ? "Teacher Template" : "System Template";
  const status = vector.reasoning?.selectedTemplateStatus ?? "stable";
  const adjustedConfidence = vector.reasoning?.adjustedTemplateConfidence;
  const frozen = vector.reasoning?.selectedTemplateFrozen;

  return (
    <span className="v4-provenance-badge">
      {source}
      {frozen ? " • Frozen" : ""}
      {adjustedConfidence !== undefined ? ` • Conf: ${adjustedConfidence.toFixed(2)}` : ""}
      {status ? ` • ${status}` : ""}
    </span>
  );
}

export function ProblemCard(props: {
  problem: Problem;
  vector: ProblemTagVector;
  documentSummary: DocumentSemanticInsights;
  onRerun: () => Promise<void>;
  expertMode: boolean;
  lens: NarratorLens;
}) {
  const { problem, vector, documentSummary, onRerun, expertMode, lens } = props;
  const title = problem.partLabel
    ? `${problem.teacherLabel ?? `${problem.partLabel})`} ${problem.problemId}`
    : `Problem ${problem.problemNumber ?? problem.problemId.replace(/^p/, "")}`;
  const body = problem.partText ?? problem.cleanedText ?? problem.rawText;
  const [isEditing, setIsEditing] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [bloomValue, setBloomValue] = useState(topBloomLevel(vector));
  const [difficultyValue, setDifficultyValue] = useState(vector.cognitive.difficulty.toFixed(2));
  const [multiStepValue, setMultiStepValue] = useState(vector.cognitive.multiStep.toFixed(2));
  const [misconceptionRiskValue, setMisconceptionRiskValue] = useState(vector.cognitive.misconceptionRisk.toFixed(2));
  const [conceptsValue, setConceptsValue] = useState(Object.keys(vector.concepts).join(", "));
  const [subjectValue, setSubjectValue] = useState(vector.subject);
  const [domainValue, setDomainValue] = useState(vector.domain);
  const [stemTextValue, setStemTextValue] = useState(problem.stemText ?? "");
  const [partTextValue, setPartTextValue] = useState(problem.partText ?? "");
  const [tagsValue, setTagsValue] = useState("{}");
  const [segmentationChanged, setSegmentationChanged] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(vector.reasoning?.teacherTemplateIds[0] ?? vector.reasoning?.templateIds[0] ?? "");
  const [representationValue, setRepresentationValue] = useState(vector.representation);
  const [quickDifficultyValue, setQuickDifficultyValue] = useState(vector.difficulty.toFixed(2));
  const canonicalProblemId = problem.canonicalProblemId ?? `${problem.sourceDocumentId ?? "document"}::${problem.problemId}`;
  const matchedPatterns = buildMatchedPatternList(vector);
  const inferredSteps = vector.reasoning?.adjustedExpectedSteps ?? vector.reasoning?.expectedSteps ?? multiStepScoreToExpectedSteps(vector.cognitive.multiStep);

  if (!expertMode) {
  return (
    <article className="v4-problem-card">
    <div className="v4-problem-header">
      <div>
      <p className="v4-kicker">{problem.partLabel ? `Part ${problem.partLabel.toUpperCase()}` : "Problem"}</p>
      <h3>{title}</h3>
      </div>
    </div>

    <p className="v4-body-copy">{body}</p>
    <TeacherNarrativePanel
      lens={lens}
      problemId={canonicalProblemId}
      problemText={body}
      semanticFingerprint={vector}
      gradeLevel={documentSummary.gradeLevel !== undefined ? String(documentSummary.gradeLevel) : undefined}
      subject={vector.subject || documentSummary.subject}
    />
    </article>
  );
  }

  async function submitTeacherFeedback(updates: Array<{ target: string; aiValue: unknown; teacherValue: unknown }>, successMessage: string) {
    setIsSubmitting(true);
    setStatus(null);

    try {
      for (const update of updates) {
        const response = await fetch("/api/v4/teacher-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: LOCAL_TEACHER_ID,
            documentId: problem.sourceDocumentId ?? "local-document",
            canonicalProblemId,
            target: update.target,
            aiValue: update.aiValue,
            teacherValue: update.teacherValue,
            rationale: rationale || undefined,
            evidence: evidenceText ? { text: evidenceText } : undefined,
            context: {
              subject: vector.subject,
              templateIds: vector.reasoning?.templateIds ?? [],
              teacherTemplateIds: vector.reasoning?.teacherTemplateIds ?? [],
            },
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Teacher feedback failed.");
        }
      }

      setStatus(successMessage);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Teacher feedback failed.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickCorrection(kind: "template" | "more-steps" | "fewer-steps" | "representation" | "difficulty") {
    switch (kind) {
      case "template": {
        const success = await submitTeacherFeedback([
          {
            target: "other",
            aiValue: { templateIds: vector.reasoning?.templateIds ?? [], teacherTemplateIds: vector.reasoning?.teacherTemplateIds ?? [] },
            teacherValue: { selectedTemplateId: selectedTemplateId || null, action: "template_override" },
          },
        ], "Template correction recorded.");
        if (success) {
          setShowCorrectionModal(false);
        }
        return;
      }
      case "more-steps": {
        const success = await submitTeacherFeedback([
          {
            target: "multiStep",
            aiValue: vector.cognitive.multiStep,
            teacherValue: expectedStepsToMultiStepScore(Math.min(6, inferredSteps + 1)),
          },
        ], "Expected-step correction recorded.");
        if (success) {
          setShowCorrectionModal(false);
        }
        return;
      }
      case "fewer-steps": {
        const success = await submitTeacherFeedback([
          {
            target: "multiStep",
            aiValue: vector.cognitive.multiStep,
            teacherValue: expectedStepsToMultiStepScore(Math.max(1, inferredSteps - 1)),
          },
        ], "Expected-step correction recorded.");
        if (success) {
          setShowCorrectionModal(false);
        }
        return;
      }
      case "representation": {
        const success = await submitTeacherFeedback([
          {
            target: "tags",
            aiValue: { representation: vector.representation, representationCount: vector.representationCount },
            teacherValue: { representation: representationValue, representationCount: representationValue === vector.representation ? vector.representationCount : 1 },
          },
        ], "Representation correction recorded.");
        if (success) {
          setShowCorrectionModal(false);
        }
        return;
      }
      case "difficulty": {
        const success = await submitTeacherFeedback([
          {
            target: "difficulty",
            aiValue: vector.difficulty,
            teacherValue: Number(quickDifficultyValue),
          },
        ], "Difficulty correction recorded.");
        if (success) {
          setShowCorrectionModal(false);
        }
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const updates: Array<{ target: string; aiValue: unknown; teacherValue: unknown }> = [];
    if (bloomValue !== topBloomLevel(vector)) {
      updates.push({ target: "bloom", aiValue: topBloomLevel(vector), teacherValue: bloomValue });
    }
    if (Number(difficultyValue).toFixed(2) !== vector.cognitive.difficulty.toFixed(2)) {
      updates.push({ target: "difficulty", aiValue: vector.cognitive.difficulty, teacherValue: Number(difficultyValue) });
    }
    if (Number(multiStepValue).toFixed(2) !== vector.cognitive.multiStep.toFixed(2)) {
      updates.push({ target: "multiStep", aiValue: vector.cognitive.multiStep, teacherValue: Number(multiStepValue) });
    }
    if (Number(misconceptionRiskValue).toFixed(2) !== vector.cognitive.misconceptionRisk.toFixed(2)) {
      updates.push({ target: "misconceptionRisk", aiValue: vector.cognitive.misconceptionRisk, teacherValue: Number(misconceptionRiskValue) });
    }
    if (conceptsValue !== Object.keys(vector.concepts).join(", ")) {
      updates.push({ target: "concepts", aiValue: vector.concepts, teacherValue: parseConcepts(conceptsValue) });
    }
    if (subjectValue !== vector.subject) {
      updates.push({ target: "subject", aiValue: vector.subject, teacherValue: subjectValue });
    }
    if (domainValue !== vector.domain) {
      updates.push({ target: "domain", aiValue: vector.domain, teacherValue: domainValue });
    }
    if (stemTextValue !== (problem.stemText ?? "")) {
      updates.push({ target: "stemText", aiValue: problem.stemText ?? "", teacherValue: stemTextValue });
    }
    if (partTextValue !== (problem.partText ?? "")) {
      updates.push({ target: "partText", aiValue: problem.partText ?? "", teacherValue: partTextValue });
    }
    if (segmentationChanged) {
      updates.push({ target: "segmentation", aiValue: null, teacherValue: { reassignRequested: true } });
    }
    if (tagsValue.trim() !== "{}") {
      try {
        updates.push({ target: "tags", aiValue: {}, teacherValue: JSON.parse(tagsValue) });
      } catch {
        setStatus("Tags must be valid JSON.");
        return;
      }
    }

    if (updates.length === 0) {
      setStatus("No corrections to submit.");
      return;
    }

    const success = await submitTeacherFeedback(updates, "Teacher feedback saved.");
    if (success) {
      setIsEditing(false);
    }
  }

  async function handleRerun(successMessage = "Cognition re-run complete.") {
    setIsRerunning(true);
    setStatus(null);
    try {
      await onRerun();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cognition re-run failed.");
    } finally {
      setIsRerunning(false);
    }
  }

  async function handleReset() {
    setIsResetting(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Reset failed.");
      }
      await handleRerun("Teacher override reset to AI defaults.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <article className="v4-problem-card">
      <div className="v4-problem-header">
        <div>
          <p className="v4-kicker">{problem.partLabel ? `Part ${problem.partLabel.toUpperCase()}` : "Problem"}</p>
          <h3>{title}</h3>
          <div className="v4-provenance-row">
            <ProvenanceBadge vector={vector} />
            {vector.reasoning?.selectedTemplateName && <span className="v4-provenance-meta">{vector.reasoning.selectedTemplateName}</span>}
          </div>
        </div>
        <span className="v4-pill">page {problem.sourcePageNumber ?? "-"}</span>
      </div>

      <p
        className="v4-body-copy"
        onMouseUp={() => {
          const selection = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
          if (selection) {
            setEvidenceText(selection);
          }
        }}
      >
        {body}
      </p>

      <section className="v4-ai-understanding" data-testid="ai-understanding">
        <p className="v4-kicker">AI's understanding</p>
        <div className="v4-feedback-grid">
          <span>Bloom: {topBloomLevel(vector)}</span>
          <span>Difficulty: {vector.cognitive.difficulty.toFixed(2)}</span>
          <span>Multi-step: {vector.cognitive.multiStep.toFixed(2)}</span>
          <span>Concepts: {Object.keys(vector.concepts).join(", ") || "None"}</span>
          <span>Misconception risk: {vector.cognitive.misconceptionRisk.toFixed(2)}</span>
          <span>Subject / domain: {vector.subject} / {vector.domain}</span>
          <span>Override version: {vector.teacherAdjustments?.overrideVersion ?? "AI default"}</span>
        </div>
        <div className="v4-feedback-actions v4-feedback-actions-split">
          <button className="v4-button" type="button" onClick={() => setShowCorrectionModal(true)}>
            Correct this interpretation
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => setIsEditing((value) => !value)}>
            Challenge or correct this
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowReasoning((value) => !value)}>
            {showReasoning ? "Hide interpretation details" : "Why this interpretation?"}
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleRerun()} disabled={isRerunning}>
            {isRerunning ? "Re-running..." : "Re-run cognition"}
          </button>
          {vector.teacherAdjustments && (
            <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleReset()} disabled={isResetting || isRerunning}>
              {isResetting ? "Resetting..." : "Reset to AI defaults"}
            </button>
          )}
        </div>
      </section>

	  {showReasoning && vector.reasoning && (
		<section className="v4-ai-understanding" data-testid="reasoning-panel">
			<p className="v4-kicker">Why this interpretation?</p>
			<div className="v4-feedback-grid">
				<span>Reasoning patterns detected: {matchedPatterns.join(", ") || "None"}</span>
				<span>Primary interpretation: {vector.reasoning.selectedTemplateName ?? vector.reasoning.selectedTemplateId ?? "No dominant template"}</span>
				<span>Expected steps: {formatExpectedSteps(vector)}</span>
				<span>Confidence: {formatConfidence(vector)}</span>
				<span>Status: {vector.reasoning.selectedTemplateStatus ?? "stable"}</span>
				<span>System believes this requires multiple steps: {vector.reasoning.structuralMultiStep?.toFixed(2) ?? "-"}</span>
				<span>Detected representations: {vector.representationCount}</span>
				<span>Teacher overrides: {vector.reasoning.overridesApplied ? "Applied" : "Not applied"}</span>
			</div>
		</section>
	  )}

      {showCorrectionModal && (
        <div className="v4-modal-backdrop" role="presentation" onClick={() => setShowCorrectionModal(false)}>
          <section className="v4-modal" role="dialog" aria-modal="true" aria-label="Correct interpretation" onClick={(event) => event.stopPropagation()}>
            <div className="v4-section-heading">
              <div>
                <p className="v4-kicker">Teacher correction</p>
                <h3>Correct this interpretation</h3>
              </div>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowCorrectionModal(false)}>Close</button>
            </div>

            <div className="v4-feedback-grid">
              <label>
                Preferred template
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  <option value="">Keep current selection</option>
                  {matchedPatterns.map((templateId) => (
                    <option key={templateId} value={templateId}>{templateId}</option>
                  ))}
                </select>
              </label>
              <label>
                Correct representation
                <select value={representationValue} onChange={(event) => setRepresentationValue(event.target.value as typeof REPRESENTATION_OPTIONS[number])}>
                  {REPRESENTATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                Correct difficulty
                <input type="range" min="0" max="1" step="0.01" value={quickDifficultyValue} onChange={(event) => setQuickDifficultyValue(event.target.value)} />
              </label>
            </div>

            <div className="v4-feedback-actions v4-feedback-actions-split">
              <button className="v4-button" type="button" onClick={() => void handleQuickCorrection("template")} disabled={isSubmitting}>This template is incorrect</button>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleQuickCorrection("more-steps")} disabled={isSubmitting}>This requires more steps</button>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleQuickCorrection("fewer-steps")} disabled={isSubmitting}>This requires fewer steps</button>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleQuickCorrection("representation")} disabled={isSubmitting}>Representation is wrong</button>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleQuickCorrection("difficulty")} disabled={isSubmitting}>Difficulty is off</button>
            </div>
          </section>
        </div>
      )}

      {isEditing && (
        <form className="v4-feedback-form" onSubmit={handleSubmit}>
          <label>
            Bloom
            <select value={bloomValue} onChange={(event) => setBloomValue(event.target.value)}>
              {BLOOM_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <input type="range" min="0" max="1" step="0.01" value={difficultyValue} onChange={(event) => setDifficultyValue(event.target.value)} />
          </label>
          <label>
            Multi-step
            <input type="range" min="0" max="1" step="0.01" value={multiStepValue} onChange={(event) => setMultiStepValue(event.target.value)} />
          </label>
          <label>
            Misconception risk
            <input type="range" min="0" max="1" step="0.01" value={misconceptionRiskValue} onChange={(event) => setMisconceptionRiskValue(event.target.value)} />
          </label>
          <label>
            Concepts
            <input value={conceptsValue} onChange={(event) => setConceptsValue(event.target.value)} placeholder="concept.one, concept.two" />
          </label>
          <label>
            Subject
            <input value={subjectValue} onChange={(event) => setSubjectValue(event.target.value)} />
          </label>
          <label>
            Domain
            <input value={domainValue} onChange={(event) => setDomainValue(event.target.value)} />
          </label>
          <label>
            Stem text
            <textarea value={stemTextValue} onChange={(event) => setStemTextValue(event.target.value)} rows={3} />
          </label>
          <label>
            Part text
            <textarea value={partTextValue} onChange={(event) => setPartTextValue(event.target.value)} rows={3} />
          </label>
          <label>
            Evidence highlight
            <input value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} placeholder="Select text above or type evidence" />
          </label>
          <label>
            Tags JSON
            <textarea value={tagsValue} onChange={(event) => setTagsValue(event.target.value)} rows={3} />
          </label>
          <label>
            Rationale
            <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} />
          </label>
          <label className="v4-feedback-checkbox">
            <input type="checkbox" checked={segmentationChanged} onChange={(event) => setSegmentationChanged(event.target.checked)} />
            This belongs to another problem
          </label>
          <div className="v4-feedback-actions">
            <button className="v4-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Submit correction"}</button>
          </div>
        </form>
      )}

      {status && <p className="v4-body-copy">{status}</p>}
      <ProblemVector vector={vector} />
    </article>
  );
}