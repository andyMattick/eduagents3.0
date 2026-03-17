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

export function getAzureConfig() {
  const endpoint = process.env.AZURE_DOCUMENT_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_KEY;

  if (!endpoint || !key) {
    throw new Error("AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY must be set");
  }

  const clean = normalizeEndpoint(endpoint);
  console.log("[azure] normalized endpoint:", clean);

  return { endpoint: clean, key };
}

export function azureAnalyzeUrl(endpoint: string): string {
  return `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`;
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

interface AzureAnalyzeResult {
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
