import type { SimulatorSectionData } from "../../types/simulator";

type Props = {
	sections?: SimulatorSectionData[];
};

export function SimulationViewer({ sections = [] }: Props) {
	if (sections.length === 0) {
		return null;
	}

	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Notes Section Simulation</p>
			{sections.map((section) => (
				<div
					key={section.sectionId}
					style={{
						background: "rgba(255,251,245,0.9)",
						border: "1px solid rgba(86,57,32,0.14)",
						borderRadius: "14px",
						padding: "0.9rem 1rem",
						marginBottom: "0.65rem",
					}}
				>
					<p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "0.82rem", color: "#563920" }}>
						Section {section.sectionId}
					</p>
					<p style={{ margin: "0.2rem 0", fontSize: "0.82rem" }}>Reading Load: {Math.round(section.readingLoad * 100)}%</p>
					<p style={{ margin: "0.2rem 0", fontSize: "0.82rem" }}>Vocabulary Difficulty: {Math.round(section.vocabularyDifficulty * 100)}%</p>
					<p style={{ margin: "0.2rem 0", fontSize: "0.82rem" }}>Cognitive Load: {Math.round(section.cognitiveLoad * 100)}%</p>
					<p style={{ margin: "0.2rem 0", fontSize: "0.82rem" }}>Confusion Risk: {Math.round(section.confusionRisk * 100)}%</p>
					<p style={{ margin: "0.2rem 0", fontSize: "0.82rem" }}>Fatigue Risk: {Math.round(section.fatigueRisk * 100)}%</p>
					{section.redFlags.length > 0 ? (
						<p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#9a1f1f" }}>
							Red Flags: {section.redFlags.join(", ")}
						</p>
					) : null}
				</div>
			))}
		</div>
	);
}
