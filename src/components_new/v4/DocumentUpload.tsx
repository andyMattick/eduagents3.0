import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";

import type { IntentProduct } from "../../prism-v4/schema/integration/IntentProduct";
import type { IntentType } from "../../prism-v4/schema/integration/IntentRequest";
import type { AnalyzedDocument } from "../../prism-v4/schema/semantic";
import type { InstructionalSessionWorkspace } from "../../types/v4/InstructionalSession";

import { useInstructionalSession } from "../../hooks/useInstructionalSession";
import { useAuth } from "../Auth/useAuth";
import { AnalysisPanel } from "./AnalysisPanel";
import { ProductViewer, getProductTitle } from "./ProductViewer";
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

type RegisteredDocumentSummary = InstructionalSessionWorkspace["documents"][number];

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
  "build-unit": { label: "Unit Plan", description: "Build a multi-day plan across your selected materials.", scope: "multi" },
  "build-lesson": { label: "Lesson", description: "Turn one source into a ready-to-teach lesson plan.", scope: "single" },
  "build-instructional-map": { label: "Instructional Map", description: "Show the key ideas, anchors, and relationships across documents.", scope: "multi" },
  "curriculum-alignment": { label: "Curriculum Alignment", description: "Show where your materials align, overlap, or leave gaps.", scope: "flex" },
  "compare-documents": { label: "Compare Materials", description: "Compare overlap and differences across selected materials.", scope: "multi" },
  "merge-documents": { label: "Merge Materials", description: "Combine key ideas and questions from several documents.", scope: "multi" },
  "build-sequence": { label: "Teaching Sequence", description: "Recommend the best order for teaching across the selected documents.", scope: "multi" },
  "build-review": { label: "Review Plan", description: "Create a focused review plan from the selected materials.", scope: "flex", numericOption: { key: "maxSections", label: "Sections", defaultValue: 3 } },
  "build-test": { label: "Assessment", description: "Draft a printable assessment from the selected materials.", scope: "flex", numericOption: { key: "itemCount", label: "Questions", defaultValue: 5 } },
  "extract-problems": { label: "Questions From Your Materials", description: "Pull out the questions already present in your materials.", scope: "flex", numericOption: { key: "maxItems", label: "Max questions", defaultValue: 10 } },
  "extract-concepts": { label: "Key Ideas", description: "Surface the main ideas already present in your materials.", scope: "flex", numericOption: { key: "maxConcepts", label: "Max ideas", defaultValue: 8 } },
  "summarize": { label: "Summary", description: "Create a concise teaching summary of the selected sources.", scope: "flex" },
  "build-practice-set": { label: "Build Practice Set", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "rewrite": { label: "Rewrite", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "student-handout": { label: "Student Handout", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "teacher-guide": { label: "Teacher Guide", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "build-test-from-review": { label: "Build Test From Review", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
  "build-review-from-test": { label: "Build Review From Test", description: "Not yet surfaced in the Wave 6 UI.", scope: "flex" },
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describeAnalyzedDocument(analyzed: AnalyzedDocument | undefined) {
  if (!analyzed) {
    return "Preparing a summary of this material.";
  }

  const conceptCount = analyzed.insights.concepts.length;
  const problemCount = analyzed.problems.length;
  const density = formatPercent(analyzed.insights.instructionalDensity);
  return `${problemCount} question${problemCount === 1 ? "" : "s"}, ${conceptCount} key idea${conceptCount === 1 ? "" : "s"}, ${density} instructional density.`;
}

function formatScopeSummary(intentType: IntentType, documents: RegisteredDocumentSummary[]) {
  const config = getIntentConfig(intentType);
  const names = documents.map((document) => document.sourceFileName);
  const description = names.length > 0 ? names.join(", ") : "the materials you select";

  if (config.scope === "single") {
    return `This will use one main source: ${description}.`;
  }

  if (config.scope === "multi") {
    return `This will combine multiple materials: ${description}.`;
  }

  return `This can use one or more materials: ${description}.`;
}

function getIntentConfig(intentType: IntentType) {
  return INTENT_CONFIG[intentType] ?? { label: intentType, description: "Generate a product from the selected documents.", scope: "flex" as const };
}

function resolveIntentDocumentIds(workspace: InstructionalSessionWorkspace | null, intentType: IntentType, selectedDocumentIds: string[], primaryDocumentId: string | null) {
  if (!workspace) {
    return [];
  }

  const config = getIntentConfig(intentType);
  const allDocumentIds = workspace.documents.map((entry) => entry.documentId);

  if (config.scope === "single") {
    return primaryDocumentId ? [primaryDocumentId] : [];
  }

  if (config.scope === "multi") {
    if (selectedDocumentIds.length >= 2) {
      return selectedDocumentIds;
    }
    return allDocumentIds.length >= 2 ? allDocumentIds : selectedDocumentIds;
  }

  return selectedDocumentIds.length > 0 ? selectedDocumentIds : allDocumentIds;
}

function getIntentBlockedReason(workspace: InstructionalSessionWorkspace | null, intentType: IntentType, documentIds: string[]) {
  if (!workspace) {
    return "Build a document workspace before generating a product.";
  }

  const config = getIntentConfig(intentType);
  if (documentIds.length === 0) {
    return "Select the document scope before generating a product.";
  }

  if (config.scope === "multi" && documentIds.length < 2) {
    return `${config.label} requires at least 2 documents in the workspace.`;
  }

  return null;
}

function getUploadBlockedReason(selectedFileCount: number, isUploading: boolean) {
  if (isUploading) {
    return "Workspace creation is already running.";
  }

  if (selectedFileCount === 0) {
    return "Choose one or more files to get started.";
  }

  return null;
}

function getRegenerateBlockedReason(lastIntentRequest: { intentType: IntentType; documentIds: string[]; options?: Record<string, unknown> } | null, isGenerating: boolean) {
  if (isGenerating) {
    return "Wait for the current generation request to finish.";
  }

  return lastIntentRequest ? null : "Create a document once before building again.";
}

export function DocumentUpload() {
  const { user } = useAuth();
  const {
    workspace,
    instructionalSession,
    isUploading,
    error,
    setError,
    createSessionFromFiles,
    loadClassProfile,
    loadDifferentiatedBuild,
    refreshWorkspace,
    clearSession,
  } = useInstructionalSession();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<IntentProduct | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<IntentType>("build-unit");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [primaryDocumentId, setPrimaryDocumentId] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [numericOptionValue, setNumericOptionValue] = useState(String(getIntentConfig("build-unit").numericOption?.defaultValue ?? 5));
  const [unitId, setUnitId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [adaptiveConditioningEnabled, setAdaptiveConditioningEnabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastIntentRequest, setLastIntentRequest] = useState<{ intentType: IntentType; documentIds: string[]; options?: Record<string, unknown> } | null>(null);
  const uploadInFlightRef = useRef(false);
  const lastUploadAttemptKeyRef = useRef<string | null>(null);

  async function fetchJson<T>(input: string, init?: RequestInit) {
    const response = await fetch(input, init);
    const rawBody = await response.text();
    const trimmedBody = rawBody.trim();

    if (!trimmedBody) {
      throw new Error(`Empty response from ${input}`);
    }

    if (trimmedBody.startsWith("<!DOCTYPE") || trimmedBody.startsWith("<html") || trimmedBody.startsWith("<")) {
      throw new Error(`Non-JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trimmedBody);
    } catch {
      throw new Error(`Invalid JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
    }

    if (!response.ok) {
      const errorMessage = typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: unknown }).error ?? `Request failed: ${input}`)
        : `Request failed: ${input}`;
      throw new Error(errorMessage);
    }
    return payload as T;
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
    setError(null);
    logUploadTrace("upload started", { uploadAttemptKey, selectedFileCount: selectedFiles.length });

    try {
      const nextWorkspace = await createSessionFromFiles(selectedFiles);
      if (!nextWorkspace) {
        return;
      }

      logUploadTrace("analysis completed inline during upload", { documentCount: nextWorkspace.documents.length });

      setSelectedDocumentIds(nextWorkspace.documents.map((entry) => entry.documentId));
      setPrimaryDocumentId(nextWorkspace.documents[0]?.documentId ?? null);
      setCurrentProduct(null);
      setLastIntentRequest(null);
      logUploadTrace("upload flow complete", { sessionId: nextWorkspace.sessionId, uploadedCount: nextWorkspace.documents.length });
    } catch (uploadError) {
      setCurrentProduct(null);
      setError(uploadError instanceof Error ? uploadError.message : "Workspace creation failed.");
      logUploadTrace("upload flow failed", { error: uploadError instanceof Error ? uploadError.message : "Workspace creation failed." });
    } finally {
      uploadInFlightRef.current = false;
      logUploadTrace("upload lock released");
    }
  }

  function getActionDocumentIds() {
    return resolveIntentDocumentIds(workspace, selectedIntent, selectedDocumentIds, primaryDocumentId);
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
    if (selectedIntent === "build-test") {
      if (user?.id) {
        options.teacherId = user.id;
      }
      if (unitId.trim()) {
        options.unitId = unitId.trim();
      }
    }
    return Object.keys(options).length > 0 ? options : undefined;
  }

  async function generateProduct(intentType = selectedIntent, documentIds = getActionDocumentIds(), options = buildIntentOptions()) {
    if (!workspace) {
      return;
    }

    const normalizedDocumentIds = resolveIntentDocumentIds(workspace, intentType, documentIds, primaryDocumentId);
    const config = getIntentConfig(intentType);

    if (normalizedDocumentIds.length === 0) {
      setError("Select the document scope before generating a product.");
      return;
    }

    if (config.scope === "multi" && normalizedDocumentIds.length < 2) {
      setError(`${config.label} requires at least 2 documents in the workspace.`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const requestBody: Record<string, unknown> = {
        sessionId: workspace.sessionId,
        documentIds: normalizedDocumentIds,
        intentType,
        options,
      };
      if (intentType === "build-test") {
        if (studentId.trim()) {
          requestBody.studentId = studentId.trim();
        }
        requestBody.enableAdaptiveConditioning = adaptiveConditioningEnabled;
      }
      const product = await fetchJson<IntentProduct>("/api/v4/documents/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      setCurrentProduct(product);
      setLastIntentRequest({ intentType, documentIds: normalizedDocumentIds, options });
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

  function resetSession() {
    setSelectedFiles([]);
    setUploadInputKey((current) => current + 1);
    clearSession();
    setCurrentProduct(null);
    setSelectedIntent("build-unit");
    setSelectedDocumentIds([]);
    setPrimaryDocumentId(null);
    setFocus("");
    setNumericOptionValue(String(getIntentConfig("build-unit").numericOption?.defaultValue ?? 5));
    setUnitId("");
    setStudentId("");
    setAdaptiveConditioningEnabled(true);
    setError(null);
    setLastIntentRequest(null);
    lastUploadAttemptKeyRef.current = null;
    uploadInFlightRef.current = false;
  }

  function toggleSelectedDocument(documentId: string) {
    setSelectedDocumentIds((current) => current.includes(documentId)
      ? current.filter((entry) => entry !== documentId)
      : [...current, documentId]);
  }

  function openPrintView() {
    if (!currentProduct || typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.open(`/print/${encodeURIComponent(currentProduct.productId)}?returnTo=${encodeURIComponent(returnTo)}`, "_blank", "noopener,noreferrer");
  }

  const currentIntentConfig = getIntentConfig(selectedIntent);
  const actionDocumentIds = getActionDocumentIds();
  const intentBlockedReason = getIntentBlockedReason(workspace, selectedIntent, actionDocumentIds);
  const uploadBlockedReason = getUploadBlockedReason(selectedFiles.length, isUploading);
  const regenerateBlockedReason = getRegenerateBlockedReason(lastIntentRequest, isGenerating);
  const printBlockedReason = currentProduct ? null : "Generate a product before opening print view.";
  const actionDocuments = workspace
    ? actionDocumentIds
      .map((documentId) => workspace.documents.find((entry) => entry.documentId === documentId))
      .filter((entry): entry is RegisteredDocumentSummary => Boolean(entry))
    : [];

  return (
    <div className="v4-viewer">
      <div className="v4-shell">
        <section className="v4-panel v4-hero">
          <div>
            <p className="v4-kicker">Teacher Workspace</p>
            <h1>Upload your teaching materials</h1>
            <p className="v4-subtitle">
              Turn your materials into lessons, assessments, review plans, summaries, key ideas, and printable classroom documents.
            </p>
          </div>

          <div className="v4-product-card v4-product-span">
            <h3>What you can build</h3>
            <ul className="v4-inline-list" aria-label="Available classroom documents">
              <li>Lesson</li>
              <li>Assessment</li>
              <li>Review Plan</li>
              <li>Summary</li>
              <li>Key Ideas</li>
              <li>Questions From Your Materials</li>
            </ul>
          </div>

          <form className="v4-upload-form" onSubmit={handleUpload}>
            <label className="v4-upload-field" htmlFor="v4-upload-input">
              <span>Teaching materials</span>
              <input
                key={uploadInputKey}
                id="v4-upload-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileChange}
              />
            </label>

            <div className="v4-upload-actions">
              <button className="v4-button" type="submit" disabled={Boolean(uploadBlockedReason)} title={uploadBlockedReason ?? undefined}>
                {isUploading ? "Creating workspace..." : "Create workspace"}
              </button>
              {(workspace || selectedFiles.length > 0 || currentProduct || error) && (
                <button className="v4-button v4-button-secondary" type="button" onClick={resetSession} disabled={isUploading || isGenerating}>
                  Start new session
                </button>
              )}
              {selectedFiles.length > 0 && <span className="v4-upload-name">{selectedFiles.length} file(s) selected</span>}
            </div>

            {uploadBlockedReason && !error && <p className="v4-body-copy">{uploadBlockedReason}</p>}

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
                  <p className="v4-kicker">Your Materials</p>
                  <h2>Your workspace</h2>
                </div>
              </div>
              <p className="v4-body-copy">Choose which materials to use and pick one main source when a document needs to be built from a single file.</p>
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
                          <span>Use in this build</span>
                        </label>
                      </div>
                      <div className="v4-document-controls">
                        <label className="v4-document-toggle">
                          <input type="radio" name="primary-document" checked={primaryDocumentId === document.documentId} onChange={() => setPrimaryDocumentId(document.documentId)} />
                          <span>Main source</span>
                        </label>
                      </div>
                      <div className="v4-document-summary">
                        <p>{describeAnalyzedDocument(analyzed)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <AnalysisPanel analysis={instructionalSession?.analysis ?? null} />

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Build</p>
                  <h2>What would you like to build?</h2>
                </div>
                <span className="v4-pill">{actionDocumentIds.length} material(s) selected</span>
              </div>
              <div className="v4-intent-grid">
                <label className="v4-upload-field">
                  <span>Document type</span>
                  <select
                    aria-label="What would you like to build?"
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
                  <span>Optional focus</span>
                  <input aria-label="Optional focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="fractions, equations, review, misconceptions..." />
                </label>
                {currentIntentConfig.numericOption && (
                  <label className="v4-upload-field">
                    <span>{currentIntentConfig.numericOption.label}</span>
                    <input aria-label={currentIntentConfig.numericOption.label} type="number" min={1} value={numericOptionValue} onChange={(event) => setNumericOptionValue(event.target.value)} />
                  </label>
                )}
                {selectedIntent === "build-test" && (
                  <>
                    <label className="v4-upload-field">
                      <span>Unit ID</span>
                      <input aria-label="Unit ID" value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="Optional unit scope for fingerprinting" />
                    </label>
                    <label className="v4-upload-field">
                      <span>Student ID</span>
                      <input aria-label="Student ID" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Optional student scope for adaptive planning" />
                    </label>
                    <label className="v4-upload-field">
                      <span>Adaptive conditioning</span>
                      <input aria-label="Adaptive conditioning" type="checkbox" checked={adaptiveConditioningEnabled} onChange={(event) => setAdaptiveConditioningEnabled(event.target.checked)} />
                    </label>
                  </>
                )}
              </div>
              <p className="v4-body-copy">{currentIntentConfig.description}</p>
              {selectedIntent === "build-test" && (
                <p className="v4-body-copy">
                  Assessment builds use your signed-in teacher account automatically and can optionally target a unit and student profile.
                </p>
              )}
              <div className="v4-product-card v4-product-span">
                <h3>Selected materials</h3>
                <p>{formatScopeSummary(selectedIntent, actionDocuments)}</p>
                {intentBlockedReason && <p className="v4-error">{intentBlockedReason}</p>}
              </div>
              <div className="v4-upload-actions">
                <button className="v4-button" type="button" onClick={() => void generateProduct()} disabled={isGenerating || Boolean(intentBlockedReason)} title={intentBlockedReason ?? undefined}>
                  {isGenerating ? "Creating document..." : "Create document"}
                </button>
              </div>
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Your Document</p>
                  <h2>{currentProduct ? getProductTitle(currentProduct) : "No document yet"}</h2>
                </div>
                <div className="v4-upload-actions">
                  <button className="v4-button v4-button-secondary" type="button" onClick={openPrintView} disabled={Boolean(printBlockedReason)} title={printBlockedReason ?? undefined}>Print</button>
                  <button className="v4-button v4-button-secondary" type="button" onClick={() => lastIntentRequest && void generateProduct(lastIntentRequest.intentType, lastIntentRequest.documentIds, lastIntentRequest.options)} disabled={Boolean(regenerateBlockedReason)} title={regenerateBlockedReason ?? undefined}>Build again</button>
                </div>
              </div>
              {(printBlockedReason || regenerateBlockedReason) && (
                <p className="v4-body-copy">
                  {printBlockedReason ?? regenerateBlockedReason}
                </p>
              )}
              {currentProduct ? (
                <>
                  <ProductViewer
                    product={currentProduct}
                    sessionId={workspace.sessionId}
                    classId={workspace.sessionId}
                    classProfile={instructionalSession?.classProfile ?? null}
                    onLoadClassProfile={loadClassProfile}
                    differentiatedBuild={instructionalSession?.differentiatedBuild ?? null}
                    onLoadDifferentiatedBuild={loadDifferentiatedBuild}
                    onInstructionalMapRefresh={async () => {
                      const options = currentProduct.payload.focus ? { focus: currentProduct.payload.focus } : undefined;
                      await generateProduct(currentProduct.intentType as IntentType, currentProduct.documentIds, options);
                    }}
                  />
                </>
              ) : (
                <p className="v4-body-copy">Upload your materials, choose what to build, and this is where your classroom document will appear.</p>
              )}
            </section>

            <section className="v4-panel">
              <div className="v4-section-heading">
                <div>
                  <p className="v4-kicker">Recent Documents</p>
                  <h2>Your recent builds</h2>
                </div>
                <span className="v4-pill">{workspace.products.length}</span>
              </div>
              <ul className="v4-history-list">
                {workspace.products.map((product) => (
                  <li key={product.productId}>
                    <button className={`v4-history-item ${currentProduct?.productId === product.productId ? "v4-history-item-active" : ""}`} type="button" onClick={() => setCurrentProduct(product)}>
                      <strong>{getProductTitle(product)}</strong>
                      <span>{new Date(product.createdAt ?? product.payload.generatedAt ?? Date.now()).toLocaleDateString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}