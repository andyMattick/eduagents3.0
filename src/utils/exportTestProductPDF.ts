/**
 * exportTestProductPDF.ts
 *
 * PDF generator for the TestProduct type produced by the v4 Studio engine.
 * Outputs two functions:
 *   exportTestPDF()      — student-facing test (no answers)
 *   exportAnswerKeyPDF() — teacher answer key with steps + optional misconceptions
 */

import jsPDF from "jspdf";
import type { TestProduct, TestItem, Misconception } from "../prism-v4/schema/integration/IntentProduct";

// ── Layout constants ────────────────────────────────────────────────────────

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_BODY = 10.5;
const FONT_SMALL = 9;
const FONT_LARGE = 15;
const LINE_H = 6;

// ── Format display helpers ──────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  TF: "True / False",
  MC: "Multiple Choice",
  MS: "Multiple Select",
  Matching: "Matching",
  Sorting: "Ordering",
  SA: "Short Answer",
  FRQ: "Free Response",
};

const FORMAT_ORDER = ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"];

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  TF: "Write True or False for each statement.",
  MC: "Circle the best answer.",
  MS: "Circle all answers that apply.",
  Matching: "Match each term in Column A to its definition in Column B.",
  Sorting: "Write the items in the correct order.",
  SA: "Answer in 1–3 sentences.",
  FRQ: "Answer all parts completely. Show all reasoning.",
};

// ── Low-level PDF helpers ───────────────────────────────────────────────────

function guardSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = LINE_H,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines as string[]).length * lineHeight;
}

function toRoman(n: number): string {
  const vals: [string, number][] = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
    ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
    ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
  ];
  let r = "";
  for (const [l, v] of vals) { while (n >= v) { r += l; n -= v; } }
  return r;
}

function sectionHeader(
  doc: jsPDF,
  fmt: string,
  sectionNum: number,
  y: number,
): number {
  y = guardSpace(doc, y, 16);
  const label = FORMAT_LABELS[fmt] ?? fmt;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`SECTION ${toRoman(sectionNum)} — ${label.toUpperCase()}`, MARGIN, y);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  y += 7;
  const instr = FORMAT_INSTRUCTIONS[fmt];
  if (instr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(100);
    doc.text(instr, MARGIN, y);
    doc.setTextColor(0);
    y += 6;
  }
  return y;
}

// ── Student test item renderers ────────────────────────────────────────────

function renderStudentItem(doc: jsPDF, item: TestItem, num: number, y: number): number {
  const fmt = item.problemType ?? "SA";
  const sa = item.structuredAnswer as Record<string, unknown> | string | null | undefined;

  y = guardSpace(doc, y, 14);

  // Question number + prompt
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_BODY);
  doc.text(`${num}.`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  y = drawWrapped(doc, item.prompt, MARGIN + 7, y, CONTENT_W - 7);
  y += 2;

  if (fmt === "TF") {
    doc.setFontSize(FONT_BODY);
    doc.text("True  /  False", MARGIN + 7, y);
    y += LINE_H + 2;
    return y;
  }

  if (fmt === "MC" || fmt === "MS") {
    const choices =
      (sa as { choices?: string[] } | null)?.choices ??
      ((typeof sa === "string") ? [] : []);
    doc.setFontSize(FONT_BODY);
    for (const choice of choices) {
      y = guardSpace(doc, y, 7);
      y = drawWrapped(doc, choice, MARGIN + 10, y, CONTENT_W - 10);
      y += 0.5;
    }
    y += 2;
    return y;
  }

  if (fmt === "Matching") {
    const pairs = (typeof sa === "object" && sa !== null && !Array.isArray(sa))
      ? Object.entries(sa as Record<string, string>)
      : [];
    // Scramble definitions for student version
    const terms = pairs.map(([t]) => t);
    const defs = [...pairs.map(([, d]) => d)].sort(); // alphabetical scramble
    const colW = CONTENT_W / 2 - 4;
    doc.setFontSize(FONT_SMALL);
    doc.setFont("helvetica", "bold");
    doc.text("Column A", MARGIN + 7, y);
    doc.text("Column B", MARGIN + colW + 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    const maxRows = Math.max(terms.length, defs.length);
    for (let i = 0; i < maxRows; i++) {
      y = guardSpace(doc, y, 7);
      if (terms[i]) {
        doc.text(`${i + 1}. ${terms[i]}`, MARGIN + 7, y);
      }
      if (defs[i]) {
        const letter = String.fromCharCode(65 + i);
        doc.text(`${letter}. ${defs[i]}`, MARGIN + colW + 14, y);
      }
      y += LINE_H;
    }
    // Answer line for each term
    y += 2;
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(120);
    doc.text(`Answer: ${terms.map((_, i) => `${i + 1}. ___`).join("  ")}`, MARGIN + 7, y);
    doc.setTextColor(0);
    y += LINE_H + 2;
    return y;
  }

  if (fmt === "Sorting") {
    const items = Array.isArray(sa) ? (sa as string[]) : [];
    // Scramble for student view
    const scrambled = [...items].sort(() => 0.5 - Math.random());
    doc.setFontSize(FONT_BODY);
    for (const step of scrambled) {
      y = guardSpace(doc, y, 7);
      y = drawWrapped(doc, `• ${step}`, MARGIN + 10, y, CONTENT_W - 10);
    }
    y += 3;
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(120);
    doc.text("Order: ___ ___ ___ ___", MARGIN + 7, y);
    doc.setTextColor(0);
    y += LINE_H + 2;
    return y;
  }

  if (fmt === "FRQ") {
    const parts =
      typeof sa === "object" && sa !== null && !Array.isArray(sa)
        ? Object.keys(sa as object).sort()
        : [];
    doc.setFontSize(FONT_BODY);
    for (const partKey of parts) {
      const partLabel = partKey.replace("part", "Part ").toUpperCase();
      y = guardSpace(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.text(partLabel + ":", MARGIN + 7, y);
      y += LINE_H;
      doc.setFont("helvetica", "normal");
      // Answer lines
      for (let line = 0; line < 3; line++) {
        y = guardSpace(doc, y, 6);
        doc.setDrawColor(180);
        doc.setLineWidth(0.2);
        doc.line(MARGIN + 7, y + 1, PAGE_W - MARGIN, y + 1);
        doc.setDrawColor(0);
        y += LINE_H;
      }
      y += 1;
    }
    y += 2;
    return y;
  }

  // SA: answer blank
  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 7, y + 1, PAGE_W - MARGIN, y + 1);
  doc.line(MARGIN + 7, y + 7, PAGE_W - MARGIN, y + 7);
  doc.setDrawColor(0);
  y += 12;
  return y;
}

// ── Answer key item renderer ────────────────────────────────────────────────

function renderAnswerKeyItem(
  doc: jsPDF,
  item: TestItem,
  num: number,
  y: number,
  includeMisconceptions: boolean,
): number {
  const fmt = item.problemType ?? "SA";
  const sa = item.structuredAnswer as Record<string, unknown> | string | null | undefined;

  y = guardSpace(doc, y, 18);

  // Question number + truncated prompt
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_BODY);
  doc.text(`${num}.`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  const promptPreview = doc.splitTextToSize(item.prompt, CONTENT_W - 7) as string[];
  const previewLine = promptPreview[0] + (promptPreview.length > 1 ? "…" : "");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(80);
  doc.text(previewLine, MARGIN + 7, y);
  doc.setTextColor(0);
  y += LINE_H;

  // Correct answer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(30, 120, 60); // green
  let answerText = "";

  if (fmt === "TF") {
    answerText = `Answer: ${typeof sa === "string" ? sa : item.answerGuidance ?? "—"}`;
  } else if (fmt === "MC") {
    const correct = (sa as { correct?: string } | null)?.correct ?? item.answerGuidance ?? "—";
    answerText = `Answer: ${correct}`;
  } else if (fmt === "MS") {
    const correct = (sa as { correct?: string[] } | null)?.correct;
    answerText = `Answer: ${Array.isArray(correct) ? correct.join(", ") : item.answerGuidance ?? "—"}`;
  } else if (fmt === "Matching") {
    const pairs = (typeof sa === "object" && sa !== null && !Array.isArray(sa))
      ? Object.entries(sa as Record<string, string>).map(([t, d]) => `${t} → ${d}`)
      : [];
    answerText = `Matches: ${pairs.join(" | ")}`;
  } else if (fmt === "Sorting") {
    const items = Array.isArray(sa) ? (sa as string[]).join(" → ") : item.answerGuidance ?? "—";
    answerText = `Order: ${items}`;
  } else if (fmt === "FRQ") {
    answerText = `See parts below`;
  } else {
    answerText = `Answer: ${typeof sa === "string" ? sa : item.answerGuidance ?? "—"}`;
  }

  y = drawWrapped(doc, answerText, MARGIN + 7, y, CONTENT_W - 7, LINE_H);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  // FRQ parts
  if (fmt === "FRQ" && typeof sa === "object" && sa !== null && !Array.isArray(sa)) {
    for (const [partKey, partVal] of Object.entries(sa as Record<string, string>).sort()) {
      const partLabel = partKey.replace("part", "Part ").toUpperCase();
      y = guardSpace(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT_SMALL);
      doc.text(`${partLabel}:`, MARGIN + 10, y);
      doc.setFont("helvetica", "normal");
      y = drawWrapped(doc, String(partVal), MARGIN + 22, y, CONTENT_W - 22, LINE_H);
    }
  }

  // Concept + difficulty meta
  y += 1;
  doc.setFontSize(8);
  doc.setTextColor(140);
  const meta = [
    item.concept,
    item.difficulty,
    item.estimatedTimeSeconds ? `~${Math.round(item.estimatedTimeSeconds / 60)}m` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, MARGIN + 7, y);
  doc.setTextColor(0);
  y += 5;

  // Solution steps
  if (item.solutionSteps && item.solutionSteps.length > 0) {
    y = guardSpace(doc, y, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SMALL);
    doc.text("Solution steps:", MARGIN + 7, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < item.solutionSteps.length; i++) {
      y = guardSpace(doc, y, 7);
      y = drawWrapped(
        doc,
        `${i + 1}. ${item.solutionSteps[i]}`,
        MARGIN + 10,
        y,
        CONTENT_W - 10,
        LINE_H,
      );
    }
    y += 2;
  }

  // Misconceptions
  if (includeMisconceptions && item.misconceptions && item.misconceptions.length > 0) {
    y = guardSpace(doc, y, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(160, 60, 20); // amber
    doc.text("Common misconceptions:", MARGIN + 7, y);
    doc.setTextColor(0);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (const m of item.misconceptions as Misconception[]) {
      y = guardSpace(doc, y, 8);
      doc.setFont("helvetica", "bold");
      y = drawWrapped(doc, `• ${m.distractor}`, MARGIN + 10, y, CONTENT_W - 10, LINE_H);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      y = drawWrapped(doc, `  ${m.explanation}`, MARGIN + 12, y, CONTENT_W - 12, LINE_H);
      doc.setTextColor(0);
      y += 1;
    }
    y += 2;
  }

  // Divider
  doc.setDrawColor(220);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setDrawColor(0);
  y += 3;

  return y;
}

// ── Group items by problemType ─────────────────────────────────────────────

function collectItems(product: TestProduct): TestItem[] {
  return product.sections.flatMap((s) => s.items);
}

function groupByFormat(items: TestItem[]): { fmt: string; items: TestItem[] }[] {
  const map = new Map<string, TestItem[]>();
  for (const item of items) {
    const fmt = item.problemType ?? "SA";
    if (!map.has(fmt)) map.set(fmt, []);
    map.get(fmt)!.push(item);
  }
  // Sort by FORMAT_ORDER
  const fmts = [...map.keys()].sort((a, b) => {
    const ai = FORMAT_ORDER.indexOf(a);
    const bi = FORMAT_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return fmts.map((fmt) => ({ fmt, items: map.get(fmt)! }));
}

// ── Document header ─────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, title: string, product: TestProduct): number {
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_LARGE);
  doc.text(title, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(100);
  const meta = [
    `${product.totalItemCount} questions`,
    product.estimatedDurationMinutes ? `${product.estimatedDurationMinutes} min` : null,
    new Date(product.generatedAt).toLocaleDateString(),
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(meta, MARGIN, y);
  doc.setTextColor(0);
  y += 5;

  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  // Name / Date fields (student version only)
  const fieldW = (CONTENT_W - 10) / 2;
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(130);
  doc.line(MARGIN, y, MARGIN + fieldW, y);
  doc.text("Name", MARGIN, y + 3.5);
  doc.line(MARGIN + fieldW + 10, y, MARGIN + fieldW + 10 + fieldW, y);
  doc.text("Date", MARGIN + fieldW + 10, y + 3.5);
  doc.setTextColor(0);
  y += 11;

  return y;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Download a student-facing test PDF (no answers).
 */
export function exportTestPDF(product: TestProduct, title?: string): void {
  const docTitle = title ?? product.title ?? "Assessment";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = drawHeader(doc, docTitle, product);

  const groups = groupByFormat(collectItems(product));
  let sectionNum = 1;
  let qNum = 1;

  for (const { fmt, items } of groups) {
    y = sectionHeader(doc, fmt, sectionNum++, y);
    for (const item of items) {
      y = renderStudentItem(doc, item, qNum++, y);
    }
    y += 4;
  }

  const safeTitle = docTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeTitle}_test.pdf`);
}

/**
 * Download a teacher answer key PDF with steps and optional misconceptions.
 */
export function exportAnswerKeyPDF(
  product: TestProduct,
  title?: string,
  includeMisconceptions = false,
): void {
  const docTitle = title ?? product.title ?? "Assessment";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = MARGIN;

  // Key header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_LARGE);
  doc.text(`${docTitle} — ANSWER KEY`, MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(100);
  doc.text(
    [
      `${product.totalItemCount} questions`,
      new Date(product.generatedAt).toLocaleDateString(),
      includeMisconceptions ? "Includes misconceptions" : "Steps only",
    ].join("   ·   "),
    MARGIN,
    y,
  );
  doc.setTextColor(0);
  y += 5;

  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const groups = groupByFormat(collectItems(product));
  let sectionNum = 1;
  let qNum = 1;

  for (const { fmt, items } of groups) {
    y = sectionHeader(doc, fmt, sectionNum++, y);
    for (const item of items) {
      y = renderAnswerKeyItem(doc, item, qNum++, y, includeMisconceptions);
    }
    y += 4;
  }

  const safeTitle = docTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeTitle}_answer_key.pdf`);
}
