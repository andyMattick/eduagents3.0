import React from "react";
import type { UploadedSource } from "./MergedSourcesList";
import { MergedSourcesList } from "./MergedSourcesList";

type Goal = "simulate" | "preparedness" | "compare" | "create";

type DropZoneProps = {
  label: string;
  hint?: string;
  files: File[];
  isDragging: boolean;
  accept: string;
  multiple?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onChange: (files: File[]) => void;
  onRemove: () => void;
};

function DropZone(props: DropZoneProps) {
  const {
    label,
    hint,
    files,
    isDragging,
    accept,
    multiple,
    inputRef,
    onDragOver,
    onDragLeave,
    onDrop,
    onChange,
    onRemove,
  } = props;
  const hasFiles = files.length > 0;
  return (
    <div>
      <p className="v4-kicker" style={{ marginBottom: "0.35rem" }}>{label}</p>
      {hint && <p style={{ fontSize: "0.8rem", color: "#6b5040", margin: "0 0 0.6rem" }}>{hint}</p>}
      <div
        className={`v4-drop-zone${isDragging ? " v4-drop-zone--active" : ""}${hasFiles ? " v4-drop-zone--filled" : ""}`}
        style={{ cursor: "pointer" }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {hasFiles ? (
          <div className="v4-drop-zone-files">
            {files.map((f) => <span key={f.name} className="v4-pill">{f.name}</span>)}
          </div>
        ) : (
          <p className="v4-drop-zone-hint">{isDragging ? "Drop to upload" : "Drag & drop, or click to browse"}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
      {hasFiles && (
        <button
          type="button"
          className="v4-button v4-button-secondary v4-button-sm"
          style={{ marginTop: "0.5rem" }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

interface UploadPanelV4Props {
  goal: Goal;
  title: string;
  subtitle: string;
  primaryFiles: File[];
  secondaryFiles: File[];
  primaryDragging: boolean;
  secondaryDragging: boolean;
  primaryAccept: string;
  secondaryAccept: string;
  primaryRef: React.RefObject<HTMLInputElement | null>;
  secondaryRef: React.RefObject<HTMLInputElement | null>;
  uploadedSources: UploadedSource[];
  canRun: boolean;
  ctaLabel: string;
  usageCount: number;
  usageLimit: number;
  error: string | null;
  testPrefs: { mcCount?: number; saCount?: number; frqCount?: number };
  onPrimaryDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onPrimaryDragLeave: () => void;
  onPrimaryDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSecondaryDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onSecondaryDragLeave: () => void;
  onSecondaryDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPrimaryChange: (files: File[]) => void;
  onSecondaryChange: (files: File[]) => void;
  onClearPrimary: () => void;
  onClearSecondary: () => void;
  onRun: () => void;
  onBack: () => void;
  onTestPrefChange: (key: "mcCount" | "saCount" | "frqCount", value: number) => void;
}

export function UploadPanelV4(props: UploadPanelV4Props) {
  const {
    goal,
    title,
    subtitle,
    primaryFiles,
    secondaryFiles,
    primaryDragging,
    secondaryDragging,
    primaryAccept,
    secondaryAccept,
    primaryRef,
    secondaryRef,
    uploadedSources,
    canRun,
    ctaLabel,
    usageCount,
    usageLimit,
    error,
    testPrefs,
    onPrimaryDragOver,
    onPrimaryDragLeave,
    onPrimaryDrop,
    onSecondaryDragOver,
    onSecondaryDragLeave,
    onSecondaryDrop,
    onPrimaryChange,
    onSecondaryChange,
    onClearPrimary,
    onClearSecondary,
    onRun,
    onBack,
    onTestPrefChange,
  } = props;

  return (
    <>
      <section className="v4-panel v4-vector-span v4-hero">
        <div>
          <p className="v4-kicker">{title}</p>
          <h1>
            {goal === "simulate" && "Upload the document"}
            {goal === "preparedness" && "Upload your documents"}
            {goal === "compare" && "Upload the document"}
            {goal === "create" && "Upload your source documents"}
          </h1>
          <p className="v4-subtitle">{subtitle}</p>
        </div>
      </section>

      <section className="v4-panel v4-vector-span">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {goal === "preparedness" && (
            <DropZone
              label="Prep / Study Material"
              hint="Notes, review sheets, or anything students used to prepare. (.txt, .doc, .docx, .rtf)"
              files={secondaryFiles}
              isDragging={secondaryDragging}
              accept={secondaryAccept}
              multiple
              inputRef={secondaryRef}
              onDragOver={onSecondaryDragOver}
              onDragLeave={onSecondaryDragLeave}
              onDrop={onSecondaryDrop}
              onChange={onSecondaryChange}
              onRemove={onClearSecondary}
            />
          )}

          <DropZone
            label={goal === "preparedness" ? "The Assessment" : goal === "create" ? "Source Documents" : "Your Document"}
            hint={
              goal === "preparedness"
                ? "The test or assessment students will take. You can upload multiple files."
                : goal === "create"
                ? "PDF, Word, or PowerPoint. All selected documents will be combined."
                : undefined
            }
            files={primaryFiles}
            isDragging={primaryDragging}
            accept={primaryAccept}
            multiple={goal === "create" || goal === "preparedness"}
            inputRef={primaryRef}
            onDragOver={onPrimaryDragOver}
            onDragLeave={onPrimaryDragLeave}
            onDrop={onPrimaryDrop}
            onChange={onPrimaryChange}
            onRemove={onClearPrimary}
          />

          {goal === "preparedness" && <MergedSourcesList sources={uploadedSources} />}

          <p style={{ fontSize: "0.75rem", color: "#9c4d2b", opacity: 0.75, margin: 0 }}>
            Uploaded documents are processed by Google Gemini to generate analysis and suggestions. Avoid uploading files
            that contain student names, ID numbers, or other personal information.
          </p>

          {goal === "create" && (
            <div>
              <p className="v4-kicker" style={{ marginBottom: "0.6rem" }}>Question Types</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {([
                  { key: "mcCount", label: "Multiple Choice" },
                  { key: "saCount", label: "Short Answer" },
                  { key: "frqCount", label: "Free Response" },
                ] as const).map(({ key, label }) => (
                  <label
                    key={key}
                    style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "#6b5040" }}
                  >
                    {label}
                    <input
                      type="number"
                      min={0}
                      max={30}
                      className="v4-item-count-input"
                      style={{ width: "72px" }}
                      value={testPrefs[key] ?? 0}
                      onChange={(e) => onTestPrefChange(key, Math.max(0, Math.min(30, Number(e.target.value))))}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="v4-error">{error}</p>}

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: "rgba(86,57,32,0.12)" }}>
              <div
                style={{
                  width: `${Math.min(100, (usageCount / usageLimit) * 100)}%`,
                  height: "4px",
                  borderRadius: "2px",
                  background: usageCount >= usageLimit ? "#dc2626" : "#bb5b35",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#9c4d2b",
                whiteSpace: "nowrap",
                fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              {usageCount} / {usageLimit} tokens today
            </span>
          </div>

          <div className="v4-upload-actions">
            <button type="button" className="v4-button" disabled={!canRun} onClick={onRun}>{ctaLabel}</button>
            <button type="button" className="v4-button v4-button-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </section>
    </>
  );
}
