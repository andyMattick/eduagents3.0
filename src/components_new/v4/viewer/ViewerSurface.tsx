import type { ViewerData } from "../../../prism-v4/viewer";
import { ProblemGroupPanel } from "../ProblemGroupPanel";
import { type ViewerGroupKey, groupKeyString, useViewerSelection } from "./useViewerSelection";
import { ConceptListPanel } from "./ConceptListPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ConceptMapPanel } from "./ConceptMapPanel";
import { CoveragePanel } from "./CoveragePanel";

export type ViewerSurfaceProps = {
	data: ViewerData;
	/** Optional controlled selection — when provided, selection state persists outside this component */
	selectedGroupKey?: ViewerGroupKey | null;
	selectedConcept?: string | null;
	selectedPreviewItem?: string | null;
	onSelectGroup?: (key: ViewerGroupKey | null) => void;
	onSelectConcept?: (concept: string | null) => void;
	onSelectPreviewItem?: (itemId: string | null, group?: ViewerGroupKey | null) => void;
};

export function ViewerSurface(props: ViewerSurfaceProps) {
	const {
		data: viewerData,
		selectedGroupKey: externalGroupKey,
		selectedConcept: externalConcept,
		selectedPreviewItem: externalPreviewItem,
		onSelectGroup,
		onSelectConcept,
		onSelectPreviewItem,
	} = props;

	// Internal fallback state — used when no controlled props are supplied
	const internal = useViewerSelection();
	const selectedGroupKey = externalGroupKey !== undefined ? externalGroupKey : internal.selectedGroupKey;
	const selectedConcept = externalConcept !== undefined ? externalConcept : internal.selectedConcept;
	const selectedPreviewItem = externalPreviewItem !== undefined ? externalPreviewItem : internal.selectedPreviewItem;
	const selectGroup = onSelectGroup ?? internal.selectGroup;
	const selectConcept = onSelectConcept ?? internal.selectConcept;
	const selectPreviewItem = onSelectPreviewItem ?? internal.selectPreviewItem;

	const activeGroup = selectedGroupKey
		? (viewerData.problemGroups.find(
				(g) => g.documentId === selectedGroupKey.documentId && g.groupId === selectedGroupKey.groupId,
			) ?? null)
		: null;

	const groupConceptSet = activeGroup ? new Set(activeGroup.concepts) : undefined;

	const selectedProblemGroupKeyStr = groupKeyString(selectedGroupKey);

	return (
		<div className="v4-viewer" data-testid="v4-viewer-surface">
			<div className="v4-shell">
				<div className="v4-viewer-grid">
					<ProblemGroupPanel
						problemGroups={viewerData.problemGroups}
						selectedProblemGroupKey={selectedProblemGroupKeyStr}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						onSelectProblemGroup={(group) => selectGroup({ documentId: group.documentId, groupId: group.groupId })}
						onSelectGroup={(group) => selectGroup({ documentId: group.documentId, groupId: group.groupId })}
					/>

					<ConceptListPanel
						scoredConcepts={viewerData.scoredConcepts}
						selectedGroupKey={selectedGroupKey}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						onSelectConcept={selectConcept}
					/>

					<PreviewPanel
						previewItems={viewerData.previewItems}
						selectedGroupKey={selectedGroupKey}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						onSelectPreviewItem={selectPreviewItem}
					/>

					<ConceptMapPanel
						conceptGraph={viewerData.conceptGraph}
						selectedGroupKey={selectedGroupKey}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						groupConceptSet={groupConceptSet}
						onSelectConcept={selectConcept}
					/>

					<CoveragePanel
						scoredConcepts={viewerData.scoredConcepts}
						selectedGroupKey={selectedGroupKey}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						onSelectConcept={selectConcept}
					/>
				</div>
			</div>
		</div>
	);
}
