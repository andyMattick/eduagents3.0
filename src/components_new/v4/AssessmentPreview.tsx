import { useState } from "react";

import type { AssessmentPreviewModel } from "../../types/v4/InstructionalSession";
import { ReasoningPanel } from "./ReasoningPanel";

type AssessmentPreviewProps = {
	preview: AssessmentPreviewModel | null;
	isLoading?: boolean;
	status?: string | null;
	onRefresh?: (() => void) | null;
};

export function AssessmentPreview(props: AssessmentPreviewProps) {
	const { preview, isLoading = false, status = null, onRefresh = null } = props;
	const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Assessment Preview</h3>
						<p className="v4-body-copy">The normalized session preview with adaptive metadata and item-level explanations.</p>
					</div>
					{onRefresh ? (
						<button className="v4-button v4-button-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
							{isLoading ? "Loading..." : "Refresh Preview"}
						</button>
					) : null}
				</div>
				{status ? <p className="v4-upload-name">{status}</p> : null}
			</div>
			{preview?.items.map((item) => {
				const expanded = expandedItemIds[item.itemId] ?? false;
				return (
					<article key={item.itemId} className="v4-product-card">
						<p>{item.stem}</p>
						<ul className="v4-inline-list">
							<li>{item.conceptId}</li>
							<li>{item.bloom}</li>
							<li>{item.difficulty}</li>
							<li>{item.mode}</li>
							<li>{item.scenario}</li>
							{item.misconceptionTag ? <li>{item.misconceptionTag}</li> : null}
						</ul>
						{item.answer ? <p className="v4-body-copy">Answer guidance: {item.answer}</p> : null}
						<div className="v4-upload-actions">
							<button className="v4-button v4-button-secondary" type="button" onClick={() => setExpandedItemIds((current) => ({ ...current, [item.itemId]: !expanded }))}>
								{expanded ? "Hide Reasons" : "Explain Item"}
							</button>
						</div>
						{expanded ? <ReasoningPanel teacherReasons={item.teacherReasons} studentReasons={item.studentReasons} misconceptionTag={item.misconceptionTag} /> : null}
					</article>
				);
			}) ?? null}
			{!preview ? (
				<div className="v4-product-card v4-product-span">
					<p className="v4-body-copy">No assessment preview has been loaded for this session yet.</p>
				</div>
			) : null}
		</div>
	);
}