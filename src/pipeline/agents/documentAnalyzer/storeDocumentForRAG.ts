/**
 * Fire-and-forget helper to store extracted document text for RAG.
 *
 * Calls /api/documents/store with the Supabase auth token.
 * Failures are logged but never block the pipeline.
 */
import { supabase } from "@/supabase/client";

export function storeDocumentForRAG(
  title: string,
  content: string,
  metadata?: Record<string, unknown>
): void {
  // Don't store very short texts (likely extraction failures)
  if (!content || content.length < 50) return;

  (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return; // not authenticated — skip silently

      const res = await fetch("/api/documents/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, metadata }),
      });

      if (!res.ok) {
        console.warn("[RAG] Failed to store document:", await res.text());
      } else {
        const { docId, ragStatus } = await res.json();
        console.info("[RAG] Store result:", ragStatus, docId);
      }
    } catch (err) {
      console.warn("[RAG] Store failed (non-blocking):", err);
    }
  })();
}
