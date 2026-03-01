// src/pipeline/agents/analyzeResults.ts
//
// Phase 4 — Student Results Analysis Agent
//
// Takes per-question performance data alongside the assessment and
// blueprint JSON, calls the LLM, and returns structured teacher-facing
// insights.
//
// ⚠️ Do NOT mention: Bloom, agent names, severity, trust scores, or
//    any internal system labels in prompts or outputs.
// ⚠️ Do NOT run automatically — only called on explicit teacher submit.

import { callGemini } from "@/pipeline/llm/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Types (exported — used by AssessmentDetailPage and Supabase row types)
// ─────────────────────────────────────────────────────────────────────────────

export interface PerformanceEntry {
  questionNumber: number;
  percentCorrect: number;
}

export interface ConfusionHotspot {
  questionNumber: number;
  note: string;
}

export interface AnalysisResult {
  overallAssessmentHealth: "Strong" | "Needs Adjustment";
  confusionHotspots: ConfusionHotspot[];
  pacingIssues: string | null;
  distractorIssues: { questionNumber: number; note: string }[];
  cognitiveLoadObservations: string[];
  recommendedAdjustments: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeResults({
  assessmentJson,
  performanceJson,
  blueprintJson,
}: {
  assessmentJson: any;
  /** Accepts the canonical { itemStats: PerformanceEntry[] } shape
   *  or a legacy flat PerformanceEntry[] array. */
  performanceJson: { itemStats: PerformanceEntry[] } | PerformanceEntry[];
  blueprintJson: any;
}): Promise<AnalysisResult> {

  // Normalize to flat array regardless of which shape was passed
  const items: PerformanceEntry[] = Array.isArray(performanceJson)
    ? performanceJson
    : (performanceJson as { itemStats: PerformanceEntry[] }).itemStats ?? [];

  const questions: any[] = assessmentJson?.questions ?? [];
  const totalQuestions = questions.length || items.length;

  const avgScore =
    items.length
      ? Math.round(
          items.reduce((s, p) => s + p.percentCorrect, 0) /
            items.length
        )
      : null;

  // Build per-question summary with performance overlay
  const qLines = Array.from({ length: totalQuestions }, (_, i) => {
    const n = i + 1;
    const q = questions[i];
    const perf = items.find((p) => p.questionNumber === n);
    const stem = q ? (q.stem ?? q.text ?? q.question ?? "").slice(0, 100) : "";
    const typeLabel = q?.type ?? q?.questionType ?? "question";
    const perfLabel =
      perf != null ? `${perf.percentCorrect}% correct` : "no data";
    return `Q${n} (${typeLabel}): "${stem}" — ${perfLabel}`;
  });

  const assessmentType =
    blueprintJson?.uar?.assessmentType ??
    assessmentJson?.assessmentType ??
    "assessment";

  const prompt = `You are an instructional design assistant helping a teacher review student performance results.

ASSESSMENT OVERVIEW:
- Type: ${assessmentType}
- Total questions: ${totalQuestions}
- Class average: ${avgScore != null ? avgScore + "%" : "not provided"}

QUESTION PERFORMANCE:
${qLines.join("\n")}

TASK:
Analyze the data above and return ONLY a JSON object with this exact structure:

{
  "overallAssessmentHealth": "Strong" | "Needs Adjustment",
  "confusionHotspots": [{ "questionNumber": <integer>, "note": "<explanation for teachers>" }],
  "pacingIssues": "<string or null>",
  "distractorIssues": [{ "questionNumber": <integer>, "note": "<explanation for teachers>" }],
  "cognitiveLoadObservations": ["<observation>"],
  "recommendedAdjustments": ["<actionable suggestion for teachers>"]
}

DECISION RULES:
- "Strong" if class average ≥ 70% AND fewer than 30% of questions are confusion hotspots.
- A confusion hotspot = any question with ≤ 50% correct responses.
- A distractor issue = a question where the wording may have confused students (40–55% correct often signals this).
- "pacingIssues" should be a non-null string only if 3+ questions have ≤ 40% correct AND they cluster at the end of the assessment (suggesting students may have run out of time). Otherwise null.
- "cognitiveLoadObservations": 1–3 patterns you notice in the data. Use probabilistic language: "students may", "this could suggest", "results indicate", "lower performance may reflect".
- "recommendedAdjustments": 2–4 concrete, teacher-friendly suggestions. Frame as possibilities, not failures: "Consider", "May benefit from", "Could help students".
- Do NOT use language like "students failed", "clearly did not understand", or "the assessment was poor". Use measured, professional language.
- Do NOT mention Bloom, agents, severity scores, or internal system names.
- Return ONLY valid JSON. No markdown fences, no explanation outside the JSON object.`;

  const raw = await callGemini({
    model: "gemini-2.0-flash",
    prompt,
    temperature: 0.15,
    maxOutputTokens: 1024,
  });

  // Strip possible markdown fences before parsing
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: Partial<AnalysisResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: return a safe degraded result rather than crashing
    console.warn("[analyzeResults] LLM response was not valid JSON:", raw.slice(0, 200));
    return {
      overallAssessmentHealth: "Needs Adjustment",
      confusionHotspots: [],
      pacingIssues: null,
      distractorIssues: [],
      cognitiveLoadObservations: ["Unable to parse AI response — please try again."],
      recommendedAdjustments: [],
    };
  }

  return {
    overallAssessmentHealth: parsed.overallAssessmentHealth ?? "Needs Adjustment",
    confusionHotspots: parsed.confusionHotspots ?? [],
    pacingIssues: parsed.pacingIssues ?? null,
    distractorIssues: parsed.distractorIssues ?? [],
    cognitiveLoadObservations: parsed.cognitiveLoadObservations ?? [],
    recommendedAdjustments: parsed.recommendedAdjustments ?? [],
  };
}
