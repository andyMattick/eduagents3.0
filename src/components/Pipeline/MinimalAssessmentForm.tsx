import { useState } from "react";
import styles from "./minimalAssessment.module.css";

import { ASSESSMENT_TYPES } from "../Pipeline/assessmentTypes";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedAssessmentRequest } from "@/components/Pipeline/contracts/assessmentContracts";
import { translateMinimalToUnified } from "@/services/translateMinimalToUnified";
import { buildWriterPrompt } from "@/components/Pipeline/writer/writerPrompt";


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
  quiz: 35,
  test: 45,
  worksheet: 15,
  testReview: 40,
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
  gradeLevels: [],
  unitName: "",
  lessonName: "",
  topic: "",
  
  

});

  const [showUnitSection, setShowUnitSection] = useState(false);

  const [assignmentChoice, setAssignmentChoice] = useState<AssessmentTypeKey>("bellRinger");
  const [showExpectModal, setShowExpectModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [showWriterPrompt, setShowWriterPrompt] = useState(false);


  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  onSubmit(form);
}
  const unitSummary =
    form.unitName && form.lessonName && form.topic
      ? `${form.unitName} → ${form.lessonName} → ${form.topic}`
      : "";
  const time = ASSESSMENT_TYPES[form.assessmentType].recommendedTime; 
  const timeDisplay = time.min === time.max ? `
    ${time.min} minutes` : `${time.min}–${time.max} minutes`;

  // Build the exact request the Writer receives
  const writerRequest: UnifiedAssessmentRequest = translateMinimalToUnified(form);

  // Build the Writer prompt string
  const writerPrompt = buildWriterPrompt(writerRequest);
  
 return (
    
<div className={styles.dashboardLayout}>

  {/* LEFT COLUMN */}
  <section className={styles.leftColumn}>
    <div className={styles.leftCard}>
      <form id="assessmentForm" onSubmit={handleSubmit}>

        <div className={styles.section}>
          <h2 className={styles.leftColumnHeader}>Tell Us About Your Assessment, The More Details The Better</h2>

          <div className={styles.grid}>

            
            {/* Grade Levels */}
            <Collapsible>
              <CollapsibleTrigger className={styles.gradeTrigger}>
                <span className="arrow">▶</span>
                Grade Levels
              </CollapsibleTrigger>

              <CollapsibleContent className={styles.gradeContent}>
                <div className={styles.gradeCheckboxGrid}>
                  {["K","1","2","3","4","5","6","7","8","9","10","11","12"].map((grade) => (
                    <label key={grade} className={styles.gradeCheckboxItem}>
                      <input
                        type="checkbox"
                        checked={form.gradeLevels.includes(grade)}
                        onChange={() => {
                          setForm((prev) => {
                            const exists = prev.gradeLevels.includes(grade);
                            return {
                              ...prev,
                              gradeLevels: exists
                                ? prev.gradeLevels.filter((g) => g !== grade)
                                : [...prev.gradeLevels, grade],
                            };
                          });
                        }}
                      />
                      {grade}
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>


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

            
            {/* Unit / Lesson / Topic */}
            <Collapsible open={showUnitSection} onOpenChange={setShowUnitSection}>

              <CollapsibleTrigger className={styles.unitTrigger}>
                <span className="arrow">▶</span>
                <span>Unit, Lesson & Topic</span>

                {/* Summary when collapsed */}
                {!showUnitSection && (
                  <span className={styles.unitSummary}>
                    {form.unitName && form.lessonName && form.topic
                      ? `${form.unitName} → ${form.lessonName} → ${form.topic}`
                      : "Not complete"}
                  </span>
                )}
              {/* Checkmark logic */}
                {!showUnitSection && (
                  <span className={ form.unitName && form.lessonName && form.topic ? styles.checkmarkComplete : styles.checkmarkIncomplete } >
                    {form.unitName && form.lessonName && form.topic ? "✔" : "○"}
                  </span>
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className={styles.unitContent}>
              <div className={styles.instructions}>
                To help the Writer generate accurate problems, please be specific.
                <br />
                Examples:
                <ul>
                  <li><strong>Unit:</strong> Fractions</li>
                  <li><strong>Lesson:</strong> Adding Fractions</li>
                  <li><strong>Topic:</strong> Adding fractions with the same denominator</li>
                </ul>
              </div>
                <div className={styles.unitGrid}>
                  
                  {/* Unit Name */}
                  <div className={styles.inputBlock}>
                    <label>Unit Name</label>
                    <input
                      className={styles.input}
                      placeholder="Fractions"
                      value={form.unitName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, unitName: e.target.value }))
                      }
                    />
                  </div>

                  {/* Lesson Name */}
                  <div className={styles.inputBlock}>
                    <label>Lesson Name</label>
                    <input
                      className={styles.input}
                      placeholder="Adding Fractions"
                      value={form.lessonName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, lessonName: e.target.value }))
                      }
                    />
                  </div>

                  {/* Specific Topic */}
                  <div className={styles.inputBlock}>
                    <label>Specific Topic</label>
                    <input
                      className={styles.input}
                      placeholder="Adding fractions with the same denominator"
                      value={form.topic}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, topic: e.target.value }))
                      }
                    />
                    <div className={styles.helpText}>
                      Be as specific as possible — this helps the Writer generate accurate problems.
                    </div>
                  </div>

                </div>
              </CollapsibleContent>
            </Collapsible>


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
          <Collapsible open={showExtraDetails} onOpenChange={setShowExtraDetails}>
            <CollapsibleTrigger className={styles.extraTrigger}>
              <span className="arrow">▶</span>
              <span>Anything else you want to add?</span>

              {/* Summary when collapsed */}
              {!showExtraDetails && (
                <span className={styles.extraSummary}>
                  {form.additionalDetails?.trim()
                    ? `${form.additionalDetails.split("\n").length} note${
                        form.additionalDetails.split("\n").length > 1 ? "s" : ""
                      } added`
                    : "Optional"}
                </span>
              )}

              {/* Checkmark logic */}
              {!showExtraDetails && (
                <span
                  className={
                    form.additionalDetails?.trim()
                      ? styles.checkmarkComplete
                      : styles.checkmarkIncomplete
                  }
                >
                  {form.additionalDetails?.trim() ? "✔" : "○"}
                </span>
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className={styles.extraContent}>
              <div className={styles.instructions}>
                These optional notes help the Writer tailor the assignment.
                You might include:
                <ul>
                  <li>Prior knowledge students need activated</li>
                  <li>Common misconceptions students have</li>
                  <li>The specific skill or standard you want reinforced</li>
                  <li>Anything to avoid (topics, formats, difficulty levels)</li>
                </ul>
              </div>

              <textarea
                className={styles.textarea}
                placeholder="Add any helpful notes for the Writer..."
                value={form.additionalDetails}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, additionalDetails: e.target.value }))
                }
              />
            </CollapsibleContent>
          </Collapsible>

          
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
          {unitSummary ? "✔️" : "•"} Unit | Lesson | Topic
        </span>
        <span className={styles.summaryValue}>
          {unitSummary || "Not set"}
        </span>
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

    <button
      type="button"
      className={styles.generateButtonSecondary}
      onClick={() => setShowWriterPrompt(true)}
    >
      Show Writer Prompt
    </button>

    {/* Generate Button */}
    <button
      form="assessmentForm"
      type="submit"
      className={styles.generateButton}
      disabled={
        !form.course ||
        !form.unitName?.trim() ||
        !form.lessonName?.trim() ||
        !form.topic?.trim() ||
        !form.assessmentType
}

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

  </div>
{showWriterPrompt && (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <h2 className={styles.modalTitle}>Writer Prompt</h2>

      <pre className={styles.promptBlock}>
        <code>{writerPrompt}</code>
      </pre>

      <button
        type="button"
        className={styles.closeButton}
        onClick={() => setShowWriterPrompt(false)}
      >
        Close
      </button>
    </div>
  </div>
)}


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
        <strong>{timeDisplay}:</strong> 
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

