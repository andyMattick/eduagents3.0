import { callAzureLayoutModel } from "./azureClient";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runAzureExtraction(fileBuffer: Buffer) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      return await callAzureLayoutModel(fileBuffer);
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        console.error("Azure extraction failed:", err);
        throw new Error("Azure extraction failed after retries");
      }
      await delay(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
}
