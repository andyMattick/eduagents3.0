import type { BuilderPlanModel } from "../../types/v4/InstructionalSession";

type BuilderPlanViewProps = {
	plan: BuilderPlanModel | null;
	isLoading?: boolean;
	status?: string | null;
	onRefresh?: (() => void) | null;
};

export function BuilderPlanView(props: BuilderPlanViewProps) {
	const { plan, isLoading = false, status = null, onRefresh = null } = props;

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Builder Plan</h3>
						<p className="v4-body-copy">The canonical adaptive plan for quotas, Bloom sequencing, difficulty ramping, and rotation patterns.</p>
					</div>
					{onRefresh ? (
						<button className="v4-button v4-button-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
							{isLoading ? "Loading..." : "Refresh Plan"}
						</button>
					) : null}
				</div>
				{status ? <p className="v4-upload-name">{status}</p> : null}
			</div>
			<div className="v4-product-card v4-product-span">
				<h3>Adaptive Targets</h3>
				<p className="v4-body-copy">Boosted concepts: {plan?.adaptiveTargets?.boostedConcepts.join(", ") || "None"}.</p>
				<p className="v4-body-copy">Suppressed concepts: {plan?.adaptiveTargets?.suppressedConcepts.join(", ") || "None"}.</p>
				<p className="v4-body-copy">Boosted Bloom: {plan?.adaptiveTargets?.boostedBloom.join(", ") || "None"}.</p>
				<p className="v4-body-copy">Suppressed Bloom: {plan?.adaptiveTargets?.suppressedBloom.join(", ") || "None"}.</p>
			</div>
			{plan?.sections.map((section) => (
				<article key={section.conceptId} className="v4-product-card">
					<h3>{section.conceptName}</h3>
					<p className="v4-body-copy">Target items: {section.itemCount}</p>
					<p className="v4-body-copy">Bloom ladder: {section.bloomSequence.join(" -> ")}</p>
					<p className="v4-body-copy">Difficulty ramp: {section.difficultySequence.join(" -> ")}</p>
					<p className="v4-body-copy">Mode rotation: {section.modeSequence.join(" -> ")}</p>
					<p className="v4-body-copy">Scenario rotation: {section.scenarioSequence.join(" -> ")}</p>
				</article>
			)) ?? null}
			{!plan ? (
				<div className="v4-product-card v4-product-span">
					<p className="v4-body-copy">No builder plan has been loaded for this session yet.</p>
				</div>
			) : null}
		</div>
	);
}