import type { DocumentPage } from "@/pipeline/contracts";

export interface ExtractedText {
  rawText: string;
  pages: DocumentPage[];
}

export async function extractDocxText(file: File): Promise<ExtractedText> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value ?? "").trim();
    return {
      rawText: text,
      pages: [{ pageNumber: 1, text }],
    };
  } catch {
    const fallback = await file.text().catch(() => "");
    return {
      rawText: fallback,
      pages: [{ pageNumber: 1, text: fallback }],
    };
  }
}
