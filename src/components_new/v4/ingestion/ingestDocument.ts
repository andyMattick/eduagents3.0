import { classifyDocType } from "./classifyDocType";
import { segmentSections } from "./segment/sectionSegmenter";
import { analyzeRegisteredDocument } from "../documents/analysis/analyzeRegisteredDocument";

import {
  saveItems,
  saveSections,
  saveAnalysis,
  setDocType,
  getCanonicalTextForDocument,
  V4Item,
  V4Section
} from "@/api/v4/simulator/shared";

export type IngestionSource =
  | "teacher-upload"
  | "student-portal"
  | "created"
  | "api"
  | "backfill";

export interface IngestionResult {
  documentId: string;
  docType: "problem" | "notes" | "mixed";
  items: V4Item[];
  sections: V4Section[];
  analysis: any;
}

export async function ingestDocument(input: {
  source: IngestionSource;
  documentId: string;
  rawText?: string;
  fileBlobId?: string;
  metadata?: Record<string, unknown>;
}): Promise<IngestionResult> {
  const { documentId } = input;

  // 1. Acquire canonical text
  const text =
    input.rawText ??
    (await getCanonicalTextForDocument({
      documentId,
      fileBlobId: input.fileBlobId
    }));

  if (!text || !text.trim()) {
    throw new Error(`ingestDocument: empty text for documentId=${documentId}`);
  }

  // 2. Classify doc type
  const docType = await classifyDocType(text);
  await setDocType(documentId, docType);

  // 3. Segment structure
  let items: V4Item[] = [];
  let sections: V4Section[] = [];

  if (docType === "problem") {
    const analyzed = await analyzeRegisteredDocument(documentId, text);
    items = analyzed.items ?? [];
    sections = [];
  } else if (docType === "notes") {
    const seg = segmentSections(text);
    sections = seg.map((s, idx) => ({
      sectionId: s.id ?? `section-${idx + 1}`,
      order: idx + 1,
      title: s.title ?? undefined,
      text: s.text,
      metadata: s.metadata ?? {}
    }));
    items = [];
  } else {
    // mixed
    const analyzed = await analyzeRegisteredDocument(documentId, text);
    items = analyzed.items ?? [];

    const seg = segmentSections(text);
    sections = seg.map((s, idx) => ({
      sectionId: s.id ?? `section-${idx + 1}`,
      order: idx + 1,
      title: s.title ?? undefined,
      text: s.text,
      metadata: s.metadata ?? {}
    }));
  }

  // 4. Persist items + sections
  await saveItems(documentId, items);
  await saveSections(documentId, sections);

  // 5. Run analysis + persist
  const analyzed = await analyzeRegisteredDocument(documentId, text);
  await saveAnalysis(documentId, docType, analyzed);

  return {
    documentId,
    docType,
    items,
    sections,
    analysis: analyzed
  };
}
