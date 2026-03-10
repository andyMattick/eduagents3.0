// src/pipeline/orchestrator/document.ts

import {
  UnifiedAnalyzerOutput,
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "../schema/unifiedSchema";

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
  teacherProfile: UnifiedTeacherStyleProfile;
  courseProfile: UnifiedTemplateProfile;
}

export function runDocumentView(
  intent: DocumentIntent,
  internal: any
): DocumentViewOutput {
  const schema = mapToUnifiedSchema(internal);
  const viewData = viewMappers[intent](internal);

  return {
    view: intent,
    schema,
    viewData,
    teacherProfile: schema.style,
    courseProfile: schema.template
  };
}
