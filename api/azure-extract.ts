import { analyzeAzureDocument, getAzureConfig, mapAzureResult } from "../lib/azure";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
  maxDuration: 60,
};

/**
 * AZURE DOCUMENT INTELLIGENCE EXTRACTION PROXY
 *
 * Accepts a JSON POST with { fileBase64, mimeType, fileName }, forwards
 * the decoded buffer to Azure Document Intelligence (prebuilt-layout),
 * polls for completion, and returns a compact AzureExtractResult.
 *
 * Delegates to shared lib/azure.ts for config + result mapping.
 */

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { fileBase64, mimeType, fileName } = body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: "Missing fileBase64" });
    }

    const fileBuffer = Buffer.from(fileBase64, "base64");

    try {
      getAzureConfig();
    } catch {
      return res.status(500).json({ error: "Azure not configured" });
    }

    console.log("File received:", fileBuffer.length, "bytes, mime:", mimeType);

    const finalMime = mimeType || "application/pdf";
    const analyzeResult = await analyzeAzureDocument(fileBuffer, finalMime);
    const result = mapAzureResult(analyzeResult, fileName || "upload");

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
