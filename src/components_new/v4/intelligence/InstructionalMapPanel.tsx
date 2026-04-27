import type { InstructionalMapEntry } from "../../../prism-v4/intelligence/buildInstructionalMap";
import type { ViewerGroupKey } from "../viewer/useViewerSelection";

export type InstructionalMapPanelProps = {
	entries: InstructionalMapEntry[];
	selectedConcept?: string | null;
	selectedGroupKey?: ViewerGroupKey | null;
	onSelectConcept?: (concept: string | null) => void;
	onSelectGroup?: (key: ViewerGroupKey | null) => void;
};

const ACTION_LABELS: Record<string, string> = {
	reteach: "Re-teach",
	reinforce: "Reinforce",
	extend: "Extend",
	differentiate: "Differentiate",
};

export function InstructionalMapPanel(props: InstructionalMapPanelProps) {
	const { entries, selectedConcept, selectedGroupKey, onSelectConcept, onSelectGroup } = props;

	if (!entries.length) {
		return (
			<section className="v4-panel v4-instructional-map-panel" data-testid="instructional-map-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Intelligence</p>
						<h2>Instructional Map</h2>
					</div>
				</div>
				<p className="v4-body-copy">No problem groups available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-instructional-map-panel" data-testid="instructional-map-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Intelligence</p>
					<h2>Instructional Map</h2>
					<p className="v4-body-copy">Click a group or concept to select it in the viewer.</p>
				</div>
				<span className="v4-pill">{entries.length} {entries.length === 1 ? "group" : "groups"}</span>
			</div>
			<table className="v4-instructional-map-table" aria-label="Instructional map">
				<thead>
					<tr>
						<th scope="col">Group</th>
						<th scope="col">Concepts</th>
						<th scope="col">Skills</th>
						<th scope="col">Actions</th>
					</tr>
				</thead>
				<tbody>
					{entries.map((entry) => {
						const isGroupSelected =
							selectedGroupKey?.groupId === entry.groupId &&
							selectedGroupKey?.documentId === entry.documentId;

						return (
							<tr
								key={`${entry.documentId}::${entry.groupId}`}
								className={`v4-instructional-map-row${isGroupSelected ? " v4-selected" : ""}`}
								aria-selected={isGroupSelected}
							>
								<td>
									<button
										type="button"
										className="v4-map-group-btn"
										aria-pressed={isGroupSelected}
										onClick={() =>
											onSelectGroup?.(
												isGroupSelected ? null : { documentId: entry.documentId, groupId: entry.groupId },
											)
										}
									>
										{entry.groupTitle}
									</button>
								</td>
								<td>
									<ul className="v4-map-concept-list" aria-label={`Concepts for ${entry.groupTitle}`}>
										{entry.concepts.map((concept) => {
											const isConceptSelected = selectedConcept === concept;
											return (
												<li key={concept}>
													<button
														type="button"
														className={`v4-map-concept-btn${isConceptSelected ? " v4-selected" : ""}`}
														aria-pressed={isConceptSelected}
														onClick={() => onSelectConcept?.(isConceptSelected ? null : concept)}
													>
														{concept}
													</button>
												</li>
											);
										})}
									</ul>
								</td>
								<td>
									<ul className="v4-map-skill-list" aria-label={`Skills for ${entry.groupTitle}`}>
										{entry.skills.length ? (
											entry.skills.map((skill) => (
												<li key={skill}>
													<span className="v4-map-skill">{skill}</span>
												</li>
											))
										) : (
											<li><span className="v4-body-copy">—</span></li>
										)}
									</ul>
								</td>
								<td>
									<ul className="v4-map-action-list" aria-label={`Actions for ${entry.groupTitle}`}>
										{entry.recommendedActions.map((action) => (
											<li key={action}>
												<span className={`v4-pill v4-action-pill v4-action-${action}`}>
													{ACTION_LABELS[action] ?? action}
												</span>
											</li>
										))}
									</ul>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</section>
	);
}
