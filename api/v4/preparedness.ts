import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../lib/gemini";
import { assertBackendStartupEnv } from "../../lib/envGuard";
import {
  getAlignment,
  getSuggestions,
  applySuggestions,
  getReverseAlignment,
  getPreparednessReport,
} from "../../src/prism-v4/intelligence/preparedness";
import type {
  AssessmentDocument,
  PrepDocument,
  Suggestion,
  SuggestionsResult,
} from "../../src/prism-v4/schema/domain/Preparedness";
import preparednessIntelHandler, { validatePreparednessInputs } from "./preparedness-intel";

export const runtime = "nodejs";

assertBackendStartupEnv([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
], "api/v4/preparedness");

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
    const { phase, prep, assessment, finalSuggestions } = payload as {
      phase?: unknown;
      prep?: unknown;
      assessment?: unknown;
      finalSuggestions?: unknown;
    };

    // Preserve phase-based behavior for existing clients by delegating
    // to the dedicated intelligence endpoint.
    if (typeof phase === "string" && phase !== "preparedness") {
      return preparednessIntelHandler(req, res);
    }

    if (!prep || !assessment) {
      return res.status(400).json({
        error: "Preparedness report requires prep and assessment",
      });
    }

    const prepDoc: PrepDocument = prep as PrepDocument;
    const assessmentDoc: AssessmentDocument = assessment as AssessmentDocument;
    const ingestionError = validatePreparednessInputs(prepDoc, assessmentDoc);
    if (ingestionError) {
      return res.status(400).json({ error: ingestionError });
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

    const alignment = await getAlignment(prepDoc, assessmentDoc, callLLM);
    const reverseAlignment = await getReverseAlignment(prepDoc, assessmentDoc, callLLM);
    const suggestions = await getSuggestions(alignment);
    const suggestionsToApply = (Array.isArray(finalSuggestions) ? finalSuggestions : suggestions) as Suggestion[];
    const rewrite = await applySuggestions(assessmentDoc, suggestionsToApply, callLLM);
    const report = await getPreparednessReport(
      alignment,
      reverseAlignment,
      suggestionsToApply as SuggestionsResult,
      rewrite,
      callLLM
    );

    return res.status(200).json({
      alignment,
      reverseAlignment,
      suggestions: suggestionsToApply,
      rewrite,
      report,
    });
  } catch (error) {
    console.error("Preparedness API error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Preparedness analysis failed",
    });
  }
}
