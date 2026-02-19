import { useState } from "react";
import styles from "./minimalAssessment.module.css";

import { ASSESSMENT_TYPES } from "../Pipeline/assessmentTypes";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";

type AssessmentTypeKey = 
  | "bellRinger"
  | "exitTicket"
  | "quiz"
  | "test"
  | "worksheet"
  | "testReview";

const DEFAULT_TIMES: Record<AssessmentTypeKey, number> = {
  bellRinger: 5,
  exitTicket: 5,
  quiz: 10,
  test: 30,
  worksheet: 15,
  testReview: 20,
};

interface MinimalAssessmentFormProps {
  onSubmit: (intent: MinimalTeacherIntent ) => void;
}

export function MinimalAssessmentForm({ onSubmit }: MinimalAssessmentFormProps) {

  const [form, setForm] = useState<MinimalTeacherIntent>({
  course: "",
  unit: "",
  studentLevel: "Standard",
  assessmentType: "bellRinger",
  time: DEFAULT_TIMES["bellRinger"],
  additionalDetails: "",
  sourceDocuments: [],
  exampleAssessment: undefined,
  gradeLevels: []
});


  const [assignmentChoice, setAssignmentChoice] = useState<AssessmentTypeKey>("bellRinger");
  const [showExpectModal, setShowExpectModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);


  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  onSubmit(form);
}
 return (
    
<div className={styles.dashboardLayout}>

  {/* LEFT COLUMN */}
  <section className={styles.leftColumn}>
    <div className={styles.leftCard}>
      <form id="assessmentForm" onSubmit={handleSubmit}>

        <div className={styles.section}>
          <h2 className={styles.leftColumnHeader}>Assessment Basics</h2>

          <div className={styles.grid}>

            {/* Grade Levels */}
            <div className={styles.inputBlock}>
              <label>Grade Levels - Hold Shift to select multiple grades</label>
              <select
                multiple
                className={styles.input}
                value={form.gradeLevels}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (opt) => opt.value
                  );
                  setForm((prev) => ({ ...prev, gradeLevels: selected }));
                }}
              >
                {["K","1","2","3","4","5","6","7","8","9","10","11","12"].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade === "K" ? "Kindergarten" : `${grade}th Grade`}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className={styles.inputBlock}>
              <label>Course - e.g. Algebra, English</label>
              <input
                className={styles.input}
                value={form.course}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, course: e.target.value }))
                }
              />
            </div>

            {/* Unit */}
            <div className={styles.inputBlock}>
              <label>Unit - e.g. Linear Functions, Shakespeare's Sonnets</label>
              <input
                className={styles.input}
                value={form.unit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unit: e.target.value }))
                }
              />
            </div>

            {/* Student Level */}
            <div className={styles.inputBlock}>
              <label className={styles.labelRow}>
                <span>Student Level</span>

                <button
                  type="button"
                  className={styles.infoButton}
                  onClick={() => setShowLevelModal(true)}
                >
                  x
                </button>
              </label>

              <select
                className={styles.input}
                value={form.studentLevel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, studentLevel: e.target.value }))
                }
              >
                <option value="Remedial">Remedial</option>
                <option value="Standard">Standard</option>
                <option value="Honors">Honors</option>
                <option value="AP">AP</option>
              </select>
            </div>


            {/* Assessment Type */}
            <div className={styles.inputBlock}>
              <label className={styles.labelRow}>
                <span>Assessment Type</span>

                <button
                  type="button"
                  className={styles.infoButton}
                  onClick={() => setShowExpectModal(true)}
                >
                  ⓘ
                </button>
              </label>

              <select
                className={styles.input}
                value={assignmentChoice}
                onChange={(e) => {
                  const type = e.target.value as AssessmentTypeKey;
                  setAssignmentChoice(type);
                  setForm((prev) => ({
                    ...prev,
                    assessmentType: type,
                    time: DEFAULT_TIMES[type]
                  }));
                }}
              >
                <option value="">Select type…</option>
                {Object.keys(ASSESSMENT_TYPES).map((key) => (
                  <option key={key} value={key}>
                    {ASSESSMENT_TYPES[key].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div className={styles.inputBlock}>
              <label>Time (minutes)</label>
              <input
                className={styles.input}
                type="number"
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, time: Number(e.target.value) }))
                }
              />
            </div>

          </div>

          {/* Additional Details */}
          <div className={styles.inputBlock}>
            <label>Additional Details</label>
            <textarea
              className={styles.textarea}
              placeholder={ASSESSMENT_TYPES[form.assessmentType].additionalDetailsHint}
              value={form.additionalDetails}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  additionalDetails: e.target.value
                }))
              }
            />
          </div>
          <p className={styles.helperText}> 
            Optional — but your guidance helps tailor the assessment. </p>

        </div>
      </form>
    </div>
  </section>

  {/* RIGHT COLUMN */}
<aside className={styles.rightColumn}>
  <div className={styles.summaryCard}>
    

    {/* Assessment Overview */}
    <button
      type="button"
      className={styles.generateButtonSecondary}
      onClick={() => setShowExpectModal(true)}
    >
      What to Expect
    </button>
    <h3 className={styles.summaryTitle}>Before You Generate</h3>
    <p className={styles.summaryStatus}>Complete the required fields</p>

    {/* Checklist */}
    <div className={styles.summarySection}>
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>
        {form.gradeLevels?.length ? "✔️" : "•"} Grade
      </span>
      <span className={styles.summaryValue}>
        {form.gradeLevels?.length ? form.gradeLevels.join(", ") : "Not set"}
      </span>
    </div>

    
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>
          {form.course ? "✔️" : "•"} Course
        </span>
        <span className={styles.summaryValue}>{form.course || "Not set"}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>
          {form.unit ? "✔️" : "•"} Unit
        </span>
        <span className={styles.summaryValue}>{form.unit || "Not set"}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>
          {form.studentLevel ? "✔️" : "•"} Level
        </span>
        <span className={styles.summaryValue}>{form.studentLevel || "Not set"}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>
          {form.assessmentType ? "✔️" : "•"} Type
        </span>
        <span className={styles.summaryValue}>
          {ASSESSMENT_TYPES[form.assessmentType].label}
        </span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>
          {form.time ? "✔️" : "•"} Time
        </span>
        <span className={styles.summaryValue}>
          {ASSESSMENT_TYPES[form.assessmentType].recommendedTime.min}–
          {ASSESSMENT_TYPES[form.assessmentType].recommendedTime.max} minutes
        </span>

      </div>
    </div>

    {/* Generate Button */}
    <button
      form="assessmentForm"
      type="submit"
      className={styles.generateButton}
      disabled={!form.course || !form.unit || !form.assessmentType}
    >
      Generate Assessment
    </button>

    

    {/* Notes Preview */}
    <div
      className={`${styles.notesStatusBadge} ${
        form.additionalDetails?.trim() ? styles.notesAdded : styles.notesEmpty
      }`}
    >
      {form.additionalDetails?.trim()
        ? "Your insights are included — they’ll shape the assessment."
        : "Add notes to guide the generator."}
    </div>


    {/* Suggested Additional Details */}
    <div className={styles.summarySection}>
      <h4 className={styles.summarySectionTitle}>Suggested Additional Details</h4>
      <ul className={styles.summaryNotes}>
        <li>{ASSESSMENT_TYPES[form.assessmentType].additionalDetailsHint}</li>
        <li>Mention any common misconceptions students have.</li>
        <li>Identify the specific skill or standard you want reinforced.</li>
        <li>Note anything to avoid (topics, formats, difficulty levels).</li>
      </ul>
    </div>


  </div>
</aside>

{showExpectModal && (
  <div className={styles.modalBackdrop} onClick={() => setShowExpectModal(false)}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      
      <h2>
        {ASSESSMENT_TYPES[form.assessmentType].label} — What to Expect
      </h2>

      <p>
        <strong>Purpose:</strong> {ASSESSMENT_TYPES[form.assessmentType].purpose}
      </p>

      <p>
        <strong>Time:</strong> 
        {ASSESSMENT_TYPES[form.assessmentType].recommendedTime.min}–
        {ASSESSMENT_TYPES[form.assessmentType].recommendedTime.max} minutes
      </p>

      <p>
        <strong>Typical Length:</strong> 
        {ASSESSMENT_TYPES[form.assessmentType].typicalLength}
      </p>

      <h3>Problem Types</h3>
      <ul>
        {ASSESSMENT_TYPES[form.assessmentType].problemTypes.map((pt, i) => (
          <li key={i}>{pt}</li>
        ))}
      </ul>

      <h3>Will NOT include</h3>
      <ul>
        {ASSESSMENT_TYPES[form.assessmentType].prohibitions.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>

      <h3>Before You Generate</h3>
      <p>Complete the required fields</p>

      <button
        className={styles.generateButtonSecondary}
        onClick={() => setShowExpectModal(false)}
      >
        Close
      </button>

    </div>
  </div>
)}

{showLevelModal && (
  <div className={styles.modalBackdrop} onClick={() => setShowLevelModal(false)}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      
      <h2>Student Level — What This Changes</h2>

      <p>
        These levels adjust the <strong>type of problems</strong> the system generates.
        They never describe students — only the <strong>task design</strong>.
      </p>

      <h3>Remedial</h3>
      <ul>
        <li>Highly scaffolded steps</li>
        <li>Concrete, skill‑focused tasks</li>
        <li>Minimal reading load</li>
      </ul>

      <h3>Standard</h3>
      <ul>
        <li>Grade‑level expectations</li>
        <li>Mix of recall and simple application</li>
      </ul>

      <h3>Honors</h3>
      <ul>
        <li>Multi‑step reasoning</li>
        <li>Light abstraction</li>
        <li>More open‑ended prompts</li>
      </ul>

      <h3>AP</h3>
      <ul>
        <li>College‑level reasoning</li>
        <li>Multi‑step modeling</li>
        <li>Justification + explanation required</li>
      </ul>

      <button
        className={styles.generateButtonSecondary}
        onClick={() => setShowLevelModal(false)}
      >
        Close
      </button>

    </div>
  </div>
)}



</div>

);

}

export default MinimalAssessmentForm;

