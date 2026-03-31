import type { ConceptMapModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";
import type { ViewerGroupKey } from "./useViewerSelection";

export type ConceptMapPanelProps = {
	conceptGraph: ConceptMapModel | null;
	selectedGroupKey?: ViewerGroupKey | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	groupConceptSet?: Set<string>;
	onSelectConcept?: (concept: string) => void;
};

function nodeIsHighlighted(
	nodeId: string,
	selectedConcept: string | null | undefined,
	groupConceptSet: Set<string> | undefined,
): boolean {
	if (selectedConcept && nodeId === selectedConcept) return true;
	if (groupConceptSet && groupConceptSet.has(nodeId)) return true;
	return false;
}

export function ConceptMapPanel(props: ConceptMapPanelProps) {
	const { conceptGraph, selectedConcept, groupConceptSet, onSelectConcept } = props;

	if (!conceptGraph || !conceptGraph.nodes.length) {
		return (
			<section className="v4-panel v4-concept-map-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Concept graph</p>
						<h2>Concept map</h2>
					</div>
				</div>
				<p className="v4-body-copy">No concept graph available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-concept-map-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Concept graph</p>
					<h2>Concept map</h2>
					<p className="v4-body-copy">Nodes sized by weight. Click to select a concept.</p>
				</div>
				<span className="v4-pill">{conceptGraph.nodes.length} {conceptGraph.nodes.length === 1 ? "node" : "nodes"}</span>
			</div>
			<div className="v4-concept-map-node-list" role="list" aria-label="Concept map nodes">
				{conceptGraph.nodes.map((node) => {
					const highlighted = nodeIsHighlighted(node.id, selectedConcept, groupConceptSet);
					const isSelected = selectedConcept === node.id;

					return (
						<button
							key={node.id}
							type="button"
							role="listitem"
							className={`v4-concept-map-node${highlighted ? " v4-highlighted" : ""}${isSelected ? " v4-selected" : ""}`}
							onClick={() => onSelectConcept?.(node.id)}
							aria-pressed={isSelected}
							style={{ fontSize: `${Math.min(1.4, 0.8 + node.weight * 0.3)}rem` }}
						>
							{node.label}
						</button>
					);
				})}
			</div>
			{conceptGraph.edges.length > 0 && (
				<p className="v4-body-copy" style={{ marginTop: "0.5rem" }}>
					{conceptGraph.edges.length} concept {conceptGraph.edges.length === 1 ? "edge" : "edges"} detected.
				</p>
			)}
		</section>
	);
}
