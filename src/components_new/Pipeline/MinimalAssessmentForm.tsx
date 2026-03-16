import { useState, useEffect } from "react";
import { MinimalTeacherIntent } from "pipeline/contracts";

import { ASSESSMENT_TYPES, AssessmentTypeKey } from "../../pipeline/contracts/assessmentTypes";

import { MathFormatSelector } from "@/components_new/Pipeline/MathFormatSelector";
import type { MathFormat } from "@/utils/mathFormatters";

// Question format chips with grouping
const QUESTION_FORMAT_CHIPS = [
  // Quick Assessment
  { group: "Quick Assessment", label: "Multiple Choice", value: "mcqOnly" },
  { group: "Quick Assessment", label: "True / False", value: "trueFalseOnly" },
  { group: "Quick Assessment", label: "Fill in the Blank", value: "fitbOnly" },
  { group: "Quick Assessment", label: "Arithmetic Fluency", value: "arithmeticFluency" },
  
  // Short Response
  { group: "Short Response", label: "Short Answer", value: "saOnly" },
  { group: "Short Response", label: "Algebra Fluency", value: "algebraicFluency" },
  { group: "Short Response", label: "Fractions", value: "fractions" },
  
  // Extended Response
  { group: "Extended Response", label: "Free Response", value: "frqOnly" },
  { group: "Extended Response", label: "Essay", value: "essayOnly" },
  { group: "Extended Response", label: "Linear Equations", value: "linearEquation" },
  { group: "Extended Response", label: "Passage-Based Reading", value: "passageBased" },
  
  // Standalone
  { group: "Standalone", label: "Mixed Format", value: "mixed" },
];


interface MinimalAssessmentFormProps {
  onSubmit: (intent: MinimalTeacherIntent) => void;
  isLoading: boolean;
}

export default function MinimalAssessmentForm({ onSubmit }: MinimalAssessmentFormProps) {
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => 
    new Set(["Quick Assessment", "Short Response", "Extended Response"])
  );
  const [hasPassage, setHasPassage] = useState<string | null>(null);

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
    if (!form.gradeLevels.length) {
      setGradeError("Please select at least one grade level.");
      return;
    }
    setGradeError(null);
    
    // Build details with question formats and passage info
    let details = form.additionalDetails || "";
    if (selectedFormats.length > 0) {
      const formatsStr = selectedFormats.join(", ");
      details = details ? `${details}\n\nQuestion Formats: ${formatsStr}` : `Question Formats: ${formatsStr}`;
    }
    if (selectedFormats.includes("passageBased") && hasPassage) {
      details = details 
        ? `${details}\nPassage: ${hasPassage === "yes" ? "User provided" : "Generate one"}` 
        : `Passage: ${hasPassage === "yes" ? "User provided" : "Generate one"}`;
    }
    
    onSubmit({ ...form, additionalDetails: details });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Grade Levels */}
      <div>
        <label><strong>Grade Levels</strong> <span style={{ color: "#dc2626" }}>*</span></label>
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
        </div>        {gradeError && (
          <p style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: "0.35rem", marginBottom: 0 }}>
            {gradeError}
          </p>
        )}      </div>

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

      {/* Question Formats */}
      <div>
        <label><strong>Question Formats</strong> <span style={{ fontWeight: 400, color: "var(--gray-500, #888)" }}>(optional)</span></label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
          {((): React.ReactNode[] => {
            const grouped = new Map<string, typeof QUESTION_FORMAT_CHIPS>();
            const groupNames: string[] = [];
            for (const chip of QUESTION_FORMAT_CHIPS) {
              const g = chip.group || "Standalone";
              if (!grouped.has(g)) {
                grouped.set(g, []);
                groupNames.push(g);
              }
              grouped.get(g)!.push(chip);
            }
            return groupNames.map(groupName => {
              const isExpanded = expandedGroups.has(groupName);
              const groupChips = grouped.get(groupName) || [];
              return (
                <div key={groupName}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(groupName)) next.delete(groupName);
                      else next.add(groupName);
                      return next;
                    })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "inline-block", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", fontSize: "0.75rem", lineHeight: 1 }}>▼</span>
                    {groupName}
                  </button>
                  {isExpanded && (
                    <div style={{ paddingLeft: "0.5rem", marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {groupChips.map(o => {
                        const isSelected = selectedFormats.includes(o.value);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setSelectedFormats(prev =>
                              prev.includes(o.value) 
                                ? prev.filter(v => v !== o.value) 
                                : [...prev, o.value]
                            )}
                            style={{
                              padding: "0.375rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: isSelected ? "2px solid #3b82f6" : "1px solid #d1d5db",
                              background: isSelected ? "#dbeafe" : "#ffffff",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              fontWeight: isSelected ? 500 : 400,
                              color: isSelected ? "#1e40af" : "#6b7280",
                            }}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Passage Input - shown only when "Passage-Based Reading" is selected */}
      {selectedFormats.includes("passageBased") && (
        <div>
          <label><strong>Do you have a passage ready?</strong></label>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <label>
              <input
                type="radio"
                name="hasPassage"
                value="yes"
                checked={hasPassage === "yes"}
                onChange={(e) => setHasPassage(e.target.value)}
              />
              Yes, I'll paste it below
            </label>
            <label>
              <input
                type="radio"
                name="hasPassage"
                value="no"
                checked={hasPassage === "no"}
                onChange={(e) => setHasPassage(e.target.value)}
              />
              No, generate one for me
            </label>
          </div>
          {hasPassage === "yes" && (
            <div style={{ marginTop: "0.75rem" }}>
              <textarea
                placeholder="Paste your passage text here..."
                style={{ width: "100%", minHeight: "120px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
              />
            </div>
          )}
        </div>
      )}

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
