import { runUnifiedAssessment } from "./teacherSystemService"; // or wherever your orchestrator lives

export async function summarizeAssessmentIntent(req: any) {
  console.log(
    "%c[Summarizer] Starting summarization...",
    "color:#0EA5E9;font-weight:bold;"
  );

  console.log(
    "%c[Summarizer] Input intent:",
    "color:#0284C7;font-weight:bold;",
    req
  );

  const summary = await runUnifiedAssessment(req);

  console.log(
    "%c[Summarizer] Summary complete:",
    "color:#0D9488;font-weight:bold;",
    summary
  );

  return summary;
}
