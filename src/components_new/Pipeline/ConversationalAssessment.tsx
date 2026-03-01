// src/components_new/Pipeline/ConversationalAssessment.tsx
import { useState, useRef, useEffect, useMemo } from "react";

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

const QUESTION_FORMAT_CHIPS = [
  { label: "Multiple Choice",    value: "mcqOnly"           },
  { label: "Short Answer",       value: "saOnly"            },
  { label: "Essay",              value: "essayOnly"         },
  { label: "Free Response",      value: "frqOnly"           },
  { label: "Fill in the Blank",  value: "fitbOnly"          },
  { label: "True / False",       value: "trueFalseOnly"     },
  { label: "Arithmetic Fluency", value: "arithmeticFluency" },
  { label: "Mixed Format",       value: "mixed"             },
];

const STANDARDS_CHIPS = [
  { label: "Common Core",     value: "commonCore"  },
  { label: "State Standards", value: "state"       },
  { label: "AP Framework",   value: "ap"          },
  { label: "No Preference",  value: "none"        },
];

// ── Step definitions ──────────────────────────────────────────────────────────

type StepId =
  | "gradeLevels"
  | "course"
  | "topic"
  | "assessmentType"
  | "questionFormat"
  | "bloomPreference"
  | "multiPartQuestions"
  | "sectionStructure"
  | "standards"
  | "stateCode"
  | "studentLevel"
  | "time"
  | "additionalDetails";

interface Step {
  id: StepId;
  question: string;
  placeholder?: string;
  optional?: boolean;
  /** When true, multiple chips can be toggled before confirming. */
  multiSelect?: boolean;
  chips?: Array<{ label: string; value: string }>;
}

// ── Base steps (always shown, in order) ───────────────────────────────────────

const BASE_STEPS_BEFORE: Step[] = [
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
];

const BASE_STEPS_AFTER: Step[] = [
  {
    id: "studentLevel",
    question: "What level is your class?",
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

// ── Adaptive steps injected after assessmentType ──────────────────────────────

/** Types that are "structured" — tests, quizzes, worksheets get extra questions */
const STRUCTURED_TYPES = new Set(["test", "quiz", "worksheet", "testReview", "bellRinger", "exitTicket"]);

function getAdaptiveSteps(assessmentType: string, standards?: string): Step[] {
  if (!STRUCTURED_TYPES.has(assessmentType)) return [];

  const steps: Step[] = [
    {
      id: "questionFormat",
      question: "What question formats should this include? (Pick one or more)",
      chips: QUESTION_FORMAT_CHIPS,
      multiSelect: true,
    },
  ];

  // Multi-part questions for longer structured assessments
  if (["test", "quiz", "worksheet", "testReview"].includes(assessmentType)) {
    steps.push({
      id: "multiPartQuestions",
      question: "Include multi-part questions? (Parts build progressively — need A to solve B, need B to solve C)",
      chips: [
        { label: "Yes — include multi-part", value: "yes" },
        { label: "No — all standalone",       value: "no"  },
      ],
    });
  }

  // Tests and quizzes get standards alignment
  if (assessmentType === "test" || assessmentType === "quiz") {
    steps.push({
      id: "standards",
      question: "Any standards alignment preference?",
      chips: STANDARDS_CHIPS,
    });

    // If teacher chose state standards, ask which state
    if (standards === "state") {
      steps.push({
        id: "stateCode",
        question: "Which state's standards? (e.g. GA, TX, CA)",
        placeholder: "e.g. GA",
      });
    }
  }

  return steps;
}

// ── Public types ──────────────────────────────────────────────────────────────

export type { StepId };

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

  // ── Adaptive fields (populated for structured assessment types) ────────
  /** "mcqOnly" | "saOnly" | "mixed" | "auto" */
  questionFormat?: string;
  /** "lower" | "apply" | "higher" | "balanced" */
  bloomPreference?: string;
  /** "yes" | "no" */
  multiPartQuestions?: string;
  sectionStructure?: string;
  /** "commonCore" | "state" | "ap" | "none" */
  standards?: string;
  /** State abbreviation when standards === "state", e.g. "GA" */
  stateCode?: string;
};

const DEFAULT_ANSWERS: Record<StepId, string> = {
  gradeLevels:         "",
  course:              "",
  topic:               "",
  assessmentType:      "",
  questionFormat:      "",
  bloomPreference:     "",
  multiPartQuestions:  "",
  sectionStructure:    "",
  standards:           "",
  stateCode:           "",
  studentLevel:        "",
  time:                "",
  additionalDetails:   "",
};

interface ConversationalAssessmentProps {
  onComplete: (intent: ConversationalIntent) => void;
  isLoading: boolean;
  /** When true, all inputs and submit are disabled (e.g. daily limit reached). */
  disabled?: boolean;
  /**
   * Pre-populate answers from a previous session (e.g. after "Edit Inputs").
   * The component will start at the last answered step so the teacher can
   * navigate back to any specific field using the ← Back button.
   */
  initialAnswers?: Partial<Record<StepId, string>>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationalAssessment({
  onComplete,
  isLoading,
  disabled = false,
  initialAnswers,
}: ConversationalAssessmentProps) {
  const isBlocked = isLoading || disabled;

  const [answers, setAnswers] = useState<Record<StepId, string>>(() => ({
    ...DEFAULT_ANSWERS,
    ...(initialAnswers ?? {}),
  }));

  // When restoring from a previous session (Edit Inputs), start at the last
  // answered step so the teacher can review everything and step back to fix.
  const [stepIndex, setStepIndex] = useState(() => {
    if (!initialAnswers) return 0;
    const aType = initialAnswers.assessmentType ?? "";
    const adaptive = aType ? getAdaptiveSteps(aType, initialAnswers.standards) : [];
    const allSteps = [...BASE_STEPS_BEFORE, ...adaptive, ...BASE_STEPS_AFTER];
    return Math.max(0, allSteps.length - 1);
  });

  const [inputValue, setInputValue] = useState(() =>
    initialAnswers?.additionalDetails ?? ""
  );

  // Buffer for multi-select chip steps — cleared whenever the step changes.
  const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Compute the dynamic step list based on assessmentType answer ────────
  const steps: Step[] = useMemo(() => {
    const adaptiveSteps = answers.assessmentType
      ? getAdaptiveSteps(answers.assessmentType, answers.standards)
      : [];
    return [...BASE_STEPS_BEFORE, ...adaptiveSteps, ...BASE_STEPS_AFTER];
  }, [answers.assessmentType, answers.standards]);

  const currentStep = steps[stepIndex];
  const isChipStep  = Boolean(currentStep?.chips?.length);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!isChipStep) setTimeout(() => inputRef.current?.focus(), 50);
  }, [stepIndex, isChipStep]);

  // Reset multi-select buffer whenever the step changes.
  useEffect(() => { setMultiSelectBuffer([]); }, [stepIndex]);

  // ── Commit an answer and advance ─────────────────────────────────────────

  function commitAnswer(value: string) {
    const trimmed = value.trim();
    if (!currentStep) return;
    if (!trimmed && !currentStep.optional) return;

    const next: Record<StepId, string> = { ...answers, [currentStep.id]: trimmed };
    setAnswers(next);
    setInputValue("");

    // After assessmentType is answered, the steps list will recompute.
    // We need to compute the new step list to know the correct next index.
    const newAdaptive = next.assessmentType
      ? getAdaptiveSteps(next.assessmentType, next.standards)
      : [];
    const newSteps = [...BASE_STEPS_BEFORE, ...newAdaptive, ...BASE_STEPS_AFTER];

    if (stepIndex < newSteps.length - 1) {
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

      // Adaptive fields — only present for structured types
      questionFormat:       next.questionFormat || undefined,
      bloomPreference:      next.bloomPreference || undefined,
      multiPartQuestions:   next.multiPartQuestions || undefined,
      sectionStructure:     next.sectionStructure || undefined,
      standards:            next.standards || undefined,
      stateCode:            next.stateCode || undefined,
    };
    onComplete(intent);
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitAnswer(inputValue);
  };

  const handleChipClick = (value: string) => {
    if (currentStep?.multiSelect) {
      // Toggle the chip in/out of the selection buffer.
      setMultiSelectBuffer(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      commitAnswer(value);
    }
  };

  const handleMultiSelectConfirm = () => {
    if (multiSelectBuffer.length > 0) {
      commitAnswer(multiSelectBuffer.join(","));
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    const prevStep = steps[stepIndex - 1];
    setInputValue(answers[prevStep.id] || "");
    setStepIndex(stepIndex - 1);
  };

  const progressPct = Math.round((stepIndex / steps.length) * 100);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ca-shell">

      {/* Header */}
      <div className="ca-header">
        <span className="ca-title">Build an Assessment</span>
        <div className="ca-progress-track">
          <div className="ca-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="ca-step-label">{stepIndex + 1} / {steps.length}</span>
      </div>

      {/* Message thread */}
      <div className="ca-messages">
        {steps.slice(0, stepIndex + 1).map((step, idx) => (
          <div key={step.id} className="ca-exchange">

            {/* Bot bubble */}
            <div className="ca-bubble ca-bubble--bot">
              {step.question}
            </div>

            {/* Previous user answer */}
            {idx < stepIndex && answers[step.id] && (
              <div className="ca-bubble ca-bubble--user">
                {step.chips && step.multiSelect
                  ? answers[step.id].split(",").map(v => step.chips!.find(c => c.value === v)?.label ?? v).join(", ")
                  : step.chips
                    ? (step.chips.find(c => c.value === answers[step.id])?.label ?? answers[step.id])
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
                    className={`ca-chip${
                      step.multiSelect && multiSelectBuffer.includes(chip.value)
                        ? " ca-chip--selected"
                        : ""
                    }`}
                    onClick={() => handleChipClick(chip.value)}
                    disabled={isBlocked}
                  >
                    {chip.label}
                  </button>
                ))}
                {step.multiSelect && multiSelectBuffer.length > 0 && (
                  <button
                    type="button"
                    className="ca-chip ca-chip--confirm"
                    onClick={handleMultiSelectConfirm}
                    disabled={isBlocked}
                  >
                    ✓ Confirm ({multiSelectBuffer.length} selected)
                  </button>
                )}
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
            placeholder={currentStep?.placeholder ?? ""}
            disabled={isBlocked}
            autoComplete="off"
          />
          <button type="submit" className="ca-btn-send" disabled={isBlocked}>
            {stepIndex === steps.length - 1 ? "Generate" : "→"}
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
