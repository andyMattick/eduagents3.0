import type { SummaryCard } from "../../../prism-v4/intelligence/buildSummaryCards";

export type SummaryCardsPanelProps = {
	cards: SummaryCard[];
	onNavigate?: (target: SummaryCard["linkTarget"]) => void;
};

export function SummaryCardsPanel(props: SummaryCardsPanelProps) {
	const { cards, onNavigate } = props;

	if (!cards.length) {
		return (
			<section className="v4-panel v4-summary-cards-panel" data-testid="summary-cards-panel">
				<div className="v4-section-heading">
					<div>
						<p className="v4-kicker">Intelligence</p>
						<h2>Summary</h2>
					</div>
				</div>
				<p className="v4-body-copy">No summary available.</p>
			</section>
		);
	}

	return (
		<section className="v4-panel v4-summary-cards-panel" data-testid="summary-cards-panel">
			<div className="v4-section-heading">
				<div>
					<p className="v4-kicker">Intelligence</p>
					<h2>Summary</h2>
					<p className="v4-body-copy">At-a-glance workspace health. Click any card to see the detail panel.</p>
				</div>
			</div>
			<div className="v4-summary-cards-grid">
				{cards.map((card) => (
					<button
						key={card.id}
						type="button"
						className="v4-summary-card"
						data-card-id={card.id}
						aria-label={`${card.title}: ${card.value}`}
						onClick={() => onNavigate?.(card.linkTarget)}
					>
						<span className="v4-summary-card-title">{card.title}</span>
						<span className="v4-summary-card-value">{card.value}</span>
						<span className="v4-summary-card-detail">{card.detail}</span>
					</button>
				))}
			</div>
		</section>
	);
}
