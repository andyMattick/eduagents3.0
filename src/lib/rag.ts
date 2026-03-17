/**
 * src/lib/rag.ts — Client-side RAG utilities
 *
 * Pure text-chunking helper for use in the browser.
 * The full RAG pipeline (embed, store, retrieve) runs server-side
 * in /lib/rag.ts and is accessed via the /api/documents/store endpoint.
 */

export function chunkText(text: string, size = 500, overlap = 100): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}