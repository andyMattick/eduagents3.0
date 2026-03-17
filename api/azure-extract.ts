import type { VercelRequest, VercelResponse } from "@vercel/node";

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

function setCors(res: VercelResponse) {
  
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("API route invoked");

console.log(
  "endpoint exists:",
  process.env.AZURE_DOCUMENT_ENDPOINT ? "YES" : "NO"
);

console.log(
  "key exists:",
  process.env.AZURE_DOCUMENT_KEY ? "YES" : "NO"
);

console.log("body type:", typeof req.body);
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).json({});
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const endpoint = process.env.AZURE_DOCUMENT_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_KEY;

  if (!endpoint || !key) {
    return res.status(500).json({
      error: "Azure Document Intelligence is not configured. Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY.",
    });
  }

  // Accept { fileBase64, fileName, mimeType } JSON body
  let body: any = req.body;

if (typeof body === "string") {
  try {
    body = JSON.parse(body);
  } catch (err) {
    console.error("Failed to parse JSON body:", err);
    return res.status(400).json({ error: "Invalid JSON body." });
  }
}

if (!body || !body.fileBase64) {
  console.error("Body received:", body);
  return res.status(400).json({ error: "Missing fileBase64 in request body." });
}
console.log("Body keys:", Object.keys(body || {}));
console.log("Base64 length:", body.fileBase64?.length);
  try {
    const fileBytes = Buffer.from(body.fileBase64, "base64");

    // Azure REST API — submit document for analysis
    const analyzeUrl = `${endpoint.replace(/\/$/, "")}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`;

    const submitRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": body.mimeType || "application/octet-stream",
      },
      body: fileBytes,
    });

      if (!submitRes.ok) {
        const errText = await submitRes.text().catch(() => "");

        console.error("AZURE SUBMIT FAILED");
        console.error("status:", submitRes.status);
        console.error("body:", errText);

        return res.status(submitRes.status).json({
          error: `Azure rejected the document (${submitRes.status})`,
          detail: errText,
        });
      }
    // Azure returns 202 Accepted with an operation-location header for polling
    const operationLocation = submitRes.headers.get("operation-location");
    if (!operationLocation) {
      return res.status(502).json({ error: "Azure did not return an operation-location header." });
    }

    // Poll until succeeded (max 60s)
    const deadline = Date.now() + 60_000;
    let result: AzureAnalyzeResult | null = null;

    while (Date.now() < deadline) {
      await sleep(1500);

      const pollRes = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });

      if (!pollRes.ok) {
        return res.status(pollRes.status).json({ error: `Azure poll failed (${pollRes.status})` });
      }

      const pollData = (await pollRes.json()) as { status: string; analyzeResult?: AzureAnalyzeResult };

      if (pollData.status === "succeeded") {
        result = pollData.analyzeResult ?? null;
        break;
      }

      if (pollData.status === "failed") {
        return res.status(422).json({ error: "Azure analysis failed." });
      }
      // still running → loop
    }

    if (!result) {
      return res.status(504).json({ error: "Azure analysis timed out after 60 s." });
    }

    // Map Azure output to a compact, typed shape for the client
    return res.status(200).json(mapAzureResult(result, body.fileName ?? "document"));
  } catch (err: any) {
    console.error("[api/azure-extract] endpoint:", process.env.AZURE_DOCUMENT_ENDPOINT ? "set" : "MISSING");
    console.error("[api/azure-extract] key:", process.env.AZURE_DOCUMENT_KEY ? "set" : "MISSING");
    console.error("[api/azure-extract]", err);
    return res.status(502).json({ error: "Azure extraction failed", message: err.message });
  }
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
