/**
 * AZURE DOCUMENT INTELLIGENCE — CLIENT-SIDE CALLER
 *
 * Two extraction strategies:
 *
 *  1. **Direct** (Phase 2 — preferred): Fetches credentials from
 *     /api/azure-token, uploads the raw file directly to Azure from
 *     the browser, and polls for the result client-side.
 *     → Bypasses Vercel's payload limits entirely.
 *
 *  2. **Proxy** (Phase 1 fallback): Base64-encodes the file and sends it
 *     through the /api/azure-extract serverless function, which handles
 *     submission + polling on the server side.
 *
 * The function tries Direct first; if the token endpoint is unavailable
 * it falls back to Proxy automatically.
 */

export interface AzureExtractResult {
  fileName: string;
  content: string;
  pages: Array<{ pageNumber: number; content: string }>;
  paragraphs: Array<{ text: string; role: string }>;
  tables: Array<{ rowCount: number; columnCount: number; preview: string }>;
}

// ── Direct upload (Phase 2) ─────────────────────────────────────────────────

async function fetchAzureCredentials(): Promise<{ endpoint: string; key: string }> {
  const res = await fetch("/api/azure-token");
  if (!res.ok) throw new Error("azure-token unavailable");
  return res.json();
}

async function extractDirect(file: File): Promise<AzureExtractResult> {
  const { endpoint, key } = await fetchAzureCredentials();

  // Submit document
  const analyzeUrl =
    `${endpoint}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`;

  const submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": file.type || "application/pdf",
    },
    body: file,
  });

  if (submitRes.status !== 202) {
    const errText = await submitRes.text();
    throw new Error(`Azure rejected the document (${submitRes.status}): ${errText}`);
  }

  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure did not return an operation-location header");
  }

  // Poll until complete
  const MAX_POLLS = 30;
  const POLL_INTERVAL_MS = 1500;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });

    const pollData = await pollRes.json();

    if (pollData.status === "succeeded") {
      return mapClientResult(pollData.analyzeResult, file.name);
    }

    if (pollData.status === "failed") {
      throw new Error("Azure analysis failed");
    }
  }

  throw new Error("Azure analysis timed out after polling");
}

// ── Proxy upload (Phase 1 fallback) ─────────────────────────────────────────

async function extractViaProxy(file: File): Promise<AzureExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  const response = await fetch("/api/azure-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || "application/pdf",
      fileName: file.name,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure extraction failed (${response.status}): ${text}`);
  }

  return response.json();
}

// ── Public entry point ──────────────────────────────────────────────────────

/**
 * Extract text from a document via Azure Document Intelligence.
 * Tries direct browser→Azure upload first, falls back to the Vercel proxy.
 */
export async function extractAzureText(file: File): Promise<AzureExtractResult> {
  try {
    return await extractDirect(file);
  } catch (directErr) {
    console.warn("[extractAzureText] Direct upload failed, falling back to proxy:", directErr);
    return extractViaProxy(file);
  }
}

// ── Result mapper (mirrors server-side mapAzureResult) ──────────────────────

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

interface AzureAnalyzeResult {
  content: string;
  paragraphs?: AzureParagraph[];
  tables?: AzureTable[];
  pages?: AzurePage[];
}

function mapClientResult(az: AzureAnalyzeResult, fileName: string): AzureExtractResult {
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