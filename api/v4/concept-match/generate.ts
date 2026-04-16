import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../../lib/gemini";
import { assertBackendStartupEnv } from "../../../lib/envGuard";
import type {
  ConceptMatchGenerateRequest,
  ConceptMatchGenerateResponse,
  DeltaEntry,
  TeacherAction,
} from "../../../src/prism-v4/schema/domain/ConceptMatch";

export const runtime = "nodejs";

assertBackendStartupEnv(
  ["SUPABASE_URL", "SUPABASE_ANON_KEY", ["GOOGLE_API_KEY", "GEMINI_API_KEY"]],
  "api/v4/concept-match/generate"
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ── Build human-readable deltas from teacher actions ── */

function buildDeltas(actions: TeacherAction[]): DeltaEntry[] {
  return actions.map((a) => {
    let description = "";
    switch (a.action) {
      case "removeQuestions":
        description = `Remove questions ${(a.questionNumbers ?? []).join(", ")} (concept: ${a.concept})`;
        break;
      case "addToReview":
        description = `Add "${a.concept}" to review materials`;
        break;
      case "lowerDifficulty":
        description = `Lower difficulty of ${a.target} items for "${a.concept}"`;
        break;
      case "raiseDifficulty":
        description = `Raise difficulty of ${a.target} items for "${a.concept}"`;
        break;
      case "addExample":
        description = `Add example for "${a.concept}" in prep`;
        break;
      case "flagAiMissedConcept":
        description = `Teacher flagged missed concept: "${a.concept}"${a.comment ? ` — ${a.comment}` : ""}`;
        break;
      case "flagDifficultyIncorrect":
        description = `Teacher flagged incorrect difficulty for "${a.concept}"${a.comment ? ` — ${a.comment}` : ""}`;
        break;
      default:
        description = `${a.action} on "${a.concept}" (${a.target})`;
    }
    return { target: a.target, description };
  });
}

/* ── Generation prompt builders ── */

function buildReviewPrompt(
  prepText: string,
  actions: TeacherAction[],
  items: Array<{ itemNumber: number; rawText: string }>
): string {
  const addConcepts = actions
    .filter((a) => a.action === "addToReview")
    .map((a) => a.concept);

  const raiseConcepts = actions
    .filter((a) => a.target === "prep" && a.action === "raiseDifficulty")
    .map((a) => a.concept);

  const addExamples = actions
    .filter((a) => a.action === "addExample")
    .map((a) => a.concept);

  return `You are a curriculum specialist generating an updated review document.

ORIGINAL PREP MATERIAL:
${prepText.slice(0, 4000)}

TEST QUESTIONS (for reference):
${items.map((i) => `Q${i.itemNumber}: ${i.rawText}`).join("\n").slice(0, 2000)}

TEACHER REQUESTS:
${addConcepts.length ? `- Add coverage for: ${addConcepts.join(", ")}` : ""}
${raiseConcepts.length ? `- Increase difficulty for: ${raiseConcepts.join(", ")}` : ""}
${addExamples.length ? `- Add examples for: ${addExamples.join(", ")}` : ""}

Generate an updated review document that incorporates these changes.
Return JSON ONLY (no markdown fences):
{
  "review_sections": [
    { "title": "...", "explanation": "...", "example": "..." }
  ],
  "summary": "..."
}`;
}

function buildTestPrompt(
  currentItems: Array<{ itemNumber: number; rawText: string; tags?: { concepts?: string[]; difficulty?: number } }>,
  actions: TeacherAction[]
): string {
  const removedNums = new Set(
    actions
      .filter((a) => a.action === "removeQuestions")
      .flatMap((a) => a.questionNumbers ?? [])
  );

  const lowerConcepts = actions
    .filter((a) => a.target === "test" && a.action === "lowerDifficulty")
    .map((a) => a.concept);

  const raiseConcepts = actions
    .filter((a) => a.target === "test" && a.action === "raiseDifficulty")
    .map((a) => a.concept);

  const kept = currentItems.filter((i) => !removedNums.has(i.itemNumber));

  return `You are a curriculum specialist generating an updated test.

CURRENT TEST ITEMS (after removals):
${kept.map((i) => `Q${i.itemNumber}: ${i.rawText} [difficulty: ${i.tags?.difficulty ?? 3}, concepts: ${(i.tags?.concepts ?? []).join(", ")}]`).join("\n").slice(0, 3000)}

TEACHER REQUESTS:
${removedNums.size ? `- Removed questions: ${[...removedNums].join(", ")}` : ""}
${lowerConcepts.length ? `- Lower difficulty for concepts: ${lowerConcepts.join(", ")}` : ""}
${raiseConcepts.length ? `- Raise difficulty for concepts: ${raiseConcepts.join(", ")}` : ""}

Renumber the kept items sequentially. Apply difficulty adjustments as requested. If items were removed, generate replacement items of appropriate difficulty to maintain test length.

Return JSON ONLY (no markdown fences):
{
  "test_items": [
    { "question_number": 1, "question_text": "...", "answer": "...", "explanation": "..." }
  ],
  "test_summary": "..."
}`;
}

/* ── Handler ── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(200).json({});
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body: ConceptMatchGenerateRequest =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body.teacherActions?.length) {
      return res.status(400).json({ error: "No teacher actions provided" });
    }

    if (!body.generate?.review && !body.generate?.test) {
      return res.status(400).json({ error: "Must request at least one of: review, test" });
    }

    const callLLM = async (prompt: string) => {
      return callGemini({
        prompt,
        model: "gemini-2.0-flash",
        temperature: 0.3,
        maxOutputTokens: 4000,
      });
    };

    const deltas = buildDeltas(body.teacherActions);

    const response: ConceptMatchGenerateResponse = {
      deltas,
      original: {},
      updated: {},
    };

    if (body.generate.review) {
      const reviewPrompt = buildReviewPrompt(
        body.prep.rawText,
        body.teacherActions,
        body.assessment.items
      );
      const reviewRaw = await callLLM(reviewPrompt);
      try {
        const cleaned = reviewRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const reviewResult = JSON.parse(cleaned);
        // Attach review result to response for frontend rendering
        (response as Record<string, unknown>).reviewResult = reviewResult;
      } catch {
        deltas.push({ target: "prep", description: "Review generation produced non-parseable output" });
      }
    }

    if (body.generate.test) {
      const testPrompt = buildTestPrompt(body.assessment.items, body.teacherActions);
      const testRaw = await callLLM(testPrompt);
      try {
        const cleaned = testRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const testResult = JSON.parse(cleaned);
        (response as Record<string, unknown>).testResult = testResult;
      } catch {
        deltas.push({ target: "test", description: "Test generation produced non-parseable output" });
      }
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("[concept-match/generate] Error:", err);
    return res.status(500).json({
      error: "Generation failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
