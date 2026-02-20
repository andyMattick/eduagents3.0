// src/components/Pipeline/writer/astronomerPrompt.ts

import { UnifiedAssessmentResponse } from "../contracts/assessmentContracts";
import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";


export function buildAstronomerPrompt(
  uar: UnifiedAssessmentRequest,
  writerDraft: UnifiedAssessmentResponse
): string {
  return `
You are the ASTRONOMER module in an adaptive assessment pipeline.

Your job is to analyze the Writer's draft AND estimate how different types of students would interact with the problems.

You must produce:
1. **Misconception clusters**  
2. **Culprit problems** (problems that should be rewritten)
3. **Cognitive load analysis**  
4. **Pacing analysis**  
5. **Predicted student interaction patterns**, including:
   - Which problems students are likely to get wrong
   - Where confusion spikes occur
   - Where fatigue spikes occur
   - Where reading load is too high
   - Where math fluency demands exceed typical levels
   - Where reasoning jumps are too large
   - Where scaffolding is insufficient
   - Where students will misinterpret the question
   - Where students will guess

6. **Simulated student outcome summary**, including:
   - Estimated % correct per problem
   - Estimated time per problem
   - Estimated cognitive strain per problem
   - Estimated misconception triggered per problem

Teacher Intent:
${JSON.stringify(uar, null, 2)}

   Here is the Writer's draft:
${JSON.stringify(writerDraft, null, 2)}

Return JSON ONLY in this exact shape:

{
  "clusters": [
    {
      "clusterId": "string",
      "misconceptions": ["string", "string"],
      "problemIds": ["p1", "p3"]
    }
  ],
  "culpritProblems": ["p2", "p5"],
  "studentInteraction": [
    {
      "problemId": "p1",
      "estimatedCorrectRate": 0.72,
      "estimatedTime": 1.4,
      "cognitiveLoad": 0.58,
      "likelyMisconceptions": ["misread graph", "confuses rate vs total"],
      "fatigueRisk": "low",
      "confusionRisk": "medium"
    }
  ],
  "notes": ["string", "string"]
}
`;
}
