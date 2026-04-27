"use strict";
/* Bundled by esbuild — do not edit */

// api/v4-ingest.ts
import path from "path";

// lib/azure.ts
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
function azureAnalyzeUrl(endpoint, model, pages) {
  const selectedModel = model?.trim() || "prebuilt-read";
  const url = new URL(`${endpoint}/documentintelligence/documentModels/${selectedModel}:analyze`);
  url.searchParams.set("api-version", "2024-11-30");
  if (pages && pages.trim().length > 0) {
    url.searchParams.set("pages", pages.trim());
  }
  return url.toString();
}
async function analyzeAzureDocument(fileBuffer, mimeType = "application/pdf") {
  const config2 = getAzureConfig();
  const analyzeUrl = azureAnalyzeUrl(config2.endpoint, config2.model, config2.pages);
  const fallbackAnalyzeUrl = azureAnalyzeUrl(config2.endpoint, config2.model);
  console.log("[azure] URL:", analyzeUrl);
  console.log("[azure] model:", config2.model);
  console.log("[azure] pages policy:", config2.pages || "<none>");
  let submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config2.key,
      "Content-Type": mimeType
    },
    body: new Uint8Array(fileBuffer)
  });
  if (submitRes.status !== 202 && config2.pages) {
    const firstAttemptError = await submitRes.text();
    const normalizedError = firstAttemptError.toLowerCase();
    const shouldFallback = normalizedError.includes("pages") || normalizedError.includes("query") || normalizedError.includes("invalid");
    if (shouldFallback) {
      console.warn("[azure] pages parameter rejected; retrying without pages query", {
        status: submitRes.status
      });
      submitRes = await fetch(fallbackAnalyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": config2.key,
          "Content-Type": mimeType
        },
        body: new Uint8Array(fileBuffer)
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
        "Ocp-Apim-Subscription-Key": config2.key
      }
    });
    const pollData = await pollRes.json();
    if (pollData.status === "succeeded") {
      return pollData.analyzeResult ?? { content: "", pages: [], paragraphs: [], tables: [] };
    }
    if (pollData.status === "failed") {
      throw new Error(`Azure analysis failed: ${JSON.stringify(pollData)}`);
    }
  }
  throw new Error("Azure analysis timed out after polling");
}

// src/prism-v4/ingestion/azure/azureClient.ts
var MAX_ATTEMPTS = 3;
var INITIAL_BACKOFF_MS = 500;
async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function callAzureLayoutModel(fileBuffer, mimeType = "application/pdf") {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await analyzeAzureDocument(fileBuffer, mimeType);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }
  const message = lastError instanceof Error ? lastError.message : "Unknown Azure error";
  throw new Error(`Azure layout extraction failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}

// src/prism-v4/ingestion/azure/azureExtractor.ts
var MAX_RETRIES = 3;
var BASE_DELAY_MS = 500;
function delay2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function estimatePdfPageCount(fileBuffer) {
  try {
    const raw = fileBuffer.toString("latin1");
    const matches = raw.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}
function logPreAzureDiagnostics(fileBuffer, mimeType) {
  const byteLength = fileBuffer.byteLength;
  if (mimeType.toLowerCase().includes("pdf")) {
    const estimatedPages = estimatePdfPageCount(fileBuffer);
    console.log("[ingestion][azure][preflight]", {
      mimeType,
      byteLength,
      estimatedPdfPages: estimatedPages
    });
    return estimatedPages;
  }
  console.log("[ingestion][azure][preflight]", {
    mimeType,
    byteLength,
    estimatedPdfPages: null
  });
  return null;
}
async function runAzureExtraction(fileBuffer, mimeType = "application/pdf") {
  const estimatedPdfPages = logPreAzureDiagnostics(fileBuffer, mimeType);
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const result = await callAzureLayoutModel(fileBuffer, mimeType);
      console.log("[ingestion][azure][postflight]", {
        mimeType,
        byteLength: fileBuffer.byteLength,
        azurePages: Array.isArray(result?.pages) ? result.pages.length : 0,
        azureParagraphs: Array.isArray(result?.paragraphs) ? result.paragraphs.length : 0,
        azureTables: Array.isArray(result?.tables) ? result.tables.length : 0,
        contentChars: typeof result?.content === "string" ? result.content.length : 0
      });
      const azurePageCount = Array.isArray(result?.pages) ? result.pages.length : 0;
      if (mimeType.toLowerCase().includes("pdf") && typeof estimatedPdfPages === "number" && estimatedPdfPages > 2 && azurePageCount === 2) {
        console.warn("[ingestion][azure][limit-warning] PDF appears multi-page but Azure returned exactly 2 pages. This commonly indicates Azure Document Intelligence free-tier page limits (F0).", {
          estimatedPdfPages,
          azurePageCount
        });
      }
      return result;
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        console.error("Azure extraction failed:", err);
        throw new Error("Azure extraction failed after retries");
      }
      await delay2(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
}

// src/prism-v4/ingestion/azure/azureNormalizer.ts
function normalizeAzureLayout(rawAzure) {
  const azure = rawAzure ?? {};
  const pages = (azure.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber ?? 1,
    text: (page.lines ?? []).map((line) => line.content?.trim() ?? "").filter(Boolean).join("\n")
  }));
  const paragraphs = (azure.paragraphs ?? []).map((paragraph) => ({
    text: paragraph.content?.trim() ?? "",
    pageNumber: paragraph.boundingRegions?.[0]?.pageNumber ?? 1,
    role: paragraph.role
  })).filter((paragraph) => paragraph.text.length > 0);
  const tables = (azure.tables ?? []).map((table) => ({
    rowCount: table.rowCount ?? 0,
    columnCount: table.columnCount ?? 0,
    pageNumber: table.boundingRegions?.[0]?.pageNumber,
    cells: (table.cells ?? []).map((cell) => ({
      rowIndex: cell.rowIndex ?? 0,
      columnIndex: cell.columnIndex ?? 0,
      text: cell.content?.trim() ?? ""
    }))
  }));
  const readingOrder = paragraphs.map((paragraph) => paragraph.text);
  return {
    content: azure.content?.trim() ?? "",
    pages,
    paragraphs,
    tables,
    readingOrder
  };
}

// src/prism-v4/ingestion/normalize/structureMapper.ts
function mapAzureToCanonical(normalized, fileName) {
  return {
    fileName,
    content: normalized.content || normalized.readingOrder.join("\n\n"),
    pages: normalized.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text
    })),
    paragraphs: normalized.paragraphs.map((paragraph) => ({
      text: paragraph.text,
      pageNumber: paragraph.pageNumber,
      role: paragraph.role
    })),
    tables: normalized.tables.map((table) => ({
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      pageNumber: table.pageNumber,
      cells: table.cells.map((cell) => ({
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        text: cell.text
      }))
    })),
    readingOrder: [...normalized.readingOrder]
  };
}

// src/prism-v4/ingestion/normalize/textCleaner.ts
function cleanText(raw) {
  return raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// api/v4-ingest.ts
var DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
function isPdfUpload(fileName, mimeType) {
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".pdf" && (mimeType === "application/pdf" || mimeType === "application/octet-stream");
}
function getUploadSizeLimit() {
  const parsed = Number.parseInt(process.env.INGESTION_MAX_UPLOAD_BYTES ?? `${DEFAULT_MAX_UPLOAD_SIZE_BYTES}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_SIZE_BYTES;
}
function createDocumentId(fileName) {
  const stem = path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${stem || "document"}-${suffix}`;
}
function getSingleHeaderValue(header) {
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
}
function cleanCanonicalText(result) {
  return {
    ...result,
    content: cleanText(result.content),
    pages: result.pages.map((page) => ({
      ...page,
      text: cleanText(page.text)
    })),
    paragraphs: result.paragraphs?.map((paragraph) => ({
      ...paragraph,
      text: cleanText(paragraph.text)
    })),
    tables: result.tables?.map((table) => ({
      ...table,
      cells: table.cells.map((cell) => ({
        ...cell,
        text: cleanText(cell.text)
      }))
    })),
    readingOrder: result.readingOrder?.map((entry) => cleanText(entry)).filter(Boolean)
  };
}
async function readRequestBody(req) {
  const uploadSizeLimit = getUploadSizeLimit();
  if (typeof req.arrayBuffer === "function") {
    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new Error("Request body is empty.");
    }
    if (buffer.byteLength > uploadSizeLimit) {
      throw new Error(`File exceeds the ${uploadSizeLimit} byte upload limit.`);
    }
    return buffer;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) {
        return;
      }
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > uploadSizeLimit) {
        settled = true;
        reject(new Error(`File exceeds the ${uploadSizeLimit} byte upload limit.`));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (settled) {
        return;
      }
      settled = true;
      const body = Buffer.concat(chunks);
      if (body.byteLength === 0) {
        reject(new Error("Request body is empty."));
        return;
      }
      resolve(body);
    });
    req.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
var runtime = "nodejs";
var config = {
  api: {
    bodyParser: false
  }
};
async function handler(req, res) {
  console.log("v4 ingest handler reached");
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const fileName = getSingleHeaderValue(req.headers["x-file-name"]);
    const mimeType = getSingleHeaderValue(req.headers["content-type"]);
    if (!fileName) {
      throw new Error("Missing x-file-name header.");
    }
    if (!isPdfUpload(fileName, mimeType || "application/octet-stream")) {
      throw new Error("Please upload a PDF file. DOCX and other formats are not supported.");
    }
    const fileBuffer = await readRequestBody(req);
    const rawAzure = await runAzureExtraction(fileBuffer, "application/pdf");
    const normalizedAzure = normalizeAzureLayout(rawAzure);
    const canonical = cleanCanonicalText(mapAzureToCanonical(normalizedAzure, fileName));
    const response = {
      documentId: createDocumentId(fileName),
      fileName,
      azureExtract: canonical
    };
    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document ingestion failed";
    const statusCode = message.includes("Please upload a PDF") || message.includes("Missing x-file-name") || message.includes("empty") || message.includes("upload limit") ? 400 : message.toLowerCase().includes("azure") ? 502 : 500;
    sendJson(res, statusCode, { error: message });
  }
}
export {
  config,
  handler as default,
  runtime
};
