// pipeline/agents/architect/buildArchitectUAR.ts
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";

export interface ArchitectUAR {
  version: "3.2";
  domain: string;
  grade: string;
  assessmentType: string;
  questionTypes: string[];
  questionCount: number;
  topic: string;
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
      inferQuestionCountFromTime(uar.time),

    topic: uar.topic,
    unitName: uar.unitName,
    lessonName: uar.lessonName,
    studentLevel: uar.studentLevel as any,
    timeMinutes: uar.time,
    additionalDetails: uar.additionalDetails
  };
}

function inferQuestionCountFromTime(time: number): number {
  if (time <= 10) return 3;
  if (time <= 20) return 5;
  if (time <= 30) return 7;
  return 10;
}
