/**
 * AZURE DOCUMENT INTELLIGENCE — CLIENT-SIDE CALLER
 *
 * Converts a File object to base64 and POSTs it to the
 * /api/azure-extract serverless proxy (which holds the API key).
 *
 * Returns an AzureExtractResult on success, or throws on error so
 * the caller can fall through to the pdf.js / OCR fallback chain.
 */

export interface AzureExtractResult {
  fileName: string;
  content: string;
  pages: Array<{ pageNumber: number; content: string }>;
  paragraphs: Array<{ text: string; role: string }>;
  tables: Array<{ rowCount: number; columnCount: number; preview: string }>;
}

/**
 * Send `file` to the Azure extraction proxy and return structured results.
 * Throws if the server returns an error or the response is malformed.
 */
export async function extractAzureText(file: File): Promise<AzureExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  const response = await fetch("/api/azure-extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || "application/pdf",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure extraction failed (${response.status}): ${text}`);
  }

  return response.json();
}