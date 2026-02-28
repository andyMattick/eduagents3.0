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
  mode: "write" | "playtest" | "compare";
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

  return {
    status: "complete",
    severity: 1,
    philosopherNotes: notes.join("\n"),
    analysis,
    teacherFeedback,
    input
  };
}