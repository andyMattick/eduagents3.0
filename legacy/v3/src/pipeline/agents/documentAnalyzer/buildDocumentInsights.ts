import type { DocumentInsights } from "pipeline/contracts";
import { extractConcepts } from "./extractConcepts";
import { extractEntities } from "./extractEntities";
import { extractExamples } from "./extractExamples";
import { extractFormulas } from "./extractFormulas";
import { extractStructure } from "./extractStructure";
import { extractVocab } from "./extractVocab";
import { inferMetadata } from "./inferMetadata";
import { validateExtractedText } from "./validateExtractedText";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function makeEmptyInsights(rawText = "", unreadable = true, pages?: DocumentInsights["pages"]): DocumentInsights {
  return {
    rawText,
    pages: pages && pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
    sections: [],
    vocab: [],
    formulas: [],
    entities: [],
    examples: [],
    concepts: [],
    tables: [],
    diagrams: [],
    metadata: {
      gradeEstimate: null,
      subjectEstimate: null,
      topicCandidates: [],
      difficulty: null,
      readingLevel: null,
    },
    confidence: {
      extraction: unreadable ? 0.1 : 0.7,
      structure: 0,
      semantics: 0,
      metadata: 0,
    },
    flags: {
      unreadable,
      partiallyReadable: false,
      scanned: false,
      lowConfidence: true,
    },
  };
}

export function buildDocumentInsights(
  rawTextInput: string,
  options?: { pages?: DocumentInsights["pages"]; partiallyReadable?: boolean }
): DocumentInsights {
  const rawText = String(rawTextInput ?? "").trim();
  const validation = validateExtractedText(rawText);
  const pages = options?.pages;

  if (validation.unreadable) {
    return makeEmptyInsights(validation.cleanedText || rawText, true, pages);
  }

  const cleanedText = validation.cleanedText;
  const structure = extractStructure(cleanedText);
  const concepts = extractConcepts(cleanedText);
  const vocab = extractVocab(cleanedText);
  const formulas = extractFormulas(cleanedText);
  const entities = extractEntities(cleanedText);
  const examples = extractExamples(cleanedText);

  const structureConfidence = clamp((structure.sections.length + structure.tables.length + structure.diagrams.length) / 25);
  const semanticConfidence = clamp((concepts.length + vocab.length + formulas.length + examples.length) / 40);
  const extractionConfidence = clamp(cleanedText.length / 4000);

  const metadata = inferMetadata({
    text: cleanedText,
    formulas,
    topicCandidates: structure.sections.map((section) => section.heading),
    unreadable: false,
    confidence: (structureConfidence + semanticConfidence + extractionConfidence) / 3,
  });

  const metadataConfidence = metadata.subjectEstimate || metadata.gradeEstimate ? 0.72 : 0.45;
  const lowConfidence = extractionConfidence < 0.35 || semanticConfidence < 0.35;

  return {
    rawText: cleanedText,
    pages: pages && pages.length > 0 ? pages : [{ pageNumber: 1, text: cleanedText }],
    sections: structure.sections,
    vocab,
    formulas,
    entities,
    examples,
    concepts,
    tables: structure.tables,
    diagrams: structure.diagrams,
    metadata,
    confidence: {
      extraction: Number(extractionConfidence.toFixed(2)),
      structure: Number(structureConfidence.toFixed(2)),
      semantics: Number(semanticConfidence.toFixed(2)),
      metadata: Number(metadataConfidence.toFixed(2)),
    },
    flags: {
      unreadable: false,
      partiallyReadable: Boolean(options?.partiallyReadable),
      scanned: /\f|ocr|scan/i.test(cleanedText),
      lowConfidence,
    },
  };
}
