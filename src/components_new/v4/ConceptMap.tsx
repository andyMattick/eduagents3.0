import { canonicalConceptId } from "../../prism-v4/teacherFeedback";
import { classifyMasteryBand } from "../../prism-v4/session";
import type { StudentPerformanceProfile } from "../../prism-v4/studentPerformance";
import type { ConceptMapModel } from "../../types/v4/InstructionalSession";

type ConceptMapProps = {
	conceptMap: ConceptMapModel | null;
	studentProfile?: StudentPerformanceProfile | null;
	isLoading?: boolean;
	onRefresh?: (() => void) | null;
};

export function ConceptMap(props: ConceptMapProps) {
	const { conceptMap, studentProfile = null, isLoading = false, onRefresh = null } = props;

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Concept Map</h3>
						<p className="v4-body-copy">A teacher-facing path through the concepts prioritized in this assessment session.</p>
					</div>
					{onRefresh ? (
						<button className="v4-button v4-button-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
							{isLoading ? "Loading..." : "Refresh Map"}
						</button>
					) : null}
				</div>
			</div>
			<div className="v4-product-card">
				<h3>Nodes</h3>
				<ul className="v4-ranked-list">
					{conceptMap?.nodes.length
						? conceptMap.nodes.map((node) => {
							const mastery = studentProfile?.conceptMastery[canonicalConceptId(node.id)]
								?? studentProfile?.conceptMastery[canonicalConceptId(node.label)]
								?? null;
							const band = classifyMasteryBand(mastery);
							return (
							<li key={node.id} className={`v4-concept-node v4-concept-node-${band}`} data-mastery-band={band}>
								<span>{node.label}</span>
								<span>{mastery === null ? node.weight : `${Math.round(mastery * 100)}%`}</span>
							</li>
							);
						})
						: <li><span>No concept nodes available.</span><span>0</span></li>}
				</ul>
			</div>
			<div className="v4-product-card">
				<h3>Transitions</h3>
				<ul className="v4-ranked-list">
					{conceptMap?.edges.length
						? conceptMap.edges.map((edge, index) => (
							<li key={`${edge.from}-${edge.to}-${index}`}>
								<span>{edge.from} to {edge.to}</span>
								<span>{edge.weight}</span>
							</li>
						))
						: <li><span>No concept transitions available.</span><span>0</span></li>}
				</ul>
			</div>
		</div>
	);
}