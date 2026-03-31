import type { MisconceptionPracticeEntry, PreviewItemRef } from "../../../prism-v4/intelligence/buildMisconceptionPractice";
import type { ViewerGroupKey } from "../viewer/useViewerSelection";

export type MisconceptionPracticePanelProps = {
	entries: MisconceptionPracticeEntry[];
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectConcept?: (concept: string | null) => void;
	onSelectPreviewItem?: (itemId: string | null, group?: ViewerGroupKey | null) => void;
};

function ItemRow(props: { item: PreviewItemRef; isSelected: boolean; onSelect: () => void }) {
	const { item, isSelected, onSelect } = props;
	return (
		<li className={`v4-misconception-item${isSelected ? " v4-selected" : ""}`}>
			<button
				type="button"
				className="v4-misconception-item-btn"
				onClick={onSelect}
				aria-pressed={isSelected}
				title={`${item.difficulty} · ${item.bloom}`}
			>
				<span className="v4-misconception-item-stem">{item.stem}</span>
				<span className="v4-pill v4-pill-sm">{item.difficulty}</span>
			</button>
		</li>
	);
}

export function MisconceptionPracticePanel(props: MisconceptionPracticePanelProps) {
	const { entries, selectedConcept, selectedPreviewItem, onSelectConcept, onSelectPreviewItem } = props;

	if (!entries.length) {
		return (
			<section className="v4-panel v4-misconception-panel" data-testid="misconception-practice-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Targeted Practice</p>
						<h2>Misconception Practice</h2>
					</div>
				</div>
				<p className="v4-body-copy">No misconception signals detected.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-misconception-panel" data-testid="misconception-practice-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Targeted Practice</p>
					<h2>Misconception Practice</h2>
					<p className="v4-body-copy">Click a concept to select it in the viewer. Click an item to jump to its preview.</p>
				</div>
				<span className="v4-pill">{entries.length} {entries.length === 1 ? "concept" : "concepts"}</span>
			</div>
			<ul className="v4-misconception-list" aria-label="Misconception concepts">
				{entries.map((entry) => {
					const isConceptSelected = selectedConcept === entry.concept;
					return (
						<li
							key={entry.concept}
							className={`v4-misconception-entry${isConceptSelected ? " v4-selected" : ""}`}
						>
							<button
								type="button"
								className="v4-misconception-concept-btn"
								onClick={() => onSelectConcept?.(isConceptSelected ? null : entry.concept)}
								aria-pressed={isConceptSelected}
							>
								<span className="v4-misconception-concept-name">{entry.concept}</span>
								<span className="v4-misconception-label">{entry.misconception}</span>
							</button>
							{entry.recommendedItems.length > 0 ? (
								<ul className="v4-misconception-items" aria-label={`Recommended items for ${entry.concept}`}>
									{entry.recommendedItems.map((item) => (
										<ItemRow
											key={item.itemId}
											item={item}
											isSelected={selectedPreviewItem === item.itemId}
											onSelect={() => onSelectPreviewItem?.(item.itemId, null)}
										/>
									))}
								</ul>
							) : null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
