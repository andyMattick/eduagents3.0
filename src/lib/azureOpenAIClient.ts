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

  return value.replace(/\/openai\/?$/i, "").replace(/\/+$/, "");
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
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure error ${response.status}: ${text}`);
  }

  return response.json() as Promise<AzureChatCompletionResponse>;
}
