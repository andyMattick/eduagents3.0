/**
 * src/components_new/v4/ShortCircuitGraph.tsx
 *
 * Simulation 2.1 — deterministic Phase B graphing architecture.
 *
 * SECTION 1 — Deterministic per-item graphs
 *   These show document-based item characteristics only.
 *   They do NOT vary by student profile.
 *   Metrics: linguistic load, word count, avg word length, steps, confusion
 *   (deterministic), time (per item), Bloom's level, sentence count,
 *   avg sentence length, distractor density, symbol density.
 *   Plus: vocab heatmap (stacked bar).
 *
 * All graphs are theme-aware (light / dark mode via data-theme attribute).
 */

import { useState } from "react";
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
	Legend,
	CartesianGrid,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { useTheme } from "../../hooks/useTheme";
import type { SimulationItem as ShortCircuitItem } from "../../prism-v4/schema";

// ---------------------------------------------------------------------------
// Theme-aware color helpers
// ---------------------------------------------------------------------------

function useChartTheme() {
	const { theme } = useTheme();
	const dark = theme === "dark";
	return {
		gridColor:       dark ? "#374151" : "#e5e7eb",
		textColor:       dark ? "#d1d5db" : "#374151",
		bgColor:         dark ? "#1f2937" : "#ffffff",
		subTextColor:    dark ? "#9ca3af" : "#6b7280",
		headingColor:    dark ? "#f9fafb" : "#111827",
		borderColor:     dark ? "#374151" : "#e5e7eb",
		panelBg:         dark ? "rgba(31,41,55,0.8)" : "rgba(255,251,245,0.9)",
		panelBorder:     dark ? "1px solid rgba(156,163,175,0.2)" : "1px solid rgba(86,57,32,0.16)",
	};
}

// ---------------------------------------------------------------------------
// Section 1 — Deterministic per-item series config
// ---------------------------------------------------------------------------

const DETERMINISTIC_SERIES = [
	{ key: "linguisticLoad",     label: "Linguistic Load",       color: "#0ea5e9", description: "Combined vocab difficulty + avg word length (0–1). Already normalized." },
	{ key: "confusion",          label: "Confusion",             color: "#f97316", description: "Multi-factor confusion score (0–1): linguistic load, distractor density, steps, misconception risk, time." },
	{ key: "wordCount",          label: "Word Count",            color: "#6366f1", description: "Words in the item, normalized 0–1 (ceiling: 60 words)." },
	{ key: "avgWordLength",      label: "Avg Word Length",       color: "#8b5cf6", description: "Average character length of words, normalized 0–1 (ceiling: 8 chars)." },
	{ key: "steps",              label: "Steps",                 color: "#14b8a6", description: "Reasoning steps, normalized 0–1 against the hardest item in this document." },
	{ key: "time",               label: "Time (norm)",           color: "#f59e0b", description: "Estimated processing time, normalized 0–1." },
	{ key: "sentenceCount",      label: "Sentence Count",        color: "#84cc16", description: "Number of sentences, normalized 0–1 (ceiling: 8 sentences)." },
	{ key: "avgSentenceLength",  label: "Avg Sentence Length",   color: "#06b6d4", description: "Average words per sentence, normalized 0–1 (ceiling: 16 words)." },
	{ key: "distractorDensity",  label: "Distractor Density",    color: "#ef4444", description: "Density of distractors/misleading elements (0–1). Hidden when always zero." },
	{ key: "symbolDensity",      label: "Symbol Density",        color: "#a78bfa", description: "Density of math/science symbols (0–1). Already normalized." },
] as const;

type DeterministicKey = typeof DETERMINISTIC_SERIES[number]["key"];

// ---------------------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------------------

function timeNorm(timeSeconds: number): number {
	const m = timeSeconds / 60;
	if (m <= 1) return 0.2;
	if (m <= 2) return 0.4;
	if (m <= 3) return 0.6;
	if (m <= 4) return 0.8;
	return 1.0;
}

/**
 * Returns true when all values in the array are identical (within a small
 * epsilon). Used to skip "time" if it is a flat line.
 */
function isFlat(values: number[]): boolean {
	if (values.length < 2) return true;
	const first = values[0];
	return values.every((v) => Math.abs(v - (first ?? 0)) < 0.001);
}

// ---------------------------------------------------------------------------
// Bloom's level bar color
// ---------------------------------------------------------------------------

const BLOOMS_COLORS = ["#84cc16", "#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
function bloomsColor(level: number): string {
	return BLOOMS_COLORS[Math.min(5, Math.max(0, level - 1))] ?? "#3b82f6";
}

// ---------------------------------------------------------------------------
// Shared axis tick style
// ---------------------------------------------------------------------------

function axisTick(textColor: string) {
	return { fontSize: 11, fill: textColor };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShortCircuitGraphProps {
	items: ShortCircuitItem[];
	selectedMetric?: string;
	onMetricHover?: (metricKey: string | null) => void;
	onMetricSelect?: (metricKey: string) => void;
}

export function ShortCircuitGraph({ items, selectedMetric, onMetricHover, onMetricSelect }: ShortCircuitGraphProps) {
	const theme = useChartTheme();

	// Section 1 state — selected deterministic series
	const [selectedDet, setSelectedDet] = useState<Set<DeterministicKey>>(
		new Set(["linguisticLoad", "confusion"] as DeterministicKey[]),
	);

	const toggleDet = (key: DeterministicKey) => {
		onMetricSelect?.(key);
		setSelectedDet((prev) => {
			const next = new Set(prev);
			if (next.has(key)) { next.delete(key); } else { next.add(key); }
			return next;
		});
	};

	// Compute time series to detect if it's flat
	const timeValues = items.map((i) => timeNorm(i.timeToProcessSeconds));
	const timeIsFlat = isFlat(timeValues);

	// Detect flat distractor density (hide when always zero)
	const distractorValues = items.map((i) => i.distractorDensity);
	const distractorIsFlat = isFlat(distractorValues);

	// Dynamic step ceiling — normalize steps relative to the hardest item in this doc
	const maxSteps = Math.max(...items.map((i) => i.steps), 1);

	// Build deterministic chart data — all continuous values normalized to 0–1
	const detChartData = items.map((item) => ({
		x:                 item.logicalLabel ?? item.itemNumber,
		bloomsLevel:       item.bloomsLevel,    // raw integer, for categorical band only
		bloomsLabel:       item.bloomsLabel,    // for Bloom's tooltip
		linguisticLoad:    Number(item.linguisticLoad.toFixed(4)),
		confusion:         Number(item.confusionScore.toFixed(4)),
		wordCount:         Number((item.wordCount / 60).toFixed(4)),
		avgWordLength:     Number((item.avgWordLength / 8).toFixed(4)),
		steps:             Number((item.steps / maxSteps).toFixed(4)),
		time:              Number(timeNorm(item.timeToProcessSeconds).toFixed(4)),
		sentenceCount:     Number((item.sentenceCount / 8).toFixed(4)),
		avgSentenceLength: Number((item.avgSentenceLength / 16).toFixed(4)),
		distractorDensity: Number(item.distractorDensity.toFixed(4)),
		symbolDensity:     Number(item.symbolDensity.toFixed(4)),
	}));

	// Filter out flat/always-zero series
	const availableSeries = DETERMINISTIC_SERIES.filter(
		(s) => !(s.key === "time" && timeIsFlat) && !(s.key === "distractorDensity" && distractorIsFlat),
	);

	return (
		<div>
			{/* ================================================================ */}
			{/* SECTION 1 — Deterministic per-item graphs                        */}
			{/* ================================================================ */}
			<div style={{ marginBottom: "0.5rem" }}>
				<h2 style={{ margin: "0 0 0.2rem", fontSize: "1rem", fontWeight: 700, color: theme.headingColor }}>
					Section 1 — Item Characteristics (Deterministic)
				</h2>
				<p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: theme.subTextColor }}>
					These metrics reflect the inherent difficulty of each item. They are the same for all student profiles.
				</p>
			</div>

			{/* Series toggle buttons */}
			<div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
				{availableSeries.map((s) => {
					const active = selectedDet.has(s.key);
					return (
						<button
							key={s.key}
							onClick={() => toggleDet(s.key)}
							style={{
								padding: "0.25rem 0.65rem",
								borderRadius: "6px",
								border: `2px solid ${s.color}`,
								background: active || selectedMetric === s.key ? s.color : "transparent",
								color: active || selectedMetric === s.key ? "#fff" : s.color,
								fontSize: "0.75rem",
								cursor: "pointer",
								fontWeight: active ? 600 : 400,
								transition: "all 0.15s",
							}}
							title={s.description}
							onMouseEnter={() => onMetricHover?.(s.key)}
							onMouseLeave={() => onMetricHover?.(null)}
						>
							{s.label}
						</button>
					);
				})}
			</div>

			{timeIsFlat && (
				<p style={{ fontSize: "0.72rem", color: theme.subTextColor, fontStyle: "italic", marginBottom: "0.25rem" }}>
					Time (norm) hidden — all items produce the same value.
				</p>
			)}

			{distractorIsFlat && (
				<p style={{ fontSize: "0.72rem", color: theme.subTextColor, fontStyle: "italic", marginBottom: "0.25rem" }}>
					Distractor Density hidden — no distractors detected in this document.
				</p>
			)}

			{/* Multi-series line chart — all values normalized to 0–1 */}
			{selectedDet.size > 0 && (
				<ResponsiveContainer width="100%" height={360}>
					<LineChart data={detChartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
						<XAxis
							dataKey="x"
							label={{ value: "Item #", position: "insideBottom", offset: -4, fill: theme.textColor }}
							tick={axisTick(theme.textColor)}
						/>
						<YAxis domain={[0, 1]} tick={axisTick(theme.textColor)} width={36} />
						<RechartsTooltip
							contentStyle={{ background: theme.bgColor, border: `1px solid ${theme.borderColor}`, color: theme.textColor }}
							formatter={(value: number, name: string) => [
								typeof value === "number" ? value.toFixed(3) : value,
								name,
							]}
							labelFormatter={(label) => `Item ${label}`}
						/>
						<Legend verticalAlign="top" />
						{DETERMINISTIC_SERIES.filter((s) => selectedDet.has(s.key)).map((s) => (
							<Line
								key={s.key}
								type="monotone"
								dataKey={s.key}
								name={s.label}
								stroke={s.color}
								strokeWidth={3}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			)}

			{/* Bloom's Taxonomy — categorical band, always shown, never on the line graph */}
			<div style={{ marginTop: "1.5rem" }}>
				<p style={{ fontWeight: 600, fontSize: "0.9rem", color: theme.headingColor, margin: "0 0 0.1rem" }}>
					Bloom's Taxonomy Level
				</p>
				<p style={{ fontSize: "0.75rem", color: theme.subTextColor, margin: "0 0 0.35rem" }}>
					Derived from cognitive keyword matching — independent of reasoning steps.{" "}
					1=Remember · 2=Understand · 3=Apply · 4=Analyze · 5=Evaluate · 6=Create
				</p>
				<ResponsiveContainer width="100%" height={160}>
					<BarChart data={detChartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
						<XAxis dataKey="x" label={{ value: "Item #", position: "insideBottom", offset: -2, fill: theme.textColor }} tick={axisTick(theme.textColor)} />
						<YAxis domain={[0, 6]} ticks={[1, 2, 3, 4, 5, 6]} tick={axisTick(theme.textColor)} width={36} />
						<RechartsTooltip
							contentStyle={{ background: theme.bgColor, border: `1px solid ${theme.borderColor}`, color: theme.textColor }}
							formatter={(value: number, _name: string, props) => {
								const label = (props as { payload?: { bloomsLabel?: string } }).payload?.bloomsLabel ?? "";
								return [`Level ${value} — ${label}`, "Bloom's"];
							}}
							labelFormatter={(label) => `Item ${label}`}
						/>
						<Bar dataKey="bloomsLevel" name="Bloom's Level" radius={[4, 4, 0, 0]}>
							{detChartData.map((entry) => (
								<Cell key={`cell-${entry.x}`} fill={bloomsColor(entry.bloomsLevel)} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Vocab heatmap — always shown, unchanged */}
			<div style={{ marginTop: "2rem" }}>
				<p style={{ fontWeight: 600, fontSize: "0.9rem", color: theme.headingColor, margin: "0 0 0.15rem" }}>
					Vocab Difficulty Heatmap
				</p>
				<p style={{ fontSize: "0.75rem", color: theme.subTextColor, margin: "0 0 0.35rem" }}>
					Shows how many easy (green), moderate (yellow), and difficult (red) words appear in each item.
				</p>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart
						data={items.map((item) => ({
							x: item.logicalLabel ?? item.itemNumber,
							level1: item.vocabCounts.level1,
							level2: item.vocabCounts.level2,
							level3: item.vocabCounts.level3,
						}))}
						margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
						<XAxis dataKey="x" label={{ value: "Item #", position: "insideBottom", offset: -2, fill: theme.textColor }} tick={axisTick(theme.textColor)} />
						<YAxis tick={axisTick(theme.textColor)} width={36} />
						<RechartsTooltip
							contentStyle={{ background: theme.bgColor, border: `1px solid ${theme.borderColor}`, color: theme.textColor }}
							labelFormatter={(label) => `Item ${label}`}
						/>
						<Legend verticalAlign="top" />
						<Bar dataKey="level1" name="Easy (1-syllable)"      stackId="a" fill="#4ade80" />
						<Bar dataKey="level2" name="Moderate (2-syllable)"  stackId="a" fill="#facc15" />
						<Bar dataKey="level3" name="Difficult (3+syllable)" stackId="a" fill="#f87171" />
					</BarChart>
				</ResponsiveContainer>
			</div>

			<p style={{ fontSize: "0.75rem", color: theme.subTextColor, marginTop: "0.75rem" }}>
				{items.length} item{items.length !== 1 ? "s" : ""} — local semantic analysis (no LLM)
			</p>

		</div>
	);
}
