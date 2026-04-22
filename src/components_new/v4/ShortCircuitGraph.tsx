/**
 * src/components_new/v4/ShortCircuitGraph.tsx
 *
 * Simulation 2.1 — unified single chart with selectable series.
 *
 * Series available:
 *   cumulativeLinguistic  — cumulative linguistic load (effort accumulation)
 *   linguistic            — per-item linguistic load
 *   confusion             — confusion score (orange)
 *   steps                 — steps normalized 0–1
 *   time                  — time normalized 0–1
 *
 * Plus: vocab heatmap (stacked bar) below the line chart.
 *
 * No Gemini. No profiles. Pure local semantic analysis.
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
} from "recharts";
import type { ShortCircuitItem, ProfileShortCircuitResult } from "../../../api/v4/simulator/shortcircuit";

// ---------------------------------------------------------------------------
// Tooltip copy
// ---------------------------------------------------------------------------

const TOOLTIP_TEXT: Record<string, string> = {
	cumulativeLinguistic:
		"Shows how linguistic difficulty accumulates across the worksheet. Rising slope = increasing student effort.",
	linguistic:
		"Linguistic Load combines vocabulary difficulty (syllable-based) and average word length into a single 0–1 score.",
	confusion:
		"Likelihood of misunderstanding based on ambiguity and distractor density.",
	steps:
		"Number of reasoning steps required, normalized 0–1.",
	time:
		"Estimated processing time based on reading + steps, normalized 0–1.",
	vocabHeatmap:
		"Shows how many easy (green), moderate (yellow), and difficult (red) words appear in each item.",
};

// ---------------------------------------------------------------------------
// Series config
// ---------------------------------------------------------------------------

const ALL_SERIES = [
	{ key: "cumulativeLinguistic", label: "Cumulative Linguistic",  color: "#0077ff" },
	{ key: "linguistic",           label: "Linguistic Load",        color: "#0ea5e9" },
	{ key: "confusion",            label: "Confusion",              color: "#f97316" },
	{ key: "steps",                label: "Steps (norm)",           color: "#6366f1" },
	{ key: "time",                 label: "Time (norm)",            color: "#f59e0b" },
] as const;

type SeriesKey = typeof ALL_SERIES[number]["key"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cumulative(values: number[]): number[] {
	let sum = 0;
	return values.map((v) => { sum += v; return sum; });
}

function stepsNorm(steps: number): number {
	if (steps <= 1) return 0.1;
	if (steps <= 3) return 0.3;
	if (steps <= 5) return 0.6;
	return 1.0;
}

function timeNorm(timeSeconds: number): number {
	const m = timeSeconds / 60;
	if (m <= 1) return 0.2;
	if (m <= 2) return 0.4;
	if (m <= 3) return 0.6;
	if (m <= 4) return 0.8;
	return 1.0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShortCircuitGraphProps {
	items: ShortCircuitItem[];
	profiles?: ProfileShortCircuitResult[];
}

export function ShortCircuitGraph({ items, profiles }: ShortCircuitGraphProps) {
	const [selected, setSelected] = useState<Set<SeriesKey>>(
		new Set(["cumulativeLinguistic", "confusion"] as SeriesKey[]),
	);
	const [activeProfileIds, setActiveProfileIds] = useState<Set<string>>(
		() => new Set(profiles?.map((p) => p.profileId) ?? []),
	);

	const toggle = (key: SeriesKey) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(key)) { next.delete(key); } else { next.add(key); }
			return next;
		});
	};

	const toggleProfile = (id: string) => {
		setActiveProfileIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) { next.delete(id); } else { next.add(id); }
			return next;
		});
	};

	const linguisticSeries = items.map((i) => i.linguisticLoad);
	const cumulativeLinguisticSeries = cumulative(linguisticSeries);

	const chartData = items.map((item, idx) => ({
		x: item.itemNumber,
		cumulativeLinguistic: Number(cumulativeLinguisticSeries[idx]?.toFixed(4) ?? 0),
		linguistic:           Number(item.linguisticLoad.toFixed(4)),
		confusion:            Number(item.confusionScore.toFixed(4)),
		steps:                Number(stepsNorm(item.steps).toFixed(4)),
		time:                 Number(timeNorm(item.timeToProcessSeconds).toFixed(4)),
	}));

	const heatmapData = items.map((item) => ({
		x: item.itemNumber,
		level1: item.vocabCounts.level1,
		level2: item.vocabCounts.level2,
		level3: item.vocabCounts.level3,
	}));

	const activeTooltip = selected.size === 1
		? TOOLTIP_TEXT[[...selected][0] as SeriesKey] ?? ""
		: "";

	return (
		<div>
			{/* Series toggles */}
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
				{ALL_SERIES.map((s) => {
					const active = selected.has(s.key);
					return (
						<button
							key={s.key}
							onClick={() => toggle(s.key)}
							style={{
								padding: "0.3rem 0.75rem",
								borderRadius: "6px",
								border: `2px solid ${s.color}`,
								background: active ? s.color : "transparent",
								color: active ? "#fff" : s.color,
								fontSize: "0.8rem",
								cursor: "pointer",
								fontWeight: active ? 600 : 400,
								transition: "all 0.15s",
							}}
						>
							{s.label}
						</button>
					);
				})}
			</div>

			{/* Active series description */}
			{activeTooltip && (
				<p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", maxWidth: 560 }}>
					{activeTooltip}
				</p>
			)}

			{/* Main line chart */}
			<ResponsiveContainer width="100%" height={360}>
				<LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
					<XAxis
						dataKey="x"
						label={{ value: "Item #", position: "insideBottom", offset: -4 }}
						tick={{ fontSize: 11 }}
					/>
					<YAxis domain={[0, "auto"]} tick={{ fontSize: 11 }} width={36} />
					<RechartsTooltip
						formatter={(value: number, name: string) => [value.toFixed(3), name]}
						labelFormatter={(label) => `Item ${label}`}
					/>
					<Legend verticalAlign="top" />
					{ALL_SERIES.filter((s) => selected.has(s.key)).map((s) => (
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

			{/* Vocab heatmap */}
			<div style={{ marginTop: "2rem" }}>
				<div style={{ marginBottom: "0.35rem" }}>
					<span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Vocab Difficulty Heatmap</span>
					<span style={{ display: "block", fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem" }}>
						{TOOLTIP_TEXT.vocabHeatmap}
					</span>
				</div>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart data={heatmapData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
						<XAxis dataKey="x" label={{ value: "Item #", position: "insideBottom", offset: -2 }} tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 11 }} width={36} />
						<RechartsTooltip labelFormatter={(label) => `Item ${label}`} />
						<Legend verticalAlign="top" />
						<Bar dataKey="level1" name="Easy (1-syllable)"    stackId="a" fill="#4ade80" />
						<Bar dataKey="level2" name="Moderate (2-syllable)" stackId="a" fill="#facc15" />
						<Bar dataKey="level3" name="Difficult (3+syllable)" stackId="a" fill="#f87171" />
					</BarChart>
				</ResponsiveContainer>
			</div>

			<p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.75rem" }}>
				{items.length} item{items.length !== 1 ? "s" : ""} — local semantic analysis (no Gemini)
			</p>

		{/* Profile Comparison — only shown when profiles are returned */}
		{profiles && profiles.length > 0 && (
			<div style={{ marginTop: "3rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
				<h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", color: "#111827" }}>Profile Comparison</h3>
				<p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.85rem" }}>
					Shows how each student profile experiences linguistic load across items. Modifiers are deterministic — no Gemini.
				</p>

				{/* Profile toggles */}
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
					{profiles.map((p) => {
						const active = activeProfileIds.has(p.profileId);
						return (
							<button
								key={p.profileId}
								onClick={() => toggleProfile(p.profileId)}
								style={{
									padding: "0.3rem 0.75rem",
									borderRadius: "6px",
									border: `2px solid ${p.color}`,
									background: active ? p.color : "transparent",
									color: active ? "#fff" : p.color,
									fontSize: "0.8rem",
									cursor: "pointer",
									fontWeight: active ? 600 : 400,
									transition: "all 0.15s",
								}}
							>
								{p.profileLabel}
							</button>
						);
					})}
				</div>

				{/* Linguistic load per profile */}
				<div style={{ marginBottom: "1.5rem" }}>
					<p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>Cumulative Linguistic Load by Profile</p>
					<ResponsiveContainer width="100%" height={320}>
						<LineChart
							data={items.map((item, idx) => {
								const obj: Record<string, number> = { x: item.itemNumber };
								profiles
									.filter((p) => activeProfileIds.has(p.profileId))
									.forEach((p) => {
										let sum = 0;
										for (let i = 0; i <= idx; i++) {
											sum += p.items[i]?.linguisticLoad ?? 0;
										}
										obj[p.profileId] = Number(sum.toFixed(4));
									});
								return obj;
							})}
							margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis dataKey="x" label={{ value: "Item #", position: "insideBottom", offset: -4 }} tick={{ fontSize: 11 }} />
							<YAxis domain={[0, "auto"]} tick={{ fontSize: 11 }} width={36} />
							<RechartsTooltip formatter={(value: number, name: string) => [value.toFixed(3), name]} labelFormatter={(label) => `Item ${label}`} />
							<Legend verticalAlign="top" />
							{profiles
								.filter((p) => activeProfileIds.has(p.profileId))
								.map((p) => (
									<Line
										key={p.profileId}
										type="monotone"
										dataKey={p.profileId}
										name={p.profileLabel}
										stroke={p.color}
										strokeWidth={2.5}
										dot={false}
										activeDot={{ r: 4 }}
									/>
								))}
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* Confusion score per profile */}
				<div>
					<p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>Confusion Score by Profile</p>
					<ResponsiveContainer width="100%" height={280}>
						<LineChart
							data={items.map((item) => {
								const obj: Record<string, number> = { x: item.itemNumber };
								profiles
									.filter((p) => activeProfileIds.has(p.profileId))
									.forEach((p) => {
										obj[p.profileId] = Number((p.items.find((it) => it.itemNumber === item.itemNumber)?.confusionScore ?? 0).toFixed(4));
									});
								return obj;
							})}
							margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis dataKey="x" label={{ value: "Item #", position: "insideBottom", offset: -4 }} tick={{ fontSize: 11 }} />
							<YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={36} />
							<RechartsTooltip formatter={(value: number, name: string) => [value.toFixed(3), name]} labelFormatter={(label) => `Item ${label}`} />
							<Legend verticalAlign="top" />
							{profiles
								.filter((p) => activeProfileIds.has(p.profileId))
								.map((p) => (
									<Line
										key={p.profileId}
										type="monotone"
										dataKey={p.profileId}
										name={p.profileLabel}
										stroke={p.color}
										strokeWidth={2.5}
										strokeDasharray="4 2"
										dot={false}
										activeDot={{ r: 4 }}
									/>
								))}
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>
		)}
		</div>
	);
}
