import { ingestDocument } from "./ingestDocument";
import {
  getItemsForDocument,
  getSectionsForDocument,
  getCanonicalTextForDocument
} from "@/api/v4/simulator/shared";

/**
 * Backfill a legacy document that has:
 * - no items
 * - no sections
 *
 * This ensures rewrite, simulation, and preparedness all work.
 *
 * Safe to call repeatedly — it only runs ingestion when needed.
 */
export async function backfillDocument(documentId: string): Promise<void> {
  // 1. Check if items or sections already exist
  const items = await getItemsForDocument(documentId);
  const sections = await getSectionsForDocument(documentId);

  if (items.length > 0 || sections.length > 0) {
    // Already ingested — nothing to do
    return;
  }

  // 2. Load canonical text (already extracted during upload)
  const text = await getCanonicalTextForDocument({ documentId });
  if (!text || !text.trim()) {
    console.warn(`[backfillDocument] No canonical text for ${documentId}`);
    return;
  }

  // 3. Run unified ingestion
  await ingestDocument({
    source: "backfill",
    documentId,
    rawText: text
  });
}
