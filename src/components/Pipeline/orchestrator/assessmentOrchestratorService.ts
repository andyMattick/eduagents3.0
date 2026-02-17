import {
  UnifiedAssessmentRequest,
  UnifiedAssessmentResponse
} from "../contracts/assessmentContracts";
import { writerCall } from "../writer/writerCall";
import { runAstronomer } from "../astronomer/astronomerCall";

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
    const astro = await runAstronomer(draft);



    // 3. Philosopher interprets clusters
    const phil = await philosopherCall(astro);

    if (phil.decision.status === "complete") {
 
      return {
        ...draft,
        astronomerClusters: { clusters: astro.clusters },

        philosopherExplanation: phil,
        rewriteMeta: { cycles, status: "complete" }
      };
    }

    lastDraft = draft;
  }

  // Forced complete after 3 cycles
 const finalAstro = await runAstronomer(lastDraft!);
 const finalPhil = await philosopherCall(finalAstro);

  return {
    ...lastDraft!,
    astronomerClusters: { clusters: finalAstro.clusters },
    philosopherExplanation: {
      ...finalPhil,
      status: "forced-complete"
    },
    rewriteMeta: { cycles: 3, status: "forced-complete" }
  };
}
