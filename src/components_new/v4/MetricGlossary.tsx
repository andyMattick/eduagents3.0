/**
 * MetricGlossary.tsx
 *
 * "What do these numbers mean?" expandable glossary panel.
 * Drop this anywhere a simulator metric table is shown.
 *
 * Usage:
 *   <MetricGlossary keys={["cognitiveLoad", "confusionRisk", "readingLoad"]} />
 *   <MetricGlossary />  // shows all metrics
 */

import { useState } from "react";
import { METRIC_DEFINITIONS, type MetricDefinition } from "../../lib/metricDefinitions";

interface MetricGlossaryProps {
	/** Restrict to specific metric keys; shows all when omitted. */
	keys?: string[];
	/** Label for the toggle button. */
	label?: string;
}

export function MetricGlossary({ keys, label = "What do these numbers mean?" }: MetricGlossaryProps) {
	const [open, setOpen] = useState(false);

	const definitions: MetricDefinition[] = keys
		? METRIC_DEFINITIONS.filter((m) => keys.includes(m.key))
		: METRIC_DEFINITIONS;

	return (
		<div style={{ marginTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "0.75rem" }}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				style={{
					background: "none",
					border: "none",
					padding: 0,
					cursor: "pointer",
					fontSize: "0.8rem",
					color: "#4f6cf6",
					fontWeight: 600,
					display: "flex",
					alignItems: "center",
					gap: "0.3rem",
				}}
				aria-expanded={open}
			>
				<span style={{ fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
				{label}
			</button>

			{open && (
				<div
					style={{
						marginTop: "0.75rem",
						display: "grid",
						gap: "0.75rem",
					}}
					role="region"
					aria-label="Metric definitions"
				>
					{definitions.map((def) => (
						<div
							key={def.key}
							style={{
								background: "rgba(248,250,255,0.9)",
								border: "1px solid rgba(79,108,246,0.15)",
								borderRadius: "10px",
								padding: "0.75rem 1rem",
							}}
						>
							<p
								style={{
									margin: "0 0 0.2rem",
									fontWeight: 700,
									fontSize: "0.85rem",
									color: "#1e293b",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "baseline",
									gap: "0.5rem",
								}}
							>
								<span>{def.label}</span>
								<span
									style={{
										fontWeight: 400,
										fontSize: "0.75rem",
										color: "#64748b",
										whiteSpace: "nowrap",
									}}
								>
									{def.range}{def.unit ? ` ${def.unit}` : ""}
								</span>
							</p>
							<p style={{ margin: "0 0 0.35rem", fontSize: "0.8rem", color: "#334155" }}>
								{def.definition}
							</p>
							<details style={{ fontSize: "0.78rem", color: "#475569" }}>
								<summary style={{ cursor: "pointer", color: "#64748b", marginBottom: "0.25rem" }}>
									How it&apos;s computed
								</summary>
								<p style={{ margin: "0.25rem 0 0.35rem 0.75rem" }}>{def.computation}</p>
							</details>
							<p
								style={{
									margin: "0.35rem 0 0",
									fontSize: "0.78rem",
									color: "#0f5132",
									background: "rgba(209,250,229,0.4)",
									borderRadius: "6px",
									padding: "0.3rem 0.5rem",
								}}
							>
								<strong>Interpretation: </strong>
								{def.interpretation}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
