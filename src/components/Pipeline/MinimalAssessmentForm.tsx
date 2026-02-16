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

  const [sourceDocs, setSourceDocs] = useState<File[]>([]);
  const [exampleTestFile, setExampleTestFile] = useState<File | null>(null);
  const [exampleTestText, setExampleTestText] = useState("");

  const [subject, setSubject] = useState("math");
  const [courseName, setCourseName] = useState("");
  const [gradeBand, setGradeBand] = useState("9-12");
  const [studentLevel, setStudentLevel] = useState("Standard");
  const [assessmentType, setAssessmentType] = useState("Quiz");
  const [timeMinutes, setTimeMinutes] = useState(30);

  const [focusAreas, setFocusAreas] = useState("");
  const [emphasis, setEmphasis] = useState("Conceptual");
  const [difficultyProfile, setDifficultyProfile] = useState("Balanced");
  const [classroomContext, setClassroomContext] = useState("");
  const [notesForWriter, setNotesForWriter] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewText, setPreviewText] = useState("");

  useEffect(() => {
    let summary = "We will create a new assessment";

    if (sourceDocs.length > 0) {
      summary +=
        "\n• Extract content from your source documents\n• Align questions ONLY to covered material";
    }

    if (exampleTestFile || exampleTestText.length > 0) {
      summary +=
        "\n• Analyze your example test’s structure, pacing, and difficulty\n• Match or improve the structure in the new assessment";
    }

    if (sourceDocs.length > 0 && (exampleTestFile || exampleTestText)) {
      summary +=
        "\n• Compare the example test to the new one and explain differences";
    }

    summary +=
      "\n• Simulate student performance using class defaults\n• Improve the assessment based on predicted misconceptions\n• Provide a rationale for every design choice";

    setPreviewText(summary);
  }, [
    sourceDocs,
    exampleTestFile,
    exampleTestText,
    subject,
    gradeBand,
    assessmentType,
    timeMinutes,
  ]);

  const handleSubmit = () => {
    const intent = {
      sourceFile: sourceDocs[0] || exampleTestFile || undefined,
      sourceTopic: exampleTestText || undefined,
      subject,
      courseName,
      gradeBand,
      studentLevel,
      assessmentType,
      timeMinutes,
      focusAreas: focusAreas
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      emphasis,
      difficultyProfile,
      classroomContext,
    };

    onSubmit(intent);
  };

  return (
    <div className={styles.container}>
      {/* 1️⃣ Unified Source/Test Input */}
      <Card>
        <h2 className={styles.sectionTitle}>What are you starting with?</h2>

        <Tabs.Root value={inputMode ?? ""} onValueChange={setInputMode}>
          <Tabs.List className={styles.tabsList}>
            <Tabs.Trigger value="source-docs" className={styles.tab}>
              Source Docs
            </Tabs.Trigger>
            <Tabs.Trigger value="example-test-file" className={styles.tab}>
              Example Test (File)
            </Tabs.Trigger>
            <Tabs.Trigger value="example-test-text" className={styles.tab}>
              Example Test (Paste)
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="source-docs" className={styles.tabContent}>
            <Input
              type="file"
              multiple
              onChange={(e) => setSourceDocs(Array.from(e.target.files ?? []))}
            />
            <p className={styles.helpText}>
              Upload textbook chapters, readings, slides, worksheets, etc.
            </p>
          </Tabs.Content>

          <Tabs.Content value="example-test-file" className={styles.tabContent}>
            <Input
              type="file"
              onChange={(e) => setExampleTestFile(e.target.files?.[0] ?? null)}
            />
            <p className={styles.helpText}>
              We’ll analyze structure, difficulty, pacing, and question types.
            </p>
          </Tabs.Content>

          <Tabs.Content value="example-test-text" className={styles.tabContent}>
            <Textarea
              placeholder="Paste an existing test here..."
              value={exampleTestText}
              onChange={(e) => setExampleTestText(e.target.value)}
            />
            <p className={styles.helpText}>
              If you don’t have a file, paste the test text here.
            </p>
          </Tabs.Content>
        </Tabs.Root>
      </Card>

      {/* 2️⃣ Assessment Details */}
      <Card>
        <h2 className={styles.sectionTitle}>Assessment Details</h2>

        <div className={styles.grid}>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <Label>Course Name</Label>
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} />
          </div>

          <div>
            <Label>Grade Band</Label>
            <Input value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} />
          </div>

          <div>
            <Label>Student Level</Label>
            <Input value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)} />
          </div>

          <div>
            <Label>Assessment Type</Label>
            <Input
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
            />
          </div>

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
