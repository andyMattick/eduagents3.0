import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { IntentType } from "../../prism-v4/schema/integration/IntentRequest";
import type { AnalyzedDocument } from "../../prism-v4/schema/semantic";
import type { InstructionalSessionWorkspace } from "../../types/v4/InstructionalSession";

import { useInstructionalSession } from "../../hooks/useInstructionalSession";
import { useAuth } from "../Auth/useAuth";
import { DocumentSubmit } from "../../components/studentPortal/DocumentSubmit";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { ProductViewer } from "./ProductViewer";
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

function warnUploadGuard(guard: string, details?: Record<string, unknown>) {
  if (!DEBUG_UPLOAD_TRACE) {
    return;
  }

  if (details) {
    console.warn(`[Wave6 Upload] blocked at guard: ${guard}`, details);
    return;
  }

  console.warn(`[Wave6 Upload] blocked at guard: ${guard}`);
}

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
    if (primaryDocumentId) {
      return [primaryDocumentId];
    }
    return allDocumentIds[0] ? [allDocumentIds[0]] : [];
  }

  if (config.scope === "multi") {
    if (selectedDocumentIds.length >= 2) {
      return selectedDocumentIds;
    }
    return allDocumentIds.length >= 2 ? allDocumentIds : selectedDocumentIds;
  }

  return selectedDocumentIds.length > 0 ? selectedDocumentIds : allDocumentIds;
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

export function DocumentUpload() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    workspace,
    isUploading,
    error,
    setError,
    createSessionFromFiles,
    loadBlueprint,
    loadTeacherFingerprint,
    updateTeacherFingerprint,
    loadStudentProfile,
    loadClassProfile,
    loadDifferentiatedBuild,
    loadBuilderPlan,
    loadAssessmentPreview,
    generateProduct,
    clearSession,
  } = useInstructionalSession();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [primaryDocumentId, setPrimaryDocumentId] = useState<string | null>(null);
  const uploadInFlightRef = useRef(false);
  const lastUploadAttemptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace) {
      warnUploadGuard("workspace-sync:no-workspace");
      return;
    }

    const nextDocumentIds = workspace.documents.map((entry) => entry.documentId);

    setSelectedDocumentIds((current) => {
      const validSelection = current.filter((documentId) => nextDocumentIds.includes(documentId));
      return validSelection.length > 0 ? validSelection : nextDocumentIds;
    });

    setPrimaryDocumentId((current) => (current && nextDocumentIds.includes(current)
      ? current
      : (nextDocumentIds[0] ?? null)));
  }, [workspace]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const uploadAttemptKey = selectedFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .sort()
      .join("|");

    if (authLoading || !user) {
      logUploadTrace("ignored submit: session not hydrated", { authLoading, hasUser: !!user });
      warnUploadGuard("upload:session-not-hydrated", { authLoading, hasUser: !!user });
      setError("Please wait for your session to load before uploading.");
      return;
    }

    if (uploadInFlightRef.current || isUploading) {
      logUploadTrace("ignored submit while upload in flight", { isUploading, selectedFileCount: selectedFiles.length });
      warnUploadGuard("upload:in-flight", { isUploading, selectedFileCount: selectedFiles.length });
      return;
    }

    if (uploadAttemptKey.length > 0 && lastUploadAttemptKeyRef.current === uploadAttemptKey) {
      logUploadTrace("ignored duplicate submit", { uploadAttemptKey, selectedFileCount: selectedFiles.length });
      warnUploadGuard("upload:duplicate-submit", { uploadAttemptKey, selectedFileCount: selectedFiles.length });
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Choose one or more PDF files before building the workspace.");
      warnUploadGuard("upload:no-files-selected");
      return;
    }

    uploadInFlightRef.current = true;
    lastUploadAttemptKeyRef.current = uploadAttemptKey;
    setError(null);
    logUploadTrace("upload started", { uploadAttemptKey, selectedFileCount: selectedFiles.length });

    try {
      const nextWorkspace = await createSessionFromFiles(selectedFiles);
      if (!nextWorkspace) {
        warnUploadGuard("upload:no-workspace-returned", { selectedFileCount: selectedFiles.length });
        return;
      }

      logUploadTrace("analysis completed inline during upload", { documentCount: nextWorkspace.documents.length });

      setSelectedDocumentIds(nextWorkspace.documents.map((entry) => entry.documentId));
      setPrimaryDocumentId(nextWorkspace.documents[0]?.documentId ?? null);
      logUploadTrace("upload flow complete", { sessionId: nextWorkspace.sessionId, uploadedCount: nextWorkspace.documents.length });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Workspace creation failed.");
      logUploadTrace("upload flow failed", { error: uploadError instanceof Error ? uploadError.message : "Workspace creation failed." });
    } finally {
      uploadInFlightRef.current = false;
      logUploadTrace("upload lock released");
    }
  }


  async function handleGenerateProduct(args: {
    intentType: IntentType;
    options?: Record<string, unknown>;
    studentId?: string;
    enableAdaptiveConditioning?: boolean;
  }) {
    if (!workspace) {
      warnUploadGuard("pavilion-generation:no-workspace", {
        intentType: args.intentType,
        studentId: args.studentId ?? null,
      });
      return null;
    }

    const normalizedDocumentIds = resolveIntentDocumentIds(workspace, args.intentType, selectedDocumentIds, primaryDocumentId);
    const config = getIntentConfig(args.intentType);

    if (normalizedDocumentIds.length === 0) {
      setError("Select the document scope before generating a pavilion surface.");
      warnUploadGuard("pavilion-generation:no-document-scope", {
        sessionId: workspace.sessionId,
        intentType: args.intentType,
        selectedDocumentIds,
        primaryDocumentId,
      });
      return null;
    }

    if (config.scope === "multi" && normalizedDocumentIds.length < 2) {
      setError(`${config.label} requires at least 2 documents in the workspace.`);
      warnUploadGuard("pavilion-generation:insufficient-multi-selection", {
        sessionId: workspace.sessionId,
        intentType: args.intentType,
        requiredScope: config.scope,
        documentIds: normalizedDocumentIds,
      });
      return null;
    }

    setError(null);
    logUploadTrace("pavilion generation started", {
      sessionId: workspace.sessionId,
      intentType: args.intentType,
      documentIds: normalizedDocumentIds,
      hasOptions: Boolean(args.options && Object.keys(args.options).length > 0),
      studentId: args.studentId ?? null,
      adaptiveConditioning: args.enableAdaptiveConditioning ?? null,
    });

    try {
      const product = await generateProduct({
        sessionId: workspace.sessionId,
        documentIds: normalizedDocumentIds,
        intentType: args.intentType,
        options: args.options,
        studentId: args.studentId,
        enableAdaptiveConditioning: args.enableAdaptiveConditioning,
      });

      if (!product) {
        setError("Pavilion generation completed without returning a draft.");
        logUploadTrace("pavilion generation returned no product", {
          sessionId: workspace.sessionId,
          intentType: args.intentType,
          documentIds: normalizedDocumentIds,
        });
        warnUploadGuard("pavilion-generation:no-product-returned", {
          sessionId: workspace.sessionId,
          intentType: args.intentType,
          documentIds: normalizedDocumentIds,
        });
        return null;
      }

      logUploadTrace("pavilion generation completed", {
        sessionId: workspace.sessionId,
        intentType: product.intentType,
        productId: product.productId,
      });
      return product;
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : "Pavilion generation failed.";
      setError(message);
      logUploadTrace("pavilion generation failed", {
        sessionId: workspace.sessionId,
        intentType: args.intentType,
        error: message,
      });
      throw generationError;
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
    setSelectedDocumentIds([]);
    setPrimaryDocumentId(null);
    setError(null);
    lastUploadAttemptKeyRef.current = null;
    uploadInFlightRef.current = false;
  }

  function toggleSelectedDocument(documentId: string) {
    setSelectedDocumentIds((current) => current.includes(documentId)
      ? current.filter((entry) => entry !== documentId)
      : [...current, documentId]);
  }

  const uploadBlockedReason = getUploadBlockedReason(selectedFiles.length, isUploading);

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
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />
            </label>

            <div className="v4-upload-actions">
              <button className="v4-button" type="submit" disabled={Boolean(uploadBlockedReason)} title={uploadBlockedReason ?? undefined}>
                {isUploading ? "Creating workspace..." : "Create workspace"}
              </button>
              {(workspace || selectedFiles.length > 0 || error) && (
                <button className="v4-button v4-button-secondary" type="button" onClick={resetSession} disabled={isUploading}>
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
                        <DocumentStatusBadge documentId={document.documentId} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="v4-panel">
              <DocumentSubmit sessionId={workspace.sessionId} />
            </section>

            {workspace.instructionalSession ? (
              <section className="v4-panel v4-product-span">
                <ProductViewer
                  sessionId={workspace.instructionalSession.sessionId}
                  workspace={workspace}
                  instructionalSession={workspace.instructionalSession}
                  products={workspace.products}
                  teacherId={user?.id ?? null}
                  onGenerateProduct={handleGenerateProduct}
                  loadBlueprint={loadBlueprint}
                  loadTeacherFingerprint={loadTeacherFingerprint}
                  updateTeacherFingerprint={updateTeacherFingerprint}
                  loadStudentProfile={loadStudentProfile}
                  loadClassProfile={loadClassProfile}
                  loadDifferentiatedBuild={loadDifferentiatedBuild}
                  loadBuilderPlan={loadBuilderPlan}
                  loadAssessmentPreview={loadAssessmentPreview}
                />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}