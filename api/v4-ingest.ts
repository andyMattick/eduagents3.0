import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

import { runAzureExtraction } from "../src/prism-v4/ingestion/azure/azureExtractor";
import { normalizeAzureLayout } from "../src/prism-v4/ingestion/azure/azureNormalizer";
import { mapAzureToCanonical } from "../src/prism-v4/ingestion/normalize/structureMapper";
import { cleanText } from "../src/prism-v4/ingestion/normalize/textCleaner";
import type { TaggingPipelineInput } from "../src/prism-v4/schema/semantic";

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

function isPdfUpload(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".pdf" && (mimeType === "application/pdf" || mimeType === "application/octet-stream");
}

function getUploadSizeLimit() {
  const parsed = Number.parseInt(
    process.env.INGESTION_MAX_UPLOAD_BYTES ?? `${DEFAULT_MAX_UPLOAD_SIZE_BYTES}`,
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_SIZE_BYTES;
}

function createDocumentId(fileName: string) {
  const stem = path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${stem || "document"}-${suffix}`;
}

function getSingleHeaderValue(header: string | string[] | undefined) {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

function cleanCanonicalText(result: TaggingPipelineInput["azureExtract"]) {
  return {
    ...result,
    content: cleanText(result.content),
    pages: result.pages.map((page) => ({
      ...page,
      text: cleanText(page.text),
    })),
    paragraphs: result.paragraphs?.map((paragraph) => ({
      ...paragraph,
      text: cleanText(paragraph.text),
    })),
    tables: result.tables?.map((table) => ({
      ...table,
      cells: table.cells.map((cell) => ({
        ...cell,
        text: cleanText(cell.text),
      })),
    })),
    readingOrder: result.readingOrder?.map((entry) => cleanText(entry)).filter(Boolean),
  };
}

async function readRequestBody(req: IncomingMessage & { arrayBuffer?: () => Promise<ArrayBuffer> }) {
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

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    req.on("data", (chunk: Buffer | string) => {
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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage & { method?: string; arrayBuffer?: () => Promise<ArrayBuffer> }, res: ServerResponse) {
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

    const response: TaggingPipelineInput = {
      documentId: createDocumentId(fileName),
      fileName,
      azureExtract: canonical,
    };

    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document ingestion failed";
    const statusCode = message.includes("Please upload a PDF") || message.includes("Missing x-file-name") || message.includes("empty") || message.includes("upload limit")
      ? 400
      : message.toLowerCase().includes("azure")
        ? 502
        : 500;

    sendJson(res, statusCode, { error: message });
  }
}