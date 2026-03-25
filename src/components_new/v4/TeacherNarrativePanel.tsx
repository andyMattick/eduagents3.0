import { useEffect, useState } from "react";

import type { ProblemTagVector } from "../../prism-v4/schema/semantic";
import type { NarrateProblemResponse, NarratorLens } from "../../prism-v4/narrator/types";
import { narratorLensLabel } from "../../prism-v4/narrator/types";

export interface TeacherNarrativePanelProps {
	lens: NarratorLens;
	problemId?: string;
	problemText: string;
	semanticFingerprint: ProblemTagVector;
	gradeLevel?: string;
	subject?: string;
}

export function TeacherNarrativePanel(props: TeacherNarrativePanelProps) {
	const { lens, problemId, problemText, semanticFingerprint, gradeLevel, subject } = props;
	const [narrative, setNarrative] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		setNarrative("");
		setError(null);

		void fetch("/api/v4/narrate-problem", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				problemId,
				problemText,
				semanticFingerprint,
				lens,
				gradeLevel,
				subject,
			}),
		})
			.then(async (response) => {
				const payload = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(payload?.error ?? "Narrative generation failed.");
				}
				return payload as NarrateProblemResponse;
			})
			.then((payload) => {
				if (active) {
					setNarrative(payload.narrative);
				}
			})
			.catch((requestError) => {
				if (active) {
					setError(requestError instanceof Error ? requestError.message : "Narrative generation failed.");
				}
			});

		return () => {
			active = false;
		};
	}, [gradeLevel, lens, problemId, problemText, semanticFingerprint, subject]);

	return (
		<div className="v4-narrative-block" data-testid="teacher-narrative-panel">
			<p className="v4-section-title">{narratorLensLabel(lens)}</p>
			<p className="v4-narrative">{error ?? (narrative || "Generating narrative...")}</p>
		</div>
	);
}