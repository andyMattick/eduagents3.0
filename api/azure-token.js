"use strict";
/* Bundled by esbuild — do not edit */

// api/azure-token.ts
function normalizeEndpoint(raw) {
  let s = raw.trim().replace(/\.{2,}/g, "").replace(/^https:\/(?!\/)/, "https://").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(s)) {
    s = `https://${s}`;
  }
  return s;
}
function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return void 0;
}
function getAzureConfig() {
  const endpoint = getEnvValue("AZURE_DOCUMENT_ENDPOINT", "AZURE_FORM_RECOGNIZER_ENDPOINT");
  const key = getEnvValue("AZURE_DOCUMENT_KEY", "AZURE_FORM_RECOGNIZER_KEY");
  const model = getEnvValue("AZURE_DOCUMENT_MODEL", "AZURE_FORM_RECOGNIZER_MODEL") ?? "prebuilt-read";
  const pages = getEnvValue("AZURE_DOCUMENT_PAGES", "AZURE_FORM_RECOGNIZER_PAGES") ?? "1-";
  if (!endpoint || !key) {
    throw new Error("Azure is not configured. Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY, or AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.");
  }
  const clean = normalizeEndpoint(endpoint);
  console.log("[azure] normalized endpoint:", clean);
  return { endpoint: clean, key, model, pages };
}
var runtime = "nodejs";
function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { endpoint, key } = getAzureConfig();
    res.status(200).json({ endpoint, key });
  } catch {
    return res.status(500).json({ error: "Azure not configured" });
  }
}
export {
  handler as default,
  runtime
};
