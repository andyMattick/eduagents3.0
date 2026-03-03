import { useState, useEffect } from "react";
import { MinimalTeacherIntent } from "pipeline/contracts";

import { ASSESSMENT_TYPES, AssessmentTypeKey } from "@/pipeline/contracts/assessmentTypes";

import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { PipelineDebugPanel } from "@/components_new/PipelineDebugPanel";
import { runArchitectWriterDebug } from "@/pipeline/devTools/runArchitectWriterDebug";
import { MathFormatSelector } from "@/components_new/Pipeline/MathFormatSelector";
import type { MathFormat } from "@/utils/mathFormatters";





interface MinimalAssessmentFormProps {
  onSubmit: (intent: MinimalTeacherIntent) => void;
  isLoading: boolean;
}

export default function MinimalAssessmentForm({ onSubmit }: MinimalAssessmentFormProps) {
  useEffect(() => {
    console.log("[Form] Mounted");
  }, []);

  const [form, setForm] = useState<MinimalTeacherIntent>({
    gradeLevels: [],
    course: "",
    unitName: "",
    lessonName: "",
    topic: "",
    studentLevel: "Standard",
    assessmentType: "bellRinger",
    time: ASSESSMENT_TYPES["bellRinger"].recommendedTime.min,
    additionalDetails: "",
    sourceDocuments: [],
    exampleAssessment: undefined,
    mathFormat: "unicode",
  });

  function update<K extends keyof MinimalTeacherIntent>(
  key: K,
  value: MinimalTeacherIntent[K]
) {
  setForm(prev => ({ ...prev, [key]: value }));
}

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Grade Levels */}
      <div>
        <label><strong>Grade Levels</strong></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {["K","1","2","3","4","5","6","7","8","9","10","11","12"].map((g) => (
            <label key={g}>
              <input
                type="checkbox"
                checked={form.gradeLevels.includes(g)}
                onChange={() => {
                  update(
                    "gradeLevels",
                    form.gradeLevels.includes(g)
                      ? form.gradeLevels.filter((x) => x !== g)
                      : [...form.gradeLevels, g]
                  );
                }}
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* Course */}
      <div>
        <label><strong>Course</strong></label>
        <input
          value={form.course}
          onChange={(e) => update("course", e.target.value)}
        />
      </div>

      {/* Unit */}
      <div>
        <label><strong>Unit Name</strong></label>
        <input
          value={form.unitName ?? ""}
          onChange={(e) => update("unitName", e.target.value)}
        />
      </div>

      {/* Lesson */}
      <div>
        <label><strong>Lesson Name</strong></label>
        <input
          value={form.lessonName ?? ""}
          onChange={(e) => update("lessonName", e.target.value)}
        />
      </div>

      {/* Topic */}
      <div>
        <label><strong>Specific Topic</strong> <span style={{ fontWeight: 400, color: "var(--gray-500, #888)" }}>(optional)</span></label>
        <input
          value={form.topic ?? ""}
          placeholder="Leave blank if the lesson name covers it"
          onChange={(e) => update("topic", e.target.value)}
        />
      </div>

      {/* Student Level */}
      <div>
        <label><strong>Student Level</strong></label>
        <select
          value={form.studentLevel}
          onChange={(e) => update("studentLevel", e.target.value)}
        >
          <option value="Remedial">Remedial</option>
          <option value="Standard">Standard</option>
          <option value="Honors">Honors</option>
          <option value="AP">AP</option>
        </select>
      </div>

      {/* Assessment Type */}
      <div>
        <label><strong>Assessment Type</strong></label>
        <select
          value={form.assessmentType}
          onChange={(e) => {
            const key = e.target.value as AssessmentTypeKey;
            update("assessmentType", key);
            update("time", ASSESSMENT_TYPES[key].recommendedTime.min);
          }}
        >
          {Object.keys(ASSESSMENT_TYPES).map((key) => (
            <option key={key} value={key}>
              {ASSESSMENT_TYPES[key as AssessmentTypeKey].label}
            </option>
          ))}
        </select>
      </div>

      {/* Time */}
      <div>
        <label><strong>Time (minutes)</strong></label>
        <input
          type="number"
          value={form.time}
          onChange={(e) => update("time", Number(e.target.value))}
        />
      </div>

      {/* Additional Details */}
      <div>
        <label><strong>Additional Details</strong> <span style={{ fontWeight: 400, color: "var(--gray-500, #888)" }}>(optional)</span></label>
        <textarea
          value={form.additionalDetails ?? ""}
          placeholder="Any constraints, goals, or notes — leave blank if none"
          onChange={(e) => update("additionalDetails", e.target.value)}
        />
      </div>

      {/* Source Documents */}
      <div>
        <label><strong>Upload Source Documents</strong> <span style={{ fontWeight: 400, color: "var(--gray-500, #888)" }}>(optional — PDF, Word, or text)</span></label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          style={{ marginTop: "0.35rem" }}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const docs = await Promise.all(
              files.map(async (file) => {
                const content = await file.text().catch(() => "");
                return { id: crypto.randomUUID(), name: file.name, content };
              })
            );
            update("sourceDocuments", docs);
          }}
        />
        {(form.sourceDocuments ?? []).length > 0 && (
          <ul style={{ marginTop: "0.4rem", paddingLeft: "1rem", fontSize: "0.82rem", color: "var(--gray-500, #888)" }}>
            {(form.sourceDocuments ?? []).map((d) => (
              <li key={d.id}>
                📄 {d.name}
                <button
                  type="button"
                  onClick={() => update("sourceDocuments", (form.sourceDocuments ?? []).filter((x) => x.id !== d.id))}
                  style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700 }}
                  aria-label={`Remove ${d.name}`}
                >✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Math Format */}
      <div>
        <MathFormatSelector
          value={(form.mathFormat ?? "unicode") as MathFormat}
          onChange={(v) => update("mathFormat", v)}
        />
      </div>

      {/* Submit */}
      <button type="submit">
        Generate Assessment
      </button>
 
    </form>
  );
}
