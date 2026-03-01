/**
 * updateWriterAgentDossier
 *
 * Incremental health-record update for a single Writer pipeline run.
 * Called by SCRIBE.updateAgentDossier after every generation.
 *
 * Scores live on a 0–100 scale (separate from the 0–10 core trust/stability
 * scores used by the hint-budget algorithm — those are maintained by
 * DossierManager.updateAfterRun and preserved in the same DB row).
 */

import type { WriterRunSummary } from "./types/WriterRunSummary";
import { DossierManager } from "./DossierManager";
import type { AgentDossierData } from "./DossierManager";

// ── Utility ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function emptyExtendedDossier(): Partial<AgentDossierData> {
  return {
    alignmentScore: 50,
    trustScore100: 50,
    stabilityScore100: 50,
    topicMastery: {},
    weaknessCategories: {
      spacing: 0,
      notation: 0,
      drift: 0,
      hallucination: 0,
      difficultyMismatch: 0,
      structureViolations: 0,
    },
    extendedCompensationProfile: {
      spacingFixes: 0,
      notationFixes: 0,
      rewriteBias: 0,
      difficultyBias: 0,
      operationBias: 0,
    },
    rewriteHistory: {
      totalRewrites: 0,
      last10: [],
    },
    passFailByDomain: {},
    errorPatterns: {
      spacingMerges: 0,
      latexBreaks: 0,
      operatorConfusion: 0,
      wordiness: 0,
      arithmeticParaphrasing: 0,
    },
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface WriterReliability {
  trust: number;        // 0–100
  alignment: number;    // 0–100
  stability: number;    // 0–100
}

export async function updateWriterAgentDossier(
  userId: string,
  run: WriterRunSummary
): Promise<WriterReliability> {
  // Load existing dossier (falls back to baseline if none exists)
  const existing = await DossierManager.loadAgentDossier(userId, run.agentId);

  // Merge with empty extended fields so optional fields are always defined
  const base = emptyExtendedDossier();
  const d: AgentDossierData = {
    ...base,
    ...existing,
    weaknessCategories: { ...base.weaknessCategories!, ...existing.weaknessCategories },
    extendedCompensationProfile: {
      ...base.extendedCompensationProfile!,
      ...existing.extendedCompensationProfile,
    },
    rewriteHistory: existing.rewriteHistory ?? base.rewriteHistory!,
    passFailByDomain: existing.passFailByDomain ?? {},
    errorPatterns: { ...base.errorPatterns!, ...existing.errorPatterns },
    topicMastery: existing.topicMastery ?? {},
  };

  // ── Trust score (0–100) ───────────────────────────────────────────────────
  let trustDelta = 0;
  if (run.gatekeeperViolations === 0 && run.rewriteCount === 0 && run.qualityScore >= 90) {
    trustDelta += 2;
  }
  trustDelta -= run.gatekeeperViolations;
  trustDelta -= run.rewriteCount;
  d.trustScore100 = clamp((d.trustScore100 ?? 50) + trustDelta, 0, 100);

  // ── Alignment score (0–100) ───────────────────────────────────────────────
  let alignmentDelta = 0;
  if (run.alignedToTopic && run.structuralOk && run.gatekeeperViolations === 0) {
    alignmentDelta += 2;
  }
  if (!run.alignedToTopic) alignmentDelta -= 3;
  if (!run.structuralOk)   alignmentDelta -= 2;
  d.alignmentScore = clamp((d.alignmentScore ?? 50) + alignmentDelta, 0, 100);

  // ── Stability score (0–100) ───────────────────────────────────────────────
  const rewritePenalty  = Math.min(run.rewriteCount, 5);
  const violationPenalty = Math.min(run.gatekeeperViolations, 5);
  const stabilityDelta  = -(rewritePenalty + violationPenalty);
  // Clean run earns back
  const stabilityBonus = (run.gatekeeperViolations === 0 && run.rewriteCount === 0) ? 1 : 0;
  d.stabilityScore100 = clamp(
    (d.stabilityScore100 ?? 50) + stabilityDelta + stabilityBonus,
    0, 100
  );

  // ── Topic mastery (0–100 per topic) ──────────────────────────────────────
  const topic = run.topic;
  d.topicMastery![topic] = d.topicMastery![topic] ?? 50;
  let masteryDelta = 0;
  if (run.gatekeeperViolations === 0 && run.rewriteCount === 0) masteryDelta += 2;
  if (run.gatekeeperViolations > 0) masteryDelta -= 2;
  d.topicMastery![topic] = clamp(d.topicMastery![topic] + masteryDelta, 0, 100);

  // ── Weakness categories & error patterns ─────────────────────────────────
  const wc = d.weaknessCategories!;
  const ep = d.errorPatterns!;
  const cp = d.extendedCompensationProfile!;

  if (run.errorFlags.spacingMerge) {
    wc.spacing++;
    ep.spacingMerges++;
    cp.spacingFixes++;
  }
  if (run.errorFlags.notationBreak) {
    wc.notation++;
    ep.latexBreaks++;
    cp.notationFixes++;
  }
  if (run.errorFlags.drift)               wc.drift++;
  if (run.errorFlags.hallucination)       wc.hallucination++;
  if (run.errorFlags.difficultyMismatch) {
    wc.difficultyMismatch++;
    cp.difficultyBias++;
  }
  if (run.errorFlags.structureViolation)  wc.structureViolations++;

  // ── Rewrite history ───────────────────────────────────────────────────────
  const rh = d.rewriteHistory!;
  rh.totalRewrites += run.rewriteCount;
  rh.last10.push(run.rewriteCount);
  if (rh.last10.length > 10) rh.last10.shift();

  // rewriteBias = rolling average of recent rewrite counts (higher = more unstable)
  cp.rewriteBias = rh.last10.length > 0
    ? Math.round((rh.last10.reduce((a, b) => a + b, 0) / rh.last10.length) * 10) / 10
    : 0;

  // ── Pass/fail by topic ────────────────────────────────────────────────────
  if (!d.passFailByDomain![topic]) {
    d.passFailByDomain![topic] = { passes: 0, fails: 0 };
  }
  if (run.gatekeeperViolations === 0 && run.structuralOk) {
    d.passFailByDomain![topic].passes++;
  } else {
    d.passFailByDomain![topic].fails++;
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  d.version  = (d.version ?? 0) + 1;
  d.updatedAt = new Date().toISOString();

  await DossierManager.saveAgentDossier(userId, run.agentId, d);

  return {
    trust:     d.trustScore100!,
    alignment: d.alignmentScore!,
    stability: d.stabilityScore100!,
  };
}
