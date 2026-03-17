import { getAzureConfig, azureAnalyzeUrl, mapAzureResult } from "../lib/azure";

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

    let config;
    try {
      config = getAzureConfig();
    } catch {
      return res.status(500).json({ error: "Azure not configured" });
    }

    console.log("File received:", fileBuffer.length, "bytes, mime:", mimeType);

    const analyzeUrl = azureAnalyzeUrl(config.endpoint);
    console.log("[azure-extract] ENDPOINT:", config.endpoint);
    console.log("[azure-extract] URL:", analyzeUrl);

    // ── Step 1: Submit document for analysis ──────────────────────────────
    const submitRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.key,
        "Content-Type": mimeType || "application/pdf",
      },
      body: fileBuffer,
    });

    if (submitRes.status !== 202) {
      const errText = await submitRes.text();
      console.error("Azure submit error:", submitRes.status, errText);
      return res.status(submitRes.status).json({
        error: `Azure rejected the document (${submitRes.status})`,
        detail: errText,
      });
    }

    const operationLocation = submitRes.headers.get("operation-location");
    if (!operationLocation) {
      return res.status(502).json({ error: "Azure did not return an operation-location header" });
    }

    // ── Step 2: Poll until complete ───────────────────────────────────────
    const MAX_POLLS = 30;
    const POLL_INTERVAL_MS = 1500;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": config.key },
      });

      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        const result = mapAzureResult(pollData.analyzeResult, fileName || "upload");
        return res.status(200).json(result);
      }

      if (pollData.status === "failed") {
        console.error("Azure analysis failed:", pollData);
        return res.status(502).json({ error: "Azure analysis failed", detail: pollData });
      }
    }

    return res.status(504).json({ error: "Azure analysis timed out after polling" });
  } catch (err: any) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
