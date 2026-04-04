import { useCallback, useEffect, useRef, useState } from "react";
import {
	createStudioBlueprintApi,
	createStudioSessionFromFilesApi,
	loadStudioAnalysisApi,
	requestAssessmentOutputApi,
	rewriteStudioItemApi,
	replaceStudioItemApi,
	changeFormatStudioItemApi,
} from "../../lib/teacherStudioApi";
import type { ItemRewriteIntent } from "../../lib/teacherStudioApi";
import type { TeacherStudioOutputArtifact } from "../../prism-v4/studio/artifacts";
import type { InstructionalAnalysis } from "../../prism-v4/session/InstructionalIntelligenceSession";
import type { TestProduct, TestItem } from "../../prism-v4/schema/integration/IntentProduct";
import "./v4.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OutputMode = "assessment" | "practice" | "study_guide" | "cumulative" | "unit_plan" | "compare";

type Step = 1 | 2 | 3 | 4 | 5;

export interface ConceptRanking {
	id: string;
	included: boolean;
	rank: number; // 1 = highest priority
}

interface FlowState {
	step: Step;
	files: File[];
	sessionId: string | null;
	analysis: InstructionalAnalysis | null;
	conceptRankings: ConceptRanking[];
	outputMode: OutputMode;
	outputId: string | null;
	output: TeacherStudioOutputArtifact | null;
	isDragging: boolean;
	isLoading: boolean;
	error: string | null;
}

// ---------------------------------------------------------------------------
// CreateDocumentFlow
// ---------------------------------------------------------------------------

export function CreateDocumentFlow() {
	const [state, setState] = useState<FlowState>({
		step: 1,
		files: [],
		sessionId: null,
		analysis: null,
		conceptRankings: [],
		outputMode: "assessment",
		outputId: null,
		output: null,
		isDragging: false,
		isLoading: false,
		error: null,
	});

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load analysis when entering step 2
	useEffect(() => {
		if (state.step !== 2 || !state.sessionId) return;
		let cancelled = false;
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		loadStudioAnalysisApi(state.sessionId)
			.then(({ analysis }) => {
				if (!cancelled) setState((prev) => ({ ...prev, isLoading: false, analysis }));
			})
			.catch((err: unknown) => {
				if (!cancelled)
					setState((prev) => ({
						...prev,
						isLoading: false,
						error: err instanceof Error ? err.message : "Could not load analysis.",
					}));
			});
		return () => { cancelled = true; };
	}, [state.step, state.sessionId]);

	function setFiles(files: File[]) {
		setState((prev) => ({ ...prev, files, error: null }));
	}

	function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		setFiles(Array.from(event.target.files ?? []));
	}

	function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setState((prev) => ({ ...prev, isDragging: true }));
	}

	function handleDragLeave() {
		setState((prev) => ({ ...prev, isDragging: false }));
	}

	function handleDrop(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		const dropped = Array.from(event.dataTransfer.files).filter((f) =>
			/\.(pdf|doc|docx|ppt|pptx)$/i.test(f.name),
		);
		setState((prev) => ({
			...prev,
			isDragging: false,
			files: dropped,
			error: dropped.length === 0 ? "Drop PDF, Word, or PowerPoint files only." : null,
		}));
	}

	const handleContinue = useCallback(async () => {
		if (state.files.length === 0) {
			return;
		}
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		try {
			const { sessionId } = await createStudioSessionFromFilesApi(state.files);
			setState((prev) => ({ ...prev, isLoading: false, sessionId, step: 2 }));
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Upload failed. Please try again.",
			}));
		}
	}, [state.files]);

	const handleGenerate = useCallback(async (mode: OutputMode, itemCount: number) => {
		if (!state.sessionId) return;
		setState((prev) => ({ ...prev, isLoading: true, error: null, outputMode: mode }));
		try {
			const { blueprint, version } = await createStudioBlueprintApi({
				sessionId: state.sessionId,
				itemCount,
				conceptRankings: state.conceptRankings.length > 0 ? state.conceptRankings : undefined,
			});
			const { output } = await requestAssessmentOutputApi({
				blueprintId: blueprint.blueprintId,
				version: version.version,
				itemCount,
				adaptiveConditioning: true,
			});
			setState((prev) => ({
				...prev,
				isLoading: false,
				outputId: output.outputId,
				output,
				step: 4,
			}));
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Generation failed. Please try again.",
			}));
		}
	}, [state.sessionId, state.conceptRankings]);

	const handleAnotherVersion = useCallback(async () => {
		if (!state.output) return;
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		try {
			const { output } = await requestAssessmentOutputApi({
				blueprintId: state.output.blueprintId,
				version: state.output.blueprintVersion,
				itemCount: (state.output.options?.itemCount as number | undefined),
				adaptiveConditioning: true,
			});
			setState((prev) => ({ ...prev, isLoading: false, outputId: output.outputId, output }));
		} catch (err) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: err instanceof Error ? err.message : "Could not create another version.",
			}));
		}
	}, [state.output]);

	const handleRewriteItem = useCallback(async (itemId: string, intent: ItemRewriteIntent) => {
		if (!state.outputId) return;
		try {
			const { output } = await rewriteStudioItemApi(state.outputId, itemId, intent);
			setState((prev) => ({ ...prev, output }));
		} catch {
			// item-level error: swallow silently, button re-enables
		}
	}, [state.outputId]);

	const handleReplaceItem = useCallback(async (itemId: string) => {
		if (!state.outputId) return;
		try {
			const { output } = await replaceStudioItemApi(state.outputId, itemId);
			setState((prev) => ({ ...prev, output }));
		} catch {
			// item-level error: swallow silently
		}
	}, [state.outputId]);

	const handleChangeFormat = useCallback(async (itemId: string, format: string) => {
		if (!state.outputId) return;
		try {
			const { output } = await changeFormatStudioItemApi(state.outputId, itemId, format);
			setState((prev) => ({ ...prev, output }));
		} catch {
			// item-level error: swallow silently
		}
	}, [state.outputId]);

	return (
		<div className="v4-viewer">
			<div className="v4-shell">
				<div className="v4-viewer-grid">
					{state.step === 1 && (
						<Screen1
							files={state.files}
							isDragging={state.isDragging}
							isLoading={state.isLoading}
							error={state.error}
							fileInputRef={fileInputRef}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onFileInputChange={handleFileInputChange}
							onBrowseClick={() => fileInputRef.current?.click()}
							onContinue={() => void handleContinue()}
						/>
					)}
					{state.step === 2 && (
					<Screen2
						analysis={state.analysis}
						isLoading={state.isLoading}
						error={state.error}
						docCount={state.files.length}
						onContinue={(rankings) => setState((prev) => ({ ...prev, step: 3, conceptRankings: rankings }))}
					/>
				)}
				{state.step === 3 && (
					<Screen3
						docCount={state.files.length}
						totalOpportunities={state.analysis?.problems.reduce((s, p) => s + p.problemCount, 0) ?? 0}
						isLoading={state.isLoading}
						error={state.error}
						onGenerate={(mode, itemCount) => void handleGenerate(mode, itemCount)}
					/>
				)}
				{state.step === 4 && (
					<Screen4
						output={state.output}
						isLoading={state.isLoading}
						error={state.error}
						onAnotherVersion={() => void handleAnotherVersion()}
						onRewriteItem={handleRewriteItem}
						onReplaceItem={handleReplaceItem}
						onChangeFormat={handleChangeFormat}
						onFinalize={() => setState((prev) => ({ ...prev, step: 5 }))}
					/>
				)}
				{state.step === 5 && (
					<Screen5
						output={state.output}
						onEdit={() => setState((prev) => ({ ...prev, step: 4 }))}
						onStartOver={() =>
							setState({
								step: 1,
								files: [],
								sessionId: null,
								analysis: null,
								conceptRankings: [],
								outputMode: "assessment",
								outputId: null,
								output: null,
								isDragging: false,
								isLoading: false,
								error: null,
							})
						}
					/>
				)}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Screen 1
// ---------------------------------------------------------------------------

interface Screen1Props {
	files: File[];
	isDragging: boolean;
	isLoading: boolean;
	error: string | null;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBrowseClick: () => void;
	onContinue: () => void;
}

function Screen1({
	files,
	isDragging,
	isLoading,
	error,
	fileInputRef,
	onDragOver,
	onDragLeave,
	onDrop,
	onFileInputChange,
	onBrowseClick,
	onContinue,
}: Screen1Props) {
	const hasFiles = files.length > 0;
	const multiDoc = files.length > 1;

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Create a Document</p>
					<h1>What documents do you want to upload?</h1>
					<p className="v4-subtitle">
						Upload review sheets, notes, or existing tests.
					</p>
				</div>
			</section>

			<section className="v4-panel v4-vector-span">
				{/* Drop zone */}
				<div
					className={`v4-drop-zone${isDragging ? " v4-drop-zone--active" : ""}${hasFiles ? " v4-drop-zone--filled" : ""}`}
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
				>
					{hasFiles ? (
						<div className="v4-drop-zone-files">
							{files.map((file) => (
								<span key={file.name} className="v4-pill">
									{file.name}
								</span>
							))}
						</div>
					) : (
						<p className="v4-drop-zone-hint">
							{isDragging ? "Drop to upload" : "Drag files here"}
						</p>
					)}
				</div>

				{/* File picker */}
				<div className="v4-upload-actions">
					<button
						className="v4-button v4-button-secondary"
						type="button"
						disabled={isLoading}
						onClick={onBrowseClick}
					>
						Browse files
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf,.doc,.docx,.ppt,.pptx"
						multiple
						style={{ display: "none" }}
						onChange={onFileInputChange}
					/>
					{hasFiles && (
						<span className="v4-pill">
							{files.length} file{files.length === 1 ? "" : "s"}
						</span>
					)}
				</div>

				{error && <p className="v4-error">{error}</p>}

				{/* Intent hint */}
				{hasFiles && (
					<p className="v4-body-copy v4-intent-hint">
						{multiDoc
							? "I can compare these, build a unit plan, or create a cumulative assessment."
							: "I can build an assessment, practice set, or study guide from this."}
					</p>
				)}

				{/* Continue */}
				<div className="v4-upload-actions">
					<button
						className="v4-button"
						type="button"
						disabled={!hasFiles || isLoading}
						onClick={onContinue}
					>
						{isLoading ? "Uploading…" : "Continue"}
					</button>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen 2 — "Here's what I found"
// ---------------------------------------------------------------------------

interface Screen2Props {
	analysis: InstructionalAnalysis | null;
	isLoading: boolean;
	error: string | null;
	docCount: number;
	onContinue: (rankings: ConceptRanking[]) => void;
}

function humanizeConcept(raw: string): string {
	const last = raw.split(".").pop() ?? raw;
	return last
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

function buildNarrative(analysis: InstructionalAnalysis, docCount: number): string {
	const totalProblems = analysis.problems.reduce((sum, p) => sum + p.problemCount, 0);
	const docLabel = docCount === 1 ? "your document" : `${docCount} documents`;
	const q = totalProblems === 1 ? "question" : "questions";
	return `I can create up to ${totalProblems} ${q} from ${docLabel}.`;
}

function deriveSkills(analysis: InstructionalAnalysis): string[] {
	const modeLabels: Partial<Record<string, string>> = {
		multiple_choice: "Multiple choice",
		short_answer: "Short answer",
		long_answer: "Long answer / essay",
		true_false: "True / false",
		fill_in: "Fill in the blank",
		matching: "Matching",
		diagram: "Diagram / visual",
	};

	const skills: string[] = [];
	for (const [mode, count] of Object.entries(analysis.modeSummary)) {
		if ((count ?? 0) > 0 && modeLabels[mode]) {
			skills.push(modeLabels[mode] as string);
		}
	}
	// Fall back to top misconceptions if no modes detected
	if (skills.length === 0) {
		return analysis.misconceptions.slice(0, 3).map((m) => m.misconception);
	}
	return skills.slice(0, 3);
}

function Screen2({ analysis, isLoading, error, docCount, onContinue }: Screen2Props) {
	const allConcepts = analysis?.concepts.filter((c) => !c.isNoise).slice(0, 8) ?? [];

	// ordered holds concept IDs in display order; order index = rank.
	const [ordered, setOrdered] = useState<string[]>([]);
	const [included, setIncluded] = useState<Set<string>>(new Set());
	const dragSrcRef = useRef<string | null>(null);

	// Initialize when analysis arrives.
	useEffect(() => {
		if (allConcepts.length === 0) return;
		const ids = allConcepts.map((c) => c.concept);
		setOrdered(ids);
		setIncluded(new Set(ids));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allConcepts.map((c) => c.concept).join(",")]);

	function toggleIncluded(id: string) {
		setIncluded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	}

	function handleDragStart(id: string) {
		if (!included.has(id)) return;
		dragSrcRef.current = id;
	}

	function handleDragOver(e: React.DragEvent, id: string) {
		e.preventDefault();
		const src = dragSrcRef.current;
		if (!src || src === id || !included.has(src)) return;
		setOrdered((prev) => {
			const next = [...prev];
			const from = next.indexOf(src);
			const to = next.indexOf(id);
			if (from === -1 || to === -1) return prev;
			next.splice(from, 1);
			next.splice(to, 0, src);
			return next;
		});
	}

	function handleDragEnd() {
		dragSrcRef.current = null;
	}

	// Derive ConceptRanking[] from current ordered/included state for onContinue.
	function buildRankings(): ConceptRanking[] {
		return ordered.map((id, i) => ({ id, included: included.has(id), rank: i + 1 }));
	}

	if (isLoading) {
		return (
			<section className="v4-panel v4-vector-span">
				<p className="v4-kicker">Step 2 of 5</p>
				<h2>Here's what I found in your document{docCount === 1 ? "" : "s"}.</h2>
				<p className="v4-body-copy v4-analysis-loading">Analyzing…</p>
			</section>
		);
	}

	if (error) {
		return (
			<section className="v4-panel v4-vector-span">
				<p className="v4-kicker">Step 2 of 5</p>
				<h2>Here's what I found in your document{docCount === 1 ? "" : "s"}.</h2>
				<p className="v4-error">{error}</p>
			</section>
		);
	}

	if (!analysis) return null;

	const totalOpportunities = analysis.problems.reduce((sum, p) => sum + p.problemCount, 0);
	const skills = deriveSkills(analysis);
	const narrative = buildNarrative(analysis, docCount);

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Step 2 of 5</p>
					<h1>Here's what I found in your document{docCount === 1 ? "" : "s"}.</h1>
					<p className="v4-subtitle">{narrative}</p>
				</div>
			</section>

			<section className="v4-panel">
				<p className="v4-kicker">Question opportunities</p>
				<div className="v4-analysis-big-number">{totalOpportunities}</div>
				<p className="v4-stat-label">
					across {analysis.problems.length} {analysis.problems.length === 1 ? "document" : "documents"}
				</p>
			</section>

			<section className="v4-panel">
				<p className="v4-kicker">Concepts</p>
				<p className="v4-body-copy v4-concept-hint">Drag to set priority. Top = most questions. Toggle to include or exclude.</p>
				{allConcepts.length > 0 ? (
					<ul className="v4-concept-list">
						{ordered.map((id, index) => {
							const isIncluded = included.has(id);
							const meta = allConcepts.find((c) => c.concept === id);
							const position = index + 1;
							return (
								<li
									key={id}
									className={`v4-concept-item${isIncluded ? "" : " v4-concept-item--excluded"}`}
									draggable={isIncluded}
									onDragStart={() => handleDragStart(id)}
									onDragOver={(e) => handleDragOver(e, id)}
									onDragEnd={handleDragEnd}
								>
									<span
										className={`v4-concept-handle${isIncluded ? "" : " v4-concept-handle--disabled"}`}
										aria-hidden="true"
									>
										⠿
									</span>
									<label className="v4-concept-toggle">
										<input
											type="checkbox"
											checked={isIncluded}
											onChange={() => toggleIncluded(id)}
										/>
										<span className="v4-concept-name">{humanizeConcept(id)}</span>
									</label>
									<div className="v4-concept-meta">
										{meta && (
											<span className="v4-stat-label">{meta.problemCount}{meta.problemCount === 1 ? " q" : " qs"}</span>
										)}
										{isIncluded && (
											<span className="v4-concept-position-badge">{position}</span>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="v4-body-copy">No concepts detected.</p>
				)}
			</section>

			{skills.length > 0 && (
				<section className="v4-panel">
					<p className="v4-kicker">Skill types</p>
					<div className="v4-skills-row">
						{skills.map((s) => (
							<span key={s} className="v4-pill">{s}</span>
						))}
					</div>
				</section>
			)}

			<section className="v4-panel v4-vector-span">
				<div className="v4-upload-actions">
					<button className="v4-button" type="button" onClick={() => onContinue(buildRankings())}>
						What do you want to create?
					</button>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen 3 — Choose output type
// ---------------------------------------------------------------------------

const SINGLE_DOC_OPTIONS: Array<{ mode: OutputMode; label: string; description: string }> = [
	{ mode: "assessment", label: "Assessment", description: "Graded test with scored questions" },
	{ mode: "practice", label: "Practice set", description: "Unscored exercises for review" },
	{ mode: "study_guide", label: "Study guide", description: "Summary + key questions for self-study" },
];

const MULTI_DOC_OPTIONS: Array<{ mode: OutputMode; label: string; description: string }> = [
	{ mode: "cumulative", label: "Cumulative assessment", description: "Single test covering all documents" },
	{ mode: "unit_plan", label: "Unit plan", description: "Sequenced activities across the unit" },
	{ mode: "compare", label: "Compare documents", description: "Side-by-side analysis of content overlap" },
];

interface Screen3Props {
	docCount: number;
	totalOpportunities: number;
	isLoading: boolean;
	error: string | null;
	onGenerate: (mode: OutputMode, itemCount: number) => void;
}

function Screen3({ docCount, totalOpportunities, isLoading, error, onGenerate }: Screen3Props) {
	const options = docCount > 1 ? MULTI_DOC_OPTIONS : SINGLE_DOC_OPTIONS;
	const defaultCount = Math.min(totalOpportunities, 10);
	const [selectedMode, setSelectedMode] = useState<OutputMode>(options[0].mode);
	const [itemCount, setItemCount] = useState(defaultCount > 0 ? defaultCount : 8);

	const isCompare = selectedMode === "compare";

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Step 3 of 5</p>
					<h1>What do you want to create?</h1>
				</div>
			</section>

			<section className="v4-panel v4-vector-span">
				<p className="v4-kicker">Document type</p>
				<div className="v4-mode-options">
					{options.map((opt) => (
						<button
							key={opt.mode}
							type="button"
							className={`v4-mode-card${selectedMode === opt.mode ? " v4-mode-card--selected" : ""}`}
							onClick={() => setSelectedMode(opt.mode)}
						>
							<span className="v4-mode-label">{opt.label}</span>
							<span className="v4-mode-desc">{opt.description}</span>
						</button>
					))}
				</div>
			</section>

			{!isCompare && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-kicker">Number of questions</p>
					<div className="v4-item-count-row">
						<input
							className="v4-item-count-input"
							type="number"
							min={1}
							max={totalOpportunities > 0 ? totalOpportunities : 100}
							value={itemCount}
							onChange={(e) => setItemCount(Math.max(1, Number(e.target.value)))}
						/>
						{totalOpportunities > 0 && (
							<span className="v4-stat-label">up to {totalOpportunities} available</span>
						)}
					</div>
				</section>
			)}

			{error && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-error">{error}</p>
				</section>
			)}

			<section className="v4-panel v4-vector-span">
				<div className="v4-upload-actions">
					{isCompare ? (
						<p className="v4-body-copy v4-intent-hint">Document comparison is coming soon.</p>
					) : (
						<button
							className="v4-button"
							type="button"
							disabled={isLoading}
							onClick={() => onGenerate(selectedMode, itemCount)}
						>
							{isLoading ? "Generating…" : "Generate"}
						</button>
					)}
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen 4 — View & Edit the Document
// ---------------------------------------------------------------------------

const REWRITE_INTENT_LABELS: Record<ItemRewriteIntent, string> = {
	easier: "Make easier",
	harder: "Make harder",
	change_numbers: "Change numbers",
	real_world: "Add real-world context",
	concise: "Make concise",
	student_friendly: "Make student-friendly",
	academic: "Make more academic",
};

const FORMAT_DISPLAY: Record<string, string> = {
	TF: "True / False",
	MC: "Multiple Choice",
	MS: "Multiple Select",
	Matching: "Matching",
	DnD: "Drag & Drop",
	Sorting: "Ordering",
	SA: "Short Answer",
	FRQ: "Free Response",
};

const ALL_FORMATS = ["TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ"] as const;

function formatTime(seconds: number): string {
	if (seconds < 60) return `~${seconds}s`;
	return `~${Math.round(seconds / 60)}m`;
}

/** Strip trailing inline choice labels (A. B. C. D.) that the LLM sometimes
 *  leaks into the prompt field despite the instruction to keep stem-only. */
function stripInlineChoices(prompt: string): string {
	// Remove lines that look like "A. some choice text" from the end of the prompt
	return prompt
		.split("\n")
		.filter((line) => !/^\s*[A-E]\.\s+/.test(line))
		.join("\n")
		.trim();
}

// ── Structured answer renderer ─────────────────────────────────────────────
// Renders format-specific answer choices/pairs/parts based on item.structuredAnswer.
// Falls back to a plain answer-space line when structuredAnswer is absent or
// the format is SA / unknown.

function StructuredAnswerView({ item }: { item: TestItem }) {
	const sa = item.structuredAnswer;
	const fmt = item.problemType;

	if ((fmt === "MC" || fmt === "MS") && sa && typeof sa === "object" && !Array.isArray(sa)) {
		const data = sa as { correct?: string | string[]; choices?: string[] };
		if (Array.isArray(data.choices) && data.choices.length > 0) {
			const correct: string[] = Array.isArray(data.correct)
				? data.correct
				: data.correct
				? [data.correct]
				: [];
			const isCheckbox = fmt === "MS";
			return (
				<ul className="v4-choices-list">
					{data.choices.map((choice, i) => {
						const labelMatch = choice.match(/^([A-E])\./)?.[1];
						const label = labelMatch ?? String.fromCharCode(65 + i);
						const isCorrect = correct.includes(label);
						return (
							<li key={i} className={`v4-choice-row${isCorrect ? " v4-choice-correct" : ""}`}>
								<span className={isCheckbox ? "v4-choice-checkbox" : "v4-choice-radio"} aria-hidden="true" />
								<span className="v4-choice-label">{label}.</span>
								<span className="v4-choice-text">{choice.replace(/^[A-E]\.\s*/, "")}</span>
							</li>
						);
					})}
				</ul>
			);
		}
	}

	if (fmt === "TF") {
		const correct = typeof sa === "string" ? sa : null;
		return (
			<div className="v4-tf-options">
				{(["True", "False"] as const).map((opt) => (
					<span key={opt} className={`v4-tf-option${correct === opt ? " v4-tf-option--correct" : ""}`}>{opt}</span>
				))}
			</div>
		);
	}

	if (fmt === "Matching" && sa && typeof sa === "object" && !Array.isArray(sa)) {
		const pairs = sa as Record<string, string>;
		const entries = Object.entries(pairs);
		if (entries.length > 0) {
			return (
				<div className="v4-matching-pairs">
					{entries.map(([term, def], i) => (
						<div key={i} className="v4-matching-row">
							<span className="v4-matching-term">{term}</span>
							<span className="v4-matching-arrow">→</span>
							<span className="v4-matching-def">{def}</span>
						</div>
					))}
				</div>
			);
		}
	}

	if ((fmt === "Sorting" || fmt === "DnD") && Array.isArray(sa) && sa.length > 0) {
		return (
			<ol className="v4-ordered-items">
				{(sa as string[]).map((it, i) => <li key={i}>{it}</li>)}
			</ol>
		);
	}

	// DnD can also be { item: category } pairs
	if (fmt === "DnD" && sa && typeof sa === "object" && !Array.isArray(sa)) {
		const entries = Object.entries(sa as Record<string, string>);
		if (entries.length > 0) {
			return (
				<div className="v4-dnd-pairs">
					{entries.map(([label, category], i) => (
						<div key={i} className="v4-dnd-pair">
							<span className="v4-dnd-item">{label}</span>
							<span className="v4-dnd-arrow">→</span>
							<span className="v4-dnd-category">{category}</span>
						</div>
					))}
				</div>
			);
		}
	}

	if (fmt === "FRQ" && sa && typeof sa === "object" && !Array.isArray(sa)) {
		const parts = sa as Record<string, string>;
		const keys = ["partA", "partB", "partC", "partD"].filter((k) => parts[k]);
		if (keys.length > 0) {
			return (
				<div className="v4-frq-parts">
					{keys.map((key) => (
						<div key={key} className="v4-frq-part">
							<div className="v4-frq-part-label">{key.replace("part", "Part ")}</div>
							<div className="v4-question-answer-space" aria-hidden="true" />
						</div>
					))}
				</div>
			);
		}
	}

	// Default: SA (null structuredAnswer) or unknown fallback.
	// If structuredAnswer is defined but none of the format branches above
	// could render it (e.g. malformed LLM data), don't show a spurious blank line.
	if (sa != null) return null;
	return <div className="v4-question-answer-space" aria-hidden="true" />;
}

interface Screen4Props {
	output: TeacherStudioOutputArtifact | null;
	isLoading: boolean;
	error: string | null;
	onAnotherVersion: () => void;
	onRewriteItem: (itemId: string, intent: ItemRewriteIntent) => Promise<void>;
	onReplaceItem: (itemId: string) => Promise<void>;
	onChangeFormat: (itemId: string, format: string) => Promise<void>;
	onFinalize: () => void;
}

function Screen4({ output, isLoading, error, onAnotherVersion, onRewriteItem, onReplaceItem, onChangeFormat, onFinalize }: Screen4Props) {
	const payload = output?.payload as TestProduct | null | undefined;
	const sections = payload?.sections ?? [];
	const totalItems = payload?.totalItemCount ?? sections.reduce((s, sec) => s + sec.items.length, 0);

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Step 4 of 5</p>
					<h1>{payload?.title || "Here's the document you asked for."}</h1>
					{payload?.overview && <p className="v4-subtitle">{payload.overview}</p>}
				</div>
				<div className="v4-upload-actions">
					{payload?.estimatedDurationMinutes && (
						<span className="v4-pill">~{payload.estimatedDurationMinutes} min</span>
					)}
					<span className="v4-pill">{totalItems} {totalItems === 1 ? "question" : "questions"}</span>
					<button
						className="v4-button v4-button-secondary"
						type="button"
						disabled={isLoading}
						onClick={onAnotherVersion}
					>
						{isLoading ? "Working…" : "Create another version"}
					</button>
				</div>
			</section>

			{error && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-error">{error}</p>
				</section>
			)}

			{sections.map((section, sectionIndex) => (
				<AssessmentSection
					key={section.concept}
					section={section}
					sectionIndex={sectionIndex}
					startNumber={sections.slice(0, sectionIndex).reduce((s, sec) => s + sec.items.length, 1)}
					onRewriteItem={onRewriteItem}
					onReplaceItem={onReplaceItem}
					onChangeFormat={onChangeFormat}
				/>
			))}

			<section className="v4-panel v4-vector-span">
				<div className="v4-upload-actions">
					<button className="v4-button" type="button" onClick={onFinalize}>
						Finalize
					</button>
				</div>
			</section>
		</>
	);
}

interface AssessmentSectionProps {
	section: { concept: string; items: TestItem[] };
	sectionIndex: number;
	startNumber: number;
	onRewriteItem: (itemId: string, intent: ItemRewriteIntent) => Promise<void>;
	onReplaceItem: (itemId: string) => Promise<void>;
	onChangeFormat: (itemId: string, format: string) => Promise<void>;
}

function AssessmentSection({ section, sectionIndex: _sectionIndex, startNumber, onRewriteItem, onReplaceItem, onChangeFormat }: AssessmentSectionProps) {
	const sectionSeconds = section.items.reduce((s, item) => s + (item.estimatedTimeSeconds ?? 0), 0);
	return (
			<section className="v4-panel v4-vector-span v4-assessment-section">
				<div className="v4-section-header">
					<p className="v4-kicker">{humanizeConcept(section.concept)}</p>
					{sectionSeconds > 0 && (
						<span className="v4-time-badge">{formatTime(sectionSeconds)}</span>
					)}
				</div>
				<ol className="v4-question-list" start={startNumber}>
						{section.items.map((item) => (
								<AssessmentItem
										key={item.itemId}
										item={item}
										onRewrite={onRewriteItem}
										onReplace={onReplaceItem}
										onChangeFormat={onChangeFormat}
								/>
						))}
				</ol>
		</section>
	);
}

interface AssessmentItemProps {
	item: TestItem;
	onRewrite: (itemId: string, intent: ItemRewriteIntent) => Promise<void>;
	onReplace: (itemId: string) => Promise<void>;
	onChangeFormat: (itemId: string, format: string) => Promise<void>;
}

function AssessmentItem({ item, onRewrite, onReplace, onChangeFormat }: AssessmentItemProps) {
	const [busy, setBusy] = useState(false);
	const [menuOpen, setMenuOpen] = useState<"rewrite" | "format" | null>(null);
	const [justUpdated, setJustUpdated] = useState(false);

	// Flash + scroll when the item content changes (format change or rewrite)
	const prevPromptRef = useRef(item.prompt);
	const wrapperRef = useRef<HTMLLIElement>(null);
	useEffect(() => {
		if (prevPromptRef.current !== item.prompt) {
			prevPromptRef.current = item.prompt;
			setJustUpdated(true);
			wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
			const t = setTimeout(() => setJustUpdated(false), 900);
			return () => clearTimeout(t);
		}
	}, [item.prompt]);

	async function handleRewrite(intent: ItemRewriteIntent) {
		setMenuOpen(null);
		setBusy(true);
		await onRewrite(item.itemId, intent);
		setBusy(false);
	}

	async function handleReplace() {
		setBusy(true);
		await onReplace(item.itemId);
		setBusy(false);
	}

	async function handleChangeFormat(format: string) {
		setMenuOpen(null);
		setBusy(true);
		await onChangeFormat(item.itemId, format);
		setBusy(false);
	}

	// Close menus on outside click
	useEffect(() => {
		if (!menuOpen) return;
		function onOutside(e: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setMenuOpen(null);
			}
		}
		document.addEventListener("mousedown", onOutside);
		return () => document.removeEventListener("mousedown", onOutside);
	}, [menuOpen]);

	const fmt = item.problemType;
	const timeLabel = item.estimatedTimeSeconds ? formatTime(item.estimatedTimeSeconds) : null;

	// Sanitise prompt: strip any inline A/B/C/D choice lines the LLM leaked
	const cleanPrompt = (fmt === "MC" || fmt === "MS") ? stripInlineChoices(item.prompt) : item.prompt;

	// Stem / part splitting for legacy multi-part prompts (a) b) c) pattern)
	const PART_LABEL = /^[a-z]\) /;
	const segments = cleanPrompt.includes("\n\n") ? cleanPrompt.split("\n\n") : null;
	const firstPartIdx = segments ? segments.findIndex((s) => PART_LABEL.test(s.trim())) : -1;
	const stemSegments = firstPartIdx > 0 ? segments!.slice(0, firstPartIdx) : [];
	const partSegments = segments
		? firstPartIdx >= 0
			? segments.slice(firstPartIdx)
			: segments
		: null;

	// For FRQ with structuredAnswer parts, skip the legacy part-splitting
	const hasFrqParts =
		fmt === "FRQ" &&
		item.structuredAnswer &&
		typeof item.structuredAnswer === "object" &&
		!Array.isArray(item.structuredAnswer) &&
		Object.keys(item.structuredAnswer as object).some((k) => k.startsWith("part"));

	return (
		<li id={item.itemId} className={`v4-question-item${justUpdated ? " v4-updated" : ""}`} ref={wrapperRef}>
			{/* Format badge + estimated time */}
			{(fmt || timeLabel) && (
				<div className="v4-item-meta">
					{fmt && (
						<span className="v4-format-badge">{FORMAT_DISPLAY[fmt] ?? fmt}</span>
					)}
					{timeLabel && <span className="v4-time-badge">{timeLabel}</span>}
				</div>
			)}

			{/* Prompt / stem */}
			{hasFrqParts ? (
			<p className="v4-question-prompt">{cleanPrompt}</p>
		) : stemSegments.length > 0 ? (
			<>
				<p className="v4-question-stem">{stemSegments.join(" ")}</p>
				<div className="v4-question-parts">
					{partSegments!.map((part, i) => (
						<div key={i} className="v4-question-part">
							<p className="v4-question-prompt">{part}</p>
							{!item.structuredAnswer && <div className="v4-question-answer-space" aria-hidden="true" />}
						</div>
					))}
				</div>
			</>
		) : partSegments && partSegments.length > 0 ? (
			<div className="v4-question-parts">
				{partSegments.map((part, i) => (
					<div key={i} className="v4-question-part">
						<p className="v4-question-prompt">{part}</p>
						{!item.structuredAnswer && <div className="v4-question-answer-space" aria-hidden="true" />}
					</div>
				))}
			</div>
		) : (
			<p className="v4-question-prompt">{cleanPrompt}</p>
		)}

			{/* Format-specific answer display */}
			<StructuredAnswerView item={item} />

			{/* Actions row */}
			<div className="v4-question-actions">
				{/* Rewrite menu */}
				<div className="v4-rewrite-menu-wrapper">
					<button
						className="v4-button v4-button-secondary v4-button-sm"
						type="button"
						disabled={busy}
						onClick={() => setMenuOpen((o) => (o === "rewrite" ? null : "rewrite"))}
					>
						{busy ? "…" : "Rewrite ▾"}
					</button>
					{menuOpen === "rewrite" && (
						<div className="v4-rewrite-menu">
							{(Object.entries(REWRITE_INTENT_LABELS) as Array<[ItemRewriteIntent, string]>).map(([intent, label]) => (
								<button
									key={intent}
									className="v4-rewrite-menu-item"
									type="button"
									onClick={() => void handleRewrite(intent)}
								>
									{label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Change Format menu */}
				<div className="v4-rewrite-menu-wrapper">
					<button
						className="v4-button v4-button-secondary v4-button-sm"
						type="button"
						disabled={busy}
						onClick={() => setMenuOpen((o) => (o === "format" ? null : "format"))}
					>
						Format ▾
					</button>
					{menuOpen === "format" && (
						<div className="v4-rewrite-menu">
							{ALL_FORMATS.map((f) => (
								<button
									key={f}
									className={`v4-rewrite-menu-item${f === fmt ? " v4-rewrite-menu-item--active" : ""}`}
									type="button"
									disabled={f === fmt}
									onClick={() => void handleChangeFormat(f)}
								>
									{FORMAT_DISPLAY[f]}
								</button>
							))}
						</div>
					)}
				</div>

				<button
					className="v4-button v4-button-secondary v4-button-sm"
					type="button"
					disabled={busy}
					onClick={() => void handleReplace()}
				>
					Replace
				</button>
			</div>
		</li>
	);
}

// ---------------------------------------------------------------------------
// Screen 5 — Finalize & Export
// ---------------------------------------------------------------------------

interface Screen5Props {
	output: TeacherStudioOutputArtifact | null;
	onEdit: () => void;
	onStartOver: () => void;
}

function buildPlainText(product: TestProduct, versionName: string): string {
	const lines: string[] = [];
	const title = versionName.trim() || product.title;
	lines.push(title);
	lines.push("=".repeat(title.length));
	if (product.overview) {
		lines.push("");
		lines.push(product.overview);
	}
	if (product.estimatedDurationMinutes) {
		lines.push(`Estimated time: ${product.estimatedDurationMinutes} minutes`);
	}
	lines.push("");

	const PART_LABEL_RE = /^[a-z]\) /;

	function renderItem(n: number, prompt: string): string[] {
		const out: string[] = [];
		if (prompt.includes("\n\n")) {
			const segs = prompt.split("\n\n");
			const firstPart = segs.findIndex((s) => PART_LABEL_RE.test(s.trim()));
			const stem = firstPart > 0 ? segs.slice(0, firstPart).join(" ") : null;
			const parts = firstPart >= 0 ? segs.slice(firstPart) : segs;
			if (stem) out.push(`${n}. ${stem}`);
			else out.push(`${n}.`);
			for (const part of parts) {
				out.push("");
				out.push(`   ${part.trim()}`);
				out.push("");
				out.push("   Answer: _______________________________________________");
			}
		} else {
			out.push(`${n}. ${prompt}`);
			out.push("");
			out.push("Answer: _______________________________________________");
		}
		out.push("");
		return out;
	}

	let questionNumber = 1;
	for (const section of product.sections) {
		lines.push(humanizeConcept(section.concept));
		lines.push("-".repeat(humanizeConcept(section.concept).length));
		for (const item of section.items) {
			lines.push(...renderItem(questionNumber, item.prompt));
			questionNumber++;
		}
	}
	return lines.join("\n");
}

function Screen5({ output, onEdit, onStartOver }: Screen5Props) {
	const payload = output?.payload as TestProduct | null | undefined;
	const [versionName, setVersionName] = useState(payload?.title ?? "");
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

	const totalItems = payload
		? payload.totalItemCount ?? payload.sections.reduce((s, sec) => s + sec.items.length, 0)
		: 0;

	function handleDownload() {
		if (!payload) return;
		const text = buildPlainText(payload, versionName);
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${(versionName.trim() || payload.title).replace(/[^a-z0-9]/gi, "_")}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleCopy() {
		if (!payload) return;
		const text = buildPlainText(payload, versionName);
		try {
			await navigator.clipboard.writeText(text);
			setCopyStatus("copied");
			setTimeout(() => setCopyStatus("idle"), 2000);
		} catch {
			setCopyStatus("error");
			setTimeout(() => setCopyStatus("idle"), 2000);
		}
	}

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Step 5 of 5</p>
					<h1>Your document is ready.</h1>
					{payload && (
						<p className="v4-subtitle">
							{totalItems} {totalItems === 1 ? "question" : "questions"}
							{payload.estimatedDurationMinutes
								? ` · ~${payload.estimatedDurationMinutes} min`
								: ""}
						</p>
					)}
				</div>
			</section>

			{payload ? (
				<>
					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">Version name</p>
						<input
							className="v4-version-name-input"
							type="text"
							value={versionName}
							placeholder={payload.title}
							maxLength={120}
							onChange={(e) => setVersionName(e.target.value)}
						/>
					</section>

					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">Export</p>
						<div className="v4-export-actions">
							<button className="v4-button" type="button" onClick={handleDownload}>
								Download .txt
							</button>
							<button
								className="v4-button v4-button-secondary"
								type="button"
								onClick={() => void handleCopy()}
							>
								{copyStatus === "copied"
									? "Copied!"
									: copyStatus === "error"
										? "Could not copy"
										: "Copy to clipboard"}
							</button>
						</div>
					</section>

					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">What's next?</p>
						<div className="v4-export-actions">
							<button
								className="v4-button v4-button-secondary"
								type="button"
								onClick={onEdit}
							>
								← Back to edit
							</button>
							<button
								className="v4-button v4-button-secondary"
								type="button"
								onClick={onStartOver}
							>
								Start a new document
							</button>
						</div>
					</section>
				</>
			) : (
				<section className="v4-panel v4-vector-span">
					<p className="v4-body-copy">No document to export. Go back and generate one first.</p>
					<div className="v4-upload-actions">
						<button className="v4-button v4-button-secondary" type="button" onClick={onEdit}>
							← Back to edit
						</button>
					</div>
				</section>
			)}
		</>
	);
}
