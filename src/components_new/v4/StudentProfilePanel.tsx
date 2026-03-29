import { useMemo, useState } from "react";

import type { StudentPerformanceProfile } from "../../prism-v4/studentPerformance";
import type { StudentExposureEntry, StudentResponseTimeEntry } from "../../types/v4/InstructionalSession";

type StudentProfilePanelProps = {
	availableStudentIds?: string[];
	activeStudentId?: string | null;
	profile?: StudentPerformanceProfile | null;
	misconceptions?: string[];
	exposureTimeline?: StudentExposureEntry[];
	responseTimes?: StudentResponseTimeEntry[];
	status?: string | null;
	isLoading?: boolean;
	onStudentChange?: ((studentId: string) => void) | null;
	onLoadStudent?: ((studentId: string) => void) | null;
};

function formatPercent(value: number) {
	return `${Math.round(value * 100)}%`;
}

function formatResponseMs(entries: StudentResponseTimeEntry[]) {
	if (entries.length === 0) {
		return "No response time data";
	}
	const averageMs = Math.round(entries.reduce((sum, entry) => sum + entry.ms, 0) / entries.length);
	return `${averageMs} ms avg`;
}

export function StudentProfilePanel(props: StudentProfilePanelProps) {
	const {
		availableStudentIds = [],
		activeStudentId = null,
		profile = null,
		misconceptions = [],
		exposureTimeline = [],
		responseTimes = [],
		status = null,
		isLoading = false,
		onStudentChange = null,
		onLoadStudent = null,
	} = props;
	const [draftStudentId, setDraftStudentId] = useState(activeStudentId ?? availableStudentIds[0] ?? "");

	const weakestConcepts = useMemo(() => {
		if (!profile) {
			return [];
		}
		return Object.entries(profile.conceptMastery)
			.sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
			.slice(0, 6);
	}, [profile]);

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Student Brain</h3>
						<p className="v4-body-copy">Load one learner profile into the session and inspect where concept mastery is strong, weak, or misconception-heavy.</p>
					</div>
				</div>
				<div className="v4-upload-actions">
					{availableStudentIds.length > 0 ? (
						<label className="v4-upload-field">
							<span>Student</span>
							<select
								aria-label="Active student"
								value={draftStudentId}
								onChange={(event) => {
									setDraftStudentId(event.target.value);
									onStudentChange?.(event.target.value);
								}}
								disabled={isLoading}
							>
								{availableStudentIds.map((studentId) => <option key={studentId} value={studentId}>{studentId}</option>)}
							</select>
						</label>
					) : (
						<label className="v4-upload-field">
							<span>Student ID</span>
							<input aria-label="Active student" value={draftStudentId} onChange={(event) => setDraftStudentId(event.target.value)} disabled={isLoading} />
						</label>
					)}
					<button className="v4-button v4-button-secondary" type="button" onClick={() => draftStudentId && onLoadStudent?.(draftStudentId)} disabled={isLoading || !draftStudentId}>
						{isLoading ? "Loading..." : "Load Student"}
					</button>
				</div>
				{status ? <p className="v4-upload-name">{status}</p> : null}
			</div>
			<div className="v4-product-card">
				<h3>Concept Mastery</h3>
				<ul className="v4-ranked-list">
					{weakestConcepts.length > 0
						? weakestConcepts.map(([conceptId, mastery]) => (
							<li key={conceptId}>
								<span>{conceptId}</span>
								<span>{formatPercent(mastery)}</span>
							</li>
						))
						: <li><span>No student profile loaded.</span><span>--</span></li>}
				</ul>
			</div>
			<div className="v4-product-card">
				<h3>Misconceptions</h3>
				<ul className="v4-ranked-list">
					{misconceptions.length > 0
						? misconceptions.map((misconception) => <li key={misconception}><span>{misconception}</span><span>flagged</span></li>)
						: <li><span>No misconceptions loaded.</span><span>0</span></li>}
				</ul>
			</div>
			<div className="v4-product-card">
				<h3>Exposure Timeline</h3>
				<p className="v4-body-copy">{exposureTimeline.length} exposure events</p>
				<ul className="v4-ranked-list">
					{exposureTimeline.slice(-4).reverse().map((entry) => (
						<li key={`${entry.timestamp}-${entry.conceptId}`}>
							<span>{entry.conceptLabel ?? entry.conceptId}</span>
							<span>{new Date(entry.timestamp).toLocaleDateString()}</span>
						</li>
					))}
				</ul>
			</div>
			<div className="v4-product-card">
				<h3>Response Times</h3>
				<p className="v4-body-copy">{formatResponseMs(responseTimes)}</p>
				<ul className="v4-ranked-list">
					{responseTimes.slice(0, 4).map((entry) => (
						<li key={entry.itemId}>
							<span>{entry.conceptId}</span>
							<span>{entry.ms} ms</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}