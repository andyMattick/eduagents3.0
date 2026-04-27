import { useMemo } from "react";
import type { ViewerData } from "../../../prism-v4/viewer";
import { buildTeacherNarrative } from "../../../prism-v4/intelligence/buildTeacherNarrative";
import { buildMisconceptionPractice } from "../../../prism-v4/intelligence/buildMisconceptionPractice";
import { buildInstructionalMap } from "../../../prism-v4/intelligence/buildInstructionalMap";
import { buildSummaryCards } from "../../../prism-v4/intelligence/buildSummaryCards";
import type { ViewerGroupKey } from "../viewer/useViewerSelection";
import { SummaryCardsPanel } from "./SummaryCardsPanel";
import { TeacherNarrativePanel } from "./TeacherNarrativePanel";
import { MisconceptionPracticePanel } from "./MisconceptionPracticePanel";
import { InstructionalMapPanel } from "./InstructionalMapPanel";

export type InstructionalIntelligenceSurfaceProps = {
	data: ViewerData;
	/** Controlled selection — wired from PavilionSessionView for cross-tab persistence */
	selectedConcept?: string | null;
	selectedGroupKey?: ViewerGroupKey | null;
	selectedPreviewItem?: string | null;
	onSelectConcept?: (concept: string | null) => void;
	onSelectGroup?: (key: ViewerGroupKey | null) => void;
	onSelectPreviewItem?: (itemId: string | null, group?: ViewerGroupKey | null) => void;
};

type PanelId = "summary" | "narrative" | "misconception" | "map" | "coverage";

export function InstructionalIntelligenceSurface(props: InstructionalIntelligenceSurfaceProps) {
	const {
		data,
		selectedConcept,
		selectedGroupKey,
		selectedPreviewItem,
		onSelectConcept,
		onSelectGroup,
		onSelectPreviewItem,
	} = props;

	const narrative = useMemo(() => buildTeacherNarrative(data, {}), [data]);
	const misconceptionPractice = useMemo(
		() => buildMisconceptionPractice(data.scoredConcepts, data.previewItems, data.conceptGraph),
		[data],
	);
	const instructionalMap = useMemo(
		() =>
			buildInstructionalMap(
				data.problemGroups,
				data.scoredConcepts,
				data.conceptGraph,
				data.collectionAnalysis?.coverageSummary ?? null,
			),
		[data],
	);
	const summaryCards = useMemo(() => buildSummaryCards(data), [data]);

	function handleNavigate(target: PanelId) {
		// Scroll to the panel by its testid
		const el = document.querySelector(`[data-testid="${target}-panel"]`) ??
			document.querySelector(`[data-panel-nav="${target}"]`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	return (
		<div className="v4-intelligence-surface" data-testid="v4-intelligence-surface">
			<div className="v4-shell">
				<div className="v4-intelligence-grid">
					<SummaryCardsPanel
						cards={summaryCards.cards}
						onNavigate={handleNavigate}
					/>
					<TeacherNarrativePanel sections={narrative.sections} />
					<MisconceptionPracticePanel
						entries={misconceptionPractice.entries}
						selectedConcept={selectedConcept}
						selectedPreviewItem={selectedPreviewItem}
						onSelectConcept={onSelectConcept}
						onSelectPreviewItem={onSelectPreviewItem}
					/>
					<InstructionalMapPanel
						entries={instructionalMap.entries}
						selectedConcept={selectedConcept}
						selectedGroupKey={selectedGroupKey}
						onSelectConcept={onSelectConcept}
						onSelectGroup={onSelectGroup}
					/>
				</div>
			</div>
		</div>
	);
}
