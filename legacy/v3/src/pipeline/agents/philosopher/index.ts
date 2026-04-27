import { generateTeacherFeedback } from "./philosopherTeacherFeedback";
import type { TeacherFeedback } from "./philosopherTeacherFeedback";

export interface PhilosopherAnalysis {
  violationCount: number;
  bloomProfile: Record<string, number>;
  redundantPairs: string[];
  gatekeeperPassed: boolean;
  qualityScore: number;
}

export interface PhilosopherResult {
  status?: "complete" | "rewrite";
  severity?: number;
  philosopherNotes: string;
  rewriteInstructions?: string[];
  analysis?: PhilosopherAnalysis;
  teacherFeedback?: TeacherFeedback;
  input?: unknown;
}

// --------------------------------------------------

export async function runPhilosopher(input: {
  mode: "write" | "review" | "compare";
  blueprint?: any;
  writerDraft?: any[];
  gatekeeperReport?: any;
  payload?: any;
}): Promise<PhilosopherResult> {

  if (input.mode === "write") {
    return analyzeWriteMode(input);
  }

  return { philosopherNotes: "Other modes unchanged.", input };
}

// --------------------------------------------------

function analyzeWriteMode(input: {
  blueprint?: any;
  writerDraft?: any[];
  gatekeeperReport?: any;
  payload?: any;
}): PhilosopherResult {

  const writerDraft = input.writerDraft ?? [];
  const blueprint = input.blueprint ?? {};
  const gatekeeperReport = input.gatekeeperReport ?? {};
  const violations = gatekeeperReport.violations ?? [];
  const slots = blueprint?.plan?.slots ?? [];

  if (writerDraft.length === 0) {
    return {
      status: "rewrite",
      severity: 10,
      philosopherNotes: "Critical: No items were generated.",
      rewriteInstructions: ["Regenerate all slots."],
      input
    };
  }

  const notes: string[] = [];

  // Bloom profile
  const bloomProfile: Record<string, number> = {};
  for (const slot of slots) {
    const d = (slot.cognitiveDemand ?? "remember").toLowerCase();
    bloomProfile[d] = (bloomProfile[d] ?? 0) + 1;
  }

  // Redundancy detection
  const prompts = writerDraft.map((i: any) => (i.prompt ?? "").toLowerCase());
  const redundantPairs: string[] = [];

  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      if (prompts[i].length < 20 || prompts[j].length < 20) continue;
      const wordsA: string[] = prompts[i].split(/\s+/);
      const wordsB: string[] = prompts[j].split(/\s+/);

      const setA = new Set<string>(wordsA);

      const overlap = wordsB.filter((w: string) => setA.has(w)).length;if (overlap / Math.min(setA.size, wordsB.length) > 0.7) {
        redundantPairs.push(`Q${i+1} & Q${j+1}`);
      }
    }
  }

  let deductions = Math.min(5, Math.ceil(violations.length / 2));
  if (redundantPairs.length > 0) deductions += 1;

  const qualityScore = Math.max(0, 10 - deductions);

  const analysis: PhilosopherAnalysis = {
    violationCount: violations.length,
    bloomProfile,
    redundantPairs,
    gatekeeperPassed: violations.length === 0,
    qualityScore
  };

  const teacherFeedback = generateTeacherFeedback({
    rewriteCount: gatekeeperReport?.telemetry?.rewriteCount ?? 0,
    rewriteReasons: gatekeeperReport?.telemetry?.rewriteReasons ?? [],
    violations,
    constraintConflicts: blueprint?.constraintConflicts ?? [],
    timeMismatch: false,
    bloomMismatch: violations.some((v: any) => v.type === "cognitive_demand_mismatch"),
    distributionMismatch: slots.length >= 5 && Object.keys(bloomProfile).length === 1,
    lexicalIssues: [],
    guardrailSummary: blueprint?.guardrailSummary ?? "",
    qualityScore
  });

  notes.push(`Quality score: ${qualityScore}/10`);

  const bloomMismatchCount = violations.filter((v: any) => v.type === "cognitive_demand_mismatch").length;
  const driftRate = slots.length > 0 ? bloomMismatchCount / slots.length : 0;
  if (driftRate > 0.3) {
    return {
      status: "rewrite",
      severity: 6,
      philosopherNotes:
        `Bloom drift detected: ${Math.round(driftRate * 100)}% of slots did not match cognitive demand. Triggering corrective rewrite.`,
      rewriteInstructions: [
        "bloomCorrective: Regenerate mismatched slots so each prompt verb and task matches the slot cognitiveDemand.",
        "Preserve slot questionType and keep topicAngle distinct across rewritten slots.",
      ],
      analysis,
      teacherFeedback,
      input,
    };
  }

  // Build a useful narrative for teachers about what the gatekeeper corrected
  const notesForTeacher: string[] = [];
  if (violations.length === 0) {
    notesForTeacher.push( `✓ Clean run — all ${writerDraft.length} questions passed quality checks with no corrections needed.`);
  } else {
    const types = [...new Set<string>(
      violations
        .map((v: any) => {
          const t: string = v.type ?? v ?? "";
          if (t.includes("cognitive") || t.includes("bloom")) return "Bloom level mismatch";
          if (t.includes("answer") || t.includes("distractor")) return "answer accuracy";
          if (t.includes("stem") || t.includes("clarity")) return "stem clarity";
          if (t.includes("structure") || t.includes("format")) return "format/structure";
          if (t.includes("type") && t.includes("mismatch")) return "question type mismatch";
          return t.replace(/_/g, " ");
        })
    )];
    notesForTeacher.push(
      `⚡ ${violations.length} question${violations.length > 1 ? "s" : ""} were automatically corrected ` +
      `before delivery (${types.slice(0, 3).join(", ")}${types.length > 3 ? ", …" : ""}). ` +
      `These fixes were applied by the Gatekeeper — students saw the cleaned version.`
    );
  }
  if (redundantPairs.length > 0) {
    notesForTeacher.push(
      `⚠ ${redundantPairs.length} question pair${redundantPairs.length > 1 ? "s" : ""} have highly overlapping content ` +
      `(${redundantPairs.join(", ")}). Adding specific sub-topics to your next prompt will reduce this.`
    );
  }
  const guardrailSummary: string = blueprint?.guardrailSummary ?? "";
  if (guardrailSummary) {
    notesForTeacher.push(`🔧 Guardrail active for this subject: ${guardrailSummary}`);
  }
  // Encode teacher notes as 💡 tips so AssessmentViewer surfaces them
  for (const n of notesForTeacher) {
    notes.push(`💡 Tip — ${n}`);
  }

  return {
    status: "complete",
    severity: 1,
    philosopherNotes: notes.join("\n"),
    analysis,
    teacherFeedback,
    input
  };
}