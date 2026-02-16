import { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";

import { ChevronUp, ChevronDown } from "lucide-react";

import styles from "./MinimalAssessmentForm.module.css";

export function MinimalAssessmentForm({ onSubmit, isLoading }) {
  const [inputMode, setInputMode] = useState(null);
  const [unitName, setUnitName] = useState("");
  // Add pasted example test text
const handleAddExampleText = () => {
  if (exampleTestText.trim().length > 0) {
    setExampleTestTextList((prev) => [...prev, exampleTestText.trim()]);
    setExampleTestText("");
  }
};

// Remove a pasted example test
const handleRemoveExampleText = (index: number) => {
  setExampleTestTextList((prev) => prev.filter((_, i) => i !== index));
};



  const [sourceDocs, setSourceDocs] = useState<File[]>([]);
  const [exampleTestFiles, setExampleTestFiles] = useState<File[]>([]);
  const [exampleTestText, setExampleTestText] = useState("");
  const [exampleTestTextList, setExampleTestTextList] = useState<string[]>([]);


  const [courseName, setCourseName] = useState("");
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);

  const toggleGradeLevel = (level: string) => {
  setGradeLevels((prev) =>
    prev.includes(level)
      ? prev.filter((l) => l !== level)
      : [...prev, level]
  );
};


  const [studentLevel, setStudentLevel] = useState("Standard");
  const [assessmentType, setAssessmentType] = useState("Quiz");
  const [customAssessmentType, setCustomAssessmentType] = useState("");
  const [timeMinutes, setTimeMinutes] = useState(30);

  const [focusAreas, setFocusAreas] = useState("");
  const [emphasis, setEmphasis] = useState("Conceptual");
  const [difficultyProfile, setDifficultyProfile] = useState("Balanced");
  const [classroomContext, setClassroomContext] = useState("");
  const [notesForWriter, setNotesForWriter] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewText, setPreviewText] = useState("");

useEffect(() => {
  let summary = "Based on what you provided, here’s what we’ll generate:\n";

  // Course + Unit
  if (courseName) {
    summary += `\n• Course: ${courseName}`;
  }

  if (unitName) {
    summary += `\n• Unit / Topic: ${unitName}`;
  }

  // Grade Levels
  if (gradeLevels.length > 0) {
    summary += `\n• Grade Levels: ${gradeLevels.join(", ")}`;
  }

  // Student Level
  if (studentLevel) {
    summary += `\n• Student Level: ${studentLevel}`;
  }

  // Assignment Type
  if (assessmentType === "Other" && customAssessmentType) {
    summary += `\n• Assignment Type: ${customAssessmentType}`;
  } else if (assessmentType) {
    summary += `\n• Assignment Type: ${assessmentType}`;
  }

  // Time
  if (timeMinutes) {
    summary += `\n• Estimated Time: ${timeMinutes} minutes`;
  }

  // Source Docs
  if (sourceDocs.length > 0) {
    summary += `\n\nWe’ll use your ${sourceDocs.length} source document(s) to extract key concepts, skills, and vocabulary.`;
  }

  // Example Tests (Files + Pasted)
  const hasExampleTests =
    exampleTestFiles.length > 0 || exampleTestTextList.length > 0;

  if (hasExampleTests) {
    summary +=
      "\n\nWe’ll analyze your example test(s) for structure, pacing, difficulty, and question types.";
  }

  // Compare source docs + example tests
  if (sourceDocs.length > 0 && hasExampleTests) {
    summary +=
      "\n\nWe’ll compare your source materials with your example test(s) to align difficulty, structure, and learning goals.";
  }

  // Final output
  summary +=
    "\n\nFinally, we’ll generate a new assessment aligned to your course, unit, grade levels, and student needs.";

  setPreviewText(summary);
}, [
  courseName,
  unitName,
  gradeLevels,
  studentLevel,
  assessmentType,
  customAssessmentType,
  timeMinutes,
  sourceDocs,
  exampleTestFiles,
  exampleTestTextList,
]);


const handleSubmit = () => {
  const intent = {
    // Multi‑input sources
    sourceDocs,
    exampleTestFiles,
    exampleTestTexts: exampleTestTextList,

    // Core instructional context
    courseName,
    unitName,
    gradeLevels,
    studentLevel,

    // Assignment metadata
    assignmentType:
      assessmentType === "Other" && customAssessmentType
        ? customAssessmentType
        : assessmentType,

    timeMinutes,

    // Optional advanced fields
    focusAreas: focusAreas
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),

    emphasis,
    difficultyProfile,
    classroomContext,
    notesForWriter,
  };

  onSubmit(intent);
};



  return (
    <div className={styles.container}>
      {/* 1️⃣ Unified Source/Test Input */}
{/* 2️⃣ Assessment Details */}
{/* 2️⃣ Assessment Details */}
{/* 2️⃣ Assessment Details */}
<Card>
  <h2 className={styles.sectionTitle}>Assessment Details</h2>

  <div className={styles.grid}>

    {/* Course Name */}
    <div>
      <Label>Course Name</Label>
      <Input
        placeholder="e.g., Algebra I, Biology, World History, ELA 7"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
      />
    </div>

    {/* Unit / Topic */}
    <div>
      <Label>Unit / Topic</Label>
      <Input
        placeholder="e.g., Linear Functions, Photosynthesis, Civil War"
        value={unitName}
        onChange={(e) => setUnitName(e.target.value)}
      />
    </div>

    {/* Grade Levels (K–12 multi-select) */}
    <div>
      <Label>Grade Levels</Label>

      <div className={styles.checkboxGroup}>
        {[
          "K",
          "1", "2", "3", "4", "5",
          "6", "7", "8",
          "9", "10", "11", "12"
        ].map((level) => (
          <label key={level} className={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={gradeLevels.includes(level)}
              onChange={() => toggleGradeLevel(level)}
            />
            {level === "K" ? "Kindergarten" : `${level}th`}
          </label>
        ))}
      </div>
    </div>

    {/* Student Level */}
    <div>
      <Label>Student Level</Label>
      <select
        className={styles.select}
        value={studentLevel}
        onChange={(e) => setStudentLevel(e.target.value)}
      >
        <option value="Remedial">Remedial</option>
        <option value="Standard">Standard</option>
        <option value="Honors">Honors</option>
        <option value="AP">AP</option>
      </select>
    </div>

    {/* Assignment Type */}
    <div>
      <Label>Assignment Type</Label>
      <select
        className={styles.select}
        value={assessmentType}
        onChange={(e) => setAssessmentType(e.target.value)}
      >
        <option value="Test">Test</option>
        <option value="Quiz">Quiz</option>
        <option value="Bell Ringer">Bell Ringer</option>
        <option value="Exit Ticket">Exit Ticket</option>
        <option value="Worksheet">Worksheet</option>
        <option value="Essay">Essay</option>
        <option value="Other">Other</option>
      </select>

      {assessmentType === "Other" && (
        <Input
          placeholder="Enter assignment type"
          value={customAssessmentType}
          onChange={(e) => setCustomAssessmentType(e.target.value)}
        />
      )}
    </div>

    {/* Time */}
    <div>
      <Label>Time (minutes)</Label>
      <Input
        type="number"
        value={timeMinutes}
        onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
      />
    </div>

  </div>
</Card>

{/* 1️⃣ Input Sources */}
<Card>
  <h2 className={styles.sectionTitle}>Input Sources</h2>

  <div className={styles.verticalStack}>

    {/* Source Documents */}
    <div>
      <Label>Source Documents</Label>
      <Input
        type="file"
        multiple
        onChange={(e) =>
          setSourceDocs(Array.from(e.target.files ?? []))
        }
      />

      {sourceDocs.length > 0 && (
        <ul className={styles.fileList}>
          {sourceDocs.map((file, i) => (
            <li key={i}>{file.name}</li>
          ))}
        </ul>
      )}
    </div>

    {/* Example Test Files */}
    <div>
      <Label>Example Test Files</Label>
      <Input
        type="file"
        multiple
        onChange={(e) =>
          setExampleTestFiles(Array.from(e.target.files ?? []))
        }
      />

      {exampleTestFiles.length > 0 && (
        <ul className={styles.fileList}>
          {exampleTestFiles.map((file, i) => (
            <li key={i}>{file.name}</li>
          ))}
        </ul>
      )}
    </div>

    {/* Example Test Text */}
    <div>
      <Label>Example Test Text</Label>

      <Textarea
        placeholder="Paste example test text here..."
        value={exampleTestText}
        onChange={(e) => setExampleTestText(e.target.value)}
      />

      <Button
        type="button"
        onClick={handleAddExampleText}
        disabled={exampleTestText.trim().length === 0}
        className={styles.addButton}
      >
        Add Text
      </Button>

      {exampleTestTextList.length > 0 && (
        <ul className={styles.textList}>
          {exampleTestTextList.map((text, i) => (
            <li key={i} className={styles.textItem}>
              <div className={styles.textPreview}>{text}</div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleRemoveExampleText(i)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>

  </div>
</Card>



      {/* 3️⃣ Advanced Options */}
      <Collapsible.Root open={showAdvanced} onOpenChange={setShowAdvanced}>
        <Collapsible.Trigger asChild>
          <Button variant="outline" className={styles.advancedButton}>
            Advanced Options
            {showAdvanced ? <ChevronUp /> : <ChevronDown />}
          </Button>
                </Collapsible.Trigger>

        <Collapsible.Content className={styles.advancedContent}>
          <Card>
            <div>
              <Label>Focus Areas</Label>
              <Textarea
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="One per line"
              />
            </div>

            <div>
              <Label>Classroom Context</Label>
              <Textarea
                value={classroomContext}
                onChange={(e) => setClassroomContext(e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div>
              <Label>Notes for the AI Writer</Label>
              <Textarea
                value={notesForWriter}
                onChange={(e) => setNotesForWriter(e.target.value)}
                placeholder="Anything else we should know?"
              />
            </div>
          </Card>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* 4️⃣ Preview */}
      <Card>
        <h2 className={styles.sectionTitle}>Before You Generate</h2>
        <p className={styles.preview}>{previewText}</p>
      </Card>

      {/* 5️⃣ Submit */}
      <Button
        variant="primary"
        className={styles.generateButton}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate Assessment"}
      </Button>
    </div>
  );
}
