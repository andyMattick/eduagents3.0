/**
 * src/components_new/v4/TeacherStudio.tsx
 *
 * Modern teacher onboarding — replaces the raw upload screen on the root route.
 *
 * Three goals, each adapts the upload and results experience:
 *
 *   ◎  Simulate Student Experience  → single doc → narrative + analytics
 *   ⌖  Check Student Preparedness   → prep docs + assessment → alignment analysis
 *
 * Flow:  goal → upload → results
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { useAuth } from "../Auth/useAuth";
import { createStudioSessionFromFileApi, createStudioSessionFromFilesApi } from "../../lib/teacherStudioApi";
import type { DocumentStatus } from "../../lib/documentStatusApi";
import { getDocumentStatus } from "../../lib/documentStatusApi";
import {
	isActionableRewriteSuggestion,
} from "../../lib/rewriteSuggestionFilters";
import {
	reportBadRewriteApi,
	runGenerateTestApi,
	runRewriteApi,
	runSingleSimulatorApi,
} from "../../lib/simulatorApi";
import type {
	AssessmentDocument,
	PrepDocument,
} from "../../prism-v4/schema/domain/Preparedness";
import type {
	GeneratedTestData,
	GeneratedTestItem,
	RewriteSuggestions,
	SimulatorData,
	SimulatorTestPreferences,
	StudentProfile,
} from "../../types/simulator";
import type { RewriteRequest, RewriteResponse, RewriteSuggestion } from "../../types/rewrite";
import { DEFAULT_STUDENT_PROFILE } from "../../types/simulator";
import { extractDocxParagraphs } from "../../utils/docxExtraction";
import {
	containsExtractionArtifacts,
	isMostlyPrintable,
	looksLikeBinaryPayload,
	normalizeParagraphs,
} from "../../utils/ingestionTextGuards";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { GeneratedViewer } from "./GeneratedViewer";
import { ModeSelectModal } from "./ModeSelectModal";
import { PreparednessBlueprint } from "./PreparednessBlueprint";
import { RewriteDiffViewer } from "./RewriteDiffViewer";
import { RewriteViewer } from "./RewriteViewer";
import { buildPreparednessAssessmentItems } from "./preparednessAssessmentParser.ts";
import { UploadPanelV4 } from "./UploadPanelV4";
import { getPreparednessUploadError } from "./preparednessUploadRules.ts";
import "./v4.css";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Goal = "simulate" | "preparedness";
type Phase = "goal" | "upload" | "results";
type ResultTab = "narrative" | "suggestions" | "json" | "rewrite";
type GenerationMode = "aligned_test" | "aligned_review" | "alternate_test";
type DifficultyTuning = "easier" | "same" | "harder";
type ReadingLoadTuning = "less" | "same" | "more";
type LengthTuning = "fewer" | "standard" | "more";
type ItemAction =
	| "rewrite"
	| "easier"
	| "harder"
	| "context"
	| "type"
	| "subparts";

interface StudioState {
	goal: Goal | null;
	phase: Phase;
	primaryFile: File | null;
	secondaryFile: File | null;   // prep material (preparedness)
	preparednessPrep: PrepDocument | null;
	preparednessAssessment: AssessmentDocument | null;
	sessionId: string | null;
	documentId: string | null;
	documentDocType: DocumentStatus["docType"];
	originalText: string | null;
	profile: StudentProfile;
	selectedPreset: string;
	// assessment generation
	testData: GeneratedTestData | null;
	testPrefs: SimulatorTestPreferences;
	narrative: string | null;
	simData: SimulatorData | null;
	rewriteResults: RewriteResponse | null;
	rewriteLoading: boolean;
	// interactive rewrite panel state
	selectedSuggestions: Record<string, boolean>;  // key="test:idx" or "item:N:idx"
	teacherNotes: string;
	differentiationProfile: string;
	teacherProfileLabel: string;
	generationMode: GenerationMode | null;
	difficultyTuning: DifficultyTuning;
	readingLoadTuning: ReadingLoadTuning;
	lengthTuning: LengthTuning;
	// rewrite diff viewer modal
	rewritePreview: RewritePreview | null;
	// daily usage
	usageCount: number;
	usageLimit: number;
	primaryDragging: boolean;
	secondaryDragging: boolean;
	isLoading: boolean;
	error: string | null;
	activeTab: ResultTab;
	reportSubmitting: boolean;
	reportError: string | null;
	reportSuccess: string | null;
}

interface RewritePreview {
	original: string;
	rewritten: string;
	appliedSuggestions: string[];
	profileApplied: string | null;
	metadata?: Record<string, unknown>;
	type: "item" | "section";
	id: string;
}

function pickRewritePreview(
	result: RewriteResponse,
	original: string,
	appliedSuggestions: string[],
	defaultProfile: string,
): RewritePreview | null {
	if (typeof result.rewritten === "string" && result.rewritten.trim().length > 0) {
		return {
			original,
			rewritten: result.rewritten,
			appliedSuggestions,
			profileApplied: defaultProfile || null,
			type: "item",
			id: "1",
		}
	}

	return null;
}

const INITIAL: StudioState = {
	goal: null,
	phase: "goal",
	primaryFile: null,
	secondaryFile: null,
	preparednessPrep: null,
	preparednessAssessment: null,
	sessionId: null,
	documentId: null,
	documentDocType: null,
	originalText: null,
	profile: DEFAULT_STUDENT_PROFILE,
	selectedPreset: "Average Student",
	testData: null,
	testPrefs: { mcCount: 10, saCount: 3, frqCount: 1 },
	narrative: null,
	simData: null,
	rewriteResults: null,
	rewriteLoading: false,
	selectedSuggestions: {},
	teacherNotes: "",
	differentiationProfile: "",
	teacherProfileLabel: "On-Level",
	generationMode: null,
	difficultyTuning: "same",
	readingLoadTuning: "same",
	lengthTuning: "standard",
	rewritePreview: null,
	usageCount: 0,
	usageLimit: 25_000,
	primaryDragging: false,
	secondaryDragging: false,
	isLoading: false,
	error: null,
	activeTab: "narrative",
	reportSubmitting: false,
	reportError: null,
	reportSuccess: null,
};

function canRewriteFromDocType(docType: DocumentStatus["docType"]): boolean {
	return docType === "assignment" || docType === "assessment" || docType === "mixed";
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsText(file, "utf-8");
	});
}

function isValidExtractedText(text: string): boolean {
	if (!text) {
		return false;
	}
	if (looksLikeBinaryPayload(text) || containsExtractionArtifacts(text)) {
		return false;
	}
	if (!isMostlyPrintable(text)) {
		return false;
	}
	return true;
}

async function extractDocxParagraphsFromXml(buffer: ArrayBuffer): Promise<string[]> {
	const paragraphs = await extractDocxParagraphs(buffer);
	return normalizeParagraphs(paragraphs);
}

async function extractTextFromPreparednessFile(file: File): Promise<string> {
	const lower = file.name.toLowerCase();
	const isDocx =
		lower.endsWith(".docx") ||
		file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";

	if (isDocx) {
		const buffer = await file.arrayBuffer();

		let mammothText = "";

		try {
			const mammoth = await import("mammoth");
			const result = await (mammoth.extractRawText as unknown as (
				input: { arrayBuffer: ArrayBuffer },
				options?: { includeDefaultStyleMap?: boolean; preserveLineBreaks?: boolean }
			) => Promise<{ value?: string }>)({
				arrayBuffer: buffer,
			}, {
				includeDefaultStyleMap: false,
				preserveLineBreaks: true,
			});

			mammothText = normalizeParagraphs((result.value ?? "").replace(/\r\n/g, "\n").split(/\n+/)).join("\n\n").trim();
		} catch {
			// Fall through to XML extraction.
		}

		if (isValidExtractedText(mammothText)) {
			return mammothText;
		}

		try {
			const xmlText = (await extractDocxParagraphsFromXml(buffer)).join("\n\n").trim();
			if (isValidExtractedText(xmlText)) {
				return xmlText;
			}
		} catch {
			// Handled below.
		}

		throw new Error(`Could not extract readable text from ${file.name}. Please upload a clean DOCX/PDF/TXT file.`);
	}

	if (isPdf) {
		const buffer = await file.arrayBuffer();
		const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
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

		const pdfText = normalizeParagraphs(pages).join("\n\n").trim();
		if (!isValidExtractedText(pdfText)) {
			throw new Error(`Could not extract readable text from ${file.name}. Please upload a clean DOCX/PDF/TXT file.`);
		}

		return pdfText;
	}

	if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
		const plainText = normalizeParagraphs((await file.text()).split(/\n+/)).join("\n\n").trim();
		if (!isValidExtractedText(plainText)) {
			throw new Error(`Could not extract readable text from ${file.name}. Please upload a clean DOCX/PDF/TXT file.`);
		}

		return plainText;
	}

	const decoded = new TextDecoder("utf-8", { fatal: false }).decode(await file.arrayBuffer()).trim();
	if (looksLikeBinaryPayload(decoded) || containsExtractionArtifacts(decoded)) {
		throw new Error(`Could not extract readable text from ${file.name}. Please upload a clean DOCX/PDF/TXT file.`);
	}

	const cleaned = normalizeParagraphs(decoded.split(/\n+/)).join("\n\n");
	if (!isValidExtractedText(cleaned)) {
		throw new Error(`Could not extract readable text from ${file.name}. Please upload a clean DOCX/PDF/TXT file.`);
	}

	return cleaned;
}

async function buildRewriteOriginalText(
	file: File | null,
	originalText: string | null,
	fallback: string | null,
): Promise<string> {
	if (originalText && originalText.trim().length > 0) {
		return originalText.trim();
	}

	if (file) {
		try {
			const text = await readFileAsText(file);
			if (text.trim().length > 0) {
				return text.trim();
			}
		} catch {
			// Ignore unreadable files and rely on the fallback below.
		}
	}

	return (fallback ?? "").trim();
}

async function startSession(prepFile: File, testFile: File, userId?: string) {
	const { sessionId, documentId, originalText } = await createStudioSessionFromFileApi(testFile, userId);

	const prepText = (await extractTextFromPreparednessFile(prepFile)).trim();
	const assessmentText = (await extractTextFromPreparednessFile(testFile)).trim() || originalText;
	const items = buildPreparednessAssessmentItems(assessmentText);

	if (!prepText) {
		throw new Error("Could not extract prep text from the uploaded prep document.");
	}

	if (items.length === 0 || items.length > 50) {
		throw new Error("Could not parse a valid numbered assessment from the uploaded assessment document. Use a clean DOCX/PDF with one numbered question list.");
	}

	return {
		sessionId,
		documentId,
		originalText,
		preparednessPrep: {
			title: prepFile.name || "Prep Document",
			rawText: prepText,
		} satisfies PrepDocument,
		preparednessAssessment: {
			title: testFile.name || "Assessment",
			items,
		} satisfies AssessmentDocument,
	};
}

const ACCEPTED_DOCS = ".pdf,.doc,.docx,.ppt,.pptx";
const ACCEPTED_TEXT = ".txt,.doc,.docx,.rtf";
const DROP_DOCS_RE = /\.(pdf|doc|docx|ppt|pptx)$/i;
const DROP_TEXT_RE = /\.(txt|doc|docx|rtf)$/i;

const TEACHER_PROFILE_OPTIONS = ["On-Level", "ELL", "Low Reading", "Gifted"] as const;

function modeLabel(mode: GenerationMode | null): string {
	if (mode === "aligned_test") return "Aligned Test";
	if (mode === "aligned_review") return "Aligned Review";
	if (mode === "alternate_test") return "Alternate Test Version";
	return "Generated Document";
}

function buildPreparednessSupplementText(params: {
	mode: GenerationMode;
	profile: string;
	difficulty: DifficultyTuning;
	readingLoad: ReadingLoadTuning;
	length: LengthTuning;
}): string {
	const modeInstruction =
		params.mode === "aligned_test"
			? "Build an aligned classroom test from the current preparedness blueprint."
			: params.mode === "aligned_review"
			? "Build an aligned review packet from the uploaded assessment context."
			: "Build an alternate or differentiated version of the assessment while preserving covered concepts.";

	return [
		modeInstruction,
		`Teacher profile: ${params.profile}`,
		`Difficulty target: ${params.difficulty}`,
		`Reading load target: ${params.readingLoad}`,
		`Length target: ${params.length}`,
	].join("\n");
}

function itemActionLabel(action: ItemAction): string {
	if (action === "rewrite") return "Rewrite";
	if (action === "easier") return "Make Easier";
	if (action === "harder") return "Make Harder";
	if (action === "context") return "Change Context";
	if (action === "type") return "Change Item Type";
	if (action === "subparts") return "Add/Remove Subparts";
	const neverAction: never = action;
	return neverAction;
}

// ---------------------------------------------------------------------------
// Goal card data
// ---------------------------------------------------------------------------

const GOALS: Array<{
	id: Goal;
	symbol: string;
	title: string;
	description: string;
	uploadsLabel: string;
}> = [
	{
		id: "simulate",
		symbol: "◎",
		title: "Simulate Student Experience",
		description:
			"See exactly how a student will encounter your document — cognitive load per question, fatigue buildup, confusion hotspots, and total estimated time.",
		uploadsLabel: "1 document (PDF, Word, or PowerPoint)",
	},
	{
		id: "preparedness",
		symbol: "⌖",
		title: "Check Student Preparedness",
		description:
			"Find out how well your prep or study material aligns with an assessment. Get item-by-item alignment scores and gap analysis before test day.",
		uploadsLabel: "Prep material + the assessment",
	},
];

// ---------------------------------------------------------------------------
// Analytics display helpers
// ---------------------------------------------------------------------------

function StatBar({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
	const pct = Math.round(value * 100);
	const color =
		warn && value > 0.7
			? "#dc2626"
			: value > 0.6
			? "#d97706"
			: "#9c4d2b";
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
			<span style={{ minWidth: "130px", color: "#6b5040" }}>{label}</span>
			<div style={{ flex: 1, background: "rgba(86,57,32,0.12)", borderRadius: "4px", height: "8px" }}>
				<div
					style={{
						width: `${pct}%`,
						background: color,
						borderRadius: "4px",
						height: "8px",
						transition: "width 0.4s ease",
					}}
				/>
			</div>
			<span style={{ minWidth: "32px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
		</div>
	);
}

function OverallStats({ data }: { data: SimulatorData }) {
	const { overall } = data;
	const mins = Math.round(overall.estimatedCompletionTimeSeconds / 60);
	const stats: Array<{ value: string | number; label: string }> = [
		{ value: overall.totalItems, label: "Items" },
		{ value: `${mins}m`, label: "Est. time" },
	];
	return (
		<div style={{ marginTop: "1.5rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Overall Assessment</p>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
					gap: "0.75rem",
					marginBottom: "1rem",
				}}
			>
				{stats.map((s) => (
					<div
						key={s.label}
						style={{
							padding: "0.75rem 1rem",
							background: "rgba(255,251,245,0.9)",
							border: "1px solid rgba(86,57,32,0.14)",
							borderRadius: "16px",
							textAlign: "center",
						}}
					>
						<div
							style={{
								fontSize: "1.6rem",
								fontWeight: 700,
								lineHeight: 1,
								fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
							}}
						>
							{s.value}
						</div>
						<div className="v4-stat-label" style={{ marginTop: "0.25rem" }}>{s.label}</div>
					</div>
				))}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				<StatBar value={overall.fatigueRisk} label="Fatigue risk" warn />
				<StatBar value={overall.pacingRisk} label="Pacing risk" warn />
			</div>
			{overall.majorRedFlags.length > 0 && (
				<div
					style={{
						marginTop: "0.75rem",
						padding: "0.75rem 1rem",
						background: "rgba(220,38,38,0.05)",
						border: "1px solid rgba(220,38,38,0.18)",
						borderRadius: "12px",
					}}
				>
					<p className="v4-stat-label" style={{ color: "#dc2626", marginBottom: "0.35rem" }}>
						Red flags
					</p>
					<ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#b91c1c" }}>
						{overall.majorRedFlags.map((f, i) => (
							<li key={i}>{f}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function ItemTable({ data }: { data: SimulatorData }) {
	if (data.items.length === 0) return null;
	return (
		<div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Item-by-Item Analysis</p>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
				<thead>
					<tr style={{ borderBottom: "2px solid rgba(86,57,32,0.16)" }}>
						{["#", "Words", "Cog. Load", "Confusion", "Time (s)"].map((h) => (
								<th
									key={h}
									style={{
										textAlign: "left",
										padding: "0.35rem 0.5rem",
										color: "#6b5040",
										fontWeight: 600,
									}}
								>
									{h}
								</th>
							),
						)}
					</tr>
				</thead>
				<tbody>
					{data.items.map((item) => {
						const hiCog = item.cognitiveLoad > 0.7;
						const hiConf = item.confusionRisk > 0.7;
						return (
							<tr
								key={item.itemNumber}
								style={{
									borderBottom: "1px solid rgba(86,57,32,0.1)",
									background: hiCog || hiConf ? "rgba(251,191,36,0.08)" : undefined,
								}}
							>
								<td style={{ padding: "0.35rem 0.5rem", fontWeight: 600 }}>{item.itemNumber}</td>
								<td style={{ padding: "0.35rem 0.5rem" }}>{item.wordCount}</td>
								<td style={{ padding: "0.35rem 0.5rem", color: hiCog ? "#dc2626" : undefined }}>
									{Math.round(item.cognitiveLoad * 100)}%
								</td>
								<td style={{ padding: "0.35rem 0.5rem", color: hiConf ? "#dc2626" : undefined }}>
									{Math.round(item.confusionRisk * 100)}%
								</td>
								<td style={{ padding: "0.35rem 0.5rem" }}>{item.timeToProcessSeconds}s</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// RewriteSuggestionsPanel sub-component
// ---------------------------------------------------------------------------

function RewriteSuggestionsPanel({
	suggestions,
	itemRedFlags,
	selectedSuggestions,
	teacherNotes,
	onToggle,
	onTeacherNotesChange,
	onRewrite,
	rewriteLoading,
	rewriteDisabledReason,
}: {
	suggestions?: RewriteSuggestions;
	itemRedFlags?: Record<string, string[]>;
	selectedSuggestions: Record<string, boolean>;
	teacherNotes: string;
	onToggle: (key: string) => void;
	onTeacherNotesChange: (val: string) => void;
	onRewrite?: () => void;
	rewriteLoading?: boolean;
	rewriteDisabledReason?: string | null;
}) {
	if (!suggestions) return null;

	const sel = selectedSuggestions ?? {};
	const notes = teacherNotes ?? "";
	const testSuggestions = suggestions.testLevel
		.map((text, index) => ({ text, index }));
	const itemSuggestions = Object.fromEntries(
		Object.entries(suggestions.itemLevel).map(([itemNum, entries]) => [
			itemNum,
			entries
				.map((text, index) => ({ text, index })),
		]),
	) as Record<string, Array<{ text: string; index: number }>>;
	const itemKeys = Object.keys(itemSuggestions)
		.filter((itemNum) => itemSuggestions[itemNum].length > 0)
		.sort((a, b) => Number(a) - Number(b));

	// Count how many are checked
	const checkedCount =
		testSuggestions.filter((entry) => Boolean(sel[`test:${entry.index}`])).length +
		itemKeys.reduce((count, itemNum) => {
			return (
				count +
				itemSuggestions[itemNum].filter((entry) => Boolean(sel[`item:${itemNum}:${entry.index}`])).length
			);
		}, 0);
	const teacherNotesLines =
		notes
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	const hasTeacherInput = teacherNotesLines.length > 0;
	const canRewrite = (checkedCount > 0 || hasTeacherInput) && !rewriteDisabledReason;

	return (
		<div style={{ marginTop: "1.25rem" }}>
			{rewriteDisabledReason && (
				<div
					style={{
						background: "rgba(251,191,36,0.12)",
						border: "1px solid rgba(180,83,9,0.3)",
						color: "#7c2d12",
						borderRadius: "12px",
						padding: "0.8rem 0.95rem",
						marginBottom: "0.85rem",
						fontSize: "0.82rem",
					}}
				>
					{rewriteDisabledReason}
				</div>
			)}
			<p style={{ fontSize: "0.85rem", color: "#6b5040", marginBottom: "1rem" }}>
				Select the suggestions you want to apply, then click Rewrite. You can also add your own.
			</p>

			{testSuggestions.length > 0 && (
				<div
					style={{
						background: "rgba(187,91,53,0.05)",
						border: "1px solid rgba(187,91,53,0.18)",
						borderRadius: "14px",
						padding: "1.15rem 1.35rem",
						marginBottom: "1.25rem",
					}}
				>
					<p
						style={{
							margin: "0 0 0.6rem",
							textTransform: "uppercase",
							letterSpacing: "0.14em",
							fontSize: "0.74rem",
							color: "#9c4d2b",
							fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
						}}
					>
						Test-Level Suggestions
					</p>
					{testSuggestions.map(({ text, index }) => {
						const key = `test:${index}`;
						const actionable = isActionableRewriteSuggestion(text);
						return (
							<label key={key} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
								<input
									type="checkbox"
									checked={!!sel[key]}
									onChange={() => onToggle(key)}
									style={{ marginTop: "0.2rem", accentColor: "#9c4d2b" }}
								/>
								<span>
									{text}
									{!actionable && (
										<span style={{ marginLeft: "0.5rem", fontSize: "0.74rem", color: "#b45309" }}>(may be non-actionable)</span>
									)}
								</span>
							</label>
						);
					})}
				</div>
			)}

			{itemKeys.length > 0 && (
				<div>
					<p
						style={{
							margin: "0 0 0.75rem",
							textTransform: "uppercase",
							letterSpacing: "0.14em",
							fontSize: "0.74rem",
							color: "#9c4d2b",
							fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
						}}
					>
						Item-Level Suggestions
					</p>
					{itemKeys.map((itemNum) => (
						<div
							key={itemNum}
							style={{
								background: "rgba(255,251,245,0.7)",
								border: "1px solid rgba(86,57,32,0.12)",
								borderRadius: "12px",
								padding: "0.85rem 1.15rem",
								marginBottom: "0.75rem",
							}}
						>
							<p
								style={{
									margin: "0 0 0.35rem",
									fontWeight: 700,
									fontSize: "0.82rem",
									color: "#563920",
								}}
							>
								Item {itemNum}
							</p>
							{(itemRedFlags?.[itemNum]?.length ?? 0) > 0 && (
								<div style={{ marginBottom: "0.45rem", padding: "0.5rem 0.6rem", background: "rgba(251,191,36,0.14)", borderRadius: "8px" }}>
									<p style={{ margin: "0 0 0.3rem", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#92400e" }}>
										Red Flags
									</p>
									<ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.8rem", color: "#7c2d12" }}>
										{itemRedFlags?.[itemNum]?.map((flag, idx) => (
											<li key={`${itemNum}-flag-${idx}`}>{flag}</li>
										))}
									</ul>
								</div>
							)}
							{itemSuggestions[itemNum].map(({ text, index }) => {
								const key = `item:${itemNum}:${index}`;
								const actionable = isActionableRewriteSuggestion(text);
								return (
									<label key={key} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.3rem", cursor: "pointer", fontSize: "0.83rem" }}>
										<input
											type="checkbox"
											checked={!!sel[key]}
											onChange={() => onToggle(key)}
											style={{ marginTop: "0.2rem", accentColor: "#9c4d2b" }}
										/>
										<span>
											{text}
											{!actionable && (
												<span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", color: "#b45309" }}>(may be non-actionable)</span>
											)}
										</span>
									</label>
								);
							})}
						</div>
					))}
				</div>
			)}

			{/* Teacher's own suggestions */}
			<div style={{ marginTop: "1.25rem" }}>
				<p
					style={{
						margin: "0 0 0.5rem",
						textTransform: "uppercase",
						letterSpacing: "0.14em",
						fontSize: "0.74rem",
						color: "#9c4d2b",
						fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
					}}
				>
					Your Own Suggestions
				</p>
				<textarea
					value={notes}
					onChange={(e) => onTeacherNotesChange(e.target.value)}
					placeholder="Add your own rewrite suggestions here (one per line)…"
					rows={3}
					style={{
						width: "100%",
						padding: "0.75rem",
						borderRadius: "10px",
						border: "1px solid rgba(86,57,32,0.2)",
						background: "rgba(255,251,245,0.7)",
						fontFamily: "inherit",
						fontSize: "0.85rem",
						resize: "vertical",
						color: "#1f1a17",
					}}
				/>
				{notes.trim().length > 0 && teacherNotesLines.length === 0 && (
					<p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#b45309" }}>
						Add one suggestion per line.
					</p>
				)}
			</div>

			{/* Rewrite CTA */}
			{onRewrite && (
				<button
					type="button"
					className="v4-button"
					onClick={onRewrite}
					disabled={rewriteLoading || !canRewrite}
					style={{ marginTop: "1.5rem" }}
				>
					{rewriteLoading
						? "Rewriting\u2026"
						: rewriteDisabledReason
						? "Rewrite unavailable"
						: `Rewrite Assessment (${checkedCount} suggestion${checkedCount !== 1 ? "s" : ""}${hasTeacherInput ? " + your notes" : ""})`}
				</button>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// GoalCard
// ---------------------------------------------------------------------------

function GoalCard({
	goal,
	selected,
	onClick,
}: {
	goal: (typeof GOALS)[number];
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				all: "unset",
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
				padding: "1.5rem",
				background: selected
					? "linear-gradient(145deg, rgba(187,91,53,0.1), rgba(135,65,34,0.06))"
					: "rgba(255,251,245,0.9)",
				border: selected
					? "2px solid rgba(187,91,53,0.65)"
					: "1px solid rgba(86,57,32,0.16)",
				borderRadius: "20px",
				cursor: "pointer",
				transition: "box-shadow 0.15s, border-color 0.15s",
				boxShadow: selected
					? "0 6px 28px rgba(187,91,53,0.15)"
					: "0 2px 10px rgba(65,44,23,0.05)",
				width: "100%",
				textAlign: "left",
			}}
		>
			<span
				style={{
					fontSize: "2rem",
					lineHeight: 1,
					color: selected ? "#bb5b35" : "#9c4d2b",
				}}
			>
				{goal.symbol}
			</span>
			<span
				style={{
					fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
					fontSize: "1.1rem",
					fontWeight: 700,
					lineHeight: 1.25,
					color: "#1f1a17",
				}}
			>
				{goal.title}
			</span>
			<span
				style={{
					fontSize: "0.875rem",
					lineHeight: 1.6,
					color: "#433228",
				}}
			>
				{goal.description}
			</span>
			<span
				style={{
					marginTop: "auto",
					paddingTop: "0.5rem",
					fontSize: "0.72rem",
					color: "#9c4d2b",
					fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
					textTransform: "uppercase",
					letterSpacing: "0.1em",
					borderTop: "1px solid rgba(86,57,32,0.1)",
				}}
			>
				Needs: {goal.uploadsLabel}
			</span>
		</button>
	);
}

// ---------------------------------------------------------------------------
// TeacherStudio — main component
// ---------------------------------------------------------------------------

export function TeacherStudio() {
	const { user } = useAuth();
	const [state, setState] = useState<StudioState>(INITIAL);
	const [modeSelectOpen, setModeSelectOpen] = useState(false);
	const [pendingMode, setPendingMode] = useState<GenerationMode>("aligned_test");
	const rewriteInFlightRef = useRef(false);
	const primaryRef = useRef<HTMLInputElement>(null);
	const secondaryRef = useRef<HTMLInputElement>(null);

	const refreshUsage = useCallback(async () => {
		try {
			const response = await fetch("/api/v4/usage/today", {
				headers: user?.id ? { "x-user-id": user.id } : undefined,
			});
			const payload = (await response.json()) as { count?: number; limit?: number };
			const usageCount = payload.count;
			if (typeof usageCount === "number") {
				setState((prev) => ({
					...prev,
					usageCount,
					usageLimit: payload.limit ?? 25_000,
				}));
			}
		} catch {
			// non-fatal
		}
	}, [user?.id]);

	// Fetch daily usage on mount
	useEffect(() => {
		void refreshUsage();
	}, [refreshUsage]);

	useEffect(() => {
		if (!state.documentId) return;
		let isMounted = true;
		void getDocumentStatus(state.documentId)
			.then((status) => {
				if (!isMounted) return;
				setState((prev) => ({ ...prev, documentDocType: status.docType }));
			})
			.catch(() => {
				if (!isMounted) return;
				setState((prev) => ({ ...prev, documentDocType: null }));
			});
		return () => {
			isMounted = false;
		};
	}, [state.documentId]);

	const goalData = GOALS.find((g) => g.id === state.goal);

	// ── Navigation ─────────────────────────────────────────────────────────

	function selectGoal(goal: Goal) {
		setState((prev) => ({ ...prev, goal, phase: "upload", error: null }));
	}

	function goBackToGoals() {
		setState((prev) => ({
			...INITIAL,
			goal: prev.goal,
			usageCount: prev.usageCount,
			usageLimit: prev.usageLimit,
		}));
	}

	function startOver() {
		setState((prev) => ({
			...INITIAL,
			usageCount: prev.usageCount,
			usageLimit: prev.usageLimit,
		}));
		setModeSelectOpen(false);
	}

	// ── Drag & drop ────────────────────────────────────────────────────────

	function handlePrimaryDragOver(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setState((prev) => ({ ...prev, primaryDragging: true }));
	}
	function handlePrimaryDragLeave() {
		setState((prev) => ({ ...prev, primaryDragging: false }));
	}
	function handlePrimaryDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		const files = Array.from(e.dataTransfer.files).filter((f) => DROP_DOCS_RE.test(f.name));
		const nextFile = files[0] ?? null;
		setState((prev) => ({
			...prev,
			primaryDragging: false,
			primaryFile: nextFile ?? prev.primaryFile,
			error:
				files.length === 0
					? "Only PDF, Word, or PowerPoint files accepted."
					: files.length > 1
					? "This flow accepts exactly one file. Only the first file was kept."
					: null,
		}));
	}

	function handleSecondaryDragOver(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setState((prev) => ({ ...prev, secondaryDragging: true }));
	}
	function handleSecondaryDragLeave() {
		setState((prev) => ({ ...prev, secondaryDragging: false }));
	}
	function handleSecondaryDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		const files = Array.from(e.dataTransfer.files).filter((f) => DROP_TEXT_RE.test(f.name));
		const nextFile = files[0] ?? null;
		setState((prev) => ({
			...prev,
			secondaryDragging: false,
			secondaryFile: nextFile ?? prev.secondaryFile,
			error:
				files.length === 0
					? "Only .txt, .doc, .docx, or .rtf files accepted for prep material."
					: state.goal === "preparedness" && files.length > 1
					? "Preparedness accepts exactly one prep file. Only the first file was kept."
					: null,
		}));
	}

	// ── Run ────────────────────────────────────────────────────────────────

	const handleRun = useCallback(async () => {
		if (!state.goal) return;
		if (state.goal === "preparedness") {
			const uploadError = getPreparednessUploadError(state.secondaryFile, state.primaryFile);
			if (uploadError) {
				setState((prev) => ({ ...prev, error: uploadError }));
				return;
			}
		}

		const prepFile = state.goal === "preparedness" ? state.secondaryFile : null;
		const assessmentFile = state.goal === "preparedness" ? state.primaryFile : null;
		const simulationFile = state.goal === "simulate" ? state.primaryFile : null;

		if (!state.primaryFile) {
			return;
		}

		if (state.goal === "preparedness" && (!prepFile || !assessmentFile)) {
			setState((prev) => ({ ...prev, error: "Preparedness requires exactly one prep file and one assessment file." }));
			return;
		}

		setState((prev) => ({
			...prev,
			isLoading: true,
			error: null,
			phase: "results",
			documentDocType: null,
			narrative: null,
			simData: null,
			testData: null,
			preparednessPrep: null,
			preparednessAssessment: null,
			rewriteResults: null,
			rewriteLoading: false,
			activeTab: "narrative",
		}));

		try {
			if (state.goal === "simulate") {
				const { sessionId, registered, originalTextMap } = await createStudioSessionFromFilesApi([simulationFile!], user?.id);
				const uploaded = registered[0];
				if (!uploaded) {
					throw new Error("Upload completed without a registered document for simulation.");
				}
				const documentId = uploaded.documentId;
				const originalText = originalTextMap[documentId] ?? null;
				void refreshUsage();
				const res = await runSingleSimulatorApi({ sessionId, studentProfile: state.profile }, user?.id);
				setState((prev) => ({
					...prev,
					sessionId,
					documentId,
					originalText,
					narrative: res.narrative,
					simData: res.data,
					isLoading: false,
				}));
			} else if (state.goal === "preparedness") {
				const { sessionId, documentId, originalText, preparednessPrep, preparednessAssessment } = await startSession(prepFile!, assessmentFile!, user?.id);
				void refreshUsage();

				setState((prev) => ({
					...prev,
					sessionId,
					documentId,
					originalText,
					narrative: "",
					preparednessPrep,
					preparednessAssessment,
					isLoading: false,
				}));
			}
			void refreshUsage();
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				phase: "upload",
				error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
			}));
		}
	}, [refreshUsage, state.goal, state.primaryFile, state.secondaryFile, state.profile, user?.id]);

	function handleDownload() {
		const content = state.narrative ?? "";
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `studio-${state.goal ?? "result"}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleGeneratePreparednessMode(mode: GenerationMode) {
		if (!state.sessionId) {
			setState((prev) => ({ ...prev, error: "Session not ready. Please run preparedness analysis first." }));
			return;
		}

		setState((prev) => ({
			...prev,
			isLoading: true,
			error: null,
			generationMode: mode,
		}));

		try {
			const supplementText = buildPreparednessSupplementText({
				mode,
				profile: state.teacherProfileLabel,
				difficulty: state.difficultyTuning,
				readingLoad: state.readingLoadTuning,
				length: state.lengthTuning,
			});
			const response = await runGenerateTestApi(
				{
					sessionId: state.sessionId,
					supplementText,
					testPreferences: state.testPrefs,
				},
				user?.id,
			);

			setState((prev) => ({
				...prev,
				testData: response.data,
				narrative: response.narrative,
				documentId: response.documentId ?? prev.documentId,
				activeTab: "narrative",
				isLoading: false,
			}));
			void refreshUsage();
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Failed to generate document",
			}));
		}
	}

	async function handlePreparednessItemAction(item: GeneratedTestItem, index: number, action: ItemAction) {
		if (!state.sessionId || !state.generationMode) {
			setState((prev) => ({ ...prev, error: "Generate a document first before applying item-level actions." }));
			return;
		}

		const baseSupplement = buildPreparednessSupplementText({
			mode: state.generationMode,
			profile: state.teacherProfileLabel,
			difficulty: state.difficultyTuning,
			readingLoad: state.readingLoadTuning,
			length: state.lengthTuning,
		});
		const actionInstruction = `Item action: ${itemActionLabel(action)} on item ${index + 1}. Focus text: ${item.stem}`;

		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		try {
			const response = await runGenerateTestApi(
				{
					sessionId: state.sessionId,
					supplementText: `${baseSupplement}\n${actionInstruction}`,
					testPreferences: state.testPrefs,
				},
				user?.id,
			);
			setState((prev) => ({
				...prev,
				testData: response.data,
				narrative: response.narrative,
				documentId: response.documentId ?? prev.documentId,
				isLoading: false,
			}));
			void refreshUsage();
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Failed to apply item action",
			}));
		}
	}

	async function handlePreparednessBulkItemAction(indexes: number[], action: ItemAction) {
		if (!state.sessionId || !state.generationMode) {
			setState((prev) => ({ ...prev, error: "Generate a document first before applying item-level actions." }));
			return;
		}

		if (!state.testData?.test?.length || indexes.length === 0) {
			setState((prev) => ({ ...prev, error: "Select at least one item before applying a bulk rewrite." }));
			return;
		}

		const baseSupplement = buildPreparednessSupplementText({
			mode: state.generationMode,
			profile: state.teacherProfileLabel,
			difficulty: state.difficultyTuning,
			readingLoad: state.readingLoadTuning,
			length: state.lengthTuning,
		});
		const selectedItems = indexes
			.map((index) => ({ number: index + 1, stem: state.testData?.test?.[index]?.stem }))
			.filter((entry): entry is { number: number; stem: string } => Boolean(entry.stem));
		const actionInstruction = `Bulk item action: ${itemActionLabel(action)} on selected items.\n${selectedItems
			.map((entry) => `- Item ${entry.number}: ${entry.stem}`)
			.join("\n")}`;

		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		try {
			const response = await runGenerateTestApi(
				{
					sessionId: state.sessionId,
					supplementText: `${baseSupplement}\n${actionInstruction}`,
					testPreferences: state.testPrefs,
				},
				user?.id,
			);
			setState((prev) => ({
				...prev,
				testData: response.data,
				narrative: response.narrative,
				documentId: response.documentId ?? prev.documentId,
				isLoading: false,
			}));
			void refreshUsage();
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Failed to apply bulk item action",
			}));
		}
	}

	function handleExportGeneratedDocument(kind: "student" | "answer") {
		if (!state.testData?.test?.length) {
			setState((prev) => ({ ...prev, error: "No generated document to export yet." }));
			return;
		}

		const lines: string[] = [];
		lines.push(`${modeLabel(state.generationMode)} — ${kind === "student" ? "Student Version" : "Answer Key"}`);
		lines.push("");
		for (const [index, item] of state.testData.test.entries()) {
			lines.push(`${index + 1}. ${item.stem}`);
			if (item.options?.length) {
				for (const [optIndex, option] of item.options.entries()) {
					lines.push(`   ${String.fromCharCode(65 + optIndex)}. ${option}`);
				}
			}
			if (kind === "answer" && item.answer) {
				lines.push(`   Answer: ${item.answer}`);
			}
			lines.push("");
		}

		const blob = new Blob([lines.join("\n")], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		const fileKind = kind === "student" ? "student" : "answer-key";
		link.download = `${(state.generationMode ?? "generated").replace(/_/g, "-")}-${fileKind}.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}

	// ── Rewrite Diff Viewer handlers ────────────────────────────────────────

	function handleReplace() {
		const preview = state.rewritePreview;
		if (!preview || !preview.rewritten) return;

		setState((prev) => {
			return {
				...prev,
				rewriteResults: prev.rewriteResults
					? { ...prev.rewriteResults, rewritten: preview.rewritten }
					: prev.rewriteResults,
				rewritePreview: null,
			};
		});
	}

	function handleCopy() {
		const text = state.rewritePreview?.rewritten;
		if (!text) return;
		navigator.clipboard.writeText(text);
	}

	function handleDiscard() {
		setState((prev) => ({
			...prev,
			rewritePreview: null,
			reportError: null,
			reportSuccess: null,
			reportSubmitting: false,
		}));
	}

	async function handleReportIssue(payload: {
		teacherInput: string;
		expectedOutput: string;
		whatWasWrong: string;
		additionalContext?: string;
	}) {
		const preview = state.rewritePreview;
		if (!preview) return;

		setState((prev) => ({
			...prev,
			reportSubmitting: true,
			reportError: null,
			reportSuccess: null,
		}));

		try {
			await reportBadRewriteApi({
				userId: user?.id,
				sectionId: preview.id,
				original: preview.original,
				rewritten: preview.rewritten,
				teacherInput: payload.teacherInput,
				expectedOutput: payload.expectedOutput,
				whatWasWrong: payload.whatWasWrong,
				additionalContext: payload.additionalContext,
			});

			setState((prev) => ({
				...prev,
				reportSubmitting: false,
				reportError: null,
				reportSuccess: "Report submitted. Thank you for the details.",
			}));
		} catch (err) {
			setState((prev) => ({
				...prev,
				reportSubmitting: false,
				reportError: err instanceof Error ? err.message : "Failed to submit report",
				reportSuccess: null,
			}));
		}
	}

	function handleExportBefore() {
		const preview = state.rewritePreview;
		if (!preview) return;

		void (async () => {
			try {
				const jsPDF = (await import("jspdf")).jsPDF;
				const doc = new jsPDF({ unit: "mm", format: "a4" });
				const margin = 18;
				const pageWidth = 210;
				const contentWidth = pageWidth - margin * 2;

				doc.setFont("helvetica", "bold");
				doc.setFontSize(15);
				doc.text(`Original — ${preview.type} ${preview.id}`, margin, margin);
				doc.setLineWidth(0.4);
				doc.line(margin, margin + 3, pageWidth - margin, margin + 3);

				doc.setFont("helvetica", "normal");
				doc.setFontSize(10.5);
				const lines = doc.splitTextToSize(preview.original, contentWidth);
				doc.text(lines as string[], margin, margin + 10);

				doc.save(`original-${preview.type}-${preview.id}.pdf`);
			} catch (err) {
				console.error("PDF export failed:", err);
			}
		})();
	}

	function handleExportAfter() {
		const preview = state.rewritePreview;
		if (!preview?.rewritten) return;

		void (async () => {
			try {
				const jsPDF = (await import("jspdf")).jsPDF;
				const doc = new jsPDF({ unit: "mm", format: "a4" });
				const margin = 18;
				const pageWidth = 210;
				const contentWidth = pageWidth - margin * 2;

				doc.setFont("helvetica", "bold");
				doc.setFontSize(15);
				doc.text(`Rewritten — ${preview.type} ${preview.id}`, margin, margin);
				doc.setLineWidth(0.4);
				doc.line(margin, margin + 3, pageWidth - margin, margin + 3);

				doc.setFont("helvetica", "normal");
				doc.setFontSize(10.5);
				const lines = doc.splitTextToSize(preview.rewritten, contentWidth);
				doc.text(lines as string[], margin, margin + 10);

				doc.save(`rewritten-${preview.type}-${preview.id}.pdf`);
			} catch (err) {
				console.error("PDF export failed:", err);
			}
		})();
	}

	// ── Render ─────────────────────────────────────────────────────────────

	const canRun =
		Boolean(state.primaryFile) &&
		(state.goal !== "preparedness" || Boolean(state.secondaryFile));

	const ctaLabel =
		state.goal === "simulate"
			? "Simulate Experience"
			: "Build Instructional Blueprint";

	return (
		<div className="v4-viewer">
			<div className="v4-shell">

				{/* ── Breadcrumb ─────────────────────────────────────────────── */}
				{state.phase !== "goal" && (
					<nav
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							marginBottom: "1rem",
							fontSize: "0.72rem",
							fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
							textTransform: "uppercase",
							letterSpacing: "0.12em",
							color: "#9c4d2b",
						}}
					>
						<button
							type="button"
							onClick={startOver}
							style={{
								all: "unset",
								cursor: "pointer",
								color: "#9c4d2b",
								textDecoration: "underline",
								textDecorationColor: "transparent",
							}}
							onMouseEnter={(e) =>
								((e.target as HTMLElement).style.textDecorationColor = "#9c4d2b")
							}
							onMouseLeave={(e) =>
								((e.target as HTMLElement).style.textDecorationColor = "transparent")
							}
						>
							Goals
						</button>
						<span>›</span>
						<span style={{ color: state.phase === "upload" ? "#1f1a17" : "#9c4d2b" }}>
							{goalData?.title}
						</span>
						{state.phase === "results" && (
							<>
								<span>›</span>
								<span style={{ color: "#1f1a17" }}>Results</span>
							</>
						)}
					</nav>
				)}

				<div className="v4-viewer-grid">

					{/* ═══ PHASE: GOAL ══════════════════════════════════════════ */}
					{state.phase === "goal" && (
						<>
							<section className="v4-panel v4-vector-span v4-hero">
								<div>
									<p className="v4-kicker">Teacher Studio</p>
									<h1>What do you want to do?</h1>
									<p className="v4-subtitle">
										Choose your goal — we'll ask only what we need.
									</p>
								</div>
							</section>

							<section className="v4-panel v4-vector-span">
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "repeat(auto-fill, minmax(275px, 1fr))",
										gap: "1rem",
									}}
								>
									{GOALS.map((g) => (
										<GoalCard
											key={g.id}
											goal={g}
											selected={state.goal === g.id}
											onClick={() => selectGoal(g.id)}
										/>
									))}
								</div>
							</section>
						</>
					)}

					{/* ═══ PHASE: UPLOAD ════════════════════════════════════════ */}
					{state.phase === "upload" && state.goal && (
						<UploadPanelV4
							goal={state.goal}
							title={goalData?.title ?? "Teacher Studio"}
							subtitle={
								state.goal === "simulate"
									? "This is the document the student will experience. PDF, Word, or PowerPoint."
									: "Upload one prep file and one assessment file."
							}
							primaryFile={state.primaryFile}
							secondaryFile={state.secondaryFile}
							primaryDragging={state.primaryDragging}
							secondaryDragging={state.secondaryDragging}
							primaryAccept={ACCEPTED_DOCS}
							secondaryAccept={ACCEPTED_TEXT}
							primaryRef={primaryRef}
							secondaryRef={secondaryRef}
							canRun={canRun}
							ctaLabel={ctaLabel}
							usageCount={state.usageCount}
							usageLimit={state.usageLimit}
							error={state.error}
							onPrimaryDragOver={handlePrimaryDragOver}
							onPrimaryDragLeave={handlePrimaryDragLeave}
							onPrimaryDrop={handlePrimaryDrop}
							onSecondaryDragOver={handleSecondaryDragOver}
							onSecondaryDragLeave={handleSecondaryDragLeave}
							onSecondaryDrop={handleSecondaryDrop}
							onPrimaryChange={(file) => setState((prev) => ({ ...prev, primaryFile: file }))}
							onSecondaryChange={(file) => setState((prev) => ({ ...prev, secondaryFile: file }))}
							onClearPrimary={() => setState((prev) => ({ ...prev, primaryFile: null }))}
							onClearSecondary={() => setState((prev) => ({ ...prev, secondaryFile: null }))}
							onRun={() => void handleRun()}
							onBack={goBackToGoals}
						/>
					)}

					{/* ═══ PHASE: RESULTS ═══════════════════════════════════════ */}
					{state.phase === "results" && (
						<section className="v4-panel v4-vector-span">

							{/* Loading */}
							{state.isLoading && (
								<div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
									<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>
										Running…
									</p>
									<p className="v4-body-copy">This usually takes 10–20 seconds.</p>
									<div
										className="spinner"
										style={{ margin: "1.75rem auto 0", width: "36px", height: "36px" }}
									/>
								</div>
							)}

							{/* Results content */}
							{!state.isLoading && (
								(state.goal === "preparedness" && state.preparednessPrep && state.preparednessAssessment) ||
								state.narrative !== null
							) && (
								<>
									{/* Header row */}
									<div
										style={{
											display: "flex",
											alignItems: "flex-start",
											justifyContent: "space-between",
											gap: "1rem",
											flexWrap: "wrap",
											marginBottom: "0.5rem",
										}}
									>
										<div>
											<p className="v4-kicker">
												{state.goal === "simulate" && "Student Experience Simulation"}
												{state.goal === "preparedness" && "Instructional Blueprint"}
											</p>
											<p
												className="v4-body-copy"
												style={{ marginTop: 0, fontSize: "0.85rem", color: "#6b5040" }}
											>
												{goalData?.title}
											</p>
											{state.documentId ? <DocumentStatusBadge documentId={state.documentId} /> : null}
										</div>
										<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
											{state.goal === "simulate" && (
												<button
													type="button"
													className="v4-button v4-button-secondary v4-button-sm"
													onClick={handleDownload}
												>
													Download
												</button>
											)}
											<button
												type="button"
												className="v4-button v4-button-secondary v4-button-sm"
												onClick={startOver}
											>
												Start over
											</button>
										</div>
									</div>

									{state.goal === "preparedness" && state.preparednessPrep && state.preparednessAssessment ? (
										<>
											<PreparednessBlueprint
												prep={state.preparednessPrep}
												assessment={state.preparednessAssessment}
												onGenerate={(mode) => {
													setPendingMode(mode);
													setModeSelectOpen(true);
												}}
											>

											{state.testData && state.testData.test.length > 0 && (
												<GeneratedViewer
													modeLabel={modeLabel(state.generationMode)}
													data={state.testData}
													profileOptions={TEACHER_PROFILE_OPTIONS}
													teacherProfileLabel={state.teacherProfileLabel}
													lengthTuning={state.lengthTuning}
													onProfileChange={(profileLabel) => {
														setState((prev) => ({ ...prev, teacherProfileLabel: profileLabel }));
													}}
													onLengthChange={(value) => setState((prev) => ({ ...prev, lengthTuning: value }))}
													onRegenerateAll={() => {
														if (state.generationMode) {
															void handleGeneratePreparednessMode(state.generationMode);
														}
													}}
													onItemAction={(item, index, action) => {
														void handlePreparednessItemAction(item, index, action);
													}}
													onBulkItemAction={(indexes, action) => {
														void handlePreparednessBulkItemAction(indexes, action);
													}}
													onExportStudent={() => handleExportGeneratedDocument("student")}
													onExportAnswer={() => handleExportGeneratedDocument("answer")}
												/>
											)}
											</PreparednessBlueprint>
											<ModeSelectModal
												open={modeSelectOpen}
												selectedMode={pendingMode}
												onSelectMode={setPendingMode}
												onGenerate={() => {
													setModeSelectOpen(false);
													void handleGeneratePreparednessMode(pendingMode);
												}}
												onClose={() => setModeSelectOpen(false)}
											/>
										</>
									) : (
										<>
									{/* Tab bar */}
									{(() => {
										const suggestions: RewriteSuggestions | undefined = state.simData?.rewriteSuggestions;
										const hasSuggestions =
											suggestions != null &&
											(suggestions.testLevel.length > 0 || Object.keys(suggestions.itemLevel).length > 0);
										const hasJson = state.simData !== null;
										const hasRewrite = state.rewriteResults !== null;
										const tabs: Array<{ id: ResultTab; label: string }> = [
											{ id: "narrative", label: "Narrative" },
											...(hasSuggestions ? [{ id: "suggestions" as ResultTab, label: "Suggestions" }] : []),
											...(hasRewrite ? [{ id: "rewrite" as ResultTab, label: "Rewrite" }] : []),
											...(hasJson ? [{ id: "json" as ResultTab, label: "JSON" }] : []),
										];
										return tabs.length > 1 ? (
											<div
												style={{
													display: "flex",
													gap: "0.25rem",
													marginTop: "1rem",
													marginBottom: "0.25rem",
													borderBottom: "2px solid rgba(86,57,32,0.14)",
												}}
											>
												{tabs.map((tab) => (
													<button
														key={tab.id}
														type="button"
														onClick={() => setState((prev) => ({ ...prev, activeTab: tab.id }))}
														style={{
															all: "unset",
															cursor: "pointer",
															padding: "0.45rem 1rem",
															fontSize: "0.8rem",
															fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
															textTransform: "uppercase",
															letterSpacing: "0.1em",
															color: state.activeTab === tab.id ? "#bb5b35" : "#9c4d2b",
															borderBottom: state.activeTab === tab.id
																? "2px solid #bb5b35"
																: "2px solid transparent",
															marginBottom: "-2px",
															transition: "color 0.15s",
														}}
													>
														{tab.label}
													</button>
												))}
											</div>
										) : null;
									})()}

									{/* Tab: Narrative */}
									{state.activeTab === "narrative" && (
										<>
											<pre
												style={{
													marginTop: "1.25rem",
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
													background: "rgba(255,251,245,0.7)",
													border: "1px solid rgba(86,57,32,0.14)",
													borderRadius: "12px",
													padding: "1rem 1.15rem",
													fontFamily: "inherit",
													fontSize: "0.875rem",
													lineHeight: 1.7,
													color: "#1f1a17",
												}}
											>
												{state.narrative}
											</pre>
											{state.simData && state.simData.items.length > 0 && (
												<>
													<OverallStats data={state.simData} />
													<ItemTable data={state.simData} />
												</>
											)}
										</>
									)}
									{/* Tab: Suggestions */}
									{state.activeTab === "suggestions" && (
										<RewriteSuggestionsPanel
											suggestions={state.simData?.rewriteSuggestions}
												itemRedFlags={Object.fromEntries(
													(state.simData?.items ?? []).map((item) => [String(item.itemNumber), item.redFlags ?? []]),
												)}
											selectedSuggestions={state.selectedSuggestions}
											teacherNotes={state.teacherNotes}
											onToggle={(key) =>
												setState((prev) => {
													const base = prev.selectedSuggestions ?? {};
													return {
														...prev,
														selectedSuggestions: {
															...base,
															[key]: !base[key],
														},
													};
												})
											}
											onTeacherNotesChange={(val) =>
												setState((prev) => ({ ...prev, teacherNotes: val }))
											}
											rewriteLoading={state.rewriteLoading}
											rewriteDisabledReason={!canRewriteFromDocType(state.documentDocType)
												? "Rewriting is only supported for assignment, assessment, or mixed documents."
												: null}
											onRewrite={async () => {
													if (rewriteInFlightRef.current) return;
												const suggestions = state.simData?.rewriteSuggestions;
												if (!suggestions) return;
												if (!canRewriteFromDocType(state.documentDocType)) {
													setState((prev) => ({
														...prev,
														error: "Rewriting is only supported for assignment, assessment, or mixed documents.",
													}));
													return;
												}

												// Build selected suggestion ID set from checkbox state
												const sel = state.selectedSuggestions ?? {};

												// Teacher-authored suggestions (split by newline)
												const teacherSuggestions = (state.teacherNotes ?? "")
													.split("\n")
													.map((l) => l.trim())
													.filter(Boolean);

												const flattenedSuggestions: RewriteSuggestion[] = [];
												for (const [index, text] of suggestions.testLevel.entries()) {
													flattenedSuggestions.push({
														id: `test:${index}`,
														label: `Global suggestion ${index + 1}`,
														instruction: text,
														rationale: "Generated from simulation risk signals.",
														severity: "medium",
														actionable: true,
													});
												}
												for (const [itemNum, entries] of Object.entries(suggestions.itemLevel)) {
													for (const [index, text] of entries.entries()) {
														flattenedSuggestions.push({
															id: `item:${itemNum}:${index}`,
															label: `Item ${itemNum} suggestion ${index + 1}`,
															instruction: text,
															rationale: `Targets risk observed for item ${itemNum}.`,
															severity: "medium",
															actionable: true,
														});
													}
												}
												for (const [index, text] of teacherSuggestions.entries()) {
													flattenedSuggestions.push({
														id: `teacher:${index}`,
														label: `Teacher note ${index + 1}`,
														instruction: text,
														rationale: "Teacher-authored rewrite directive.",
														severity: "high",
														actionable: true,
													});
												}

												const selectedSuggestionIds = flattenedSuggestions
													.filter((entry) => {
														if (entry.id.startsWith("teacher:")) return true;
														return Boolean(sel[entry.id]);
													})
													.map((entry) => entry.id);
												if (selectedSuggestionIds.length === 0) {
													setState((prev) => ({
														...prev,
														error: "Select at least one rewrite suggestion.",
													}));
													return;
												}

												const originalText = await buildRewriteOriginalText(
													state.primaryFile,
													state.originalText,
													state.narrative,
												);
												if (!originalText) {
													setState((prev) => ({
														...prev,
														error: "Original document text is required for rewrite.",
													}));
													return;
												}

												setState((prev) => ({ ...prev, rewriteLoading: true }));
													rewriteInFlightRef.current = true;
												try {
													const request: RewriteRequest = {
														docType: state.documentDocType ?? undefined,
														original: originalText,
														suggestions: flattenedSuggestions,
														selectedSuggestionIds,
														profileApplied: state.differentiationProfile || undefined,
													};
													const result = await runRewriteApi(request, user?.id);
													const appliedSuggestions = flattenedSuggestions
														.filter((entry) => result.appliedSuggestionIds.includes(entry.id))
														.map((entry) => entry.instruction);

																	const preview = pickRewritePreview(
																		result,
																			originalText,
																			appliedSuggestions,
																		state.differentiationProfile,
																	);
													setState((prev) => ({
														...prev,
														rewriteResults: result,
															rewritePreview: preview,
														rewriteLoading: false,
														activeTab: "rewrite",
													}));
												} catch (err) {
													setState((prev) => ({
														...prev,
														rewriteLoading: false,
														error: err instanceof Error ? err.message : "Rewrite failed",
													}));
															} finally {
																rewriteInFlightRef.current = false;
																void refreshUsage();
												}
											}}
										/>
									)}

									{/* Tab: Rewrite */}
									{state.activeTab === "rewrite" && state.rewriteResults && (
										<RewriteViewer rewrite={state.rewriteResults} documentId={state.documentId} />
									)}

									{/* Tab: JSON */}
									{state.activeTab === "json" && (
										<pre
											style={{
												marginTop: "1.25rem",
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												background: "rgba(30,20,10,0.96)",
												color: "#d4c5b0",
												border: "1px solid rgba(86,57,32,0.3)",
												borderRadius: "12px",
												padding: "1rem 1.15rem",
												fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
												fontSize: "0.78rem",
												lineHeight: 1.6,
											}}
										>
											{JSON.stringify(
												state.simData,
												null,
												2,
											)}
										</pre>
									)}
										</>
									)}

									{/* Rewrite Diff Viewer Modal */}
									{state.rewritePreview && (
										<RewriteDiffViewer
											original={state.rewritePreview.original}
											rewritten={state.rewritePreview.rewritten}
											appliedSuggestions={state.rewritePreview.appliedSuggestions}
											profileApplied={state.rewritePreview.profileApplied}
											metadata={state.rewritePreview.metadata}
											reportContext={[
												state.rewritePreview.appliedSuggestions.length > 0
													? `Applied suggestions:\n${state.rewritePreview.appliedSuggestions.join("\n")}`
													: "",
												state.teacherNotes ? `Teacher notes:\n${state.teacherNotes}` : "",
												state.differentiationProfile ? `Differentiation profile:\n${state.differentiationProfile}` : "",
											]
												.filter(Boolean)
												.join("\n\n")}
											reportSubmitting={state.reportSubmitting}
											reportError={state.reportError}
											reportSuccess={state.reportSuccess}
											onReportIssue={handleReportIssue}
											onReplace={handleReplace}
											onCopy={handleCopy}
											onDiscard={handleDiscard}
											onExportBefore={handleExportBefore}
											onExportAfter={handleExportAfter}
										/>
									)}
								</>
							)}
						</section>
					)}

				</div>
			</div>
		</div>
	);
}
