import { AssessmentIntent } from "../components/Pipeline/contracts/assessmentContracts";

export async function summarizeAssessmentIntent(intent: AssessmentIntent) {
  const prompt = `
    Summarize the teacher's assessment intent clearly and concisely.

    Course: ${intent.course}
    Unit: ${intent.unit}
    Student Level: ${intent.studentLevel}
    Assignment Type: ${intent.assignmentType}
    Time: ${intent.time}
    Additional Details: ${intent.additionalDetails}
  `;

  const summaryText = await callYourAI(prompt);

  return { summaryText };
}
