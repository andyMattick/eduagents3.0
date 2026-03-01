/**
 * exportFinalAssessment.ts
 *
 * PDF generator for the FinalAssessment type produced by the Builder agent.
 * Uses jsPDF directly — no html2canvas dependency, so output is
 * always crisp at any zoom level / print resolution.
 */

import jsPDF from "jspdf";
import type { FinalAssessment, FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";


const QUESTION_TYPE_INSTRUCTIONS: Record<string, string> = {
  multipleChoice: "Select the best answer for each question.",
  shortAnswer: "Answer each question clearly and concisely.",
  freeResponse: "Show all reasoning and justify your answers.",
  essay: "Write a well-organized response using complete sentences.",
  fillInTheBlank: "Fill in each blank with the correct answer.",
  matching: "Match each item in Column A with the correct option in Column B.",
  trueFalse: "Indicate whether each statement is true or false.",
};
const QUESTION_TYPE_LABELS: Record<string, string> = {
  multipleChoice: "Multiple Choice",
  shortAnswer: "Short Answer",
  freeResponse: "Free Response",
  essay: "Essay",
  fillInTheBlank: "Fill in the Blank",
};

const QUESTION_TYPE_ORDER: string[] = [
  "multipleChoice",
  "matching",
  "trueFalse",
  "fillInTheBlank",
  "shortAnswer",
  "freeResponse",
  "essay",
];

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

function renderSectionHeader(
  doc: jsPDF,
  type: string,
  sectionNumber: number,
  y: number
): number {
  y = guardSpace(doc, y, 16);

  const title = `SECTION ${toRoman(sectionNumber)} — ${formatTypeLabel(type)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, MARGIN, y);

  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);

  y += 7;

  const instruction = QUESTION_TYPE_INSTRUCTIONS[type];
  if (instruction) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(instruction, MARGIN, y);
    doc.setTextColor(0);
    y += 6;
  }

  return y;
}

function formatTypeLabel(type: string): string {
  if (QUESTION_TYPE_LABELS[type]) return QUESTION_TYPE_LABELS[type];

  // fallback: camelCase → Title Case
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase());
}

function toRoman(num: number): string {
  const romans: [string, number][] = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
    ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
    ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]
  ];

  let result = "";
  for (const [letter, value] of romans) {
    while (num >= value) {
      result += letter;
      num -= value;
    }
  }
  return result;
}
function groupAndOrderItems(items: FinalAssessmentItem[]) {
  const groups: Record<string, FinalAssessmentItem[]> = {};

  for (const item of items) {
    if (!groups[item.questionType]) {
      groups[item.questionType] = [];
    }
    groups[item.questionType].push(item);
  }

  // Sort by defined priority; unknown types go last
  const orderedTypes = Object.keys(groups).sort((a, b) => {
    const indexA = QUESTION_TYPE_ORDER.indexOf(a);
    const indexB = QUESTION_TYPE_ORDER.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  return { groups, orderedTypes };
}

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
function filterAssessmentForVersion(
  assessment: FinalAssessment,
  version: "student" | "teacher"
): FinalAssessment {
  if (version === "student") {
    return {
      ...assessment,
      items: assessment.items.map(item => ({
        ...item,
        answer: undefined,
      }))
    };
  }

  return assessment;
}

export interface PDFOptions {
  title?: string;
  subtitle?: string;
  includeAnswerKey?: boolean;
  includeRubric?: boolean;
  version?: "student" | "teacher";
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
): jsPDF {const {
  title = "Assessment",
  subtitle,
  includeAnswerKey = false,
  includeRubric = false,
  version = "student",
} = options;
assessment = filterAssessmentForVersion(assessment, version);

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

  // ── Questions (grouped by type, ordered by section priority) ──────────────

  const { groups, orderedTypes } = groupAndOrderItems(assessment.items);
  let sectionIndex = 1;
  let questionNumber = 1;

  // Build a flat ordered list with sequential numbers — used by both the
  // question renderer and the answer key so numbering is always in sync.
  const orderedItems: Array<{ item: typeof assessment.items[0]; printNumber: number }> = [];
  for (const type of orderedTypes) {
    for (const item of groups[type]) {
      orderedItems.push({ item, printNumber: questionNumber++ });
    }
  }

  for (const { item, printNumber } of orderedItems) {
    // Inject section header when the type changes
    const isFirstOfType = orderedItems.find(o => o.item.questionType === item.questionType)?.item === item;
    if (isFirstOfType) {
      y = renderSectionHeader(doc, item.questionType, sectionIndex++, y);
    }
    y = renderQuestion(doc, { ...item, questionNumber: printNumber }, y);
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

    // Use the same ordered list so answer key numbers match printed numbers.
    for (const { item, printNumber } of orderedItems) {
      const xPos = MARGIN + col * colW;
      // For MCQ, show only the letter (e.g. "B") — the full option text is too long for a key grid
      const isMC = item.questionType === "multipleChoice";
      let rawAnswer = item.answer ?? "—";
      if (isMC && rawAnswer !== "—") {
        const letterMatch = rawAnswer.match(/^([A-Da-d])[.)]\s*/);
        rawAnswer = letterMatch ? letterMatch[1].toUpperCase() : rawAnswer;
      }
      const answerText = rawAnswer;

      // Number
      doc.setFont("helvetica", "bold");
      doc.text(`${printNumber}.`, xPos, y);
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

  if (includeRubric) {
  doc.addPage();
  y = MARGIN + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_BODY);
  doc.text("RUBRIC", MARGIN, y);

  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_BODY);

  const rubric = buildRubric(assessment);

  for (const r of rubric) {
    y = guardSpace(doc, y, 14);

    doc.setFont("helvetica", "bold");
    doc.text(`Question ${r.questionNumber}`, MARGIN, y);
    y += 5;

    doc.setFont("helvetica", "normal");

    for (const criterion of r.criteria) {
      doc.text(`• ${criterion}`, MARGIN + 5, y);
      y += 5;
    }

    y += 4;
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

/**
 * Returns true when the assessment contains LaTeX-normalised math that jsPDF
 * cannot render (fractions, square roots, super/subscripts).  Used to gate the
 * PDF download button in the UI — teachers should use browser Print instead.
 */
export function assessmentContainsMath(assessment: FinalAssessment): boolean {
  // Only match patterns that normalizeMath() actually emits and that jsPDF
  // would render as raw escape sequences rather than proper math notation.
  const mathRegex = /\\frac\{|\\sqrt\{|\^\{|_\{|[\u00B2\u00B3\u2070-\u2079\u2080-\u2089\u221A\u221B\u2211\u222B\u00B1\u2260\u2264\u2265]/;

  return assessment.items.some(item => {
    const combined =
      (item.prompt ?? "") +
      (item.answer ?? "") +
      (item.options?.join(" ") ?? "");

    return mathRegex.test(combined);
  });
}
export type ExportFormat = "auto" | "pdf" | "word" | "both";

export async function exportAssessment(
  assessment: FinalAssessment,
  options?: PDFOptions & { format?: ExportFormat }
) {
  const format = options?.format ?? "auto";
  const hasMath = assessmentContainsMath(assessment);

  const finalFormat =
    format === "auto"
      ? (hasMath ? "pdf" : "word")
      : format;

  if (finalFormat === "pdf") {
    return downloadFinalAssessmentPDF(assessment, options);
  }

  if (finalFormat === "word") {
    return downloadFinalAssessmentWord(assessment, options);
  }

  if (finalFormat === "both") {
    await downloadFinalAssessmentWord(assessment, options);
    return downloadFinalAssessmentPDF(assessment, options);
  }
}
/**
 * Pre-process a math string to normalise common LLM math representations
 * into a consistent form before TextRun splitting.
 *
 * Transforms (in order):
 *  1. \frac{a}{b}        → (a/b)
 *  2. \sqrt{x}           → √x
 *  3. \sqrt[n]{x}        → ∜/∛/√... (simplified as n√x)
 *  4. \log_{b}(x)        → log_b(x)
 *  5. e^(expr) / x^(expr) style parenthesised exponents → ^{expr}
 *  6. log₂ / log₃ etc (subscript unicode digits) → kept as-is (plain text fine)
 *  7. Trailing bare variable after closing paren: f(x)=2x where x should be
 *     plain (NOT superscript) — handled by not over-matching
 */
function normaliseMath(text: string): string {
  let t = text;

  // \frac{numerator}{denominator} → (numerator/denominator)
  // Handle nested braces up to one level deep
  t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1/$2)");

  // \sqrt{x} → √x   |  \sqrt[n]{x} → n√x
  t = t.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g, "$1√$2");
  t = t.replace(/\\sqrt\{([^{}]*)\}/g, "√$1");
  t = t.replace(/\\sqrt\s+(\S+)/g, "√$1");

  // ^(expr) with optional sign/chars inside parens → ^{expr}
  // Matches things like ^(x+1), ^(-x), ^(0.05t), ^(x-1)
  t = t.replace(/\^\(([^)]+)\)/g, "^{$1}");

  // _(expr in parens)
  t = t.replace(/_\(([^)]+)\)/g, "_{$1}");

  // Strip remaining unrecognised LaTeX commands (e.g. \cdot → ·, \times → ×)
  t = t.replace(/\\cdot/g, "·");
  t = t.replace(/\\times/g, "×");
  t = t.replace(/\\div/g, "÷");
  t = t.replace(/\\pm/g, "±");
  t = t.replace(/\\infty/g, "∞");
  t = t.replace(/\\leq/g, "≤");
  t = t.replace(/\\geq/g, "≥");
  t = t.replace(/\\neq/g, "≠");
  // Remove any remaining \word commands that weren't handled
  t = t.replace(/\\[a-zA-Z]+/g, "");

  // Fix LLM tokenization artifacts: "50rabbits" → "50 rabbits", "1unit" → "1 unit"
  t = t.replace(/(\d)([A-Za-z])/g, "$1 $2");
  t = t.replace(/([A-Za-z])(\d)/g, "$1 $2");

  return t;
}

/**
 * Parse a string containing LaTeX-style math notation into an array of docx TextRuns.
 * Supports: ^{...} for superscript, _{...} for subscript,
 *           ^N or ^NN (bare) for superscript, _N (bare) for subscript.
 * Call normaliseMath() first for broader LLM math patterns.
 */
function parseMathRuns(rawText: string): TextRun[] {
  const text = normaliseMath(rawText);
  const runs: TextRun[] = [];

  // Ordered: curly-brace forms first (greedy), then bare 1-6 char forms
  // ^{...} covers multi-char exponents; ^X covers single/short bare ones.
  // Added bare ^X up to 6 chars to catch things like ^{-x} that become ^-x after stripping
  const regex = /(\^{([^}]*)})|(_{([^}]*)})|(\^([-\w±./]{1,8}))|(_([-\w]{1,4}))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }

    if (match[1]) {
      // ^{...} → superscript
      runs.push(new TextRun({ text: match[2], superScript: true }));
    } else if (match[3]) {
      // _{...} → subscript
      runs.push(new TextRun({ text: match[4], subScript: true }));
    } else if (match[5]) {
      // ^X → superscript
      runs.push(new TextRun({ text: match[6], superScript: true }));
    } else if (match[7]) {
      // _X → subscript
      runs.push(new TextRun({ text: match[8], subScript: true }));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export async function downloadFinalAssessmentWord(
  assessment: FinalAssessment,
  options: PDFOptions = {}
) {
  const { includeAnswerKey = false, includeRubric = false } = options;
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: "Assessment",
      heading: HeadingLevel.HEADING_1,
    })
  );

  children.push(new Paragraph(""));

  const { groups, orderedTypes } = groupAndOrderItems(assessment.items);
  let wordQNum = 1;

  for (const type of orderedTypes) {
    // Section heading + instruction line (mirrors the PDF renderSectionHeader)
    children.push(
      new Paragraph({
        text: formatTypeLabel(type).toUpperCase(),
        heading: HeadingLevel.HEADING_2,
      })
    );
    const sectionInstruction = QUESTION_TYPE_INSTRUCTIONS[type];
    if (sectionInstruction) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: sectionInstruction, italics: true, color: "555555" }),
          ],
        })
      );
    }
    children.push(new Paragraph(""));

    for (const item of groups[type]) {
      // Build the question prompt with math-aware runs
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${wordQNum}. `, bold: true }),
            ...parseMathRuns(item.prompt ?? ""),
          ],
        })
      );

      if (item.questionType === "multipleChoice") {
        item.options?.forEach(opt => {
          children.push(new Paragraph({ children: parseMathRuns(opt) }));
        });
      } else {
        children.push(new Paragraph(" "));
        children.push(new Paragraph(" "));
        children.push(new Paragraph(" "));
      }

      children.push(new Paragraph(""));
      wordQNum++;
    }
  }

  if (includeAnswerKey) {
    children.push(new Paragraph({
      text: "ANSWER KEY",
      heading: HeadingLevel.HEADING_2,
    }));

    let akNum = 1;
    for (const type of orderedTypes) {
      for (const item of groups[type]) {
        const answerText = item.answer ?? "—";
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${akNum}. `, bold: true }),
            ...parseMathRuns(answerText),
          ],
        }));
        akNum++;
      }
    }

    children.push(new Paragraph(""));
  }

  if (includeRubric) {
    children.push(new Paragraph({
      text: "RUBRIC",
      heading: HeadingLevel.HEADING_2,
    }));

    const rubric = buildRubric(assessment);

    rubric.forEach(r => {
      children.push(new Paragraph(`Question ${r.questionNumber}`));
      r.criteria.forEach(c => {
        children.push(new Paragraph(`• ${c}`));
      });
      children.push(new Paragraph(""));
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `assessment_${assessment.id}.docx`);
}
function buildRubric(assessment: FinalAssessment) {
  return assessment.items
    .filter(item =>
      ["shortAnswer", "freeResponse", "essay"].includes(item.questionType)
    )
    .map(item => ({
      questionNumber: item.questionNumber,
      criteria: [
        "Accuracy of content",
        "Clarity of explanation",
        "Use of appropriate terminology",
        "Completeness of response"
      ]
    }));
}