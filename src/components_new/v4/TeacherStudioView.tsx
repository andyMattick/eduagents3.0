import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { useTeacherStudioRun } from "../../hooks/useTeacherStudioRun";
import type { ItemRewriteIntent } from "../../lib/teacherStudioApi";
import type { TeacherStudioOutputArtifact } from "../../prism-v4/studio/artifacts";
import type { TestProduct, TestItem } from "../../prism-v4/schema/integration/IntentProduct";
import { useAuth } from "../Auth/useAuth";
import "./v4.css";

const REWRITE_INTENT_LABELS: Record<ItemRewriteIntent, string> = {
	easier: "Make easier",
	harder: "Make harder",
	change_numbers: "Change numbers",
	real_world: "Add real-world context",
	concise: "Make concise",
	student_friendly: "Make student-friendly",
	academic: "Make more academic",
};

function countNonNoiseConcepts(concepts: Array<{ included?: boolean; isNoise?: boolean }>) {
	return concepts.filter((concept) => concept.included !== false && !concept.isNoise).length;
}

export function TeacherStudioView() {
	const { user } = useAuth();
	const {
		session,
		analysis,
		activeBlueprint,
		outputs,
		documents,
		isLoading,
		error,
		createSessionFromFiles,
		createBlueprint,
		requestAssessmentOutput,
		rewriteItem,
		replaceItem,
		clearStudio,
	} = useTeacherStudioRun();
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [itemCount, setItemCount] = useState("8");
	const [unitId, setUnitId] = useState("");
	const [itemBusy, setItemBusy] = useState<Record<string, boolean>>({});
	const [expandedOutputId, setExpandedOutputId] = useState<string | null>(null);

	const analysisSummary = useMemo(() => {
		if (!analysis) {
			return null;
		}
		return {
			concepts: analysis.concepts.filter((concept) => !concept.isNoise).length,
			problems: analysis.problems.reduce((sum, problem) => sum + problem.problemCount, 0),
			domain: analysis.domain || "Unclassified",
		};
	}, [analysis]);

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedFiles(Array.from(event.target.files ?? []));
	}

	async function handleUpload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await createSessionFromFiles(selectedFiles);
	}

	async function handleCreateBlueprint() {
		if (!session) {
			return;
		}
		const parsedItemCount = Number(itemCount);
		await createBlueprint({
			sessionId: session.sessionId,
			teacherId: user?.id,
			unitId: unitId.trim() || undefined,
			itemCount: Number.isFinite(parsedItemCount) && parsedItemCount > 0 ? Math.floor(parsedItemCount) : undefined,
		});
	}

	async function handleRequestAssessment() {
		if (!activeBlueprint) {
			return;
		}
		const parsedItemCount = Number(itemCount);
		await requestAssessmentOutput({
			blueprintId: activeBlueprint.blueprintId,
			version: activeBlueprint.version,
			teacherId: user?.id,
			unitId: unitId.trim() || undefined,
			itemCount: Number.isFinite(parsedItemCount) && parsedItemCount > 0 ? Math.floor(parsedItemCount) : undefined,
			adaptiveConditioning: true,
		});
	}

	return (
		<div className="v4-viewer">
			<div className="v4-shell">
				<div className="v4-viewer-grid">
					<section className="v4-panel v4-vector-span v4-hero">
						<div>
							<p className="v4-kicker">Teacher Studio</p>
							<h1>Blueprint-first teacher workflow</h1>
							<p className="v4-subtitle">
								Upload source materials, seed a Blueprint from Act 1 analysis, and stand up the new Studio path without entering Pavilion.
							</p>
						</div>
						<div className="v4-upload-actions">
							<span className="v4-pill">Studio API wired</span>
							<button className="v4-button v4-button-secondary" type="button" onClick={clearStudio}>
								Reset Studio
							</button>
						</div>
						{error ? <p className="v4-error">{error}</p> : null}
					</section>

					<section className="v4-panel">
						<p className="v4-kicker">Step 1</p>
						<h2>Upload materials</h2>
						<form className="v4-upload-form" onSubmit={(event) => void handleUpload(event)}>
							<label className="v4-upload-field">
								<span>Files</span>
								<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple onChange={handleFileChange} />
							</label>
							<div className="v4-upload-actions">
								<button className="v4-button" type="submit" disabled={isLoading || selectedFiles.length === 0}>
									{isLoading ? "Working..." : "Create Studio Session"}
								</button>
								<span className="v4-pill">{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}</span>
							</div>
						</form>
						{documents.length > 0 ? (
							<ul className="v4-ranked-list">
								{documents.map((document) => (
									<li key={document.documentId}>
										<span>{document.sourceFileName}</span>
										<span>{document.sourceMimeType}</span>
									</li>
								))}
							</ul>
						) : null}
					</section>

					<section className="v4-panel">
						<p className="v4-kicker">Step 2</p>
						<h2>Seed Blueprint</h2>
						<div className="v4-upload-form">
							<label className="v4-upload-field">
								<span>Target item count</span>
								<input type="number" min={1} value={itemCount} onChange={(event) => setItemCount(event.target.value)} />
							</label>
							<label className="v4-upload-field">
								<span>Unit ID</span>
								<input value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="Optional unit scope" />
							</label>
							<div className="v4-upload-actions">
								<button className="v4-button" type="button" disabled={isLoading || !session} onClick={() => void handleCreateBlueprint()}>
									{activeBlueprint ? "Regenerate Blueprint" : "Create Blueprint"}
								</button>
								<span className="v4-pill">{session ? session.sessionId : "No session yet"}</span>
							</div>
						</div>
						{analysisSummary ? (
							<div className="v4-stat-grid">
								<div className="v4-stat-card">
									<div className="v4-stat-label">Domain</div>
									<strong>{analysisSummary.domain}</strong>
								</div>
								<div className="v4-stat-card">
									<div className="v4-stat-label">Concepts</div>
									<strong>{analysisSummary.concepts}</strong>
								</div>
								<div className="v4-stat-card">
									<div className="v4-stat-label">Problems</div>
									<strong>{analysisSummary.problems}</strong>
								</div>
							</div>
						) : null}
					</section>

					<section className="v4-panel v4-vector-span">
						<p className="v4-kicker">Step 3</p>
						<h2>Studio runtime</h2>
						<p className="v4-body-copy">
							This surface is now wired to the new Studio session and Blueprint routes. Assessment generation is still waiting on the Blueprint runtime builder, so the request will surface the backend stub until that lands.
						</p>
						<div className="v4-upload-actions">
							<button className="v4-button" type="button" disabled={isLoading || !activeBlueprint} onClick={() => void handleRequestAssessment()}>
								{isLoading ? "Working..." : "Request Assessment Output"}
							</button>
							{activeBlueprint ? (
								<button className="v4-button v4-button-secondary" type="button" disabled={isLoading || !activeBlueprint} onClick={() => void handleRequestAssessment()}>
									Create another version
								</button>
							) : null}
							{activeBlueprint ? <span className="v4-pill">Blueprint v{activeBlueprint.version}</span> : null}
						</div>
						{activeBlueprint ? (
							<div className="v4-columns">
								<div className="v4-vector-card">
									<div className="v4-stat-label">Included concepts</div>
									<strong>{countNonNoiseConcepts(activeBlueprint.blueprint.concepts)}</strong>
								</div>
								<div className="v4-vector-card">
									<div className="v4-stat-label">Bloom buckets</div>
									<strong>{activeBlueprint.blueprint.bloomLadder.length}</strong>
								</div>
								<div className="v4-vector-card">
									<div className="v4-stat-label">Outputs</div>
									<strong>{outputs.length}</strong>
								</div>
							</div>
						) : null}
						{outputs.length > 0 ? (
							<div className="v4-output-list">
								{outputs.map((output) => (
									<StudioOutputCard
										key={output.outputId}
										output={output}
										expanded={expandedOutputId === output.outputId}
										itemBusy={itemBusy}
										onToggle={() => setExpandedOutputId(expandedOutputId === output.outputId ? null : output.outputId)}
										onRewrite={async (itemId, intent) => {
											setItemBusy((prev) => ({ ...prev, [itemId]: true }));
											await rewriteItem(output.outputId, itemId, intent);
											setItemBusy((prev) => ({ ...prev, [itemId]: false }));
										}}
										onReplace={async (itemId) => {
											setItemBusy((prev) => ({ ...prev, [itemId]: true }));
											await replaceItem(output.outputId, itemId);
											setItemBusy((prev) => ({ ...prev, [itemId]: false }));
										}}
									/>
								))}
							</div>
						) : null}
					</section>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StudioOutputCardProps {
	output: TeacherStudioOutputArtifact;
	expanded: boolean;
	itemBusy: Record<string, boolean>;
	onToggle: () => void;
	onRewrite: (itemId: string, intent: ItemRewriteIntent) => Promise<void>;
	onReplace: (itemId: string) => Promise<void>;
}

function StudioOutputCard({ output, expanded, itemBusy, onToggle, onRewrite, onReplace }: StudioOutputCardProps) {
	const [rewriteMenuItemId, setRewriteMenuItemId] = useState<string | null>(null);
	const sections = (output.payload as TestProduct | null)?.sections ?? [];

	return (
		<div className="v4-output-card">
			<button className="v4-output-card-header" type="button" onClick={onToggle}>
				<span className="v4-pill">{output.outputType}</span>
				<span className="v4-stat-label">{output.status}</span>
				<span>{expanded ? "▲" : "▼"}</span>
			</button>
			{expanded && sections.length > 0 ? (
				<div className="v4-output-sections">
					{sections.map((section) => (
						<div key={section.concept} className="v4-section-block">
							<p className="v4-section-label">{section.concept}</p>
							{section.items.map((item) => (
								<StudioItemRow
									key={item.itemId}
									item={item}
									busy={!!itemBusy[item.itemId]}
									rewriteMenuOpen={rewriteMenuItemId === item.itemId}
									onOpenRewriteMenu={() => setRewriteMenuItemId(item.itemId)}
									onCloseRewriteMenu={() => setRewriteMenuItemId(null)}
									onRewrite={(intent) => {
										setRewriteMenuItemId(null);
										return onRewrite(item.itemId, intent);
									}}
									onReplace={() => onReplace(item.itemId)}
								/>
							))}
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

interface StudioItemRowProps {
	item: TestItem;
	busy: boolean;
	rewriteMenuOpen: boolean;
	onOpenRewriteMenu: () => void;
	onCloseRewriteMenu: () => void;
	onRewrite: (intent: ItemRewriteIntent) => Promise<void>;
	onReplace: () => Promise<void>;
}

function StudioItemRow({ item, busy, rewriteMenuOpen, onOpenRewriteMenu, onCloseRewriteMenu, onRewrite, onReplace }: StudioItemRowProps) {
	return (
		<div className="v4-item-row">
			<p className="v4-item-prompt">{item.prompt}</p>
			<div className="v4-item-meta">
				<span className="v4-pill">{item.difficulty}</span>
				<span className="v4-pill">{item.cognitiveDemand}</span>
			</div>
			<div className="v4-item-actions">
				<div className="v4-rewrite-menu-wrapper">
					<button
						className="v4-button v4-button-secondary"
						type="button"
						disabled={busy}
						onClick={rewriteMenuOpen ? onCloseRewriteMenu : onOpenRewriteMenu}
					>
						{busy ? "Working..." : "Rewrite ▾"}
					</button>
					{rewriteMenuOpen ? (
						<div className="v4-rewrite-menu">
							{(Object.entries(REWRITE_INTENT_LABELS) as Array<[ItemRewriteIntent, string]>).map(([intent, label]) => (
								<button
									key={intent}
									className="v4-rewrite-menu-item"
									type="button"
									onClick={() => void onRewrite(intent)}
								>
									{label}
								</button>
							))}
						</div>
					) : null}
				</div>
				<button
					className="v4-button v4-button-secondary"
					type="button"
					disabled={busy}
					onClick={() => void onReplace()}
				>
					Replace
				</button>
			</div>
		</div>
	);
}