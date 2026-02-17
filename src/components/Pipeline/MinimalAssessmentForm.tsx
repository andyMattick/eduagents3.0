import React, { useState } from "react";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";

interface MinimalAssessmentFormProps {
  onSubmit: (req: MinimalTeacherIntent) => void;
}

export function MinimalAssessmentForm({ onSubmit }: MinimalAssessmentFormProps) {
  const [course, setCourse] = useState("");
  const [unit, setUnit] = useState("");
  const [studentLevel, setStudentLevel] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [time, setTime] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const req: MinimalTeacherIntent = {
      course,
      unit,
      studentLevel,
      assignmentType,
      time,
      additionalDetails
    };


    onSubmit(req);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Course</label>
      <input value={course} onChange={(e) => setCourse(e.target.value)} />

      <label>Unit</label>
      <input value={unit} onChange={(e) => setUnit(e.target.value)} />

      <label>Student Level</label>
      <input value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)} />

      <label>Assignment Type</label>
      <input value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)} />

      <label>Time</label>
      <input value={time} onChange={(e) => setTime(e.target.value)} />

      <label>Additional Details</label>
      <textarea
        value={additionalDetails}
        onChange={(e) => setAdditionalDetails(e.target.value)}
      />

      <button type="submit">Generate Assessment</button>
    </form>
  );
}
