// src/components/Pipeline/writer/writerCall.ts

import {
  UnifiedAssessmentRequest,
  UnifiedAssessmentResponse,
  DocumentSummary,
  ProblemPayload,
  StudentProfile,
  StudentTester,
  GeneratedAssessment,
  AnswerKey,
  CognitiveTrace,
  DifficultyEstimate,
  MisconceptionCluster,
  TimeEstimateSummary,
} from "../contracts/assessmentContracts";

import { buildWriterPrompt } from "./writerPrompt";
import { callAI } from "../../../config/aiConfig";
import { estimateAssessmentTime } from "./writerModel";

export async function writerCall(
  req: UnifiedAssessmentRequest,
  previousDraft?: any
): Promise<UnifiedAssessmentResponse> {
  const prompt = buildWriterPrompt(req, previousDraft);
  console.log(
  "%c[Writer] Prompt built:",
  "color:#D97706;font-weight:bold;",
  prompt
);


  // 🔥 REAL AI CALL — no mocks, no fallbacks
  const aiResponse = await callAI(prompt, {
    modelName: "gemini-2.5-flash",
    maxTokens: 4000,
  });
  console.log(
  "%c[Writer] Raw model response:",
  "color:#F59E0B;font-weight:bold;",
  aiResponse
);


  const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim().length === 0) {
    throw new Error("Writer returned an empty response");
  }

  // Extract JSON from the model output
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Writer did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  console.log(
  "%c[Writer] Parsed draft:",
  "color:#FBBF24;font-weight:bold;",
  parsed
);


  // ⭐ NEW: Smart time estimation based on problem type, Bloom level, complexity
  const problems = Array.isArray(parsed.problemPayload)
  ? parsed.problemPayload
  : [];

const timeEstimates = estimateAssessmentTime(problems);
  console.log(
  "%c[Writer] Writer pass complete:",
  "color:#FDE68A;font-weight:bold;",
  parsed
);


  // Shape into UnifiedAssessmentResponse
  return {
    documentSummary: parsed.documentSummary as DocumentSummary,
    problemPayload: parsed.problemPayload as ProblemPayload[],
    studentProfiles: parsed.studentProfiles as StudentProfile[],
    studentTesters: parsed.studentTesters as StudentTester[],
    finalDocument: parsed.finalDocument as GeneratedAssessment,
    answerKey: parsed.answerKey as AnswerKey,
    cognitiveTraces: parsed.cognitiveTraces as CognitiveTrace[],
    difficultyEstimates: parsed.difficultyEstimates as DifficultyEstimate[],
    misconceptionClusters: parsed.misconceptionClusters as MisconceptionCluster[],
    studentInteraction: parsed.studentInteraction ?? [],


    // ⭐ Use our computed time estimates instead of AI’s
    timeEstimates,

    // Optional fields for rewrite loop
    astronomerClusters: parsed.astronomerClusters ?? { clusters: [] },
    philosopherExplanation: parsed.philosopherExplanation ?? {
      status: "complete",
      narrativeSummary: "",
      keyFindings: [],
      recommendations: [],
    },
    rewriteMeta: parsed.rewriteMeta ?? {
      cycles: 1,
      status: "complete",
    },
  };
}
