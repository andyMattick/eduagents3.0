// src/components_new/Pipeline/ConversationalAssessment.tsx
//
// Defaults-first CREATE mode.
// When a teacher profile is present, we show resolved course defaults and
// only ask for overrides.  When absent, we fall back to the full manual flow.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { TeacherProfile, ResolvedCourseDefaults } from "@/types/teacherProfile";
import { DEFAULT_PACING_SECONDS } from "@/types/teacherProfile";
import { resolveCourseDefaults } from "@/services_new/teacherProfileService";
import { evaluateFeasibility } from "@/pipeline/agents/architect/feasibility";

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

/** Maps a QUESTION_FORMAT_CHIPS value to the key in DEFAULT_PACING_SECONDS. */
const FORMAT_PACING_KEY: Record<string, string> = {
  mcqOnly:           "multipleChoice",
  saOnly:            "shortAnswer",
  essayOnly:         "essay",
  frqOnly:           "freeResponse",
  fitbOnly:          "fillInTheBlank",
  trueFalseOnly:     "trueFalse",
  arithmeticFluency: "arithmeticFluency",
  passageBased:      "passageBased",
  mixed:             "",
};

function fmtPacingTime(sec: number): string {
  if (sec < 60) return `${sec} sec each`;
  const m = sec / 60;
  return `${Number.isInteger(m) ? m : m.toFixed(1)} min each`;
}

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
      // Show each question with the default pre-selected — no separate card step needed
      steps.push({ id: "assessmentType",    kind: "chips", question: "What type of assessment?",      chips: ASSESSMENT_CHIPS });
      steps.push({ id: "questionFormat",    kind: "chips", question: "Which question formats?",       chips: QUESTION_FORMAT_CHIPS, multiSelect: true });
      steps.push({ id: "multiPartQuestions",kind: "chips", question: "Multi-part questions?",         chips: MULTI_PART_CHIPS });
      steps.push({ id: "studentLevel",      kind: "chips", question: "Difficulty level for your class?", chips: LEVEL_CHIPS });
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

interface DefaultsInlineOverride {
  assessmentType?: string;
  questionFormat?: string;
  multiPartQuestions?: string; // "yes" | "no"
  gradeLevels?: string;
  studentLevel?: string;
  standards?: string;
  stateCode?: string;
}

function DefaultsCard({
  defaults, courseName, topic, subtopics, onUse, disabled,
}: {
  defaults: ResolvedCourseDefaults; courseName: string;
  topic?: string; subtopics?: string;
  onUse: (overrides: DefaultsInlineOverride) => void;
  disabled: boolean;
}) {
  // Best-effort: map defaults.questionTypes[0] to a known chip value
  const guessFormat = (): string => {
    const t = defaults.questionTypes;
    if (t.length === 1) {
      const found = QUESTION_FORMAT_CHIPS.find(c => c.value === t[0]);
      if (found) return found.value;
    }
    return t.length > 1 ? "mixed" : (QUESTION_FORMAT_CHIPS[0]?.value ?? "mixed");
  };

  const origAssessmentType = defaults.assessmentTypes[0] ?? "quiz";
  const origFormat         = guessFormat();
  const origMultiPart      = defaults.multiPartAllowed;
  const origGrade          = defaults.gradeBand ?? "";
  const origDifficulty     = defaults.typicalDifficulty;
  const origStandards      = defaults.standards ?? "";

  const [assessmentType, setAssessmentType] = useState(origAssessmentType);
  // questionFormat stored as comma-separated values (multi-select)
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    () => origFormat ? origFormat.split(",").map(s => s.trim()).filter(Boolean) : []
  );
  const [multiPart,       setMultiPart]       = useState(origMultiPart);
  const [grade,           setGrade]           = useState(origGrade);
  const [difficulty,      setDifficulty]      = useState(origDifficulty);
  const [standards,       setStandards]       = useState(origStandards);
  const [stateCode,       setStateCode]       = useState("");

  function handleUse() {
    const overrides: DefaultsInlineOverride = {};
    const questionFormat = selectedFormats.join(",");
    if (assessmentType !== origAssessmentType)        overrides.assessmentType = assessmentType;
    if (questionFormat  !== origFormat)               overrides.questionFormat = questionFormat;
    if (multiPart       !== origMultiPart)      overrides.multiPartQuestions = multiPart ? "yes" : "no";
    if (grade           !== origGrade)          overrides.gradeLevels = grade;
    if (difficulty      !== origDifficulty)     overrides.studentLevel = difficulty;
    if (standards       !== origStandards)      overrides.standards = standards;
    if (standards === "state" && stateCode)     overrides.stateCode = stateCode;
    onUse(overrides);
  }

  function ChipRow<T extends string>({
    value, options, onChange,
  }: { value: T; options: Array<{ label: string; value: T }>; onChange: (v: T) => void }) {
    return (
      <div className="ca-inline-chips">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={`ca-chip ca-chip--sm${value === o.value ? " ca-chip--selected" : ""}`}
            onClick={() => !disabled && onChange(o.value)}
            disabled={disabled}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="ca-defaults-card">
      <div className="ca-defaults-card__header">
        <span className="ca-defaults-card__title">Your defaults for <strong>{courseName || "this course"}</strong></span>
        {defaults.level === "global" && <span className="ca-defaults-card__badge">global defaults</span>}
      </div>

      {/* Read-only context */}
      <table className="ca-defaults-table"><tbody>
        <tr><th>Course</th><td>{courseName || "\u2014"}</td></tr>
        {topic     && <tr><th>Topic</th><td>{topic}</td></tr>}
        {subtopics && <tr><th>Subtopics</th><td>{subtopics}</td></tr>}
      </tbody></table>

      {/* Editable fields — full-width label+chips layout */}
      <div className="ca-inline-fields">
        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Assessment type</span>
          <ChipRow value={assessmentType} options={ASSESSMENT_CHIPS} onChange={setAssessmentType} />
        </div>

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Question formats <span style={{ fontWeight: 400, color: "var(--text-secondary, #9ca3af)" }}>(pick all that apply)</span></span>
          <div className="ca-inline-chips">
            {QUESTION_FORMAT_CHIPS.map(o => {
              const pacingKey = FORMAT_PACING_KEY[o.value];
              const sec = pacingKey ? DEFAULT_PACING_SECONDS[pacingKey] : null;
              const isSelected = selectedFormats.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`ca-chip ca-chip--sm${isSelected ? " ca-chip--selected" : ""}`}
                  onClick={() => !disabled && setSelectedFormats(prev =>
                    prev.includes(o.value) ? prev.filter(v => v !== o.value) : [...prev, o.value]
                  )}
                  disabled={disabled}
                  title={sec ? fmtPacingTime(sec) : undefined}
                >
                  {o.label}{sec ? <span style={{ opacity: 0.7, fontSize: "0.7rem", marginLeft: "0.3rem" }}>({fmtPacingTime(sec)})</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Multi-part</span>
          <ChipRow
            value={multiPart ? "yes" : "no"}
            options={MULTI_PART_CHIPS}
            onChange={(v) => setMultiPart(v === "yes")}
          />
        </div>

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Grade level</span>
          <input
            type="text"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            placeholder="e.g. 8"
            className="ca-input ca-input--sm"
            disabled={disabled}
          />
        </div>

        {(origStandards || defaults.standards != null) && (
          <div className="ca-inline-field">
            <span className="ca-inline-field__label">Standards</span>
            <ChipRow value={standards} options={STANDARDS_CHIPS} onChange={setStandards} />
            {standards === "state" && (
              <input
                type="text"
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
                placeholder="State code (e.g. GA)"
                className="ca-input ca-input--sm"
                style={{ marginTop: "0.3rem", width: "9rem" }}
                disabled={disabled}
              />
            )}
          </div>
        )}

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Difficulty</span>
          <ChipRow
            value={difficulty}
            options={LEVEL_CHIPS}
            onChange={v => setDifficulty(v as typeof difficulty)}
          />
        </div>
      </div>

      {/* Read-only derived */}
      <table className="ca-defaults-table" style={{ marginTop: "0.5rem" }}><tbody>
        {defaults.typicalBloomRange && <tr><th>Typical rigor</th><td>{defaults.typicalBloomRange}</td></tr>}
        <tr><th>Est. questions</th><td>{defaults.estimatedQuestionRange.min}–{defaults.estimatedQuestionRange.max}</td></tr>
        <tr><th>Est. time</th><td>~{defaults.estimatedMinutes} min</td></tr>
      </tbody></table>

      <div className="ca-defaults-card__actions">
        <button className="ca-btn-primary" onClick={handleUse} disabled={disabled}>Use these defaults &rarr;</button>
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

// ── FeasibilityWarning ────────────────────────────────────────────────────────

const LEVEL_TO_BLOOM: Record<string, string> = {
  support:  "understand",
  standard: "apply",
  honors:   "analyze",
  ap:       "evaluate",
};

function FeasibilityWarning({
  answers,
  courseDefaults,
}: {
  answers: Record<StepId, string>;
  courseDefaults: ResolvedCourseDefaults | null;
}) {
  const topic    = answers.topic?.trim()    || "";
  const details  = [answers.subtopics, answers.additionalDetails].filter(Boolean).join(" ");
  const formats  = (answers.questionFormat || courseDefaults?.questionTypes.join(",") || "mcqOnly")
    .split(",").map(s => s.trim()).filter(Boolean);
  const level    = answers.studentLevel || courseDefaults?.typicalDifficulty || "standard";
  const bloom    = LEVEL_TO_BLOOM[level] ?? "apply";
  const reqCount = courseDefaults?.estimatedQuestionRange.max ?? 10;

  if (!topic) return null;

  const report = evaluateFeasibility({
    topic,
    additionalDetails: details || null,
    sourceDocuments:   null,
    requestedSlotCount: reqCount,
    questionTypes:     formats,
    depthFloor:        "remember",
    depthCeiling:      bloom,
  });

  if (report.riskLevel === "safe") return null;

  const COLOR = {
    caution:  { bg: "var(--adp-warn-bg,#fffbeb)",  border: "var(--adp-warn-fg,#d97706)",  fg: "var(--adp-warn-fg,#92400e)"  },
    high:     { bg: "var(--adp-warn-bg,#fffbeb)",  border: "#f59e0b",                      fg: "#92400e"                      },
    overload: { bg: "var(--adp-danger-bg,#fef2f2)", border: "var(--adp-danger-fg,#dc2626)", fg: "var(--adp-danger-fg,#991b1b)" },
  }[report.riskLevel];

  const icon    = report.riskLevel === "overload" ? "⚠️" : "ℹ️";
  const heading = report.riskLevel === "overload"
    ? "Topic may not support this many questions"
    : report.riskLevel === "high"
    ? "Topic density is low for the requested count"
    : "Topic density is moderate";

  // Show only the first human-readable warning (skip the [Feasibility detail] debug line)
  const msg = report.warnings.find(w => !w.startsWith("[Feasibility")) ?? report.warnings[0] ?? "";

  return (
    <div style={{
      margin: "0.75rem 0 0.25rem",
      padding: "0.65rem 0.9rem",
      borderRadius: "8px",
      border: `1.5px solid ${COLOR.border}`,
      background: COLOR.bg,
      color: COLOR.fg,
      fontSize: "0.82rem",
      lineHeight: 1.5,
    }}>
      <strong>{icon} {heading}</strong>
      <p style={{ margin: "0.25rem 0 0" }}>{msg}</p>
      <p style={{ margin: "0.25rem 0 0", opacity: 0.8 }}>
          You can still generate — the system will adjust automatically if needed.
        </p>
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

      <FeasibilityWarning answers={answers} courseDefaults={courseDefaults} />

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

  // Pre-fill course with the most recently added course profile (last in array)
  const lastCourse =
    teacherProfile?.courseProfiles?.length
      ? teacherProfile.courseProfiles[teacherProfile.courseProfiles.length - 1].courseName
      : "";

  const [answers, setAnswers] = useState<Record<StepId, string>>(() => ({
    ...DEFAULT_ANSWERS,
    ...(lastCourse ? { course: lastCourse } : {}),
    ...(defaultAnswers ?? {}),
    ...(initialAnswers ?? {}),
  }));

  const [stepIndex, setStepIndex] = useState(() => {
    if (initialAnswers) {
      const merged = { ...DEFAULT_ANSWERS, ...(initialAnswers ?? {}) };
      const hasP = Boolean(teacherProfile);
      const allSteps = buildSteps(hasP, merged, false);
      return Math.max(0, allSteps.length - 1);
    }
    // If a course is pre-filled from the profile, start at the topic step
    if (teacherProfile?.courseProfiles?.length && lastCourse) return 1;
    return 0;
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

  // When the resolved course defaults change (course was updated), pre-populate
  // the chip answers so each step shows the correct default pre-selected.
  const prevDefaultsCourseRef = useRef<string>("");
  useEffect(() => {
    if (!courseDefaults || answers.course === prevDefaultsCourseRef.current) return;
    prevDefaultsCourseRef.current = answers.course;
    setAnswers(prev => ({
      ...prev,
      assessmentType:     courseDefaults.assessmentTypes[0]        ?? prev.assessmentType,
      questionFormat:     courseDefaults.questionTypes.join(","),
      multiPartQuestions: courseDefaults.multiPartAllowed ? "yes" : "no",
      studentLevel:       courseDefaults.typicalDifficulty          ?? prev.studentLevel,
      gradeLevels:        courseDefaults.gradeBand                  ?? prev.gradeLevels,
    }));
  }, [answers.course, courseDefaults]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    // For multi-select steps, seed the buffer from the existing answer so the
    // previously chosen options are shown as selected when navigating back.
    if (currentStep?.multiSelect && answers[currentStep.id]) {
      setMultiSelectBuffer(
        answers[currentStep.id].split(",").map(s => s.trim()).filter(Boolean)
      );
    } else {
      setMultiSelectBuffer([]);
    }
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps
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
    check("Grade level",      d.gradeBand ?? "",                     next.gradeLevels);
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

  function commitAnswer(value: string, extraOverrides?: Partial<Record<StepId, string>>) {
    const trimmed = value.trim();
    if (!currentStep) return;
    if (!trimmed && !currentStep.optional) return;

    let next: Record<StepId, string> = { ...answers, [currentStep.id]: trimmed, ...(extraOverrides ?? {}) };

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
                topic={answers.topic || undefined}
                subtopics={answers.subtopics || undefined}
                disabled={isBlocked}
                onUse={(overrides) => commitAnswer("use", {
                  ...(overrides.assessmentType     ? { assessmentType:     overrides.assessmentType }     : {}),
                  ...(overrides.questionFormat     ? { questionFormat:     overrides.questionFormat }     : {}),
                  ...(overrides.multiPartQuestions ? { multiPartQuestions: overrides.multiPartQuestions } : {}),
                  ...(overrides.gradeLevels        ? { gradeLevels:        overrides.gradeLevels }        : {}),
                  ...(overrides.studentLevel       ? { studentLevel:       overrides.studentLevel }       : {}),
                  ...(overrides.standards          ? { standards:          overrides.standards }          : {}),
                  ...(overrides.stateCode          ? { stateCode:          overrides.stateCode }          : {}),
                })}
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
                      step.multiSelect
                        ? multiSelectBuffer.includes(chip.value) ? " ca-chip--selected" : ""
                        : answers[step.id] === chip.value       ? " ca-chip--selected" : ""
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
                    {"\u2713"} Use:{" "}
                    {multiSelectBuffer
                      .map(v => step.chips!.find(c => c.value === v)?.label ?? v)
                      .join(", ")}
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
