import { useEffect, useMemo, useRef, useState } from "react";

import { canonicalConceptId } from "../../prism-v4/teacherFeedback";
import { classifyMasteryBand } from "../../prism-v4/session";
import type { ClassProfileModel, DifferentiatedBuildModel } from "../../types/v4/InstructionalSession";
import { AssessmentPreview } from "./AssessmentPreview";
import { BuilderPlanView } from "./BuilderPlanView";

type ClassDifferentiatorProps = {
	classId?: string;
	classProfile?: ClassProfileModel | null;
	onLoadClassProfile?: ((classId: string) => Promise<unknown>) | null;
	differentiatedBuild?: DifferentiatedBuildModel | null;
	onLoadDifferentiatedBuild?: ((classId: string) => Promise<unknown>) | null;
};

type HeatmapRow = {
	conceptId: string;
	low: string[];
	mid: string[];
	high: string[];
};

function buildHeatmapRows(classProfile: ClassProfileModel | null): HeatmapRow[] {
	if (!classProfile) {
		return [];
	}

	const clusters = new Map<string, HeatmapRow>();

	for (const conceptCluster of classProfile.conceptClusters) {
		clusters.set(conceptCluster.conceptId, {
			conceptId: conceptCluster.conceptId,
			low: [],
			mid: [],
			high: [],
		});
	}

	for (const student of classProfile.students) {
		for (const [conceptKey, mastery] of Object.entries(student.conceptMastery)) {
			const conceptId = canonicalConceptId(conceptKey);
			const current = clusters.get(conceptId) ?? { conceptId, low: [], mid: [], high: [] };
			current[classifyMasteryBand(mastery)].push(student.studentId);
			clusters.set(conceptId, current);
		}
	}

	return [...clusters.values()]
		.map((entry) => ({
			...entry,
			low: [...new Set(entry.low)].sort((left, right) => left.localeCompare(right)),
			mid: [...new Set(entry.mid)].sort((left, right) => left.localeCompare(right)),
			high: [...new Set(entry.high)].sort((left, right) => left.localeCompare(right)),
		}))
		.sort((left, right) => {
			const leftTotal = left.low.length + left.mid.length + left.high.length;
			const rightTotal = right.low.length + right.mid.length + right.high.length;
			return rightTotal - leftTotal || left.conceptId.localeCompare(right.conceptId);
		});
}

export function ClassDifferentiator(props: ClassDifferentiatorProps) {
	const { classId, classProfile = null, onLoadClassProfile = null, differentiatedBuild = null, onLoadDifferentiatedBuild = null } = props;
	const [status, setStatus] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const requestedClassIdRef = useRef<string | null>(null);

	const heatmapRows = useMemo(() => buildHeatmapRows(classProfile), [classProfile]);

	useEffect(() => {
		if (!classId || !onLoadClassProfile) {
			return;
		}
		if (classProfile?.classId === classId) {
			requestedClassIdRef.current = classId;
			return;
		}
		if (requestedClassIdRef.current === classId) {
			return;
		}

		let isCancelled = false;
		requestedClassIdRef.current = classId;
		setIsLoading(true);
		setStatus(null);

		void onLoadClassProfile(classId)
			.catch((error) => {
				requestedClassIdRef.current = null;
				if (!isCancelled) {
					setStatus(error instanceof Error ? error.message : "Failed to load class profile.");
				}
			})
			.finally(() => {
				if (!isCancelled) {
					setIsLoading(false);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [classId, classProfile?.classId, onLoadClassProfile]);

	async function handleGenerateDifferentiatedBuild() {
		if (!classId || !onLoadDifferentiatedBuild) {
			return;
		}

		setIsGenerating(true);
		setStatus(null);
		try {
			await onLoadDifferentiatedBuild(classId);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to generate differentiated versions.");
		} finally {
			setIsGenerating(false);
		}
	}

	if (!classId) {
		return (
			<div className="v4-product-card v4-product-span">
				<h3>Class Differentiator</h3>
				<p className="v4-body-copy">Connect a class context to load grouped student mastery and misconception patterns.</p>
			</div>
		);
	}

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Class Differentiator</h3>
						<p className="v4-body-copy">A read-only class view showing mastery distribution and misconception hotspots across the current roster.</p>
					</div>
					<div className="v4-upload-actions">
						<span className="v4-pill">{classProfile?.students.length ?? 0} students</span>
						{onLoadDifferentiatedBuild ? (
							<button className="v4-button v4-button-secondary" type="button" onClick={() => void handleGenerateDifferentiatedBuild()} disabled={isGenerating || !classProfile}>
								{isGenerating ? "Generating..." : differentiatedBuild?.versions.length ? "Refresh differentiated versions" : "Generate differentiated versions"}
							</button>
						) : null}
					</div>
				</div>
				{status ? <p className="v4-error">{status}</p> : null}
				{isLoading && !classProfile ? <p className="v4-body-copy">Loading class profile...</p> : null}
			</div>
			<div className="v4-product-card">
				<h3>Class Mastery Heatmap</h3>
				<ul className="v4-ranked-list">
					{heatmapRows.length > 0
						? heatmapRows.map((row) => (
							<li key={row.conceptId} className="v4-class-heatmap-row">
								<div>
									<strong>{row.conceptId}</strong>
								</div>
								<div className="v4-class-heatmap-bands">
									<span className="v4-pill">Low {row.low.length}</span>
									<span className="v4-pill">Mid {row.mid.length}</span>
									<span className="v4-pill">High {row.high.length}</span>
								</div>
							</li>
						))
						: <li><span>No class mastery data available yet.</span><span>0</span></li>}
				</ul>
			</div>
			<div className="v4-product-card">
				<h3>Misconception Clusters</h3>
				<ul className="v4-ranked-list">
					{classProfile?.misconceptionClusters.length
						? classProfile.misconceptionClusters.map((cluster) => (
							<li key={cluster.misconception}>
								<span>{cluster.misconception}</span>
								<span>{cluster.students.join(", ")}</span>
							</li>
						))
						: <li><span>No misconception clusters available.</span><span>0</span></li>}
				</ul>
			</div>
			<div className="v4-product-card v4-product-span">
				<h3>Differentiated Versions</h3>
				{differentiatedBuild?.versions.length ? (
					<div className="v4-version-stack">
						{differentiatedBuild.versions.map((version) => (
							<section key={version.versionId} className="v4-product-card v4-product-span v4-differentiated-version">
								<div className="v4-document-card-header">
									<div>
										<h3>{version.label}</h3>
										<p className="v4-body-copy">{version.explanation}</p>
									</div>
									<span className="v4-pill">{version.studentIds.join(", ")}</span>
								</div>
								<BuilderPlanView plan={version.builderPlan} />
								<AssessmentPreview preview={version.assessmentPreview} />
							</section>
						))}
					</div>
				) : (
					<p className="v4-body-copy">Generate differentiated versions to render band-specific plans and previews.</p>
				)}
			</div>
		</div>
	);
}