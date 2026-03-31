import type { ViewerScoredConcept } from "../../../prism-v4/viewer";
import type { ViewerGroupKey } from "./useViewerSelection";

export type ConceptListPanelProps = {
	scoredConcepts: ViewerScoredConcept[];
	selectedGroupKey?: ViewerGroupKey | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectConcept?: (concept: string) => void;
};

function isConceptHighlighted(
	concept: ViewerScoredConcept,
	selectedGroupKey: ViewerGroupKey | null | undefined,
	selectedConcept: string | null | undefined,
	selectedPreviewItem: string | null | undefined,
): boolean {
	if (selectedConcept && concept.concept === selectedConcept) return true;
	if (selectedGroupKey && concept.groupIds.some((gid) => gid === selectedGroupKey.groupId)) return true;
	if (selectedPreviewItem && concept.previewItemIds.includes(selectedPreviewItem)) return true;
	return false;
}

function formatScore(score: number) {
	return `${Math.round(score * 100)}%`;
}

export function ConceptListPanel(props: ConceptListPanelProps) {
	const { scoredConcepts, selectedGroupKey, selectedConcept, selectedPreviewItem, onSelectConcept } = props;
	const sorted = [...scoredConcepts].sort((a, b) => b.coverageScore - a.coverageScore);

	if (!sorted.length) {
		return (
			<section className="v4-panel v4-concept-list-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Concepts</p>
						<h2>Concept coverage</h2>
					</div>
				</div>
				<p className="v4-body-copy">No concepts available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-concept-list-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Concepts</p>
					<h2>Concept coverage</h2>
					<p className="v4-body-copy">Click a concept to highlight its linked groups and preview items.</p>
				</div>
				<span className="v4-pill">{sorted.length} {sorted.length === 1 ? "concept" : "concepts"}</span>
			</div>
			<ul className="v4-ranked-list v4-concept-list" aria-label="Scored concepts">
				{sorted.map((concept) => {
					const highlighted = isConceptHighlighted(concept, selectedGroupKey, selectedConcept, selectedPreviewItem);
					const isSelected = selectedConcept === concept.concept;

					return (
						<li
							key={concept.concept}
							className={`v4-concept-list-row${highlighted ? " v4-highlighted" : ""}${isSelected ? " v4-selected" : ""}`}
						>
							<button
								type="button"
								className="v4-concept-list-btn"
								onClick={() => onSelectConcept?.(concept.concept)}
								aria-pressed={isSelected}
							>
								<span className="v4-concept-list-name">{concept.concept}</span>
								<span className="v4-concept-list-meta">
									{formatScore(concept.coverageScore)} coverage
									{concept.gap ? " · gap" : ""}
									{concept.noiseCandidate ? " · noise" : ""}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
