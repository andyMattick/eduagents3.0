import { callAzureLayoutModel } from "./azureClient";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function estimatePdfPageCount(fileBuffer: Buffer): number | null {
  try {
    // Heuristic count from raw PDF object markers; good for diagnostics only.
    const raw = fileBuffer.toString("latin1");
    const matches = raw.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}

function logPreAzureDiagnostics(fileBuffer: Buffer, mimeType: string): number | null {
  const byteLength = fileBuffer.byteLength;
  if (mimeType.toLowerCase().includes("pdf")) {
    const estimatedPages = estimatePdfPageCount(fileBuffer);
    console.log("[ingestion][azure][preflight]", {
      mimeType,
      byteLength,
      estimatedPdfPages: estimatedPages,
    });
    return estimatedPages;
  }

  console.log("[ingestion][azure][preflight]", {
    mimeType,
    byteLength,
    estimatedPdfPages: null,
  });
  return null;
}

export async function runAzureExtraction(fileBuffer: Buffer, mimeType = "application/pdf") {
  const estimatedPdfPages = logPreAzureDiagnostics(fileBuffer, mimeType);

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await callAzureLayoutModel(fileBuffer, mimeType) as {
        pages?: unknown[];
        paragraphs?: unknown[];
        tables?: unknown[];
        content?: string;
      };
      console.log("[ingestion][azure][postflight]", {
        mimeType,
        byteLength: fileBuffer.byteLength,
        azurePages: Array.isArray(result?.pages) ? result.pages.length : 0,
        azureParagraphs: Array.isArray(result?.paragraphs) ? result.paragraphs.length : 0,
        azureTables: Array.isArray(result?.tables) ? result.tables.length : 0,
        contentChars: typeof result?.content === "string" ? result.content.length : 0,
      });

      const azurePageCount = Array.isArray(result?.pages) ? result.pages.length : 0;
      if (
        mimeType.toLowerCase().includes("pdf")
        && typeof estimatedPdfPages === "number"
        && estimatedPdfPages > 2
        && azurePageCount === 2
      ) {
        console.warn("[ingestion][azure][limit-warning] PDF appears multi-page but Azure returned exactly 2 pages. This commonly indicates Azure Document Intelligence free-tier page limits (F0).", {
          estimatedPdfPages,
          azurePageCount,
        });
      }

      return result;
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
