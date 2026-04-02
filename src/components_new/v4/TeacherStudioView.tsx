import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { useTeacherStudioRun } from "../../hooks/useTeacherStudioRun";
import { useAuth } from "../Auth/useAuth";
import "./v4.css";

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
		clearStudio,
	} = useTeacherStudioRun();
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [itemCount, setItemCount] = useState("8");
	const [unitId, setUnitId] = useState("");

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
								Request Assessment Output
							</button>
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
							<ul className="v4-ranked-list">
								{outputs.map((output) => (
									<li key={output.outputId}>
										<span>{output.outputType}</span>
										<span>{output.status}</span>
									</li>
								))}
							</ul>
						) : null}
					</section>
				</div>
			</div>
		</div>
	);
}