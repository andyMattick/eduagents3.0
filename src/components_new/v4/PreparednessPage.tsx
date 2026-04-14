/**
 * Preparedness Page Component
 * 
 * Main orchestration component for the Preparedness feature.
 * Manages the three-phase flow: alignment → suggestions → rewrite
 */

import React, { useState, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type {
  AssessmentDocument,
  PrepDocument,
  AlignmentResult,
  SuggestionsResult,
  RewriteResult,
  PreparednessReportResult,
  Suggestion,
  SuggestionsResult as SuggestionsList,
  TeacherCorrection,
  AdminReportEnvelope,
} from "../../prism-v4/schema/domain/Preparedness";
import {
  getAlignment,
  type AlignmentDebugInfo,
  getSuggestions,
  applyRewrite,
  generatePreparednessReport,
  applyTeacherCorrections,
  getAdminReport,
} from "../../services_new/preparednessService";
import { AlignmentTable } from "./AlignmentTable";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { RewriteOutput } from "./RewriteOutput";
import PreparednessReportPage from "./PreparednessReportPage";
import "./v4.css";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PreparednessPageProps {
  prep?: PrepDocument;
  assessment?: AssessmentDocument;
}

type Phase = "upload" | "alignment" | "suggestions" | "rewrite" | "teacher" | "report";

interface PreparednessState {
  prep: PrepDocument | null;
  assessment: AssessmentDocument | null;
  alignment: AlignmentResult | null;
  suggestions: SuggestionsResult | null;
  finalSuggestions: SuggestionsResult | null;
  rewrite: RewriteResult | null;
  report: PreparednessReportResult | null;
  appliedSuggestions: SuggestionsResult | null;
}

interface LoadingState {
  alignment: boolean;
  suggestions: boolean;
  rewrite: boolean;
  report: boolean;
  adminReport: boolean;
}

interface ErrorState {
  alignment: string | null;
  suggestions: string | null;
  rewrite: string | null;
  report: string | null;
  adminReport: string | null;
}

type TeacherOverrideAlignment = "" | "aligned" | "slightly_above" | "misaligned_above" | "missing_in_prep";
type TeacherOverrideSuggestion = "" | "none" | "add_prep_support" | "remove_question";

interface TeacherCorrectionDraft {
  assessmentItemNumber: number;
  overrideAlignment: TeacherOverrideAlignment;
  overrideConcepts: string;
  overrideDifficulty: string;
  overrideSuggestionType: TeacherOverrideSuggestion;
}

interface ExtractionResult {
  text: string;
  paragraphs: string[];
  source?: "mammoth" | "docx_xml" | "pdf" | "text" | "fallback";
}

const INGESTION_LIMITS = {
  reviewMaxChars: 50000,
  reviewMaxParagraphs: 300,
  testMaxChars: 20000,
  testMaxParagraphs: 150,
  combinedMaxChars: 70000,
  maxInputTokens: 4000,
  minParagraphs: 5,
  minAssessmentQuestions: 5,
  maxAssessmentQuestions: 50,
  maxRepeatedParagraphs: 10,
  maxDuplicateRatio: 0.2,
  minAssessmentChars: 300,
  minPrepChars: 500,
  maxParagraphChars: 5000,
};

type TeacherReviewFilter = "all" | "missing" | "overridden";

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collapseRepeatedHalf(text: string): string {
  const compact = collapseWhitespace(text);
  const minChunk = 40;
  if (compact.length < minChunk * 2) {
    return compact;
  }

  for (let split = Math.floor(compact.length / 2); split >= minChunk; split -= 1) {
    const left = compact.slice(0, split).trim();
    const right = compact.slice(split).trim();
    if (!left || !right) {
      continue;
    }
    if (left === right || right.startsWith(left)) {
      return left;
    }
  }

  return compact;
}

function dedupeAdjacentSentences(text: string): string {
  const parts = collapseWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return collapseWhitespace(text);
  }

  const deduped: string[] = [];
  for (const part of parts) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === part.toLowerCase()) {
      continue;
    }
    deduped.push(part);
  }

  return deduped.join(" ");
}

function normalizeAssessmentDisplayText(text: string): string {
  const halfCollapsed = collapseRepeatedHalf(text);
  return dedupeAdjacentSentences(halfCollapsed);
}

function looksLikeBinaryPayload(text: string): boolean {
  if (!text) {
    return false;
  }

  const hasZipMarkers =
    text.includes("PK\u0003\u0004") ||
    (text.includes("[Content_Types].xml") && text.includes("word/document.xml"));
  const hasControlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);

  return hasZipMarkers || (hasControlChars && text.includes("PK"));
}

function containsExtractionArtifacts(text: string): boolean {
  if (!text) {
    return false;
  }

  return ["PK", "��", "<w:document", "<Relationships", "<w:p>", "<w:t>"]
    .some((marker) => text.includes(marker));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function countRepeatedParagraphs(paragraphs: string[]): { repeatedCount: number; duplicateRatio: number } {
  if (paragraphs.length === 0) {
    return { repeatedCount: 0, duplicateRatio: 0 };
  }

  const counts = new Map<string, number>();
  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let repeatedCount = 0;
  for (const value of counts.values()) {
    if (value > 1) {
      repeatedCount += value - 1;
    }
  }

  return {
    repeatedCount,
    duplicateRatio: repeatedCount / paragraphs.length,
  };
}

function hasQuestionNumberSignals(paragraphs: string[]): boolean {
  return paragraphs.some((paragraph) => /^\s*\d{1,2}[.)]\s+/.test(paragraph));
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xA;/g, "\n");
}

function normalizeExtractedParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const paragraph of paragraphs) {
    const cleaned = paragraph
      .replace(/<[^>]+>/g, " ")
      .replace(/w:numPr|w:ilvl|w:fldSimple|w:instrText/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned || containsExtractionArtifacts(cleaned)) {
      continue;
    }

    const deduped = normalizeAssessmentDisplayText(cleaned);
    const key = deduped.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(deduped);
  }

  return normalized;
}

function buildExtractionResult(paragraphs: string[]): ExtractionResult {
  const normalizedParagraphs = normalizeExtractedParagraphs(paragraphs);
  const text = normalizedParagraphs.join("\n\n").trim();
  return {
    text,
    paragraphs: normalizedParagraphs,
  };
}

async function extractDocxText(file: File): Promise<ExtractionResult> {
  const buffer = await file.arrayBuffer();

  // Primary path: mammoth extracts ordered, readable DOCX text from document.xml.
  try {
    const mammoth = await import("mammoth");
    const result = await (mammoth.extractRawText as unknown as (
      input: { arrayBuffer: ArrayBuffer },
      options?: { includeDefaultStyleMap?: boolean; preserveLineBreaks?: boolean }
    ) => Promise<{ value?: string }>)(
      { arrayBuffer: buffer },
      { includeDefaultStyleMap: false, preserveLineBreaks: true }
    );
    const rawText = (result.value ?? "").replace(/\r\n/g, "\n");
    const mammothResult = buildExtractionResult(rawText.split(/\n+/));
    if (
      mammothResult.text.length >= 20 &&
      mammothResult.paragraphs.length >= 5 &&
      !looksLikeBinaryPayload(mammothResult.text) &&
      !containsExtractionArtifacts(mammothResult.text)
    ) {
      return {
        ...mammothResult,
        source: "mammoth",
      };
    }
  } catch {
    // Fall through to manual XML extraction.
  }

  // Fallback path: manually read word/document.xml and preserve paragraph boundaries.
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("Could not read word/document.xml from DOCX file");
  }

  const paragraphMatches = documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g);
  const paragraphs: string[] = [];

  for (const match of paragraphMatches) {
    const paragraphXml = match[0] ?? "";
    const textRuns = [...paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => decodeXmlEntities(m[1] ?? ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (textRuns) {
      paragraphs.push(textRuns);
    }
  }

  const result = buildExtractionResult(paragraphs);
  if (!result.text || looksLikeBinaryPayload(result.text) || containsExtractionArtifacts(result.text)) {
    throw new Error("DOCX extraction failed: content appears to be binary or empty");
  }

  return {
    ...result,
    source: "docx_xml",
  };
}

async function extractPdfText(file: File): Promise<ExtractionResult> {
  const buffer = await file.arrayBuffer();
  const typed = new Uint8Array(buffer);
  const pdf = await getDocument({ data: typed }).promise;
  const pages: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        const token = item as { str?: string };
        return token.str ?? "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) {
      pages.push(pageText);
    }
  }

  return {
    ...buildExtractionResult(pages),
    source: "pdf",
  };
}

async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const lower = file.name.toLowerCase();
  const isDocx =
    lower.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";

  if (isDocx) {
    return extractDocxText(file);
  }

  if (isPdf) {
    return extractPdfText(file);
  }

  if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return {
      ...buildExtractionResult((await file.text()).split(/\n+/)),
      source: "text",
    };
  }

  // Fallback: attempt UTF-8 text decode for unknown types.
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(await file.arrayBuffer()).trim();
  if (looksLikeBinaryPayload(decoded) || containsExtractionArtifacts(decoded)) {
    throw new Error("Unsupported file format for direct text extraction. Please upload PDF, DOCX, or plain text.");
  }
  return {
    ...buildExtractionResult(decoded.split(/\n+/)),
    source: "fallback",
  };
}

function parseAssessmentItemsFromParagraphs(paragraphs: string[]): AssessmentDocument["items"] {
  if (paragraphs.length === 0) {
    return [];
  }

  const items: Array<{ itemNumber: number; text: string }> = [];
  let current: string[] = [];

  const pushCurrent = () => {
    const text = current.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      items.push({ itemNumber: items.length + 1, text });
    }
    current = [];
  };

  for (const paragraph of paragraphs) {
    const value = paragraph.trim();
    if (!value) {
      continue;
    }

    const isQuestionStart = /^\d{1,2}[.)]\s+/.test(value);
    const isSubpart = /^\d{1,2}[a-zA-Z][.)]?\s+/.test(value);
    const isChoice = /^[(]?[a-eA-E][.)]\s+/.test(value);
    const isDataRow = /^\d+\s+(\d+(?:\.\d+)?\s+){2,}/.test(value);

    if (isQuestionStart && !isDataRow) {
      pushCurrent();
      current.push(value.replace(/^\d{1,2}[.)]\s+/, ""));
      continue;
    }

    if (isSubpart || isChoice || isDataRow) {
      current.push(value);
      continue;
    }

    if (current.length === 0) {
      current.push(value);
    } else {
      current.push(value);
    }
  }

  pushCurrent();

  return items
    .map((item, idx) => ({ itemNumber: idx + 1, text: normalizeAssessmentDisplayText(item.text) }))
    .filter((item) => item.text.length > 0);
}

function validateAssessmentExtraction(result: ExtractionResult, items: AssessmentDocument["items"]): string | null {
  const { repeatedCount, duplicateRatio } = countRepeatedParagraphs(result.paragraphs);
  if (!result.text || result.text.length < 300) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (looksLikeBinaryPayload(result.text) || containsExtractionArtifacts(result.text)) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (result.paragraphs.length < INGESTION_LIMITS.minParagraphs) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (!hasQuestionNumberSignals(result.paragraphs)) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (result.text.length > INGESTION_LIMITS.testMaxChars || result.paragraphs.length > INGESTION_LIMITS.testMaxParagraphs) {
    return "This document is too large to process. Please upload a smaller section.";
  }
  if (estimateTokens(result.text) > INGESTION_LIMITS.maxInputTokens) {
    return "This document is too long to analyze. Please upload a shorter section.";
  }
  if (result.paragraphs.some((paragraph) => paragraph.length > INGESTION_LIMITS.maxParagraphChars)) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (repeatedCount > INGESTION_LIMITS.maxRepeatedParagraphs || duplicateRatio > INGESTION_LIMITS.maxDuplicateRatio) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (items.length < 5) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  if (items.length > INGESTION_LIMITS.maxAssessmentQuestions) {
    return "This document is too large to process. Please upload a smaller section.";
  }
  const sequential = items.every((item, idx) => item.itemNumber === idx + 1);
  if (!sequential) {
    return "We couldn't read your test document. Please upload a clean DOCX or PDF.";
  }
  return null;
}

function validatePrepExtraction(result: ExtractionResult): string | null {
  const { repeatedCount, duplicateRatio } = countRepeatedParagraphs(result.paragraphs);
  if (!result.text || result.text.length < 500) {
    return "We couldn't read your prep document. Please upload a clean DOCX or PDF.";
  }
  if (looksLikeBinaryPayload(result.text) || containsExtractionArtifacts(result.text)) {
    return "We couldn't read your prep document. Please upload a clean DOCX or PDF.";
  }
  if (result.paragraphs.length < 5) {
    return "We couldn't read your prep document. Please upload a clean DOCX or PDF.";
  }
  if (result.text.length > INGESTION_LIMITS.reviewMaxChars || result.paragraphs.length > INGESTION_LIMITS.reviewMaxParagraphs) {
    return "This document is too large to process. Please upload a smaller section.";
  }
  if (estimateTokens(result.text) > INGESTION_LIMITS.maxInputTokens) {
    return "This document is too long to analyze. Please upload a shorter section.";
  }
  if (result.paragraphs.some((paragraph) => paragraph.length > INGESTION_LIMITS.maxParagraphChars)) {
    return "We couldn't read your prep document. Please upload a clean DOCX or PDF.";
  }
  if (repeatedCount > INGESTION_LIMITS.maxRepeatedParagraphs || duplicateRatio > INGESTION_LIMITS.maxDuplicateRatio) {
    return "We couldn't read your prep document. Please upload a clean DOCX or PDF.";
  }
  return null;
}

export const PreparednessPage: React.FC<PreparednessPageProps> = ({
  prep: initialPrep,
  assessment: initialAssessment,
}) => {
  const [phase, setPhase] = useState<Phase>(
    initialPrep && initialAssessment ? "alignment" : "upload"
  );

  const [state, setState] = useState<PreparednessState>({
    prep: initialPrep ?? null,
    assessment: initialAssessment ?? null,
    alignment: null,
    suggestions: null,
    finalSuggestions: null,
    rewrite: null,
    report: null,
    appliedSuggestions: null,
  });

  const [loading, setLoading] = useState<LoadingState>({
    alignment: false,
    suggestions: false,
    rewrite: false,
    report: false,
    adminReport: false,
  });

  const [errors, setErrors] = useState<ErrorState>({
    alignment: null,
    suggestions: null,
    rewrite: null,
    report: null,
    adminReport: null,
  });

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [selectedFixes, setSelectedFixes] = useState<Record<number, "remove_question" | "add_prep_support" | undefined>>({});
  const [teacherCorrectionDrafts, setTeacherCorrectionDrafts] = useState<Record<number, TeacherCorrectionDraft>>({});
  const [teacherReviewFilter, setTeacherReviewFilter] = useState<TeacherReviewFilter>("all");
  const [adminAuditReport, setAdminAuditReport] = useState<AdminReportEnvelope["adminReport"] | null>(null);
  const [alignmentDebug, setAlignmentDebug] = useState<AlignmentDebugInfo | null>(null);
  const [prepInputText, setPrepInputText] = useState<string>(initialPrep?.rawText ?? "");
  const [assessmentInputText, setAssessmentInputText] = useState<string>(
    initialAssessment?.items.map((item) => `${item.itemNumber}. ${item.text}`).join("\n") ?? ""
  );
  const [prepParagraphs, setPrepParagraphs] = useState<string[]>(initialPrep?.rawText ? initialPrep.rawText.split(/\n+/).filter(Boolean) : []);
  const [assessmentParagraphs, setAssessmentParagraphs] = useState<string[]>(initialAssessment?.items.map((item) => item.text) ?? []);

  const allAlignmentItems = state.alignment
    ? [...state.alignment.coveredItems, ...state.alignment.uncoveredItems]
    : [];

  const hasDraftOverride = (draft?: TeacherCorrectionDraft) => {
    if (!draft) return false;
    return Boolean(
      draft.overrideAlignment ||
      draft.overrideConcepts.trim() ||
      draft.overrideDifficulty.trim() ||
      draft.overrideSuggestionType
    );
  };

  const filteredTeacherItems = allAlignmentItems.filter((item) => {
    if (teacherReviewFilter === "all") {
      return true;
    }
    if (teacherReviewFilter === "missing") {
      return item.alignment === "missing_in_prep";
    }
    return hasDraftOverride(teacherCorrectionDrafts[item.assessmentItemNumber]);
  });

  const prepLooksBinary = Boolean(state.prep?.rawText && looksLikeBinaryPayload(state.prep.rawText));

  const getParsedTeacherCorrections = useCallback((): TeacherCorrection[] => {
    return Object.values(teacherCorrectionDrafts)
      .map((draft) => {
        const concepts = draft.overrideConcepts
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);

        const difficultyNum = Number(draft.overrideDifficulty);

        const correction: TeacherCorrection = {
          assessmentItemNumber: draft.assessmentItemNumber,
        };

        if (draft.overrideAlignment) {
          correction.overrideAlignment = draft.overrideAlignment;
        }
        if (concepts.length > 0) {
          correction.overrideConcepts = concepts;
        }
        if (Number.isFinite(difficultyNum) && draft.overrideDifficulty.trim() !== "") {
          correction.overrideDifficulty = difficultyNum;
        }
        if (draft.overrideSuggestionType) {
          correction.overrideSuggestionType = draft.overrideSuggestionType;
        }

        return correction;
      })
      .filter((correction) =>
        Boolean(
          correction.overrideAlignment ||
            correction.overrideConcepts?.length ||
            correction.overrideDifficulty !== undefined ||
            correction.overrideSuggestionType
        )
      );
  }, [teacherCorrectionDrafts]);

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Phase 1: Call alignment analysis
   */
  const handleStartAlignment = useCallback(async () => {
    if (!state.prep || !state.assessment) {
      setErrors((prev) => ({
        ...prev,
        alignment: "Prep and assessment documents are required",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, alignment: true }));
    setErrors((prev) => ({ ...prev, alignment: null }));

    try {
      const alignment = await getAlignment(state.prep, state.assessment);
      setState((prev) => ({ ...prev, alignment, report: null }));
      setAlignmentDebug(alignment.debug ?? null);
      setPhase("alignment");
      setSelectedSuggestions(new Set());
      setSelectedFixes({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, alignment: message }));
    } finally {
      setLoading((prev) => ({ ...prev, alignment: false }));
    }
  }, [state.prep, state.assessment]);

  /**
   * Phase 2: Call suggestions
   */
  const handleGetSuggestions = useCallback(async () => {
    if (!state.alignment) {
      setErrors((prev) => ({
        ...prev,
        suggestions: "Alignment data is required",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, suggestions: true }));
    setErrors((prev) => ({ ...prev, suggestions: null }));

    try {
      const suggestions = await getSuggestions(state.alignment);
      setState((prev) => ({ ...prev, suggestions, finalSuggestions: suggestions }));
      setPhase("suggestions");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, suggestions: message }));
    } finally {
      setLoading((prev) => ({ ...prev, suggestions: false }));
    }
  }, [state.alignment]);

  /**
   * Phase 3: Apply selected suggestions
   */
  const handleApplyRewrite = useCallback(async () => {
    if (!state.assessment) {
      setErrors((prev) => ({
        ...prev,
        rewrite: "Assessment document is required",
      }));
      return;
    }

    if (!state.suggestions) {
      setErrors((prev) => ({
        ...prev,
        rewrite: "Suggestions are required",
      }));
      return;
    }

    const sourceSuggestions = state.finalSuggestions ?? state.suggestions;
    const finalSuggestions: SuggestionsList = state.suggestions.length === 0
      ? []
      : Array.from(selectedSuggestions)
          .map((idx) => sourceSuggestions?.[idx])
          .filter((suggestion): suggestion is Suggestion => Boolean(suggestion));

    if (state.suggestions.length > 0 && finalSuggestions.length === 0) {
      setErrors((prev) => ({
        ...prev,
        rewrite: "No suggestions selected",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, rewrite: true }));
    setErrors((prev) => ({ ...prev, rewrite: null }));

    try {
      const rewrite = await applyRewrite(state.assessment, finalSuggestions);
      setState((prev) => ({ ...prev, rewrite, appliedSuggestions: finalSuggestions, report: null }));
      setPhase("rewrite");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, rewrite: message }));
    } finally {
      setLoading((prev) => ({ ...prev, rewrite: false }));
    }
  }, [state.assessment, state.suggestions, selectedFixes, selectedSuggestions]);

  const handleGenerateReport = useCallback(async () => {
    if (!state.alignment || !state.rewrite || !state.prep || !state.assessment) {
      setErrors((prev) => ({
        ...prev,
        report: "Alignment, rewrite, prep, and assessment data are required",
      }));
      return;
    }

    const suggestionsForReport = state.appliedSuggestions ?? state.finalSuggestions ?? state.suggestions;
    if (!suggestionsForReport) {
      setErrors((prev) => ({
        ...prev,
        report: "Suggestions are required to generate a report",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, report: true }));
    setErrors((prev) => ({ ...prev, report: null }));

    try {
      const parsedCorrections = getParsedTeacherCorrections();

      const corrected = await applyTeacherCorrections(
        state.alignment,
        suggestionsForReport,
        state.rewrite,
        parsedCorrections
      );

      const report = await generatePreparednessReport(
        corrected.correctedAlignment,
        corrected.correctedSuggestions,
        corrected.correctedRewrite
      );

      const adminReport = await getAdminReport({
        modelOutput: {
          alignment: corrected.correctedAlignment,
          suggestions: corrected.correctedSuggestions,
          rewrite: corrected.correctedRewrite,
        },
        teacherCorrections: parsedCorrections,
      });

      setState((prev) => ({
        ...prev,
        alignment: corrected.correctedAlignment,
        suggestions: corrected.correctedSuggestions,
        rewrite: corrected.correctedRewrite,
        report: { ...report, adminReport: adminReport.adminReport },
      }));
      setAdminAuditReport(adminReport.adminReport);
      setPhase("report");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, report: message }));
    } finally {
      setLoading((prev) => ({ ...prev, report: false }));
    }
  }, [
    state.alignment,
    state.appliedSuggestions,
    state.assessment,
    state.finalSuggestions,
    state.prep,
    state.rewrite,
    state.suggestions,
    getParsedTeacherCorrections,
  ]);

  const handleReportToAdmin = useCallback(async () => {
    if (!state.alignment || !state.rewrite) {
      setErrors((prev) => ({
        ...prev,
        adminReport: "Alignment and rewrite data are required to report to admin",
      }));
      return;
    }

    const suggestionsForAdmin = state.appliedSuggestions ?? state.finalSuggestions ?? state.suggestions;
    if (!suggestionsForAdmin) {
      setErrors((prev) => ({
        ...prev,
        adminReport: "Suggestions are required to report to admin",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, adminReport: true }));
    setErrors((prev) => ({ ...prev, adminReport: null }));

    try {
      const admin = await getAdminReport({
        modelOutput: {
          alignment: state.alignment,
          suggestions: suggestionsForAdmin,
          rewrite: state.rewrite,
        },
        teacherCorrections: getParsedTeacherCorrections(),
      });
      setAdminAuditReport(admin.adminReport);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, adminReport: message }));
    } finally {
      setLoading((prev) => ({ ...prev, adminReport: false }));
    }
  }, [
    getParsedTeacherCorrections,
    state.alignment,
    state.appliedSuggestions,
    state.finalSuggestions,
    state.rewrite,
    state.suggestions,
  ]);

  useEffect(() => {
    if (phase !== "teacher" || !state.alignment) {
      return;
    }

    const nextDrafts: Record<number, TeacherCorrectionDraft> = {};
    const sourceItems = [...state.alignment.coveredItems, ...state.alignment.uncoveredItems];
    for (const item of sourceItems) {
      nextDrafts[item.assessmentItemNumber] = {
        assessmentItemNumber: item.assessmentItemNumber,
        overrideAlignment: "",
        overrideConcepts: "",
        overrideDifficulty: "",
        overrideSuggestionType: "",
      };
    }
    setTeacherCorrectionDrafts(nextDrafts);
  }, [phase, state.alignment]);

  useEffect(() => {
    if (
      state.prep &&
      state.assessment &&
      !state.alignment &&
      !loading.alignment
    ) {
      void handleStartAlignment();
    }
  }, [state.prep, state.assessment, state.alignment, loading.alignment, handleStartAlignment]);

  const handleFinalSuggestionsChange = (finalSuggestions: SuggestionsResult) => {
    setState((prev) => ({ ...prev, finalSuggestions }));
  };

  /**
   * Handle suggestion selection
   */
  const handleToggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectFix = (
    assessmentItemNumber: number,
    fixType: "remove_question" | "add_prep_support"
  ) => {
    setSelectedFixes((prev) => ({ ...prev, [assessmentItemNumber]: fixType }));
  };

  /**
   * Start over
   */
  const handleReset = () => {
    setState({
      prep: null,
      assessment: null,
      alignment: null,
      suggestions: null,
      rewrite: null,
      finalSuggestions: null,
      report: null,
      appliedSuggestions: null,
    });
    setPhase("upload");
    setSelectedSuggestions(new Set());
    setSelectedFixes({});
    setTeacherCorrectionDrafts({});
    setTeacherReviewFilter("all");
    setAdminAuditReport(null);
    setAlignmentDebug(null);
    setPrepInputText("");
    setAssessmentInputText("");
    setPrepParagraphs([]);
    setAssessmentParagraphs([]);
    setErrors({
      alignment: null,
      suggestions: null,
      rewrite: null,
      report: null,
      adminReport: null,
    });
  };

  const handlePrepFileUpload = useCallback(async (file: File) => {
    const extracted = await extractTextFromFile(file);
    setPrepInputText(extracted.text);
    setPrepParagraphs(extracted.paragraphs);
  }, []);

  const handleAssessmentFileUpload = useCallback(async (file: File) => {
    const extracted = await extractTextFromFile(file);
    setAssessmentInputText(extracted.text);
    setAssessmentParagraphs(extracted.paragraphs);
  }, []);

  const handleLoadDocuments = useCallback(() => {
    const prepResult = buildExtractionResult(
      (prepParagraphs.length > 0 ? prepParagraphs : prepInputText.split(/\n+/)).filter(Boolean)
    );
    const assessmentResult = buildExtractionResult(
      (assessmentParagraphs.length > 0 ? assessmentParagraphs : assessmentInputText.split(/\n+/)).filter(Boolean)
    );
    const assessmentItems = parseAssessmentItemsFromParagraphs(assessmentResult.paragraphs);
    const prepError = validatePrepExtraction(prepResult);
    const assessmentError = validateAssessmentExtraction(assessmentResult, assessmentItems);
    const combinedChars = prepResult.text.length + assessmentResult.text.length;

    if (combinedChars > INGESTION_LIMITS.combinedMaxChars) {
      setErrors((prev) => ({
        ...prev,
        alignment: "This document is too large to process. Please upload a smaller section.",
      }));
      return;
    }

    if (prepResult.source === "fallback" || assessmentResult.source === "fallback") {
      setErrors((prev) => ({
        ...prev,
        alignment: "We couldn't read your document cleanly. Please upload a clean DOCX or PDF.",
      }));
      return;
    }

    if (prepError || assessmentError) {
      setErrors((prev) => ({
        ...prev,
        alignment: prepError ?? assessmentError,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      prep: { rawText: prepResult.text },
      assessment: { items: assessmentItems },
      alignment: null,
      suggestions: null,
      finalSuggestions: null,
      rewrite: null,
      report: null,
      appliedSuggestions: null,
    }));
    setErrors((prev) => ({ ...prev, alignment: null }));
    setPhase("alignment");
  }, [assessmentInputText, assessmentParagraphs, prepInputText, prepParagraphs]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="prep-pipeline-shell">
      {/* Header */}
      <div className="prep-stage-header">
        <h1 className="prep-stage-title">
          Preparedness Analysis
        </h1>
        <p className="prep-stage-subtitle">
          Ensure your assessment aligns with your preparation materials.
        </p>
      </div>

      {/* Phase Indicator */}
      {phase !== "upload" && (
        <div className="prep-phase-indicator">
          <div className={`prep-phase-step ${phase === "alignment" ? "prep-phase-step-active" : ""}`}>1. Alignment</div>
          <div className="prep-phase-separator">›</div>
          <div className={`prep-phase-step ${phase === "suggestions" ? "prep-phase-step-active" : ""}`}>2. Suggestions</div>
          <div className="prep-phase-separator">›</div>
          <div className={`prep-phase-step ${phase === "rewrite" ? "prep-phase-step-active" : ""}`}>3. Rewrite</div>
          <div className="prep-phase-separator">›</div>
          <div className={`prep-phase-step ${phase === "teacher" ? "prep-phase-step-active" : ""}`}>4. Teacher Review</div>
          <div className="prep-phase-separator">›</div>
          <div className={`prep-phase-step ${phase === "report" ? "prep-phase-step-active" : ""}`}>5. Report</div>
        </div>
      )}

      {phase !== "upload" && (state.assessment || state.prep) && (
        <div
          className="prep-documents-grid"
          style={{
            marginBottom: "1rem",
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <section className="prep-detail-box" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Test Document</h3>
            <p style={{ marginTop: 0, color: "#475569", fontSize: "0.9rem" }}>
              Full assessment text used for rewrite.
            </p>
            {state.assessment ? (
              <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {state.assessment.items.map((item) => (
                  <li key={item.itemNumber} style={{ marginBottom: "0.5rem", lineHeight: 1.45 }}>
                    {normalizeAssessmentDisplayText(item.text)}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, color: "#64748b" }}>No assessment loaded.</p>
            )}
          </section>

          <section className="prep-detail-box" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Prep Document</h3>
            <p style={{ marginTop: 0, color: "#475569", fontSize: "0.9rem" }}>
              Full prep content used for concept extraction.
            </p>
            {state.prep?.rawText ? (
              prepLooksBinary ? (
                <div className="prep-empty-state" style={{ margin: 0 }}>
                  <p style={{ margin: 0 }}>
                    This prep document appears to be binary file content (for example, raw .docx bytes) rather than extracted text.
                    Please re-upload using text extraction so the prep view and concept extraction are readable.
                  </p>
                </div>
              ) : (
                <pre className="prep-code-block" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {state.prep.rawText}
                </pre>
              )
            ) : (
              <p style={{ margin: 0, color: "#64748b" }}>No prep document loaded.</p>
            )}
          </section>
        </div>
      )}

      {phase !== "upload" && import.meta.env.DEV && alignmentDebug && (
        <details className="prep-detail-box" style={{ marginBottom: "1rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Debug: Alignment Pipeline</summary>
          <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="prep-chip">Source: {alignmentDebug.alignmentSource}</span>
              <span className="prep-chip">Review fallback: {alignmentDebug.usedReviewFallback ? "yes" : "no"}</span>
              <span className="prep-chip">Test fallback: {alignmentDebug.usedTestFallback ? "yes" : "no"}</span>
              <span className="prep-chip">Deterministic fallback: {alignmentDebug.usedDeterministicFallback ? "yes" : "no"}</span>
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.4rem 0" }}>Sanitized item numbers</h4>
              <pre className="prep-code-block" style={{ margin: 0 }}>
                {JSON.stringify(alignmentDebug.sanitizedItemNumbers, null, 2)}
              </pre>
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.4rem 0" }}>Extracted review concepts</h4>
              <pre className="prep-code-block" style={{ margin: 0 }}>
                {JSON.stringify(alignmentDebug.reviewConcepts, null, 2)}
              </pre>
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.4rem 0" }}>Extracted test concepts</h4>
              <pre className="prep-code-block" style={{ margin: 0 }}>
                {JSON.stringify(alignmentDebug.testConcepts, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      )}

      {/* UPLOAD PHASE */}
      {phase === "upload" && (
        <div className="prep-stage-card" style={{ borderStyle: "dashed", borderWidth: 2, borderColor: "#93c5fd", textAlign: "center", backgroundColor: "#f0f6ff", padding: "3rem 2rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem", color: "#0066cc" }}>
            Ready to analyze?
          </h2>
          <p style={{ margin: "0 0 2rem 0", color: "#666" }}>
            Upload or select your prep document and assessment to begin.
          </p>

          <div style={{ display: "grid", gap: "1rem", textAlign: "left", maxWidth: "980px", margin: "0 auto" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600 }}>Prep Document (text, .docx, or .pdf)</label>
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    await handlePrepFileUpload(file);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to read prep file";
                    setErrors((prev) => ({ ...prev, alignment: message }));
                  }
                }}
              />
              <textarea
                className="prep-form-control"
                value={prepInputText}
                onChange={(event) => {
                  setPrepInputText(event.target.value);
                  setPrepParagraphs(event.target.value.split(/\n+/).map((entry) => entry.trim()).filter(Boolean));
                }}
                rows={8}
                placeholder="Paste prep content here if not uploading a file"
              />
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600 }}>Assessment Document (text, .docx, or .pdf)</label>
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    await handleAssessmentFileUpload(file);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to read assessment file";
                    setErrors((prev) => ({ ...prev, alignment: message }));
                  }
                }}
              />
              <textarea
                className="prep-form-control"
                value={assessmentInputText}
                onChange={(event) => {
                  setAssessmentInputText(event.target.value);
                  setAssessmentParagraphs(event.target.value.split(/\n+/).map((entry) => entry.trim()).filter(Boolean));
                }}
                rows={8}
                placeholder="Paste assessment questions here (numbered if possible)"
              />
            </div>

            {(prepParagraphs.length > 0 || assessmentParagraphs.length > 0) && (
              <section className="prep-detail-box" style={{ margin: 0 }}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Extracted Paragraph Preview</h3>
                <p style={{ marginTop: 0, color: "#475569", fontSize: "0.9rem" }}>
                  Paragraphs captured before question splitting. If these are wrong, extraction failed.
                </p>
                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 0.4rem 0" }}>Prep paragraphs</h4>
                    <pre className="prep-code-block" style={{ margin: 0 }}>
                      {JSON.stringify(prepParagraphs, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 0.4rem 0" }}>Assessment paragraphs</h4>
                    <pre className="prep-code-block" style={{ margin: 0 }}>
                      {JSON.stringify(assessmentParagraphs, null, 2)}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {errors.alignment && (
              <div className="prep-error-banner">✗ {errors.alignment}</div>
            )}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleLoadDocuments}
                className="v4-button v4-button-primary"
              >
                Load Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALIGNMENT PHASE */}
      {phase === "alignment" && (
        <div className="prep-stage-card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Assessment-Prep Alignment
          </h2>

          {errors.alignment && (
            <div className="prep-error-banner">
              ✗ {errors.alignment}
            </div>
          )}

          {loading.alignment ? (
            <div className="prep-loading">
              <p style={{ marginTop: 0 }}>Analyzing alignment...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.alignment ? (
            <>
              <AlignmentTable alignment={state.alignment} />

              <div className="prep-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="v4-button v4-button-secondary"
                >
                  Start Over
                </button>
                <button
                  type="button"
                  onClick={handleGetSuggestions}
                  disabled={loading.suggestions}
                  className="v4-button v4-button-primary"
                >
                  {loading.suggestions ? "Generating..." : "View Suggestions"}
                </button>
              </div>
            </>
          ) : (
            <div className="prep-empty-state">No alignment data available. Please start the analysis.</div>
          )}
        </div>
      )}

      {/* SUGGESTIONS PHASE */}
      {phase === "suggestions" && (
        <div className="prep-stage-card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Fix Suggestions
          </h2>

          {errors.suggestions && (
            <div className="prep-error-banner">
              ✗ {errors.suggestions}
            </div>
          )}

          {loading.suggestions ? (
            <div className="prep-loading">
              <p style={{ marginTop: 0 }}>Generating suggestions...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.suggestions ? (
            <>
              <SuggestionsPanel
                suggestions={state.suggestions}
                selectedSuggestions={selectedSuggestions}
                selectedFixes={selectedFixes}
                onToggleSuggestion={handleToggleSuggestion}
                onSelectFix={handleSelectFix}
                onChangeFinalSuggestions={handleFinalSuggestionsChange}
                isLoading={loading.rewrite}
              />

              <div className="prep-actions">
                <button
                  type="button"
                  onClick={() => setPhase("alignment")}
                  className="v4-button v4-button-secondary"
                >
                  Back to Alignment
                </button>
                <button
                  type="button"
                  onClick={handleApplyRewrite}
                  disabled={loading.rewrite || (state.suggestions.length > 0 && selectedSuggestions.size === 0)}
                  className="v4-button v4-button-primary"
                >
                  {loading.rewrite
                    ? "Rewriting..."
                    : state.suggestions.length === 0
                    ? "Continue Without Changes"
                    : `Apply ${selectedSuggestions.size} Suggestion${selectedSuggestions.size === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          ) : (
            <div className="prep-empty-state">No suggestions available. Please generate them first.</div>
          )}
        </div>
      )}

      {/* REWRITE PHASE */}
      {phase === "rewrite" && (
        <div className="prep-stage-card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Rewritten Assessment
          </h2>

          {errors.rewrite && (
            <div className="prep-error-banner">
              ✗ {errors.rewrite}
            </div>
          )}

          {loading.rewrite ? (
            <div className="prep-loading">
              <p style={{ marginTop: 0 }}>Rewriting assessment...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.rewrite && state.assessment ? (
            <>
              <RewriteOutput
                rewrite={state.rewrite}
                originalAssessment={state.assessment}
                originalPrepTitle={state.prep?.title}
                onGenerateReport={() => setPhase("teacher")}
                isGeneratingReport={loading.report}
              />

              {errors.report && (
                <div className="prep-error-banner" style={{ marginTop: "1rem" }}>
                  ✗ {errors.report}
                </div>
              )}

              <div className="prep-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="v4-button v4-button-secondary"
                >
                  Start Over
                </button>
              </div>
            </>
          ) : (
            <div className="prep-empty-state">No rewrite data available. Please generate it first.</div>
          )}
        </div>
      )}

      {/* TEACHER INPUT PHASE */}
      {phase === "teacher" && (
        <div className="prep-stage-card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Teacher Corrections
          </h2>

          <p style={{ color: "#555", marginTop: 0 }}>
            Optional: override model decisions per question. Only filled fields are applied.
          </p>

          <div className="prep-section-heading" style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="v4-button v4-button-secondary"
                onClick={() => setTeacherReviewFilter("all")}
                style={{ backgroundColor: teacherReviewFilter === "all" ? "#e2e8f0" : undefined }}
              >
                All ({allAlignmentItems.length})
              </button>
              <button
                type="button"
                className="v4-button v4-button-secondary"
                onClick={() => setTeacherReviewFilter("missing")}
                style={{ backgroundColor: teacherReviewFilter === "missing" ? "#fee2e2" : undefined }}
              >
                Missing in Prep ({allAlignmentItems.filter((item) => item.alignment === "missing_in_prep").length})
              </button>
              <button
                type="button"
                className="v4-button v4-button-secondary"
                onClick={() => setTeacherReviewFilter("overridden")}
                style={{ backgroundColor: teacherReviewFilter === "overridden" ? "#dbeafe" : undefined }}
              >
                Overridden ({allAlignmentItems.filter((item) => hasDraftOverride(teacherCorrectionDrafts[item.assessmentItemNumber])).length})
              </button>
            </div>

            <button
              type="button"
              className="v4-button v4-button-secondary"
              onClick={() => {
                const resetDrafts: Record<number, TeacherCorrectionDraft> = {};
                for (const item of allAlignmentItems) {
                  resetDrafts[item.assessmentItemNumber] = {
                    assessmentItemNumber: item.assessmentItemNumber,
                    overrideAlignment: "",
                    overrideConcepts: "",
                    overrideDifficulty: "",
                    overrideSuggestionType: "",
                  };
                }
                setTeacherCorrectionDrafts(resetDrafts);
                setTeacherReviewFilter("all");
              }}
            >
              Reset All Overrides
            </button>
          </div>

          <div className="prep-surface prep-table-wrap">
            <table className="prep-table" style={{ fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th>Q#</th>
                  <th>Model Alignment</th>
                  <th>Override Alignment</th>
                  <th>Override Concepts</th>
                  <th>Override Difficulty</th>
                  <th>Override Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeacherItems.map((item) => {
                  const draft = teacherCorrectionDrafts[item.assessmentItemNumber];
                  const rowState = hasDraftOverride(draft)
                    ? "overridden"
                    : item.alignment === "missing_in_prep"
                    ? "missing"
                    : "unchanged";
                  return (
                    <tr
                      key={item.assessmentItemNumber}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor:
                          rowState === "overridden"
                            ? "#eff6ff"
                            : rowState === "missing"
                            ? "#fff7ed"
                            : "white",
                      }}
                    >
                      <td style={{ padding: "10px", fontWeight: 600 }}>{item.assessmentItemNumber}</td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            backgroundColor:
                              rowState === "overridden"
                                ? "#dbeafe"
                                : rowState === "missing"
                                ? "#ffedd5"
                                : "#e5e7eb",
                            color:
                              rowState === "overridden"
                                ? "#1d4ed8"
                                : rowState === "missing"
                                ? "#c2410c"
                                : "#334155",
                          }}
                        >
                          {rowState === "overridden"
                            ? "Overridden"
                            : rowState === "missing"
                            ? "Missing in Prep"
                            : "Unchanged"}
                        </span>
                        <div style={{ marginTop: "4px" }}>{item.alignment}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <select
                          value={draft?.overrideAlignment ?? ""}
                          onChange={(event) =>
                            setTeacherCorrectionDrafts((prev) => ({
                              ...prev,
                              [item.assessmentItemNumber]: {
                                ...(prev[item.assessmentItemNumber] ?? {
                                  assessmentItemNumber: item.assessmentItemNumber,
                                  overrideConcepts: "",
                                  overrideDifficulty: "",
                                  overrideSuggestionType: "",
                                  overrideAlignment: "",
                                }),
                                overrideAlignment: event.target.value as TeacherOverrideAlignment,
                              },
                            }))
                          }
                          className="prep-form-control"
                        >
                          <option value="">No change</option>
                          <option value="aligned">aligned</option>
                          <option value="slightly_above">slightly_above</option>
                          <option value="misaligned_above">misaligned_above</option>
                          <option value="missing_in_prep">missing_in_prep</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <input
                          type="text"
                          value={draft?.overrideConcepts ?? ""}
                          placeholder="comma,separated,labels"
                          onChange={(event) =>
                            setTeacherCorrectionDrafts((prev) => ({
                              ...prev,
                              [item.assessmentItemNumber]: {
                                ...(prev[item.assessmentItemNumber] ?? {
                                  assessmentItemNumber: item.assessmentItemNumber,
                                  overrideAlignment: "",
                                  overrideDifficulty: "",
                                  overrideSuggestionType: "",
                                  overrideConcepts: "",
                                }),
                                overrideConcepts: event.target.value,
                              },
                            }))
                          }
                          className="prep-form-control"
                        />
                      </td>
                      <td style={{ padding: "10px" }}>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={draft?.overrideDifficulty ?? ""}
                          onChange={(event) =>
                            setTeacherCorrectionDrafts((prev) => ({
                              ...prev,
                              [item.assessmentItemNumber]: {
                                ...(prev[item.assessmentItemNumber] ?? {
                                  assessmentItemNumber: item.assessmentItemNumber,
                                  overrideAlignment: "",
                                  overrideConcepts: "",
                                  overrideSuggestionType: "",
                                  overrideDifficulty: "",
                                }),
                                overrideDifficulty: event.target.value,
                              },
                            }))
                          }
                          className="prep-form-control"
                        />
                      </td>
                      <td style={{ padding: "10px" }}>
                        <select
                          value={draft?.overrideSuggestionType ?? ""}
                          onChange={(event) =>
                            setTeacherCorrectionDrafts((prev) => ({
                              ...prev,
                              [item.assessmentItemNumber]: {
                                ...(prev[item.assessmentItemNumber] ?? {
                                  assessmentItemNumber: item.assessmentItemNumber,
                                  overrideAlignment: "",
                                  overrideConcepts: "",
                                  overrideDifficulty: "",
                                  overrideSuggestionType: "",
                                }),
                                overrideSuggestionType: event.target.value as TeacherOverrideSuggestion,
                              },
                            }))
                          }
                          className="prep-form-control"
                        >
                          <option value="">No change</option>
                          <option value="none">none</option>
                          <option value="add_prep_support">add_prep_support</option>
                          <option value="remove_question">remove_question</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="prep-actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="v4-button v4-button-secondary"
              onClick={() => setPhase("rewrite")}
            >
              Back to Rewrite
            </button>
            <button
              type="button"
              className="v4-button v4-button-secondary"
              onClick={handleReportToAdmin}
              disabled={loading.adminReport}
            >
              {loading.adminReport ? "Reporting..." : "Report to Admin"}
            </button>
            <button
              type="button"
              className="v4-button v4-button-primary"
              onClick={handleGenerateReport}
              disabled={loading.report}
            >
              {loading.report ? "Generating..." : "Apply Corrections & Generate Report"}
            </button>
          </div>

          {errors.report && (
            <div className="prep-error-banner" style={{ marginTop: "1rem" }}>
              ✗ {errors.report}
            </div>
          )}

          {errors.adminReport && (
            <div className="prep-error-banner" style={{ marginTop: "1rem" }}>
              ✗ {errors.adminReport}
            </div>
          )}

          {adminAuditReport && (
            <details className="prep-detail-box" style={{ marginTop: "1rem" }} open>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Latest Admin Audit Report</summary>
              <div style={{ marginTop: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>Preparedness</h4>
                <pre className="prep-code-block">
                  {JSON.stringify(adminAuditReport.preparedness, null, 2)}
                </pre>
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>Other System Areas</h4>
                <pre className="prep-code-block">
                  {JSON.stringify(adminAuditReport.otherSystemAreas ?? {}, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}

      {/* REPORT PHASE */}
      {phase === "report" && state.report && (
        <div>
          <PreparednessReportPage report={state.report} onBack={() => setPhase("rewrite")} />

          {state.report.adminReport && (
            <details className="prep-detail-box">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Admin Audit Report</summary>
              <div style={{ marginTop: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>Preparedness</h4>
                <pre className="prep-code-block">
                  {JSON.stringify(state.report.adminReport.preparedness, null, 2)}
                </pre>
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>Other System Areas</h4>
                <pre className="prep-code-block">
                  {JSON.stringify(state.report.adminReport.otherSystemAreas ?? {}, null, 2)}
                </pre>
              </div>
            </details>
          )}

          <div className="prep-actions">
            <button
              type="button"
              onClick={handleReset}
              className="v4-button v4-button-secondary"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparednessPage;
