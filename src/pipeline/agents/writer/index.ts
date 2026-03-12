import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import type { GeneratedItem } from "./types";

import { writerParallel } from "./chunk/writerParallel";
import type { WriterSlotChunk } from "./chunk/writerParallel";
import type { WriterTelemetry } from "./telemetry";

export type { WriterSlotChunk };

/**
 * Last telemetry snapshot from the most recent runWriter call.
 * Read this in the pipeline after runWriter returns for logging.
 */
let _lastWriterTelemetry: WriterTelemetry | null = null;

export function getLastWriterTelemetry(): WriterTelemetry | null {
  return _lastWriterTelemetry;
}

export async function runWriter({
  blueprint,
  uar,
  scribePrescriptions,
  agentId: _agentId,
  compensation: _compensation,
  onItemsProgress,
  onSlotComplete,
}: {
  blueprint: BlueprintPlanV3_2;
  uar: UnifiedAssessmentRequest;
  scribePrescriptions: {
    weaknesses: string[];
    requiredBehaviors: string[];
    forbiddenBehaviors: string[];
  };
  agentId: string;
  compensation: any;
  onItemsProgress?: (partialItems: GeneratedItem[]) => void;
  /** Called once per slot as soon as its JSON block is parsed out of the LLM response. */
  onSlotComplete?: (chunk: WriterSlotChunk) => void;
}): Promise<GeneratedItem[]> {
  const { items, telemetry } = await writerParallel(
    blueprint,
    uar,
    scribePrescriptions,
    onItemsProgress,
    onSlotComplete
  );

  _lastWriterTelemetry = telemetry;

  return items;
}
