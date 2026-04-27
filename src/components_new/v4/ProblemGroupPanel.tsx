import { useEffect, useMemo, useState } from "react";

import type { ViewerProblemGroup } from "../../prism-v4/viewer";

export type ProblemGroupPanelProps = {
	problemGroups: ViewerProblemGroup[];
	selectedProblemGroupKey?: string | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectProblemGroup?: (group: ViewerProblemGroup) => void;
	onSelectGroup?: (group: ViewerProblemGroup) => void;
};

export function getProblemGroupKey(group: Pick<ViewerProblemGroup, "documentId" | "groupId">) {
	return `${group.documentId}::${group.groupId}`;
}

function formatPageSpan(span?: { firstPage: number; lastPage: number }) {
	if (!span) {
		return "Page span unavailable";
	}
	if (span.firstPage === span.lastPage) {
		return `Page ${span.firstPage}`;
	}
	return `Pages ${span.firstPage}-${span.lastPage}`;
}

function formatLinkedBy(linkedBy: ViewerProblemGroup["linkedBy"]) {
	if (linkedBy === "groupId") {
		return "Matched by problem group";
	}
	if (linkedBy === "concept") {
		return "Matched by concept fallback";
	}
	return "No linked preview items";
}

function formatCount(label: string, count: number) {
	return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function ProblemGroupPanel(props: ProblemGroupPanelProps) {
	const { problemGroups, selectedProblemGroupKey = null, selectedConcept, selectedPreviewItem, onSelectProblemGroup, onSelectGroup } = props;
	const [internalSelection, setInternalSelection] = useState<string | null>(selectedProblemGroupKey);

	const groupsByKey = useMemo(
		() => new Map(problemGroups.map((group) => [getProblemGroupKey(group), group] as const)),
		[problemGroups],
	);

	const resolvedSelection = selectedProblemGroupKey ?? internalSelection;
	const activeGroup = (resolvedSelection ? groupsByKey.get(resolvedSelection) : null) ?? problemGroups[0] ?? null;
	const activeKey = activeGroup ? getProblemGroupKey(activeGroup) : null;

	useEffect(() => {
		if (!problemGroups.length) {
			if (internalSelection !== null) {
				setInternalSelection(null);
			}
			return;
		}

		if (!resolvedSelection || !groupsByKey.has(resolvedSelection)) {
			setInternalSelection(getProblemGroupKey(problemGroups[0]));
		}
	}, [groupsByKey, internalSelection, problemGroups, resolvedSelection]);

	function handleSelect(group: ViewerProblemGroup) {
		setInternalSelection(getProblemGroupKey(group));
		onSelectProblemGroup?.(group);
		onSelectGroup?.(group);
	}

	if (!problemGroups.length) {
		return (
			<section className="v4-panel v4-problem-group-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Document viewer</p>
						<h2>Problem groups</h2>
					</div>
				</div>
				<p className="v4-body-copy">No grouped problems are available yet for this workspace.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-problem-group-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Document viewer</p>
					<h2>Problem groups</h2>
					<p className="v4-body-copy">Trace grouped authored problems back to source pages, concepts, and preview items.</p>
				</div>
				<span className="v4-pill">{formatCount("group", problemGroups.length)}</span>
			</div>

			<div className="v4-problem-group-browser">
				<div className="v4-problem-group-nav" role="tablist" aria-label="Problem groups">
					{problemGroups.map((group, index) => {
						const key = getProblemGroupKey(group);
						const isActive = key === activeKey;
						const isCrossHighlighted =
							!isActive &&
							((!!selectedConcept && group.concepts.includes(selectedConcept)) ||
								(!!selectedPreviewItem && group.previewItemIds.includes(selectedPreviewItem)));

						return (
							<button
								key={key}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`v4-problem-group-option${isActive ? " v4-problem-group-option-active" : ""}${isCrossHighlighted ? " v4-highlighted" : ""}`}
								onClick={() => handleSelect(group)}
							>
								<div className="v4-problem-group-option-header">
									<div>
										<p className="v4-kicker">Group {index + 1}</p>
										<h3>{group.title}</h3>
									</div>
									<span className="v4-pill">{formatPageSpan(group.sourceSpan)}</span>
								</div>
								<p className="v4-body-copy">{group.sourceFileName}</p>
								<div className="v4-problem-group-option-meta" aria-label={`Problem group ${group.groupId} summary`}>
									<span>{formatCount("problem", group.problemCount)}</span>
									<span>{formatCount("preview item", group.linkedPreviewCount)}</span>
									<span>{group.primaryConcepts.slice(0, 2).join(", ") || "No concepts"}</span>
								</div>
							</button>
						);
					})}
				</div>

				{activeGroup ? (
					<article className="v4-problem-group-detail" role="tabpanel" aria-label={`${activeGroup.title} details`}>
						<div className="v4-problem-group-detail-header">
							<div>
								<p className="v4-kicker">Source aligned</p>
								<h3>{activeGroup.title}</h3>
								<p className="v4-body-copy">{activeGroup.sourceFileName} · {formatPageSpan(activeGroup.sourceSpan)}</p>
							</div>
							<div className="v4-problem-group-meta">
								<span className="v4-pill">{activeGroup.documentId}</span>
								<span className="v4-pill">{activeGroup.groupId}</span>
							</div>
						</div>

						<div className="v4-columns v4-problem-group-detail-grid">
							<div className="v4-stat-card">
								<p className="v4-kicker">Coverage</p>
								<ul className="v4-ranked-list v4-problem-group-detail-list">
									<li><span>Problems</span><strong>{activeGroup.problemCount}</strong></li>
									<li><span>Preview links</span><strong>{activeGroup.linkedPreviewCount}</strong></li>
									<li><span>Link strategy</span><strong>{formatLinkedBy(activeGroup.linkedBy)}</strong></li>
									<li><span>Demand</span><strong>{activeGroup.cognitiveDemand}</strong></li>
									<li><span>Difficulty</span><strong>{activeGroup.difficulty}</strong></li>
								</ul>
							</div>

							<div className="v4-stat-card">
								<p className="v4-kicker">Primary concepts</p>
								<ul className="v4-inline-list" aria-label="Primary concepts">
									{activeGroup.primaryConcepts.map((concept) => <li key={concept}>{concept}</li>)}
								</ul>
								<p className="v4-body-copy">Representations: {activeGroup.representations.join(", ") || "None"}</p>
								<p className="v4-body-copy">Misconceptions: {activeGroup.misconceptions.join(", ") || "None surfaced"}</p>
							</div>
						</div>

						<div className="v4-columns v4-problem-group-content-columns">
							<div className="v4-vector-span">
								<div className="v4-problem-group-subheading">
									<p className="v4-kicker">Grouped source problems</p>
									<span className="v4-pill">{formatCount("entry", activeGroup.problems.length)}</span>
								</div>
								<div className="v4-problem-group-problem-list">
									{activeGroup.problems.map((problem) => (
										<section key={problem.problemId} className="v4-problem-group-problem-card">
											<div className="v4-problem-group-subheading">
												<h4>{problem.problemId}</h4>
												<span className="v4-pill">{formatPageSpan(problem.sourceSpan)}</span>
											</div>
											<p className="v4-body-copy">{problem.text}</p>
											<p className="v4-body-copy">Concepts: {problem.concepts.join(", ") || "None"}</p>
										</section>
									))}
								</div>
							</div>

							<div className="v4-vector-span">
								<div className="v4-problem-group-subheading">
									<p className="v4-kicker">Linked preview items</p>
									<span className="v4-pill">{formatCount("item", activeGroup.previewItems.length)}</span>
								</div>
								{activeGroup.previewItems.length ? (
									<div className="v4-problem-group-preview-list">
										{activeGroup.previewItems.map((item) => (
											<section key={item.itemId} className="v4-problem-group-preview-card">
												<div className="v4-problem-group-subheading">
													<h4>{item.itemId}</h4>
													<span className="v4-pill">{item.sourceDocumentId ?? "No source doc"}</span>
												</div>
												<p className="v4-body-copy">{item.stem}</p>
												<p className="v4-body-copy">Concepts: {(item.primaryConcepts ?? [item.conceptId]).join(", ")}</p>
											</section>
										))}
									</div>
								) : (
									<p className="v4-body-copy">No preview items are linked to this group yet.</p>
								)}
							</div>
						</div>
					</article>
				) : null}
			</div>
		</section>
	);
}