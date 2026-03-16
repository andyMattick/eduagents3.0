export type DetectedFileType =
  | "pdf-text"
  | "pdf-scanned"
  | "docx"
  | "image-pdf"
  | "unknown";

export interface DetectedFileTypeResult {
  fileType: DetectedFileType;
}

function hasPdfHeader(input: string): boolean {
  return input.includes("%PDF");
}

function hasDocxSignature(input: string): boolean {
  return input.startsWith("PK");
}

function detectFromName(fileName: string): DetectedFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf-text";
  return "unknown";
}

export function detectFileType(params: {
  fileName?: string;
  mimeType?: string;
  textSample?: string;
}): DetectedFileTypeResult {
  const fileName = params.fileName ?? "";
  const mimeType = (params.mimeType ?? "").toLowerCase();
  const textSample = params.textSample ?? "";

  if (mimeType.includes("word") || fileName.toLowerCase().endsWith(".docx")) {
    return { fileType: "docx" };
  }

  if (mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf") || hasPdfHeader(textSample)) {
    const imageHeavy = /\/Subtype\s*\/Image|image xobject|ocr|scanned/i.test(textSample);
    const hasWords = (textSample.match(/[A-Za-z]{3,}/g) ?? []).length > 20;
    if (imageHeavy && !hasWords) return { fileType: "image-pdf" };
    if (!hasWords) return { fileType: "pdf-scanned" };
    return { fileType: "pdf-text" };
  }

  if (hasDocxSignature(textSample) || detectFromName(fileName) === "docx") {
    return { fileType: "docx" };
  }

  return { fileType: detectFromName(fileName) };
}
