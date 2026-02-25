// src/components_new/Pipeline/ConversationalAssessment.tsx
import { useState } from "react";

type ConversationField =
  | "gradeLevels"
  | "course"
  | "unitName"
  | "lessonName"
  | "topic"
  | "studentLevel"
  | "assessmentType"
  | "time"
  | "additionalDetails";

type ConversationStep = {
  id: ConversationField;
  question: string;
  placeholder?: string;
  optional?: boolean;
};

const STEPS: ConversationStep[] = [
  {
    id: "gradeLevels",
    question: "What grade level or levels are you teaching?",
    placeholder: "e.g., 6 or 6,7",
  },
  {
    id: "course",
    question: "What course is this for?",
    placeholder: "e.g., Math 6",
  },
  {
    id: "unitName",
    question: "What unit are you working on?",
    placeholder: "e.g., Fractions and Decimals",
  },
  {
    id: "lessonName",
    question: "What lesson (if any) is this for?",
    placeholder: "e.g., Adding Fractions (optional)",
    optional: true,
  },
  {
    id: "topic",
    question: "What specific topic should the assessment focus on?",
    placeholder: "e.g., Adding unlike denominators",
  },
  {
    id: "studentLevel",
    question: "What level of problems should I generate — Remedial, Standard, Honors, or AP?",
    placeholder: "Choose: remedial, standard, honors, or AP",
  },
  {
    id: "assessmentType",
    question: "What type of assessment do you want?",
    placeholder: "quiz, exit ticket, worksheet, practice, etc.",
  },
  {
    id: "time",
    question: "How much time do students have (in minutes)?",
    placeholder: "e.g., 15",
  },
  {
    id: "additionalDetails",
    question: "Any additional details you want me to consider?",
    placeholder: "Optional notes, constraints, or goals",
    optional: true,
  },
];

export type ConversationalIntent = {
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName?: string;
  topic: string;
  studentLevel: string;
  assessmentType: string;
  time: number | null;
  additionalDetails?: string;
};

interface ConversationalAssessmentProps {
  onComplete: (intent: ConversationalIntent) => void;
  isLoading: boolean;
}

export function ConversationalAssessment({ onComplete, isLoading }: ConversationalAssessmentProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<ConversationField, string>>({
    gradeLevels: "",
    course: "",
    unitName: "",
    lessonName: "",
    topic: "",
    studentLevel: "",
    assessmentType: "",
    time: "",
    additionalDetails: "",
  });
  const [input, setInput] = useState("");

  const currentStep = STEPS[stepIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();

    if (!trimmed && !currentStep.optional) return;

    const nextAnswers = {
      ...answers,
      [currentStep.id]: trimmed,
    } as typeof answers;

    setAnswers(nextAnswers);
    setInput("");

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // Build final intent
    const intent: ConversationalIntent = {
      gradeLevels: nextAnswers.gradeLevels
        ? nextAnswers.gradeLevels.split(",").map((g) => g.trim())
        : [],
      course: nextAnswers.course,
      unitName: nextAnswers.unitName,
      lessonName: nextAnswers.lessonName || undefined,
      topic: nextAnswers.topic,
      studentLevel: nextAnswers.studentLevel,
      assessmentType: nextAnswers.assessmentType,
      time: nextAnswers.time ? Number(nextAnswers.time) : null,
      additionalDetails: nextAnswers.additionalDetails || undefined,
    };

    onComplete(intent);
  };

  const canGoBack = stepIndex > 0;

  const handleBack = () => {
    if (!canGoBack) return;
    const prevStep = STEPS[stepIndex - 1];
    setInput(answers[prevStep.id] || "");
    setStepIndex(stepIndex - 1);
  };

  return (
    <div className="conversation-shell">
      <div className="conversation-messages">
        {STEPS.slice(0, stepIndex + 1).map((step, idx) => (
          <div key={step.id} className="conversation-exchange">
            <div className="message system">
              {step.question}
            </div>
            {idx < stepIndex && answers[step.id] && (
              <div className="message user">
                {answers[step.id]}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="conversation-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={currentStep.placeholder}
          disabled={isLoading}
        />
        <button type="button" onClick={handleBack} disabled={!canGoBack || isLoading}>
          Back
        </button>
        <button type="submit" disabled={isLoading}>
          {stepIndex === STEPS.length - 1
            ? isLoading ? "Generating..." : "Finish"
            : "Next"}
        </button>
      </form>
    </div>
  );
}
