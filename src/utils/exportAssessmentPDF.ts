/**
 * exportAssessmentPDF.ts
 *
 * Client-side PDF export for document types produced by Teacher Studio:
 *   renderAssessmentToPdf()    — publisher-quality layout from AssessmentDocument model
 *   appendMetricGlossaryPage() — add a "What do these numbers mean?" page to an open jsPDF doc
 *   exportGeneratedTestPDF()   — assessment created via "Create" goal
 *   exportRewrittenItemsPDF()  — rewritten items from the Rewrite tab
 *
 * All exports share the same layout constants and helpers.
 */

import jsPDF from "jspdf";
import type { AssessmentDocument, GeneratedTestData, GeneratedTestItem, RewrittenItem } from "../types/simulator";
import { METRIC_DEFINITIONS } from "../lib/metricDefinitions";

// ── Layout constants ────────────────────────────────────────────────────────

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 6.5;
const FONT_BODY = 10.5;
const FONT_SMALL = 9;
const FONT_TITLE = 15;

// ── Export options ──────────────────────────────────────────────────────────

export interface AssessmentExportOptions {
	title?: string;
	includeAnswerKey?: boolean;
	includeMisconceptions?: boolean;
	includeSteps?: boolean;
}

// ── Publisher-quality assessment renderer ───────────────────────────────────

/**
 * Render an AssessmentDocument as a publisher-quality PDF using jsPDF.
 * Layout rules:
 *  - Title block: title, course, date, teacher name.
 *  - Optional directions block.
 *  - Items: numbered stem + lettered choices (A) B) C) D)) with hanging indent.
 *  - 0.5–0.75 line gap between stem and choices; 1.5 lines between items.
 *  - Keeps each item together (stem + choices) when possible.
 *  - Optional answer key page.
 *  - Optional "Changes Made" appendix for items with changes.
 */
export function renderAssessmentToPdf(
	assessment: AssessmentDocument,
	opts: AssessmentExportOptions = {},
): void {
	const { includeAnswerKey = false } = opts;
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	let y = MARGIN + 6;

	// ── Title block ──────────────────────────────────────────────────────────
	doc.setFont("helvetica", "bold");
	doc.setFontSize(FONT_TITLE);
	y = drawWrapped(doc, assessment.title, MARGIN, y, CONTENT_W);
	y += 2;

	if (assessment.course || assessment.date || assessment.teacherName) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(FONT_SMALL);
		doc.setTextColor(80, 80, 80);
		const meta: string[] = [];
		if (assessment.course) meta.push(`Course: ${assessment.course}`);
		if (assessment.date) meta.push(`Date: ${assessment.date}`);
		if (assessment.teacherName) meta.push(`Teacher: ${assessment.teacherName}`);
		doc.text(meta.join("   |   "), MARGIN, y);
		doc.setTextColor(0, 0, 0);
		y += LINE_H;
	}

	doc.setLineWidth(0.4);
	doc.line(MARGIN, y, PAGE_W - MARGIN, y);
	y += 6;

	// ── Directions block ─────────────────────────────────────────────────────
	if (assessment.directions) {
		doc.setFont("helvetica", "italic");
		doc.setFontSize(FONT_BODY);
		y = drawWrapped(doc, assessment.directions, MARGIN, y, CONTENT_W);
		y += 4;
	}

	// ── Items ────────────────────────────────────────────────────────────────
	for (const item of assessment.items) {
		const hasChoices = Array.isArray(item.choices) && item.choices.length > 0;
		const hasChanges = Array.isArray(item.changes) && item.changes.length > 0;

		// Estimate height needed to keep item together
		const stemLines = doc.splitTextToSize(item.stem, CONTENT_W - 7).length;
		const choiceLineCount = hasChoices
			? item.choices!.reduce((acc, c) => {
				return acc + doc.splitTextToSize(c, CONTENT_W - 14).length;
			}, 0)
			: 0;
		const needed = (stemLines + choiceLineCount) * LINE_H + 6;

		y = guardSpace(doc, y, Math.min(needed, PAGE_H - MARGIN * 2 - 10));

		// Number + change marker
		doc.setFont("helvetica", "bold");
		doc.setFontSize(FONT_BODY);
		const numLabel = hasChanges ? `${item.number}. [★]` : `${item.number}.`;
		doc.text(numLabel, MARGIN, y);

		// Stem
		doc.setFont("helvetica", "normal");
		y = drawWrapped(doc, item.stem, MARGIN + 8, y, CONTENT_W - 8);
		y += 3; // gap between stem and choices

		// Lettered choices with hanging indent
		if (hasChoices) {
			doc.setFontSize(FONT_BODY);
			for (let i = 0; i < item.choices!.length; i++) {
				y = guardSpace(doc, y, 7);
				const label = String.fromCharCode(65 + i); // A, B, C, D…
				const choiceText = `${label})  ${item.choices![i]}`;
				y = drawWrapped(doc, choiceText, MARGIN + 10, y, CONTENT_W - 10);
				y += 1.5;
			}
		}

		// Blank lines for short answer / FRQ
		if (!hasChoices) {
			for (let l = 0; l < 2; l++) {
				y = guardSpace(doc, y, 7);
				doc.setLineWidth(0.15);
				doc.line(MARGIN + 8, y, PAGE_W - MARGIN, y);
				y += 7;
			}
		}

		y += 4; // gap between items
	}

	// ── Answer key ───────────────────────────────────────────────────────────
	if (includeAnswerKey && assessment.answerKey && Object.keys(assessment.answerKey).length > 0) {
		doc.addPage();
		y = MARGIN + 6;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(FONT_TITLE);
		doc.text(`${assessment.title} — Answer Key`, MARGIN, y);
		doc.setLineWidth(0.4);
		doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
		y += 12;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(FONT_BODY);

		for (const [num, answer] of Object.entries(assessment.answerKey)) {
			y = guardSpace(doc, y, 7);
			doc.text(`${num}.  ${answer}`, MARGIN, y);
			y += LINE_H;
		}
	}

	// ── Changes Made appendix ─────────────────────────────────────────────────
	const itemsWithChanges = assessment.items.filter(
		(item) => Array.isArray(item.changes) && item.changes.length > 0,
	);
	if (itemsWithChanges.length > 0) {
		doc.addPage();
		y = MARGIN + 6;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(FONT_TITLE);
		doc.text("Changes Made", MARGIN, y);
		doc.setLineWidth(0.4);
		doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
		y += 12;

		for (const item of itemsWithChanges) {
			for (const change of item.changes!) {
				y = guardSpace(doc, y, 20);

				doc.setFont("helvetica", "bold");
				doc.setFontSize(FONT_BODY);
				doc.text(`Item ${item.number}:`, MARGIN, y);
				y += LINE_H;

				doc.setFont("helvetica", "normal");
				doc.setFontSize(FONT_SMALL);
				doc.setTextColor(80, 80, 80);
				y = drawWrapped(doc, `Original: ${change.original}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
				y += 1;
				doc.setTextColor(20, 80, 20);
				y = drawWrapped(doc, `Rewritten: ${change.rewritten}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
				doc.setTextColor(0, 0, 0);
				if (change.reason) {
					y += 1;
					doc.setFont("helvetica", "italic");
					y = drawWrapped(doc, `Reason: ${change.reason}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
					doc.setFont("helvetica", "normal");
				}
				if (change.profileHelped) {
					doc.setTextColor(30, 60, 140);
					y = drawWrapped(doc, `Profile helped: ${change.profileHelped}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
					doc.setTextColor(0, 0, 0);
				}
				if (change.misconceptionReduced) {
					doc.setTextColor(120, 50, 0);
					y = drawWrapped(doc, `Misconception reduced: ${change.misconceptionReduced}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
					doc.setTextColor(0, 0, 0);
				}
				doc.setFontSize(FONT_BODY);
				y += 4;
			}
		}
	}

	// ── Metric glossary appendix (always included) ──────────────────────────
	appendMetricGlossaryPage(doc);

	const filename = `${assessment.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
	doc.save(filename);
}

// ── Low-level helpers ───────────────────────────────────────────────────────

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
	const lines = doc.splitTextToSize(String(text), maxWidth);
	doc.text(lines as string[], x, y);
	return y + (lines as string[]).length * lineHeight;
}

function pageHeader(doc: jsPDF, title: string, y: number): number {
	doc.setFont("helvetica", "bold");
	doc.setFontSize(FONT_TITLE);
	doc.text(title, MARGIN, y);
	doc.setLineWidth(0.4);
	doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
	return y + 10;
}

// ── Metric glossary appendix ────────────────────────────────────────────────

/**
 * Append a "Metric Reference" page to an already-open jsPDF document.
 * Pass `keys` to include only a subset of metrics (e.g. those shown in the
 * simulator panel for this particular assessment).  Omit to include all.
 */
export function appendMetricGlossaryPage(doc: jsPDF, keys?: string[]): void {
	doc.addPage();
	let y = MARGIN + 6;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(FONT_TITLE);
	doc.text("Metric Reference — What do these numbers mean?", MARGIN, y);
	doc.setLineWidth(0.4);
	doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
	y += 12;

	const defs = keys
		? METRIC_DEFINITIONS.filter((m) => keys.includes(m.key))
		: METRIC_DEFINITIONS;

	for (const def of defs) {
		y = guardSpace(doc, y, 22);

		// Label + range
		doc.setFont("helvetica", "bold");
		doc.setFontSize(FONT_BODY);
		const rangeStr = def.unit ? `${def.range} ${def.unit}` : def.range;
		doc.text(`${def.label}  (${rangeStr})`, MARGIN, y);
		y += LINE_H;

		// Definition
		doc.setFont("helvetica", "normal");
		doc.setFontSize(FONT_SMALL);
		y = drawWrapped(doc, def.definition, MARGIN + 2, y, CONTENT_W - 2, LINE_H - 1);
		y += 1;

		// Computation (italic)
		doc.setFont("helvetica", "italic");
		doc.setTextColor(80, 80, 80);
		y = drawWrapped(doc, `How computed: ${def.computation}`, MARGIN + 2, y, CONTENT_W - 2, LINE_H - 1);
		doc.setTextColor(0, 0, 0);
		doc.setFont("helvetica", "normal");
		y += 1;

		// Interpretation (green tint)
		doc.setTextColor(20, 100, 40);
		y = drawWrapped(doc, `Interpretation: ${def.interpretation}`, MARGIN + 2, y, CONTENT_W - 2, LINE_H - 1);
		doc.setTextColor(0, 0, 0);
		doc.setFontSize(FONT_BODY);
		y += 4;
	}
}

// ── Generated test export ───────────────────────────────────────────────────

function renderGeneratedItem(
	doc: jsPDF,
	item: GeneratedTestItem,
	num: number,
	y: number,
	includeAnswer: boolean,
): number {
	y = guardSpace(doc, y, 14);

	// Question stem
	doc.setFont("helvetica", "bold");
	doc.setFontSize(FONT_BODY);
	doc.text(`${num}.`, MARGIN, y);
	doc.setFont("helvetica", "normal");
	y = drawWrapped(doc, item.stem, MARGIN + 7, y, CONTENT_W - 7);
	y += 2;

	// MC options
	if (item.type === "MC" && Array.isArray(item.options)) {
		doc.setFontSize(FONT_BODY);
		for (let i = 0; i < item.options.length; i++) {
			y = guardSpace(doc, y, 7);
			const label = String.fromCharCode(65 + i); // A, B, C, D…
			y = drawWrapped(doc, `${label}. ${item.options[i]}`, MARGIN + 10, y, CONTENT_W - 10);
			y += 0.5;
		}
		y += 2;
	}

	// Short answer / FRQ blank
	if (item.type === "SA" || item.type === "FRQ") {
		const lines = item.type === "FRQ" ? 4 : 2;
		for (let i = 0; i < lines; i++) {
			y = guardSpace(doc, y, 7);
			doc.setLineWidth(0.2);
			doc.line(MARGIN + 7, y, PAGE_W - MARGIN, y);
			y += 7;
		}
		y += 2;
	}

	// Answer key line (teacher copy only)
	if (includeAnswer && item.answer) {
		y = guardSpace(doc, y, 7);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(FONT_SMALL);
		doc.setTextColor(20, 100, 20);
		y = drawWrapped(doc, `Answer: ${item.answer}`, MARGIN + 7, y, CONTENT_W - 7, LINE_H);
		doc.setTextColor(0);
		doc.setFont("helvetica", "normal");
		y += 3;
	}

	return y;
}

/**
 * Export a generated assessment as a teacher-ready PDF.
 * Triggers a browser download automatically.
 */
export function exportGeneratedTestPDF(
	data: GeneratedTestData,
	opts: AssessmentExportOptions = {},
): void {
	const {
		title = "Generated Assessment",
		includeAnswerKey = false,
	} = opts;

	const doc = new jsPDF({ unit: "mm", format: "a4" });
	let y = MARGIN + 6;

	y = pageHeader(doc, title, y);

	// Student assessment
	data.test.forEach((item, idx) => {
		y = renderGeneratedItem(doc, item, idx + 1, y, false);
	});

	// Answer key section (same page or new page)
	if (includeAnswerKey) {
		doc.addPage();
		y = MARGIN + 6;
		y = pageHeader(doc, `${title} — Answer Key`, y);
		data.test.forEach((item, idx) => {
			y = renderGeneratedItem(doc, item, idx + 1, y, true);
		});
	}

	const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
	doc.save(filename);
}

// ── Rewritten items export ──────────────────────────────────────────────────

function renderRewrittenItem(
	doc: jsPDF,
	item: RewrittenItem,
	y: number,
	includeNotes: boolean,
): number {
	y = guardSpace(doc, y, 14);

	// Item header
	doc.setFont("helvetica", "bold");
	doc.setFontSize(FONT_BODY);
	doc.text(`Item ${item.originalItemNumber}`, MARGIN, y);
	y += LINE_H;

	// Rewritten stem
	doc.setFont("helvetica", "normal");
	y = drawWrapped(doc, item.rewrittenStem, MARGIN + 4, y, CONTENT_W - 4);
	y += 2;

	// Parts
	if (Array.isArray(item.rewrittenParts) && item.rewrittenParts.length > 0) {
		for (let i = 0; i < item.rewrittenParts.length; i++) {
			y = guardSpace(doc, y, 7);
			const label = String.fromCharCode(97 + i); // a, b, c…
			y = drawWrapped(doc, `${label}) ${item.rewrittenParts[i]}`, MARGIN + 8, y, CONTENT_W - 8);
			y += 1;
		}
		y += 2;
	}

	// Improvement notes
	if (includeNotes && item.notes) {
		y = guardSpace(doc, y, 7);
		doc.setFontSize(FONT_SMALL);
		doc.setFont("helvetica", "italic");
		doc.setTextColor(80, 60, 40);
		y = drawWrapped(doc, `Note: ${item.notes}`, MARGIN + 4, y, CONTENT_W - 4, LINE_H - 1);
		doc.setTextColor(0);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(FONT_BODY);
		y += 3;
	}

	return y;
}

/**
 * Export rewritten assessment items as a teacher review PDF.
 * Triggers a browser download automatically.
 */
export function exportRewrittenItemsPDF(
	items: RewrittenItem[],
	opts: AssessmentExportOptions = {},
): void {
	const {
		title = "Rewritten Assessment",
		includeMisconceptions = true,
	} = opts;

	const doc = new jsPDF({ unit: "mm", format: "a4" });
	let y = MARGIN + 6;

	y = pageHeader(doc, title, y);

	// Subheading
	doc.setFont("helvetica", "normal");
	doc.setFontSize(FONT_SMALL);
	doc.setTextColor(100);
	doc.text(`${items.length} item${items.length === 1 ? "" : "s"} — teacher review copy`, MARGIN, y);
	doc.setTextColor(0);
	y += 8;

	for (const item of items) {
		y = renderRewrittenItem(doc, item, y, !!includeMisconceptions);
	}

	const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
	doc.save(filename);
}
