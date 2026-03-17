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
  // Convert file to base64 without a FileReader (works in all modern browsers)
  const fileBase64 = btoa(
    String.fromCharCode(...new Uint8Array(await file.arrayBuffer()))
  );

  const response = await fetch("/api/azure-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(
      `Azure extraction failed (${response.status}): ${body.error ?? response.statusText}`
    );
  }

  const result = (await response.json()) as AzureExtractResult;

  if (!result || typeof result.content !== "string") {
    throw new Error("Azure extraction returned an unexpected response shape.");
  }

  return result;
}
