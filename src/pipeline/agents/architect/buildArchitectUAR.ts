// pipeline/agents/architect/buildArchitectUAR.ts
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";

export interface ArchitectUAR {
  version: "3.2";
  domain: string;
  grade: string;
  assessmentType: string;
  questionTypes: string[];
  questionCount: number;
  topic: string | null;
  unitName: string;
  lessonName: string | null;
  studentLevel: "remedial" | "standard" | "honors" | "ap";
  timeMinutes: number;
  additionalDetails: string | null;
}

export function buildArchitectUAR(uar: UnifiedAssessmentRequest): ArchitectUAR {
  return {
    version: "3.2",
    domain: uar.course,
    grade: uar.gradeLevels?.[0] ?? "Unknown",
    assessmentType: uar.assessmentType,
    questionTypes: uar.questionTypes?.length
      ? uar.questionTypes
      : ["multipleChoice", "shortAnswer"],

    questionCount:
      uar.questionCount ??
      inferQuestionCount(
        uar.time,
        uar.questionTypes?.length ? uar.questionTypes : ["multipleChoice", "shortAnswer"]
      ),

    topic: uar.topic,
    unitName: uar.unitName,
    lessonName: uar.lessonName,
    studentLevel: uar.studentLevel as any,
    timeMinutes: uar.time,
    additionalDetails: uar.additionalDetails
  };
}

import { inferQuestionCount } from "@/pipeline/contracts/UnifiedAssessmentRequest";
