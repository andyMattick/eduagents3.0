import { useCallback, useEffect, useRef, useState } from "react";
import {
	createStudioBlueprintApi,
	createStudioSessionFromFilesApi,
	loadStudioAnalysisApi,
	requestAssessmentOutputApi,
} from "../../lib/teacherStudioApi";
import type { TeacherStudioOutputArtifact } from "../../prism-v4/studio/artifacts";
import type { InstructionalAnalysis } from "../../prism-v4/session/InstructionalIntelligenceSession";
import "./v4.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OutputMode = "assessment" | "practice" | "study_guide" | "cumulative" | "unit_plan" | "compare";

type Step = 1 | 2 | 3 | 4 | 5;

interface FlowState {
	step: Step;
	files: File[];
	sessionId: string | null;
	analysis: InstructionalAnalysis | null;
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
	}, [state.sessionId]);

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
						onContinue={() => setState((prev) => ({ ...prev, step: 3 }))}
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
					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">Step 4 of 5</p>
						<h2>Here's the document you asked for.</h2>
						<p className="v4-body-copy">Coming in Day 4…</p>
					</section>
				)}
				{state.step === 5 && (
					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">Step 5 of 5</p>
						<h2>Your document is ready.</h2>
						<p className="v4-body-copy">Coming in Day 5…</p>
					</section>
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
	onContinue: () => void;
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
	const topConcepts = analysis.concepts.filter((c) => !c.isNoise).slice(0, 5);
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
				{topConcepts.length > 0 ? (
					<ul className="v4-concept-list">
						{topConcepts.map((c) => (
							<li key={c.concept} className="v4-concept-item">
								<span className="v4-concept-name">{humanizeConcept(c.concept)}</span>
								<span className="v4-stat-label">{c.problemCount} {c.problemCount === 1 ? "question" : "questions"}</span>
							</li>
						))}
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
					<button className="v4-button" type="button" onClick={onContinue}>
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
