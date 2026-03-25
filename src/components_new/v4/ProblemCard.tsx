import type { FormEvent } from "react";
import { useState } from "react";

import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemVector } from "./ProblemVector";

const BLOOM_OPTIONS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

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

export function ProblemCard(props: { problem: Problem; vector: ProblemTagVector; onRerun: () => Promise<void> }) {
  const { problem, vector, onRerun } = props;
  const title = problem.partLabel
    ? `${problem.teacherLabel ?? `${problem.partLabel})`} ${problem.problemId}`
    : `Problem ${problem.problemNumber ?? problem.problemId.replace(/^p/, "")}`;
  const body = problem.partText ?? problem.cleanedText ?? problem.rawText;
  const [isEditing, setIsEditing] = useState(false);
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

    setIsSubmitting(true);
    setStatus(null);

    try {
      for (const update of updates) {
        const response = await fetch("/api/v4/teacher-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: "local-teacher",
            documentId: problem.sourceDocumentId ?? "local-document",
            canonicalProblemId: problem.canonicalProblemId ?? `${problem.sourceDocumentId ?? "document"}::${problem.problemId}`,
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

      setStatus("Teacher feedback saved.");
      setIsEditing(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Teacher feedback failed.");
    } finally {
      setIsSubmitting(false);
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
      const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(problem.canonicalProblemId ?? `${problem.sourceDocumentId ?? "document"}::${problem.problemId}`)}`, {
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
          <button className="v4-button v4-button-secondary" type="button" onClick={() => setIsEditing((value) => !value)}>
            Challenge or correct this
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowReasoning((value) => !value)}>
            {showReasoning ? "Hide reasoning" : "Why the AI thinks this"}
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
			<p className="v4-kicker">Reasoning trace</p>
			<div className="v4-feedback-grid">
				<span>Azure bloom: {Object.entries(vector.reasoning.azureBloom).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "unknown"}</span>
				<span>Structural multi-step: {vector.reasoning.structuralMultiStep?.toFixed(2) ?? "-"}</span>
				<span>Structural bloom: {Object.entries(vector.reasoning.structuralBloom).filter(([, value]) => typeof value === "number").map(([key]) => key).join(", ") || "None"}</span>
				<span>Domain templates: {vector.reasoning.templateIds.join(", ") || "None"}</span>
				<span>Teacher templates: {vector.reasoning.teacherTemplateIds.join(", ") || "None"}</span>
				<span>Teacher overrides: {vector.reasoning.overridesApplied ? "Applied" : "Not applied"}</span>
			</div>
		</section>
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