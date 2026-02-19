import { useState } from "react";
import styles from "./minimalAssessment.module.css";

import { ASSESSMENT_TYPES } from "../Pipeline/assessmentTypes";
import { AssessmentTypeInfo } from "../Pipeline/AssessmentTypeInfo";
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
  studentLevel: "",
  assessmentType: "bellRinger", // temporary default
  time: 5,
  additionalDetails: "",
  sourceDocuments: [],
  exampleAssessment: undefined,
  gradeLevels: []
});


  const [assignmentChoice, setAssignmentChoice] = useState("");

  

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  onSubmit(form);
}



  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Grade Levels (K–12 Multi-select) */}
<div className={styles.inputBlock}>
  <label>Grade Levels (optional)</label>
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
    {[
      "K",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12"
    ].map((grade) => (
      <option key={grade} value={grade}>
        {grade === "K" ? "Kindergarten" : `${grade}th Grade`}
      </option>
    ))}
  </select>
</div>

      {/* Course */}
      <div className={styles.inputBlock}>
        <label>Course</label>
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
        <label>Unit</label>
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
        <label>Student Level</label>
        <input
          className={styles.input}
          value={form.studentLevel}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, studentLevel: e.target.value }))
          }
        />
      </div>

      {/* Assessment Type */}
      <div className={styles.inputBlock}>
        <label>Assessment Type</label>

    <select
  className={styles.input}
  value={assignmentChoice}
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as AssessmentTypeKey;
    setAssignmentChoice(type);

    setForm((prev) => ({
      ...prev,
      assessmentType: type as AssessmentTypeKey,
      time: DEFAULT_TIMES[type as AssessmentTypeKey]

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

        {/* ⭐ Info Box */}
        {form.assessmentType &&
          ASSESSMENT_TYPES[form.assessmentType] && (
            <AssessmentTypeInfo type={form.assessmentType} />
          )}
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

      {/* Additional Details */}
      <div className={styles.inputBlock}>
        <label>Additional Details</label>
        <textarea
          className={styles.textarea}
          value={form.additionalDetails}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              additionalDetails: e.target.value
            }))
          }
        />
      </div>

      <button className={styles.submitButton} type="submit">
        Generate Assessment
      </button>
    </form>
  );
}

export default MinimalAssessmentForm;

