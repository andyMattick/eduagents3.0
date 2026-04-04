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
import type { TestProduct, TestItem, Misconception } from "../../prism-v4/schema/integration/IntentProduct";
import { exportTestPDF, exportAnswerKeyPDF } from "../../utils/exportTestProductPDF";
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
	isCustom?: boolean; // true for teacher-added "Other" concepts
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

	const handleGenerate = useCallback(async (mode: OutputMode, itemCount: number, difficultyBias: "easy" | "mixed" | "hard", allowedFormats: string[], targetTimeMinutes?: number) => {
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
				difficultyBias,
				allowedFormats,
				targetTimeMinutes,
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
						conceptCount={state.conceptRankings.filter((r) => r.included !== false).length || (state.analysis?.concepts.filter((c) => !c.isNoise).length ?? 1)}
						isLoading={state.isLoading}
						error={state.error}
						onGenerate={(mode, itemCount, difficultyBias, allowedFormats, targetTimeMinutes) => void handleGenerate(mode, itemCount, difficultyBias, allowedFormats, targetTimeMinutes)}
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
	const [customConcepts, setCustomConcepts] = useState<string[]>([]);
	const [customInput, setCustomInput] = useState("");
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
		const baseRankings = ordered.map((id, i) => ({ id, included: included.has(id), rank: i + 1 }));
		const customRankings = customConcepts.map((id, i) => ({
			id,
			included: true,
			rank: ordered.length + i + 1,
			isCustom: true,
		}));
		return [...baseRankings, ...customRankings];
	}

	function addCustomConcept() {
		const trimmed = customInput.trim();
		if (!trimmed || customConcepts.includes(trimmed) || ordered.includes(trimmed)) return;
		setCustomConcepts((prev) => [...prev, trimmed]);
		setCustomInput("");
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

				{customConcepts.length > 0 && (
					<ul className="v4-concept-list" style={{ marginTop: "0.75rem" }}>
						{customConcepts.map((id) => (
							<li key={id} className="v4-concept-item">
								<span className="v4-concept-handle v4-concept-handle--disabled" aria-hidden="true">⠿</span>
								<span className="v4-concept-name">{id}</span>
								<button
									type="button"
									className="v4-concept-remove"
									aria-label={`Remove ${id}`}
									onClick={() => setCustomConcepts((prev) => prev.filter((c) => c !== id))}
								>
									✕
								</button>
							</li>
						))}
					</ul>
				)}

				<div className="v4-custom-concept-row">
					<input
						className="v4-item-count-input"
						type="text"
						placeholder="Add another concept…"
						value={customInput}
						maxLength={80}
						onChange={(e) => setCustomInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomConcept(); } }}
					/>
					<button
						type="button"
						className="v4-button v4-button-secondary v4-button-sm"
						onClick={addCustomConcept}
					>
						Add
					</button>
				</div>
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

const TIME_CHIPS: Array<{ label: string; value: number | null }> = [
	{ label: "10 min", value: 10 },
	{ label: "20 min", value: 20 },
	{ label: "45 min", value: 45 },
	{ label: "Custom", value: null },
];

interface Screen3Props {
	docCount: number;
	totalOpportunities: number;
	conceptCount: number;
	isLoading: boolean;
	error: string | null;
	onGenerate: (mode: OutputMode, itemCount: number, difficultyBias: "easy" | "mixed" | "hard", allowedFormats: string[], targetTimeMinutes?: number) => void;
}

const ALL_DIFFICULTY_OPTIONS: { value: "easy" | "mixed" | "hard"; label: string }[] = [
	{ value: "easy", label: "Easy" },
	{ value: "mixed", label: "Mixed" },
	{ value: "hard", label: "Hard" },
];

const ALL_FORMAT_OPTIONS: { value: string; label: string }[] = [
	{ value: "TF", label: "True / False" },
	{ value: "MC", label: "Multiple Choice" },
	{ value: "MS", label: "Multi-Select" },
	{ value: "Matching", label: "Matching" },
	{ value: "Sorting", label: "Sorting" },
	{ value: "SA", label: "Short Answer" },
	{ value: "FRQ", label: "Free Response" },
];

function Screen3({ docCount, totalOpportunities, conceptCount, isLoading, error, onGenerate }: Screen3Props) {
	const options = docCount > 1 ? MULTI_DOC_OPTIONS : SINGLE_DOC_OPTIONS;
	// Max questions: concepts × formats × 2, capped at 40 (not limited by extracted problem count)
	const maxQuestions = Math.min(Math.max(conceptCount * ALL_FORMAT_OPTIONS.length * 2, 20), 40);
	const defaultCount = Math.min(totalOpportunities > 0 ? totalOpportunities : 10, maxQuestions);
	const [selectedMode, setSelectedMode] = useState<OutputMode>(options[0].mode);
	const [itemCount, setItemCount] = useState(defaultCount > 0 ? defaultCount : 8);
	const [difficultyBias, setDifficultyBias] = useState<"easy" | "mixed" | "hard">("mixed");
	const [allowedFormats, setAllowedFormats] = useState<string[]>(ALL_FORMAT_OPTIONS.map((f) => f.value));
	const [selectedTimeChip, setSelectedTimeChip] = useState<number | null | undefined>(undefined); // undefined = not set
	const [customMinutes, setCustomMinutes] = useState<number>(30);

	const targetTimeMinutes =
		selectedTimeChip === null ? customMinutes :
		selectedTimeChip !== undefined ? selectedTimeChip :
		undefined;

	const isCompare = selectedMode === "compare";

	function toggleFormat(value: string) {
		setAllowedFormats((prev) =>
			prev.includes(value)
				? prev.length > 1 ? prev.filter((f) => f !== value) : prev // keep at least 1
				: [...prev, value]
		);
	}

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
							max={maxQuestions}
							value={itemCount}
							onChange={(e) => setItemCount(Math.max(1, Math.min(maxQuestions, Number(e.target.value))))}
						/>
						<span className="v4-stat-label">up to {maxQuestions} questions</span>
					</div>
				</section>
			)}

			{!isCompare && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-kicker">Difficulty distribution</p>
					<div className="v4-mode-options">
						{ALL_DIFFICULTY_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								className={`v4-mode-card${difficultyBias === opt.value ? " v4-mode-card--selected" : ""}`}
								onClick={() => setDifficultyBias(opt.value)}
							>
								<span className="v4-mode-label">{opt.label}</span>
							</button>
						))}
					</div>
				</section>
			)}

			{!isCompare && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-kicker">Target time</p>
					<div className="v4-time-chips">
						{TIME_CHIPS.map((chip) => (
							<button
								key={chip.label}
								type="button"
								className={`v4-time-chip${selectedTimeChip === chip.value ? " v4-time-chip--selected" : ""}`}
								onClick={() => setSelectedTimeChip(chip.value === selectedTimeChip ? undefined : chip.value)}
							>
								{chip.label}
							</button>
						))}
					</div>
					{selectedTimeChip === null && (
						<div className="v4-item-count-row" style={{ marginTop: "0.5rem" }}>
							<input
								type="number"
								className="v4-item-count-input"
								min={5}
								max={120}
								value={customMinutes}
								onChange={(e) => setCustomMinutes(Math.max(5, Number(e.target.value)))}
							/>
							<span className="v4-stat-label">minutes</span>
						</div>
					)}
				</section>
			)}

			{!isCompare && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-kicker">Question formats</p>
					<div className="v4-format-checkboxes">
						{ALL_FORMAT_OPTIONS.map((opt) => (
							<label key={opt.value} className="v4-format-checkbox-label">
								<input
									type="checkbox"
									checked={allowedFormats.includes(opt.value)}
									onChange={() => toggleFormat(opt.value)}
								/>
								{opt.label}
							</label>
						))}
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
							onClick={() => onGenerate(selectedMode, itemCount, difficultyBias, allowedFormats, targetTimeMinutes)}
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
// AnswerKeyView — inline answer key for Screen 4
// ---------------------------------------------------------------------------

function AnswerKeyItem({ item, num, showMisconceptions }: { item: TestItem; num: number; showMisconceptions: boolean }) {
	const [open, setOpen] = useState(false);
	const fmt = item.problemType ?? "SA";
	const sa = item.structuredAnswer as Record<string, unknown> | string | null | undefined;

	let correctAnswer = "";
	if (fmt === "TF") {
		correctAnswer = typeof sa === "string" ? sa : item.answerGuidance ?? "—";
	} else if (fmt === "MC") {
		correctAnswer = (sa as { correct?: string } | null)?.correct ?? item.answerGuidance ?? "—";
	} else if (fmt === "MS") {
		const c = (sa as { correct?: string[] } | null)?.correct;
		correctAnswer = Array.isArray(c) ? c.join(", ") : item.answerGuidance ?? "—";
	} else if (fmt === "Matching") {
		const pairs = (typeof sa === "object" && sa !== null && !Array.isArray(sa))
			? Object.entries(sa as Record<string, string>).map(([t, d]) => `${t} → ${d}`).join("; ")
			: item.answerGuidance ?? "—";
		correctAnswer = pairs;
	} else if (fmt === "Sorting") {
		correctAnswer = Array.isArray(sa) ? (sa as string[]).join(" → ") : item.answerGuidance ?? "—";
	} else if (fmt === "FRQ") {
		correctAnswer = "See parts below";
	} else {
		correctAnswer = typeof sa === "string" ? sa : item.answerGuidance ?? "—";
	}

	return (
		<div className="v4-ak-item">
			<div className="v4-ak-item-header" onClick={() => setOpen((v) => !v)} role="button" aria-expanded={open} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}>
				<span className="v4-ak-num">{num}.</span>
				<span className="v4-ak-prompt" title={item.prompt}>{item.prompt.length > 80 ? item.prompt.slice(0, 80) + "…" : item.prompt}</span>
				<span className="v4-ak-correct">{correctAnswer}</span>
				<span className="v4-ak-toggle">{open ? "▲" : "▼"}</span>
			</div>
			{open && (
				<div className="v4-ak-details">
					{fmt === "FRQ" && sa && typeof sa === "object" && !Array.isArray(sa) && (
						<div className="v4-ak-frq-parts">
							{Object.entries(sa as Record<string, string>).sort().map(([k, v]) => (
								<div key={k} className="v4-ak-frq-part">
									<strong>{k.replace("part", "Part ").toUpperCase()}:</strong> {v}
								</div>
							))}
						</div>
					)}
					{item.solutionSteps && item.solutionSteps.length > 0 && (
						<div className="v4-ak-steps">
							<p className="v4-ak-section-label">Solution steps</p>
							<ol className="v4-ak-steps-list">
								{item.solutionSteps.map((step, i) => <li key={i}>{step}</li>)}
							</ol>
						</div>
					)}
					{showMisconceptions && item.misconceptions && item.misconceptions.length > 0 && (
						<div className="v4-ak-misconceptions">
							<p className="v4-ak-section-label v4-ak-section-label--warn">Common misconceptions</p>
							{(item.misconceptions as Misconception[]).map((m, i) => (
								<div key={i} className="v4-ak-misconception-row">
									<span className="v4-ak-distractor">{m.distractor}</span>
									<span className="v4-ak-explanation">{m.explanation}</span>
								</div>
							))}
						</div>
					)}
					<div className="v4-ak-meta">
						<span className="v4-pill">{item.concept}</span>
						<span className="v4-pill">{item.difficulty}</span>
						{item.estimatedTimeSeconds && <span className="v4-pill">{formatTime(item.estimatedTimeSeconds)}</span>}
					</div>
				</div>
			)}
		</div>
	);
}

function AnswerKeyView({ product, showMisconceptions }: { product: TestProduct; showMisconceptions: boolean }) {
	const FORMAT_ORDER_AK = ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"];
	const allItems = product.sections.flatMap((s) => s.items);
	const orderedItems: TestItem[] = [];
	for (const fmt of FORMAT_ORDER_AK) {
		orderedItems.push(...allItems.filter((it) => it.problemType === fmt));
	}
	// Items that didn't match any known format
	const unknown = allItems.filter((it) => !FORMAT_ORDER_AK.includes(it.problemType ?? ""));
	orderedItems.push(...unknown);

	return (
		<div className="v4-answer-key-view">
			{orderedItems.map((item, i) => (
				<AnswerKeyItem key={item.itemId} item={item} num={i + 1} showMisconceptions={showMisconceptions} />
			))}
		</div>
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
	Sorting: "Ordering",
	SA: "Short Answer",
	FRQ: "Free Response",
};

const ALL_FORMATS = ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"] as const;

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
	const [showAnswerKey, setShowAnswerKey] = useState(false);
	const [showMisconceptions, setShowMisconceptions] = useState(false);

	// Group all items by problemType (format) instead of by concept section
	const FORMAT_ORDER = ["TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ"];
	const allItems = sections.flatMap((s) => s.items);
	const groupedSections = FORMAT_ORDER
		.map((fmt) => ({
			concept: FORMAT_DISPLAY[fmt] ?? fmt,
			items: allItems.filter((item) => item.problemType === fmt),
		}))
		.filter((g) => g.items.length > 0);

	return (
		<>
			<section className="v4-panel v4-vector-span v4-hero">
				<div>
					<p className="v4-kicker">Step 4 of 5</p>
					<h1>{payload?.title || "Here’s the document you asked for."}</h1>
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
					{payload && (
						<button
							className="v4-button v4-button-secondary"
							type="button"
							onClick={() => exportTestPDF(payload, payload.title)}
						>
							Export Test → PDF
						</button>
					)}
				</div>
			</section>

			{error && (
				<section className="v4-panel v4-vector-span">
					<p className="v4-error">{error}</p>
				</section>
			)}

			{groupedSections.map((section, sectionIndex) => (
				<AssessmentSection
					key={section.concept}
					section={section}
					sectionIndex={sectionIndex}
					startNumber={groupedSections.slice(0, sectionIndex).reduce((s, sec) => s + sec.items.length, 1)}
					onRewriteItem={onRewriteItem}
					onReplaceItem={onReplaceItem}
					onChangeFormat={onChangeFormat}
				/>
			))}

			{payload && (
				<section className="v4-panel v4-vector-span">
					<div className="v4-ak-toolbar">
						<button
							className={`v4-button v4-button-secondary${showAnswerKey ? " v4-button-active" : ""}`}
							type="button"
							onClick={() => setShowAnswerKey((v) => !v)}
						>
							{showAnswerKey ? "Hide Answer Key" : "View Answer Key"}
						</button>
						{showAnswerKey && (
							<>
								<label className="v4-format-checkbox-label">
									<input
										type="checkbox"
										checked={showMisconceptions}
										onChange={() => setShowMisconceptions((v) => !v)}
									/>
									Show misconceptions
								</label>
								<button
									className="v4-button v4-button-secondary"
									type="button"
									onClick={() => exportAnswerKeyPDF(payload, payload.title, showMisconceptions)}
								>
									Export Answer Key → PDF
								</button>
							</>
						)}
					</div>
					{showAnswerKey && <AnswerKeyView product={payload} showMisconceptions={showMisconceptions} />}
				</section>
			)}

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

	// Group by problemType (same order as Screen 4)
	const FORMAT_ORDER = ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"];
	const allItems = product.sections.flatMap((s) => s.items);
	const grouped = FORMAT_ORDER
		.map((fmt) => ({ fmt, items: allItems.filter((item) => item.problemType === fmt) }))
		.filter((g) => g.items.length > 0);

	let questionNumber = 1;
	for (const { fmt, items } of grouped) {
		const sectionLabel = FORMAT_DISPLAY[fmt] ?? fmt;
		lines.push(sectionLabel);
		lines.push("-".repeat(sectionLabel.length));
		lines.push("");

		for (const item of items) {
			const prompt = (fmt === "MC" || fmt === "MS") ? stripInlineChoices(item.prompt) : item.prompt;
			lines.push(`${questionNumber}. ${prompt}`);

			// Render format-specific answer structure
			const sa = item.structuredAnswer;
			if ((fmt === "MC" || fmt === "MS") && sa && typeof sa === "object" && !Array.isArray(sa)) {
				const data = sa as { choices?: string[] };
				if (Array.isArray(data.choices)) {
					lines.push("");
					for (const choice of data.choices) lines.push(`   ${choice}`);
				}
				lines.push("");
				lines.push("Answer: _______");
			} else if (fmt === "TF") {
				lines.push("");
				lines.push("   True   /   False");
				lines.push("");
			} else if (fmt === "Matching" && sa && typeof sa === "object" && !Array.isArray(sa)) {
				const pairs = sa as Record<string, string>;
				lines.push("");
				const terms = Object.keys(pairs);
				const defs = Object.values(pairs);
				for (let i = 0; i < terms.length; i++) {
					lines.push(`   ${i + 1}. ${terms[i]!}   ____`);
				}
				lines.push("");
				lines.push("   Definitions:");
				defs.forEach((d, i) => lines.push(`   ${String.fromCharCode(65 + i)}. ${d}`));
				lines.push("");
			} else if (fmt === "Sorting" && Array.isArray(sa)) {
				lines.push("");
				for (const it of sa as string[]) lines.push(`   ○  ${it}`);
				lines.push("");
				lines.push("Order: ___");
			} else if (fmt === "FRQ" && sa && typeof sa === "object" && !Array.isArray(sa)) {
				const parts = sa as Record<string, string>;
				const keys = ["partA", "partB", "partC", "partD"].filter((k) => parts[k]);
				for (const key of keys) {
					lines.push("");
					lines.push(`   ${key.replace("part", "Part ")}: _______________________________________________`);
				}
			} else {
				lines.push("");
				lines.push("Answer: _______________________________________________");
			}
			lines.push("");
			questionNumber++;
		}
	}
	return lines.join("\n");
}

function Screen5({ output, onEdit, onStartOver }: Screen5Props) {
	const payload = output?.payload as TestProduct | null | undefined;
	const [versionName, setVersionName] = useState(payload?.title ?? "");
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
	const [pdfMisconceptions, setPdfMisconceptions] = useState(false);

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
							{payload && (
								<>
									<button
										className="v4-button v4-button-secondary"
										type="button"
										onClick={() => exportTestPDF(payload, versionName.trim() || payload.title)}
									>
										Export Test → PDF
									</button>
									<button
										className="v4-button v4-button-secondary"
										type="button"
										onClick={() => exportAnswerKeyPDF(payload, versionName.trim() || payload.title, pdfMisconceptions)}
									>
										Export Answer Key → PDF
									</button>
									<label className="v4-format-checkbox-label">
										<input
											type="checkbox"
											checked={pdfMisconceptions}
											onChange={() => setPdfMisconceptions((v) => !v)}
										/>
										Include misconceptions
									</label>
								</>
							)}
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
