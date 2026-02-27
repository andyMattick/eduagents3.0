// src/components_new/Pipeline/ConversationalAssessment.tsx
import { useState, useRef, useEffect } from "react";

// ── Chip option data ──────────────────────────────────────────────────────────

const ASSESSMENT_CHIPS = [
  { label: "Bell Ringer",  value: "bellRinger"  },
  { label: "Exit Ticket",  value: "exitTicket"  },
  { label: "Quiz",         value: "quiz"        },
  { label: "Test",         value: "test"        },
  { label: "Worksheet",    value: "worksheet"   },
  { label: "Test Review",  value: "testReview"  },
];

const LEVEL_CHIPS = [
  { label: "Remedial",      value: "remedial"  },
  { label: "Standard",      value: "standard"  },
  { label: "Honors",        value: "honors"    },
  { label: "AP / Advanced", value: "AP"        },
];

// ── Step definitions ──────────────────────────────────────────────────────────

type StepId =
  | "gradeLevels"
  | "course"
  | "topic"
  | "assessmentType"
  | "studentLevel"
  | "time"
  | "additionalDetails";

interface Step {
  id: StepId;
  question: string;
  placeholder?: string;
  optional?: boolean;
  chips?: Array<{ label: string; value: string }>;
}

const STEPS: Step[] = [
  {
    id: "gradeLevels",
    question: "What grade level(s) are you teaching?",
    placeholder: "e.g., 7  —  or  9, 10  for multiple grades",
  },
  {
    id: "course",
    question: "What subject or course?",
    placeholder: "e.g., 7th Grade English",
  },
  {
    id: "topic",
    question: "What specific topic or lesson should the assessment cover?",
    placeholder: "e.g., The French Revolution — causes and effects",
  },
  {
    id: "assessmentType",
    question: "What type of assessment?",
    chips: ASSESSMENT_CHIPS,
  },
  {
    id: "studentLevel",
    question: "What level are your students?",
    chips: LEVEL_CHIPS,
  },
  {
    id: "time",
    question: "How many minutes do students have?",
    placeholder: "e.g., 20",
  },
  {
    id: "additionalDetails",
    question: "Any specific instructions? (optional)",
    placeholder: "e.g., Include vocabulary items, focus on application not recall",
    optional: true,
  },
];

// ── Public types ──────────────────────────────────────────────────────────────

export type ConversationalIntent = {
  gradeLevels: string[];
  course: string;
  /** Populated from the topic step — used as both unitName and topic downstream. */
  unitName: string;
  topic: string;
  lessonName?: string;
  studentLevel: string;
  assessmentType: string;
  time: number | null;
  additionalDetails?: string;
};

interface ConversationalAssessmentProps {
  onComplete: (intent: ConversationalIntent) => void;
  isLoading: boolean;
  /** When true, all inputs and submit are disabled (e.g. daily limit reached). */
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationalAssessment({
  onComplete,
  isLoading,
  disabled = false,
}: ConversationalAssessmentProps) {
  const isBlocked = isLoading || disabled;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<StepId, string>>({
    gradeLevels:       "",
    course:            "",
    topic:             "",
    assessmentType:    "",
    studentLevel:      "",
    time:              "",
    additionalDetails: "",
  });
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[stepIndex];
  const isChipStep  = Boolean(currentStep.chips?.length);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!isChipStep) setTimeout(() => inputRef.current?.focus(), 50);
  }, [stepIndex, isChipStep]);

  // ── Commit an answer and advance ─────────────────────────────────────────

  function commitAnswer(value: string) {
    const trimmed = value.trim();
    if (!trimmed && !currentStep.optional) return;

    const next: Record<StepId, string> = { ...answers, [currentStep.id]: trimmed };
    setAnswers(next);
    setInputValue("");

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // Last step — build final intent
    const topicAnswer = next.topic;
    const intent: ConversationalIntent = {
      gradeLevels:      next.gradeLevels
                          .split(",")
                          .map(g => g.trim())
                          .filter(Boolean),
      course:           next.course,
      unitName:         topicAnswer,
      topic:            topicAnswer,
      studentLevel:     next.studentLevel,
      assessmentType:   next.assessmentType,
      time:             next.time ? Number(next.time) : null,
      additionalDetails: next.additionalDetails || undefined,
    };
    onComplete(intent);
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitAnswer(inputValue);
  };

  const handleChipClick = (value: string) => commitAnswer(value);

  const handleBack = () => {
    if (stepIndex === 0) return;
    const prevStep = STEPS[stepIndex - 1];
    setInputValue(answers[prevStep.id] || "");
    setStepIndex(stepIndex - 1);
  };

  const progressPct = Math.round((stepIndex / STEPS.length) * 100);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ca-shell">

      {/* Header */}
      <div className="ca-header">
        <span className="ca-title">Build an Assessment</span>
        <div className="ca-progress-track">
          <div className="ca-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="ca-step-label">{stepIndex + 1} / {STEPS.length}</span>
      </div>

      {/* Message thread */}
      <div className="ca-messages">
        {STEPS.slice(0, stepIndex + 1).map((step, idx) => (
          <div key={step.id} className="ca-exchange">

            {/* Bot bubble */}
            <div className="ca-bubble ca-bubble--bot">
              {step.question}
            </div>

            {/* Previous user answer */}
            {idx < stepIndex && answers[step.id] && (
              <div className="ca-bubble ca-bubble--user">
                {step.chips
                  ? (step.chips.find(c => c.value === answers[step.id])?.label
                     ?? answers[step.id])
                  : answers[step.id]}
              </div>
            )}

            {/* Chip row for current chip-step */}
            {idx === stepIndex && step.chips && (
              <div className="ca-chips">
                {step.chips.map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    className="ca-chip"
                    onClick={() => handleChipClick(chip.value)}
                    disabled={isBlocked}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="ca-bubble ca-bubble--bot ca-bubble--thinking">
            <span className="ca-dots">
              <span /><span /><span />
            </span>
            Generating your assessment…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Text input bar */}
      {!isChipStep && !isBlocked && (
        <form onSubmit={handleTextSubmit} className="ca-input-row">
          {stepIndex > 0 && (
            <button
              type="button"
              className="ca-btn-back"
              onClick={handleBack}
              disabled={isBlocked}
              title="Go back"
            >
              ←
            </button>
          )}
          <input
            ref={inputRef}
            className="ca-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={currentStep.placeholder ?? ""}
            disabled={isBlocked}
            autoComplete="off"
          />
          <button type="submit" className="ca-btn-send" disabled={isBlocked}>
            {stepIndex === STEPS.length - 1 ? "Generate" : "→"}
          </button>
        </form>
      )}

      {/* Back button visible during chip steps (after step 0) */}
      {isChipStep && !isBlocked && stepIndex > 0 && (
        <div className="ca-chip-footer">
          <button type="button" className="ca-btn-back" onClick={handleBack}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
