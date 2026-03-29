import type { InstructionalAnalysis } from "../../types/v4/InstructionalSession";

function formatCoverage(value: number) {
	return `${Math.round(value * 100)}%`;
}

function toTitleCase(value: string) {
	return value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
		.join(" ");
}

export function AnalysisPanel(props: { analysis: InstructionalAnalysis | null }) {
	const { analysis } = props;

	return (
		<section className="v4-panel v4-analysis-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Act 1</p>
					<h2>Document analysis</h2>
				</div>
				{analysis ? <span className="v4-pill">Document analyzed</span> : null}
			</div>
			{analysis ? (
				<>
					<div className="v4-analysis-overview">
						<div className="v4-stat-card">
							<span className="v4-stat-label">Domain</span>
							<strong>{analysis.domain}</strong>
						</div>
						<div className="v4-stat-card">
							<span className="v4-stat-label">Concepts</span>
							<strong>{analysis.concepts.length}</strong>
						</div>
						<div className="v4-stat-card">
							<span className="v4-stat-label">Problems</span>
							<strong>{analysis.problems.reduce((sum, entry) => sum + entry.problemCount, 0)}</strong>
						</div>
						<div className="v4-stat-card">
							<span className="v4-stat-label">Misconceptions</span>
							<strong>{analysis.misconceptions.length}</strong>
						</div>
					</div>

					<div className="v4-columns v4-analysis-columns">
						<div>
							<h3>Concepts</h3>
							<ul className="v4-inline-list" aria-label="Analysis concepts">
								{analysis.concepts.map((concept) => (
									<li key={concept.concept}>
										{concept.concept} · {formatCoverage(concept.coverage)}
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3>Bloom levels</h3>
							<ul className="v4-ranked-list" aria-label="Bloom summary">
								{Object.entries(analysis.bloomSummary).map(([level, count]) => (
									<li key={level}>
										<span>{toTitleCase(level)}</span>
										<strong>{count}</strong>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3>Difficulty</h3>
							<ul className="v4-ranked-list" aria-label="Difficulty summary">
								<li>
									<span>Low</span>
									<strong>{analysis.difficultySummary.low}</strong>
								</li>
								<li>
									<span>Medium</span>
									<strong>{analysis.difficultySummary.medium}</strong>
								</li>
								<li>
									<span>High</span>
									<strong>{analysis.difficultySummary.high}</strong>
								</li>
								<li>
									<span>Instructional density</span>
									<strong>{analysis.difficultySummary.averageInstructionalDensity}</strong>
								</li>
							</ul>
						</div>
					</div>

					<div className="v4-columns v4-analysis-columns">
						<div>
							<h3>Problems extracted</h3>
							<ul className="v4-ranked-list" aria-label="Problem summary">
								{analysis.problems.map((problem) => (
									<li key={problem.documentId}>
										<span>{problem.sourceFileName}</span>
										<strong>{problem.problemCount}</strong>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3>Modes and scenarios</h3>
							<ul className="v4-ranked-list" aria-label="Mode summary">
								{Object.entries(analysis.modeSummary).map(([mode, count]) => (
									<li key={mode}>
										<span>{toTitleCase(mode)}</span>
										<strong>{count}</strong>
									</li>
								))}
							</ul>
							<ul className="v4-ranked-list" aria-label="Scenario summary">
								{Object.entries(analysis.scenarioSummary).map(([scenario, count]) => (
									<li key={scenario}>
										<span>{toTitleCase(scenario)}</span>
										<strong>{count}</strong>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3>Misconceptions</h3>
							<ul className="v4-ranked-list" aria-label="Misconception summary">
								{analysis.misconceptions.length > 0 ? analysis.misconceptions.map((entry) => (
									<li key={entry.misconception}>
										<span>{entry.misconception}</span>
										<strong>{entry.occurrences}</strong>
									</li>
								)) : <li><span>No misconception patterns detected</span><strong>-</strong></li>}
							</ul>
						</div>
					</div>
				</>
			) : (
				<p className="v4-body-copy">Create a workspace and the platform will surface the document’s concepts, Bloom profile, misconceptions, difficulty, and domain here.</p>
			)}
		</section>
	);
}