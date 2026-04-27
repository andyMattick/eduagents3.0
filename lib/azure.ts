/**
 * lib/azure.ts — Server-side Azure Document Intelligence helpers
 *
 * Provides the Azure endpoint/key resolution and the result mapper
 * so they can be shared between /api/azure-extract and job processors.
 */

/**
 * Normalize an Azure endpoint — handles common env var corruption:
 *   - stray "..." prefixes (Vercel copy-paste artifact)
 *   - missing double-slash after scheme
 *   - trailing slashes
 *   - leading/trailing whitespace
 */
function normalizeEndpoint(raw: string): string {
  let s = raw
    .trim()
    .replace(/\.{2,}/g, "")            // kill stray dots (e.g. "...https://")
    .replace(/^https:\/(?!\/)/, "https://") // fix single-slash scheme
    .replace(/\/+$/, "");               // strip trailing slashes

  // If the scheme is missing entirely, prepend https://
  if (!/^https?:\/\//.test(s)) {
    s = `https://${s}`;
  }

  return s;
}

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getAzureConfig() {
  const endpoint = getEnvValue("AZURE_DOCUMENT_ENDPOINT", "AZURE_FORM_RECOGNIZER_ENDPOINT");
  const key = getEnvValue("AZURE_DOCUMENT_KEY", "AZURE_FORM_RECOGNIZER_KEY");
  const model = getEnvValue("AZURE_DOCUMENT_MODEL", "AZURE_FORM_RECOGNIZER_MODEL") ?? "prebuilt-read";
  const pages = getEnvValue("AZURE_DOCUMENT_PAGES", "AZURE_FORM_RECOGNIZER_PAGES") ?? "1-";

  if (!endpoint || !key) {
    throw new Error(
      "Azure is not configured. Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY, or AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.",
    );
  }

  const clean = normalizeEndpoint(endpoint);
  console.log("[azure] normalized endpoint:", clean);

  return { endpoint: clean, key, model, pages };
}

export function azureAnalyzeUrl(endpoint: string, model: string, pages?: string): string {
  const selectedModel = model?.trim() || "prebuilt-read";
  const url = new URL(`${endpoint}/documentintelligence/documentModels/${selectedModel}:analyze`);
  url.searchParams.set("api-version", "2024-11-30");
  if (pages && pages.trim().length > 0) {
    url.searchParams.set("pages", pages.trim());
  }
  return url.toString();
}

export async function analyzeAzureDocument(
  fileBuffer: Buffer,
  mimeType = "application/pdf",
): Promise<AzureAnalyzeResult> {
  const config = getAzureConfig();
  const analyzeUrl = azureAnalyzeUrl(config.endpoint, config.model, config.pages);
  const fallbackAnalyzeUrl = azureAnalyzeUrl(config.endpoint, config.model);

  console.log("[azure] URL:", analyzeUrl);
  console.log("[azure] model:", config.model);
  console.log("[azure] pages policy:", config.pages || "<none>");

  let submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(fileBuffer),
  });

  if (submitRes.status !== 202 && config.pages) {
    const firstAttemptError = await submitRes.text();
    const normalizedError = firstAttemptError.toLowerCase();
    const shouldFallback = normalizedError.includes("pages") || normalizedError.includes("query") || normalizedError.includes("invalid");
    if (shouldFallback) {
      console.warn("[azure] pages parameter rejected; retrying without pages query", {
        status: submitRes.status,
      });
      submitRes = await fetch(fallbackAnalyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": config.key,
          "Content-Type": mimeType,
        },
        body: new Uint8Array(fileBuffer),
      });
    } else {
      throw new Error(`Azure rejected the document (${submitRes.status}): ${firstAttemptError}`);
    }
  }

  if (submitRes.status !== 202) {
    const errText = await submitRes.text();
    throw new Error(`Azure rejected the document (${submitRes.status}): ${errText}`);
  }

  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure did not return an operation-location header");
  }

  const maxPolls = 30;
  const pollIntervalMs = 1500;

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const pollRes = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": config.key,
      },
    });

    const pollData = (await pollRes.json()) as { status?: string; analyzeResult?: AzureAnalyzeResult };

    if (pollData.status === "succeeded") {
      return pollData.analyzeResult ?? { content: "", pages: [], paragraphs: [], tables: [] };
    }

    if (pollData.status === "failed") {
      throw new Error(`Azure analysis failed: ${JSON.stringify(pollData)}`);
    }
  }

  throw new Error("Azure analysis timed out after polling");
}

// ── Result types ────────────────────────────────────────────────────────────

interface AzureParagraph {
  content: string;
  role?: string;
}

interface AzureTableCell {
  content: string;
  rowIndex: number;
  columnIndex: number;
}

interface AzureTable {
  rowCount: number;
  columnCount: number;
  cells: AzureTableCell[];
}

interface AzurePage {
  pageNumber: number;
}

export interface AzureAnalyzeResult {
  content: string;
  paragraphs?: AzureParagraph[];
  tables?: AzureTable[];
  pages?: AzurePage[];
}

export interface AzureExtractResult {
  fileName: string;
  content: string;
  pages: Array<{ pageNumber: number; content: string }>;
  paragraphs: Array<{ text: string; role: string }>;
  tables: Array<{ rowCount: number; columnCount: number; preview: string }>;
}

export function mapAzureResult(
  az: AzureAnalyzeResult,
  fileName: string
): AzureExtractResult {
  const pages = (az.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber,
    content: "",
  }));

  const paragraphs = (az.paragraphs ?? []).map((p) => ({
    text: (p.content ?? "").trim(),
    role: p.role ?? "body",
  }));

  const tables = (az.tables ?? []).map((t) => {
    const header = t.cells
      .filter((c) => c.rowIndex === 0)
      .sort((a, b) => a.columnIndex - b.columnIndex)
      .map((c) => c.content)
      .join(" | ");
    return {
      rowCount: t.rowCount,
      columnCount: t.columnCount,
      preview: header.slice(0, 200),
    };
  });

  return { fileName, content: az.content ?? "", pages, paragraphs, tables };
}
