import { AzureOpenAI } from "openai";

const SYSTEM_PROMPT = `You are an educational simulation interpreter. You explain predicted student performance based on a deterministic simulation engine. You never describe past performance, never imply that students have already taken the assessment, and never use evaluative language such as "strengths," "weaknesses," "performed," or "did well." You always use predictive, forward-looking language such as "the simulation predicts," "students are expected to," "the model anticipates," or "this item may create difficulty."

Your job is to translate the simulation output into a clear, teacher-friendly narrative that helps teachers understand what the simulation suggests about how students are likely to experience the assessment.

Follow these rules:

1. Use predictive language only.
	- Say "students are expected to," "the model predicts," "the simulation suggests," "students may experience," "this item is likely to create confusion."
	- Never say "students did," "students showed," "strengths," "weaknesses," "performed," or any past-tense framing.

2. Reference the simulation metrics explicitly and accurately.
	- pCorrect: predicted probability of answering correctly.
	- Confusion: predicted likelihood of misunderstanding or hesitation.
	- Bloom gap: difference between item cognitive demand and predicted student mastery.
	- Time: predicted time-on-task.
	- Spikes: sudden increases in cognitive load, confusion, or time.
	- Cliffs: sharp drops in predicted performance or comprehension.
	- Bottlenecks: items or concepts that may slow progress or create difficulty for multiple profiles.

3. Explain predicted difficulty patterns.
	- Identify items with lower pCorrect.
	- Identify items with higher confusion.
	- Identify items with higher time demand.
	- Identify any spikes, cliffs, or bottlenecks if present.

4. Explain predicted pacing.
	- Describe whether students are expected to move quickly, slowly, or encounter pacing pressure.
	- Reference predicted time values.

5. Explain predicted cognitive demand.
	- Use Bloom gap to describe whether items may exceed students' expected mastery level.
	- Use predictive language: "students may find higher-order items more demanding."

6. Provide actionable, forward-looking teacher insights.
	- Suggest what a teacher might consider adjusting, clarifying, or scaffolding.
	- Keep suggestions grounded in the simulation metrics.
	- Never rewrite items, never introduce new content, and never critique the teacher.

7. Tone and style.
	- Clear, concise, teacher-friendly.
	- No jargon unless defined.
	- No moralizing or evaluative tone.
	- No past tense.

Your output should be a single, coherent narrative that helps a teacher understand how students are predicted to experience the assessment, based entirely on the simulation metrics provided.`;

function normalizeEndpoint(raw) {
  const value = String(raw ?? "").trim();
  if (!value) {
    throw new Error("AZURE_OPENAI_ENDPOINT is required for Azure narrative generation.");
  }

  return value.replace(/\/openai\/?$/i, "").replace(/\/+$/, "");
}

function resolveApiVersion(raw) {
  const value = String(raw ?? "").trim();
  return value || "2024-02-15-preview";
}

function createAzureClient() {
  const apiKey = String(process.env.AZURE_OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("AZURE_OPENAI_API_KEY is required for Azure narrative generation.");
  }

  return new AzureOpenAI({
    endpoint: normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT),
    apiKey,
    apiVersion: resolveApiVersion(process.env.AZURE_OPENAI_API_VERSION),
  });
}

export async function buildTeacherNarrativeFromSimulation(simulation) {
  const deployment = String(process.env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();
  if (!deployment) {
    throw new Error("AZURE_OPENAI_DEPLOYMENT is required for Azure narrative generation.");
  }

  const azureClient = createAzureClient();
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Using the simulation output provided below, generate a predictive narrative for a teacher.
Do not describe past performance. Do not imply that students have already taken the assessment.
Use only forward-looking, simulation-based language such as "the model predicts,"
"students are expected to," "the simulation suggests," or "students may experience."

Your narrative must interpret the following metrics exactly as they appear in the simulation:

- pCorrect - predicted probability of answering each item correctly
- confusion - predicted likelihood of misunderstanding or hesitation
- bloomGap - difference between item cognitive demand and predicted mastery
- time - predicted time-on-task
- spikes - sudden increases in cognitive load, confusion, or time
- cliffs - sudden drops in predicted performance or comprehension
- bottlenecks - items or concepts that may slow progress for multiple profiles

Your narrative should include:

1. Predicted performance overview
   Summarize the expected score range and general difficulty pattern.

2. Predicted hardest items
   Identify items with lower pCorrect, higher confusion, or higher time demand.

3. Predicted confusion patterns
   Explain where students may hesitate or misinterpret based on the confusion metric.

4. Predicted pacing
   Describe expected time-on-task and whether pacing pressure is likely.

5. Predicted cognitive demand
   Use Bloom gap to explain where items may exceed students' expected mastery.

6. Spikes, cliffs, and bottlenecks
   Mention these only if present in the simulation output.

7. Actionable, forward-looking insights
   Provide teacher-friendly suggestions grounded strictly in the simulation metrics.
   Do not rewrite items. Do not introduce new content. Do not critique the teacher.

Write a single, coherent narrative that helps the teacher understand how students are
predicted to experience the assessment.

Here is the simulation output:\n\n${JSON.stringify(simulation, null, 2)}`,
    },
  ];

  const response = await azureClient.chat.completions.create({
    model: deployment,
    messages,
    temperature: 0.2,
    max_tokens: 800,
  });

  return {
    text: response.choices[0]?.message?.content ?? "",
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
    },
  };
}
