import { useState } from "react";

export interface ViewerGroupKey {
	documentId: string;
	groupId: string;
}

export function groupKeyString(key: ViewerGroupKey | null | undefined): string | null {
	if (!key) return null;
	return `${key.documentId}::${key.groupId}`;
}

export function useViewerSelection() {
	const [selectedGroupKey, setSelectedGroupKey] = useState<ViewerGroupKey | null>(null);
	const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
	const [selectedPreviewItem, setSelectedPreviewItem] = useState<string | null>(null);

	function selectGroup(key: ViewerGroupKey | null) {
		setSelectedGroupKey(key);
	}

	function selectConcept(concept: string | null) {
		setSelectedConcept(concept);
	}

	function selectPreviewItem(itemId: string | null, group?: ViewerGroupKey | null) {
		setSelectedPreviewItem(itemId);
		if (group !== undefined) {
			setSelectedGroupKey(group ?? null);
		}
	}

	return {
		selectedGroupKey,
		selectedConcept,
		selectedPreviewItem,
		selectGroup,
		selectConcept,
		selectPreviewItem,
	};
}
