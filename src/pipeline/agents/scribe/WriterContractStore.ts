/**
 * WriterContractStore.ts
 *
 * Module-level singleton store for the active Writer Contract.
 *
 * One contract lives per pipeline run.  Each stage calls the helpers below
 * to read or mutate the contract; the final state is returned to the UI via
 * the pipeline response object.
 */

import type { WriterContract } from "@/pipeline/contracts/WriterContract";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let _contract: WriterContract | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

/** Initialise a fresh contract for the current run.  Always call this first. */
export function initContract(
  partial: Omit<WriterContract, "updatedAt">
): WriterContract {
  const contract: WriterContract = { ...partial, updatedAt: partial.createdAt };
  _contract = contract;
  return contract;
}

/** Read the active contract (null before the first run). */
export function getContract(): WriterContract | null {
  return _contract;
}

/** Wipe the contract (called at the start of each new runPipeline invocation). */
export function clearContract(): void {
  _contract = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage-specific mutators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record the final guidelines list that was actually handed to the Writer.
 * Call this just before the Writer LLM call so the UI shows exactly what ran.
 */
export function setFinalWriterGuidelines(guidelines: string[]): void {
  if (!_contract) return;
  _contract.finalWriterGuidelines = guidelines;
  _contract.updatedAt = new Date().toISOString();
}

/**
 * Append a Gatekeeper violation + the prescription that fixes it.
 * De-duplicates prescriptions so repeated violations don't bloat the list.
 */
export function appendGatekeeperPrescription(
  violationType: string,
  prescription: string
): void {
  if (!_contract) return;
  _contract.gatekeeperPrescriptions.violations.push(violationType);
  if (!_contract.gatekeeperPrescriptions.addedConstraints.includes(prescription)) {
    _contract.gatekeeperPrescriptions.addedConstraints.push(prescription);
  }
  _contract.updatedAt = new Date().toISOString();
}

/**
 * Append a teacher or system override to the revision log.
 */
export function appendRevision(
  entry: WriterContract["revisionHistory"][number]
): void {
  if (!_contract) return;
  _contract.revisionHistory.push(entry);
  _contract.updatedAt = new Date().toISOString();
}

/**
 * Append a student-performance adjustment.
 * Automatically derives written adjustments from the score split.
 */
export function appendStudentPerformance(opts: {
  correct: number;
  incorrect: number;
  misconceptions?: string[];
}): void {
  if (!_contract) return;
  const total = opts.correct + opts.incorrect;
  const pct = total > 0 ? opts.correct / total : 0;

  const adjustments: string[] = [];
  if (pct < 0.5) {
    adjustments.push("Increase scaffolding and reduce difficulty on next generation.");
    adjustments.push("Prioritise \"apply\" and \"understand\" Bloom levels.");
  } else if (pct >= 0.9) {
    adjustments.push("Increase rigor — add \"analyze\" and \"evaluate\" slots.");
  } else {
    adjustments.push("Maintain current difficulty; vary topic angles for breadth.");
  }
  if (opts.misconceptions?.length) {
    adjustments.push(
      `Address misconceptions: ${opts.misconceptions.slice(0, 3).join("; ")}.`
    );
  }

  _contract.studentPerformanceAdjustments.push({
    timestamp: new Date().toISOString(),
    ...opts,
    adjustments,
  });
  _contract.updatedAt = new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience reader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full list of active contract guidelines for the next Writer call.
 * Combines system constraints + gatekeeper prescriptions + student adjustments
 * into a single ordered string array.
 *
 * This is the list stored in `finalWriterGuidelines` and shown in the UI.
 */
export function buildContractGuidelines(): string[] {
  if (!_contract) return [];
  const c = _contract;
  const lines: string[] = [];

  // Teacher intent
  lines.push(`Course: ${c.teacherIntent.course || "not specified"}`);
  lines.push(`Topic: ${c.teacherIntent.topic || "not specified"}`);
  lines.push(`Grade: ${c.teacherIntent.grade || "not specified"}`);
  lines.push(`Assessment type: ${c.teacherIntent.assessmentType || "not specified"}`);
  lines.push(`Requested question types: ${c.teacherIntent.questionTypes.join(", ") || "any"}`);

  // Question-type distribution (the most actionable fix for issue #1)
  const dist = c.systemConstraints.questionTypeDistribution;
  if (Object.keys(dist).length > 0) {
    const distStr = Object.entries(dist)
      .map(([t, n]) => `${t}=${n}`)
      .join(", ");
    lines.push(`Question type distribution this run: ${distStr} — Writer MUST honour each slot's questionType exactly.`);
  }

  // Bloom band
  lines.push(
    `Bloom band: ${c.systemConstraints.bloomFloor} → ${c.systemConstraints.bloomCeiling}`
  );
  lines.push(`Math format: ${c.systemConstraints.mathFormat}`);

  // Uniqueness
  if (c.systemConstraints.uniquenessRequired) {
    lines.push(
      "Uniqueness required: every slot has a unique topic angle — use the topicAngle hint in each slot."
    );
  }

  // JSON safety
  if (c.systemConstraints.jsonSafety) {
    lines.push(
      'JSON safety: escape every double-quote inside string values as \\". Never use raw newlines inside strings.'
    );
  }

  // Gatekeeper prescriptions (accumulated over runs)
  for (const constraint of c.gatekeeperPrescriptions.addedConstraints) {
    lines.push(`[Gatekeeper rule] ${constraint}`);
  }

  // Student performance adjustments
  for (const perf of c.studentPerformanceAdjustments) {
    for (const adj of perf.adjustments) {
      lines.push(`[Student-performance] ${adj}`);
    }
  }

  return lines;
}
