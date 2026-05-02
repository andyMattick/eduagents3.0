const SYSTEM_PROMPT = `You are an educational simulation interpreter. You explain predicted student performance based on a deterministic simulation engine.

When predicted-vs-actual comparison data is provided, you may also explain where real outcomes differed from predictions. In those cases, describe deltas as model calibration signals, not student judgments.

You never use evaluative language such as "strengths," "weaknesses," "performed," or "did well." Use objective, teacher-friendly language grounded in the provided metrics.

Your job is to translate the simulation output into a clear, teacher-friendly narrative that helps teachers understand what the simulation suggests about how students are likely to experience the assessment.

Follow these rules:

1. Use predictive language for forecast sections.
	- Say "students are expected to," "the model predicts," "the simulation suggests," "students may experience," "this item is likely to create confusion."
  - Never say "students did," "students showed," "strengths," "weaknesses," or "performed".

2. If predicted-vs-actual data is available, add a comparison section.
  - Describe timingDelta, confusionDelta, and accuracyDelta as differences between actual and predicted aggregates.
  - Explain profileDeltas as calibration signals by student profile.
  - Do not over-interpret causality; state what changed and where to monitor next.
  - If predicted-vs-actual is unavailable, explicitly note that comparison is not yet available.

3. Reference the simulation metrics explicitly and accurately.
	- pCorrect: predicted probability of answering correctly.
	- Confusion: predicted likelihood of misunderstanding or hesitation.
	- Bloom gap: difference between item cognitive demand and predicted student mastery.
	- Time: predicted time-on-task.
	- Spikes: sudden increases in cognitive load, confusion, or time.
	- Cliffs: sharp drops in predicted performance or comprehension.
	- Bottlenecks: items or concepts that may slow progress or create difficulty for multiple profiles.

4. Explain predicted difficulty patterns.
	- Identify items with lower pCorrect.
	- Identify items with higher confusion.
	- Identify items with higher time demand.
	- Identify any spikes, cliffs, or bottlenecks if present.

5. Explain predicted pacing.
	- Describe whether students are expected to move quickly, slowly, or encounter pacing pressure.
	- Reference predicted time values.

6. Explain predicted cognitive demand.
	- Use Bloom gap to describe whether items may exceed students' expected mastery level.
	- Use predictive language: "students may find higher-order items more demanding."

7. Provide actionable, forward-looking teacher insights.
	- Suggest what a teacher might consider adjusting, clarifying, or scaffolding.
	- Keep suggestions grounded in the simulation metrics.
	- Never rewrite items, never introduce new content, and never critique the teacher.

8. Tone and style.
	- Clear, concise, teacher-friendly.
	- No jargon unless defined.
	- No moralizing or evaluative tone.
	- No past tense.

Your output should be a single, coherent narrative that helps a teacher understand predicted experience, and where available, how actual outcomes diverged from those predictions.`;

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

function resolveAzureConfig() {
  const endpoint = normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT);
  const deployment = String(process.env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();
  const apiKey = String(process.env.AZURE_OPENAI_API_KEY ?? "").trim();
  const apiVersion = resolveApiVersion(process.env.AZURE_OPENAI_API_VERSION);
  if (!deployment || !apiKey) {
    throw new Error("Azure OpenAI environment variables missing");
  }

  return { endpoint, deployment, apiKey, apiVersion };
}

async function azureChatCompletion({ messages, temperature = 0.2, maxTokens = 800 }) {
  const { endpoint, deployment, apiKey, apiVersion } = resolveAzureConfig();
  const legacyUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const legacyBody = {
    messages,
    temperature,
    max_tokens: maxTokens
  };
  const baseHeaders = {
    "Content-Type": "application/json",
    "api-key": apiKey
  };

  const legacyResponse = await fetch(legacyUrl, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(legacyBody)
  });

  if (legacyResponse.ok) {
    return legacyResponse.json();
  }

  const legacyText = await legacyResponse.text();
  const shouldRetryWithV1 = legacyResponse.status === 404 && legacyText.includes("Resource not found");
  if (!shouldRetryWithV1) {
    throw new Error(`Azure error ${legacyResponse.status}: ${legacyText}`);
  }

  const v1Url = `${endpoint}/openai/v1/chat/completions`;
  const v1Response = await fetch(v1Url, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      model: deployment,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!v1Response.ok) {
    const v1Text = await v1Response.text();
    throw new Error(`Azure error ${v1Response.status}: ${v1Text}`);
  }

  return v1Response.json();
}

export async function buildTeacherNarrativeFromSimulation(simulation) {
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

8. Predicted-vs-actual calibration (only when available)
  - Explain timingDelta (actual.avgTime - predicted.avgTime)
  - Explain confusionDelta (actual.avgConfusion - predicted.avgConfusion)
  - Explain accuracyDelta (actual.avgPCorrect - predicted.avgPCorrect)
  - Summarize profileDeltas as profile-specific calibration notes.
  - If predictedVsActual.available is false or missing, state that comparison data is not yet available.

Write a single, coherent narrative that helps the teacher understand how students are
predicted to experience the assessment.

Here is the simulation output:\n\n${JSON.stringify(simulation, null, 2)}`,
    },
  ];

  const response = await azureChatCompletion({
    messages,
    temperature: 0.2,
    maxTokens: 800,
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
