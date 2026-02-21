import { MinimalTeacherIntent, UnifiedAssessmentRequest } from "@/pipeline/contracts";

export function convertMinimalToUAR(
  intent: MinimalTeacherIntent
): UnifiedAssessmentRequest {
  return {
    gradeLevels: intent.gradeLevels,
    course: intent.course,
    unitName: intent.unitName,
    lessonName: intent.lessonName ?? null,
    topic: intent.topic,
    assessmentType: intent.assessmentType,
    studentLevel: intent.studentLevel,
    time: intent.time,
    additionalDetails: intent.additionalDetails ?? null,
    sourceDocuments: intent.sourceDocuments ?? [],
    exampleAssessment: intent.exampleAssessment,
  };
}
