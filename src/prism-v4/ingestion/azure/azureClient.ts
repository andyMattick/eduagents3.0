import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;

function getAzureClient() {
  const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
  const key = process.env.AZURE_FORM_RECOGNIZER_KEY;

  if (!endpoint || !key) {
    throw new Error("Azure layout extraction is not configured. Set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.");
  }

  return new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAzureLayoutModel(fileBuffer: Buffer): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const client = getAzureClient();
      const poller = await client.beginAnalyzeDocument("prebuilt-layout", fileBuffer);
      return await poller.pollUntilDone();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_ATTEMPTS) {
        break;
      }

      await delay(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown Azure error";
  throw new Error(`Azure layout extraction failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}
