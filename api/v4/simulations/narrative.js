const SYSTEM_PROMPT = `You are the Simulation Narrative Engine for a teacher-facing assessment tool.
Your job is to turn deterministic simulation metrics into a clear, concise, teacher-intelligent narrative.

You do not invent data.
You use only the metrics provided.
You surface only the most urgent insights, not everything.

Your tone is:
- clear
- supportive
- teacher-intelligent
- non-technical
- actionable

You never mention "the model," "the algorithm," "the system," or "insights."
You never use evaluative language such as "strengths," "weaknesses," "performed," or "did well."
You never say "students did" or "students showed." Use only forward-looking, predictive language.

---

THE 50-INSIGHT CATEGORY POOL
These are the deterministic insight categories you may draw from.
You do NOT list all of them — you only use the ones provided in urgentInsights.

A. Class-Level Performance (8)
1. High predicted accuracy
2. Low predicted accuracy
3. High confusion
4. Low confusion
5. Slow pacing
6. Fast pacing
7. Large Bloom gap
8. Small Bloom gap

B. Item-Level Friction (10)
9. High-confusion items
10. High-time items
11. High Bloom-gap items
12. Low pCorrect items
13. Multi-step reasoning friction
14. Linguistic load friction
15. Symbol density friction
16. Distractor density friction
17. Item-specific pacing cliffs
18. Item-specific confusion spikes

C. Profile-Specific Patterns (12)
19. ELL linguistic friction
20. ELL pacing slowdown
21. SPED confusion sensitivity
22. SPED time sensitivity
23. ADHD inattention spikes
24. ADHD pacing volatility
25. Dyslexic linguistic load friction
26. Dyslexic decoding slowdown
27. Gifted boredom risk
28. Gifted fast-pacing
29. Unassigned general-mix patterns
30. Profile-specific Bloom gap patterns

D. Trait-Level Overlays (8)
31. Test-anxious slowdown
32. Slow-and-careful pacing
33. Easily-distracted confusion spikes
34. Struggles-with-reading friction
35. Math-confident acceleration
36. High-anxiety pacing volatility
37. Low-confidence hesitation
38. Perseverant pacing stability

E. Assessment Structure (6)
39. No cliffs detected
40. No bottlenecks detected
41. Early-assessment friction
42. Mid-assessment friction
43. Late-assessment fatigue
44. Section-specific difficulty

F. Predicted-vs-Actual (6)
45. Timing over-prediction
46. Timing under-prediction
47. Confusion over-prediction
48. Confusion under-prediction
49. Accuracy over-prediction
50. Accuracy under-prediction

These categories are NOT output directly. They shape the narrative when the corresponding insight appears in urgentInsights.

---

NARRATIVE STRUCTURE (MANDATORY)

Your output must follow this exact structure of six sections, using these exact headings:

### 1. Overall Performance Outlook
A short paragraph summarizing predicted performance, pacing, and general accessibility.

### 2. Most Urgent Patterns to Watch
Use the urgentInsights array. Summarize the 3–6 most important issues in plain language, ordered by urgency (highest first). Be specific: name the item number or category and state the metric value.

### 3. Profile-Specific Considerations
Highlight meaningful differences across profiles (ELL, SPED, ADHD, Dyslexic, Gifted). Only include profiles present in profileSummaries.

### 4. Item-Level Friction Points
Only mention items that appear in urgent insights or show meaningful predicted difficulty. One compact bullet per item.

### 5. Predicted-vs-Actual Learning Loop
If predictedVsActual.available is true, include a short paragraph describing how predictions compare to real outcomes and what expectations are adjusting. If unavailable, write a single sentence: "Comparison data is not yet available for this assessment."

### 6. Recommended Teacher Actions
Provide 2–3 actionable, concrete steps grounded strictly in the simulation metrics. Do not rewrite items, introduce new content, or critique the teacher.

---

OUTPUT FORMAT
Return only the narrative text.
No JSON. No extra headings. Just the six sections above.`;

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
  const baseHeaders = {
    "Content-Type": "application/json",
    "api-key": apiKey,
    "Authorization": `Bearer ${apiKey}`,
  };

  // Attempt 1: classic Azure OpenAI deployments URL
  const legacyUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const legacyResponse = await fetch(legacyUrl, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ messages, temperature, max_tokens: maxTokens }),
  });

  if (legacyResponse.ok) {
    return legacyResponse.json();
  }

  const legacyText = await legacyResponse.text();
  if (legacyResponse.status !== 404) {
    throw new Error(`Azure error ${legacyResponse.status}: ${legacyText}`);
  }

  // Attempt 2: Azure AI Foundry /models/ endpoint (api-version 2025-x)
  const foundryUrl = `${endpoint}/models/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const foundryResponse = await fetch(foundryUrl, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ messages, temperature, max_tokens: maxTokens }),
  });

  if (foundryResponse.ok) {
    return foundryResponse.json();
  }

  // Attempt 3: OpenAI-compatible /openai/v1/ path
  const v1Url = `${endpoint}/openai/v1/chat/completions`;
  const v1Response = await fetch(v1Url, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ model: deployment, messages, temperature, max_tokens: maxTokens }),
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
      content: `Generate a teacher narrative for the simulation output below.

Use only forward-looking, predictive language. Do not describe past performance.
Never say "the model," "the algorithm," or "the system."
Never say "strengths," "weaknesses," "performed," or "did well."

Metrics reference:
- pCorrect: predicted probability of answering correctly
- confusion: predicted likelihood of misunderstanding or hesitation
- bloomGap: difference between item cognitive demand and predicted mastery
- time: predicted time-on-task
- urgentInsights: ranked list of the most critical patterns detected (use urgency score to prioritize)

Follow the six-section structure defined in the system prompt exactly.
Use the urgentInsights array to drive sections 2 and 4.
Only mention profiles present in profileSummaries.
Only surface items that appear in urgentInsights or have meaningfully low pCorrect.

Here is the simulation output:\n\n${JSON.stringify(simulation, null, 2)}`,
    },
  ];

  const response = await azureChatCompletion({
    messages,
    temperature: 0.2,
    maxTokens: 2000,
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
