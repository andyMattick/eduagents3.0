import type { ViewerScoredConcept } from "../../../prism-v4/viewer";
import type { ViewerGroupKey } from "./useViewerSelection";

export type CoveragePanelProps = {
	scoredConcepts: ViewerScoredConcept[];
	selectedGroupKey?: ViewerGroupKey | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectConcept?: (concept: string) => void;
};

function pct(score: number) {
	return `${Math.round(score * 100)}%`;
}

function isCoverageRowHighlighted(
	concept: ViewerScoredConcept,
	selectedGroupKey: ViewerGroupKey | null | undefined,
	selectedConcept: string | null | undefined,
): boolean {
	if (selectedConcept && concept.concept === selectedConcept) return true;
	if (selectedGroupKey && concept.groupIds.some((gid) => gid === selectedGroupKey.groupId)) return true;
	return false;
}

export function CoveragePanel(props: CoveragePanelProps) {
	const { scoredConcepts, selectedGroupKey, selectedConcept, onSelectConcept } = props;
	const sorted = [...scoredConcepts].sort((a, b) => b.coverageScore - a.coverageScore);

	if (!sorted.length) {
		return (
			<section className="v4-panel v4-coverage-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Coverage</p>
						<h2>Coverage table</h2>
					</div>
				</div>
				<p className="v4-body-copy">No coverage data available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-coverage-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Coverage</p>
					<h2>Coverage table</h2>
					<p className="v4-body-copy">Click a row to select a concept across all panels.</p>
				</div>
				<span className="v4-pill">{sorted.length} {sorted.length === 1 ? "concept" : "concepts"}</span>
			</div>
			<div className="v4-coverage-table-wrap">
				<table className="v4-coverage-table" aria-label="Concept coverage table">
					<thead>
						<tr>
							<th scope="col">Concept</th>
							<th scope="col">Coverage</th>
							<th scope="col">Gap</th>
							<th scope="col">Problems</th>
							<th scope="col">Preview</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((concept) => {
							const highlighted = isCoverageRowHighlighted(concept, selectedGroupKey, selectedConcept);
							const isSelected = selectedConcept === concept.concept;

							return (
								<tr
									key={concept.concept}
									className={`v4-coverage-row${highlighted ? " v4-highlighted" : ""}${isSelected ? " v4-selected" : ""}`}
									onClick={() => onSelectConcept?.(concept.concept)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onSelectConcept?.(concept.concept);
										}
									}}
									aria-pressed={isSelected}
								>
									<td>{concept.concept}</td>
									<td>{pct(concept.coverageScore)}</td>
									<td>{concept.gap ? "Yes" : "—"}</td>
									<td>{concept.problemCount}</td>
									<td>{concept.previewCount}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
