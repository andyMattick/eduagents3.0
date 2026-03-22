import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import Busboy from "busboy";

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

async function readUploadedFile(req: IncomingMessage): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string; }> {
  return new Promise((resolve, reject) => {
    const uploadSizeLimit = getUploadSizeLimit();
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: uploadSizeLimit,
      },
    });

    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "application/octet-stream";
    let fileFound = false;
    let fileRejected = false;

    busboy.on("file", (_fieldName, file, info) => {
      fileFound = true;
      fileName = info.filename;
      mimeType = info.mimeType || "application/octet-stream";

      if (!fileName || !isAllowedUpload(fileName, mimeType)) {
        fileRejected = true;
        file.resume();
        reject(new Error("Unsupported file type. Allowed types: PDF, DOC, DOCX."));
        return;
      }

      const chunks: Buffer[] = [];

      file.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on("limit", () => {
        fileRejected = true;
        reject(new Error(`File exceeds the ${uploadSizeLimit} byte upload limit.`));
      });

      file.on("end", () => {
        if (!fileRejected) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    busboy.on("finish", () => {
      if (fileRejected) {
        return;
      }

      if (!fileFound || !fileBuffer || !fileName) {
        reject(new Error("A single PDF, DOC, or DOCX file is required."));
        return;
      }

      resolve({ fileBuffer, fileName, mimeType });
    });

    busboy.on("error", reject);
    req.pipe(busboy);
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

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { fileBuffer, fileName } = await readUploadedFile(req);
    const { canonical } = await runIngestionPipeline(fileBuffer, fileName);

    const response: TaggingPipelineInput = {
      documentId: createDocumentId(fileName),
      fileName,
      azureExtract: canonical,
    };

    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document ingestion failed";
    const statusCode = message.includes("Unsupported file type") || message.includes("required") || message.includes("upload limit")
      ? 400
      : message.toLowerCase().includes("azure")
        ? 502
        : 500;

    sendJson(res, statusCode, { error: message });
  }
}