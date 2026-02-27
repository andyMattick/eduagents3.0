/**
 * Philosopher — deterministic assessment quality inspector.
 *
 * Three modes — one for each stage of the teacher's workflow:
 *
 *   "write"   (after Gatekeeper, before Builder)
 *             → Always returns status: "complete" so the pipeline always
 *               reaches the Builder and the teacher always gets an assessment
 *               to read, print, and decide on. Quality findings are surfaced
 *               as informational notes — nothing auto-rewrites at this stage.
 *               Only a severity-10 structural catastrophe (e.g. zero items)
 *               returns "rewrite" to restart the pipeline.
 *
 *   "playtest" (after Astronomer Phase 2)
 *             → Analyses predicted student performance data. Summarises
 *               completion rate, engagement, and confusion hotspots as notes
 *               for the teacher's Playtest Report. No status returned — always
 *               falls through to Builder.
 *
 *   "compare" (after a Rewrite pass, teacher-initiated)
 *             → Diffs original vs. rewritten assessment: Bloom shift, word
 *               count, question count, redundancy change. Returns structured
 *               comparison notes for the UI's Version Comparison panel.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PhilosopherAnalysis {
  violationCount: number;
  bloomProfile: Record<string, number>;
  redundantPairs: string[];
  gatekeeperPassed: boolean;
  qualityScore: number; // 0–10 (10 = perfect)
}

export interface PhilosopherResult {
  status?: "complete" | "rewrite";
  severity?: number;
  philosopherNotes: string;
  rewriteInstructions?: string[];
  analysis?: PhilosopherAnalysis;
  comparison?: PhilosopherComparison;
  input?: unknown;
}

export interface PhilosopherComparison {
  bloomShift: Record<string, { before: number; after: number }>;
  questionCountChange: number;
  avgWordCountChange: number;
  redundancyChange: number; // negative = improvement
  summary: string;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runPhilosopher(input: {
  mode: "write" | "playtest" | "compare";
  blueprint?: any;
  writerDraft?: any[];
  gatekeeperReport?: any;
  payload?: any;
  // Compare mode
  originalDraft?: any[];
  rewrittenDraft?: any[];
  originalBlueprint?: any;
}): Promise<PhilosopherResult> {
  switch (input.mode) {
    case "write":     return analyzeWriteMode(input);
    case "playtest":  return analyzePlaytestMode(input);
    case "compare":   return analyzeCompareMode(input);
    default:          return { philosopherNotes: "Unknown Philosopher mode.", input };
  }
}

// ── Write-mode analysis ───────────────────────────────────────────────────────
//
// This Philosopher runs BEFORE the teacher sees the assessment.
// It should NEVER block delivery. Always return status: "complete" so
// the orchestrator always calls Builder and the teacher always gets output.
// The analysis notes appear in the Philosopher's Report panel.
//
// Only exception: zero items produced → severity 10 → "rewrite" to restart,
// because there is literally nothing to show the teacher.

function analyzeWriteMode(input: {
  blueprint?: any;
  writerDraft?: any[];
  gatekeeperReport?: any;
  payload?: any;
}): PhilosopherResult {
  const writerDraft: any[] = input.writerDraft ?? input.payload?.writerDraft ?? [];
  const blueprint   = input.blueprint   ?? input.payload?.blueprint;
  const gatekeeperReport = input.gatekeeperReport ?? input.payload?.gatekeeperResult;

  const violations: { type: string; message?: string }[] = gatekeeperReport?.violations ?? [];
  const slots: any[] = blueprint?.plan?.slots ?? [];

  const notes: string[] = [];

  // Hard stop: nothing was generated at all
  if (writerDraft.length === 0) {
    return {
      status: "rewrite",
      severity: 10,
      philosopherNotes: "✗ Critical: Writer produced zero items. Pipeline will restart.",
      rewriteInstructions: ["Regenerate all slots — the previous Writer pass returned no output."],
      input,
    };
  }

  // ── 1. Gatekeeper summary ─────────────────────────────────────────────────
  const byType: Record<string, number> = {};
  for (const v of violations) {
    byType[v.type] = (byType[v.type] ?? 0) + 1;
  }

  if (violations.length === 0) {
    notes.push("✓ All items passed Gatekeeper validation — no violations.");
  } else {
    const summary = Object.entries(byType)
      .map(([t, n]) => `${t} ×${n}`)
      .join(", ");
    notes.push(`⚠ ${violations.length} Gatekeeper violation(s): ${summary}`);
  }

  // ── 2. Bloom distribution ─────────────────────────────────────────────────
  const bloomProfile: Record<string, number> = {};
  for (const slot of slots) {
    const d = (slot.cognitiveDemand ?? "remember").toLowerCase();
    bloomProfile[d] = (bloomProfile[d] ?? 0) + 1;
  }

  if (Object.keys(bloomProfile).length > 0) {
    const bloomSummary = Object.entries(bloomProfile)
      .sort((a, b) => b[1] - a[1])
      .map(([d, n]) => `${d}: ${n}`)
      .join(", ");
    notes.push(`Bloom distribution: ${bloomSummary}`);

    const uniqueLevels = Object.keys(bloomProfile).length;
    if (slots.length >= 5 && uniqueLevels === 1) {
      notes.push("⚠ All questions target the same cognitive level — consider adding variety for better learning coverage.");
    }
  }

  // ── 3. Redundancy detection (word-overlap heuristic) ─────────────────────
  const prompts = writerDraft.map((item: any) => (item.prompt ?? "").toLowerCase());
  const redundantPairs: string[] = [];

  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      if (prompts[i].length < 20 || prompts[j].length < 20) continue;
      const wordsI = new Set(prompts[i].split(/\s+/).filter((w: string) => w.length > 4));
      const wordsJ = prompts[j].split(/\s+/).filter((w: string) => w.length > 4);
      if (wordsI.size === 0 || wordsJ.length === 0) continue;
      const overlap = wordsJ.filter((w: string) => wordsI.has(w)).length;
      const ratio = overlap / Math.min(wordsI.size, wordsJ.length);
      if (ratio > 0.7) {
        redundantPairs.push(`Q${i + 1} & Q${j + 1}`);
      }
    }
  }

  if (redundantPairs.length > 0) {
    notes.push(`⚠ Similar question pairs detected: ${redundantPairs.join(", ")} — consider differentiating these.`);
  } else {
    notes.push("✓ No significant content overlap between questions.");
  }

  // ── 4. Item count check ───────────────────────────────────────────────────
  const expectedCount = slots.length;
  const actualCount = writerDraft.length;
  if (expectedCount > 0 && actualCount < expectedCount) {
    notes.push(`⚠ ${expectedCount - actualCount} slot(s) missing: got ${actualCount} of ${expectedCount} expected items.`);
  } else if (expectedCount > 0) {
    notes.push(`✓ All ${actualCount} items generated.`);
  }

  // ── 5. Grade-level lexical complexity check ─────────────────────────────
  // Estimate whether the generated prompts use language appropriate for the
  // target grade. Uses three heuristics:
  //   1. Average sentence length (words per sentence)
  //   2. Proportion of long words (>8 chars) as proxy for abstract vocabulary
  //   3. Proportion of abstract/mature concept words

  const gradeStr = blueprint?.uar?.gradeLevels?.[0] ?? blueprint?.uar?.grade ?? "";
  const gradeNum = parseInt(String(gradeStr), 10);
  const allText = writerDraft.map((item: any) => item.prompt ?? "").join(" ");

  if (!isNaN(gradeNum) && allText.length > 50) {
    // Sentence count (split on .!? followed by space or end)
    const sentences = allText.split(/[.!?]+\s+|[.!?]+$/).filter(s => s.trim().length > 0);
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const avgSentenceLen = sentences.length > 0 ? words.length / sentences.length : 0;

    // Long-word ratio (>8 chars, excluding common function words)
    const longWords = words.filter(w => w.replace(/[^a-zA-Z]/g, "").length > 8);
    const longWordRatio = words.length > 0 ? longWords.length / words.length : 0;

    // Abstract concept density
    const ABSTRACT_WORDS = [
      "responsibility", "guilt", "morality", "justice", "consequence",
      "destruction", "vengeance", "ambiguity", "perspective", "ethical",
      "philosophical", "existential", "ideological", "inevitably",
      "fundamentally", "paradox", "dilemma", "implications", "rhetoric",
      "consciousness", "alienation", "symbolism", "irony", "metaphor",
      "juxtaposition", "sovereignty", "autonomy", "hegemony"
    ];
    const lowerText = allText.toLowerCase();
    const abstractHits = ABSTRACT_WORDS.filter(w => lowerText.includes(w)).length;

    // Thresholds by grade band
    let lexicalWarning = false;
    if (gradeNum <= 5) {
      // Elementary: avg sentence > 18 words OR > 15% long words OR > 3 abstract concepts
      if (avgSentenceLen > 18 || longWordRatio > 0.15 || abstractHits > 3) {
        lexicalWarning = true;
      }
    } else if (gradeNum <= 8) {
      // Middle school: more lenient
      if (avgSentenceLen > 25 || longWordRatio > 0.25 || abstractHits > 8) {
        lexicalWarning = true;
      }
    }

    if (lexicalWarning) {
      notes.push(
        `⚠ Lexical complexity may exceed grade ${gradeNum} level ` +
        `(avg sentence: ${avgSentenceLen.toFixed(1)} words, ` +
        `long-word ratio: ${(longWordRatio * 100).toFixed(0)}%, ` +
        `abstract concepts: ${abstractHits}). ` +
        `Consider simplifying vocabulary and shortening sentences.`
      );
    } else {
      notes.push(`✓ Lexical complexity appears appropriate for grade ${gradeNum}.`);
    }
  }

  // ── 6. Blueprint warnings (from Architect plausibility checks) ───────────
  const architectWarnings: string[] = blueprint?.warnings ?? [];
  for (const w of architectWarnings) {
    notes.push(`⚠ ${w}`);
  }

  // ── 7. Pacing realism check ──────────────────────────────────────────────
  const realisticMinutes = blueprint?.plan?.realisticTotalMinutes;
  const budgetMinutes = blueprint?.uar?.time ?? blueprint?.uar?.timeMinutes;
  if (realisticMinutes && budgetMinutes && realisticMinutes > budgetMinutes * 1.15) {
    notes.push(
      `⚠ Pacing: weighted estimate is ~${realisticMinutes} min for a ${budgetMinutes}-min window. ` +
      `Some students may not finish in time.`
    );
  }

  // ── 8. Prompt quality suggestions ────────────────────────────────────────
  // Analyse the teacher's UAR fields to identify what was helpfully provided
  // vs. what was vague, generic, or missing. Surface concrete suggestions so
  // the teacher can refine their next prompt for a better result.
  {
    const uar = blueprint?.uar ?? {};
    const promptTips: string[] = [];

    // Topic specificity
    const topic:    string = (uar.topic       ?? "").trim();
    const unit:     string = (uar.unitName    ?? "").trim();
    const lesson:   string = (uar.lessonName  ?? "").trim();
    const extras:   string = (uar.additionalDetails ?? "").trim();
    const course:   string = (uar.course      ?? "").trim();

    const hasSpecificTopic = topic.length > 8 && topic.split(" ").length >= 2;
    const hasLesson       = lesson.length > 3;
    const hasExtras       = extras.length > 5;

    if (!hasSpecificTopic) {
      const topicExample = unit || lesson || course
        ? `For "${unit || lesson || course}", for example: "adding unlike denominators" or "causes of WWI"`
        : "e.g., 'photosynthesis — light reactions only' rather than just 'science'";
      promptTips.push(
        `💡 Tip — Be more specific with your topic: "${topic || "(not provided)"}" is broad. ` +
        `A precise topic produces targeted, non-generic questions. ${topicExample}.`
      );
    }

    if (!hasLesson && !hasSpecificTopic) {
      promptTips.push(
        `💡 Tip — Add a lesson name to anchor the questions to a specific instructional moment ` +
        `(e.g., "Day 3 — graphing linear equations").`
      );
    }

    if (!hasExtras) {
      promptTips.push(
        `💡 Tip — The "additional details" field was left blank. Use it to shape the output: ` +
        `"Include at least one vocabulary question", "avoid trick questions", ` +
        `"focus on application not recall", "questions should reference the novel Holes".`
      );
    }

    // Check if all questions ended up the same type
    const questionTypes: string[] = Array.from(
      new Set(writerDraft.map((item: any) => item.questionType).filter(Boolean))
    );
    if (questionTypes.length === 1 && writerDraft.length > 3) {
      promptTips.push(
        `💡 Tip — All ${writerDraft.length} items are "${questionTypes[0]}". ` +
        `In your next prompt, request a mix of types (e.g., "3 multiple choice and 2 short answer") ` +
        `to get better coverage of the learning objective.`
      );
    }

    // Check if the topic keywords appear in the questions
    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    if (topicWords.length > 0 && writerDraft.length > 0) {
      const allPromptText = writerDraft.map((i: any) => (i.prompt ?? "").toLowerCase()).join(" ");
      const hitsFound = topicWords.filter(w => allPromptText.includes(w)).length;
      if (hitsFound === 0) {
        promptTips.push(
          `💡 Tip — None of the generated questions reference your topic keywords ("${topic}"). ` +
          `If this feels off-topic, try adding more context in "additional details" ` +
          `or providing a specific learning objective rather than a subject area.`
        );
      }
    }

    if (promptTips.length > 0) {
      notes.push("\n── Prompt suggestions ──");
      notes.push(...promptTips);
    } else {
      notes.push("✓ Your prompt provided enough context for strong generation.");
    }
  }

  // ── Quality score (informational, displayed in Philosopher's Report) ───────
  let deductions = 0;
  deductions += Math.min(5, Math.ceil(violations.length / 2));
  deductions += redundantPairs.length > 0 ? 1 : 0;
  deductions += (expectedCount > 0 && actualCount < expectedCount) ? 1 : 0;
  // Grade-awareness deductions
  deductions += architectWarnings.length > 0 ? 1 : 0; // plausibility warning
  if (!isNaN(gradeNum) && allText.length > 50) {
    const sentences = allText.split(/[.!?]+\s+|[.!?]+$/).filter(s => s.trim().length > 0);
    const wordsList = allText.split(/\s+/).filter(w => w.length > 0);
    const avgSL = sentences.length > 0 ? wordsList.length / sentences.length : 0;
    const longR = wordsList.length > 0 ? wordsList.filter(w => w.replace(/[^a-zA-Z]/g, "").length > 8).length / wordsList.length : 0;
    if (gradeNum <= 5 && (avgSL > 18 || longR > 0.15)) deductions += 1;
  }
  if (realisticMinutes && budgetMinutes && realisticMinutes > budgetMinutes * 1.15) deductions += 1;
  const qualityScore = Math.max(0, 10 - deductions);

  if (qualityScore >= 8) {
    notes.push(`Quality score: ${qualityScore}/10 — ready for review.`);
  } else if (qualityScore >= 5) {
    notes.push(`Quality score: ${qualityScore}/10 — some issues to note. Consider a rewrite pass if needed.`);
  } else {
    notes.push(`Quality score: ${qualityScore}/10 — multiple issues found. A rewrite pass is recommended.`);
  }

  const analysis: PhilosopherAnalysis = {
    violationCount: violations.length,
    bloomProfile,
    redundantPairs,
    gatekeeperPassed: violations.length === 0,
    qualityScore,
  };

  // Always deliver the assessment to the teacher — status: "complete" proceeds
  // to Builder regardless of quality score. The teacher decides what to do next.
  return {
    status: "complete",
    severity: 1,
    philosopherNotes: notes.join("\n"),
    analysis,
    input,
  };
}

// ── Playtest-mode analysis ────────────────────────────────────────────────────
//
// Runs after Astronomer Phase 2. No status — always falls through to Builder.
// The teacher reads the playtest report and decides whether to rewrite.

function analyzePlaytestMode(input: { payload?: any }): PhilosopherResult {
  const astro2 = input.payload ?? {};
  const notes: string[] = [];

  const completionRate = astro2.completionRate ?? astro2.predictedCompletionRate ?? null;
  if (completionRate !== null) {
    const pct = Math.round((completionRate as number) * 100);
    notes.push(
      pct < 60
        ? `⚠ Predicted completion rate: ${pct}% — the assessment may be too long or demanding for this group.`
        : `✓ Predicted completion rate: ${pct}%.`
    );
  }

  const avgEngagement = astro2.averageEngagement ?? astro2.engagementScore ?? null;
  if (avgEngagement !== null) {
    notes.push(`Average engagement score: ${(avgEngagement as number).toFixed(2)} / 1.00`);
  }

  const confusionHotspots: any[] = astro2.confusionHotspots ?? astro2.confusionItems ?? [];
  if (confusionHotspots.length > 0) {
    notes.push(`⚠ Confusion hotspots on item(s): ${confusionHotspots.slice(0, 5).join(", ")}`);
  } else {
    notes.push("✓ No confusion hotspots detected.");
  }

  if (notes.length === 0) {
    notes.push("Playtest analysis complete. No issues detected.");
  }

  return { philosopherNotes: notes.join("\n"), input };
}

// ── Compare-mode analysis ─────────────────────────────────────────────────────
//
// Teacher-initiated: called after a rewrite pass to show what changed.
// Compares original and rewritten drafts side-by-side.

function analyzeCompareMode(input: {
  originalDraft?: any[];
  rewrittenDraft?: any[];
  originalBlueprint?: any;
  payload?: any;
}): PhilosopherResult {
  const original: any[]  = input.originalDraft  ?? input.payload?.originalDraft  ?? [];
  const rewritten: any[] = input.rewrittenDraft ?? input.payload?.rewrittenDraft ?? [];
  const blueprint = input.originalBlueprint ?? input.payload?.blueprint;
  const slots: any[] = blueprint?.plan?.slots ?? [];

  const notes: string[] = [];

  // ── Bloom distribution comparison ────────────────────────────────────────
  const bloomBefore: Record<string, number> = {};
  const bloomAfter: Record<string, number> = {};

  for (const slot of slots) {
    const d = (slot.cognitiveDemand ?? "remember").toLowerCase();
    bloomBefore[d] = (bloomBefore[d] ?? 0) + 1;
  }
  // Rewritten items may carry updated cognitiveDemand if the rewriter promotes them
  for (const item of rewritten) {
    const d = (item.cognitiveDemand ?? item.bloomLevel ?? "remember").toLowerCase();
    bloomAfter[d] = (bloomAfter[d] ?? 0) + 1;
  }

  const allLevels = new Set([...Object.keys(bloomBefore), ...Object.keys(bloomAfter)]);
  const bloomShift: Record<string, { before: number; after: number }> = {};
  for (const level of allLevels) {
    const before = bloomBefore[level] ?? 0;
    const after  = bloomAfter[level]  ?? 0;
    if (before !== after) {
      bloomShift[level] = { before, after };
    }
  }

  if (Object.keys(bloomShift).length > 0) {
    const shiftDesc = Object.entries(bloomShift)
      .map(([l, { before, after }]) => `${l}: ${before}→${after}`)
      .join(", ");
    notes.push(`Bloom shift: ${shiftDesc}`);
  } else {
    notes.push("Bloom distribution unchanged.");
  }

  // ── Question count ────────────────────────────────────────────────────────
  const questionCountChange = rewritten.length - original.length;
  notes.push(
    questionCountChange === 0
      ? `Question count unchanged: ${rewritten.length}`
      : `Question count: ${original.length} → ${rewritten.length} (${questionCountChange > 0 ? "+" : ""}${questionCountChange})`
  );

  // ── Average prompt word count ─────────────────────────────────────────────
  const avgWordCount = (items: any[]) => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + ((item.prompt ?? "").split(/\s+/).length), 0) / items.length;
  };
  const wcBefore = avgWordCount(original);
  const wcAfter  = avgWordCount(rewritten);
  const wcDelta  = Math.round(wcAfter - wcBefore);
  notes.push(
    wcDelta === 0
      ? `Average prompt length unchanged (~${Math.round(wcBefore)} words).`
      : `Average prompt length: ${Math.round(wcBefore)}→${Math.round(wcAfter)} words (${wcDelta > 0 ? "+" : ""}${wcDelta}).`
  );

  // ── Redundancy before/after ───────────────────────────────────────────────
  const countRedundantPairs = (items: any[]) => {
    const prompts = items.map((item: any) => (item.prompt ?? "").toLowerCase());
    let pairs = 0;
    for (let i = 0; i < prompts.length; i++) {
      for (let j = i + 1; j < prompts.length; j++) {
        const wI = new Set(prompts[i].split(/\s+/).filter((w: string) => w.length > 4));
        const wJ = prompts[j].split(/\s+/).filter((w: string) => w.length > 4);
        if (wI.size === 0 || wJ.length === 0) continue;
        const ratio = wJ.filter((w: string) => wI.has(w)).length / Math.min(wI.size, wJ.length);
        if (ratio > 0.7) pairs++;
      }
    }
    return pairs;
  };

  const redundancyBefore = countRedundantPairs(original);
  const redundancyAfter  = countRedundantPairs(rewritten);
  const redundancyChange = redundancyAfter - redundancyBefore;

  if (redundancyChange < 0) {
    notes.push(`✓ Redundant pairs reduced: ${redundancyBefore} → ${redundancyAfter}`);
  } else if (redundancyChange > 0) {
    notes.push(`⚠ Redundant pairs increased: ${redundancyBefore} → ${redundancyAfter}`);
  } else {
    notes.push(`Redundancy unchanged (${redundancyBefore} similar pair${redundancyBefore !== 1 ? "s" : ""}).`);
  }

  const summary = notes.join("\n");

  const comparison: PhilosopherComparison = {
    bloomShift,
    questionCountChange,
    avgWordCountChange: wcDelta,
    redundancyChange,
    summary,
  };

  return {
    philosopherNotes: summary,
    comparison,
    input,
  };
}
