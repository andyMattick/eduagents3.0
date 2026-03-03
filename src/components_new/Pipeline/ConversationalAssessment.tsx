// src/components_new/Pipeline/ConversationalAssessment.tsx
//
// Defaults-first CREATE mode.
// When a teacher profile is present, we show resolved course defaults and
// only ask for overrides.  When absent, we fall back to the full manual flow.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { TeacherProfile } from "@/types/teacherProfile";
import type { ResolvedCourseDefaults } from "@/types/teacherProfile";
import { resolveCourseDefaults } from "@/services_new/teacherProfileService";

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
  { label: "Multiple Choice",        value: "mcqOnly"           },
  { label: "Short Answer",           value: "saOnly"            },
  { label: "Essay",                  value: "essayOnly"         },
  { label: "Free Response",          value: "frqOnly"           },
  { label: "Fill in the Blank",      value: "fitbOnly"          },
  { label: "True / False",           value: "trueFalseOnly"     },
  { label: "Arithmetic Fluency",     value: "arithmeticFluency" },
  { label: "Passage-Based Reading",  value: "passageBased"      },
  { label: "Mixed Format",           value: "mixed"             },
];

const STANDARDS_CHIPS = [
  { label: "Common Core",     value: "commonCore"  },
  { label: "State Standards", value: "state"       },
  { label: "AP Framework",   value: "ap"          },
  { label: "No Preference",  value: "none"        },
];

const MULTI_PART_CHIPS = [
  { label: "Yes \u2014 include multi-part", value: "yes" },
  { label: "No \u2014 all standalone",       value: "no"  },
];

const OVERRIDE_FIELD_CHIPS = [
  { label: "Assessment type",  value: "assessmentType"     },
  { label: "Question formats", value: "questionFormat"     },
  { label: "Multi-part",       value: "multiPartQuestions" },
  { label: "Standards",        value: "standards"          },
  { label: "Difficulty level", value: "studentLevel"       },
];

// ── Step definitions ──────────────────────────────────────────────────────────

type StepKind = "text" | "chips" | "fileUpload" | "defaultsCard" | "summarizerConfirm" | "finalConfirm";

type StepId =
  | "gradeLevels"
  | "course"
  | "topic"
  | "subtopics"
  | "defaultsCard"
  | "overrideField"
  | "assessmentType"
  | "questionFormat"
  | "arithmeticOperation"
  | "arithmeticRange"
  | "passageSource"
  | "passageText"
  | "multiPartQuestions"
  | "standards"
  | "stateCode"
  | "studentLevel"
  | "additionalDetails"
  | "sourceDocuments"
  | "summarizerConfirm"
  | "finalConfirm";

interface Step {
  id: StepId;
  kind: StepKind;
  question: string;
  placeholder?: string;
  optional?: boolean;
  multiSelect?: boolean;
  chips?: Array<{ label: string; value: string }>;
}

// ── buildSteps ────────────────────────────────────────────────────────────────
//
// Single function that returns the ordered step list based on mode + answers.

function buildSteps(
  hasProfile: boolean,
  answers: Record<StepId, string>,
  hasDocs: boolean,
): Step[] {
  const steps: Step[] = [];

  if (hasProfile) {
    // ── Profile-driven flow ──────────────────────────────────────────────
    steps.push({ id: "course", kind: "text", question: "What course is this for?", placeholder: "e.g., AP Statistics" });
    steps.push({ id: "topic",  kind: "text", question: "What topic or lesson should the assessment cover?", placeholder: "e.g., Chi-square tests" });
    steps.push({ id: "subtopics", kind: "text", question: "Any subtopics to focus on? (optional)", placeholder: "e.g., goodness-of-fit, independence", optional: true });

    if (answers.course) {
      steps.push({ id: "defaultsCard", kind: "defaultsCard", question: "Here are your saved defaults for this course." });

      if (answers.defaultsCard === "change") {
        steps.push({ id: "overrideField", kind: "chips", question: "Which settings would you like to change?", chips: OVERRIDE_FIELD_CHIPS, multiSelect: true });

        const selected = answers.overrideField ? answers.overrideField.split(",").map(s => s.trim()) : [];
        if (selected.includes("assessmentType"))     steps.push({ id: "assessmentType",     kind: "chips", question: "What type of assessment?", chips: ASSESSMENT_CHIPS });
        if (selected.includes("questionFormat"))      steps.push({ id: "questionFormat",      kind: "chips", question: "What question formats?", chips: QUESTION_FORMAT_CHIPS, multiSelect: true });
        if (selected.includes("multiPartQuestions"))   steps.push({ id: "multiPartQuestions",   kind: "chips", question: "Include multi-part questions?", chips: MULTI_PART_CHIPS });
        if (selected.includes("standards"))            steps.push({ id: "standards",            kind: "chips", question: "Standards alignment?", chips: STANDARDS_CHIPS });
        if (selected.includes("studentLevel"))         steps.push({ id: "studentLevel",         kind: "chips", question: "Difficulty level?", chips: LEVEL_CHIPS });

        // Conditional sub-steps
        if (answers.standards === "state") {
          steps.push({ id: "stateCode", kind: "text", question: "Which state\u2019s standards? (e.g. GA, TX, CA)", placeholder: "e.g. GA" });
        }
      }
    }
  } else {
    // ── Manual flow (no profile) ─────────────────────────────────────────
    steps.push({ id: "course",      kind: "text",  question: "What subject or course?", placeholder: "e.g., 7th Grade English" });
    steps.push({ id: "gradeLevels", kind: "text",  question: "What grade level(s)?", placeholder: "e.g., 7  or  9, 10" });
    steps.push({ id: "topic",       kind: "text",  question: "What topic or lesson should this cover?", placeholder: "e.g., The French Revolution" });
    steps.push({ id: "subtopics",   kind: "text",  question: "Any subtopics to focus on? (optional)", placeholder: "e.g., causes, effects, timeline", optional: true });
    steps.push({ id: "assessmentType", kind: "chips", question: "What type of assessment?", chips: ASSESSMENT_CHIPS });

    // Adaptive format steps for structured types
    const STRUCTURED = new Set(["test", "quiz", "worksheet", "testReview", "bellRinger", "exitTicket"]);
    if (STRUCTURED.has(answers.assessmentType)) {
      steps.push({ id: "questionFormat", kind: "chips", question: "What question formats should this include?", chips: QUESTION_FORMAT_CHIPS, multiSelect: true });

      // Arithmetic fluency sub-steps
      const fmts = answers.questionFormat ? answers.questionFormat.split(",").map(s => s.trim()) : [];
      if (fmts.includes("arithmeticFluency")) {
        steps.push({ id: "arithmeticOperation", kind: "chips", question: "Which operation?", chips: [
          { label: "Addition (+)",       value: "add"      },
          { label: "Subtraction (\u2212)",    value: "subtract" },
          { label: "Multiplication (\u00d7)", value: "multiply" },
          { label: "Division (\u00f7)",       value: "divide"   },
        ]});
        steps.push({ id: "arithmeticRange", kind: "text", question: "Number range for operands? (default: 1\u201310)", placeholder: "e.g. 1\u201310 or 2\u201312", optional: true });
      }
      // Passage-based sub-steps
      if (fmts.includes("passageBased")) {
        steps.push({ id: "passageSource", kind: "chips", question: "Should AI write the passage, or will you provide one?", chips: [
          { label: "AI writes the passage",    value: "ai"      },
          { label: "I\u2019ll provide the passage", value: "teacher" },
        ]});
        if (answers.passageSource === "teacher") {
          steps.push({ id: "passageText", kind: "text", question: "Paste or type your passage below.", placeholder: "Paste passage here\u2026" });
        }
      }

      // Multi-part
      if (["test", "quiz", "worksheet", "testReview"].includes(answers.assessmentType)) {
        steps.push({ id: "multiPartQuestions", kind: "chips", question: "Include multi-part questions?", chips: MULTI_PART_CHIPS });
      }

      // Standards
      if (answers.assessmentType === "test" || answers.assessmentType === "quiz") {
        steps.push({ id: "standards", kind: "chips", question: "Standards alignment?", chips: STANDARDS_CHIPS });
        if (answers.standards === "state") {
          steps.push({ id: "stateCode", kind: "text", question: "Which state\u2019s standards?", placeholder: "e.g. GA" });
        }
      }
    }

    steps.push({ id: "studentLevel", kind: "chips", question: "What level is your class?", chips: LEVEL_CHIPS });
  }

  // ── Common tail (both flows) ──────────────────────────────────────────────
  steps.push({ id: "additionalDetails", kind: "text", question: "Any specific instructions? (optional)", placeholder: "e.g., Include vocabulary, focus on application", optional: true });
  steps.push({ id: "sourceDocuments", kind: "fileUpload", question: "Upload source documents? (optional \u2014 skip to continue)", optional: true });
  if (hasDocs) {
    steps.push({ id: "summarizerConfirm", kind: "summarizerConfirm", question: "I\u2019ve reviewed your documents." });
  }
  steps.push({ id: "finalConfirm", kind: "finalConfirm", question: "Review & generate" });

  return steps;
}

// ── Document inference heuristic ──────────────────────────────────────────────

function inferFromDocuments(
  docs: Array<{ id: string; name: string; content: string }>,
): { inferred: Partial<Record<StepId, string>>; found: string[] } {
  const inferred: Partial<Record<StepId, string>> = {};
  const found: string[] = [];

  const raw = docs.map(d => d.content).join("\n").substring(0, 4000);

  // Grade level
  const gradeMatch = raw.match(/\b(?:grade|gr\.?)\s*(\d{1,2})\b/i);
  if (gradeMatch) { inferred.gradeLevels = gradeMatch[1]; found.push(`Grade ${gradeMatch[1]}`); }

  // Subject
  const subjects = ["Math", "English", "Science", "History", "Social Studies", "Biology", "Chemistry", "Physics", "Algebra", "Geometry", "Calculus"];
  for (const subj of subjects) {
    if (new RegExp(`\\b${subj}\\b`, "i").test(raw)) { inferred.course = subj; found.push(subj); break; }
  }

  // Assessment type
  const typeMap: Record<string, string> = { quiz: "quiz", test: "test", worksheet: "worksheet", "exit ticket": "exitTicket", "bell ringer": "bellRinger" };
  for (const [keyword, value] of Object.entries(typeMap)) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(raw)) { inferred.assessmentType = value; found.push(keyword); break; }
  }

  // Topic — first non-empty line
  const firstLine = raw.split("\n").map(l => l.trim()).filter(l => l.length > 3 && l.length < 90)[0] ?? "";
  if (firstLine) { inferred.topic = firstLine; found.push(`"${firstLine}"`); }

  // Student level
  if (/\b(advanced\s*placement|\bAP\b)/i.test(raw))  { inferred.studentLevel = "AP";       found.push("AP level"); }
  else if (/\bhonors\b/i.test(raw))                    { inferred.studentLevel = "Honors";   found.push("Honors level"); }
  else if (/\bremedial\b/i.test(raw))                  { inferred.studentLevel = "Remedial"; found.push("Remedial level"); }

  return { inferred, found };
}

// ── DefaultsCard ─────────────────────────────────────────────────────────────

function DefaultsCard({
  defaults, courseName, onUse, onChange, disabled,
}: {
  defaults: ResolvedCourseDefaults; courseName: string;
  onUse: () => void; onChange: () => void; disabled: boolean;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Assessment type",  value: defaults.assessmentTypes[0] ?? "\u2014" },
    { label: "Question formats", value: defaults.questionTypes.slice(0, 3).join(", ") || "\u2014" },
    { label: "Multi-part",       value: defaults.multiPartAllowed ? "Allowed" : "Standalone only" },
    { label: "Grade level",      value: defaults.gradeBand ?? "\u2014" },
    ...(defaults.standards ? [{ label: "Standards", value: defaults.standards }] : []),
    { label: "Difficulty",       value: defaults.typicalDifficulty },
    ...(defaults.typicalBloomRange ? [{ label: "Typical rigor", value: defaults.typicalBloomRange }] : []),
    { label: "Est. questions",   value: `${defaults.estimatedQuestionRange.min}\u2013${defaults.estimatedQuestionRange.max}` },
    { label: "Est. time",        value: `~${defaults.estimatedMinutes} min` },
  ];
  return (
    <div className="ca-defaults-card">
      <div className="ca-defaults-card__header">
        <span className="ca-defaults-card__title">Your defaults for <strong>{courseName || "this course"}</strong></span>
        {defaults.level === "global" && <span className="ca-defaults-card__badge">global defaults</span>}
      </div>
      <table className="ca-defaults-table"><tbody>
        {rows.map((r) => <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>)}
      </tbody></table>
      <div className="ca-defaults-card__actions">
        <button className="ca-btn-primary" onClick={onUse}    disabled={disabled}>Use these defaults &rarr;</button>
        <button className="ca-btn-ghost"   onClick={onChange} disabled={disabled}>Change something</button>
      </div>
    </div>
  );
}

// ── SummarizerConfirmCard ────────────────────────────────────────────────────

function SummarizerConfirmCard({
  message, inferred, onConfirm, disabled,
}: {
  message: string; inferred: Partial<Record<StepId, string>>;
  onConfirm: () => void; disabled: boolean;
}) {
  const keyLabels: Record<string, string> = {
    gradeLevels: "Grade", course: "Subject", assessmentType: "Assessment type",
    topic: "Topic", studentLevel: "Level",
  };
  const rows = Object.entries(inferred)
    .filter(([k]) => k in keyLabels)
    .map(([k, v]) => ({ label: keyLabels[k], value: v as string }));
  return (
    <div className="ca-summarizer-card">
      <p className="ca-summarizer-card__headline">{message}</p>
      {rows.length > 0 && (
        <table className="ca-defaults-table" style={{ marginBottom: "0.75rem" }}><tbody>
          {rows.map((r) => <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>)}
        </tbody></table>
      )}
      <div className="ca-defaults-card__actions">
        <button className="ca-btn-primary" onClick={onConfirm} disabled={disabled}>&check; Looks good &mdash; continue</button>
      </div>
    </div>
  );
}

// ── FinalConfirmCard ─────────────────────────────────────────────────────────

interface Override { field: string; from: string; to: string }

function FinalConfirmCard({
  answers, courseDefaults, overrides, estimatedMinutes, docsCount,
  onGenerate, onBack, onUpdateDefaults, defaultsUpdateApplied, disabled,
}: {
  answers: Record<StepId, string>; courseDefaults: ResolvedCourseDefaults | null;
  overrides: Override[]; estimatedMinutes: number; docsCount: number;
  onGenerate: () => void; onBack: () => void;
  onUpdateDefaults?: () => void; defaultsUpdateApplied: boolean; disabled: boolean;
}) {
  const effectiveType  = answers.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz";
  const effectiveFmt   = answers.questionFormat  || courseDefaults?.questionTypes.slice(0,2).join(", ") || "mixed";
  const effectiveLevel = answers.studentLevel    || courseDefaults?.typicalDifficulty || "standard";
  const effectiveStds  = answers.standards       || courseDefaults?.standards         || "none";
  const effectiveMult  = answers.multiPartQuestions === "yes" ? "Allowed"
    : answers.multiPartQuestions === "no" ? "Standalone"
    : courseDefaults?.multiPartAllowed ? "Allowed" : "Standalone";
  const gradeBand = courseDefaults?.gradeBand || answers.gradeLevels || "\u2014";
  const rows = [
    { label: "Course",           value: answers.course    || "\u2014" },
    { label: "Grade",            value: gradeBand               },
    { label: "Topic",            value: answers.topic     || "\u2014" },
    ...(answers.subtopics ? [{ label: "Subtopics", value: answers.subtopics }] : []),
    { label: "Assessment type",  value: effectiveType          },
    { label: "Question formats", value: effectiveFmt           },
    { label: "Multi-part",       value: effectiveMult          },
    { label: "Standards",        value: effectiveStds          },
    { label: "Level",            value: effectiveLevel         },
    { label: "Est. time",        value: `~${estimatedMinutes} min` },
    ...(docsCount > 0 ? [{ label: "Source docs", value: `${docsCount} file${docsCount !== 1 ? "s" : ""}` }] : []),
  ];
  return (
    <div className="ca-final-card">
      <p className="ca-final-card__headline">Here&rsquo;s what I&rsquo;ll use to build your assessment.</p>
      <table className="ca-defaults-table"><tbody>
        {rows.map((r) => <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>)}
      </tbody></table>
      {overrides.length > 0 && onUpdateDefaults && !defaultsUpdateApplied && (
        <div className="ca-override-notice">
          <span>You changed{" "}
            {overrides.map((o, i) => <span key={o.field}>{i > 0 && ", "}<strong>{o.field}</strong></span>)}.{" "}
            Save as defaults for <strong>{answers.course}</strong>?
          </span>
          <div className="ca-override-notice__actions">
            <button className="ca-btn-ghost ca-btn-ghost--sm" onClick={onUpdateDefaults} disabled={disabled}>Update defaults</button>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary,#6b7280)" }}>or use this once</span>
          </div>
        </div>
      )}
      {defaultsUpdateApplied && (
        <p style={{ fontSize: "0.8rem", color: "var(--adp-success-fg,#16a34a)", margin: "0.5rem 0" }}>
          &check; Defaults updated for {answers.course}.
        </p>
      )}
      <div className="ca-final-card__actions">
        <button className="ca-btn-primary" onClick={onGenerate} disabled={disabled}>&#x1F680; Generate assessment</button>
        <button className="ca-btn-ghost"   onClick={onBack}     disabled={disabled}>&larr; Go back</button>
      </div>
    </div>
  );
}

// ── Public types ──────────────────────────────────────────────────────────────

export type { StepId };

export type ConversationalIntent = {
  gradeLevels: string[];
  course: string;
  unitName: string;
  topic: string;
  subtopics?: string;
  lessonName?: string;
  studentLevel: string;
  assessmentType: string;
  time: number | null;
  additionalDetails?: string;
  sourceDocuments?: Array<{ id: string; name: string; content: string }>;
  questionFormat?: string;
  /** Kept for backward compat with downstream pipeline. */
  bloomPreference?: string;
  multiPartQuestions?: string;
  sectionStructure?: string;
  standards?: string;
  stateCode?: string;
  arithmeticOperation?: "add" | "subtract" | "multiply" | "divide";
  arithmeticRange?: string;
  passageSource?: string;
  passageText?: string;
  /** Resolved profile defaults used for this generation. */
  resolvedDefaults?: ResolvedCourseDefaults;
};

const DEFAULT_ANSWERS: Record<StepId, string> = {
  course:               "",
  gradeLevels:          "",
  topic:                "",
  subtopics:            "",
  defaultsCard:         "",
  overrideField:        "",
  assessmentType:       "",
  questionFormat:       "",
  arithmeticOperation:  "",
  arithmeticRange:      "",
  passageSource:        "",
  passageText:          "",
  multiPartQuestions:   "",
  standards:            "",
  stateCode:            "",
  studentLevel:         "",
  additionalDetails:    "",
  sourceDocuments:      "",
  summarizerConfirm:    "",
  finalConfirm:         "",
};

interface ConversationalAssessmentProps {
  onComplete: (intent: ConversationalIntent) => void;
  isLoading: boolean;
  disabled?: boolean;
  initialAnswers?: Partial<Record<StepId, string>>;
  defaultAnswers?: Partial<Record<StepId, string>>;
  /** Active teacher profile \u2014 enables profile-driven mode when present. */
  teacherProfile?: TeacherProfile | null;
  /** Called when teacher chooses "Update defaults" on the final confirm card. */
  onUpdateDefaults?: (updated: TeacherProfile) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationalAssessment({
  onComplete,
  isLoading,
  disabled = false,
  initialAnswers,
  defaultAnswers,
  teacherProfile,
  onUpdateDefaults,
}: ConversationalAssessmentProps) {
  const isBlocked = isLoading || disabled;

  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; name: string; content: string }>>([]);
  const docInferredRef = useRef<Partial<Record<StepId, string>>>({});
  const [defaultsUpdateApplied, setDefaultsUpdateApplied] = useState(false);
  const [docSummaryMessage, setDocSummaryMessage] = useState<string | null>(null);
  const commitRef = useRef<(value: string) => void>(() => {});

  const [answers, setAnswers] = useState<Record<StepId, string>>(() => ({
    ...DEFAULT_ANSWERS,
    ...(defaultAnswers ?? {}),
    ...(initialAnswers ?? {}),
  }));

  const [stepIndex, setStepIndex] = useState(() => {
    if (!initialAnswers) return 0;
    const merged = { ...DEFAULT_ANSWERS, ...(initialAnswers ?? {}) };
    const hasP = Boolean(teacherProfile);
    const allSteps = buildSteps(hasP, merged, false);
    return Math.max(0, allSteps.length - 1);
  });

  const [inputValue, setInputValue] = useState(() => initialAnswers?.additionalDetails ?? "");
  const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Profile-based defaults resolution ─────────────────────────────────────
  const hasProfile = Boolean(teacherProfile);
  const courseDefaults = useMemo<ResolvedCourseDefaults | null>(() => {
    if (!teacherProfile || !answers.course) return null;
    return resolveCourseDefaults(teacherProfile, answers.course, answers.assessmentType || undefined);
  }, [teacherProfile, answers.course, answers.assessmentType]);

  // ── Dynamic step list ─────────────────────────────────────────────────────
  const steps: Step[] = useMemo(
    () => buildSteps(hasProfile, answers, uploadedDocs.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasProfile, answers.course, answers.assessmentType, answers.standards,
     answers.questionFormat, answers.passageSource, answers.defaultsCard,
     answers.overrideField, uploadedDocs.length],
  );

  const currentStep   = steps[stepIndex];
  const isChipStep    = currentStep?.kind === "chips";
  const isFileStep    = currentStep?.kind === "fileUpload";
  const isSpecialStep = currentStep?.kind === "defaultsCard" ||
                        currentStep?.kind === "summarizerConfirm" ||
                        currentStep?.kind === "finalConfirm";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!isChipStep && !isFileStep && !isSpecialStep) setTimeout(() => inputRef.current?.focus(), 50);
  }, [stepIndex, isChipStep, isFileStep, isSpecialStep]);

  useEffect(() => { setMultiSelectBuffer([]); }, [stepIndex]);
  useEffect(() => { commitRef.current = commitAnswer; });

  // Auto-advance through inferred steps after document upload
  useEffect(() => {
    if (!currentStep) return;
    const inferred = docInferredRef.current[currentStep.id];
    if (!inferred) return;
    const timer = setTimeout(() => commitRef.current(inferred), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, currentStep?.id]);

  // ── Build the final ConversationalIntent ──────────────────────────────────

  function buildIntent(next: Record<StepId, string>): ConversationalIntent {
    const d = courseDefaults;
    const effectiveAssessmentType = next.assessmentType  || d?.assessmentTypes[0] || "quiz";
    const effectiveFormat         = next.questionFormat  || d?.questionTypes.join(",") || "";
    const effectiveMultiPart      = next.multiPartQuestions || (d?.multiPartAllowed ? "yes" : "no");
    const effectiveStds           = next.standards       || d?.standards || "";
    const effectiveLevel          = next.studentLevel    || d?.typicalDifficulty || "";
    const effectiveGrade          = next.gradeLevels     || d?.gradeBand || "";
    const estimatedMinutes        = d?.estimatedMinutes ?? null;
    return {
      gradeLevels:        effectiveGrade.split(",").map(g => g.trim()).filter(Boolean),
      course:             next.course,
      unitName:           next.topic,
      topic:              next.topic,
      subtopics:          next.subtopics  || undefined,
      studentLevel:       effectiveLevel,
      assessmentType:     effectiveAssessmentType,
      time:               estimatedMinutes,
      additionalDetails:  next.additionalDetails || undefined,
      questionFormat:     effectiveFormat        || undefined,
      multiPartQuestions: effectiveMultiPart     || undefined,
      standards:          effectiveStds          || undefined,
      stateCode:          next.stateCode         || undefined,
      arithmeticOperation: (next.arithmeticOperation || undefined) as ConversationalIntent["arithmeticOperation"],
      arithmeticRange:    next.arithmeticRange   || undefined,
      passageSource:      next.passageSource     || undefined,
      passageText:        next.passageText       || undefined,
      sourceDocuments:    uploadedDocs.length > 0 ? uploadedDocs : undefined,
      resolvedDefaults:   d ?? undefined,
    };
  }

  // ── Overrides: detect what differed from courseDefaults ────────────────────

  const computeOverrides = useCallback((next: Record<StepId, string>): Override[] => {
    const d = courseDefaults;
    if (!d) return [];
    const out: Override[] = [];
    const check = (field: string, fromVal: string, toVal: string) => {
      if (toVal && toVal !== fromVal) out.push({ field, from: fromVal, to: toVal });
    };
    check("Assessment type",  d.assessmentTypes[0] ?? "",           next.assessmentType);
    check("Question formats", d.questionTypes.join(","),             next.questionFormat);
    check("Multi-part",       d.multiPartAllowed ? "yes" : "no",     next.multiPartQuestions);
    check("Standards",        d.standards ?? "none",                 next.standards);
    check("Difficulty",       d.typicalDifficulty,                   next.studentLevel);
    return out;
  }, [courseDefaults]);

  // ── Apply overrides back into profile + persist ───────────────────────────

  function handleApplyOverrides(next: Record<StepId, string>) {
    if (!teacherProfile || !onUpdateDefaults) return;
    const course = next.course;
    const existing = teacherProfile.courseProfiles ?? [];
    const idx = existing.findIndex(c => c.courseName.toLowerCase() === course.toLowerCase());
    const base: import("@/types/teacherProfile").CourseProfile = idx >= 0 ? { ...existing[idx] } : {
      courseName: course,
      subject: course,
      gradeBand: next.gradeLevels || courseDefaults?.gradeBand || "",
      standards: next.standards || courseDefaults?.standards,
      assessmentTypes: [next.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz"],
      questionTypes: (courseDefaults?.questionTypes ?? []) as import("@/types/teacherProfile").CourseProfile["questionTypes"],
      multiPartAllowed: courseDefaults?.multiPartAllowed ?? false,
      pacingDefaults: courseDefaults?.pacingDefaults ?? teacherProfile.pacingDefaults,
      typicalDifficulty: (courseDefaults?.typicalDifficulty ?? "standard") as "remedial" | "standard" | "honors" | "AP",
    };
    if (next.assessmentType) base.assessmentTypes = [next.assessmentType];
    if (next.multiPartQuestions) base.multiPartAllowed = next.multiPartQuestions === "yes";
    if (next.studentLevel) base.typicalDifficulty = next.studentLevel as "remedial" | "standard" | "honors" | "AP";
    const newProfiles = idx >= 0
      ? existing.map((c, i) => i === idx ? base : c)
      : [...existing, base];
    const updated: TeacherProfile = { ...teacherProfile, courseProfiles: newProfiles };
    onUpdateDefaults(updated);
    setDefaultsUpdateApplied(true);
  }

  // ── Commit an answer and advance ──────────────────────────────────────────

  function commitAnswer(value: string) {
    const trimmed = value.trim();
    if (!currentStep) return;
    if (!trimmed && !currentStep.optional) return;

    let next: Record<StepId, string> = { ...answers, [currentStep.id]: trimmed };

    // Document inference
    if (currentStep.id === "sourceDocuments" && uploadedDocs.length > 0) {
      const { inferred, found } = inferFromDocuments(uploadedDocs);
      docInferredRef.current = inferred;
      next = { ...next, ...inferred };
      setDocSummaryMessage(
        found.length > 0
          ? `\ud83d\udcc4 From your document${uploadedDocs.length !== 1 ? "s" : ""} I found: ${found.join(" \u00b7 ")}. I\u2019ve pre-filled those \u2014 I\u2019ll only ask what\u2019s still missing.`
          : `\ud83d\udcc4 I couldn\u2019t pull specifics from the file${uploadedDocs.length !== 1 ? "s" : ""}, but I\u2019ll use their content when writing questions.`,
      );
    }

    setAnswers(next);
    setInputValue("");

    // Recompute steps with updated answers to find the right next index.
    const newSteps = buildSteps(hasProfile, next, uploadedDocs.length > 0);

    // finalConfirm step \u2014 build intent and call onComplete
    if (currentStep.kind === "finalConfirm" || stepIndex >= newSteps.length - 1) {
      onComplete(buildIntent(next));
      return;
    }

    setStepIndex(stepIndex + 1);
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitAnswer(inputValue);
  };

  const handleChipClick = (value: string) => {
    if (currentStep?.multiSelect) {
      setMultiSelectBuffer(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      commitAnswer(value);
    }
  };

  const handleMultiSelectConfirm = () => {
    if (multiSelectBuffer.length > 0) commitAnswer(multiSelectBuffer.join(","));
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1);
  };

  const goToStep = (idx: number) => {
    const target = steps[idx];
    if (!target) return;
    delete docInferredRef.current[target.id];
    setInputValue(answers[target.id] || "");
    setStepIndex(idx);
  };

  const progressPct = Math.round((stepIndex / steps.length) * 100);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const docs = await Promise.all(
      files.map(async (file) => {
        const content = await file.text().catch(() => "");
        return { id: crypto.randomUUID(), name: file.name, content };
      })
    );
    setUploadedDocs(docs);
  }

  function removeDoc(id: string) {
    setUploadedDocs(prev => prev.filter(d => d.id !== id));
  }

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

            {/* Previous user answer \u2014 click to jump back and edit */}
            {idx < stepIndex && answers[step.id] !== undefined && (() => {
              const isInferred = !!docInferredRef.current[step.id];
              const label =
                step.id === "sourceDocuments"
                  ? (uploadedDocs.length > 0
                      ? `${uploadedDocs.length} file${uploadedDocs.length !== 1 ? "s" : ""} uploaded`
                      : answers[step.id] || null)
                  : step.chips && step.multiSelect
                    ? answers[step.id].split(",").map(v => step.chips!.find(c => c.value === v.trim())?.label ?? v.trim()).join(", ")
                    : step.chips
                      ? (step.chips.find(c => c.value === answers[step.id])?.label ?? answers[step.id])
                      : answers[step.id];
              if (!label) return null;
              return (
                <button
                  type="button"
                  className={`ca-bubble ca-bubble--user ca-bubble--editable${isInferred ? " ca-bubble--inferred" : ""}`}
                  onClick={() => !isBlocked && goToStep(idx)}
                  title="Click to change"
                  disabled={isBlocked}
                >
                  {label}
                  {isInferred && <span className="ca-inferred-badge"> \ud83d\udcc4 from document</span>}
                  <span className="ca-edit-icon">\u270f\ufe0f</span>
                </button>
              );
            })()}

            {/* Inference summary after sourceDocuments */}
            {step.id === "sourceDocuments" && idx < stepIndex && docSummaryMessage && (
              <div className="ca-bubble ca-bubble--bot">{docSummaryMessage}</div>
            )}

            {/* ── Special card: defaultsCard ── */}
            {idx === stepIndex && step.kind === "defaultsCard" && courseDefaults && (
              <DefaultsCard
                defaults={courseDefaults}
                courseName={answers.course}
                disabled={isBlocked}
                onUse={() => commitAnswer("use")}
                onChange={() => commitAnswer("change")}
              />
            )}

            {/* ── Special card: summarizerConfirm ── */}
            {idx === stepIndex && step.kind === "summarizerConfirm" && (
              <SummarizerConfirmCard
                message={docSummaryMessage ?? "I\u2019ve reviewed your documents. Ready to continue?"}
                inferred={docInferredRef.current}
                disabled={isBlocked}
                onConfirm={() => commitAnswer("confirmed")}
              />
            )}

            {/* ── Special card: finalConfirm ── */}
            {idx === stepIndex && step.kind === "finalConfirm" && (
              <FinalConfirmCard
                answers={answers}
                courseDefaults={courseDefaults}
                overrides={computeOverrides(answers)}
                estimatedMinutes={courseDefaults?.estimatedMinutes ?? 30}
                docsCount={uploadedDocs.length}
                disabled={isBlocked}
                onGenerate={() => commitAnswer("generate")}
                onBack={() => handleBack()}
                onUpdateDefaults={onUpdateDefaults ? () => handleApplyOverrides(answers) : undefined}
                defaultsUpdateApplied={defaultsUpdateApplied}
              />
            )}

            {/* Chip row for current chip-step */}
            {idx === stepIndex && step.kind === "chips" && step.chips && (
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
                    &check; Confirm ({multiSelectBuffer.length} selected)
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
            Generating your assessment&hellip;
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* File upload UI */}
      {isFileStep && !isBlocked && (
        <div className="ca-upload-area">
          <div style={{ flex: 1 }}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              onChange={handleFileChange}
              style={{ fontSize: "0.88rem" }}
            />
            {uploadedDocs.length > 0 && (
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1rem", fontSize: "0.82rem", listStyle: "none" }}>
                {uploadedDocs.map(d => (
                  <li key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    \ud83d\udcc4 {d.name}
                    <button
                      type="button"
                      onClick={() => removeDoc(d.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700, lineHeight: 1 }}
                      aria-label={`Remove ${d.name}`}
                    >&times;</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="ca-btn-send"
            onClick={() => commitAnswer(uploadedDocs.length > 0 ? uploadedDocs.map(d => d.name).join(", ") : "")}
          >
            {uploadedDocs.length > 0 ? `Use ${uploadedDocs.length} file${uploadedDocs.length !== 1 ? "s" : ""} \u2192` : "Skip \u2192"}
          </button>
        </div>
      )}

      {/* Text input bar */}
      {!isChipStep && !isFileStep && !isSpecialStep && !isBlocked && (
        <form onSubmit={handleTextSubmit} className="ca-input-row">
          {stepIndex > 0 && (
            <button
              type="button"
              className="ca-btn-back"
              onClick={handleBack}
              disabled={isBlocked}
              title="Go back"
            >
              &larr;
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
            {stepIndex === steps.length - 1 ? "Generate" : "\u2192"}
          </button>
        </form>
      )}

      {/* Back button visible during chip steps (after step 0) */}
      {isChipStep && !isBlocked && stepIndex > 0 && (
        <div className="ca-chip-footer">
          <button type="button" className="ca-btn-back" onClick={handleBack}>
            &larr; Back
          </button>
        </div>
      )}
    </div>
  );
}
