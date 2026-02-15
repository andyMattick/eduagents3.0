import { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronUp, ChevronDown } from "lucide-react";

export type AssessmentIntent = {
  sourceFile?: File;
  sourceTopic?: string;
  subject: string;
  courseName: string;
  gradeBand: string;
  studentLevel: string;
  assessmentType: string;
  timeMinutes: number;
  focusAreas: string[];
  emphasis: string;
  difficultyProfile: string;
  classroomContext: string;
};

type MinimalAssessmentFormProps = {
  onSubmit: (intent: AssessmentIntent) => void;
  isLoading: boolean;
};

export function MinimalAssessmentForm({
  onSubmit,
  isLoading,
}: MinimalAssessmentFormProps) {
  // Unified source/test input model
  const [inputMode, setInputMode] = useState<
    "source-docs" | "example-test-file" | "example-test-text" | null
  >(null);

  const [sourceDocs, setSourceDocs] = useState<File[]>([]);
  const [exampleTestFile, setExampleTestFile] = useState<File | null>(null);
  const [exampleTestText, setExampleTestText] = useState("");

  // Standard metadata
  const [subject, setSubject] = useState("math");
  const [courseName, setCourseName] = useState("");
  const [gradeBand, setGradeBand] = useState("9-12");
  const [studentLevel, setStudentLevel] = useState("Standard");
  const [assessmentType, setAssessmentType] = useState("Quiz");
  const [timeMinutes, setTimeMinutes] = useState(30);

  // Advanced options
  const [focusAreas, setFocusAreas] = useState("");
  const [emphasis, setEmphasis] = useState("Conceptual");
  const [difficultyProfile, setDifficultyProfile] = useState("Balanced");
  const [classroomContext, setClassroomContext] = useState("");
  const [notesForWriter, setNotesForWriter] = useState("");

  // UI controls
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Preview text
  const [previewText, setPreviewText] = useState("");

  // Generate preview text dynamically
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

  // Submit handler
  const handleSubmit = () => {
    const intent: AssessmentIntent = {
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
    <div className="space-y-10">

      {/* 1️⃣ Unified Source/Test Input Section */}
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">What are you starting with?</h2>

        <Tabs value={inputMode ?? ""} onValueChange={setInputMode}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="source-docs">Source Docs</TabsTrigger>
            <TabsTrigger value="example-test-file">Example Test (File)</TabsTrigger>
            <TabsTrigger value="example-test-text">Example Test (Paste)</TabsTrigger>
          </TabsList>

          {/* Source Docs */}
          <TabsContent value="source-docs" className="mt-4">
            <Input
              type="file"
              multiple
              onChange={(e) => setSourceDocs(Array.from(e.target.files ?? []))}
            />
            <p className="text-sm text-gray-500 mt-2">
              Upload textbook chapters, readings, slides, worksheets, etc.
            </p>
          </TabsContent>

          {/* Example Test (File) */}
          <TabsContent value="example-test-file" className="mt-4">
            <Input
              type="file"
              onChange={(e) => setExampleTestFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-gray-500 mt-2">
              We’ll analyze structure, difficulty, pacing, and question types.
            </p>
          </TabsContent>

          {/* Example Test (Paste) */}
          <TabsContent value="example-test-text" className="mt-4">
            <Textarea
              placeholder="Paste an existing test here..."
              value={exampleTestText}
              onChange={(e) => setExampleTestText(e.target.value)}
              className="min-h-[160px]"
            />
            <p className="text-sm text-gray-500 mt-2">
              If you don’t have a file, paste the test text here.
            </p>
          </TabsContent>
        </Tabs>
      </Card>

      {/* 2️⃣ Assessment Details */}
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Assessment Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Course Name</Label>
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Grade Band</Label>
            <Input value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Student Level</Label>
            <Input value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Assessment Type</Label>
            <Input value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} />
          </div>

          <div className="space-y-2">
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
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full flex justify-between">
            Advanced Options
            {showAdvanced ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-6 transition-all duration-300">
          <Card className="p-6 space-y-6">

            <div className="space-y-2">
              <Label>Focus Areas</Label>
              <Textarea
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="One per line"
              />
            </div>

            <div className="space-y-2">
              <Label>Classroom Context</Label>
              <Textarea
                value={classroomContext}
                onChange={(e) => setClassroomContext(e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes for the AI Writer</Label>
              <Textarea
                value={notesForWriter}
                onChange={(e) => setNotesForWriter(e.target.value)}
                placeholder="Anything else we should know?"
              />
            </div>

          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* 4️⃣ Before You Generate Preview */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Before You Generate</h2>
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {previewText}
        </p>
      </Card>

      {/* 5️⃣ Generate Button */}
      <Button
        className="w-full py-6 text-lg font-semibold"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate Assessment"}
      </Button>

    </div>
  );
}
