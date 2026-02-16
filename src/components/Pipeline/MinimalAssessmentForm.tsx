import { useState, useEffect } from "react";
import { AssessmentIntent } from "./contracts/assessmentContracts";



import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";

import { ChevronUp, ChevronDown } from "lucide-react";

import styles from "./MinimalAssessmentForm.module.css";

interface MinimalAssessmentFormProps {
  onSubmit: (intent: AssessmentIntent) => void;
  isLoading: boolean;
}

export function MinimalAssessmentForm({ onSubmit, isLoading }: MinimalAssessmentFormProps) {

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
  const [advancedDetails, setAdvancedDetails] = useState("");



  const [courseName, setCourseName] = useState("");
  
  


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

    // 1. Assignment Type
  const finalAssignmentType =
    assessmentType === "Other" && customAssessmentType
      ? customAssessmentType
      : assessmentType;

  summary += `\n• Assignment Type: ${finalAssignmentType}`;
  
  // 2. Course Name
  if (courseName) {
    summary += `\n• Course: ${courseName}`;
  }

  // 3. Unit / Topic
  if (unitName) {
    summary += `\n• Unit / Topic: ${unitName}`;
  }

  // 4. Student Level 
  if (studentLevel) 
    { summary += `\n• Student Level: ${studentLevel}`; 
  }

  // 5. Time
  if (timeMinutes) {
    summary += `\n• Estimated Time: ${timeMinutes} minutes`;
  }

  // 6. Uploads
const hasSourceDocs = sourceDocs.length > 0;
const hasExampleFiles = exampleTestFiles.length > 0;
const hasExampleText = exampleTestTextList.length > 0;
const hasExampleTests = hasExampleFiles || hasExampleText;

if (hasSourceDocs || hasExampleTests) {
  summary += "\n\nWe’ll use the following inputs:";

  if (hasSourceDocs) {
    summary += `\n• ${sourceDocs.length} source document(s)`;
  }

  if (hasExampleFiles) {
    summary += `\n• ${exampleTestFiles.length} example test file(s)`;
  }

  if (hasExampleText) {
    summary += `\n• ${exampleTestTextList.length} pasted example test(s)`;
  }
}

// 7. Additional Comments
if (advancedDetails.trim().length > 0) {
  summary += `\n\nAdditional Details:\n${advancedDetails.trim()}`;
}

// 8. Conditional Final Statement
if (hasSourceDocs && hasExampleTests) {
  summary +=
    "\n\nFinally, we’ll generate a new assessment that aligns with your source materials, matches or improves the structure of your example test(s), and explains key differences.";
} else if (hasSourceDocs) {
  summary +=
    "\n\nFinally, we’ll generate a new assessment aligned to the content and skills in your source materials.";
} else if (hasExampleTests) {
  summary +=
    "\n\nFinally, we’ll generate a new assessment that mirrors the structure, pacing, and difficulty of your example test(s).";
} 

  setPreviewText(summary);
}, [
  courseName,
  unitName,
  assessmentType,
  customAssessmentType,
  timeMinutes,
  sourceDocs,
  exampleTestFiles,
  exampleTestTextList,
  advancedDetails,
]);


const handleSubmit = () => {
  const intent: AssessmentIntent = {
    course: courseName ?? "",
    unit: unitName ?? "",
    studentLevel: studentLevel ?? "Standard",
    assignmentType:
      assessmentType === "Other" && customAssessmentType
        ? customAssessmentType
        : assessmentType,
    time: String(timeMinutes ?? ""),
    uploads: [
      ...sourceDocs.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      ...exampleTestFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      ...exampleTestTextList.map((text, i) => ({
        name: `example_text_${i + 1}.txt`,
        size: text.length,
        type: "text/plain",
      })),
    ],
    additionalDetails: advancedDetails ?? "",
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
        placeholder="e.g., Algebra I, Biology, World History"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
      />
    </div>

    {/* Unit / Topic */}
    <div>
      <Label>Unit / Topic (be specific)</Label>
      <Input
        placeholder="e.g., Revolutionary War - Causes"
        value={unitName}
        onChange={(e) => setUnitName(e.target.value)}
      />
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
      {/* 3️⃣ Additional Details (Optional) */}
<Card>
  <h2 className={styles.sectionTitle}>Additional Details (Optional)</h2>

  <p className={styles.helperText}>
    Add anything else you want the system to consider.  
    You might include:
    <br />• specific skills or standards  
    <br />• classroom context  
    <br />• student challenges or strengths  
    <br />• preferred difficulty or emphasis  
    <br />• anything unique about this assessment  
  </p>

  <Textarea
    placeholder="Add any extra details here..."
    value={advancedDetails}
    onChange={(e) => setAdvancedDetails(e.target.value)}
  />
</Card>


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
