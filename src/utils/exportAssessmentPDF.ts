/**
 * exportAssessmentPDF.ts
 *
 * Client-side PDF export for two document types produced by Teacher Studio:
 *   exportGeneratedTestPDF()  — assessment created via "Create" goal
 *   exportRewrittenItemsPDF() — rewritten items from the Rewrite tab
 *
 * Both share the same layout constants and helpers.
 */

import jsPDF from "jspdf";
import type { GeneratedTestData, GeneratedTestItem, RewrittenItem } from "../types/simulator";

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
