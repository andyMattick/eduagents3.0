import type { ReactNode } from "react";

import type { BlueprintModel, ConceptMapModel } from "../../types/v4/InstructionalSession";

type BlueprintPanelProps = {
	blueprint: BlueprintModel | null;
	conceptMap?: ConceptMapModel | null;
	isLoading?: boolean;
	status?: string | null;
	onRefresh?: (() => void) | null;
	children?: ReactNode;
};

function totalTargetItems(blueprint: BlueprintModel | null) {
	if (!blueprint) {
		return 0;
	}
	return blueprint.concepts
		.filter((concept) => concept.included !== false)
		.reduce((sum, concept) => sum + Math.max(1, Math.round(concept.quota)), 0);
}

export function BlueprintPanel(props: BlueprintPanelProps) {
	const { blueprint, conceptMap = null, isLoading = false, status = null, onRefresh = null, children } = props;

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card">
				<div className="v4-document-card-header">
					<div>
						<h3>Blueprint Engine</h3>
						<p className="v4-body-copy">Session-scoped concept quotas, demand shape, and scenario balance for the active assessment draft.</p>
					</div>
					{onRefresh ? (
						<button className="v4-button v4-button-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
							{isLoading ? "Loading..." : "Refresh Session Blueprint"}
						</button>
					) : null}
				</div>
				<p className="v4-body-copy">Concepts: {blueprint?.concepts.length ?? 0}. Target items: {totalTargetItems(blueprint)}. Map nodes: {conceptMap?.nodes.length ?? 0}.</p>
				{status ? <p className="v4-upload-name">{status}</p> : null}
			</div>
			{blueprint ? (
				<>
					<div className="v4-product-card">
						<h3>Concept Quotas</h3>
						<ul className="v4-ranked-list">
							{[...blueprint.concepts]
								.sort((left, right) => left.order - right.order)
								.map((concept) => (
									<li key={concept.id}>
										<span>{concept.name}</span>
										<span>{concept.quota} items</span>
									</li>
								))}
						</ul>
					</div>
					<div className="v4-product-card">
						<h3>Demand Shape</h3>
						<ul className="v4-inline-list">
							{blueprint.bloomLadder.map((entry) => <li key={entry.level}>{entry.level}: {entry.count}</li>)}
						</ul>
						<ul className="v4-inline-list">
							{blueprint.difficultyRamp.map((entry) => <li key={entry.band}>{entry.band}: {entry.count}</li>)}
						</ul>
					</div>
					<div className="v4-product-card v4-product-span">
						<h3>Mode and Scenario Mix</h3>
						<ul className="v4-inline-list">
							{blueprint.modeMix.map((entry) => <li key={entry.mode}>{entry.mode}: {entry.count}</li>)}
						</ul>
						<ul className="v4-inline-list">
							{blueprint.scenarioMix.map((entry) => <li key={entry.scenario}>{entry.scenario}: {entry.count}</li>)}
						</ul>
					</div>
				</>
			) : (
				<div className="v4-product-card v4-product-span">
					<h3>Blueprint Loading</h3>
					<p className="v4-body-copy">The session blueprint has not been loaded yet.</p>
				</div>
			)}
			{children ? <div className="v4-product-span">{children}</div> : null}
		</div>
	);
}