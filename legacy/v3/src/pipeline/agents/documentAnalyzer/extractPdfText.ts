import type { DocumentPage } from "pipeline/contracts";

export interface ExtractedText {
  rawText: string;
  pages: DocumentPage[];
}

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(file: File): Promise<ExtractedText> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableWorker: true,
    } as any);

    const pdf = await loadingTask.promise;
    const pages: DocumentPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = normalizeText(
        content.items
          .map((item: any) => (typeof item.str === "string" ? item.str : ""))
          .join(" ")
      );
      pages.push({ pageNumber, text: pageText });
    }

    const rawText = normalizeText(pages.map((page) => page.text).join("\n\n"));
    return {
      rawText,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
    };
  } catch {
    // Safe fallback: still provide content for downstream validation.
    const rawText = await file.text().catch(() => "");
    return {
      rawText,
      pages: [{ pageNumber: 1, text: normalizeText(rawText) }],
    };
  }
}
