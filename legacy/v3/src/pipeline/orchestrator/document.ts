// src/pipeline/orchestrator/document.ts

import {
  UnifiedAnalyzerOutput,
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "../schema/unifiedSchema";
import type { DocumentInsights } from "pipeline/contracts";
import { buildDocumentInsightsFromInput } from "../agents/document/insights";

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

function normalizeDocumentInsights(value: any): DocumentInsights | null {
  if (!value || typeof value !== "object") return null;

  return {
    rawText: typeof value.rawText === "string" ? value.rawText : "",
    pages: Array.isArray(value.pages) ? value.pages : [],
    sections: Array.isArray(value.sections) ? value.sections : [],
    vocab: Array.isArray(value.vocab) ? value.vocab : [],
    formulas: Array.isArray(value.formulas) ? value.formulas : [],
    entities: Array.isArray(value.entities) ? value.entities : [],
    examples: Array.isArray(value.examples) ? value.examples : [],
    concepts: Array.isArray(value.concepts) ? value.concepts : [],
    tables: Array.isArray(value.tables) ? value.tables : [],
    diagrams: Array.isArray(value.diagrams) ? value.diagrams : [],
    metadata: {
      gradeEstimate: value.metadata?.gradeEstimate ?? null,
      subjectEstimate: value.metadata?.subjectEstimate ?? null,
      topicCandidates: Array.isArray(value.metadata?.topicCandidates) ? value.metadata.topicCandidates : [],
      difficulty: value.metadata?.difficulty ?? null,
      readingLevel: value.metadata?.readingLevel ?? null,
    },
    confidence: value.confidence && typeof value.confidence === "object" ? value.confidence : {},
    flags: {
      unreadable: Boolean(value.flags?.unreadable),
      partiallyReadable: value.flags?.partiallyReadable,
      scanned: Boolean(value.flags?.scanned),
      lowConfidence: Boolean(value.flags?.lowConfidence),
    },
  };
}

export function runDocumentView(
  intent: DocumentIntent,
  internal: any
): DocumentViewOutput {
  const schema = mapToUnifiedSchema(internal);
  const documentInsights = normalizeDocumentInsights(internal?.documentInsights) ?? buildDocumentInsightsFromInput(internal);
    // 🔥 Patch #1: pass insights into the view pipeline
  internal.insights = documentInsights;
  
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
