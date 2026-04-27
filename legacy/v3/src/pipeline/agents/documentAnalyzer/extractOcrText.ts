import type { DocumentPage } from "pipeline/contracts";

export interface ExtractedText {
  rawText: string;
  pages: DocumentPage[];
}

export async function extractOcrText(file: File): Promise<ExtractedText> {
  try {
    const moduleName = "tesseract.js";
    const tesseract = await import(/* @vite-ignore */ moduleName);
    const worker = await tesseract.createWorker("eng");
    try {
      const image = await file.arrayBuffer();
      const result = await worker.recognize(image);
      const rawText = String(result.data?.text ?? "").trim();
      return {
        rawText,
        pages: [{ pageNumber: 1, text: rawText }],
      };
    } finally {
      await worker.terminate();
    }
  } catch {
    const rawText = await file.text().catch(() => "");
    return {
      rawText,
      pages: [{ pageNumber: 1, text: rawText }],
    };
  }
}
