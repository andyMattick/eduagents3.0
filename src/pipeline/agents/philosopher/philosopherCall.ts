// src/components/Pipeline/philosopher/philosopherCall.ts

import { callAI } from "../../../config/aiConfig";
import { buildPhilosopherPrompt } from "./philosopherPrompt";
import { PipelineTrace } from "@/types/Trace";

export interface PhilosopherResult {
  status: "complete" | "rewrite";
  severity: number;
  culpritProblems: string[];
  rewriteInstructions: Array<{
    problemId: string;
    issues: string[];
    instructions: string;
  }>;
  narrativeSummary: string;
  keyFindings: string[];
  recommendations: string[];
}

export interface RunPhilosopherArgs {
  mode: "write" | "playtest" | "compare";
  payload: any;
  blueprint?: any;
  writerDraft?: any;
  gatekeeperReport?: any;
  trace?: PipelineTrace;
}

export async function runPhilosopher({
  mode,
  payload,
  blueprint,
  writerDraft,
  gatekeeperReport,
  trace,
}: RunPhilosopherArgs): Promise<PhilosopherResult> {
  const startedAt = Date.now();

  const prompt = buildPhilosopherPrompt({
    mode,
    payload,
    blueprint,
    writerDraft,
    gatekeeperReport,
  });

  let aiResponseText = "";

  try {
    const aiResponse = await callAI(prompt);


    aiResponseText = aiResponse;

    if (!aiResponseText.trim()) {
      throw new Error("Philosopher returned an empty response");
    }

    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Philosopher did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // ⭐ TRACE LOGGING
    if (trace) {
      trace.steps.push({
        agent: `Philosopher (${mode})`,
        input: { mode, payload, blueprint, writerDraft, gatekeeperReport },
        output: parsed,
        errors: [],
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
      });
    }

    return {
      status: parsed.status ?? "complete",
      severity: parsed.severity ?? 0,
      culpritProblems: parsed.culpritProblems ?? [],
      rewriteInstructions: parsed.rewriteInstructions ?? [],
      narrativeSummary: parsed.narrativeSummary ?? "",
      keyFindings: parsed.keyFindings ?? [],
      recommendations: parsed.recommendations ?? [],
    };
  } catch (err: any) {
    // ⭐ TRACE ERROR LOGGING
    if (trace) {
      trace.steps.push({
        agent: `Philosopher (${mode})`,
        input: { mode, payload, blueprint, writerDraft, gatekeeperReport },
        output: null,
        errors: [err.message],
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
      });
    }

    throw err;
  }
}
