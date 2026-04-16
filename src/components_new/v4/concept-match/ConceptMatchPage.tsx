import { useState, useCallback } from "react";
import type {
  AssessmentItem,
  ConceptMatchIntelResponse,
  ConceptMatchGenerateResponse,
  TeacherAction,
  TestEvidenceResponse,
} from "../../../prism-v4/schema/domain/ConceptMatch";
import {
  fetchConceptMatchIntel,
  fetchTestEvidence,
  fetchConceptMatchGenerate,
} from "../../../services_new/conceptMatchService";
import { TestConceptProfilePanel } from "./TestConceptProfilePanel";
import { PrepCoveragePanel } from "./PrepCoveragePanel";
import { TeacherActionPanel } from "./TeacherActionPanel";
import { TestEvidenceModal } from "./TestEvidenceModal";
import { GenerateActionsBar } from "./GenerateActionsBar";
import { DeltaReportPanel } from "./DeltaReportPanel";
import "./conceptMatch.css";

type Phase = "upload" | "analyzing" | "review" | "generating" | "results";

/* ── Token progress bar ─────────────────────────────────────────────────── */

function TokenBar({ usage }: { usage: { used: number; remaining: number; limit: number } }) {
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const color = pct >= 90 ? "#b53535" : pct >= 70 ? "#b97a2a" : "#2a7a4b";
  return (
    <div style={{ fontSize: "0.78rem", color: "#6b5040", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span>Daily tokens: {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</span>
        <span>{usage.remaining.toLocaleString()} remaining</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(86,57,32,0.12)" }}>
        <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export function ConceptMatchPage() {
  /* ── Input state ── */
  const [prepTitle, setPrepTitle] = useState("");
  const [prepText, setPrepText] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentText, setAssessmentText] = useState("");

  /* ── Workflow state ── */
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);

  /* ── Intel result ── */
  const [intel, setIntel] = useState<ConceptMatchIntelResponse | null>(null);
  const [items, setItems] = useState<AssessmentItem[]>([]);

  /* ── Teacher actions ── */
  const [teacherActions, setTeacherActions] = useState<TeacherAction[]>([]);

  /* ── Evidence modal ── */
  const [evidenceData, setEvidenceData] = useState<TestEvidenceResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  /* ── Generate result ── */
  const [generateResult, setGenerateResult] = useState<ConceptMatchGenerateResponse | null>(null);

  /* ── Token usage ── */
  const [tokenUsage, setTokenUsage] = useState<{ used: number; remaining: number; limit: number } | null>(null);

  /* ── Parse assessment text into items ── */
  const parseAssessmentItems = useCallback((text: string): AssessmentItem[] => {
    const lines = text.split(/\n/).filter((l) => l.trim());
    const parsed: AssessmentItem[] = [];
    let current: AssessmentItem | null = null;

    for (const line of lines) {
      const match = line.match(/^\s*(?:Q|#|q)?(\d+)[.):\s]/);
      if (match) {
        if (current) parsed.push(current);
        current = {
          itemNumber: parseInt(match[1], 10),
          rawText: line.replace(match[0], "").trim(),
        };
      } else if (current) {
        current.rawText += " " + line.trim();
      }
    }
    if (current) parsed.push(current);

    // Fallback: if no numbering found, treat each line as an item
    if (parsed.length === 0) {
      return lines.map((l, i) => ({
        itemNumber: i + 1,
        rawText: l.trim(),
      }));
    }

    return parsed;
  }, []);

  /* ── Run analysis ── */
  const handleAnalyze = async () => {
    setError(null);
    setPhase("analyzing");

    try {
      const parsedItems = parseAssessmentItems(assessmentText);
      setItems(parsedItems);

      const result = await fetchConceptMatchIntel({
        prep: { title: prepTitle, rawText: prepText },
        assessment: { title: assessmentTitle, items: parsedItems },
      });

      setIntel(result);
      if (result.tokenUsage) setTokenUsage(result.tokenUsage);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setPhase("upload");
    }
  };

  /* ── View evidence ── */
  const handleViewEvidence = async (concept: string) => {
    setEvidenceLoading(true);
    try {
      const result = await fetchTestEvidence(concept, items);
      setEvidenceData(result);
    } catch {
      setEvidenceData({
        concept,
        items: items
          .filter((i) => (i.tags?.concepts ?? []).some((c) => c.toLowerCase() === concept.toLowerCase()))
          .map((i) => ({
            itemNumber: i.itemNumber,
            rawText: i.rawText,
            difficulty: i.tags?.difficulty ?? 3,
            concepts: i.tags?.concepts ?? [],
          })),
      });
    } finally {
      setEvidenceLoading(false);
    }
  };

  /* ── Add teacher action ── */
  const handleAddAction = (action: TeacherAction) => {
    setTeacherActions((prev) => [...prev, action]);
  };

  /* ── Generate ── */
  const handleGenerate = async (type: "review" | "test" | "both") => {
    setPhase("generating");
    setError(null);

    try {
      const result = await fetchConceptMatchGenerate({
        prep: { title: prepTitle, rawText: prepText },
        assessment: { title: assessmentTitle, items },
        teacherActions,
        generate: {
          review: type === "review" || type === "both",
          test: type === "test" || type === "both",
        },
      });
      if ((result as unknown as { tokenUsage?: { used: number; remaining: number; limit: number } }).tokenUsage) {
        setTokenUsage((result as unknown as { tokenUsage: { used: number; remaining: number; limit: number } }).tokenUsage);
      }
      setGenerateResult(result);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("review");
    }
  };

  /* ── Upload form ── */
  if (phase === "upload") {
    return (
      <div className="cm-page">
        <p className="cm-kicker">ConceptMatch v1</p>
        <h1>Concept Match</h1>

        {error && (
          <div className="cm-panel" style={{ borderColor: "rgba(201,55,55,0.3)", background: "rgba(201,55,55,0.05)" }}>
            <p style={{ color: "#b53535", margin: 0 }}>{error}</p>
          </div>
        )}

        <div className="cm-panel">
          <h2>Prep Material</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <input
              className="cm-btn"
              style={{ border: "1px dashed rgba(86,57,32,0.24)", borderRadius: 18, padding: "0.75rem" }}
              placeholder="Prep title"
              value={prepTitle}
              onChange={(e) => setPrepTitle(e.target.value)}
            />
            <textarea
              style={{
                width: "100%", minHeight: 120, padding: "0.75rem",
                border: "1px dashed rgba(86,57,32,0.24)", borderRadius: 18,
                background: "rgba(255,255,255,0.7)", fontFamily: "inherit", fontSize: "0.88rem", resize: "vertical",
              }}
              placeholder="Paste your prep notes and questions here…"
              value={prepText}
              onChange={(e) => setPrepText(e.target.value)}
            />
          </div>
        </div>

        <div className="cm-panel">
          <h2>Assessment / Test</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <input
              className="cm-btn"
              style={{ border: "1px dashed rgba(86,57,32,0.24)", borderRadius: 18, padding: "0.75rem" }}
              placeholder="Assessment title"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
            />
            <textarea
              style={{
                width: "100%", minHeight: 120, padding: "0.75rem",
                border: "1px dashed rgba(86,57,32,0.24)", borderRadius: 18,
                background: "rgba(255,255,255,0.7)", fontFamily: "inherit", fontSize: "0.88rem", resize: "vertical",
              }}
              placeholder="Paste test questions here (numbered: 1. / Q1 / #1 etc.)…"
              value={assessmentText}
              onChange={(e) => setAssessmentText(e.target.value)}
            />
          </div>
        </div>

        <div className="cm-generate-bar">
          <button
            className="cm-btn cm-btn--primary"
            disabled={!prepText.trim() || !assessmentText.trim()}
            onClick={handleAnalyze}
          >
            Analyze Concepts
          </button>
        </div>
      </div>
    );
  }

  /* ── Analyzing spinner ── */
  if (phase === "analyzing") {
    return (
      <div className="cm-page">
        <div className="cm-loading">
          <div className="cm-spinner" />
          <p>Analyzing concepts…</p>
        </div>
      </div>
    );
  }

  /* ── Generating spinner ── */
  if (phase === "generating") {
    return (
      <div className="cm-page">
        <div className="cm-loading">
          <div className="cm-spinner" />
          <p>Generating updated materials…</p>
        </div>
      </div>
    );
  }

  /* ── Results ── */
  if (phase === "results" && generateResult) {
    return (
      <div className="cm-page">
        <p className="cm-kicker">ConceptMatch v1</p>
        <h1>Results</h1>
        <DeltaReportPanel result={generateResult} />
        <div className="cm-generate-bar">
          <button className="cm-btn" onClick={() => { setPhase("review"); setGenerateResult(null); }}>
            Back to Review
          </button>
        </div>
      </div>
    );
  }

  /* ── Review phase (main dashboard) ── */
  return (
    <div className="cm-page">
      <p className="cm-kicker">ConceptMatch v1</p>
      <h1>Concept Match</h1>

      {tokenUsage && <TokenBar usage={tokenUsage} />}

      {error && (
        <div className="cm-panel" style={{ borderColor: "rgba(201,55,55,0.3)", background: "rgba(201,55,55,0.05)" }}>
          <p style={{ color: "#b53535", margin: 0 }}>{error}</p>
        </div>
      )}

      {intel && (
        <>
          <TestConceptProfilePanel
            testConceptStats={intel.testConceptStats}
            testDifficulty={intel.testDifficulty}
            onViewEvidence={handleViewEvidence}
          />

          <PrepCoveragePanel
            testConceptStats={intel.testConceptStats}
            prepConceptStats={intel.prepConceptStats}
            conceptCoverage={intel.conceptCoverage}
          />

          <TeacherActionPanel
            testConceptStats={intel.testConceptStats}
            prepConceptStats={intel.prepConceptStats}
            conceptCoverage={intel.conceptCoverage}
            teacherActions={teacherActions}
            onAddAction={handleAddAction}
          />

          <GenerateActionsBar
            hasActions={teacherActions.length > 0}
            generating={false}
            onGenerate={handleGenerate}
          />
        </>
      )}

      {/* Evidence modal */}
      {evidenceData && !evidenceLoading && (
        <TestEvidenceModal
          evidence={evidenceData}
          onClose={() => setEvidenceData(null)}
          onAddAction={handleAddAction}
        />
      )}
    </div>
  );
}
