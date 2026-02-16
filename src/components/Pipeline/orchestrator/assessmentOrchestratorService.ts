import {
  UnifiedAssessmentRequest,
  UnifiedAssessmentResponse
} from "../contracts/assessmentContracts";
import { writerCall } from "../writer/writerCall";
import { astronomerCall } from "../astronomer/astronomerCall";
import { philosopherCall } from "../philosopher/philosopherCall";

export async function runUnifiedAssessment(
  req: UnifiedAssessmentRequest
): Promise<UnifiedAssessmentResponse> {

  let cycles = 0;
  let lastDraft: any = null;

  while (cycles < 3) {
    cycles++;

    // 1. Writer creates draft
    const draft = await writerCall(req, lastDraft);

    // 2. Astronomer clusters the draft
    const astro = await astronomerCall(draft);

    // 3. Philosopher interprets clusters
    const phil = await philosopherCall(astro);

    if (phil.status === "complete") {
      return {
        ...draft,
        astronomerClusters: astro.clusters,
        philosopherExplanation: phil,
        rewriteMeta: { cycles, status: "complete" }
      };
    }

    lastDraft = draft;
  }

  // Forced complete after 3 cycles
  const astro = await astronomerCall(lastDraft!);
  const phil = await philosopherCall(astro);

  return {
    ...lastDraft!,
    astronomerClusters: astro.clusters,
    philosopherExplanation: {
      ...phil,
      status: "forced-complete"
    },
    rewriteMeta: { cycles: 3, status: "forced-complete" }
  };
}
