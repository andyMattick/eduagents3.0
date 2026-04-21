/**
 * src/components_new/v4/ShortCircuitGraph.tsx
 *
 * Measurables graph for the short-circuit diagnostic page.
 * Multi-line chart with toggleable metric overlay buttons.
 * No Gemini. No profiles. Pure local semantic analysis output.
 */

import { useState } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import type { ShortCircuitItem } from "../../../api/v4/simulator/shortcircuit";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MEASURABLES: Array<{ key: keyof ShortCircuitItem; label: string; color: string }> = [
	{ key: "cognitiveLoad",        label: "Cognitive Load",       color: "#2563eb" },
	{ key: "readingLoad",          label: "Reading Load",         color: "#dc2626" },
	{ key: "vocabularyDifficulty", label: "Vocabulary Difficulty", color: "#16a34a" },
	{ key: "misconceptionRisk",    label: "Misconception Risk",   color: "#9333ea" },
	{ key: "distractorDensity",    label: "Distractor Density",   color: "#d97706" },
	{ key: "confusionScore",       label: "Confusion Score",      color: "#0891b2" },
	{ key: "steps",                label: "Steps",                color: "#7c3aed" },
	{ key: "timeToProcessSeconds", label: "Time to Process (s)",  color: "#be185d" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShortCircuitGraphProps {
	items: ShortCircuitItem[];
}

export function ShortCircuitGraph({ items }: ShortCircuitGraphProps) {
	const [selected, setSelected] = useState<Set<string>>(
		new Set(["cognitiveLoad", "readingLoad", "confusionScore"]),
	);

	const toggle = (key: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const activeLines = MEASURABLES.filter((m) => selected.has(m.key as string));

	return (
		<div>
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
				{MEASURABLES.map((m) => {
					const active = selected.has(m.key as string);
					return (
						<button
							key={m.key as string}
							onClick={() => toggle(m.key as string)}
							style={{
								padding: "0.3rem 0.75rem",
								borderRadius: "6px",
								border: `2px solid ${m.color}`,
								background: active ? m.color : "transparent",
								color: active ? "#fff" : m.color,
								fontSize: "0.8rem",
								cursor: "pointer",
								fontWeight: active ? 600 : 400,
								transition: "all 0.15s",
							}}
						>
							{m.label}
						</button>
					);
				})}
			</div>

			<ResponsiveContainer width="100%" height={400}>
				<LineChart data={items} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
					<XAxis
						dataKey="itemNumber"
						label={{ value: "Item #", position: "insideBottom", offset: -4 }}
					/>
					<YAxis domain={[0, "auto"]} />
					<Tooltip
						formatter={(value: number, name: string) => [value.toFixed(3), name]}
						labelFormatter={(label) => `Item ${label}`}
					/>
					<Legend verticalAlign="top" />
					{activeLines.map((m) => (
						<Line
							key={m.key as string}
							type="monotone"
							dataKey={m.key as string}
							name={m.label}
							stroke={m.color}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>

			<p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
				{items.length} item{items.length !== 1 ? "s" : ""} — local semantic analysis (no Gemini)
			</p>
		</div>
	);
}
