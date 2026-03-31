import type { AssessmentPreviewItemModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";
import type { ViewerGroupKey } from "./useViewerSelection";

export type PreviewPanelProps = {
	previewItems: AssessmentPreviewItemModel[];
	selectedGroupKey?: ViewerGroupKey | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectPreviewItem?: (itemId: string, group?: ViewerGroupKey) => void;
};

function isPreviewHighlighted(
	item: AssessmentPreviewItemModel,
	selectedGroupKey: ViewerGroupKey | null | undefined,
	selectedConcept: string | null | undefined,
	selectedPreviewItem: string | null | undefined,
): boolean {
	if (selectedPreviewItem && item.itemId === selectedPreviewItem) return true;
	if (selectedGroupKey && item.groupId === selectedGroupKey.groupId) return true;
	if (selectedConcept) {
		const concepts = item.primaryConcepts ?? [item.conceptId];
		if (concepts.includes(selectedConcept)) return true;
	}
	return false;
}

export function PreviewPanel(props: PreviewPanelProps) {
	const { previewItems, selectedGroupKey, selectedConcept, selectedPreviewItem, onSelectPreviewItem } = props;

	if (!previewItems.length) {
		return (
			<section className="v4-panel v4-preview-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Preview items</p>
						<h2>Assessment preview</h2>
					</div>
				</div>
				<p className="v4-body-copy">No preview items available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-preview-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Preview items</p>
					<h2>Assessment preview</h2>
					<p className="v4-body-copy">Generated items linked to source groups and concepts.</p>
				</div>
				<span className="v4-pill">{previewItems.length} {previewItems.length === 1 ? "item" : "items"}</span>
			</div>
			<div className="v4-preview-list">
				{previewItems.map((item) => {
					const highlighted = isPreviewHighlighted(item, selectedGroupKey, selectedConcept, selectedPreviewItem);
					const isSelected = selectedPreviewItem === item.itemId;
					const groupKey: ViewerGroupKey | undefined =
						item.groupId && item.sourceDocumentId
							? { documentId: item.sourceDocumentId, groupId: item.groupId }
							: undefined;

					return (
						<button
							key={item.itemId}
							type="button"
							className={`v4-preview-card${highlighted ? " v4-highlighted" : ""}${isSelected ? " v4-selected" : ""}`}
							onClick={() => onSelectPreviewItem?.(item.itemId, groupKey)}
							aria-pressed={isSelected}
						>
							<div className="v4-problem-group-subheading">
								<h4>{item.itemId}</h4>
								<div>
									<span className="v4-pill">{item.bloom}</span>
									<span className="v4-pill">{item.difficulty}</span>
								</div>
							</div>
							<p className="v4-body-copy">{item.stem}</p>
							<p className="v4-body-copy">
								Concepts: {(item.primaryConcepts ?? [item.conceptId]).join(", ")}
							</p>
							{item.groupId ? <p className="v4-body-copy">Group: {item.groupId}</p> : null}
						</button>
					);
				})}
			</div>
		</section>
	);
}
