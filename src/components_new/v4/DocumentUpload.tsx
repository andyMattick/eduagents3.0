import type { FormEvent } from "react";
import { useState } from "react";

import type { TaggingPipelineInput } from "../../prism-v4/schema/semantic";

import { SemanticViewer } from "./SemanticViewer";
import "./v4.css";

type ViewerMode = "inspect" | "semantic" | "correct";

export function DocumentUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [input, setInput] = useState<TaggingPipelineInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<ViewerMode>("semantic");

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a PDF or DOCX file before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileBuffer = await selectedFile.arrayBuffer();

      const response = await fetch("/api/v4-ingest", {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
          "x-file-name": selectedFile.name,
        },
        body: fileBuffer,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed.");
      }

      setInput(payload as TaggingPipelineInput);
      setMode("semantic");
    } catch (uploadError) {
      setInput(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="v4-viewer">
      <div className="v4-shell">
        <section className="v4-panel v4-hero">
          <div>
            <p className="v4-kicker">PRISM v4 Semantic Viewer</p>
            <h1>Upload a source document and inspect the canonical semantic output.</h1>
            <p className="v4-subtitle">
              This route is read-only. It ingests a PDF or DOCX, produces a schema-exact tagging input,
              and renders the semantic pipeline output without touching simulation or authoring flows.
            </p>
          </div>

          <form className="v4-upload-form" onSubmit={handleUpload}>
            <label className="v4-upload-field" htmlFor="v4-upload-input">
              <span>Source document</span>
              <input
                id="v4-upload-input"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </label>

            <div className="v4-upload-actions">
              <button className="v4-button" type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Run v4 ingestion"}
              </button>
              {selectedFile && <span className="v4-upload-name">{selectedFile.name}</span>}
            </div>

            {error && <p className="v4-error">{error}</p>}
          </form>
        </section>

        {input && (
          <section className="v4-panel v4-mode-panel">
            <div>
              <p className="v4-kicker">Teacher workflow</p>
              <h2>What would you like to do with this document?</h2>
              <p className="v4-subtitle">Switch between structure inspection, semantic review, and teacher correction without leaving this route.</p>
            </div>
            <div className="v4-mode-toggle" role="tablist" aria-label="Semantic viewer mode">
              <button className={`v4-button ${mode === "inspect" ? "v4-button-active" : "v4-button-secondary"}`} type="button" onClick={() => setMode("inspect")}>Inspect structure</button>
              <button className={`v4-button ${mode === "semantic" ? "v4-button-active" : "v4-button-secondary"}`} type="button" onClick={() => setMode("semantic")}>Review interpretation</button>
              <button className={`v4-button ${mode === "correct" ? "v4-button-active" : "v4-button-secondary"}`} type="button" onClick={() => setMode("correct")}>Apply teacher corrections</button>
            </div>
          </section>
        )}

        {input && <SemanticViewer input={input} mode={mode} />}
      </div>
    </div>
  );
}