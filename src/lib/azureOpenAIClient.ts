type AzureChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AzureChatCompletionOptions = {
  messages: AzureChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

type AzureChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function normalizeEndpoint(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) {
    throw new Error("AZURE_OPENAI_ENDPOINT is required for Azure narrative generation.");
  }

  return value.replace(/\/+$/, "");
}

function resolveApiVersion(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  return value || "2024-02-15-preview";
}

function resolveAzureOpenAIConfig() {
  const endpoint = normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT);
  const deployment = String(process.env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();
  const apiKey = String(process.env.AZURE_OPENAI_API_KEY ?? "").trim();
  const apiVersion = resolveApiVersion(process.env.AZURE_OPENAI_API_VERSION);

  if (!deployment || !apiKey) {
    throw new Error("Azure OpenAI environment variables missing");
  }

  return { endpoint, deployment, apiKey, apiVersion };
}

export async function azureChatCompletion({
  messages,
  temperature = 0.2,
  maxTokens = 800,
}: AzureChatCompletionOptions): Promise<AzureChatCompletionResponse> {
  const { endpoint, deployment, apiKey, apiVersion } = resolveAzureOpenAIConfig();
  const legacyUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const headers = {
    "Content-Type": "application/json",
    "api-key": apiKey,
  };

  const legacyResponse = await fetch(legacyUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (legacyResponse.ok) {
    return legacyResponse.json() as Promise<AzureChatCompletionResponse>;
  }

  const legacyText = await legacyResponse.text();
  const shouldRetryWithV1 = legacyResponse.status === 404 && legacyText.includes("Resource not found");
  if (!shouldRetryWithV1) {
    throw new Error(`Azure error ${legacyResponse.status}: ${legacyText}`);
  }

  const v1Response = await fetch(`${endpoint}/openai/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: deployment,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!v1Response.ok) {
    const v1Text = await v1Response.text();
    throw new Error(`Azure error ${v1Response.status}: ${v1Text}`);
  }

  return v1Response.json() as Promise<AzureChatCompletionResponse>;
}
