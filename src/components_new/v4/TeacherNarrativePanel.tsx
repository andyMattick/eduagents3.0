import type { DocumentSemanticInsights, ProblemTagVector } from "../../prism-v4/schema/semantic";
import { generateNarrative } from "../../prism-v4/semantic/narrative/generateNarrative";
import { narrativeThemeLabel, type NarrativeTheme } from "../../prism-v4/semantic/narrative/themes";

export interface TeacherNarrativePanelProps {
	theme: NarrativeTheme;
	problem: ProblemTagVector;
	document: DocumentSemanticInsights;
}

export function TeacherNarrativePanel(props: TeacherNarrativePanelProps) {
	const { theme, problem, document } = props;
	const narrative = generateNarrative(theme, problem, document);

	return (
		<div className="v4-narrative-block" data-testid="teacher-narrative-panel">
			<p className="v4-section-title">{narrativeThemeLabel(theme)}</p>
			<p className="v4-narrative">{narrative}</p>
		</div>
	);
}