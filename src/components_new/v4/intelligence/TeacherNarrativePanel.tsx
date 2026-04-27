import type { NarrativeSection } from "../../../prism-v4/intelligence/buildTeacherNarrative";

export type TeacherNarrativePanelProps = {
	sections: NarrativeSection[];
};

export function TeacherNarrativePanel(props: TeacherNarrativePanelProps) {
	const { sections } = props;

	if (!sections.length) {
		return (
			<section className="v4-panel v4-narrative-panel" data-testid="teacher-narrative-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Intelligence</p>
						<h2>Teacher Narrative</h2>
					</div>
				</div>
				<p className="v4-body-copy">No narrative available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-narrative-panel" data-testid="teacher-narrative-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Intelligence</p>
					<h2>Teacher Narrative</h2>
					<p className="v4-body-copy">A generated summary of your workspace's instructional meaning.</p>
				</div>
				<span className="v4-pill">{sections.length} {sections.length === 1 ? "section" : "sections"}</span>
			</div>
			<div className="v4-narrative-sections">
				{sections.map((section) => (
					<article key={section.id} className="v4-narrative-section" data-section-id={section.id}>
						<h3 className="v4-narrative-section-title">{section.title}</h3>
						<p className="v4-body-copy v4-narrative-section-body">{section.body}</p>
					</article>
				))}
			</div>
		</section>
	);
}
