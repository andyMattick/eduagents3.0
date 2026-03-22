import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

import { runIngestionPipeline } from "../../../prism-v4/ingestion/runIngestionPipeline";
import type { TaggingPipelineInput } from "../../../prism-v4/schema/semantic";

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

function isAllowedUpload(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension) && ALLOWED_MIME_TYPES.has(mimeType || "application/octet-stream");
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
    console.log("STEP 1: handler start");
    const fileName = getSingleHeaderValue(req.headers["x-file-name"]);
    console.log("STEP 2: filename", fileName);
    const mimeType = getSingleHeaderValue(req.headers["content-type"]);

    if (!fileName) {
      throw new Error("Missing x-file-name header.");
    }

    if (!isAllowedUpload(fileName, mimeType || "application/octet-stream")) {
      throw new Error("Unsupported file type. Allowed types: PDF, DOC, DOCX.");
    }

    const fileBuffer = await readRequestBody(req);
    console.log("STEP 3: buffer length", fileBuffer.length);
    const { canonical } = await runIngestionPipeline(fileBuffer, fileName);
    console.log("STEP 4: azure done");

    const response: TaggingPipelineInput = {
      documentId: createDocumentId(fileName),
      fileName,
      azureExtract: canonical,
    };

    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document ingestion failed";
    const statusCode = message.includes("Unsupported file type") || message.includes("Missing x-file-name") || message.includes("empty") || message.includes("upload limit")
      ? 400
      : message.toLowerCase().includes("azure")
        ? 502
        : 500;

    sendJson(res, statusCode, { error: message });
  }
}