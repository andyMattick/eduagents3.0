import { useState, useMemo, useEffect } from "react";

import styles from "./minimalAssessment.module.css";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";


const DEFAULT_TIMES: Record<string, string> = {
  "Quiz": "20",
  "Exit Ticket": "5",
  "Unit Test": "45",
  "Worksheet": "25",
  "Bell Ringer": "5",
  "Essay": "60",
};

const ASSIGNMENT_TYPES = [
  "Quiz",
  "Exit Ticket",
  "Unit Test",
  "Worksheet",
  "Bell Ringer",
  "Essay",
  "Other",
];


export default function MinimalAssessment({ onSubmit }: { onSubmit: (intent: MinimalTeacherIntent) => void }) {
  const [form, setForm] = useState<MinimalTeacherIntent>({
    course: "",
    unit: "",
    studentLevel: "Standard",
    assignmentType: "",
    time: "",
    additionalDetails: "",
    sourceDocuments: [],
    exampleAssessment: undefined,
  });
  const [assignmentChoice, setAssignmentChoice] = useState("");

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
  if (form.assignmentType === "") return;

  if (ASSIGNMENT_TYPES.includes(form.assignmentType)) {
    setAssignmentChoice(form.assignmentType);
  } else {
    setAssignmentChoice("Other");
  }
}, []);


  const update = (field: keyof MinimalTeacherIntent, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSourceUpload = async (files: FileList | null) => {
    if (!files) return;
    const docs = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        content: await file.text(),
      }))
    );
    update("sourceDocuments", docs);
  };

  const handleExampleUpload = async (file: File | null) => {
    if (!file) return;
    update("exampleAssessment", {
      id: crypto.randomUUID(),
      content: await file.text(),
    });
  };

  const summary = useMemo(() => {
    const materialsCount =
      (form.sourceDocuments?.length ?? 0) +
      (form.exampleAssessment ? 1 : 0);

    const status =
      form.course && form.assignmentType
        ? "Ready to generate"
        : "Add at least a course and assignment type";

    return {
      materialsCount,
      status,
    };
  }, [form]);

  const isReady =
    form.course.trim() !== "" &&
    form.assignmentType.trim() !== "" &&
    form.time.trim() !== "";


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.appShell}>
      {/* TOP NAV */}
      

      {/* HEADER */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Generate an Assessment</h1>
        <p className={styles.pageSubtitle}>
          Tell us what you need — we’ll build it from your materials and context.
        </p>
      </header>

      {/* MAIN DASHBOARD */}
      <main className={styles.dashboardLayout}>
        {/* LEFT COLUMN — FORM */}
        <form onSubmit={handleSubmit} className={styles.leftColumn}>
          {/* BASICS */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Assessment Basics</h2>
            <div className={styles.grid}>

  {/* COURSE */}
  <div className={styles.inputBlock}>
    <label>Course</label>
    <input
      className={styles.input}
      value={form.course}
      onChange={(e) => update("course", e.target.value)}
      placeholder="e.g., Algebra I"
    />
  </div>

  {/* UNIT */}
  <div className={styles.inputBlock}>
    <label>Unit - Be Specific</label>
    <input
      className={styles.input}
      value={form.unit}
      onChange={(e) => update("unit", e.target.value)}
      placeholder="e.g., Linear Functions - Graphing"
    />
  </div>

  {/* STUDENT LEVEL */}
  <div className={styles.inputBlock}>
  <label>Student Level</label>
  <select
    className={styles.input}
    value={form.studentLevel}
    onChange={(e) => update("studentLevel", e.target.value)}
  >
    <option value="">Select level…</option>
    <option value="Remedial">Remedial</option>
    <option value="Standard">Standard</option>
    <option value="Honors">Honors</option>
    <option value="AP">AP</option>
  </select>
</div>


  {/* ASSIGNMENT TYPE — FIRST */}
  <div className={styles.inputBlock}>
    <label>Assignment Type</label>

    <select
      className={styles.input}
      value={assignmentChoice}
      onChange={(e) => {
        const type = e.target.value;
        setAssignmentChoice(type);

        if (type === "Other") {
          setForm((prev) => ({ ...prev, assignmentType: "" }));
          return;
        }

        setForm((prev) => ({
          ...prev,
          assignmentType: type,
          time: DEFAULT_TIMES[type] ?? prev.time, // auto-fill time
        }));
      }}
    >
      <option value="">Select type…</option>
      {ASSIGNMENT_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>

    {assignmentChoice === "Other" && (
      <input
        className={styles.input}
        type="text"
        placeholder="Enter assignment type"
        value={form.assignmentType}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, assignmentType: e.target.value }))
        }
      />
    )}
  </div>

  {/* TIME — SECOND */}
  <div className={styles.inputBlock}>
    <label>Time</label>
    <input
      className={styles.input}
      value={form.time}
      onChange={(e) => update("time", e.target.value)}
      placeholder="e.g., 20 minutes"
    />
  </div>

</div>

          </section>

          {/* DETAILS */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Additional Details</h2>
            <div className={styles.inputBlock}>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={form.additionalDetails}
                onChange={(e) => update("additionalDetails", e.target.value)}
                placeholder="Add any notes, context, or instructions..."
              />
            </div>
          </section>

          {/* UPLOADS */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Upload Materials</h2>

            {/* SOURCE DOCS */}
            <div className={styles.inputBlock}>
              <label>Source Documents</label>
              <div className={styles.dropZone}>
                <input
                  type="file"
                  multiple
                  className={styles.fileInput}
                  onChange={(e) => handleSourceUpload(e.target.files)}
                />
                <p className={styles.helpText}>Upload readings, worksheets, or reference materials.</p>
              </div>

              {form.sourceDocuments?.length > 0 && (
                <ul className={styles.fileList}>
                  {form.sourceDocuments.map((doc) => (
                    <li key={doc.id} className={styles.fileItem}>
                      <span className={styles.fileName}>{doc.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* EXAMPLE ASSESSMENT */}
            <div className={styles.inputBlock}>
              <label>Example Assessment</label>
              <div className={styles.dropZone}>
                <input
                  type="file"
                  className={styles.fileInput}
                  onChange={(e) => handleExampleUpload(e.target.files?.[0] ?? null)}
                />
                <p className={styles.helpText}>Optional: upload an example test to match tone and structure.</p>
              </div>

              {form.exampleAssessment && (
                <div className={styles.fileList}>
                  <div className={styles.fileItem}>
                    <span className={styles.fileName}>Example assessment uploaded</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ADVANCED */}
          <section className={styles.section}>
            <button
              type="button"
              className={styles.advancedToggle}
              onClick={() => setIsAdvancedOpen((v) => !v)}
            >
              <span>Advanced Options</span>
              <span>{isAdvancedOpen ? "▴" : "▾"}</span>
            </button>

            {isAdvancedOpen && (
              <div className={styles.advancedContent}>
                <div className={styles.inputBlock}>
                  <label>Rubric Goals</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} />
                </div>
                <div className={styles.inputBlock}>
                  <label>Focus Areas</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} />
                </div>
              </div>
            )}
          </section>

          {isReady && (
            <button
              type="submit"
              className={styles.generateButtonSecondary}
              onClick={handleSubmit}
            >
              Generate Assessment
            </button>

            
            )}

            

        </form>

        {/* RIGHT COLUMN — SUMMARY CARD */}
        <aside className={styles.rightColumn}>
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryTitle}>Before You Generate</h3>
            <p className={styles.summaryStatus}>{summary.status}</p>

            <div className={styles.summarySection}>
              <h4 className={styles.summarySectionTitle}>Overview</h4>
              {[
                ["Course", form.course],
                ["Unit", form.unit],
                ["Level", form.studentLevel],
                ["Type", form.assignmentType],
                ["Time", form.time],
              ].map(([label, value]) => (
                <div key={label} className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue}>{value || "Not set"}</span>
                </div>
              ))}
            </div>

            <div className={styles.summarySection}>
              <h4 className={styles.summarySectionTitle}>Materials</h4>
              <p className={styles.summaryValue}>
                {summary.materialsCount > 0
                  ? `${summary.materialsCount} item(s) attached`
                  : "No materials attached"}
              </p>
            </div>

            <div className={styles.summarySection}>
              <h4 className={styles.summarySectionTitle}>Notes Preview</h4>
              <p className={styles.summaryNotes}>
                {form.additionalDetails
                  ? form.additionalDetails.slice(0, 140) +
                    (form.additionalDetails.length > 140 ? "…" : "")
                  : "No additional notes yet."}
              </p>
              {isReady && (
              <button 
                type="submit"
                className={styles.generateButton}
                disabled={!isReady}
              >
  Generate Assessment
</button>

            )}

            <button
  type="button"
  className={styles.resetButton}
  onClick={() => {
    setForm({
      course: "",
      unit: "",
      studentLevel: "Standard",
      assignmentType: "",
      time: "",
      additionalDetails: "",
      sourceDocuments: [],
      exampleAssessment: undefined,
    });
    setAssignmentChoice("");
  }}
>
  Reset Form
</button>


            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
