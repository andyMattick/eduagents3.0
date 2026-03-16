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
import { UI_PROBLEM_TYPES } from "@/pipeline/problemTypes/uiProblemTypes";
import { getProblemTypesForSubjectAndGrade } from "@/pipeline/problemTypes/getProblemTypesForSubjectAndGrade";
import { inferGradeBand } from "@/pipeline/problemTypes/inferGradeBand";
import { analyzeDocument, analyzeDocumentText } from "@/pipeline/agents/documentAnalyzer";

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

const COURSE_CHIPS = [
  // Math
  { group: "Math", label: "Math (General)", value: "math" },
  { group: "Math", label: "Arithmetic", value: "arithmetic" },
  { group: "Math", label: "Algebra 1", value: "algebra1" },
  { group: "Math", label: "Algebra 2", value: "algebra2" },
  { group: "Math", label: "Geometry", value: "geometry" },
  { group: "Math", label: "Precalculus", value: "precalculus" },
  { group: "Math", label: "Calculus", value: "calculus" },
  { group: "Math", label: "Statistics / Probability", value: "statistics" },

  //Foreign Language
  { group: "Foreign Language", label: "Spanish", value: "spanish" },
  { group: "Foreign Language", label: "French", value: "french" },
  { group: "Foreign Language", label: "German", value: "german" },
  { group: "Foreign Language", label: "Latin", value: "latin" },
  { group: "Foreign Language", label: "Chinese", value: "chinese" },
  
  // English/Language Arts
  { group: "English/Language Arts", label: "English (General)", value: "english" },
  { group: "English/Language Arts", label: "Reading & Writing", value: "readingWriting" },
  { group: "English/Language Arts", label: "Literature", value: "literature" },
  { group: "English/Language Arts", label: "Composition", value: "composition" },
  { group: "English/Language Arts", label: "Grammar & Vocabulary", value: "grammar" },
  { group: "English/Language Arts", label: "ESL/ELL", value: "esl" },

  // Science
  { group: "Science", label: "Science (General)", value: "science" },
  { group: "Science", label: "Biology", value: "biology" },
  { group: "Science", label: "Chemistry", value: "chemistry" },
  { group: "Science", label: "Physics", value: "physics" },
  { group: "Science", label: "Environmental Science", value: "envScience" },
  { group: "Science", label: "Earth Science", value: "earthScience" },

  // History/Social Studies
  { group: "History/Social Studies", label: "History/Social Studies (General)", value: "socialStudies" },
  { group: "History/Social Studies", label: "U.S. History", value: "usHistory" },
  { group: "History/Social Studies", label: "World History", value: "worldHistory" },
  { group: "History/Social Studies", label: "Civics", value: "civics" },
  { group: "History/Social Studies", label: "Government", value: "government" },
  { group: "History/Social Studies", label: "Economics", value: "economics" },

  // STEM
  { group: "STEM", label: "Computer Science", value: "computerScience" },
  { group: "STEM", label: "Engineering", value: "engineering" },
  
  // Other
  { group: "Other", label: "Foreign Language", value: "foreignLanguage" },
  { group: "Other", label: "Physical Education", value: "pe" },
  { group: "Other", label: "Arts", value: "arts" },
  { group: "Other", label: "Bible", value: "bible" },
  { group: "Other", label: "Other (please specify)", value: "other" },
];

const GRADE_LEVEL_CHIPS = [
  // Elementary
  { group: "Elementary (K-5)", label: "Kindergarten", value: "K" },
  { group: "Elementary (K-5)", label: "1st Grade", value: "1" },
  { group: "Elementary (K-5)", label: "2nd Grade", value: "2" },
  { group: "Elementary (K-5)", label: "3rd Grade", value: "3" },
  { group: "Elementary (K-5)", label: "4th Grade", value: "4" },
  { group: "Elementary (K-5)", label: "5th Grade", value: "5" },

  // Middle School
  { group: "Middle School (6-8)", label: "6th Grade", value: "6" },
  { group: "Middle School (6-8)", label: "7th Grade", value: "7" },
  { group: "Middle School (6-8)", label: "8th Grade", value: "8" },

  // High School
  { group: "High School (9-12)", label: "9th Grade", value: "9" },
  { group: "High School (9-12)", label: "10th Grade", value: "10" },
  { group: "High School (9-12)", label: "11th Grade", value: "11" },
  { group: "High School (9-12)", label: "12th Grade", value: "12" },
];

const QUESTION_TYPE_CATEGORIES = ["Select", "Produce", "Analyze", "Create", "Perform"] as const;

const QUESTION_FORMAT_CHIPS = [
  ...QUESTION_TYPE_CATEGORIES.flatMap((category) =>
    UI_PROBLEM_TYPES
      .filter((problemType) => problemType.category === category)
      .map((problemType) => ({
        group: category,
        label: problemType.label,
        value: problemType.id,
      }))
  ),
  { group: "Perform", label: "AI Decides Problem Type", value: "mixed" },
];

/**
 * Returns format chips filtered to the given subject + grade level(s).
 * Falls back to the full QUESTION_FORMAT_CHIPS when no governed set exists
 * for the subject (e.g. Chemistry, Spanish) so teachers always see options.
 * gradeLevelsRaw is the comma-separated multiSelect answer: "10" or "9,10".
 */
function buildFormatChipsForSubjectGrade(
  course: string,
  gradeLevelsRaw: string
): typeof QUESTION_FORMAT_CHIPS {
  const grades = gradeLevelsRaw.split(",").map(g => g.trim()).filter(Boolean);
  const band = inferGradeBand(course, grades);
  if (!band) return QUESTION_FORMAT_CHIPS;
  const filtered = getProblemTypesForSubjectAndGrade(course, band);
  if (filtered.length === 0) return QUESTION_FORMAT_CHIPS;
  return [
    ...filtered.map(pt => ({ group: pt.category, label: pt.label, value: pt.id })),
    { group: "Perform", label: "AI Decides Problem Type", value: "mixed" },
  ];
}

const QUESTION_FORMAT_COMPAT_MAP: Record<string, string> = {
  // Legacy chip values
  mcqOnly: "multipleChoice",
  saOnly: "shortAnswer",
  essayOnly: "essay",
  frqOnly: "extendedResponse",
  fitbOnly: "fillBlank",
  trueFalseOnly: "trueFalse",

  // Canonical/default question types
  fillInTheBlank: "fillBlank",
  freeResponse: "extendedResponse",
  constructedResponse: "extendedResponse",
  passageBased: "passageExtendedResponse",
};

function normalizeQuestionFormatValue(value: string): string {
  return QUESTION_FORMAT_COMPAT_MAP[value] ?? value;
}

// Examples for each problem type
const PROBLEM_EXAMPLES: Record<string, { title: string; examples: string[] }> = {
  multipleChoice: { title: "Multiple Choice", examples: ["What is the capital of France? A) London B) Paris C) Berlin D) Madrid", "Which element has the atomic number 6? A) Oxygen B) Carbon C) Nitrogen D) Hydrogen"] },
  trueFalse: { title: "True / False", examples: ["The Earth orbits around the Sun. (True/False)", "Photosynthesis occurs in animal cells. (True/False)"] },
  fillBlank: { title: "Fill in the Blank", examples: ["The process by which plants make their own food is called ________.", "A ________ is a statement believed to be true but unproven."] },
  shortAnswer: { title: "Short Answer", examples: ["Explain the role of mitochondria in a cell. (1-3 sentences)", "Describe two ways plants adapt to drought. (2-4 sentences)"] },
  numericEntry: { title: "Numeric Entry", examples: ["Calculate: 18 × 7 = ?", "Solve: 3/4 + 1/2 = ?"] },
  graphInterpretation: { title: "Graph Interpretation", examples: ["Based on the line graph, during which month did sales peak?", "What trend is shown between time and temperature?"] },
  dataInterpretation: { title: "Data Interpretation", examples: ["Using the data table, which condition produced the highest growth rate?", "What conclusion is supported by the experiment results?"] },
  extendedResponse: { title: "Extended Response", examples: ["Explain how the water cycle affects local weather patterns.", "Compare two methods for solving systems of equations and justify your preferred method."] },
  essay: { title: "Essay", examples: ["Write a five-paragraph essay on the theme of resilience in literature.", "Discuss the impact of technology on modern communication. (500-750 words)"] },
  passageExtendedResponse: { title: "Passage-Based Extended Response", examples: ["Read the passage and explain how the author develops the central idea.", "Using evidence from the text, analyze the speaker's perspective."] },
  mixed: { title: "Mixed Format", examples: ["Combination of multiple question types throughout the assessment.", "Assesses different cognitive levels and varied response modes."] },
};

function getProblemExamples(formatId: string): { title: string; examples: string[] } | null {
  const known = PROBLEM_EXAMPLES[formatId];
  if (known) return known;

  const mapped = UI_PROBLEM_TYPES.find((problemType) => problemType.id === formatId);
  if (!mapped) return null;

  return {
    title: mapped.label,
    examples: [mapped.description],
  };
}

function triggerWindowAutoAdjust(): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

interface ProblemHoverPreview {
  title: string;
  example: string;
  pacing?: string;
  x: number;
  y: number;
}

interface UploadedDoc {
  id: string;
  name: string;
  content: string;
  unreadable?: boolean;
}

function ProblemHoverPreviewCard({ preview }: { preview: ProblemHoverPreview }) {
  const CARD_WIDTH = 320;
  const OFFSET = 14;
  const left =
    typeof window === "undefined"
      ? preview.x + OFFSET
      : Math.min(preview.x + OFFSET, Math.max(12, window.innerWidth - CARD_WIDTH - 12));
  const top = preview.y + OFFSET;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: `${CARD_WIDTH}px`,
        maxWidth: "calc(100vw - 24px)",
        padding: "0.65rem 0.75rem",
        borderRadius: "10px",
        border: "1px solid rgba(99, 102, 241, 0.35)",
        background: "rgba(17, 24, 39, 0.96)",
        boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
        color: "#f9fafb",
        zIndex: 1200,
        pointerEvents: "none",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.83rem", marginBottom: "0.25rem" }}>{preview.title}</div>
      <div style={{ fontSize: "0.78rem", color: "#e5e7eb" }}>{preview.example}</div>
      {preview.pacing && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.72rem", color: "#c7d2fe" }}>Estimated pacing: {preview.pacing}</div>
      )}
    </div>
  );
}

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
  // Canonical/default question types
  constructedResponse: "constructedResponse",
  freeResponse:       "freeResponse",
  fillInTheBlank:     "fillInTheBlank",
  passageBased:       "passageBased",

  multipleChoice:    "multipleChoice",
  trueFalse:         "trueFalse",
  shortAnswer:       "shortAnswer",
  fillBlank:         "fillInTheBlank",
  numericEntry:      "shortAnswer",
  extendedResponse:  "freeResponse",
  essay:             "essay",
  passageExtendedResponse: "passageBased",
  dataInterpretation: "graphInterpretation",
  graphInterpretation: "graphInterpretation",
  tableCompletion:   "shortAnswer",
  errorAnalysis:     "shortAnswer",
  sourceComparison:  "shortAnswer",
  equationConstruction: "shortAnswer",
  performanceTask:   "freeResponse",
  scenarioDecision:  "freeResponse",
  simulation:        "graphInterpretation",

  // Legacy aliases for older saved defaults
  mcqOnly:           "multipleChoice",
  saOnly:            "shortAnswer",
  essayOnly:         "essay",
  frqOnly:           "freeResponse",
  fitbOnly:          "fillInTheBlank",
  trueFalseOnly:     "trueFalse",
  algebraicFluency:  "algebraicFluency",
  fractions:         "fractions",
  linearEquation:    "linearEquation",
  mixed:             "",
};

function fmtPacingTime(sec: number): string {
  if (sec < 60) return `${sec} sec each`;
  const m = sec / 60;
  return `${Number.isInteger(m) ? m : m.toFixed(1)} min each`;
}

const QUESTION_FORMAT_RECOMMENDED_BY_ASSESSMENT: Record<string, string[]> = {
  bellRinger: ["multipleChoice", "shortAnswer"],
  exitTicket: ["multipleChoice", "shortAnswer"],
  quiz: ["multipleChoice", "shortAnswer", "fillBlank"],
  worksheet: ["multipleChoice", "shortAnswer", "extendedResponse"],
  testReview: ["multipleChoice", "shortAnswer", "extendedResponse"],
  test: ["multipleChoice", "shortAnswer", "extendedResponse", "essay"],
};

function getRecommendedQuestionFormats(assessmentType: string, availableValues: Set<string>): string[] {
  const recommendation =
    QUESTION_FORMAT_RECOMMENDED_BY_ASSESSMENT[assessmentType] ?? ["multipleChoice", "shortAnswer"];
  return recommendation.filter((format) => availableValues.has(format));
}

// ── Step definitions ──────────────────────────────────────────────────────────

type StepKind = "text" | "chips" | "fileUpload" | "defaultsCard" | "summarizerConfirm" | "finalConfirm";

type StepId =
  | "gradeLevels"
  | "course"
  | "courseCustom"
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
  | "assignmentDuration"
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
  chips?: Array<{ label: string; value: string; group?: string }>;
}

// ── buildSteps ────────────────────────────────────────────────────────────────
//
// Single function that returns the ordered step list based on mode + answers.

function buildSteps(
  hasProfile: boolean,
  answers: Record<StepId, string>,
  hasDocs: boolean,
  docInferenceHighConfidence: boolean,
): Step[] {
  const steps: Step[] = [];
  const shouldAskTopic = !(hasDocs && docInferenceHighConfidence && !!answers.topic);
  const shouldAskSubtopics = !(hasDocs && docInferenceHighConfidence && !!answers.subtopics);

  if (hasProfile) {
    // ── Profile-driven flow ──────────────────────────────────────────────
    steps.push({ id: "course",      kind: "chips", question: "What course is this for?", chips: COURSE_CHIPS });
    
    // If "other" is selected, prompt for custom course name
    if (answers.course === "other") {
      steps.push({ id: "courseCustom", kind: "text", question: "What is the course name?", placeholder: "e.g., Marine Biology, Digital Art" });
    }
    
    steps.push({ id: "gradeLevels", kind: "chips", question: "What grade level(s)?", chips: GRADE_LEVEL_CHIPS, multiSelect: true });
    steps.push({ id: "sourceDocuments", kind: "fileUpload", question: "Upload source documents? (optional \u2014 skip to continue)", optional: true });
    if (hasDocs) {
      steps.push({ id: "summarizerConfirm", kind: "summarizerConfirm", question: "I\u2019ve reviewed your documents." });
    }
    if (shouldAskTopic) {
      steps.push({ id: "topic", kind: "text", question: "What topic or lesson should the assessment cover?", placeholder: "e.g., Chi-square tests" });
    }
    if (shouldAskSubtopics) {
      steps.push({ id: "subtopics", kind: "text", question: "Any subtopics to focus on? (optional)", placeholder: "e.g., goodness-of-fit, independence", optional: true });
    }

    if (answers.course) {
      // Show each question with the default pre-selected — no separate card step needed
      steps.push({ id: "assessmentType",    kind: "chips", question: "What type of assessment?",      chips: ASSESSMENT_CHIPS });
      steps.push({ id: "questionFormat",    kind: "chips", question: "Which question formats?",       chips: buildFormatChipsForSubjectGrade(answers.course, answers.gradeLevels ?? ""), multiSelect: true });
      steps.push({ id: "multiPartQuestions",kind: "chips", question: "Multi-part questions?",         chips: MULTI_PART_CHIPS });
      steps.push({ id: "studentLevel",      kind: "chips", question: "Difficulty level for your class?", chips: LEVEL_CHIPS });
    }
  } else {
    // ── Manual flow (no profile) ─────────────────────────────────────────
    steps.push({ id: "course",      kind: "chips",  question: "What subject or course?", chips: COURSE_CHIPS });
    
    // If "other" is selected, prompt for custom course name
    if (answers.course === "other") {
      steps.push({ id: "courseCustom", kind: "text", question: "What is the course name?", placeholder: "e.g., Marine Biology, Digital Art" });
    }
    
    steps.push({ id: "gradeLevels", kind: "chips",  question: "What grade level(s)?", chips: GRADE_LEVEL_CHIPS, multiSelect: true });
    steps.push({ id: "sourceDocuments", kind: "fileUpload", question: "Upload source documents? (optional \u2014 skip to continue)", optional: true });
    if (hasDocs) {
      steps.push({ id: "summarizerConfirm", kind: "summarizerConfirm", question: "I\u2019ve reviewed your documents." });
    }
    if (shouldAskTopic) {
      steps.push({ id: "topic", kind: "text", question: "What topic or lesson should this cover?", placeholder: "e.g., The French Revolution" });
    }
    if (shouldAskSubtopics) {
      steps.push({ id: "subtopics", kind: "text", question: "Any subtopics to focus on? (optional)", placeholder: "e.g., causes, effects, timeline", optional: true });
    }
    steps.push({ id: "assessmentType", kind: "chips", question: "What type of assessment?", chips: ASSESSMENT_CHIPS });

    // Adaptive format steps for structured types
    const STRUCTURED = new Set(["test", "quiz", "worksheet", "testReview", "bellRinger", "exitTicket"]);
    if (STRUCTURED.has(answers.assessmentType)) {
      steps.push({ id: "questionFormat", kind: "chips", question: "What question formats should this include?", chips: buildFormatChipsForSubjectGrade(answers.course, answers.gradeLevels ?? ""), multiSelect: true });

      const fmts = answers.questionFormat
        ? answers.questionFormat.split(",").map(s => normalizeQuestionFormatValue(s.trim()))
        : [];
      
      // Passage-based sub-steps
      if (fmts.includes("passageBased") || fmts.includes("passageExtendedResponse")) {
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
      if (answers.assessmentType === "test" || answers.assessmentType === "quiz" || answers.assessmentType === "worksheet")  {
        steps.push({ id: "standards", kind: "chips", question: "Standards alignment?", chips: STANDARDS_CHIPS });
        if (answers.standards === "state") {
          steps.push({ id: "stateCode", kind: "text", question: "Which state\u2019s standards?", placeholder: "e.g. GA" });
        }
      }
    }

    steps.push({ id: "studentLevel", kind: "chips", question: "What level is your class?", chips: LEVEL_CHIPS });
  }

  // ── Common tail (both flows) ──────────────────────────────────────────────
  steps.push({ id: "assignmentDuration", kind: "text", question: "How long should the assignment be? (in minutes)", placeholder: "e.g., 30", optional: false });
  steps.push({ id: "additionalDetails", kind: "text", question: "Any specific instructions? (optional)", placeholder: "e.g., Include vocabulary, focus on application", optional: true });
  steps.push({ id: "finalConfirm", kind: "finalConfirm", question: "Review & generate" });

  return steps;
}

// ── Document inference heuristic ──────────────────────────────────────────────

function inferFromDocuments(
  docs: UploadedDoc[],
): {
  inferred: Partial<Record<StepId, string>>;
  found: string[];
  highConfidence: boolean;
  status: "inferred" | "partial" | "unreadable" | "none";
} {
  const inferred: Partial<Record<StepId, string>> = {};
  const found: string[] = [];
  const unreadableDocs = docs.filter((doc) => doc.unreadable).length;
  const readableDocs = docs.length - unreadableDocs;

  if (docs.length > 0 && readableDocs === 0) {
    return {
      inferred,
      found,
      highConfidence: false,
      status: "unreadable",
    };
  }

  const raw = docs.map(d => d.content).join("\n").substring(0, 4000);
  const insights = analyzeDocumentText(raw);

  if (insights.flags.unreadable) {
    return {
      inferred,
      found,
      highConfidence: false,
      status: "unreadable",
    };
  }

  const inferredTopic = insights.metadata.topicCandidates[0]?.trim();
  const inferredSubtopics = insights.concepts.slice(0, 4).join(", ");
  const inferredKeywords = insights.vocab.slice(0, 6);
  const inferredFormulas = insights.formulas.slice(0, 3);

  if (inferredTopic && !inferred.topic) {
    inferred.topic = inferredTopic;
    found.push(`Topic: ${inferredTopic}`);
  }
  if (inferredSubtopics) {
    inferred.subtopics = inferredSubtopics;
    found.push(`Concepts: ${inferredSubtopics}`);
  }
  if (inferredKeywords.length > 0) {
    found.push(`Vocabulary: ${inferredKeywords.join(", ")}`);
  }
  if (inferredFormulas.length > 0) {
    found.push(`Formulas: ${inferredFormulas.join(", ")}`);
  }

  if (insights.metadata.gradeEstimate) {
    inferred.gradeLevels = insights.metadata.gradeEstimate;
    found.push(`Grade ${insights.metadata.gradeEstimate}`);
  }

  const courseFromSubject: Record<string, string> = {
    math: "math",
    science: "science",
    history: "socialStudies",
    english: "english",
  };
  if (insights.metadata.subjectEstimate && courseFromSubject[insights.metadata.subjectEstimate]) {
    inferred.course = courseFromSubject[insights.metadata.subjectEstimate];
    found.push(`Subject: ${insights.metadata.subjectEstimate}`);
  }

  // Grade level
  const gradeMatch = raw.match(/\b(?:grade|gr\.?)\s*(\d{1,2})\b/i);
  if (gradeMatch && !inferred.gradeLevels) { inferred.gradeLevels = gradeMatch[1]; found.push(`Grade ${gradeMatch[1]}`); }

  // Subject
  const subjects = ["Math", "English", "Science", "History", "Social Studies", "Biology", "Chemistry", "Physics", "Algebra", "Geometry", "Calculus"];
  for (const subj of subjects) {
    if (!inferred.course && new RegExp(`\\b${subj}\\b`, "i").test(raw)) { inferred.course = subj; found.push(subj); break; }
  }

  // Assessment type
  const typeMap: Record<string, string> = { quiz: "quiz", test: "test", worksheet: "worksheet", "exit ticket": "exitTicket", "bell ringer": "bellRinger" };
  for (const [keyword, value] of Object.entries(typeMap)) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(raw)) { inferred.assessmentType = value; found.push(keyword); break; }
  }

  // Topic — first non-empty line
  const firstLine = raw.split("\n").map(l => l.trim()).filter(l => l.length > 3 && l.length < 90)[0] ?? "";
  if (!inferred.topic && firstLine) { inferred.topic = firstLine; found.push(`"${firstLine}"`); }

  // Student level
  if (/\b(advanced\s*placement|\bAP\b)/i.test(raw))  { inferred.studentLevel = "AP";       found.push("AP level"); }
  else if (/\bhonors\b/i.test(raw))                    { inferred.studentLevel = "Honors";   found.push("Honors level"); }
  else if (/\bremedial\b/i.test(raw))                  { inferred.studentLevel = "Remedial"; found.push("Remedial level"); }

  const topicConfidence = Number(insights.confidence?.metadata ?? 0);
  const semanticConfidence = Number(insights.confidence?.semantics ?? 0);
  const highConfidence =
    unreadableDocs === 0 &&
    topicConfidence >= 0.6 &&
    semanticConfidence >= 0.6 &&
    Boolean(inferred.topic) &&
    (insights.concepts.length >= 2 || insights.metadata.topicCandidates.length >= 2);

  const hasInferredValues = Object.keys(inferred).length > 0;
  const status = hasInferredValues
    ? unreadableDocs > 0
      ? "partial"
      : "inferred"
    : unreadableDocs > 0
      ? "partial"
      : "none";

  return { inferred, found, highConfidence, status };
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
      const normalized = normalizeQuestionFormatValue(t[0]);
      const found = QUESTION_FORMAT_CHIPS.find(c => c.value === normalized);
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
  const [expandedGroups,  setExpandedGroups]  = useState<Set<string>>(() => new Set());
  const [multiPart,       setMultiPart]       = useState(origMultiPart);
  const [grade,           setGrade]           = useState(origGrade);
  const [difficulty,      setDifficulty]      = useState(origDifficulty);
  const [standards,       setStandards]       = useState(origStandards);
  const [stateCode,       setStateCode]       = useState("");
  const [hoverPreview, setHoverPreview] = useState<ProblemHoverPreview | null>(null);

  useEffect(() => {
    triggerWindowAutoAdjust();
  }, [selectedFormats]);

  // Chips filtered to subject + current grade; reacts to grade changes inside card
  const activeFormatChips = buildFormatChipsForSubjectGrade(courseName, grade);

  function showHoverPreview(
    formatId: string,
    event: React.MouseEvent<HTMLButtonElement>,
    pacingText?: string
  ) {
    const details = getProblemExamples(normalizeQuestionFormatValue(formatId));
    if (!details || details.examples.length === 0) return;
    setHoverPreview({
      title: details.title,
      example: details.examples[0],
      pacing: pacingText,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function hideHoverPreview() {
    setHoverPreview(null);
  }

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

  function SelectDropdown<T extends string>({
    value, options, onChange, label,
  }: { value: T; options: Array<{ label: string; value: T }>; onChange: (v: T) => void; label?: string }) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        title={label}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          border: "1px solid var(--border-color,#e5e7eb)",
          borderRadius: "5px",
          fontSize: "0.9rem",
          backgroundColor: "var(--surface-primary,#ffffff)",
          color: "var(--text-primary,#1f2937)",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "1.2em 1.2em",
          paddingRight: "2.5rem",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
          <SelectDropdown value={assessmentType} options={ASSESSMENT_CHIPS} onChange={setAssessmentType} label="Assessment type" />
        </div>

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Question formats <span style={{ fontWeight: 400, color: "var(--text-secondary, #9ca3af)" }}>(pick all that apply)</span></span>
          <div style={{ marginTop: "0.35rem", marginBottom: "0.55rem", fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>
            Tip: hover any format to preview a sample question.
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
            <button
              type="button"
              className="ca-chip ca-chip--sm"
              onClick={() => {
                if (disabled) return;
                const available = new Set(activeFormatChips.map((chip) => chip.value));
                setSelectedFormats(getRecommendedQuestionFormats(assessmentType, available));
                triggerWindowAutoAdjust();
              }}
              disabled={disabled}
            >
              Use Recommended Mix
            </button>
            <button
              type="button"
              className="ca-chip ca-chip--sm"
              onClick={() => {
                if (disabled) return;
                setSelectedFormats([]);
                triggerWindowAutoAdjust();
              }}
              disabled={disabled}
            >
              Clear Formats
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {((): React.ReactNode[] => {
              const grouped = new Map<string, typeof activeFormatChips>();
              const groupNames: string[] = [];
              for (const chip of activeFormatChips) {
                const g = chip.group || "Standalone";
                if (!grouped.has(g)) {
                  grouped.set(g, []);
                  groupNames.push(g);
                }
                grouped.get(g)!.push(chip);
              }
              return groupNames.map(groupName => {
                const isExpanded = expandedGroups.has(groupName);
                const groupChips = grouped.get(groupName) || [];
                return (
                  <div key={groupName}>
                    <button
                      type="button"
                      onClick={() => setExpandedGroups(prev => {
                        const next = new Set(prev);
                        if (next.has(groupName)) next.delete(groupName);
                        else next.add(groupName);
                        return next;
                      })}
                      disabled={disabled}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ display: "inline-block", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", fontSize: "0.75rem", lineHeight: 1 }}>▼</span>
                      {groupName}
                    </button>
                    {isExpanded && (
                      <div style={{ paddingLeft: "0.5rem", marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {groupChips.map(o => {
                          const pacingKey = FORMAT_PACING_KEY[o.value];
                          const sec = pacingKey ? DEFAULT_PACING_SECONDS[pacingKey] : null;
                          const isSelected = selectedFormats.includes(o.value);
                          const pacingText = sec ? fmtPacingTime(sec) : undefined;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              className={`ca-chip ca-chip--sm${isSelected ? " ca-chip--selected" : ""}`}
                              onClick={() => {
                                if (disabled) return;
                                setSelectedFormats(prev =>
                                  prev.includes(o.value) ? prev.filter(v => v !== o.value) : [...prev, o.value]
                                );
                                triggerWindowAutoAdjust();
                              }}
                              onMouseEnter={(event) => showHoverPreview(o.value, event, pacingText)}
                              onMouseMove={(event) => showHoverPreview(o.value, event, pacingText)}
                              onMouseLeave={hideHoverPreview}
                              disabled={disabled}
                            >
                              {o.label}{sec ? <span style={{ opacity: 0.7, fontSize: "0.7rem", marginLeft: "0.3rem" }}>({fmtPacingTime(sec)})</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {selectedFormats.length > 0 && (
          <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem", color: "#374151" }}>Examples of selected types:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {selectedFormats.map(fmt => {
                const examples = getProblemExamples(fmt);
                if (!examples) return null;
                return (
                  <div key={fmt}>
                    <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "#1f2937", marginBottom: "0.5rem" }}>{examples.title}</div>
                    <ul style={{ margin: "0", paddingLeft: "1.5rem", fontSize: "0.8rem", color: "#6b7280", lineHeight: "1.5" }}>
                      {examples.examples.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="ca-inline-field">
          <span className="ca-inline-field__label">Multi-part</span>
          <SelectDropdown
            value={multiPart ? "yes" : "no"}
            options={MULTI_PART_CHIPS}
            onChange={(v) => setMultiPart(v === "yes")}
            label="Multi-part questions"
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
            <SelectDropdown value={standards} options={STANDARDS_CHIPS} onChange={setStandards} label="Standards alignment" />
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
          <SelectDropdown
            value={difficulty}
            options={LEVEL_CHIPS}
            onChange={(v) => setDifficulty(v as typeof difficulty)}
            label="Student level & difficulty"
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

      {hoverPreview && <ProblemHoverPreviewCard preview={hoverPreview} />}
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
  const formats  = (answers.questionFormat || courseDefaults?.questionTypes.join(",") || "multipleChoice")
    .split(",").map(s => s.trim()).filter(Boolean)
    .map(normalizeQuestionFormatValue)
    .filter(f => f !== "mixed"); // Exclude "mixed" for realistic count

  // Skip feasibility check for arithmetic fluency (not topically dense)
  if (formats.length === 1 && formats[0] === "arithmeticFluency") {
    return null;
  }

  // Skip feasibility check if user has customized assignment duration
  // (they've already made conscious choices about time/questions in the mix preview)
  const hasCustomDuration = !!answers.assignmentDuration && 
    parseInt(answers.assignmentDuration, 10) !== (courseDefaults?.estimatedMinutes ?? 30);
  if (hasCustomDuration) {
    return null;
  }

  if (!topic) return null;

  const level    = answers.studentLevel || courseDefaults?.typicalDifficulty || "standard";
  const bloom    = LEVEL_TO_BLOOM[level] ?? "apply";

  // Only run feasibility check if using defaults
  const assessmentType = answers.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz";
  const pacingDefaults = courseDefaults?.pacingDefaults ?? { assessmentDurationMinutes: {}, questionTypeSeconds: {} };
  const durationMinutes = pacingDefaults.assessmentDurationMinutes[assessmentType] ?? 30;
  const primaryFormat = formats[0] || courseDefaults?.questionTypes[0] || "multipleChoice";
  const pacingKey = FORMAT_PACING_KEY[primaryFormat] || primaryFormat;
  const avgSecPerQuestion = pacingDefaults.questionTypeSeconds[pacingKey] ?? DEFAULT_PACING_SECONDS[pacingKey] ?? 60;
  const reqCount = Math.ceil((durationMinutes * 60) / avgSecPerQuestion);

  // After computing reqCount
// Surface-aware ceilings for heavy formats
const HEAVY_FORMATS = ["passageBased", "frq", "dbq", "essay"];
let adjustedReqCount = reqCount;


if (HEAVY_FORMATS.includes(primaryFormat)) {
  switch (assessmentType) {
    case "exitTicket":
      adjustedReqCount = Math.min(adjustedReqCount, 1);
      break;
    case "worksheet":
      adjustedReqCount = Math.min(adjustedReqCount, 2);
      break;
    case "quiz":
      adjustedReqCount = Math.min(adjustedReqCount, 3);
      break;
    case "test":
      adjustedReqCount = Math.min(adjustedReqCount, 4);
      break;
    default:
      adjustedReqCount = Math.min(adjustedReqCount, 2);
  }
}


  const report = evaluateFeasibility({
    topic,
    additionalDetails: details || null,
    sourceDocuments:   null,
    requestedSlotCount: adjustedReqCount,
    questionTypes:     formats,
    depthFloor:        "remember",
    depthCeiling:      bloom,
  });

  if (report.riskLevel === "safe") return null;

  const COLOR = {
    caution:  { bg: "#fef3c7",  border: "#d97706",  fg: "#78350f"  },
    high:     { bg: "#fef3c7",  border: "#f59e0b",  fg: "#78350f"  },
    overload: { bg: "#fecaca", border: "#dc2626",  fg: "#7f1d1d"  },
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
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
          You can still generate — the system will adjust automatically if needed.
        </p>
    </div>
  );
}

// ── QuestionMixPreview ──────────────────────────────────────────────────────────
//
// Shows a breakdown of selected question types with estimated counts and time.
// Allows teachers to adjust the distribution and see real-time impact.

interface QuestionMixEntry {
  type: string;
  label: string;
  secondsPerQuestion: number;
  count: number;
  totalSeconds: number;
}

function QuestionMixPreview({
  answers, courseDefaults, disabled, timeAdjustments, onTimeAdjust,
}: {
  answers: Record<StepId, string>;
  courseDefaults: ResolvedCourseDefaults | null;
  disabled: boolean;
  timeAdjustments: Record<string, number>;
  onTimeAdjust: (type: string, seconds: number) => void;
}) {
  const selectedFormats = (answers.questionFormat || courseDefaults?.questionTypes.join(",") || "multipleChoice")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeQuestionFormatValue)
    .filter(f => f !== "mixed"); // Exclude "mixed" — it means AI chooses
  
  const isMixedFormat = (answers.questionFormat || "").includes("mixed");
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const pacingDefaults = courseDefaults?.pacingDefaults ?? {
    assessmentDurationMinutes: {},
    questionTypeSeconds: {},
  };
  
  const assessmentType = answers.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz";
  const defaultMinutes = pacingDefaults.assessmentDurationMinutes[assessmentType] ?? 30;
  const totalMinutes = answers.assignmentDuration ? parseInt(answers.assignmentDuration, 10) || defaultMinutes : defaultMinutes;
  const totalSeconds = totalMinutes * 60;

  // If mixed format or no specific formats selected, show simple message
  if (isMixedFormat || selectedFormats.length === 0) {
    return (
      <div style={{
        margin: "1rem 0",
        padding: "0.85rem",
        borderRadius: "8px",
        border: "1px solid var(--border-color,#e5e7eb)",
        background: "var(--surface-secondary,#f9fafb)",
        fontSize: "0.85rem",
        color: "var(--text-primary,#1f2937)",
      }}>
        <div style={{ fontWeight: 500, marginBottom: "0.75rem" }}>
          📊 Question Mix
        </div>
        <div style={{
          padding: "0.75rem",
          borderRadius: "5px",
          background: "var(--surface-primary,#ffffff)",
          fontSize: "0.9rem",
          color: "var(--text-primary,#1f2937)",
        }}>
          <strong>AI will choose</strong> the best mix of question formats for {totalMinutes} minutes (~{Math.max(2, Math.ceil((totalSeconds / 60)))}-{Math.ceil((totalSeconds / 45))} questions).
        </div>
      </div>
    );
  }

  // Build mix entries
  const mix: QuestionMixEntry[] = useMemo(() => {
    if (selectedFormats.length === 0) return [];
    
    // Get pacing seconds for each format (using adjustments if available)
    const entries = selectedFormats.map(fmt => {
      const mapKey = FORMAT_PACING_KEY[fmt] || fmt;
      const defaultSecPerQ = pacingDefaults.questionTypeSeconds[mapKey] ?? DEFAULT_PACING_SECONDS[mapKey] ?? 60;
      const secPerQ = timeAdjustments[fmt] ?? defaultSecPerQ;
      const chipLabel = QUESTION_FORMAT_CHIPS.find(c => c.value === fmt)?.label || fmt;
      return { type: fmt, label: chipLabel, secondsPerQuestion: secPerQ };
    });

    // Distribute questions evenly across selected types
    const avgSecPerQ = entries.reduce((sum, e) => sum + e.secondsPerQuestion, 0) / entries.length;
    const avgQuestionsTarget = Math.max(2, Math.floor(totalSeconds / avgSecPerQ));
    
    // Simple equal distribution (can be enhanced with adjusters later)
    const perType = Math.floor(avgQuestionsTarget / entries.length);
    const remainder = avgQuestionsTarget % entries.length;

    return entries.map((e, idx) => {
      const baseCount = perType + (idx < remainder ? 1 : 0);
      const adjustedCount = adjustments[e.type] ?? baseCount;
      return ({
        ...e,
        count: Math.max(1, adjustedCount),
        totalSeconds: Math.max(1, adjustedCount) * e.secondsPerQuestion,
      });
    });
  }, [selectedFormats, pacingDefaults, totalSeconds, adjustments, timeAdjustments]);

  const totalEstimatedSeconds = mix.reduce((sum, e) => sum + e.totalSeconds, 0);
  const totalEstimatedMinutes = Math.round(totalEstimatedSeconds / 60);
  const totalQuestions = mix.reduce((sum, e) => sum + e.count, 0);
  const isOverBudget = totalEstimatedSeconds > totalSeconds;

  if (mix.length === 0) return null;

  return (
    <div style={{
      margin: "1rem 0",
      padding: "0.85rem",
      borderRadius: "8px",
      border: `1px solid ${isOverBudget ? "var(--adp-warn-fg,#d97706)" : "var(--border-color,#e5e7eb)"}`,
      background: isOverBudget ? "var(--adp-warn-bg,#fffbeb)" : "var(--surface-secondary,#f9fafb)",
      fontSize: "0.85rem",
    }}>
      <div style={{ fontWeight: 500, marginBottom: "0.75rem", color: "var(--text-primary,#1f2937)" }}>
        📊 Question Mix Preview
      </div>

      {/* Question breakdown table with adjusters */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem", background: "var(--surface-primary,#ffffff)", borderRadius: "6px", overflow: "hidden" }}>
        <thead>
          <tr style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary,#1f2937)", textAlign: "left", background: "var(--surface-secondary,#f3f4f6)", borderBottom: "2px solid var(--border-color,#e5e7eb)" }}>
            <th style={{ padding: "0.6rem 0.5rem 0.6rem 0", textAlign: "left" }}>Type</th>
            <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}># Questions</th>
            <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Time/Q</th>
            <th style={{ padding: "0.6rem 0.5rem 0.6rem 0.5rem", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {mix.map((entry, idx) => {
            const totalStr = entry.totalSeconds < 60
              ? `${entry.totalSeconds}s`
              : `${(entry.totalSeconds / 60).toFixed(1)}m`;
            return (
              <tr key={entry.type} style={{ 
                borderBottom: idx < mix.length - 1 ? "1px solid var(--border-color,#e5e7eb)" : "none", 
                color: "var(--text-primary,#1f2937)",
                transition: "background-color 0.15s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-secondary,#f9fafb)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}>
                <td style={{ padding: "0.55rem 0.5rem 0.55rem 0", fontSize: "0.8rem", color: "var(--text-primary,#1f2937)", fontWeight: 500 }}>{entry.label}</td>
                <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", color: "var(--text-primary,#1f2937)" }}>
                  <input
                    type="number"
                    min="1"
                    value={entry.count}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, [entry.type]: parseInt(e.target.value, 10) || 1 }))}
                    disabled={disabled}
                    style={{
                      width: "3.2rem",
                      padding: "0.35rem 0.4rem",
                      border: "2px solid var(--border-color,#d1d5db)",
                      borderRadius: "4px",
                      textAlign: "right",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--text-primary,#1f2937)",
                      background: "var(--surface-primary,#ffffff)",
                      cursor: disabled ? "not-allowed" : "text",
                      opacity: disabled ? 0.6 : 1,
                    }}
                  />
                </td>
                <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", color: "var(--text-primary,#1f2937)" }}>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={entry.secondsPerQuestion}
                    onChange={(e) => {
                      const newSeconds = parseInt(e.target.value, 10) || 60;
                      onTimeAdjust(entry.type, newSeconds);
                    }}
                    disabled={disabled}
                    title="Edit time per question in seconds"
                    style={{
                      width: "3.2rem",
                      padding: "0.35rem 0.4rem",
                      border: "2px solid var(--border-color,#d1d5db)",
                      borderRadius: "4px",
                      textAlign: "right",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--text-primary,#1f2937)",
                      background: "var(--surface-primary,#ffffff)",
                      cursor: disabled ? "not-allowed" : "text",
                      opacity: disabled ? 0.6 : 1,
                    }}
                  />
                  <span style={{ marginLeft: "0.25rem", fontSize: "0.7rem", color: "var(--text-secondary,#6b7280)" }}>s</span>
                </td>
                <td style={{ padding: "0.55rem 0.5rem 0.55rem 0.5rem", textAlign: "right", fontSize: "0.78rem", color: "var(--text-primary,#1f2937)", fontWeight: 500 }}>{totalStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary bar */}
      <div style={{
        padding: "0.5rem",
        borderRadius: "5px",
        background: "var(--surface-primary,#ffffff)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "0.5rem",
        fontSize: "0.8rem",
      }}>
        <div>
          <div style={{ color: "var(--text-secondary,#6b7280)" }}>Total questions</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary,#1f2937)", fontSize: "1rem" }}>{totalQuestions}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-secondary,#6b7280)" }}>Est. time</div>
          <div style={{ fontWeight: 600, color: isOverBudget ? "var(--adp-warn-fg,#d97706)" : "var(--text-primary,#1f2937)", fontSize: "1rem" }}>
            ~{totalEstimatedMinutes}m
          </div>
        </div>
        <div>
          <div style={{ color: "var(--text-secondary,#6b7280)" }}>Budget</div>
          <div style={{ fontWeight: 600, color: isOverBudget ? "var(--adp-warn-fg,#d97706)" : "var(--adp-success-fg,#16a34a)", fontSize: "1rem" }}>
            {isOverBudget ? `+${totalEstimatedMinutes - totalMinutes}m` : `${totalMinutes - totalEstimatedMinutes}m left`}
          </div>
        </div>
      </div>

      {isOverBudget && (
        <p style={{ fontSize: "0.75rem", color: "var(--adp-warn-fg,#d97706)", margin: "0.5rem 0 0" }}>
          ⚠ Questions exceed time budget. Consider reducing counts or extending time.
        </p>
      )}
    </div>
  );
}

// ── FinalConfirmCard ─────────────────────────────────────────────────────────

interface Override { field: string; from: string; to: string }

function FinalConfirmCard({
  answers, courseDefaults, overrides, estimatedMinutes, docsCount,
  onGenerate, onBack, onUpdateDefaults, defaultsUpdateApplied, disabled, timeAdjustments, onTimeAdjust,
}: {
  answers: Record<StepId, string>; courseDefaults: ResolvedCourseDefaults | null;
  overrides: Override[]; estimatedMinutes: number; docsCount: number;
  onGenerate: () => void; onBack: () => void;
  onUpdateDefaults?: () => void; defaultsUpdateApplied: boolean; disabled: boolean;
  timeAdjustments: Record<string, number>;
  onTimeAdjust: (type: string, seconds: number) => void;
}) {
  // Auto-update defaults if there are overrides
  useEffect(() => {
    if (overrides.length > 0 && onUpdateDefaults && !defaultsUpdateApplied) {
      onUpdateDefaults();
    }
  }, [overrides, onUpdateDefaults, defaultsUpdateApplied]);
  const effectiveType  = answers.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz";
  const effectiveFmt   = answers.questionFormat  || courseDefaults?.questionTypes.slice(0,2).join(", ") || "mixed";
  const effectiveLevel = answers.studentLevel    || courseDefaults?.typicalDifficulty || "standard";
  const effectiveStds  = answers.standards       || courseDefaults?.standards         || "none";
  const effectiveMult  = answers.multiPartQuestions === "yes" ? "Allowed"
    : answers.multiPartQuestions === "no" ? "Standalone"
    : courseDefaults?.multiPartAllowed ? "Allowed" : "Standalone";
  const gradeBand = courseDefaults?.gradeBand || answers.gradeLevels || "\u2014";
  const effectiveDuration = answers.assignmentDuration || `${courseDefaults?.estimatedMinutes ?? 30}`;
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
    { label: "Duration",         value: `${effectiveDuration} min` },
    { label: "Est. time",        value: `~${estimatedMinutes} min` },
    ...(docsCount > 0 ? [{ label: "Source docs", value: `${docsCount} file${docsCount !== 1 ? "s" : ""}` }] : []),
  ];
  return (
    <div className="ca-final-card">
      <p className="ca-final-card__headline">Here&rsquo;s what I&rsquo;ll use to build your assessment.</p>
      <table className="ca-defaults-table"><tbody>
        {rows.map((r) => <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>)}
      </tbody></table>

      {defaultsUpdateApplied && (
        <p style={{ fontSize: "0.8rem", color: "var(--adp-success-fg,#16a34a)", margin: "0.5rem 0 0.75rem" }}>
          ✓ Preferences saved for {answers.course}.
        </p>
      )}

<QuestionMixPreview answers={answers} courseDefaults={courseDefaults} disabled={disabled} timeAdjustments={timeAdjustments} onTimeAdjust={onTimeAdjust} />

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
  courseCustom:         "",
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
  assignmentDuration:   "",
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
  /** Called when teacher clicks "Start over" to reset the entire form. */
  onReset?: () => void;
  /** When true, skips course pre-fill from profile so the form starts fully blank. */
  forceBlank?: boolean;
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
  onReset,
  forceBlank = false,
}: ConversationalAssessmentProps) {
  useEffect(() => { commitRef.current = commitAnswer; });
  const isBlocked = isLoading || disabled;

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const docInferredRef = useRef<Partial<Record<StepId, string>>>({});
  const [defaultsUpdateApplied, setDefaultsUpdateApplied] = useState(false);
  const [docSummaryMessage, setDocSummaryMessage] = useState<string | null>(null);
  const [docInferenceHighConfidence, setDocInferenceHighConfidence] = useState(false);
  const [expandedChipGroups, setExpandedChipGroups] = useState<Set<string>>(() => new Set());
  const commitRef = useRef<(value: string) => void>(() => {});

  // Pre-fill course with the most recently added course profile (last in array)
  const lastCourse =
    !forceBlank && teacherProfile?.courseProfiles?.length
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
      const allSteps = buildSteps(hasP, merged, false, false);
      return Math.max(0, allSteps.length - 1);
    }
    // If a course is pre-filled from the profile, start at the topic step
    if (!forceBlank && teacherProfile?.courseProfiles?.length && lastCourse) return 1;
    return 0;
  });

  const [inputValue, setInputValue] = useState(() => initialAnswers?.additionalDetails ?? "");
  const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
  const [timeAdjustments, setTimeAdjustments] = useState<Record<string, number>>({});
  const [timeAdjustmentScopes, setTimeAdjustmentScopes] = useState<Record<string, "assessment" | "default">>({});
  const [hoverPreview, setHoverPreview] = useState<ProblemHoverPreview | null>(null);
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
  // BUT: preserve any answers the user has already selected (don't overwrite them).
  const prevDefaultsCourseRef = useRef<string>("");
  useEffect(() => {
    if (!courseDefaults || answers.course === prevDefaultsCourseRef.current) return;
    prevDefaultsCourseRef.current = answers.course;
    setAnswers(prev => ({
      ...prev,
      assessmentType:     prev.assessmentType || (courseDefaults.assessmentTypes[0] ?? "quiz"),
      questionFormat:     prev.questionFormat || courseDefaults.questionTypes.join(","),
      multiPartQuestions: prev.multiPartQuestions || (courseDefaults.multiPartAllowed ? "yes" : "no"),
      studentLevel:       prev.studentLevel || (courseDefaults.typicalDifficulty ?? "standard"),
      gradeLevels:        prev.gradeLevels || (courseDefaults.gradeBand ?? ""),
    }));
  }, [answers.course, courseDefaults]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dynamic step list ─────────────────────────────────────────────────────
  const steps: Step[] = useMemo(
    () => buildSteps(hasProfile, answers, uploadedDocs.length > 0, docInferenceHighConfidence),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasProfile, answers.course, answers.assessmentType, answers.standards,
     answers.questionFormat, answers.passageSource, answers.defaultsCard,
      answers.overrideField, uploadedDocs.length, docInferenceHighConfidence],
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
    // Only keep values that are valid chip options — this prevents stale profile
    // defaults (which may use different naming conventions) from polluting the
    // buffer and making it impossible to clear them by choosing fresh chips.
    if (currentStep?.multiSelect && answers[currentStep.id]) {
      const validValues = new Set(currentStep.chips?.map(c => c.value) ?? []);
      const seeded = answers[currentStep.id]
        .split(",")
        .map(s => s.trim())
        .filter(v => v && validValues.has(v));
      setMultiSelectBuffer(seeded);
    } else {
      setMultiSelectBuffer([]);
    }
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset expanded chip groups when navigating to a different step
  useEffect(() => {
    setExpandedChipGroups(new Set());
  }, [stepIndex]);
  
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
    
    // Use custom course name if "other" was selected
    const effectiveCourse = next.course === "other" ? next.courseCustom : next.course;
    
    return {
      gradeLevels:        effectiveGrade.split(",").map(g => g.trim()).filter(Boolean),
      course:             effectiveCourse,
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
    check("Duration",         `${d.estimatedMinutes} min`,            next.assignmentDuration ? `${next.assignmentDuration} min` : "");
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
    if (next.questionFormat) base.questionTypes = next.questionFormat.split(",").map(s => s.trim()) as import("@/types/teacherProfile").CourseProfile["questionTypes"];
    if (next.multiPartQuestions) base.multiPartAllowed = next.multiPartQuestions === "yes";
    if (next.studentLevel) base.typicalDifficulty = next.studentLevel as "remedial" | "standard" | "honors" | "AP";
    
    // Update pacing defaults if assignmentDuration is provided
    if (next.assignmentDuration && /^\d+$/.test(next.assignmentDuration)) {
      const newMinutes = parseInt(next.assignmentDuration, 10);
      const aType = next.assessmentType || courseDefaults?.assessmentTypes[0] || "quiz";
      base.pacingDefaults = {
        ...base.pacingDefaults,
        assessmentDurationMinutes: {
          ...base.pacingDefaults.assessmentDurationMinutes,
          [aType]: newMinutes,
        },
      };
    }
    
    // Update time per question only for edits explicitly marked as defaults.
    const defaultScopedAdjustments = Object.entries(timeAdjustments).reduce((acc, [type, seconds]) => {
      if (timeAdjustmentScopes[type] !== "default") return acc;
      const mapKey = FORMAT_PACING_KEY[type] || type;
      acc[mapKey] = seconds;
      return acc;
    }, {} as Record<string, number>);
    if (Object.keys(defaultScopedAdjustments).length > 0) {
      base.pacingDefaults = {
        ...base.pacingDefaults,
        questionTypeSeconds: {
          ...base.pacingDefaults.questionTypeSeconds,
          ...defaultScopedAdjustments,
        },
      };
    }
    
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

    let nextDocInferenceHighConfidence = docInferenceHighConfidence;

    // Document inference
    if (currentStep.id === "sourceDocuments" && uploadedDocs.length > 0) {
      const { inferred, found, highConfidence, status } = inferFromDocuments(uploadedDocs);
      docInferredRef.current = inferred;
      setDocInferenceHighConfidence(highConfidence);
      nextDocInferenceHighConfidence = highConfidence;
      next = { ...next, ...inferred };
      setDocSummaryMessage(
        status === "unreadable"
          ? "I couldn't extract readable text from your document - it may be scanned or encoded. I'll continue without auto-filling topic or subtopics."
          : status === "partial"
            ? found.length > 0
              ? `\ud83d\udcc4 I extracted some readable text, but parts of your document${uploadedDocs.length !== 1 ? "s" : ""} appear scanned or encoded. I pre-filled what I could: ${found.join(" \u00b7 ")}.`
              : "I extracted some readable text, but parts of your document appear scanned or encoded. I'll continue by asking for anything still missing."
            : found.length > 0
              ? `\ud83d\udcc4 From your document${uploadedDocs.length !== 1 ? "s" : ""} I found: ${found.join(" \u00b7 ")}. I've pre-filled those - I'll only ask what's still missing.`
              : `\ud83d\udcc4 I couldn't pull specifics from the file${uploadedDocs.length !== 1 ? "s" : ""}, but I'll use its content when writing questions.`,
      );
    }

    setAnswers(next);
    setInputValue("");

    // Recompute steps with updated answers to find the right next index.
    const newSteps = buildSteps(hasProfile, next, uploadedDocs.length > 0, nextDocInferenceHighConfidence);

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

    if (currentStep?.id === "questionFormat") {
      triggerWindowAutoAdjust();
    }
  };

  const showHoverPreview = useCallback(
    (formatId: string, event: React.MouseEvent<HTMLButtonElement>) => {
      if (currentStep?.id !== "questionFormat") return;

      const normalized = normalizeQuestionFormatValue(formatId);
      const details = getProblemExamples(normalized);
      if (!details || details.examples.length === 0) return;

      const pacingKey = FORMAT_PACING_KEY[normalized] || FORMAT_PACING_KEY[formatId];
      const pacingSeconds = pacingKey ? DEFAULT_PACING_SECONDS[pacingKey] : null;

      setHoverPreview({
        title: details.title,
        example: details.examples[0],
        pacing: pacingSeconds ? fmtPacingTime(pacingSeconds) : undefined,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [currentStep?.id]
  );

  const hideHoverPreview = useCallback(() => {
    setHoverPreview(null);
  }, []);

  const handleMultiSelectConfirm = () => {
    if (multiSelectBuffer.length > 0) commitAnswer(multiSelectBuffer.join(","));
  };

  const handleTimeAdjust = useCallback((type: string, seconds: number) => {
    const normalizedSeconds = Math.max(1, Math.floor(seconds || 0));
    const existingScope = timeAdjustmentScopes[type];
    const chosenScope = existingScope ?? (
      window.confirm(
        "Apply this time change as your new default for this question type?\n\nClick OK to update defaults.\nClick Cancel to use it only for this assessment."
      ) ? "default" : "assessment"
    );

    setTimeAdjustments(prev => ({ ...prev, [type]: normalizedSeconds }));
    setTimeAdjustmentScopes(prev => ({
      ...prev,
      [type]: chosenScope,
    }));
  }, [timeAdjustmentScopes]);

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
        try {
          const insights = await analyzeDocument(file);
          return {
            id: crypto.randomUUID(),
            name: file.name,
            content: insights.rawText,
            unreadable: insights.flags.unreadable,
          };
        } catch {
          const content = await file.text().catch(() => "");
          return { id: crypto.randomUUID(), name: file.name, content, unreadable: !content.trim() };
        }
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
                    ? answers[step.id]
                        .split(",")
                        .map(v => normalizeQuestionFormatValue(v.trim()))
                        .map(v => step.chips!.find(c => c.value === v)?.label ?? v)
                        .join(", ")
                    : step.chips
                      ? (step.chips.find(c => c.value === normalizeQuestionFormatValue(answers[step.id]))?.label ?? answers[step.id])
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
                estimatedMinutes={answers.assignmentDuration ? parseInt(answers.assignmentDuration, 10) : (courseDefaults?.estimatedMinutes ?? 30)}
                docsCount={uploadedDocs.length}
                disabled={isBlocked}
                onGenerate={() => commitAnswer("generate")}
                onBack={() => handleBack()}
                onUpdateDefaults={onUpdateDefaults ? () => handleApplyOverrides(answers) : undefined}
                defaultsUpdateApplied={defaultsUpdateApplied}
                timeAdjustments={timeAdjustments}
                onTimeAdjust={handleTimeAdjust}
              />
            )}

            {/* Chip row for current chip-step */}
            {idx === stepIndex && step.kind === "chips" && step.chips && (
              <div className="ca-chips">
                {(() => {
                  // Check if chips have grouping (group property)
                  const hasGrouping = step.chips!.some(c => c.group !== undefined);
                  
                  if (hasGrouping) {
                    // Grouped rendering (collapsible groups)
                    const grouped = new Map<string, typeof step.chips>();
                    const groupNames: string[] = [];
                    for (const chip of step.chips!) {
                      const g = chip.group || "Standalone";
                      if (!grouped.has(g)) {
                        grouped.set(g, []);
                        groupNames.push(g);
                      }
                      grouped.get(g)!.push(chip);
                    }
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                        {groupNames.map(groupName => {
                          const isExpanded = expandedChipGroups.has(groupName);
                          const groupChips = grouped.get(groupName) || [];
                          return (
                            <div key={groupName}>
                              <button
                                type="button"
                                onClick={() => setExpandedChipGroups(prev => {
                                  const next = new Set(prev);
                                  if (next.has(groupName)) next.delete(groupName);
                                  else next.add(groupName);
                                  return next;
                                })}
                                disabled={isBlocked}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.5rem 0.75rem",
                                  background: "var(--surface-primary,#ffffff)",
                                  border: "1px solid var(--border-color,#e5e7eb)",
                                  borderRadius: "0.375rem",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  width: "100%",
                                  textAlign: "left",
                                  color: "var(--text-primary,#1f2937)",
                                }}
                              >
                                <span style={{ display: "inline-block", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", fontSize: "0.75rem", lineHeight: 1 }}>▼</span>
                                {groupName}
                              </button>
                              <div
                                style={{
                                  paddingLeft: "0.5rem",
                                  marginTop: "0.5rem",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "0.5rem",
                                  maxHeight: isExpanded ? "1000px" : "0px",
                                  overflow: "hidden",
                                  opacity: isExpanded ? 1 : 0,
                                  transition: "max-height 0.3s ease, opacity 0.3s ease",
                                }}
                              >
                                {groupChips.map(chip => (
                                  <button
                                    key={chip.value}
                                    type="button"
                                    className={`ca-chip ca-chip--sm${
                                      step.multiSelect
                                        ? multiSelectBuffer.includes(chip.value) ? " ca-chip--selected" : ""
                                        : answers[step.id] === chip.value       ? " ca-chip--selected" : ""
                                    }`}
                                    onClick={() => handleChipClick(chip.value)}
                                    disabled={isBlocked}
                                    onMouseEnter={(event) => showHoverPreview(chip.value, event)}
                                    onMouseMove={(event) => showHoverPreview(chip.value, event)}
                                    onMouseLeave={hideHoverPreview}
                                  >
                                    {chip.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    // Flat rendering (no groups)
                    return step.chips!.map(chip => (
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
                        onMouseEnter={(event) => showHoverPreview(chip.value, event)}
                        onMouseMove={(event) => showHoverPreview(chip.value, event)}
                        onMouseLeave={hideHoverPreview}
                      >
                        {chip.label}
                      </button>
                    ));
                  }
                })()}
                
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
                {/* Single-select: when a value is already pre-selected from defaults,
                    show a confirm button so the teacher knows they can continue. */}
                {!step.multiSelect && answers[step.id] && (
                  <button
                    type="button"
                    className="ca-chip ca-chip--confirm"
                    onClick={() => commitAnswer(answers[step.id])}
                    disabled={isBlocked}
                  >
                    {"\u2713"} Confirm &rarr;
                  </button>
                )}

                {/* Show examples when question formats are selected */}
                {step.id === "questionFormat" && (() => {
                  const selectedFormats = step.multiSelect
                    ? multiSelectBuffer
                    : answers[step.id]
                    ? answers[step.id]
                        .split(",")
                        .map(s => normalizeQuestionFormatValue(s.trim()))
                        .filter(Boolean)
                    : [];
                  return selectedFormats.length > 0 ? (
                    <div style={{ marginTop: "1rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "1rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem", color: "#374151" }}>Examples of selected types:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {selectedFormats.map(fmt => {
                          const examples = getProblemExamples(fmt);
                          if (!examples) return null;
                          return (
                            <div key={fmt}>
                              <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "#1f2937", marginBottom: "0.5rem" }}>{examples.title}</div>
                              <ul style={{ margin: "0", paddingLeft: "1.5rem", fontSize: "0.8rem", color: "#6b7280", lineHeight: "1.5" }}>
                                {examples.examples.map((ex, idx) => (
                                  <li key={idx}>{ex}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {step.id === "questionFormat" && step.multiSelect && (
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ca-chip ca-chip--sm"
                      onClick={() => {
                        const availableValues = new Set((step.chips ?? []).map((chip) => chip.value));
                        const recommended = getRecommendedQuestionFormats(answers.assessmentType, availableValues);
                        setMultiSelectBuffer(recommended);
                      }}
                      disabled={isBlocked}
                    >
                      Use Recommended Mix
                    </button>
                    <button
                      type="button"
                      className="ca-chip ca-chip--sm"
                      onClick={() => setMultiSelectBuffer([])}
                      disabled={isBlocked}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            )}

            {hoverPreview && <ProblemHoverPreviewCard preview={hoverPreview} />}
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
            placeholder={
              currentStep?.id === "assignmentDuration" && courseDefaults
                ? `e.g., ${courseDefaults.estimatedMinutes} (default for ${answers.assessmentType || courseDefaults.assessmentTypes[0]})`
                : currentStep?.placeholder ?? ""
            }
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

      {/* RESET button — always visible below the waterfall (not during loading) */}
      {!isLoading && onReset && stepIndex > 0 && (
        <div style={{ padding: "0.75rem 1rem 0.5rem", borderTop: "1px solid var(--color-border, #e5e7eb)" }}>
          <button
            type="button"
            onClick={onReset}
            disabled={isBlocked}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: "6px",
              border: "1.5px solid var(--color-border, #e5e7eb)",
              background: "var(--bg, #fff)",
              color: "var(--text-secondary, #6b7280)",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            RESET
          </button>
        </div>
      )}
    </div>
  );
}
