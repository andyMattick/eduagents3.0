import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import type { DocumentRole, DocumentSession, SessionRole } from "../../prism-v4/schema/domain";
import type { IntentProduct, IntentProductPayload } from "../../prism-v4/schema/integration/IntentProduct";
import type { IntentType } from "../../prism-v4/schema/integration/IntentRequest";
import type { AnalyzedDocument, DocumentCollectionAnalysis, TaggingPipelineInput } from "../../prism-v4/schema/semantic";

import { SemanticViewer } from "./SemanticViewer";
import "./v4.css";

const DEBUG_UPLOAD_TRACE = import.meta.env.DEV;

function logUploadTrace(message: string, details?: Record<string, unknown>) {
  if (!DEBUG_UPLOAD_TRACE) {
    return;
  }

  if (details) {
    console.info(`[Wave6 Upload] ${message}`, details);
    return;
  }

  console.info(`[Wave6 Upload] ${message}`);
}

type RegisteredDocumentSummary = {
  documentId: string;
  sourceFileName: string;
  sourceMimeType: string;
  createdAt: string;
};

type SessionWorkspace = {
  sessionId: string;
  session: DocumentSession;
  documents: RegisteredDocumentSummary[];
  analyzedDocuments: AnalyzedDocument[];
  analysis: DocumentCollectionAnalysis | null;
  products: IntentProduct[];
};

type IntentConfig = {
  label: string;
  description: string;
  scope: "single" | "multi" | "flex";
  numericOption?: {
    key: string;
    label: string;
    defaultValue: number;
  };
};

const DOCUMENT_ROLE_OPTIONS: DocumentRole[] = ["notes", "slides", "article", "worksheet", "review", "test", "mixed", "unknown"];
const SESSION_ROLE_OPTIONS: SessionRole[] = ["source-material", "target-assessment", "target-review", "unit-member", "comparison-target"];
const SUPPORTED_INTENTS: IntentType[] = [
  "build-unit",
  "build-lesson",
  "build-instructional-map",
  "curriculum-alignment",
  "compare-documents",
  "merge-documents",
  "build-sequence",
  "build-review",
  "build-test",
  "extract-problems",
  "extract-concepts",
  "summarize",
];

const INTENT_CONFIG: Record<IntentType, IntentConfig> = {
  "build-unit": { label: "Build Unit", description: "Generate a multi-day sequence, concept map, and assessment plan.", scope: "multi" },
  "build-lesson": { label: "Build Lesson", description: "Turn one source document into a structured lesson with scaffolds and misconceptions.", scope: "single" },
  "build-instructional-map": { label: "Instructional Map", description: "Visualize concept, representation, misconception, and difficulty relationships.", scope: "multi" },
  "curriculum-alignment": { label: "Curriculum Alignment", description: "Summarize standards-like coverage, gaps, redundancies, and suggested fixes.", scope: "flex" },
  "compare-documents": { label: "Compare Documents", description: "Compare overlap, differences, density, and similarity across selected documents.", scope: "multi" },
  "merge-documents": { label: "Merge Documents", description: "Combine problems, fragments, and concepts into one merged instructional artifact.", scope: "multi" },
  "build-sequence": { label: "Build Sequence", description: "Recommend the best order for teaching across the selected documents.", scope: "multi" },
  "build-review": { label: "Build Review", description: "Create a focused review pack from the selected documents.", scope: "flex", numericOption: { key: "maxSections", label: "Max sections", defaultValue: 3 } },
  "build-test": { label: "Build Test", description: "Draft an assessment using the selected problems and concepts.", scope: "flex", numericOption: { key: "itemCount", label: "Item count", defaultValue: 5 } },
  "extract-problems": { label: "Extract Problems", description: "List the selected problems with anchors back to the source documents.", scope: "flex", numericOption: { key: "maxItems", label: "Max problems", defaultValue: 10 } },
  "extract-concepts": { label: "Extract Concepts", description: "List concept coverage and cross-document visibility.", scope: "flex", numericOption: { key: "maxConcepts", label: "Max concepts", defaultValue: 8 } },
  "summarize": { label: "Summarize", description: "Create a concise product-oriented summary of the selected sources.", scope: "flex" },
  "build-practice-set": { label: "Build Practice Set", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "rewrite": { label: "Rewrite", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "student-handout": { label: "Student Handout", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "teacher-guide": { label: "Teacher Guide", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "build-test-from-review": { label: "Build Test From Review", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "build-review-from-test": { label: "Build Review From Test", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
};

function guessDocumentRole(file: File): DocumentRole {
  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("slide") || file.type.includes("presentation")) {
    return "slides";
  }
  if (lowerName.includes("note") || file.type.includes("wordprocessingml")) {
    return "notes";
  }
  if (lowerName.includes("review")) {
    return "review";
  }
  if (lowerName.includes("quiz") || lowerName.includes("test") || lowerName.includes("assessment")) {
    return "test";
  }
  if (lowerName.includes("worksheet") || lowerName.includes("practice")) {
    return "worksheet";
  }
  if (lowerName.includes("article") || lowerName.includes("reading")) {
    return "article";
  }
  return "unknown";
}

function guessSessionRole(role: DocumentRole): SessionRole {
  if (role === "test") {
    return "target-assessment";
  }
  if (role === "review") {
    return "target-review";
  }
  return "unit-member";
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getIntentConfig(intentType: IntentType) {
  return INTENT_CONFIG[intentType] ?? { label: intentType, description: "Generate a product from the selected documents.", scope: "flex" as const };
}

function getProductTitle(product: IntentProduct) {
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
  return getIntentConfig(product.intentType).label;
}

function renderProductPayload(product: IntentProduct) {
  const payload = product.payload as IntentProductPayload;

  if (payload.kind === "lesson") {
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
          <ul>{payload.scaffolds.map((entry) => <li key={`${entry.level}-${entry.strategy}`}>{entry.level}: {entry.strategy}</li>)}</ul>
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
        </div>
        <div className="v4-product-card">
          <h3>Representation Graph</h3>
          <p>{payload.representationGraph.nodes.length} nodes, {payload.representationGraph.edges.length} edges</p>
        </div>
        <div className="v4-product-card v4-product-span">
          <h3>Document Alignment</h3>
          <ul>{payload.documentConceptAlignment.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}: {entry.concepts.join(", ") || "No concepts extracted"}</li>)}</ul>
        </div>
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
    return <div className="v4-product-card"><h3>Recommended Order</h3><ol>{payload.recommendedOrder.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}</li>)}</ol></div>;
  }

  if (payload.kind === "review") {
    return <div className="v4-product-card"><h3>Review Sections</h3><ul>{payload.sections.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul></div>;
  }

  if (payload.kind === "test") {
    return <div className="v4-product-card"><h3>Assessment Sections</h3><ul>{payload.sections.map((entry) => <li key={entry.concept}>{entry.concept}: {entry.items.length} item(s)</li>)}</ul></div>;
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

export function DocumentUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFileMap, setUploadedFileMap] = useState<Record<string, File>>({});
  const [workspace, setWorkspace] = useState<SessionWorkspace | null>(null);
  const [currentProduct, setCurrentProduct] = useState<IntentProduct | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<IntentType>("build-unit");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [primaryDocumentId, setPrimaryDocumentId] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [numericOptionValue, setNumericOptionValue] = useState(String(getIntentConfig("build-unit").numericOption?.defaultValue ?? 5));
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastIntentRequest, setLastIntentRequest] = useState<{ intentType: IntentType; documentIds: string[]; options?: Record<string, unknown> } | null>(null);
  const [showDebugViewer, setShowDebugViewer] = useState(false);
  const [debugDocumentId, setDebugDocumentId] = useState<string | null>(null);
  const [debugInput, setDebugInput] = useState<TaggingPipelineInput | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  const uploadInFlightRef = useRef(false);
  const lastUploadAttemptKeyRef = useRef<string | null>(null);

  async function fetchJson<T>(input: string, init?: RequestInit) {
    const response = await fetch(input, init);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed: ${input}`);
    }
    return payload as T;
  }

  async function refreshWorkspace(sessionId: string) {
    const [sessionPayload, analysisPayload, productsPayload] = await Promise.all([
      fetchJson<{ session: DocumentSession; documents: RegisteredDocumentSummary[]; analyzedDocuments: AnalyzedDocument[] }>(`/api/v4/documents/session?sessionId=${encodeURIComponent(sessionId)}`),
      fetchJson<{ analysis: DocumentCollectionAnalysis }>(`/api/v4/documents/session/${encodeURIComponent(sessionId)}/analysis?sessionId=${encodeURIComponent(sessionId)}`),
      fetchJson<{ sessionId: string; products: IntentProduct[] }>(`/api/v4/documents/intent?sessionId=${encodeURIComponent(sessionId)}`),
    ]);

    setWorkspace({
      sessionId,
      session: sessionPayload.session,
      documents: sessionPayload.documents,
      analyzedDocuments: sessionPayload.analyzedDocuments,
      analysis: analysisPayload.analysis,
      products: productsPayload.products,
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const uploadAttemptKey = selectedFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .sort()
      .join("|");

    if (uploadInFlightRef.current || isUploading) {
      logUploadTrace("ignored submit while upload in flight", { isUploading, selectedFileCount: selectedFiles.length });
      return;
    }

    if (uploadAttemptKey.length > 0 && lastUploadAttemptKeyRef.current === uploadAttemptKey) {
      logUploadTrace("ignored duplicate submit", { uploadAttemptKey, selectedFileCount: selectedFiles.length });
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Choose one or more PDF, DOCX, or PPTX files before building the workspace.");
      return;
    }

    uploadInFlightRef.current = true;
    lastUploadAttemptKeyRef.current = uploadAttemptKey;
    setIsUploading(true);
    setError(null);
    logUploadTrace("upload started", { uploadAttemptKey, selectedFileCount: selectedFiles.length });

    try {
      const registered: RegisteredDocumentSummary[] = [];
      const nextFileMap: Record<string, File> = {};
      let sessionId: string | null = null;

      for (const file of selectedFiles) {
        logUploadTrace("uploading file", { fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" });
        const buffer = await file.arrayBuffer();
        const payload = await fetchJson<{ documentId: string; sessionId: string; registered: RegisteredDocumentSummary[] }>("/api/v4/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-file-name": file.name,
          },
          body: buffer,
        });
        const uploaded = payload.registered[0]!;
        registered.push(uploaded);
        nextFileMap[uploaded.documentId] = file;
        sessionId = sessionId ?? payload.sessionId;
        logUploadTrace("file uploaded", { fileName: file.name, documentId: uploaded.documentId, sessionId: payload.sessionId });
      }

      const documentRoles = Object.fromEntries(registered.map((entry) => {
        const file = nextFileMap[entry.documentId]!;
        const role = guessDocumentRole(file);
        return [entry.documentId, [role]];
      }));
      const sessionRoles = Object.fromEntries(registered.map((entry) => {
        const role = documentRoles[entry.documentId]?.[0] ?? "unknown";
        return [entry.documentId, [guessSessionRole(role)]];
      }));

      logUploadTrace("persisting session roles", { sessionId, documentCount: registered.length });
      await fetchJson("/api/v4/documents/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          documentIds: registered.map((entry) => entry.documentId),
          documentRoles,
          sessionRoles,
        }),
      });

      // Analysis is now performed inline inside /api/v4/documents/upload while
      // the binary is still in memory. A separate /analyze call is not needed
      // and would always 404 in a stateless Vercel serverless environment
      // because the in-memory registry is not shared across invocations.
      logUploadTrace("analysis completed inline during upload", { documentCount: registered.length });

      setUploadedFileMap((current) => ({ ...current, ...nextFileMap }));
      setSelectedDocumentIds(registered.map((entry) => entry.documentId));
      setPrimaryDocumentId(registered[0]?.documentId ?? null);
      setCurrentProduct(null);
      setLastIntentRequest(null);
      logUploadTrace("refreshing workspace", { sessionId });
      await refreshWorkspace(sessionId!);
      logUploadTrace("upload flow complete", { sessionId, uploadedCount: registered.length });
    } catch (uploadError) {
      setWorkspace(null);
      setCurrentProduct(null);
      setError(uploadError instanceof Error ? uploadError.message : "Workspace creation failed.");
      logUploadTrace("upload flow failed", { error: uploadError instanceof Error ? uploadError.message : "Workspace creation failed." });
    } finally {
      setIsUploading(false);
      uploadInFlightRef.current = false;
      logUploadTrace("upload lock released");
    }
  }

  async function persistSession(nextSession: DocumentSession) {
    await fetchJson("/api/v4/documents/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSession),
    });
    await refreshWorkspace(nextSession.sessionId);
  }

  async function updateDocumentRole(documentId: string, role: DocumentRole) {
    if (!workspace) {
      return;
    }

    setError(null);
    const nextSession: DocumentSession = {
      ...workspace.session,
      documentRoles: {
        ...workspace.session.documentRoles,
        [documentId]: [role],
      },
    };
    await persistSession(nextSession);
  }

  async function updateSessionRole(documentId: string, role: SessionRole) {
    if (!workspace) {
      return;
    }

    setError(null);
    const nextSession: DocumentSession = {
      ...workspace.session,
      sessionRoles: {
        ...workspace.session.sessionRoles,
        [documentId]: [role],
      },
    };
    await persistSession(nextSession);
  }

  function getActionDocumentIds() {
    if (!workspace) {
      return [];
    }

    const config = getIntentConfig(selectedIntent);
    if (config.scope === "single") {
      return primaryDocumentId ? [primaryDocumentId] : [];
    }

    return selectedDocumentIds.length > 0 ? selectedDocumentIds : workspace.documents.map((entry) => entry.documentId);
  }

  function buildIntentOptions() {
    const config = getIntentConfig(selectedIntent);
    const options: Record<string, unknown> = {};
    if (focus.trim()) {
      options.focus = focus.trim();
    }
    if (config.numericOption) {
      const parsed = Number(numericOptionValue);
      if (Number.isFinite(parsed) && parsed > 0) {
        options[config.numericOption.key] = Math.floor(parsed);
      }
    }
    return Object.keys(options).length > 0 ? options : undefined;
  }

  async function generateProduct(intentType = selectedIntent, documentIds = getActionDocumentIds(), options = buildIntentOptions()) {
    if (!workspace) {
      return;
    }

    if (documentIds.length === 0) {
      setError("Select the document scope before generating a product.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const product = await fetchJson<IntentProduct>("/api/v4/documents/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: workspace.sessionId, documentIds, intentType, options }),
      });
      setCurrentProduct(product);
      setLastIntentRequest({ intentType, documentIds, options });
      await refreshWorkspace(workspace.sessionId);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Product generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setError(null);
  }

  function toggleSelectedDocument(documentId: string) {
    setSelectedDocumentIds((current) => current.includes(documentId)
      ? current.filter((entry) => entry !== documentId)
      : [...current, documentId]);
  }

  async function openDebugViewer(documentId: string) {
    const file = uploadedFileMap[documentId];
    if (!file) {
      setDebugError("This document is no longer available in local memory for debug replay.");
      setShowDebugViewer(true);
      return;
    }

    setIsLoadingDebug(true);
    setDebugError(null);
    setDebugDocumentId(documentId);
    setShowDebugViewer(true);
    try {
      const input = await fetchJson<TaggingPipelineInput>("/api/v4-ingest", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-file-name": file.name,
        },
        body: await file.arrayBuffer(),
      });
      setDebugInput(input);
    } catch (debugLoadError) {
      setDebugInput(null);
      setDebugError(debugLoadError instanceof Error ? debugLoadError.message : "Debug semantic viewer failed.");
    } finally {
      setIsLoadingDebug(false);
    }
  }

  function exportCurrentProduct() {
    if (!currentProduct || typeof window === "undefined") {
      return;
    }

    const blob = new Blob([JSON.stringify(currentProduct, null, 2)], { type: "application/json" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${currentProduct.productType}-${currentProduct.productId}.json`;
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  const currentIntentConfig = getIntentConfig(selectedIntent);
  const actionDocumentIds = getActionDocumentIds();

  return (
    <div className="v4-viewer">
      <div className="v4-shell">
        <section className="v4-panel v4-hero">
          <div>
            <p className="v4-kicker">Document Ingestion</p>
            <h1>What documents do you want to process?</h1>
            <p className="v4-subtitle">
              Upload multiple documents, assign roles, inspect analysis summaries, and route directly into the new intent-driven product engine.
            </p>
          </div>

          <form className="v4-upload-form" onSubmit={handleUpload}>
            <label className="v4-upload-field" htmlFor="v4-upload-input">
              <span>Source documents</span>
              <input
                id="v4-upload-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileChange}
              />
            </label>

            <div className="v4-upload-actions">
              <button className="v4-button" type="submit" disabled={isUploading}>
                {isUploading ? "Building workspace..." : "Build document workspace"}
              </button>
              {selectedFiles.length > 0 && <span className="v4-upload-name">{selectedFiles.length} file(s) selected</span>}
            </div>

            {selectedFiles.length > 0 && (
              <ul className="v4-inline-list" aria-label="Selected files">
                {selectedFiles.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
              </ul>
            )}

            {error && <p className="v4-error">{error}</p>}
          </form>
        </section>

        {workspace && (
          <div className="v4-viewer-grid v4-workspace-grid">
            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Workspace</p>
                  <h2>Document workspace</h2>
                </div>
                <span className="v4-pill">{workspace.sessionId}</span>
              </div>
              <div className="v4-stat-grid">
                <div className="v4-stat-card"><span className="v4-stat-label">Documents</span><strong>{workspace.documents.length}</strong></div>
                <div className="v4-stat-card"><span className="v4-stat-label">Analyzed</span><strong>{workspace.analyzedDocuments.length}</strong></div>
                <div className="v4-stat-card"><span className="v4-stat-label">Products</span><strong>{workspace.products.length}</strong></div>
                <div className="v4-stat-card"><span className="v4-stat-label">Concepts</span><strong>{workspace.analysis?.coverageSummary.totalConcepts ?? 0}</strong></div>
              </div>
              {workspace.analysis && (
                <div className="v4-analysis-summary">
                  <h3>Analysis summary</h3>
                  <p>{workspace.analysis.coverageSummary.totalConcepts} concepts across {workspace.analysis.documentIds.length} documents.</p>
                  <p>{workspace.analysis.conceptGaps.length} concept gaps and {workspace.analysis.documentSimilarity.length} similarity edges detected.</p>
                </div>
              )}
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Documents</p>
                  <h2>Document list</h2>
                </div>
                <span className="v4-pill">Roles + summaries</span>
              </div>
              <div className="v4-document-list">
                {workspace.documents.map((document) => {
                  const analyzed = workspace.analyzedDocuments.find((entry) => entry.document.id === document.documentId);
                  return (
                    <article key={document.documentId} className="v4-document-card">
                      <div className="v4-document-card-header">
                        <div>
                          <h3>{document.sourceFileName}</h3>
                          <p>{document.sourceMimeType}</p>
                        </div>
                        <label className="v4-document-toggle">
                          <input
                            type="checkbox"
                            checked={selectedDocumentIds.includes(document.documentId)}
                            onChange={() => toggleSelectedDocument(document.documentId)}
                          />
                          <span>Include</span>
                        </label>
                      </div>
                      <div className="v4-document-controls">
                        <label>
                          <span>Document role</span>
                          <select value={workspace.session.documentRoles[document.documentId]?.[0] ?? "unknown"} onChange={(event) => void updateDocumentRole(document.documentId, event.target.value as DocumentRole)}>
                            {DOCUMENT_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Session role</span>
                          <select value={workspace.session.sessionRoles[document.documentId]?.[0] ?? "unit-member"} onChange={(event) => void updateSessionRole(document.documentId, event.target.value as SessionRole)}>
                            {SESSION_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                        </label>
                        <label className="v4-document-toggle">
                          <input type="radio" name="primary-document" checked={primaryDocumentId === document.documentId} onChange={() => setPrimaryDocumentId(document.documentId)} />
                          <span>Primary</span>
                        </label>
                      </div>
                      <div className="v4-document-summary">
                        <p><strong>Analysis:</strong> {analyzed ? `${analyzed.problems.length} problems, ${analyzed.insights.concepts.length} concepts, ${formatPercent(analyzed.insights.instructionalDensity)} instructional density` : "Analyzing..."}</p>
                        <button className="v4-button v4-button-secondary" type="button" onClick={() => void openDebugViewer(document.documentId)}>
                          Inspect semantic viewer
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Intent Router</p>
                  <h2>What do you want to do with these documents?</h2>
                </div>
                <span className="v4-pill">{actionDocumentIds.length} document(s) in scope</span>
              </div>
              <div className="v4-intent-grid">
                <label className="v4-upload-field">
                  <span>Intent selection</span>
                  <select
                    aria-label="Intent selection"
                    value={selectedIntent}
                    onChange={(event) => {
                      const nextIntent = event.target.value as IntentType;
                      setSelectedIntent(nextIntent);
                      setNumericOptionValue(String(getIntentConfig(nextIntent).numericOption?.defaultValue ?? 5));
                    }}
                  >
                    {SUPPORTED_INTENTS.map((intent) => <option key={intent} value={intent}>{getIntentConfig(intent).label}</option>)}
                  </select>
                </label>
                <label className="v4-upload-field">
                  <span>Focus</span>
                  <input aria-label="Focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="fractions, equations, review, misconceptions..." />
                </label>
                {currentIntentConfig.numericOption && (
                  <label className="v4-upload-field">
                    <span>{currentIntentConfig.numericOption.label}</span>
                    <input aria-label={currentIntentConfig.numericOption.label} type="number" min={1} value={numericOptionValue} onChange={(event) => setNumericOptionValue(event.target.value)} />
                  </label>
                )}
              </div>
              <p className="v4-body-copy">{currentIntentConfig.description}</p>
              <div className="v4-upload-actions">
                <button className="v4-button" type="button" onClick={() => void generateProduct()} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate product"}
                </button>
              </div>
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Product Viewer</p>
                  <h2>{currentProduct ? getProductTitle(currentProduct) : "No product yet"}</h2>
                </div>
                <div className="v4-upload-actions">
                  <button className="v4-button v4-button-secondary" type="button" onClick={exportCurrentProduct} disabled={!currentProduct}>Export</button>
                  <button className="v4-button v4-button-secondary" type="button" onClick={() => lastIntentRequest && void generateProduct(lastIntentRequest.intentType, lastIntentRequest.documentIds, lastIntentRequest.options)} disabled={!lastIntentRequest || isGenerating}>Regenerate</button>
                </div>
              </div>
              {currentProduct ? (
                <>
                  {renderProductPayload(currentProduct)}
                  <div className="v4-product-card v4-product-span">
                    <h3>Supporting semantics</h3>
                    <p>{workspace.analysis?.coverageSummary.totalConcepts ?? 0} concepts in session analysis.</p>
                    <p>{currentProduct.documentIds.length} document(s) contributed to this product.</p>
                  </div>
                </>
              ) : (
                <p className="v4-body-copy">Upload documents, choose an intent, and generate a typed product. The semantic viewer stays available as a supporting inspection surface.</p>
              )}
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">History</p>
                  <h2>Generated products</h2>
                </div>
                <span className="v4-pill">{workspace.products.length}</span>
              </div>
              <ul className="v4-history-list">
                {workspace.products.map((product) => (
                  <li key={product.productId}>
                    <button className={`v4-history-item ${currentProduct?.productId === product.productId ? "v4-history-item-active" : ""}`} type="button" onClick={() => setCurrentProduct(product)}>
                      <strong>{getProductTitle(product)}</strong>
                      <span>{product.schemaVersion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {showDebugViewer && (
          <div className="v4-modal-backdrop" role="dialog" aria-modal="true">
            <div className="v4-modal v4-debug-modal">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Supporting Panel</p>
                  <h2>Semantic viewer</h2>
                  <p className="v4-body-copy">Inspect the legacy semantic pipeline for {debugDocumentId ?? "the selected document"}.</p>
                </div>
                <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowDebugViewer(false)}>Close</button>
              </div>
              {isLoadingDebug && <p className="v4-body-copy">Loading semantic viewer...</p>}
              {debugError && <p className="v4-error">{debugError}</p>}
              {debugInput && <SemanticViewer input={debugInput} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}