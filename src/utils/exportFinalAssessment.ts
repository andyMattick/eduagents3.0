/**
 * exportFinalAssessment.ts
 *
 * PDF generator for the FinalAssessment type produced by the Builder agent.
 * Uses jsPDF directly — no html2canvas dependency, so output is
 * always crisp at any zoom level / print resolution.
 */

import jsPDF from "jspdf";
import type { FinalAssessment, FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";

// ── Layout constants ──────────────────────────────────────────────────────────

const MARGIN = 18;       // mm from each edge
const PAGE_W = 210;      // A4 width mm
const PAGE_H = 297;      // A4 height mm
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_BODY = 10.5;
const FONT_SMALL = 9;
const FONT_LARGE = 15;
const LINE_H = 6.5;      // mm between text lines

// ── Helpers ───────────────────────────────────────────────────────────────────

function pageFooter(doc: jsPDF, page: number, total: number, id: string) {
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Page ${page} of ${total}`, PAGE_W / 2, PAGE_H - 8, { align: "center" });
  doc.text(`ID: ${id}`, MARGIN, PAGE_H - 8);
  doc.setTextColor(0);
}

/** Wrap text and return new Y cursor */
function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = LINE_H
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Add a new page, reset cursor, draw footer placeholder */
function addPage(doc: jsPDF): number {
  doc.addPage();
  return MARGIN + 6;
}

/** Guard: if remaining space < needed, add a new page */
function guardSpace(
  doc: jsPDF,
  y: number,
  needed: number
): number {
  if (y + needed > PAGE_H - MARGIN) {
    return addPage(doc);
  }
  return y;
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface PDFOptions {
  title?: string;
  subtitle?: string;
  /** When true, answer key is appended on the final page. Default: true. */
  includeAnswerKey?: boolean;
}

/**
 * Generates a jsPDF document from a FinalAssessment and triggers a browser download.
 */
export async function downloadFinalAssessmentPDF(
  assessment: FinalAssessment,
  options: PDFOptions = {}
): Promise<void> {
  const doc = buildPDF(assessment, options);
  const safeTitle = (options.title ?? "assessment").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeTitle}_${assessment.id.slice(-6)}.pdf`);
}

/**
 * Returns the raw jsPDF document (useful for tests or server-side rendering).
 */
export function buildPDF(
  assessment: FinalAssessment,
  options: PDFOptions = {}
): jsPDF {
  const {
    title = "Assessment",
    subtitle,
    includeAnswerKey = true,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = MARGIN;

  // ── Page 1: header ──────────────────────────────────────────────────────────

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_LARGE);
  doc.text(title, MARGIN, y);
  y += 8;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(100);
    doc.text(subtitle, MARGIN, y);
    doc.setTextColor(0);
    y += 5.5;
  }

  // Thin rule
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  // Meta row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(100);
  const metaItems: string[] = [
    `${assessment.totalItems} questions`,
  ];
  if (assessment.metadata?.totalEstimatedTimeSeconds) {
    metaItems.push(`${Math.round(assessment.metadata.totalEstimatedTimeSeconds / 60)} min`);
  }
  metaItems.push(new Date(assessment.generatedAt).toLocaleDateString());
  doc.text(metaItems.join("   ·   "), MARGIN, y);
  doc.setTextColor(0);
  y += 5;

  // Cognitive distribution
  const cogDist = assessment.cognitiveDistribution;
  if (Object.keys(cogDist).length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const distText = Object.entries(cogDist)
      .map(([k, v]) => `${k}: ${v}`)
      .join("  |  ");
    doc.text(distText, MARGIN, y);
    doc.setTextColor(0);
    y += 5;
  }

  // Student header fields
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SMALL);

  const fieldW = (CONTENT_W - 10) / 2;
  // Name
  doc.line(MARGIN, y, MARGIN + fieldW, y);
  doc.setTextColor(130);
  doc.text("Name", MARGIN, y + 3.5);
  // Date
  doc.line(MARGIN + fieldW + 10, y, MARGIN + fieldW + 10 + fieldW, y);
  doc.text("Date", MARGIN + fieldW + 10, y + 3.5);
  doc.setTextColor(0);
  y += 10;

  // Horizontal divider before questions
  doc.setLineWidth(0.2);
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setDrawColor(0);
  y += 6;

  // ── Questions ───────────────────────────────────────────────────────────────

  for (const item of assessment.items) {
    y = renderQuestion(doc, item, y);
  }

  // ── Answer key (separate page) ──────────────────────────────────────────────

  if (includeAnswerKey) {
    doc.addPage();
    y = MARGIN + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_BODY);
    doc.text("ANSWER KEY", MARGIN, y);

    doc.setLineWidth(0.4);
    doc.setDrawColor(0);
    doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_BODY);

    const colW = CONTENT_W / 2;
    let col = 0;

    for (const item of assessment.items) {
      const xPos = MARGIN + col * colW;
      const answerText = item.answer ?? "—";

      // Number
      doc.setFont("helvetica", "bold");
      doc.text(`${item.questionNumber}.`, xPos, y);
      doc.setFont("helvetica", "normal");

      const answerLines = doc.splitTextToSize(answerText, colW - 8);
      doc.text(answerLines, xPos + 7, y);

      y += answerLines.length * 5.5 + 0.5;
      col = (col + 1) % 2;
      if (col === 0) {
        // After filling both columns, drop down
        y = guardSpace(doc, y, 10);
      }
    }
  }

  // ── Page numbers ─────────────────────────────────────────────────────────────

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    pageFooter(doc, i, pageCount, assessment.id);
  }

  return doc;
}

// ── Question renderer ─────────────────────────────────────────────────────────

function renderQuestion(
  doc: jsPDF,
  item: FinalAssessmentItem,
  y: number
): number {
  const isMC = item.questionType === "multipleChoice";
  const numW = 8; // mm reserved for "1."
  const bodyX = MARGIN + numW;
  const bodyW = CONTENT_W - numW;

  // Estimate space needed for this question
  const promptLines = doc.splitTextToSize(item.prompt, bodyW);
  const optionLines = isMC
    ? (item.options ?? []).reduce(
        (acc, opt) => acc + doc.splitTextToSize(opt, bodyW - 4).length,
        0
      )
    : 0;
  const shortAnswerSpace = isMC ? 0 : 3 * 6; // 3 blank lines
  const needed = promptLines.length * LINE_H + optionLines * 5 + shortAnswerSpace + 10;

  y = guardSpace(doc, y, needed);

  // Bloom badge
  if (item.cognitiveDemand) {
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(item.cognitiveDemand.toUpperCase(), bodyX, y);
    doc.setTextColor(0);
    y += 4;
  }

  // Question number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_BODY);
  doc.text(`${item.questionNumber}.`, MARGIN, y);

  // Prompt
  doc.setFont("helvetica", "normal");
  y = drawWrapped(doc, item.prompt, bodyX, y, bodyW, LINE_H);
  y += 2;

  if (isMC) {
    // MCQ options
    const opts = item.options ?? [];
    for (const opt of opts) {
      y = guardSpace(doc, y, 6);
      const optLines = doc.splitTextToSize(opt, bodyW - 4);
      doc.text(optLines, bodyX + 4, y);
      y += optLines.length * 5 + 0.5;
    }
    y += 3;
  } else {
    // Blank answer lines
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    for (let l = 0; l < 3; l++) {
      doc.line(bodyX, y + 5, bodyX + bodyW, y + 5);
      y += 7;
    }
    doc.setDrawColor(0);
    y += 2;
  }

  return y;
}
