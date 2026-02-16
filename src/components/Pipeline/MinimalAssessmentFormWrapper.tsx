/**
 * MinimalAssessmentFormWrapper.tsx
 * 
 * Wraps MinimalAssessmentForm and integrates with useUserFlow pipeline
 */
import { runUnifiedAssessment } from "./orchestrator/assessmentOrchestratorService";
import {
  AssessmentIntent,
  UnifiedAssessmentRequest,
  UnifiedAssessmentResponse
} from "./contracts/assessmentContracts";

import { useState } from 'react';
import { MinimalAssessmentForm } from './MinimalAssessmentForm';

import { useUserFlow } from '../../hooks/useUserFlow';
import { summarizeAssessmentIntent } from '../../services/assessmentSummarizerService';

export default function MinimalAssessmentFormWrapper() {
  const {
    setGoal,
    setHasSourceDocs,
    setSourceFile,
    setIntentData,
    setGeneratedAssignment,
  } = useUserFlow();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (uiIntent: any) => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log('📋 MinimalAssessmentForm submitted (UI intent):', uiIntent);

      // 🔥 Convert UI intent → pipeline AssessmentIntent
      const intent: AssessmentIntent = {
  course: uiIntent.courseName ?? "",
  unit: uiIntent.unitName ?? "",
  studentLevel: uiIntent.studentLevel ?? "Standard",
  assignmentType:
    uiIntent.assessmentType === "Other" && uiIntent.customAssessmentType
      ? uiIntent.customAssessmentType
      : uiIntent.assessmentType,
  time: String(uiIntent.timeMinutes ?? "30"),
  uploads: [
    ...(uiIntent.sourceDocs as File[] ?? []).map((file: File) => ({
  name: file.name,
  size: file.size,
  type: file.type
})),

...(uiIntent.exampleTestFiles as File[] ?? []).map((file: File) => ({
  name: file.name,
  size: file.size,
  type: file.type
})),

...(uiIntent.exampleTestTexts as string[] ?? []).map((text: string, i: number) => ({
  name: `example_text_${i + 1}.txt`,
  size: text.length,
  type: "text/plain"
}))

  ],
  additionalDetails: uiIntent.advancedDetails ?? ""
};


      console.log("🧩 Pipeline intent:", intent);

      // Update pipeline state
      setGoal('create');
      setHasSourceDocs(!!uiIntent.sourceFile);

      if (uiIntent.sourceFile) {
        setSourceFile(uiIntent.sourceFile);
      }

      // For topic-based flow
      if (uiIntent.sourceTopic) {
        setIntentData({
          topic: uiIntent.sourceTopic,
          gradeLevel: mapStudentLevelToGrade(uiIntent.studentLevel),
          assignmentType: uiIntent.assessmentType,
          bloomTargets: [],
        });
      }

      // Generate assignment
      console.log('🤖 Calling summarizeAssessmentIntent...');
      const summarized = await summarizeAssessmentIntent(intent);
      console.log('🧩 Summarized intent:', summarized);

// Build the UnifiedAssessmentRequest
const req: UnifiedAssessmentRequest = {
  intent,
  studentSliders: {
    reading: 5,
    reasoning: 5,
    fluency: 5,
    stamina: 5,
    confusionTolerance: 5,
    overlays: []
  }
};

console.log('🚀 Calling runUnifiedAssessment...');
const assignment: UnifiedAssessmentResponse = await runUnifiedAssessment(req);
setGeneratedAssignment(assignment);


    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate assessment';
      setError(msg);
      console.error('❌ Error:', err);
    } finally {
      setIsGenerating(false);
    }
  }; // ← THIS WAS MISALIGNED BEFORE

  if (error) {
    return (
      <div className="wrapper-container error-state">
        <div className="error-box">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={() => setError(null)}>← Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper-container">
      <MinimalAssessmentForm onSubmit={handleFormSubmit} isLoading={isGenerating} />
    </div>
  );
}

function mapStudentLevelToGrade(level: string): string {
  const map: Record<string, string> = {
    Remedial: '6-8',
    Standard: '9-10',
    Honors: '11-12',
    AP: 'Higher Education',
  };
  return map[level] || '9-10';
}
