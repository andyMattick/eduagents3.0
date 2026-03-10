// src/pipeline/orchestrator/orchestrator.ts

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

export type OrchestratorIntent =
  | "create"
  | "analyze"
  | "difficulty"
  | "compare"
  | "summary"
  | "concepts"
  | "raw";

const viewMappers = {
  create: mapToUnifiedSchema,
  analyze: mapToUnifiedSchema,
  difficulty: mapToDifficultyProfile,
  compare: mapToComparisonProfile,
  summary: mapToSummaryView,
  concepts: mapToConceptGraph,
  raw: (internal: any) => internal
};

export interface ArchitectInput {
  view: OrchestratorIntent;
  schema: UnifiedAnalyzerOutput;
  viewData: any;
  teacherProfile: UnifiedTeacherStyleProfile;
  courseProfile: UnifiedTemplateProfile;
}

export function runOrchestrator(
  intent: OrchestratorIntent,
  internal: any
): ArchitectInput {
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
