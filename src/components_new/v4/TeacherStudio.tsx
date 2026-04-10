/**
 * src/components_new/v4/TeacherStudio.tsx
 *
 * Modern teacher onboarding — replaces the raw upload screen on the root route.
 *
 * Three goals, each adapts the upload and results experience:
 *
 *   ◎  Simulate Student Experience  → single doc → narrative + analytics
 *   ⌖  Check Student Preparedness   → prep docs + assessment → alignment analysis
 *   ⊕  Compare Student Profiles     → parallel simulation + equity charts
 *
 * Flow:  goal → upload → results
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../Auth/useAuth";
import { createStudioSessionFromFilesApi } from "../../lib/teacherStudioApi";
import {
	isActionableRewriteSuggestion,
} from "../../lib/rewriteSuggestionFilters";
import {
	reportBadRewriteApi,
	runGenerateTestApi,
	runMultiSimulatorApi,
	runPreparednessSimulatorApi,
	runRewriteApi,
	runSingleSimulatorApi,
} from "../../lib/simulatorApi";
import type {
	GeneratedTestData,
	GeneratedTestItem,
	ParallelSimulatorData,
	RewriteResponse,
	RewriteSuggestions,
	SimulatorData,
	SimulatorTestPreferences,
	StudentProfile,
} from "../../types/simulator";
import type { RewriteSuggestion } from "../../types/v4/suggestions";
import { DEFAULT_STUDENT_PROFILE, STUDENT_PROFILE_PRESETS } from "../../types/simulator";
import { DifferentiationPanel } from "./DifferentiationPanel";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { RewriteDiffViewer } from "./RewriteDiffViewer";
import { RewriteViewer } from "./RewriteViewer";
import { SimulationCharts } from "./SimulationCharts";
import "./v4.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Goal = "simulate" | "preparedness" | "compare" | "create";
type Phase = "goal" | "upload" | "results";
type ResultTab = "narrative" | "charts" | "suggestions" | "json" | "rewrite";

interface StudioState {
	goal: Goal | null;
	phase: Phase;
	primaryFiles: File[];
	secondaryFiles: File[];   // prep material (preparedness)
	sessionId: string | null;
	documentId: string | null;
	profile: StudentProfile;
	selectedPreset: string;
	// multi-profile compare
	selectedProfileLabels: string[];
	// assessment generation
	testData: GeneratedTestData | null;
	testPrefs: SimulatorTestPreferences;
	narrative: string | null;
	simData: SimulatorData | null;
	parallelData: ParallelSimulatorData | null;
	rewriteResults: RewriteResponse | null;
	rewriteLoading: boolean;
	// interactive rewrite panel state
	selectedSuggestions: Record<string, boolean>;  // key="test:idx" or "item:N:idx"
	teacherNotes: string;
	differentiationProfile: string;
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
	preferredItemNumbers: number[],
	defaultProfile: string,
): RewritePreview | null {
	const preferred = new Set(preferredItemNumbers);

	if (preferred.size > 0 && Array.isArray(result.rewrittenItems)) {
		for (const entry of result.rewrittenItems) {
			if (!preferred.has(entry.originalItemNumber)) continue;
			if (typeof entry.original !== "string" || typeof entry.rewrittenStem !== "string") continue;
			return {
				original: entry.original,
				rewritten: entry.rewrittenStem,
				appliedSuggestions: result.appliedSuggestions ?? result.testLevel ?? [],
				profileApplied: (result.profileApplied ?? defaultProfile) || null,
				metadata: result.metadata,
				type: "item",
				id: String(entry.originalItemNumber),
			};
		}
	}

	if (preferred.size > 0 && Array.isArray(result.items)) {
		for (const entry of result.items) {
			if (!preferred.has(entry.itemNumber)) continue;
			if (typeof entry.original !== "string" || typeof entry.rewrittenStem !== "string") continue;
			return {
				original: entry.original,
				rewritten: entry.rewrittenStem,
				appliedSuggestions: result.appliedSuggestions ?? result.testLevel ?? [],
				profileApplied: (result.profileApplied ?? defaultProfile) || null,
				metadata: result.metadata,
				type: "item",
				id: String(entry.itemNumber),
			};
		}
	}

	if (typeof result.original === "string" && typeof result.rewritten === "string") {
		return {
			original: result.original,
			rewritten: result.rewritten,
			appliedSuggestions: result.appliedSuggestions ?? result.testLevel ?? [],
			profileApplied: (result.profileApplied ?? defaultProfile) || null,
			metadata: result.metadata,
			type: result.type ?? "item",
			id: result.id ?? "1",
		};
	}

	if (Array.isArray(result.sections)) {
		const firstWithOriginal = result.sections.find(
			(entry) => typeof entry.original === "string" && typeof entry.rewrittenText === "string",
		);
		if (firstWithOriginal) {
			return {
				original: firstWithOriginal.original!,
				rewritten: firstWithOriginal.rewrittenText,
				appliedSuggestions: result.appliedSuggestions ?? result.testLevel ?? [],
				profileApplied: (result.profileApplied ?? defaultProfile) || null,
				metadata: result.metadata,
				type: "section",
				id: firstWithOriginal.sectionId,
			};
		}
	}

	return null;
}

const INITIAL: StudioState = {
	goal: null,
	phase: "goal",
	primaryFiles: [],
	secondaryFiles: [],
	sessionId: null,
	documentId: null,
	profile: DEFAULT_STUDENT_PROFILE,
	selectedPreset: "Average Student",
	selectedProfileLabels: ["Average Student", "ADHD", "ELL"],
	testData: null,
	testPrefs: { mcCount: 10, saCount: 3, frqCount: 1 },
	narrative: null,
	simData: null,
	parallelData: null,
	rewriteResults: null,
	rewriteLoading: false,
	selectedSuggestions: {},
	teacherNotes: "",
	differentiationProfile: "",
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

const ACCEPTED_DOCS = ".pdf,.doc,.docx,.ppt,.pptx";
const ACCEPTED_TEXT = ".txt,.doc,.docx,.rtf";
const DROP_DOCS_RE = /\.(pdf|doc|docx|ppt|pptx)$/i;
const DROP_TEXT_RE = /\.(txt|doc|docx|rtf)$/i;

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
	{
		id: "compare",
		symbol: "⊕",
		title: "Compare Student Profiles",
		description:
			"Run the same document through multiple student profiles at once — ADHD, ELL, Dyslexia, Low Confidence — and get side-by-side cognitive load curves, confusion heatmaps, and equity risk scores.",
		uploadsLabel: "1 document + 2–8 profiles to compare",
	},
	{
		id: "create",
		symbol: "✦",
		title: "Create a New Assessment",
		description:
			"Generate a teacher-ready test from your existing documents. Specify question types and count — the AI builds it from your source material.",
		uploadsLabel: "1 or more source documents",
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

function OverallStats({ data, goal }: { data: SimulatorData; goal: Goal }) {
	const { overall } = data;
	const mins = Math.round(overall.estimatedCompletionTimeSeconds / 60);
	const stats: Array<{ value: string | number; label: string }> = [
		{ value: overall.totalItems, label: "Items" },
		{ value: `${mins}m`, label: "Est. time" },
	];
	if (overall.alignmentScore !== undefined && goal === "preparedness") {
		stats.push({ value: `${Math.round(overall.alignmentScore * 100)}%`, label: "Alignment" });
	}
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

function ItemTable({ data, goal }: { data: SimulatorData; goal: Goal }) {
	if (data.items.length === 0) return null;
	const showAlignment = goal === "preparedness";
	return (
		<div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Item-by-Item Analysis</p>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
				<thead>
					<tr style={{ borderBottom: "2px solid rgba(86,57,32,0.16)" }}>
						{["#", "Words", "Cog. Load", "Confusion", "Time (s)", ...(showAlignment ? ["Alignment"] : [])].map(
							(h) => (
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
								{showAlignment && (
									<td style={{ padding: "0.35rem 0.5rem" }}>
										{item.alignmentScore !== undefined
											? `${Math.round(item.alignmentScore * 100)}%`
											: "—"}
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// GeneratedTestView
// ---------------------------------------------------------------------------

function GeneratedTestView({ data }: { data: GeneratedTestData }) {
	return (
		<div style={{ marginTop: "1.5rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>
				Generated Test — {data.test.length} items
			</p>
			<ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
				{data.test.map((item: GeneratedTestItem, i: number) => (
					<li key={i} style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
						<span
							className="v4-pill"
							style={{ marginRight: "0.5rem", fontSize: "0.7rem", verticalAlign: "middle" }}
						>
							{item.type}
						</span>
						<span style={{ fontWeight: 600 }}>{item.stem}</span>
						{item.options && item.options.length > 0 && (
							<ol type="A" style={{ marginTop: "0.35rem", paddingLeft: "1.5rem" }}>
								{item.options.map((opt, j) => (
									<li key={j}>{opt}</li>
								))}
							</ol>
						)}
						{item.answer && (
							<p style={{ marginTop: "0.35rem", color: "#6b5040", fontSize: "0.8rem" }}>
								<strong>Answer:</strong> {item.answer}
							</p>
						)}
					</li>
				))}
			</ol>
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
	differentiationProfile,
	onDifferentiationProfileChange,
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
	differentiationProfile: string;
	onDifferentiationProfileChange: (val: string) => void;
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

			<DifferentiationPanel
				value={differentiationProfile}
				onChange={onDifferentiationProfileChange}
				onGenerate={onRewrite ?? null}
				isLoading={rewriteLoading}
			/>

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
// DropZone sub-component
// ---------------------------------------------------------------------------

interface DropZoneProps {
	label: string;
	hint?: string;
	files: File[];
	isDragging: boolean;
	accept: string;
	multiple?: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	onChange: (files: File[]) => void;
	onRemove: () => void;
}

function DropZone({
	label,
	hint,
	files,
	isDragging,
	accept,
	multiple,
	inputRef,
	onDragOver,
	onDragLeave,
	onDrop,
	onChange,
	onRemove,
}: DropZoneProps) {
	const hasFiles = files.length > 0;
	return (
		<div>
			<p className="v4-kicker" style={{ marginBottom: "0.35rem" }}>{label}</p>
			{hint && (
				<p style={{ fontSize: "0.8rem", color: "#6b5040", margin: "0 0 0.6rem" }}>{hint}</p>
			)}
			<div
				className={`v4-drop-zone${isDragging ? " v4-drop-zone--active" : ""}${hasFiles ? " v4-drop-zone--filled" : ""}`}
				style={{ cursor: "pointer" }}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				onClick={() => inputRef.current?.click()}
			>
				{hasFiles ? (
					<div className="v4-drop-zone-files">
						{files.map((f) => (
							<span key={f.name} className="v4-pill">{f.name}</span>
						))}
					</div>
				) : (
					<p className="v4-drop-zone-hint">
						{isDragging ? "Drop to upload" : "Drag & drop, or click to browse"}
					</p>
				)}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				style={{ display: "none" }}
				onChange={(e) => onChange(Array.from(e.target.files ?? []))}
			/>
			{hasFiles && (
				<button
					type="button"
					className="v4-button v4-button-secondary v4-button-sm"
					style={{ marginTop: "0.5rem" }}
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
						if (inputRef.current) inputRef.current.value = "";
					}}
				>
					Clear
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
	const rewriteInFlightRef = useRef(false);
	const primaryRef = useRef<HTMLInputElement>(null);
	const secondaryRef = useRef<HTMLInputElement>(null);

	// Fetch daily usage on mount
	useEffect(() => {
		fetch("/api/v4/usage/today", {
			headers: user?.id ? { "x-user-id": user.id } : undefined,
		})
			.then((r) => r.json())
			.then((d: { count?: number; limit?: number }) => {
				if (typeof d.count === "number") {
					setState((prev) => ({ ...prev, usageCount: d.count!, usageLimit: d.limit ?? 25_000 }));
				}
			})
			.catch(() => {/* non-fatal */});
	}, [user?.id]);

	const goalData = GOALS.find((g) => g.id === state.goal);

	// ── Navigation ─────────────────────────────────────────────────────────

	function selectGoal(goal: Goal) {
		setState((prev) => ({ ...prev, goal, phase: "upload", error: null }));
	}

	function goBackToGoals() {
		setState((prev) => ({ ...INITIAL, goal: prev.goal }));
	}

	function startOver() {
		setState(INITIAL);
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
		setState((prev) => ({
			...prev,
			primaryDragging: false,
			primaryFiles: files.length > 0 ? files : prev.primaryFiles,
			error: files.length === 0 ? "Only PDF, Word, or PowerPoint files accepted." : null,
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
		setState((prev) => ({
			...prev,
			secondaryDragging: false,
			secondaryFiles: files.length > 0 ? files : prev.secondaryFiles,
			error: files.length === 0 ? "Only .txt, .doc, .docx, or .rtf files accepted for prep material." : null,
		}));
	}

	// ── Run ────────────────────────────────────────────────────────────────

	const handleRun = useCallback(async () => {
		if (!state.goal || state.primaryFiles.length === 0) return;
		if (state.goal === "preparedness" && state.secondaryFiles.length === 0) {
			setState((prev) => ({ ...prev, error: "Please upload the prep / study material." }));
			return;
		}

		setState((prev) => ({
			...prev,
			isLoading: true,
			error: null,
			phase: "results",
			narrative: null,
			simData: null,
			parallelData: null,
			testData: null,
			rewriteResults: null,
			rewriteLoading: false,
			activeTab: "narrative",
		}));

		try {
			const { sessionId, registered } = await createStudioSessionFromFilesApi(state.primaryFiles, user?.id);
			const documentId = registered[0]?.documentId ?? null;

			// Refresh usage counter after successful upload
			fetch("/api/v4/usage/today", {
				headers: user?.id ? { "x-user-id": user.id } : undefined,
			})
				.then((r) => r.json())
				.then((d: { count?: number; limit?: number }) => {
					if (typeof d.count === "number") {
						setState((prev) => ({ ...prev, usageCount: d.count!, usageLimit: d.limit ?? 25_000 }));
					}
				})
				.catch(() => {});

			if (state.goal === "simulate") {
				const res = await runSingleSimulatorApi({ sessionId, studentProfile: state.profile }, user?.id);
				setState((prev) => ({
					...prev,
					sessionId,
					documentId,
					narrative: res.narrative,
					simData: res.data,
					isLoading: false,
				}));
			} else if (state.goal === "preparedness") {
				const prepText = (await Promise.all(state.secondaryFiles.map(readFileAsText))).join("\n\n");
				const res = await runPreparednessSimulatorApi({ sessionId, prepText, studentProfile: state.profile }, user?.id);
				setState((prev) => ({
					...prev,
					sessionId,
					documentId,
					narrative: res.narrative,
					simData: res.data,
					isLoading: false,
				}));
			} else if (state.goal === "compare") {
				const profileEntries = STUDENT_PROFILE_PRESETS.filter((p) =>
					state.selectedProfileLabels.includes(p.label),
				);
				const res = await runMultiSimulatorApi(sessionId, profileEntries, user?.id);
				setState((prev) => ({
					...prev,
					sessionId,
					documentId,
					narrative: res.narrative,
					parallelData: res.data,
					isLoading: false,
				}));
			} else if (state.goal === "create") {
				const res = await runGenerateTestApi({ sessionId, testPreferences: state.testPrefs }, user?.id);
				setState((prev) => ({
					...prev,
					sessionId,
					// Use the documentId the generate-test route created (where items were saved)
					documentId: res.documentId ?? documentId,
					narrative: res.narrative,
					testData: res.data,
					isLoading: false,
				}));
			}
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				phase: "upload",
				error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
			}));
		}
	}, [state.goal, state.primaryFiles, state.secondaryFiles, state.profile, state.selectedProfileLabels, state.testPrefs, user?.id]);

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

	// ── Rewrite Diff Viewer handlers ────────────────────────────────────────

	function updateItemInDocument(
		document: RewriteResponse | null,
		id: string,
		rewritten: string,
	): RewriteResponse | null {
		if (!document) return document;
		const itemNumber = Number(id);
		if (!Number.isFinite(itemNumber)) return document;

		return {
			...document,
			rewrittenItems: document.rewrittenItems.map((item) =>
				item.originalItemNumber === itemNumber
					? { ...item, rewrittenStem: rewritten }
					: item,
			),
			items: document.items?.map((item) =>
				item.itemNumber === itemNumber ? { ...item, rewrittenStem: rewritten } : item,
			),
		};
	}

	function updateSectionInDocument(
		document: RewriteResponse | null,
		id: string,
		rewritten: string,
	): RewriteResponse | null {
		if (!document || !document.sections) return document;
		return {
			...document,
			sections: document.sections.map((section) =>
				section.sectionId === id
					? { ...section, rewrittenText: rewritten }
					: section,
			),
		};
	}

	function handleReplace() {
		const preview = state.rewritePreview;
		if (!preview || !preview.rewritten) return;

		setState((prev) => {
			const updatedDoc =
				preview.type === "item"
					? updateItemInDocument(prev.rewriteResults, preview.id, preview.rewritten)
					: updateSectionInDocument(prev.rewriteResults, preview.id, preview.rewritten);

			return {
				...prev,
				rewriteResults: updatedDoc,
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
		state.primaryFiles.length > 0 &&
		(state.goal !== "preparedness" || state.secondaryFiles.length > 0) &&
		(state.goal !== "compare" || state.selectedProfileLabels.length >= 2);

	const ctaLabel =
		state.goal === "simulate"
			? "Simulate Experience"
			: state.goal === "preparedness"
			? "Analyze Preparedness"
			: state.goal === "create"
			? "Generate Assessment"
			: "Compare Profiles";

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
						<>
							<section className="v4-panel v4-vector-span v4-hero">
								<div>
									<p className="v4-kicker">{goalData?.title}</p>
									<h1>
										{state.goal === "simulate" && "Upload the document"}
										{state.goal === "preparedness" && "Upload your documents"}
										{state.goal === "compare" && "Upload the document"}
										{state.goal === "create" && "Upload your source documents"}
									</h1>
									<p className="v4-subtitle">
										{state.goal === "simulate" &&
											"This is the document the student will experience. PDF, Word, or PowerPoint."}
										{state.goal === "preparedness" &&
											"We'll compare the prep material against the assessment item by item."}
										{state.goal === "create" &&
											"One or more documents to generate a test from. Specify how many questions of each type you'd like."}
									</p>
								</div>
							</section>

							<section className="v4-panel v4-vector-span">
								<div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

									{/* Prep material zone — preparedness only */}
									{state.goal === "preparedness" && (
										<DropZone
											label="Prep / Study Material"
											hint="Notes, review sheets, or anything students used to prepare. (.txt, .doc, .docx, .rtf)"
											files={state.secondaryFiles}
											isDragging={state.secondaryDragging}
											accept={ACCEPTED_TEXT}
											multiple
											inputRef={secondaryRef}
											onDragOver={handleSecondaryDragOver}
											onDragLeave={handleSecondaryDragLeave}
											onDrop={handleSecondaryDrop}
											onChange={(files) =>
												setState((prev) => ({ ...prev, secondaryFiles: files }))
											}
											onRemove={() =>
												setState((prev) => ({ ...prev, secondaryFiles: [] }))
											}
										/>
									)}

									{/* Primary documents */}
									<DropZone
										label={
											state.goal === "preparedness"
												? "The Assessment"
												: state.goal === "create"
												? "Source Documents"
												: "Your Document"
										}
										hint={
											state.goal === "preparedness"
												? "The test or assessment students will take."
												: state.goal === "create"
												? "PDF, Word, or PowerPoint. All selected documents will be combined."
												: undefined
										}
										files={state.primaryFiles}
										isDragging={state.primaryDragging}
										accept={ACCEPTED_DOCS}
										multiple={state.goal === "create"}
										inputRef={primaryRef}
										onDragOver={handlePrimaryDragOver}
										onDragLeave={handlePrimaryDragLeave}
										onDrop={handlePrimaryDrop}
										onChange={(files) =>
											setState((prev) => ({ ...prev, primaryFiles: files }))
										}
										onRemove={() =>
											setState((prev) => ({ ...prev, primaryFiles: [] }))
										}
									/>

									{/* AI disclosure */}
									<p style={{ fontSize: "0.75rem", color: "#9c4d2b", opacity: 0.75, margin: 0 }}>
										Uploaded documents are processed by Google Gemini to generate analysis and suggestions.
										Avoid uploading files that contain student names, ID numbers, or other personal information.
									</p>

									{/* Profile multi-select chips — compare only */}
									{state.goal === "compare" && (
										<div>
											<p className="v4-kicker" style={{ marginBottom: "0.6rem" }}>
												Select 2–4 Student Profiles
											</p>
											<div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
												{STUDENT_PROFILE_PRESETS.map((p) => {
													const selected = state.selectedProfileLabels.includes(p.label);
													return (
														<button
															key={p.label}
															type="button"
															className={`v4-button v4-button-sm${
																selected ? "" : " v4-button-secondary"
															}`}
															onClick={() =>
																setState((prev) => ({
																	...prev,
																	selectedProfileLabels: selected
																		? prev.selectedProfileLabels.filter(
																			(k) => k !== p.label,
																		)
																		: prev.selectedProfileLabels.length < 4
																		? [
																			...prev.selectedProfileLabels,
																			p.label,
																		]
																		: prev.selectedProfileLabels,
																}))
															}
														>
															{selected ? "✓ " : ""}
															{p.label}
														</button>
													);
												})}
											</div>
											<p
												style={{
													fontSize: "0.8rem",
													color: "#6b5040",
													marginTop: "0.35rem",
												}}
											>
												{state.selectedProfileLabels.length} selected
												{state.selectedProfileLabels.length < 2 && " (need at least 2)"}
												{state.selectedProfileLabels.length === 4 && " (maximum reached)"}
											</p>
										</div>
									)}

									{/* Student profile — simulate + preparedness */}
									{state.goal !== "compare" && state.goal !== "create" && (
										<div>
											<label className="v4-kicker" htmlFor="ts-profile">
												Student Profile
											</label>
											<select
												id="ts-profile"
												className="v4-item-count-input"
												style={{
													marginTop: "0.5rem",
													display: "block",
													width: "auto",
													minWidth: "220px",
												}}
												value={state.selectedPreset}
												onChange={(e) => {
													const preset = STUDENT_PROFILE_PRESETS.find(
														(p) => p.label === e.target.value,
													);
													if (preset) {
														setState((prev) => ({
															...prev,
															selectedPreset: e.target.value,
															profile: preset.profile,
														}));
													}
												}}
											>
												{STUDENT_PROFILE_PRESETS.map((p) => (
													<option key={p.label} value={p.label}>
														{p.label}
													</option>
												))}
											</select>
										</div>
									)}

									{/* Question type preferences — create only */}
									{state.goal === "create" && (
										<div>
											<p className="v4-kicker" style={{ marginBottom: "0.6rem" }}>
												Question Types
											</p>
											<div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
												{(
													[
														{ key: "mcCount", label: "Multiple Choice" },
														{ key: "saCount", label: "Short Answer" },
														{ key: "frqCount", label: "Free Response" },
													] as const
												).map(({ key, label }) => (
													<label
														key={key}
														style={{
															display: "flex",
															flexDirection: "column",
															gap: "0.25rem",
															fontSize: "0.8rem",
															color: "#6b5040",
														}}
													>
														{label}
														<input
															type="number"
															min={0}
															max={30}
															className="v4-item-count-input"
															style={{ width: "72px" }}
															value={state.testPrefs[key] ?? 0}
															onChange={(e) => {
																const val = Math.max(0, Math.min(30, Number(e.target.value)));
																setState((prev) => ({
																	...prev,
																	testPrefs: { ...prev.testPrefs, [key]: val },
																}));
															}}
														/>
													</label>
												))}
											</div>
										</div>
									)}

									{state.error && (
										<p className="v4-error">{state.error}</p>
									)}

									{/* Daily usage badge */}
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
										<div
											style={{
												flex: 1,
												height: "4px",
												borderRadius: "2px",
												background: "rgba(86,57,32,0.12)",
											}}
										>
											<div
												style={{
													width: `${Math.min(100, (state.usageCount / state.usageLimit) * 100)}%`,
													height: "4px",
													borderRadius: "2px",
													background: state.usageCount >= state.usageLimit ? "#dc2626" : "#bb5b35",
													transition: "width 0.3s ease",
												}}
											/>
										</div>
										<span style={{ fontSize: "0.72rem", color: "#9c4d2b", whiteSpace: "nowrap", fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif", letterSpacing: "0.06em" }}>
											{state.usageCount} / {state.usageLimit} tokens today
										</span>
									</div>

									{/* Actions */}
									<div className="v4-upload-actions">
										<button
											type="button"
											className="v4-button"
											disabled={!canRun}
											onClick={() => void handleRun()}
										>
											{ctaLabel}
										</button>
										<button
											type="button"
											className="v4-button v4-button-secondary"
											onClick={goBackToGoals}
										>
											Back
										</button>
									</div>
								</div>
							</section>
						</>
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
							{!state.isLoading && state.narrative !== null && (
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
												{state.goal === "preparedness" && "Preparedness Analysis"}
												{state.goal === "compare" && "Profile Comparison"}
												{state.goal === "create" && "Generated Assessment"}
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
											<button
												type="button"
												className="v4-button v4-button-secondary v4-button-sm"
												onClick={handleDownload}
											>
												Download
											</button>
											<button
												type="button"
												className="v4-button v4-button-secondary v4-button-sm"
												onClick={startOver}
											>
												Start over
											</button>
										</div>
									</div>

									{/* Tab bar */}
									{(() => {
										const hasCharts =
											(state.goal === "compare" && state.parallelData !== null) ||
											(state.goal !== "compare" && state.goal !== "create" && state.simData !== null && state.simData.items.length > 0);
										const suggestions: RewriteSuggestions | undefined =
											state.goal === "compare"
												? state.parallelData?.rewriteSuggestions
												: state.simData?.rewriteSuggestions;
										const hasSuggestions =
											state.goal !== "create" &&
											suggestions != null &&
											(suggestions.testLevel.length > 0 || Object.keys(suggestions.itemLevel).length > 0);
										const hasJson =
											state.goal === "compare"
												? state.parallelData !== null
												: state.goal === "create"
												? state.testData !== null
												: state.simData !== null;
										const hasRewrite = state.rewriteResults !== null;
										const tabs: Array<{ id: ResultTab; label: string }> = [
											{ id: "narrative", label: "Narrative" },
											...(hasCharts ? [{ id: "charts" as ResultTab, label: "Charts" }] : []),
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
									)}

									{/* Tab: Charts */}
									{state.activeTab === "charts" && (
										<div style={{ width: "100%", minWidth: 0, display: "block" }}>
											{/* Structured analytics table — simulate + preparedness */}
											{state.simData && state.simData.items.length > 0 && (
												<>
													<OverallStats data={state.simData} goal={state.goal!} />
													<ItemTable data={state.simData} goal={state.goal!} />
												</>
											)}

											{/* Unified Recharts suite — works for all modes */}
											<SimulationCharts
												data={
													state.goal === "compare" && state.parallelData
														? state.parallelData
														: state.simData!
												}
											/>
										</div>
									)}
									{/* Tab: Suggestions */}
									{state.activeTab === "suggestions" && (
										<RewriteSuggestionsPanel
											suggestions={
												state.goal === "compare"
													? state.parallelData?.rewriteSuggestions
													: state.simData?.rewriteSuggestions
											}
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
											differentiationProfile={state.differentiationProfile}
											onDifferentiationProfileChange={(val: string) =>
												setState((prev) => ({ ...prev, differentiationProfile: val }))
											}
											rewriteLoading={state.rewriteLoading}
											rewriteDisabledReason={state.goal !== "compare" && state.simData && state.simData.items.length === 0
												? "This document appears to be notes. Analysis is available, but rewriting is only supported for assignments and assessments."
												: null}
											onRewrite={async () => {
													if (rewriteInFlightRef.current) return;
												const suggestions = state.goal === "compare"
													? state.parallelData?.rewriteSuggestions
													: state.simData?.rewriteSuggestions;
												if (!suggestions || !state.documentId) return;
												if (state.goal !== "compare" && state.simData && state.simData.items.length === 0) {
													setState((prev) => ({
														...prev,
														error: "This document appears to be notes. Analysis is available, but rewriting is only supported for assignments and assessments.",
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
														scope: "testLevel",
														text,
														source: "system",
														actionable: true,
														selected: Boolean(sel[`test:${index}`]),
													});
												}
												for (const [itemNum, entries] of Object.entries(suggestions.itemLevel)) {
													for (const [index, text] of entries.entries()) {
														flattenedSuggestions.push({
															id: `item:${itemNum}:${index}`,
															scope: "itemLevel",
															itemId: itemNum,
															text,
															source: "system",
															actionable: true,
															selected: Boolean(sel[`item:${itemNum}:${index}`]),
														});
													}
												}
												for (const [index, text] of teacherSuggestions.entries()) {
													flattenedSuggestions.push({
														id: `teacher:${index}`,
														scope: "testLevel",
														text,
														source: "teacher",
														actionable: true,
														selected: true,
													});
												}

												const selectedSuggestionIds = flattenedSuggestions
													.filter((entry) => entry.selected)
													.map((entry) => entry.id);
												if (selectedSuggestionIds.length === 0) {
													setState((prev) => ({
														...prev,
														error: "Select at least one rewrite suggestion.",
													}));
													return;
												}

												setState((prev) => ({ ...prev, rewriteLoading: true }));
													rewriteInFlightRef.current = true;
												try {
													const preferredItemNumbers = flattenedSuggestions
														.filter((entry) => entry.selected && entry.scope === "itemLevel")
														.map((entry) => Number(entry.itemId))
														.filter((value) => Number.isFinite(value));
													const result = await runRewriteApi({
														documentId: state.documentId ?? undefined,
														suggestions: flattenedSuggestions,
														selectedSuggestionIds,
																	preferences: state.differentiationProfile
																		? { profile: state.differentiationProfile }
																		: undefined,
													}, user?.id);

																	const preview = pickRewritePreview(
																		result,
																		preferredItemNumbers,
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
												state.goal === "compare"
													? state.parallelData
													: state.goal === "create"
													? state.testData
													: state.simData,
												null,
												2,
											)}
										</pre>
									)}

									{/* Generated test — create (always in narrative tab) */}
									{state.activeTab === "narrative" && state.goal === "create" && state.testData && state.testData.test.length > 0 && (
										<GeneratedTestView data={state.testData} />
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
