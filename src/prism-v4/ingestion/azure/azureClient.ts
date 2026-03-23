import { analyzeAzureDocument } from "../../../../lib/azure";

const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAzureLayoutModel(fileBuffer: Buffer): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await analyzeAzureDocument(fileBuffer, "application/pdf");
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
