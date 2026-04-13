import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../lib/gemini";
import {
  getAlignment,
  getSuggestions,
  applySuggestions,
  getReverseAlignment,
  getPreparednessReport,
  applyTeacherInput,
  generateAdminReport,
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
    } = payload;

    if (!phase) {
      return res.status(400).json({
        error: "Missing required field: phase",
      });
    }

    // Create a wrapper around Gemini for our LLM caller type
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
      // Phase 1: Get alignment
      result = await getAlignment(prepDoc, assessmentDoc, callLLM);
    } else if (phase === "suggestions") {
      // Phase 2: Get suggestions
      if (!alignment) {
        return res.status(400).json({
          error: "Phase 'suggestions' requires alignment data",
        });
      }
      result = await getSuggestions(alignment, callLLM);
    } else if (phase === "reverse_alignment") {
      if (!prep || !assessment) {
        return res.status(400).json({
          error: "Phase 'reverse_alignment' requires prep and assessment",
        });
      }
      const prepDoc: PrepDocument = prep;
      const assessmentDoc: AssessmentDocument = assessment;
      result = await getReverseAlignment(prepDoc, assessmentDoc, callLLM);
    } else if (phase === "rewrite") {
      // Phase 3: Apply suggestions and rewrite
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
      if (!alignment || !reverseAlignment || !suggestions || !rewrite) {
        return res.status(400).json({
          error: "Phase 'report' requires alignment, reverseAlignment, suggestions, and rewrite",
        });
      }

      result = await getPreparednessReport(
        alignment,
        reverseAlignment as ReverseAlignmentResult,
        suggestions as SuggestionsResult,
        rewrite as RewriteResult,
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
      if (!modelOutput || !modelOutput.alignment || !modelOutput.suggestions || !modelOutput.rewrite || !modelOutput.reverseAlignment) {
        return res.status(400).json({
          error: "Phase 'admin_report' requires modelOutput with alignment, suggestions, rewrite, and reverseAlignment",
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
      // 1. alignment
      const alignmentResult = await getAlignment(prepDoc, assessmentDoc, callLLM);
      // 2. suggestions
      const suggestionsResult = await getSuggestions(alignmentResult, callLLM);
      const suggestionsToApply = (Array.isArray(finalSuggestions) ? finalSuggestions : suggestionsResult) as Suggestion[];
      // 3. rewrite
      const rewriteResult = await applySuggestions(assessmentDoc, suggestionsToApply, callLLM);
      // 4. reverse alignment
      const reverseAlignmentResult = await getReverseAlignment(prepDoc, assessmentDoc, callLLM);
      // 5. report
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
        reverseAlignment: reverseAlignmentResult,
        report: {
          ...reportResult,
          adminReport: adminReport.adminReport,
        },
      };
    } else {
      return res.status(400).json({
        error:
          "Invalid phase. Must be 'alignment', 'suggestions', 'reverse_alignment', 'rewrite', 'teacher_input', 'report', 'admin_report', or 'pipeline'",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Preparedness API error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Preparedness analysis failed",
    });
  }
}
