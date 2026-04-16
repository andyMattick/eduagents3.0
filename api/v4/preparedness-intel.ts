import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../lib/gemini";
import { assertBackendStartupEnv } from "../../lib/envGuard";
import {
  getAlignment,
  getSuggestions,
  applySuggestions,
  getReverseAlignment,
  getPreparednessReport,
  applyTeacherInput,
  generateAdminReport,
  mergeAddendumIntoReview,
  generatePreparednessReviewSnippet,
  rewritePreparednessQuestion,
  rewritePreparednessQuestionToDifficulty,
  generatePreparednessPracticeItem,
  generatePreparednessReviewPacket,
  generatePreparednessTestFromReview,
} from "../../src/prism-v4/intelligence/preparedness";
import type {
  AssessmentDocument,
  PrepDocument,
  Suggestion,
  ReverseAlignmentResult,
  SuggestionsResult,
  RewriteResult,
  TeacherCorrection,
} from "../../src/prism-v4/schema/domain/Preparedness";

export const runtime = "nodejs";

assertBackendStartupEnv([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
], "api/v4/preparedness-intel");

const INGESTION_GUARDS = {
  minChars: 120,
  minParagraphs: 2,
  maxInputTokens: 4000,
  minQuestions: 1,
  maxQuestions: 50,
  maxDuplicateRatio: 0.35,
} as const;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function looksLikeBinaryPayload(text: string): boolean {
  if (!text) {
    return false;
  }

  const hasZipMarkers =
    text.includes("PK\u0003\u0004") ||
    (text.includes("[Content_Types].xml") && text.includes("word/document.xml"));
  const hasControlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
  return hasZipMarkers || (hasControlChars && text.includes("PK"));
}

function containsExtractionArtifacts(text: string): boolean {
  if (!text) {
    return false;
  }

  return (
    text.includes("PK\u0003\u0004") ||
    (text.includes("<w:document") && /[\u0000-\u0008]/.test(text))
  );
}

function isMostlyPrintable(text: string): boolean {
  if (!text) {
    return false;
  }
  const printable = text.match(/[\x20-\x7E\n\r\t]/g)?.length ?? 0;
  return printable / text.length >= 0.9;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function normalizeParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function duplicateRatio(paragraphs: string[]): number {
  if (paragraphs.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let repeated = 0;
  for (const value of counts.values()) {
    if (value > 1) {
      repeated += value - 1;
    }
  }

  return repeated / paragraphs.length;
}

export function validatePreparednessInputs(prepDoc: PrepDocument, assessmentDoc: AssessmentDocument): string | null {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const prepText = String(prepDoc.rawText ?? "").trim();
  const assessmentText = assessmentDoc.items
    .map((item) => String(item.text ?? "").trim())
    .join("\n\n")
    .trim();

  if (!prepText || prepText.length < INGESTION_GUARDS.minChars) {
    return "Ingestion failed: prep text is too short to analyze.";
  }

  if (!assessmentText || assessmentText.length < INGESTION_GUARDS.minChars) {
    return "Ingestion failed: assessment text is too short to analyze.";
  }

  if (
    looksLikeBinaryPayload(prepText) ||
    containsExtractionArtifacts(prepText) ||
    !isMostlyPrintable(prepText) ||
    looksLikeBinaryPayload(assessmentText) ||
    containsExtractionArtifacts(assessmentText) ||
    !isMostlyPrintable(assessmentText)
  ) {
    return "Ingestion failed: document content appears corrupted or binary.";
  }

  const prepParagraphs = normalizeParagraphs(prepText);
  if (prepParagraphs.length < INGESTION_GUARDS.minParagraphs) {
    return "Ingestion failed: prep extraction produced too few paragraphs.";
  }

  const totalTokens = estimateTokens(`${prepText}\n\n${assessmentText}`);
  if (totalTokens > INGESTION_GUARDS.maxInputTokens) {
    return "Ingestion failed: extracted content exceeds the token budget.";
  }

  const questionCount = assessmentDoc.items.length;
  if (questionCount < INGESTION_GUARDS.minQuestions || questionCount > INGESTION_GUARDS.maxQuestions) {
    return "Ingestion failed: assessment question count is out of allowed range.";
  }

  const isSequential = assessmentDoc.items.every((item, index) => Number(item.itemNumber) === index + 1);
  if (!isSequential) {
    return "Ingestion failed: assessment numbering is non-sequential.";
  }

  const combinedParagraphs = [...prepParagraphs, ...assessmentDoc.items.map((item) => String(item.text ?? "").trim()).filter(Boolean)];
  if (duplicateRatio(combinedParagraphs) > INGESTION_GUARDS.maxDuplicateRatio) {
    return "Ingestion failed: duplicate content ratio is too high.";
  }

  return null;
}

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = parseBody(req.body ?? {});
    const {
      phase,
      prep,
      assessment,
      alignment,
      selectedSuggestions,
      reverseAlignment,
      suggestions,
      rewrite,
      finalSuggestions,
      teacherCorrections,
      llmErrors,
      modelOutput,
      reviewText,
      addendumConcepts,
      questionText,
      conceptList,
      teacherNotes,
      targetDifficulty,
      testItems,
      reviewConcepts,
    } = payload;

    if (!phase) {
      return res.status(400).json({
        error: "Missing required field: phase",
      });
    }

    const callLLM = async (
      prompt: string,
      options?: {
        temperature?: number;
        maxOutputTokens?: number;
      }
    ) => {
      const response = await callGemini({
        prompt,
        model: "gemini-2.0-flash",
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxOutputTokens ?? 2000,
      });
      return response;
    };

    let result: unknown;

    if (phase === "alignment") {
      if (!prep || !assessment) {
        return res.status(400).json({
          error: "Phase 'alignment' requires prep and assessment",
        });
      }
      const prepDoc: PrepDocument = prep;
      const assessmentDoc: AssessmentDocument = assessment;
      const ingestionError = validatePreparednessInputs(prepDoc, assessmentDoc);
      if (ingestionError) {
        return res.status(400).json({ error: ingestionError });
      }
      result = await getAlignment(prepDoc, assessmentDoc, callLLM);
    } else if (phase === "suggestions") {
      if (!alignment) {
        return res.status(400).json({
          error: "Phase 'suggestions' requires alignment data",
        });
      }
      result = await getSuggestions(alignment);
    } else if (phase === "v2_review_snippet") {
      if (typeof questionText !== "string" || !Array.isArray(conceptList)) {
        return res.status(400).json({
          error: "Phase 'v2_review_snippet' requires questionText and conceptList",
        });
      }
      result = await generatePreparednessReviewSnippet(
        questionText,
        conceptList.map((value: unknown) => String(value)),
        callLLM
      );
    } else if (phase === "v2_rewrite_question") {
      if (typeof questionText !== "string" || typeof teacherNotes !== "string") {
        return res.status(400).json({
          error: "Phase 'v2_rewrite_question' requires questionText and teacherNotes",
        });
      }
      result = await rewritePreparednessQuestion(questionText, teacherNotes, callLLM);
    } else if (phase === "v2_rewrite_to_difficulty") {
      if (typeof questionText !== "string" || typeof targetDifficulty !== "number") {
        return res.status(400).json({
          error: "Phase 'v2_rewrite_to_difficulty' requires questionText and targetDifficulty",
        });
      }
      result = await rewritePreparednessQuestionToDifficulty(
        questionText,
        Math.min(5, Math.max(1, Number(targetDifficulty))),
        callLLM,
      );
    } else if (phase === "v2_practice_item") {
      if (typeof questionText !== "string" || !Array.isArray(conceptList)) {
        return res.status(400).json({
          error: "Phase 'v2_practice_item' requires questionText and conceptList",
        });
      }
      result = await generatePreparednessPracticeItem(
        questionText,
        conceptList.map((value: unknown) => String(value)),
        callLLM
      );
    } else if (phase === "v2_generate_review") {
      if (!Array.isArray(testItems)) {
        return res.status(400).json({
          error: "Phase 'v2_generate_review' requires testItems array",
        });
      }
      result = await generatePreparednessReviewPacket(testItems as Array<{ question_number: number; question_text: string }>, callLLM);
    } else if (phase === "v2_generate_test") {
      if (!Array.isArray(reviewConcepts)) {
        return res.status(400).json({
          error: "Phase 'v2_generate_test' requires reviewConcepts array",
        });
      }
      result = await generatePreparednessTestFromReview(reviewConcepts as Array<{ title: string; explanation?: string } | string>, callLLM);
    } else if (phase === "reverse_alignment") {
      if (!prep || !assessment) {
        return res.status(400).json({
          error: "Phase 'reverse_alignment' requires prep and assessment",
        });
      }
      const prepDoc: PrepDocument = prep;
      const assessmentDoc: AssessmentDocument = assessment;
      const ingestionError = validatePreparednessInputs(prepDoc, assessmentDoc);
      if (ingestionError) {
        return res.status(400).json({ error: ingestionError });
      }
      result = await getReverseAlignment(prepDoc, assessmentDoc, callLLM);
    } else if (phase === "rewrite") {
      if (!assessment) {
        return res.status(400).json({
          error: "Phase 'rewrite' requires assessment",
        });
      }
      if (!selectedSuggestions || !Array.isArray(selectedSuggestions)) {
        return res.status(400).json({
          error: "Phase 'rewrite' requires selectedSuggestions array",
        });
      }
      const assessmentDoc: AssessmentDocument = assessment;
      result = await applySuggestions(
        assessmentDoc,
        selectedSuggestions as Suggestion[],
        callLLM
      );
    } else if (phase === "report") {
      if (!alignment || !suggestions || !rewrite) {
        return res.status(400).json({
          error: "Phase 'report' requires alignment, suggestions, and rewrite",
        });
      }

      result = await getPreparednessReport(
        alignment,
        (reverseAlignment as ReverseAlignmentResult | undefined) ?? { reverseCoverage: [] },
        suggestions as SuggestionsResult,
        rewrite as RewriteResult,
        callLLM
      );
    } else if (phase === "addendum_merge") {
      if (typeof reviewText !== "string" || !Array.isArray(addendumConcepts)) {
        return res.status(400).json({
          error: "Phase 'addendum_merge' requires reviewText and addendumConcepts",
        });
      }

      result = await mergeAddendumIntoReview(
        reviewText,
        addendumConcepts.map((value: unknown) => String(value)),
        callLLM
      );
    } else if (phase === "teacher_input") {
      if (!alignment || !suggestions || !rewrite) {
        return res.status(400).json({
          error: "Phase 'teacher_input' requires alignment, suggestions, and rewrite",
        });
      }

      result = await applyTeacherInput(
        alignment,
        suggestions,
        rewrite,
        (teacherCorrections ?? []) as TeacherCorrection[],
        callLLM
      );
    } else if (phase === "admin_report") {
      if (!modelOutput || !modelOutput.alignment || !modelOutput.suggestions || !modelOutput.rewrite) {
        return res.status(400).json({
          error: "Phase 'admin_report' requires modelOutput with alignment, suggestions, and rewrite",
        });
      }

      result = await generateAdminReport(
        modelOutput,
        (teacherCorrections ?? []) as TeacherCorrection[],
        (llmErrors ?? []) as Array<{ phase: string; errorType: string }>,
        callLLM
      );
    } else if (phase === "pipeline") {
      if (!prep || !assessment) {
        return res.status(400).json({
          error: "Phase 'pipeline' requires prep and assessment",
        });
      }

      const prepDoc: PrepDocument = prep;
      const assessmentDoc: AssessmentDocument = assessment;
      const ingestionError = validatePreparednessInputs(prepDoc, assessmentDoc);
      if (ingestionError) {
        return res.status(400).json({ error: ingestionError });
      }
      const alignmentResult = await getAlignment(prepDoc, assessmentDoc, callLLM);
      const suggestionsResult = await getSuggestions(alignmentResult);
      const suggestionsToApply = (Array.isArray(finalSuggestions) ? finalSuggestions : suggestionsResult) as Suggestion[];
      const rewriteResult = await applySuggestions(assessmentDoc, suggestionsToApply, callLLM);
      const reverseAlignmentResult: ReverseAlignmentResult = { reverseCoverage: [] };
      const reportResult = await getPreparednessReport(
        alignmentResult,
        reverseAlignmentResult,
        suggestionsToApply as SuggestionsResult,
        rewriteResult,
        callLLM
      );

      const teacherCorrectionsList = (teacherCorrections ?? []) as TeacherCorrection[];
      const correctedResult = await applyTeacherInput(
        alignmentResult,
        suggestionsToApply as SuggestionsResult,
        rewriteResult,
        teacherCorrectionsList,
        callLLM
      );

      const adminReport = await generateAdminReport(
        {
          alignment: correctedResult.correctedAlignment,
          suggestions: correctedResult.correctedSuggestions,
          rewrite: correctedResult.correctedRewrite,
          reverseAlignment: reverseAlignmentResult,
        },
        teacherCorrectionsList,
        (llmErrors ?? []) as Array<{ phase: string; errorType: string }>,
        callLLM
      );

      result = {
        alignment: correctedResult.correctedAlignment,
        suggestions: correctedResult.correctedSuggestions,
        rewrite: correctedResult.correctedRewrite,
        report: {
          ...reportResult,
          adminReport: adminReport.adminReport,
        },
      };
    } else {
      return res.status(400).json({
        error:
          "Invalid phase. Must be 'alignment', 'suggestions', 'v2_review_snippet', 'v2_rewrite_question', 'v2_rewrite_to_difficulty', 'v2_practice_item', 'v2_generate_review', 'v2_generate_test', 'reverse_alignment', 'rewrite', 'addendum_merge', 'teacher_input', 'report', 'admin_report', or 'pipeline'",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Preparedness Intelligence API error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Preparedness analysis failed",
    });
  }
}
