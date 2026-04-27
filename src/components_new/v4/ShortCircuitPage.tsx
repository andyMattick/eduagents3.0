/**
 * src/components_new/v4/ShortCircuitPage.tsx
 *
 * Unified single-page flow:
 *   1. Upload document
 *   2. Run deterministic Phase B rendering on this page
 *   3. Run Phase C inline below Phase B
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ShortCircuitGraph } from "./ShortCircuitGraph";
import { SimulationExplanationPanel } from "./SimulationExplanationPanel";
import { createStudioSessionFromFilesApi } from "../../lib/teacherStudioApi";
import { getSimulationViewApi, listClassesApi, runSimulationUnifiedApi, type PhaseCClass } from "../../lib/phaseCApi";
import type { ShortCircuitItem } from "../../../api/v4/simulator/shortcircuit";
import type { SimulationItemTree } from "../../prism-v4/schema";
import "./v4.css";

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx";
const DROP_RE = /\.(pdf|doc|docx|ppt|pptx)$/i;

type Phase = "upload" | "running" | "results";

type SimulationSectionView = {
  id: string;
  header: string;
  instructions: string[];
  itemNumbers: number[];
  itemTrees: SimulationItemTree[];
};

type PhaseCView = Awaited<ReturnType<typeof getSimulationViewApi>>;

type StudentResultRow = {
  itemId: string;
  itemLabel?: string;
  confusionScore?: number;
  timeSeconds?: number;
  bloomGap?: number;
  pCorrect?: number;
  difficultyScore?: number;
  abilityScore?: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function extractParentStem(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const stemLines: string[] = [];

  for (const line of lines) {
    if (/^\s*[a-h]\)/i.test(line) || /^\s*[a-h][.)]\s+/i.test(line)) {
      break;
    }
    stemLines.push(line);
  }

  const stem = stemLines.join("\n").trim();
  const trimmed = text.trim();
  if (stem && stem !== trimmed) return stem;

  const inlineMatch = trimmed.match(/^(.*?)(?=\s+[a-h][.)]\s+)/i);
  if (inlineMatch?.[1]) return inlineMatch[1].trim();

  return stem || trimmed;
}

function flattenExpandedItems(itemTrees: SimulationItemTree[]): ShortCircuitItem[] {
  const result: ShortCircuitItem[] = [];
  for (const tree of itemTrees) {
    if (tree.subItems && tree.subItems.length > 0) {
      for (const subItem of tree.subItems) {
        if (subItem.logicalLabel) {
          result.push({ ...subItem });
        }
      }
      continue;
    }
    if (tree.item.logicalLabel) {
      result.push({ ...tree.item });
    }
  }
  return result;
}

function flattenCollapsedItems(itemTrees: SimulationItemTree[]): ShortCircuitItem[] {
  return itemTrees
    .filter((tree) => Boolean(tree.item.logicalLabel))
    .map((tree) => ({ ...tree.item }));
}

export function ShortCircuitPage() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [phaseCRunError, setPhaseCRunError] = useState<string | null>(null);
  const [phaseCRunLoading, setPhaseCRunLoading] = useState(false);
  const [phaseCClassLoading, setPhaseCClassLoading] = useState(false);
  const [phaseCClasses, setPhaseCClasses] = useState<PhaseCClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [phaseCSimulationId, setPhaseCSimulationId] = useState<string | null>(null);
  const [phaseCClassView, setPhaseCClassView] = useState<PhaseCView | null>(null);
  const [phaseCStudentView, setPhaseCStudentView] = useState<PhaseCView | null>(null);

  const [items, setItems] = useState<ShortCircuitItem[] | null>(null);
  const [itemTrees, setItemTrees] = useState<SimulationItemTree[] | null>(null);
  const [sections, setSections] = useState<SimulationSectionView[] | null>(null);
  const [expandedGraph, setExpandedGraph] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startOver = useCallback(() => {
    setPhase("upload");
    setFile(null);
    setDragging(false);
    setUploadError(null);
    setUploading(false);
    setDocumentId(null);
    setRunError(null);

    setPhaseCRunError(null);
    setPhaseCRunLoading(false);
    setPhaseCClassLoading(false);
    setPhaseCClasses([]);
    setSelectedClassId("");
    setPhaseCSimulationId(null);
    setPhaseCClassView(null);
    setPhaseCStudentView(null);

    setItems(null);
    setItemTrees(null);
    setSections(null);
    setExpandedGraph(false);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!DROP_RE.test(f.name)) {
      setUploadError("Only PDF, Word, or PowerPoint files are accepted.");
      return;
    }
    setFile(f);
    setUploadError(null);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0];
    if (nextFile) handleFile(nextFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const nextFile = Array.from(e.dataTransfer.files).find((entry) => DROP_RE.test(entry.name));
    if (nextFile) {
      handleFile(nextFile);
      return;
    }
    setUploadError("Only PDF, Word, or PowerPoint files are accepted.");
  };

  const runPhaseB = useCallback(async (nextSessionId: string) => {
    setPhase("running");
    setRunError(null);
    setItems(null);
    setItemTrees(null);
    setSections(null);
    setExpandedGraph(false);

    try {
      const res = await fetch("/api/v4/simulator/shortcircuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: nextSessionId, profiles: ["average"] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error ?? "Simulation failed.");
        setPhase("upload");
        return;
      }

      const nextSections: SimulationSectionView[] = data.sections ?? [];
      const sectionItemTrees: SimulationItemTree[] = nextSections.flatMap((section) => section.itemTrees ?? []);
      const nextItemTrees: SimulationItemTree[] = sectionItemTrees.length > 0 ? sectionItemTrees : (data.itemTrees ?? []);

      setItems(data.items ?? []);
      setItemTrees(nextItemTrees);
      setSections(nextSections);
      setPhase("results");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error. Please try again.");
      setPhase("upload");
    }
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setUploadError("Select a file before continuing.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { sessionId, registered } = await createStudioSessionFromFilesApi([file]);
      const nextDocumentId = registered[0]?.documentId ?? null;
      setDocumentId(nextDocumentId);
      await runPhaseB(sessionId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const loadClasses = useCallback(async () => {
    setPhaseCClassLoading(true);
    setPhaseCRunError(null);
    try {
      const response = await listClassesApi();
      setPhaseCClasses(response.classes);
      setSelectedClassId((current) => current || response.classes[0]?.id || "");
    } catch (err) {
      setPhaseCRunError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setPhaseCClassLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== "results") {
      return;
    }

    if (phaseCClasses.length > 0 || phaseCClassLoading) {
      return;
    }

    void loadClasses();
  }, [phase, phaseCClasses.length, phaseCClassLoading, loadClasses]);

  const handleRunPhaseC = async () => {
    if (!selectedClassId || !documentId) {
      setPhaseCRunError("Choose a class and ensure a document is uploaded.");
      return;
    }

    setPhaseCRunLoading(true);
    setPhaseCRunError(null);
    try {
      const output = await runSimulationUnifiedApi({
        classId: selectedClassId,
        documentId,
        selectedProfileIds: [],
        mode: "class",
      });

      setPhaseCSimulationId(output.simulationId);

      const classView = await getSimulationViewApi(output.simulationId, "class");
      setPhaseCClassView(classView);

      const firstStudentId = classView.availableStudentIds?.[0];
      const studentView = await getSimulationViewApi(
        output.simulationId,
        "student",
        firstStudentId ? { studentId: firstStudentId } : undefined,
      );
      setPhaseCStudentView(studentView);
    } catch (err) {
      setPhaseCRunError(err instanceof Error ? err.message : "Failed to run simulation.");
    } finally {
      setPhaseCRunLoading(false);
    }
  };

  const phaseOrder: Phase[] = ["upload", "running", "results"];
  const currentPhaseIdx = phaseOrder.indexOf(phase);

  const graphItems = useMemo(() => {
    if (!itemTrees || itemTrees.length === 0) {
      return (items ?? []).filter((item) => Boolean(item.logicalLabel));
    }
    return expandedGraph ? flattenExpandedItems(itemTrees) : flattenCollapsedItems(itemTrees);
  }, [itemTrees, items, expandedGraph]);

  const phaseCItems = useMemo(() => {
    return (phaseCStudentView?.items ?? []) as StudentResultRow[];
  }, [phaseCStudentView]);

  return (
    <div className="v4-shortcircuit-page">
      <div className="v4-shortcircuit-steps">
        {[
          { key: "upload" as Phase, label: "1. Upload" },
          { key: "results" as Phase, label: "2. Phase B + Phase C" },
        ].map(({ key, label }, idx, arr) => {
          const stepIdx = phaseOrder.indexOf(key);
          const done = currentPhaseIdx > stepIdx;
          const active = phase === key || (key === "results" && phase === "running");
          const stepClass = active
            ? "v4-shortcircuit-step v4-shortcircuit-step-active"
            : done
              ? "v4-shortcircuit-step v4-shortcircuit-step-done"
              : "v4-shortcircuit-step";
          return (
            <span key={key} className="v4-shortcircuit-step-wrap">
              <span className={stepClass}>{label}</span>
              {idx < arr.length - 1 && <span className="v4-shortcircuit-step-sep">&gt;</span>}
            </span>
          );
        })}
      </div>

      {phase === "upload" && (
        <div style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(86,57,32,0.16)", borderRadius: "20px", padding: "2rem", maxWidth: "560px" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#1f1a17" }}>Upload your document</h2>
          <p style={{ fontSize: "0.85rem", color: "#6b5040", marginBottom: "1.25rem" }}>
            PDF, Word, or PowerPoint. Upload and this page runs Phase B immediately.
          </p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#bb5b35" : file ? "#22c55e" : "rgba(86,57,32,0.3)"}`,
              borderRadius: "12px",
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "rgba(187,91,53,0.05)" : file ? "rgba(34,197,94,0.05)" : "transparent",
              transition: "all 0.15s",
              marginBottom: "1rem",
            }}
          >
            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} style={{ display: "none" }} onChange={handleInputChange} />
            {file ? (
              <>
                <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>&#x2713;</div>
                <p style={{ margin: 0, fontWeight: 600, color: "#1f1a17" }}>{file.name}</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                  {(file.size / 1024).toFixed(0)} KB -- click to change
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "rgba(86,57,32,0.4)" }}>^</div>
                <p style={{ margin: 0, fontWeight: 600, color: "#1f1a17" }}>Drop your file here</p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                  or click to browse -- PDF, Word, PowerPoint accepted
                </p>
              </>
            )}
          </div>
          {uploadError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#dc2626", fontSize: "0.82rem", marginBottom: "1rem" }}>
              {uploadError}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!file || uploading}
            style={{ padding: "0.65rem 1.5rem", background: !file || uploading ? "#9ca3af" : "#bb5b35", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, cursor: !file || uploading ? "not-allowed" : "pointer", width: "100%" }}
          >
            {uploading ? "Uploading and analyzing..." : "Run Phase B"}
          </button>
        </div>
      )}

      {phase === "running" && (
        <div style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(86,57,32,0.16)", borderRadius: "20px", padding: "2rem", maxWidth: "560px" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#1f1a17" }}>Running Phase B analysis...</h2>
          <p style={{ fontSize: "0.85rem", color: "#6b5040" }}>Building item structure and measurable traits.</p>
        </div>
      )}

      {phase === "results" && items && (
        <div className="simulation-results">
          <div className="v4-shortcircuit-results-head">
            <div>
              <h2 className="v4-shortcircuit-results-title">Phase B Results</h2>
              <p className="v4-shortcircuit-results-meta">
                {file?.name} · {graphItems.length} graphed item{graphItems.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={startOver} className="v4-shortcircuit-startover">
                Start over
              </button>
            </div>
          </div>

          {runError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#dc2626", fontSize: "0.82rem", marginBottom: "1rem" }}>
              {runError}
            </div>
          )}

          <div className="v4-shortcircuit-result-card">
            <div className="v4-shortcircuit-graph-toggle-row">
              <strong>Graph view:</strong>
              <button
                type="button"
                className="v4-shortcircuit-graph-toggle"
                onClick={() => setExpandedGraph((prev) => !prev)}
              >
                {expandedGraph ? "Collapse sub-items" : "Expand sub-items"}
              </button>
            </div>
          </div>

          <div className="v4-shortcircuit-result-card">
            <h3 className="v4-shortcircuit-tree-title">Structured Item Tree</h3>
            {sections && sections.length > 0 ? (
              <div className="v4-shortcircuit-section-list">
                {sections.map((section) => (
                  <div key={section.id} className="v4-shortcircuit-section">
                    <h4 className="v4-shortcircuit-section-header">=== {section.header} ===</h4>
                    {section.instructions.length > 0 && (
                      <div className="v4-shortcircuit-section-instructions">
                        <strong>Instructions:</strong>
                        <ul>
                          {section.instructions.map((instruction, idx) => (
                            <li key={`${section.id}-instruction-${idx}`}>{instruction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="v4-shortcircuit-tree-list">
                      {section.itemTrees.map((tree) => (
                        <details key={`tree-${section.id}-${tree.item.itemNumber}`} className="v4-shortcircuit-tree-parent">
                          <summary>
                            Item {tree.item.logicalLabel ?? tree.item.itemNumber} · {tree.item.isMultiPartItem ? "multi-part" : tree.item.isMultipleChoice ? "multiple-choice" : "single"}
                            {tree.item.isMultiPartItem ? ` · ${tree.item.subQuestionCount} sub-item${tree.item.subQuestionCount !== 1 ? "s" : ""}` : ""}
                            {tree.item.isMultipleChoice ? ` · ${tree.item.distractorCount} distractor${tree.item.distractorCount !== 1 ? "s" : ""}` : ""}
                          </summary>
                          <p className="v4-shortcircuit-tree-parent-text">{tree.item.isMultiPartItem ? extractParentStem(tree.item.text) : tree.item.text}</p>
                          {tree.subItems && tree.subItems.length > 0 && (
                            <ul className="v4-shortcircuit-tree-children">
                              {tree.subItems.map((sub, subIndex) => (
                                <li key={`sub-${section.id}-${tree.item.itemNumber}-${subIndex}`}>
                                  {sub.logicalLabel ?? `${tree.item.logicalLabel ?? tree.item.itemNumber}${String.fromCharCode(97 + subIndex)}`}. {sub.text}
                                </li>
                              ))}
                            </ul>
                          )}
                          {tree.distractors && tree.distractors.length > 0 && (
                            <ul className="v4-shortcircuit-tree-children">
                              {tree.distractors.map((d) => (
                                <li key={`dist-${section.id}-${tree.item.itemNumber}-${d.label}`}>
                                  {d.label}. {d.text}
                                </li>
                              ))}
                            </ul>
                          )}
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="v4-shortcircuit-tree-empty">No item tree data returned.</p>
            )}
          </div>

          <div className="v4-shortcircuit-result-card">
            <ShortCircuitGraph items={graphItems} />
          </div>

          <div className="v4-shortcircuit-result-card">
            <SimulationExplanationPanel />
          </div>

          <div className="v4-shortcircuit-result-card">
            <h3 className="v4-shortcircuit-tree-title">Student Simulation</h3>
            <p style={{ marginTop: 0, fontSize: "0.85rem", color: "#6b5040" }}>
              Run Phase C directly from this page and inspect real student-level outputs inline.
            </p>

            <div className="phasec-row">
              <div style={{ minWidth: "260px", flex: 1 }}>
                <label htmlFor="phasec-class-select">Choose class</label>
                <select
                  id="phasec-class-select"
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  disabled={phaseCClassLoading || phaseCRunLoading}
                  style={{ width: "100%" }}
                >
                  {phaseCClasses.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </div>

              <button
                className="phasec-button"
                onClick={() => void handleRunPhaseC()}
                disabled={phaseCRunLoading || phaseCClassLoading || !selectedClassId || !documentId}
              >
                {phaseCRunLoading ? "Running..." : "Run Student Simulation"}
              </button>
            </div>

            {phaseCClassLoading && <p className="phasec-copy">Loading classes...</p>}
            {phaseCRunError && <p className="phasec-error">{phaseCRunError}</p>}

            {phaseCSimulationId && phaseCClassView && (
              <div style={{ marginTop: "1rem" }}>
                <p className="phasec-copy" style={{ marginBottom: "0.75rem" }}>
                  Simulation: {phaseCSimulationId}
                </p>

                <div className="phasec-grid-4">
                  <div className="phasec-stat-card">
                    <p className="phasec-stat-label">Records</p>
                    <p className="phasec-stat-value">{phaseCClassView.summary.totalRecords}</p>
                  </div>
                  <div className="phasec-stat-card">
                    <p className="phasec-stat-label">Avg confusion</p>
                    <p className="phasec-stat-value">{phaseCClassView.summary.averageConfusionScore.toFixed(3)}</p>
                  </div>
                  <div className="phasec-stat-card">
                    <p className="phasec-stat-label">Avg time (s)</p>
                    <p className="phasec-stat-value">{phaseCClassView.summary.averageTimeSeconds.toFixed(2)}</p>
                  </div>
                  <div className="phasec-stat-card">
                    <p className="phasec-stat-label">Avg bloom gap</p>
                    <p className="phasec-stat-value">{phaseCClassView.summary.averageBloomGap.toFixed(3)}</p>
                  </div>
                </div>
              </div>
            )}

            {phaseCItems.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <table className="phasec-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Confusion</th>
                      <th>Time (s)</th>
                      <th>Bloom gap</th>
                      <th>pCorrect</th>
                      <th>Misconception risk</th>
                      <th>Trait delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseCItems.map((item) => {
                      const pCorrect = toNumber(item.pCorrect);
                      const misconceptionRisk = 1 - pCorrect;
                      const traitDelta = toNumber(item.difficultyScore) - toNumber(item.abilityScore);
                      return (
                        <tr key={item.itemId}>
                          <td>{item.itemLabel ?? item.itemId}</td>
                          <td>{toNumber(item.confusionScore).toFixed(3)}</td>
                          <td>{toNumber(item.timeSeconds).toFixed(2)}</td>
                          <td>{toNumber(item.bloomGap).toFixed(3)}</td>
                          <td>{pCorrect.toFixed(3)}</td>
                          <td>{misconceptionRisk.toFixed(3)}</td>
                          <td>{traitDelta.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
