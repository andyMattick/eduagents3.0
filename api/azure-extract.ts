import type { IncomingMessage, ServerResponse } from "http";
import Busboy from "busboy";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
  maxDuration: 60
};
/**
 * AZURE DOCUMENT INTELLIGENCE EXTRACTION PROXY
 *
 * Accepts a multipart/form-data POST with a single `file` field,
 * forwards it to Azure Document Intelligence (prebuilt-layout model),
 * and returns a structured AzureExtractResult JSON object.
 *
 * Required environment variables:
 *   AZURE_DOCUMENT_ENDPOINT  — e.g. https://<resource>.cognitiveservices.azure.com/
 *   AZURE_DOCUMENT_KEY       — your Azure API key
 *
 * The browser must not call Azure directly — this server-side proxy keeps
 * the API key out of the client bundle and avoids CORS issues.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function setCors(res: ServerResponse) {
  
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const endpoint = process.env.AZURE_DOCUMENT_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_KEY;

  if (!endpoint || !key) {
    return res.status(500).json({ error: "Azure not configured" });
  }

  const busboy = Busboy({ headers: req.headers });

  let fileBuffer: Buffer | null = null;
  let mimeType = "application/octet-stream";

  busboy.on("file", (_name, file, info) => {
    mimeType = info.mimeType;

    const chunks: Buffer[] = [];
    file.on("data", (data) => chunks.push(data));
    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on("finish", async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const analyzeUrl =
        `${endpoint.replace(/\/$/, "")}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-09-30` +
        `&includeTextDetails=true`;

      const submitRes = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": mimeType
        },
        body: fileBuffer as unknown as BodyInit
      });

      const text = await submitRes.text();

      res.status(200).json({ content: text });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  req.pipe(busboy);
}

// ── Sleep helper ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Minimal Azure result types (subset of prebuilt-layout response) ───────────

interface AzureParagraph {
  content: string;
  role?: string;
  spans?: Array<{ offset: number; length: number }>;
}

interface AzureTable {
  rowCount: number;
  columnCount: number;
  cells: Array<{ content: string; rowIndex: number; columnIndex: number }>;
}

interface AzurePage {
  pageNumber: number;
  width?: number;
  height?: number;
  spans?: Array<{ offset: number; length: number }>;
}

interface AzureAnalyzeResult {
  content: string;
  paragraphs?: AzureParagraph[];
  tables?: AzureTable[];
  pages?: AzurePage[];
}

// ── Compact result shape sent back to the browser ─────────────────────────────

export interface AzureExtractResult {
  fileName: string;
  content: string;
  pages: Array<{ pageNumber: number; content: string }>;
  paragraphs: Array<{ text: string; role: string }>;
  tables: Array<{ rowCount: number; columnCount: number; preview: string }>;
}

function mapAzureResult(az: AzureAnalyzeResult, fileName: string): AzureExtractResult {
  const pages = (az.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber,
    content: "", // content is in paragraphs/spans; full text is in az.content
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

  return {
    fileName,
    content: az.content ?? "",
    pages,
    paragraphs,
    tables,
  };
}
