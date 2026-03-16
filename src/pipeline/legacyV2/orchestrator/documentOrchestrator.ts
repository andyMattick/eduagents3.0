// @ts-nocheck
// src/pipeline/orchestrator/documentOrchestrator.ts

import { AnalyzerV2 } from "../analyzerV2/analyzerV2";

import { mapToUnifiedSchema } from "../mapper/mapToUnifiedSchema";
import { mapToDifficultyProfile } from "../mapper/mapToDifficultyProfile";
import { mapToComparisonProfile } from "../mapper/mapToComparisonProfile";
import { mapToSummaryView } from "../mapper/mapToSummaryView";
import { mapToConceptGraph } from "../mapper/mapToConceptGraph";

export type DocumentIntent =
  | "create"
  | "analyze"
  | "difficulty"
  | "compare"
  | "summary"
  | "concepts"
  | "raw";

export async function documentOrchestrator({
  intent,
  documentId,
  rawText,
  secondaryDocumentId,
  secondaryRawText
}: {
  intent: DocumentIntent;
  documentId: string;
  rawText: string;
  secondaryDocumentId?: string;
  secondaryRawText?: string;
}) {
  const analyzer = new AnalyzerV2();

  // Always produce internal representation first
  const internal = await analyzer.analyze({
    documentId,
    rawText
  });

  switch (intent) {
    case "create":
      return mapToUnifiedSchema(internal);

    case "analyze":
      return internal;

    case "difficulty":
      return mapToDifficultyProfile(internal);

    case "summary":
      return mapToSummaryView(internal);

    case "concepts":
      return mapToConceptGraph(internal);

    case "compare":
      if (!secondaryRawText || !secondaryDocumentId) {
        throw new Error("Comparison requires two documents.");
      }
      const internal2 = await analyzer.analyze({
        documentId: secondaryDocumentId,
        rawText: secondaryRawText
      });
      return mapToComparisonProfile({ a: internal, b: internal2 });

    case "raw":
      return internal;

    default:
      throw new Error(`Unknown intent: ${intent}`);
  }
}
