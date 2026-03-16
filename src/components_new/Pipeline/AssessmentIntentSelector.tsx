import { useState } from "react";
import { runOrchestrator, type OrchestratorIntent } from "@/pipeline/orchestrator";
import { analyzeDocument } from "@/pipeline/agents/documentAnalyzer";
import "./AssessmentIntentSelector.css";

type IntentOption = {
  intent: OrchestratorIntent;
  title: string;
  description: string;
  icon: string;
};

const INTENT_OPTIONS: IntentOption[] = [
  {
    intent: "create",
    title: "Write a new assessment",
    description: "Use the full defaults-aware conversational wizard to generate an assessment.",
    icon: "✍",
  },
  {
    intent: "analyze",
    title: "Analyze an assessment or document",
    description: "Upload one document and get structural and instructional analysis.",
    icon: "🔍",
  },
  {
    intent: "compare",
    title: "Compare two assessments or documents",
    description: "Upload A and B, then compare coverage, complexity, and structure.",
    icon: "⚖",
  },
  {
    intent: "test",
    title: "Playtest a test with simulated students",
    description: "Upload an assessment and run a quick simulation by student level.",
    icon: "🧪",
  },
  {
    intent: "summary",
    title: "View summary, concepts, difficulty, or raw structure",
    description: "Upload a document and choose a view mode for focused inspection.",
    icon: "📄",
  },
  {
    intent: "differentiate",
    title: "Create differentiated versions",
    description: "Generate multiple versions of an assessment for different learning profiles.",
    icon: "🧩",
  },
];

export function AssessmentIntentSelector({
  onSelect,
}: {
  onSelect: (intent: OrchestratorIntent) => void;
}) {
  return (
    <section className="intent-selector">
      <h2 className="intent-selector__title">What would you like to do today?</h2>
      <p className="intent-selector__subtitle">Pick a workflow. You can switch any time before running.</p>
      <div className="intent-selector__grid">
        {INTENT_OPTIONS.map((option) => (
          <button
            key={option.intent}
            type="button"
            onClick={() => onSelect(option.intent)}
            className="intent-option"
            style={{ animationDelay: `${INTENT_OPTIONS.indexOf(option) * 70}ms` }}
          >
            <span className="intent-option__icon" aria-hidden="true">{option.icon}</span>
            <div className="intent-option__title">{option.title}</div>
            <div className="intent-option__description">{option.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

async function readFileText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const insights = await analyzeDocument(file);
    return insights.rawText;
  }
  return file.text().catch(() => "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatInsightValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  return "Available";
}

function findByAliases(root: unknown, aliases: string[]): unknown {
  const aliasSet = new Set(aliases.map((a) => a.toLowerCase()));
  const seen = new WeakSet<object>();

  function visit(node: unknown): unknown {
    if (node == null) return undefined;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    if (!isRecord(node)) return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);

    for (const [key, val] of Object.entries(node)) {
      if (aliasSet.has(key.toLowerCase())) return val;
    }
    for (const val of Object.values(node)) {
      const found = visit(val);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  return visit(root);
}

function SmartInsights({
  data,
  specs,
}: {
  data: unknown;
  specs: Array<{ label: string; aliases: string[] }>;
}) {
  const items = specs
    .map((spec) => ({ label: spec.label, value: findByAliases(data, spec.aliases) }))
    .filter((item) => item.value !== undefined && item.value !== null)
    .slice(0, 6);

  if (items.length === 0) return null;

  return (
    <div className="workflow-smart-insights">
      {items.map((item) => (
        <div key={item.label} className="workflow-smart-insight">
          <span>{item.label}</span>
          <strong>{formatInsightValue(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function toInsightsRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readInsightsMetric(insights: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = insights;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function DocumentInsightsSummary({
  insights,
  title,
  specs,
}: {
  insights: unknown;
  title: string;
  specs: Array<{ label: string; path: string }>;
}) {
  const record = toInsightsRecord(insights);
  if (!record) return null;

  const items = specs
    .map((spec) => ({ label: spec.label, value: readInsightsMetric(record, spec.path) }))
    .filter((item) => item.value !== undefined && item.value !== null)
    .slice(0, 8);

  if (items.length === 0) return null;

  return (
    <div className="workflow-result-section">
      <h4>{title}</h4>
      <div className="workflow-smart-insights">
        {items.map((item) => (
          <div key={item.label} className="workflow-smart-insight">
            <span>{item.label}</span>
            <strong>{formatInsightValue(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareDocumentInsights({ data }: { data: Record<string, unknown> }) {
  const insightsA = toInsightsRecord(data.insightsA);
  const insightsB = toInsightsRecord(data.insightsB);
  if (!insightsA && !insightsB) return null;

  return (
    <div className="workflow-result-section">
      <h4>Source Insights (A vs B)</h4>
      <div className="workflow-smart-insights" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {insightsA && (
          <div className="workflow-smart-insight">
            <span>Document A</span>
            <strong>{formatInsightValue(readInsightsMetric(insightsA, "metadata.subjectEstimate")) || "Unknown subject"}</strong>
            <span>Grade: {formatInsightValue(readInsightsMetric(insightsA, "metadata.gradeEstimate")) || "Unknown"}</span>
            <span>Difficulty: {formatInsightValue(readInsightsMetric(insightsA, "metadata.difficulty")) || "Unknown"}</span>
            <span>Concepts: {formatInsightValue(readInsightsMetric(insightsA, "concepts"))}</span>
            <span>Formulas: {formatInsightValue(readInsightsMetric(insightsA, "formulas"))}</span>
            <span>Low confidence: {formatInsightValue(readInsightsMetric(insightsA, "flags.lowConfidence"))}</span>
          </div>
        )}
        {insightsB && (
          <div className="workflow-smart-insight">
            <span>Document B</span>
            <strong>{formatInsightValue(readInsightsMetric(insightsB, "metadata.subjectEstimate")) || "Unknown subject"}</strong>
            <span>Grade: {formatInsightValue(readInsightsMetric(insightsB, "metadata.gradeEstimate")) || "Unknown"}</span>
            <span>Difficulty: {formatInsightValue(readInsightsMetric(insightsB, "metadata.difficulty")) || "Unknown"}</span>
            <span>Concepts: {formatInsightValue(readInsightsMetric(insightsB, "concepts"))}</span>
            <span>Formulas: {formatInsightValue(readInsightsMetric(insightsB, "formulas"))}</span>
            <span>Low confidence: {formatInsightValue(readInsightsMetric(insightsB, "flags.lowConfidence"))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="workflow-result-preview">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ResultSection({ title, value }: { title: string; value: unknown }) {
  const text = safeString(value);
  if (!value) return null;
  return (
    <div className="workflow-result-section">
      <h4>{title}</h4>
      {text ? <p>{text}</p> : <JsonBlock data={value} />}
    </div>
  );
}

function AnalyzeResultCard({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const analysis = record.analysis;
  const documentInsights = record.documentInsights;
  const unreadable = isRecord(documentInsights) && isRecord(documentInsights.flags) ? Boolean(documentInsights.flags.unreadable) : false;
  const philosopher = isRecord(record.philosopher) ? record.philosopher : null;
  const notes = philosopher?.teacherFeedback ?? philosopher?.analysis ?? philosopher?.notes;
  return (
    <div className="workflow-result-card">
      <div className="workflow-result-head">Analysis Complete</div>
      <div className="workflow-result-metrics">
        <div><span>Type</span><strong>{safeString(record.type) || "analyze"}</strong></div>
        <div><span>Analysis payload</span><strong>{analysis ? "ready" : "empty"}</strong></div>
        <div><span>Philosopher insight</span><strong>{notes ? "ready" : "none"}</strong></div>
      </div>
      <SmartInsights
        data={record}
        specs={[
          { label: "Completion", aliases: ["completionRate", "predictedCompletionRate"] },
          { label: "Risk Level", aliases: ["riskLevel", "atRiskProfile"] },
          { label: "Est. Minutes", aliases: ["estimatedMinutes", "totalEstimatedMinutes", "avgTimeMinutes"] },
          { label: "Confusion", aliases: ["confusionSignals", "confusionHotspots"] },
          { label: "Engagement", aliases: ["engagementScore"] },
          { label: "Bloom Coverage", aliases: ["bloomCoverage", "bloomDistribution"] },
        ]}
      />
      <ResultSection title="Instructional Insight" value={notes} />
      {unreadable && (
        <ResultSection
          title="Fallback"
          value="Document unreadable. Analysis pipeline was safely skipped."
        />
      )}
      <DocumentInsightsSummary
        insights={documentInsights}
        title="Document Ingestion Signals"
        specs={[
          { label: "Subject", path: "metadata.subjectEstimate" },
          { label: "Grade", path: "metadata.gradeEstimate" },
          { label: "Difficulty", path: "metadata.difficulty" },
          { label: "Reading Level", path: "metadata.readingLevel" },
          { label: "Concepts", path: "concepts" },
          { label: "Examples", path: "examples" },
          { label: "Sections", path: "sections" },
          { label: "Low Confidence", path: "flags.lowConfidence" },
        ]}
      />
      <ResultSection title="Analysis Data" value={analysis} />
    </div>
  );
}

function CompareResultCard({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const comparison = record.comparison;
  const mode = safeString(record.mode) || "general";
  const unreadableA = isRecord(record.insightsA) && isRecord(record.insightsA.flags) ? Boolean(record.insightsA.flags.unreadable) : false;
  const unreadableB = isRecord(record.insightsB) && isRecord(record.insightsB.flags) ? Boolean(record.insightsB.flags.unreadable) : false;
  const prep = isRecord(comparison) && isRecord(comparison.preparation) ? comparison.preparation : null;
  const philosopher = isRecord(record.philosopher) ? record.philosopher : null;
  const notes = philosopher?.teacherFeedback ?? philosopher?.analysis ?? philosopher?.notes;
  return (
    <div className="workflow-result-card">
      <div className="workflow-result-head">Comparison Complete</div>
      <div className="workflow-result-metrics">
        <div><span>Type</span><strong>{safeString(record.type) || "compare"}</strong></div>
        <div><span>Mode</span><strong>{mode}</strong></div>
        <div><span>Comparison profile</span><strong>{comparison ? "ready" : "empty"}</strong></div>
        <div><span>Summary insight</span><strong>{notes ? "ready" : "none"}</strong></div>
      </div>
      <SmartInsights
        data={record}
        specs={[
          { label: "Similarity", aliases: ["similarity", "overlapScore"] },
          { label: "Coverage Delta", aliases: ["coverageDelta", "coverageChange"] },
          { label: "Difficulty Delta", aliases: ["difficultyDelta", "difficultyChange"] },
          { label: "Time Delta", aliases: ["timeDelta", "durationDelta"] },
          { label: "Improvement", aliases: ["improvement", "improvementScore"] },
          { label: "Novelty Delta", aliases: ["noveltyDelta"] },
          { label: "A prepares B", aliases: ["preparesScore"] },
          { label: "Missing Concepts", aliases: ["missingConcepts"] },
        ]}
      />
      {prep && (
        <ResultSection
          title="A Prepares B Report"
          value={{
            preparesScore: prep.preparesScore,
            rigorProgression: prep.rigorProgression,
            missingConcepts: prep.missingConcepts,
            suggestedAdditions: prep.suggestedAdditions,
            suggestedScaffolds: prep.suggestedScaffolds,
          }}
        />
      )}
      {(unreadableA || unreadableB) && (
        <ResultSection
          title="Fallback"
          value="One or both documents were unreadable. Comparison and preparation scoring were skipped."
        />
      )}
      <CompareDocumentInsights data={record} />
      <ResultSection title="Comparison Insight" value={notes} />
      <ResultSection title="Comparison Data" value={comparison} />
    </div>
  );
}

function TestResultCard({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const simulation = record.simulation;
  const documentInsights = record.documentInsights;
  const unreadable = isRecord(documentInsights) && isRecord(documentInsights.flags) ? Boolean(documentInsights.flags.unreadable) : false;
  const philosopher = isRecord(record.philosopher) ? record.philosopher : null;
  const notes = philosopher?.teacherFeedback ?? philosopher?.analysis ?? philosopher?.notes;
  return (
    <div className="workflow-result-card">
      <div className="workflow-result-head">Playtest Complete</div>
      <div className="workflow-result-metrics">
        <div><span>Type</span><strong>{safeString(record.type) || "test"}</strong></div>
        <div><span>Simulation payload</span><strong>{simulation ? "ready" : "empty"}</strong></div>
        <div><span>Playtest insight</span><strong>{notes ? "ready" : "none"}</strong></div>
      </div>
      <SmartInsights
        data={record}
        specs={[
          { label: "Completion", aliases: ["completionRate", "predictedCompletionRate"] },
          { label: "Perceived Success", aliases: ["perceivedSuccess"] },
          { label: "Engagement", aliases: ["engagementScore"] },
          { label: "Fatigue", aliases: ["fatigueIndex"] },
          { label: "At-Risk", aliases: ["atRiskProfile", "riskLevel"] },
          { label: "Avg Time", aliases: ["avgTimeMinutes", "timeToCompleteMinutes"] },
        ]}
      />
      <ResultSection title="Simulation Insight" value={notes} />
      {unreadable && (
        <ResultSection
          title="Fallback"
          value="Document unreadable. Playtest simulation was skipped."
        />
      )}
      <DocumentInsightsSummary
        insights={documentInsights}
        title="Playtest Input Signals"
        specs={[
          { label: "Subject", path: "metadata.subjectEstimate" },
          { label: "Difficulty", path: "metadata.difficulty" },
          { label: "Reading Level", path: "metadata.readingLevel" },
          { label: "Concept Vocabulary", path: "vocab" },
          { label: "Formulas", path: "formulas" },
          { label: "Question Examples", path: "examples" },
          { label: "Scanned Flag", path: "flags.scanned" },
          { label: "Unreadable Flag", path: "flags.unreadable" },
        ]}
      />
      <ResultSection title="Simulation Data" value={simulation} />
    </div>
  );
}

function DocumentResultCard({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const documentInsights = record.documentInsights;
  const unreadable = isRecord(documentInsights) && isRecord(documentInsights.flags) ? Boolean(documentInsights.flags.unreadable) : false;
  return (
    <div className="workflow-result-card">
      <div className="workflow-result-head">Document View Ready</div>
      <div className="workflow-result-metrics">
        <div><span>View</span><strong>{safeString(record.view) || "summary"}</strong></div>
        <div><span>Schema</span><strong>{record.schema ? "ready" : "empty"}</strong></div>
        <div><span>View data</span><strong>{record.viewData ? "ready" : "empty"}</strong></div>
      </div>
      <SmartInsights
        data={record}
        specs={[
          { label: "Concepts", aliases: ["conceptCount", "concepts"] },
          { label: "Difficulty", aliases: ["difficulty", "difficultyBand"] },
          { label: "Summary", aliases: ["summary"] },
          { label: "Template", aliases: ["templateName", "template"] },
          { label: "Grade", aliases: ["gradeBand", "gradeLevels"] },
          { label: "Course", aliases: ["course", "subject"] },
        ]}
      />
      <DocumentInsightsSummary
        insights={documentInsights}
        title="Document Extraction Snapshot"
        specs={[
          { label: "Subject", path: "metadata.subjectEstimate" },
          { label: "Grade", path: "metadata.gradeEstimate" },
          { label: "Topic Candidates", path: "metadata.topicCandidates" },
          { label: "Sections", path: "sections" },
          { label: "Tables", path: "tables" },
          { label: "Diagrams", path: "diagrams" },
          { label: "Metadata Confidence", path: "confidence.metadata" },
          { label: "Low Confidence", path: "flags.lowConfidence" },
        ]}
      />
      {unreadable && (
        <ResultSection
          title="Fallback"
          value="Document unreadable. Document view extraction was skipped."
        />
      )}
      <ResultSection title="Selected View Output" value={record.viewData} />
      <ResultSection title="Teacher Profile" value={record.teacherProfile} />
      <ResultSection title="Course Profile" value={record.courseProfile} />
    </div>
  );
}

function ResultTabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const selected = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!selected) return null;

  return (
    <div className="workflow-tabs">
      <div className="workflow-tabs__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`workflow-tabs__tab${tab.id === selected.id ? " is-active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="workflow-tabs__panel">{selected.content}</div>
    </div>
  );
}

function WorkflowShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="workflow-panel">
      <h3 className="workflow-panel__title">
        <span className="workflow-panel__title-mark" aria-hidden="true" />
        {title}
      </h3>
      <p className="workflow-panel__description">{description}</p>
      {children}
    </section>
  );
}

export function AnalyzeDocumentPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const text = await readFileText(file);
      const output = await runOrchestrator({
        intent: "analyze",
        input: {
          fileName: file.name,
          text,
          question: question.trim() || null,
        },
      });
      setResult(output);
    } catch (e: any) {
      setError(e?.message ?? "Analyze failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <WorkflowShell
      title="Analyze a Document"
      description="Upload one document and optionally add a focus question."
    >
      <input className="workflow-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input
        className="workflow-input"
        type="text"
        placeholder="Optional: what do you want to understand?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="workflow-actions">
        <button className="ca-btn-primary" type="button" onClick={run} disabled={!file || isLoading}>
          {isLoading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>
      {error && <p className="workflow-error">{error}</p>}
      {result !== null && (
        <ResultTabs
          tabs={[
            { id: "card", label: "Overview", content: <AnalyzeResultCard data={result} /> },
            { id: "raw", label: "Raw JSON", content: <JsonBlock data={result} /> },
          ]}
        />
      )}
    </WorkflowShell>
  );
}

export function CompareDocumentsPanel() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [comparisonType, setComparisonType] = useState("general");
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!fileA || !fileB) return;
    setError(null);
    setIsLoading(true);
    try {
      const [textA, textB] = await Promise.all([readFileText(fileA), readFileText(fileB)]);
      const output = await runOrchestrator({
        intent: "compare",
        input: {
          a: { fileName: fileA.name, text: textA },
          b: { fileName: fileB.name, text: textB },
          comparisonType,
        },
      });
      setResult(output);
    } catch (e: any) {
      setError(e?.message ?? "Compare failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <WorkflowShell
      title="Compare Two Documents"
      description="Upload document A and B, then choose a comparison lens."
    >
      <div className="workflow-stack">
        <input className="workflow-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFileA(e.target.files?.[0] ?? null)} />
        <input className="workflow-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFileB(e.target.files?.[0] ?? null)} />
        <select
          className="workflow-input"
          value={comparisonType}
          onChange={(e) => setComparisonType(e.target.value)}
        >
          <option value="general">General comparison</option>
          <option value="difficulty">Difficulty-focused</option>
          <option value="coverage">Coverage-focused</option>
          <option value="preparation">Does A prepare students for B?</option>
        </select>
      </div>
      <div className="workflow-actions">
        <button className="ca-btn-primary" type="button" onClick={run} disabled={!fileA || !fileB || isLoading}>
          {isLoading ? "Comparing..." : "Run Comparison"}
        </button>
      </div>
      {error && <p className="workflow-error">{error}</p>}
      {result !== null && (
        <ResultTabs
          tabs={[
            { id: "card", label: "Overview", content: <CompareResultCard data={result} /> },
            { id: "raw", label: "Raw JSON", content: <JsonBlock data={result} /> },
          ]}
        />
      )}
    </WorkflowShell>
  );
}

export function PlaytestAssessmentPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState("standard");
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const text = await readFileText(file);
      const output = await runOrchestrator({
        intent: "test",
        input: {
          fileName: file.name,
          text,
          level,
        },
      });
      setResult(output);
    } catch (e: any) {
      setError(e?.message ?? "Playtest failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <WorkflowShell
      title="Playtest with Simulated Students"
      description="Upload an assessment and choose student level for simulation."
    >
      <div className="workflow-stack">
        <input className="workflow-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <select
          className="workflow-input"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="remedial">Remedial</option>
          <option value="standard">Standard</option>
          <option value="honors">Honors</option>
          <option value="AP">AP / Advanced</option>
        </select>
      </div>
      <div className="workflow-actions">
        <button className="ca-btn-primary" type="button" onClick={run} disabled={!file || isLoading}>
          {isLoading ? "Running simulation..." : "Run Playtest"}
        </button>
      </div>
      {error && <p className="workflow-error">{error}</p>}
      {result !== null && (
        <ResultTabs
          tabs={[
            { id: "card", label: "Overview", content: <TestResultCard data={result} /> },
            { id: "raw", label: "Raw JSON", content: <JsonBlock data={result} /> },
          ]}
        />
      )}
    </WorkflowShell>
  );
}

const DOC_VIEW_OPTIONS: Array<{ label: string; value: OrchestratorIntent }> = [
  { label: "Summary", value: "summary" },
  { label: "Concepts", value: "concepts" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Raw", value: "raw" },
];

export function DocumentViewPanel({ initialIntent }: { initialIntent: OrchestratorIntent }) {
  const initialView = DOC_VIEW_OPTIONS.some((o) => o.value === initialIntent) ? initialIntent : "summary";
  const [view, setView] = useState<OrchestratorIntent>(initialView);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const text = await readFileText(file);
      const output = await runOrchestrator({
        intent: view,
        input: {
          fileName: file.name,
          text,
        },
      });
      setResult(output);
    } catch (e: any) {
      setError(e?.message ?? "Document view failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <WorkflowShell
      title="Document Views"
      description="Upload a document and choose summary, concepts, difficulty, or raw output."
    >
      <div className="workflow-stack">
        <input className="workflow-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <select
          className="workflow-input"
          value={view}
          onChange={(e) => setView(e.target.value as OrchestratorIntent)}
        >
          {DOC_VIEW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="workflow-actions">
        <button className="ca-btn-primary" type="button" onClick={run} disabled={!file || isLoading}>
          {isLoading ? "Loading view..." : "Run Document View"}
        </button>
      </div>
      {error && <p className="workflow-error">{error}</p>}
      {result !== null && (
        <ResultTabs
          tabs={[
            { id: "card", label: "Overview", content: <DocumentResultCard data={result} /> },
            { id: "raw", label: "Raw JSON", content: <JsonBlock data={result} /> },
          ]}
        />
      )}
    </WorkflowShell>
  );
}
