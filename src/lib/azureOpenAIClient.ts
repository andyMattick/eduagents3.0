import { AzureOpenAI } from "openai";

function normalizeEndpoint(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) {
    throw new Error("AZURE_OPENAI_ENDPOINT is required for Azure narrative generation.");
  }

  // Azure OpenAI endpoint should be the resource host only; SDK adds /openai path.
  return value.replace(/\/openai\/?$/i, "").replace(/\/+$/, "");
}

function resolveApiVersion(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  return value || "2024-02-15-preview";
}

export const azureClient = new AzureOpenAI({
  endpoint: normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT),
  apiKey: String(process.env.AZURE_OPENAI_API_KEY ?? "").trim(),
  apiVersion: resolveApiVersion(process.env.AZURE_OPENAI_API_VERSION),
});
