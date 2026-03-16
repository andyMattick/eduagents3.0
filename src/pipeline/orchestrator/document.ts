// src/pipeline/orchestrator/document.ts

import {
  UnifiedAnalyzerOutput,
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "../schema/unifiedSchema";
import type { DocumentInsights } from "@/pipeline/contracts";
import { buildDocumentInsightsFromInput } from "@/pipeline/agents/document/insights";

import { mapToUnifiedSchema } from "../mapper/mapToUnifiedSchema";
import { mapToDifficultyProfile } from "../mapper/mapToDifficultyProfile";
import { mapToComparisonProfile } from "../mapper/mapToComparisonProfile";
import { mapToSummaryView } from "../mapper/mapToSummaryView";
import { mapToConceptGraph } from "../mapper/mapToConceptGraph";

export type DocumentIntent =
  | "difficulty"
  | "compare"
  | "summary"
  | "concepts"
  | "raw";

const viewMappers = {
  difficulty: mapToDifficultyProfile,
  compare: mapToComparisonProfile,
  summary: mapToSummaryView,
  concepts: mapToConceptGraph,
  raw: (internal: any) => internal
};

export interface DocumentViewOutput {
  view: DocumentIntent;
  schema: UnifiedAnalyzerOutput;
  viewData: any;
  documentInsights: DocumentInsights;
  teacherProfile: UnifiedTeacherStyleProfile;
  courseProfile: UnifiedTemplateProfile;
}

export function runDocumentView(
  intent: DocumentIntent,
  internal: any
): DocumentViewOutput {
  const schema = mapToUnifiedSchema(internal);
  const documentInsights = buildDocumentInsightsFromInput(internal);
  if (documentInsights.flags.unreadable) {
    return {
      view: intent,
      schema,
      viewData: {
        status: "unreadable",
        message: "Document unreadable. View extraction was skipped.",
      },
      documentInsights,
      teacherProfile: schema.style,
      courseProfile: schema.template,
    };
  }

  const viewData = viewMappers[intent](internal);

  return {
    view: intent,
    schema,
    viewData,
    documentInsights,
    teacherProfile: schema.style,
    courseProfile: schema.template
  };
}
