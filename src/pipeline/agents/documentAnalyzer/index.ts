import type { DocumentInsights } from "pipeline/contracts";
import { buildDocumentInsights } from "./buildDocumentInsights";
import { buildInsightsFromAzure } from "./buildInsightsFromAzure";
import { detectFileType, type DetectedFileTypeResult } from "./detectFileType";
import { extractAzureText } from "./extractAzureText";
import { extractDocxText } from "./extractDocxText";
import { extractOcrText } from "./extractOcrText";
import { extractPdfText } from "./extractPdfText";
import { storeDocumentForRAG } from "./storeDocumentForRAG";

export { buildDocumentInsights } from "./buildDocumentInsights";
export { summarizeForUI } from "./summarizeForUI";
export { validateExtractedText } from "./validateExtractedText";
export { detectFileType } from "./detectFileType";

export interface AnalyzeDocumentResult {
  insights: DocumentInsights;
  fileType: DetectedFileTypeResult["fileType"];
  extractionMethod: string;
}

function countPrintableChars(text: string): number {
  return [...String(text ?? "")].filter((char) => /[A-Za-z0-9]/.test(char)).length;
}

function looksReadable(text: string): boolean {
  const normalized = String(text ?? "").replace(/\s+/g, "");
  if (!normalized) return false;
  if (normalized.length < 50) return false;
  const printableRatio = countPrintableChars(normalized) / normalized.length;
  return printableRatio >= 0.5;
}

function logExtraction(meta: {
  fileType: string;
  extractionMethod: string;
  unreadable: boolean;
  confidence: Record<string, number>;
}): void {
  console.info("[DocumentAnalyzer] extraction", meta);
}

/**
 * Returns true when the Azure Document Intelligence proxy is available.
 * Enable by setting VITE_USE_AZURE=true in your .env file.
 */
function isAzureEnabled(): boolean {
  try {
    return import.meta.env.VITE_USE_AZURE === "true";
  } catch {
    return false;
  }
}

export async function analyzeDocument(file: File): Promise<DocumentInsights> {
  // ── Azure Document Intelligence (first-try, optional) ────────────────────
  // Only attempted for PDF and DOCX files where Azure adds the most value.
  // Falls through silently to the local pdf.js / mammoth / OCR chain on any error.
  const azureCandidate = /\.(pdf|docx|doc)$/i.test(file.name);
  if (isAzureEnabled() && azureCandidate) {
    try {
      const azureResult = await extractAzureText(file);
      const insights = buildInsightsFromAzure(azureResult);
      logExtraction({
        fileType: "azure",
        extractionMethod: "azure-document-intelligence",
        unreadable: insights.flags.unreadable,
        confidence: insights.confidence,
      });
      // Fire-and-forget: store extracted text for RAG
      storeDocumentForRAG(file.name, azureResult.content);
      return insights;
    } catch (azureErr) {
      console.warn("[DocumentAnalyzer] Azure extraction failed, falling back to local pipeline:", azureErr);
    }
  }

  // ── Local extraction pipeline (fallback / default) ────────────────────────
  const sample = await file.text().catch(() => "");
  const detection = detectFileType({
    fileName: file.name,
    mimeType: file.type,
    textSample: sample.slice(0, 4096),
  });

  let rawText = "";
  let extractionMethod = "text";
  let pages: DocumentInsights["pages"] = [];
  let partiallyReadable = false;

  if (detection.fileType === "docx") {
    const out = await extractDocxText(file);
    rawText = out.rawText;
    pages = out.pages;
    extractionMethod = "mammoth";
  } else if (detection.fileType === "pdf-text") {
    const out = await extractPdfText(file);
    rawText = out.rawText;
    pages = out.pages;
    extractionMethod = "pdfjs";

    const readablePageCount = out.pages.filter((page) => looksReadable(page.text)).length;
    const unreadablePageCount = Math.max(0, out.pages.length - readablePageCount);
    partiallyReadable = readablePageCount > 0 && unreadablePageCount > 0;

    const needsOcrFallback = !looksReadable(rawText) || readablePageCount === 0;
    if (needsOcrFallback) {
      const ocrOut = await extractOcrText(file);
      if (looksReadable(ocrOut.rawText)) {
        rawText = ocrOut.rawText;
        pages = ocrOut.pages.length > 0 ? ocrOut.pages : pages;
        extractionMethod = "ocr";
        partiallyReadable = false;
      }
    }
  } else if (detection.fileType === "pdf-scanned" || detection.fileType === "image-pdf") {
    const out = await extractOcrText(file);
    rawText = out.rawText;
    pages = out.pages;
    extractionMethod = "ocr";
  } else {
    rawText = sample;
    pages = [{ pageNumber: 1, text: sample }];
    extractionMethod = "text";
  }

  const insights = buildDocumentInsights(rawText, { pages, partiallyReadable });
  logExtraction({
    fileType: detection.fileType,
    extractionMethod,
    unreadable: insights.flags.unreadable,
    confidence: insights.confidence,
  });
  // Fire-and-forget: store extracted text for RAG
  if (rawText.length > 50) {
    storeDocumentForRAG(file.name, rawText);
  }
  return insights;
}

export function analyzeDocumentText(text: string): DocumentInsights {
  const insights = buildDocumentInsights(text);
  logExtraction({
    fileType: "unknown",
    extractionMethod: "text",
    unreadable: insights.flags.unreadable,
    confidence: insights.confidence,
  });
  return insights;
}

export function buildDocumentInsightsFromInput(input: any): DocumentInsights {
  const chunks: string[] = [];

  if (typeof input === "string") {
    chunks.push(input);
  } else if (input && typeof input === "object") {
    if (typeof input.text === "string") chunks.push(input.text);
    if (typeof input.question === "string") chunks.push(input.question);
    if (typeof input.additionalDetails === "string") chunks.push(input.additionalDetails);
    if (typeof input.topic === "string") chunks.push(input.topic);
    if (typeof input.unitName === "string") chunks.push(input.unitName);
    if (typeof input.course === "string") chunks.push(input.course);

    if (Array.isArray(input.sourceDocuments)) {
      for (const doc of input.sourceDocuments) {
        if (doc && typeof doc.content === "string") chunks.push(doc.content);
      }
    }

    if (input.a && typeof input.a.text === "string") chunks.push(input.a.text);
    if (input.b && typeof input.b.text === "string") chunks.push(input.b.text);

    if (Array.isArray(input.items)) {
      for (const item of input.items) {
        if (item && typeof item.source_text === "string") chunks.push(item.source_text);
        if (item && typeof item.prompt === "string") chunks.push(item.prompt);
      }
    }
  }

  const raw = chunks.map((chunk) => String(chunk).trim()).filter(Boolean).join("\n\n");
  return analyzeDocumentText(raw);
}
