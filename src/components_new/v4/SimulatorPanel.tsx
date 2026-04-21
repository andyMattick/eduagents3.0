/**
 * src/components_new/v4/SimulatorPanel.tsx
 *
 * Student Simulation Tools panel — displayed after a document session is created.
 * Two modes:
 *  1. Simulate Student Experience — single profile, narrative + per-item analytics
 *  2. Compare Profiles — multi-profile, checkbox selection, parallel graphs + tables
 */

import { useState } from "react";
import type React from "react";
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	ResponsiveContainer,
	ScatterChart,
	Scatter,
	Legend,
	ComposedChart,
	Area,
} from "recharts";
import { runMultiSimulatorApi } from "../../lib/simulatorApi";
import { ShortCircuitGraph } from "./ShortCircuitGraph";
import type { ShortCircuitItem } from "../../../api/v4/simulator/shortcircuit";
import type {
	SimulationMeasurables,
	SimulationPredictedStates,
	SimulationProfileMetrics,
	SimulationSuggestion,
	SimulationSuggestionType,
	SimulatorData,
	StudentProfile,
} from "../../types/simulator";
import { DEFAULT_STUDENT_PROFILE, STUDENT_PROFILE_PRESETS } from "../../types/simulator";

import { loadToColor, colorForProfile } from "../../lib/colorScale";
import { buildSuggestionsAllProfiles } from "../../lib/suggestionTargeting";
import { MetricGlossary } from "./MetricGlossary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SimMode = "single" | "multi" | null;

interface SimulatorPanelProps {
	sessionId: string;
}

// ---------------------------------------------------------------------------
// Stat bar helper
// ---------------------------------------------------------------------------

function StatBar({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
	const pct = Math.round(value * 100);
	const color = warn && value > 0.7 ? "var(--v4-error, #dc2626)" : value > 0.6 ? "var(--v4-warning, #d97706)" : "var(--v4-accent, #2563eb)";
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
			<span style={{ minWidth: "120px", color: "var(--v4-muted)" }}>{label}</span>
			<div style={{ flex: 1, background: "var(--v4-border, #e5e7eb)", borderRadius: "4px", height: "8px" }}>
				<div style={{ width: `${pct}%`, background: color, borderRadius: "4px", height: "8px", transition: "width 0.3s" }} />
			</div>
			<span style={{ minWidth: "32px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Overall stats card
// ---------------------------------------------------------------------------

function OverallStats({ data }: { data: SimulatorData }) {
	const { overall } = data;
	const mins = Math.round(overall.estimatedCompletionTimeSeconds / 60);
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Overall Assessment</p>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
				<div className="v4-panel" style={{ padding: "0.75rem", background: "var(--v4-surface)" }}>
					<div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{overall.totalItems}</div>
					<div className="v4-stat-label">Items</div>
				</div>
				<div className="v4-panel" style={{ padding: "0.75rem", background: "var(--v4-surface)" }}>
					<div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{mins} min</div>
					<div className="v4-stat-label">Est. time</div>
				</div>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				<StatBar value={overall.fatigueRisk} label="Fatigue risk" warn />
				<StatBar value={overall.pacingRisk} label="Pacing risk" warn />
			</div>
			{overall.majorRedFlags.length > 0 && (
				<div style={{ marginTop: "0.75rem" }}>
					<p className="v4-stat-label" style={{ marginBottom: "0.35rem" }}>Red flags</p>
					<ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", color: "var(--v4-error, #dc2626)" }}>
						{overall.majorRedFlags.map((f, i) => <li key={i}>{f}</li>)}
					</ul>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Graphs — support both single-profile (SimulatorData) and multi-profile
// ---------------------------------------------------------------------------

/**
 * Convert single-profile SimulatorData into the SimulationProfileMetrics shape
 * so all graph/table components share one code path.
 */
function singleDataToProfiles(data: SimulatorData, profileLabel = "Average Student"): SimulationProfileMetrics[] {
	return [{
		profileId: "average",
		profileLabel,
		color: colorForProfile(profileLabel),
		measurables: data.items.map((item) => ({
			itemId: String(item.itemNumber),
			index: item.itemNumber,
			wordCount: item.wordCount,
			linguisticLoad: item.linguisticLoad,
			difficulty: 1 + item.linguisticLoad * 4,
			timeToProcessSeconds: item.timeToProcessSeconds,
			steps: item.sentenceCount,
			distractorDensity: item.distractorDensity ?? 0,
			misconceptionRisk: item.misconceptionRisk,
			confusionScore: item.confusionRisk,
		})),
		predictedStates: {
			fatigue: data.overall.predictedStates?.fatigue ?? data.overall.fatigueRisk,
			confusion: data.overall.predictedStates?.confusion ?? 0,
			guessing: data.overall.predictedStates?.guessing ?? 0,
			overload: data.overall.predictedStates?.overload ?? 0,
			frustration: data.overall.predictedStates?.frustration ?? 0,
			timePressureCollapse: data.overall.predictedStates?.timePressureCollapse ?? data.overall.pacingRisk,
			emotionalFriction: data.overall.predictedStates?.emotionalFriction ?? 0,
			confidenceImpact: data.overall.predictedStates?.confidenceImpact ?? 0,
			pacingPressure: data.overall.predictedStates?.pacingPressure ?? data.overall.pacingRisk,
		},
	}];
}

// ---------------------------------------------------------------------------
// Measurable metric chart options
// ---------------------------------------------------------------------------

const CHART_METRICS: Array<{ key: keyof SimulationMeasurables; label: string; unit: "%" | "s" | "int" }> = [
	{ key: "linguisticLoad",     label: "Linguistic Load",    unit: "%" },
	{ key: "confusionScore",     label: "Confusion Score",    unit: "%" },
	{ key: "misconceptionRisk",  label: "Misconception Risk", unit: "%" },
	{ key: "distractorDensity", label: "Distractor Density", unit: "%" },
	{ key: "timeToProcessSeconds", label: "Time to Process", unit: "s" },
	{ key: "steps",              label: "Reasoning Steps",   unit: "int" },
];

const IMMEASURABLE_METRICS: Array<{ key: keyof SimulationPredictedStates; label: string }> = [
	{ key: "emotionalFriction",    label: "Emotional Friction"    },
	{ key: "confidenceImpact",     label: "Confidence Impact"     },
	{ key: "pacingPressure",       label: "Pacing Pressure"       },
	{ key: "overload",             label: "Overload Risk"         },
	{ key: "guessing",             label: "Guessing Likelihood"   },
	{ key: "frustration",          label: "Frustration Likelihood"},
];

// ---------------------------------------------------------------------------
// Generic metric line chart — Phase 1.2 replacement for CognitiveLoadGraph
// ---------------------------------------------------------------------------

type MeasurableKey = keyof SimulationMeasurables;
type PredictedKey  = keyof SimulationPredictedStates;


function MetricLineChart({
	profiles,
	metric,
	label,
	unit,
}: {
	profiles: SimulationProfileMetrics[];
	metric: MeasurableKey;
	label: string;
	unit: "%" | "s" | "int";
}) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;
	const isPercent = unit === "%";
	const chartData = Array.from({ length: itemCount }, (_, i) => {
		const row: Record<string, number | string> = { name: `#${profiles[0].measurables[i].index}` };
		for (const p of profiles) {
			const raw = (p.measurables[i]?.[metric] as number | undefined) ?? 0;
			row[p.profileId] = isPercent ? Math.round(raw * 100) : raw;
		}
		return row;
	});
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<ResponsiveContainer width="100%" height={220}>
				<LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis
						domain={isPercent ? [0, 100] : undefined}
						tick={{ fontSize: 11 }}
						unit={unit === "%" ? "%" : unit === "s" ? "s" : ""}
					/>
					<Tooltip formatter={(v: number) => unit === "%" ? `${v}%` : unit === "s" ? `${v.toFixed(1)}s` : `${v}`} />
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((p) => (
						<Line key={p.profileId} type="monotone" dataKey={p.profileId} name={p.profileLabel} stroke={p.color} strokeWidth={2} dot={false} />
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Immeasurable trends chart with CI bands — Phase 5
// ---------------------------------------------------------------------------

function ImmeasurableTrendsChart({
	profiles,
	metricKey,
}: {
	profiles: SimulationProfileMetrics[];
	metricKey: PredictedKey;
}) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;

	// Derive cumulative pressure curve from linguistic load
	function buildCurve(p: SimulationProfileMetrics): number[] {
		const total = p.measurables.reduce((s, m) => s + m.linguisticLoad, 0) || 1;
		let cumsum = 0;
		const finalValue = (p.predictedStates[metricKey] as number) ?? 0;
		return p.measurables.map((m, i) => {
			cumsum += m.linguisticLoad;
			const pressure = (cumsum / total) * 0.7 + ((i + 1) / itemCount) * 0.3;
			return finalValue * pressure;
		});
	}

	const chartData = Array.from({ length: itemCount }, (_, i) => {
		const row: Record<string, number | string> = { name: `#${profiles[0].measurables[i].index}` };
		for (const p of profiles) {
			const curve = buildCurve(p);
			const v = curve[i];
			row[`${p.profileId}_lower`] = Math.round(v * 0.85 * 100);
			row[`${p.profileId}_band`]  = Math.round((v * 1.15 - v * 0.85) * 100); // bandwidth
			row[`${p.profileId}_value`] = Math.round(v * 100);
		}
		return row;
	});

	return (
		<div style={{ marginTop: "1.25rem" }}>
			<ResponsiveContainer width="100%" height={240}>
				<ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
					<Tooltip
						formatter={(v: number, name: string) => {
							if (name.endsWith("_lower") || name.endsWith("_band")) return null;
							return [`${v}%`, name.replace(/_value$/, "")];
						}}
					/>
					<Legend
						formatter={(value: string) => value.replace(/_value$/, "")}
						wrapperStyle={{ fontSize: "0.75rem" }}
					/>
					{profiles.map((p) => (
						<>
							<Area
								key={`${p.profileId}-lower`}
								type="monotone"
								dataKey={`${p.profileId}_lower`}
								stackId={p.profileId}
								stroke="none"
								fill="none"
								legendType="none"
								isAnimationActive={false}
								name={`${p.profileId}_lower`}
							/>
							<Area
								key={`${p.profileId}-band`}
								type="monotone"
								dataKey={`${p.profileId}_band`}
								stackId={p.profileId}
								stroke="none"
								fill={p.color}
								fillOpacity={0.18}
								legendType="none"
								isAnimationActive={false}
								name={`${p.profileId}_band`}
							/>
							<Line
								key={`${p.profileId}-line`}
								type="monotone"
								dataKey={`${p.profileId}_value`}
								stroke={p.color}
								strokeWidth={2}
								dot={false}
								name={`${p.profileId}_value`}
							/>
						</>
					))}
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
}

function CognitiveLoadGraph({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;
	const chartData = Array.from({ length: itemCount }, (_, i) => {
		const row: Record<string, number | string> = { name: `#${profiles[0].measurables[i].index}` };
		for (const p of profiles) {
			row[p.profileId] = Math.round((p.measurables[i]?.cognitiveLoad ?? 0) * 100);
		}
		return row;
	});
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Cognitive Load Curve</p>
			<ResponsiveContainer width="100%" height={220}>
				<LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
					<Tooltip formatter={(v: number | undefined) => v !== undefined ? `${v}%` : ""} />
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((p) => (
						<Line key={p.profileId} type="monotone" dataKey={p.profileId} name={p.profileLabel} stroke={p.color} strokeWidth={2} dot={false} />
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

function TimeToProcessGraph({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;
	const chartData = Array.from({ length: itemCount }, (_, i) => {
		const row: Record<string, number | string> = { name: `#${profiles[0].measurables[i].index}` };
		for (const p of profiles) {
			row[p.profileId] = p.measurables[i]?.timeToProcessSeconds ?? 0;
		}
		return row;
	});
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Time to Process</p>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} unit="s" />
					<Tooltip formatter={(v: number | undefined) => v !== undefined ? `${v}s` : ""} />
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((p) => (
						<Bar key={p.profileId} dataKey={p.profileId} name={p.profileLabel} fill={p.color} />
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

function ReadingVsCognitiveScatter({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0) return null;
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Reading Load vs Cognitive Load</p>
			<ResponsiveContainer width="100%" height={240}>
				<ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						type="number"
						dataKey="x"
						name="Reading Load"
						domain={[0, 100]}
						tick={{ fontSize: 11 }}
						unit="%"
						label={{ value: "Reading Load", position: "insideBottom", offset: -4, fontSize: 11 }}
					/>
					<YAxis type="number" dataKey="y" name="Cog. Load" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
					<Tooltip
						content={({ payload }) => {
							if (!payload?.length) return null;
							const d = payload[0].payload as { label: string; x: number; y: number; color: string };
							return (
								<div style={{ background: "white", border: "1px solid #e5e7eb", padding: "0.4rem 0.6rem", borderRadius: 6, fontSize: "0.78rem" }}>
									<div style={{ fontWeight: 600, color: d.color }}>{d.label}</div>
									<div>Reading: {d.x}%</div>
									<div>Cog. Load: {d.y}%</div>
								</div>
							);
						}}
					/>
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((p) => (
						<Scatter
							key={p.profileId}
							name={p.profileLabel}
							fill={p.color}
							data={p.measurables.map((m) => ({
								x: Math.round(m.readingLoad * 100),
								y: Math.round(m.cognitiveLoad * 100),
								label: `${p.profileLabel} #${m.index}`,
								color: loadToColor(m.cognitiveLoad),
							}))}
						/>
					))}
				</ScatterChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Measurables table (multi-profile, dynamic columns, color-scaled)
// ---------------------------------------------------------------------------

type MetricMeta = { label: string; scaled: boolean; unit: "%" | "s" | "int" | "x" };

const METRIC_META: Partial<Record<keyof SimulationMeasurables, MetricMeta>> = {
	wordCount:            { label: "Words",           scaled: false, unit: "int" },
	cognitiveLoad:        { label: "Cog. Load",       scaled: true,  unit: "%" },
	readingLoad:          { label: "Reading Load",     scaled: true,  unit: "%" },
	distractorDensity:    { label: "Distractor Den.",  scaled: true,  unit: "%" },
	steps:                { label: "Steps",            scaled: false, unit: "int" },
	vocabularyDifficulty: { label: "Vocab. Diff.",     scaled: true,  unit: "%" },
	misconceptionRisk:    { label: "Misconcep. Risk",  scaled: true,  unit: "%" },
	confusionScore:       { label: "Confusion",        scaled: true,  unit: "%" },
	timeToProcessSeconds: { label: "Time",             scaled: false, unit: "s" },
	fatigueIncrease:      { label: "Fatigue +",        scaled: true,  unit: "%" },
	attentionDrop:        { label: "Attention ↓",      scaled: true,  unit: "%" },
	difficulty:           { label: "Difficulty",       scaled: false, unit: "x" },
};

const MEASURABLE_DISPLAY_KEYS: Array<keyof SimulationMeasurables> = [
	"wordCount", "cognitiveLoad", "readingLoad", "distractorDensity", "steps",
	"vocabularyDifficulty", "misconceptionRisk", "confusionScore",
	"timeToProcessSeconds", "fatigueIncrease", "attentionDrop",
];

function formatMetricValue(val: number, unit: "%" | "s" | "int" | "x"): string {
	if (unit === "%")   return `${Math.round(val * 100)}%`;
	if (unit === "s")   return `${val.toFixed(1)}s`;
	if (unit === "int") return `${Math.round(val)}`;
	return val.toFixed(1);   // "x" = 1–5 difficulty scale
}

function MeasurablesTable({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;
	const tdBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.78rem", textAlign: "center" };
	const thBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.72rem", color: "var(--v4-muted)", textAlign: "center", fontWeight: 600 };
	const colCount = MEASURABLE_DISPLAY_KEYS.length;

	return (
		<div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Measurable Metrics</p>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr style={{ borderBottom: "2px solid var(--v4-border, #e5e7eb)" }}>
						<th style={{ ...thBase, textAlign: "left" }}>#</th>
						<th style={{ ...thBase, textAlign: "left" }}>Metric</th>
						{profiles.map((p) => (
							<th key={p.profileId} style={{ ...thBase, color: p.color }}>{p.profileLabel}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{Array.from({ length: itemCount }, (_, i) => (
						MEASURABLE_DISPLAY_KEYS.map((colKey, ci) => {
							const meta = METRIC_META[colKey];
							if (!meta) return null;
							return (
								<tr
									key={`${i}-${colKey}`}
									style={{
										borderBottom: ci === colCount - 1
											? "2px solid var(--v4-border, #e5e7eb)"
											: "1px solid var(--v4-border, #e5e7eb)",
									}}
								>
									{ci === 0 && (
										<td rowSpan={colCount} style={{ ...tdBase, fontWeight: 700, textAlign: "left", verticalAlign: "middle" }}>
											#{profiles[0].measurables[i].index}
										</td>
									)}
									<td style={{ ...tdBase, textAlign: "left", color: "var(--v4-muted)", whiteSpace: "nowrap" }}>{meta.label}</td>
									{profiles.map((p) => {
										const raw = p.measurables[i]?.[colKey] as number | undefined;
										const val = raw ?? 0;
										const bg = meta.scaled ? loadToColor(val) : "transparent";
										return (
											<td key={p.profileId} style={{ ...tdBase, background: bg, color: bg !== "transparent" ? "#111827" : undefined }}>
												{raw !== undefined ? formatMetricValue(val, meta.unit) : "—"}
											</td>
										);
									})}
								</tr>
							);
						})
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Predicted states table (multi-profile, color-scaled) — static 6+3 rows

const STATE_ROWS = [
	{ key: "fatigue" as const,              label: "Fatigue" },
	{ key: "confusion" as const,            label: "Confusion" },
	{ key: "guessing" as const,             label: "Guessing" },
	{ key: "overload" as const,             label: "Overload" },
	{ key: "frustration" as const,          label: "Frustration" },
	{ key: "timePressureCollapse" as const, label: "Time-Pressure Collapse" },
] as const;

const IMMEASURABLE_ROWS = [
	{ key: "emotionalFriction" as const,  label: "Emotional Friction"     },
	{ key: "confidenceImpact" as const,   label: "Confidence Impact"      },
	{ key: "pacingPressure" as const,     label: "Pacing Pressure"        },
	{ key: "overload" as const,           label: "Overload Risk"          },
	{ key: "guessing" as const,           label: "Guessing Likelihood"    },
	{ key: "frustration" as const,        label: "Frustration Likelihood" },
] as const;

// ---------------------------------------------------------------------------
// Predicted states table (multi-profile, color-scaled)
// ---------------------------------------------------------------------------

function PredictedStatesTable({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0) return null;
	const thBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.72rem", color: "var(--v4-muted)", textAlign: "center", fontWeight: 600 };
	const tdBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.78rem", textAlign: "center" };
	return (
		<div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Predicted Student States</p>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr style={{ borderBottom: "2px solid var(--v4-border, #e5e7eb)" }}>
						<th style={{ ...thBase, textAlign: "left" }}>State</th>
						{profiles.map((p) => (
							<th key={p.profileId} style={{ ...thBase, color: p.color }}>{p.profileLabel}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{STATE_ROWS.map((row) => (
						<tr key={row.key} style={{ borderBottom: "1px solid var(--v4-border, #e5e7eb)" }}>
							<td style={{ ...tdBase, textAlign: "left", color: "var(--v4-muted)", whiteSpace: "nowrap" }}>{row.label}</td>
							{profiles.map((p) => {
								const val = p.predictedStates[row.key];
								const bg = loadToColor(val);
								return (
									<td key={p.profileId} style={{ ...tdBase, background: bg, color: "#111827" }}>
										{Math.round(val * 100)}%
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Immeasurables collapsible panel — Phase 1.4
// ---------------------------------------------------------------------------

function ImmeasurablesPanel({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	const [open, setOpen] = useState(false);
	if (profiles.length === 0) return null;
	const thBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.72rem", color: "var(--v4-muted)", textAlign: "center", fontWeight: 600 };
	const tdBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.78rem", textAlign: "center" };
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<button
				type="button"
				style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}
				onClick={() => setOpen((v) => !v)}
			>
				<p className="v4-kicker" style={{ margin: 0 }}>Immeasurable States {open ? "▲" : "▼"}</p>
			</button>
			{open && (
				<div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
					<p style={{ fontSize: "0.78rem", color: "var(--v4-muted)", marginBottom: "0.5rem" }}>
						Unobservable emotional and cognitive states inferred from simulation — not directly testable.
					</p>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ borderBottom: "2px solid var(--v4-border, #e5e7eb)" }}>
								<th style={{ ...thBase, textAlign: "left" }}>State</th>
								{profiles.map((p) => (
									<th key={p.profileId} style={{ ...thBase, color: p.color }}>{p.profileLabel}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{IMMEASURABLE_ROWS.map((row) => (
								<tr key={row.key} style={{ borderBottom: "1px solid var(--v4-border, #e5e7eb)" }}>
									<td style={{ ...tdBase, textAlign: "left", color: "var(--v4-muted)", whiteSpace: "nowrap" }}>{row.label}</td>
									{profiles.map((p) => {
										const val = (p.predictedStates[row.key] as number) ?? 0;
										const bg = loadToColor(val);
										return (
											<td key={p.profileId} style={{ ...tdBase, background: bg, color: "#111827" }}>
												{Math.round(val * 100)}%
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Suggestions panel (multi-profile, load-score-targeted)
// ---------------------------------------------------------------------------

const SUGGESTION_TYPE_LABELS: Record<SimulationSuggestionType, string> = {
	item_rewrite: "Rewrite",
	instructional_support: "Support",
	student_behavior: "Behavior",
};

function SuggestionsPanel({
	profiles,
	selectedSuggestion,
	onSelect,
}: {
	profiles: SimulationProfileMetrics[];
	selectedSuggestion: SimulationSuggestion | null;
	onSelect: (s: SimulationSuggestion | null) => void;
}) {
	const suggestions = buildSuggestionsAllProfiles(profiles);
	if (suggestions.length === 0) return null;
	return (
		<div style={{ marginTop: "1.25rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Targeted Suggestions</p>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				{suggestions.map((s) => {
					const isSelected = selectedSuggestion?.id === s.id;
					const loadColor = loadToColor(s.loadScore ?? 0);
					return (
						<div
							key={s.id}
							onClick={() => onSelect(isSelected ? null : s)}
							style={{
								padding: "0.6rem 0.75rem",
								borderRadius: "6px",
								border: `1px solid ${isSelected ? "var(--v4-accent, #2563eb)" : "var(--v4-border, #e5e7eb)"}`,
								background: isSelected ? "var(--v4-surface-accent, #eff6ff)" : "var(--v4-surface, #f9f9fb)",
								cursor: "pointer",
								fontSize: "0.82rem",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
								{s.type && (
									<span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "4px", background: loadColor, color: "#111827" }}>
										{SUGGESTION_TYPE_LABELS[s.type]}
									</span>
								)}
								{s.loadScore !== undefined && (
									<span style={{ fontSize: "0.7rem", color: "var(--v4-muted)", marginLeft: "auto" }}>
										Load {Math.round(s.loadScore * 100)}%
									</span>
								)}
							</div>
							<div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{s.text}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SimulatorPanel({ sessionId }: SimulatorPanelProps) {
	const [mode, setMode] = useState<SimMode>(null);
	const [profile, setProfile] = useState<StudentProfile>(DEFAULT_STUDENT_PROFILE);
	const [selectedPreset, setSelectedPreset] = useState<string>("Average Student");

	// Multi-profile selection (at least 2 required)
	const [selectedMultiPresets, setSelectedMultiPresets] = useState<string[]>(["Average Student", "ADHD"]);

	// Result state
	const [loading, setLoading] = useState(false);
	const [narrative, setNarrative] = useState<string | null>(null);
	const [simData, setSimData] = useState<SimulatorData | null>(null);
	const [multiProfiles, setMultiProfiles] = useState<SimulationProfileMetrics[]>([]);
	const [shortCircuitItems, setShortCircuitItems] = useState<ShortCircuitItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedSuggestion, setSelectedSuggestion] = useState<SimulationSuggestion | null>(null);

	// Phase 3: per-profile narratives
	const [profileNarratives, setProfileNarratives] = useState<Record<string, string>>({});
	const [profileNarrativesOpen, setProfileNarrativesOpen] = useState(false);

	// Phase 1.2: metric dropdown for charts
	const [selectedMetric, setSelectedMetric] = useState<typeof CHART_METRICS[number]>(CHART_METRICS[0]);

	// Phase 5: immeasurable trends
	const [selectedImmeasurable, setSelectedImmeasurable] = useState<typeof IMMEASURABLE_METRICS[number]>(IMMEASURABLE_METRICS[0]);

	// ── Handlers ──────────────────────────────────────────────────────────────

	function handlePresetChange(label: string) {
		setSelectedPreset(label);
		const preset = STUDENT_PROFILE_PRESETS.find((p) => p.label === label);
		if (preset) setProfile(preset.profile);
	}

	function handleModeSelect(next: SimMode) {
		setMode(next === mode ? null : next);
		setNarrative(null);
		setSimData(null);
		setMultiProfiles([]);
		setShortCircuitItems(null);
		setError(null);
		setSelectedSuggestion(null);
		setProfileNarratives({});
		setProfileNarrativesOpen(false);
	}

	async function handleRun() {
		setLoading(true);
		setSelectedSuggestion(null);
		setNarrative(null);
		setSimData(null);
		setShortCircuitItems(null);
		setError(null);
		try {
			if (mode === "single") {
				const res = await fetch("/api/v4/simulator/shortcircuit", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId }),
				});
				const data = await res.json();
				if (!res.ok) {
					setError(data.error ?? `Server error ${res.status}`);
					return;
				}
				setShortCircuitItems(data.items ?? []);
			} else if (mode === "multi") {
				if (selectedMultiPresets.length < 2) {
					setError("Select at least 2 profiles to compare.");
					return;
				}
				const profileEntries = selectedMultiPresets.map((label) => {
					const preset = STUDENT_PROFILE_PRESETS.find((p) => p.label === label);
					return { label, profile: preset?.profile ?? DEFAULT_STUDENT_PROFILE };
				});
				const res = await runMultiSimulatorApi(sessionId, profileEntries);
				setNarrative(res.narrative);
				// Use rich profiles array if available; otherwise the UI will show nothing
				if (res.profiles && res.profiles.length > 0) {
					setMultiProfiles(res.profiles);
				}
				if (res.profileNarratives && Object.keys(res.profileNarratives).length > 0) {
					setProfileNarratives(res.profileNarratives);
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Simulation failed. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	function handleDownload() {
		const content = narrative ?? "";
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `simulation-${mode}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Derived ───────────────────────────────────────────────────────────────

	const profiles: SimulationProfileMetrics[] =
		mode === "multi" && multiProfiles.length > 0
			? multiProfiles
			: simData
			? singleDataToProfiles(simData, selectedPreset)
			: [];

	// ── Render ────────────────────────────────────────────────────────────────

	const canRun =
		mode !== null &&
		!loading &&
		(mode !== "multi" || selectedMultiPresets.length >= 2);
	const hasResult = narrative !== null || multiProfiles.length > 0 || shortCircuitItems !== null;

	return (
		<section className="v4-panel v4-vector-span">
			<p className="v4-kicker">Student Simulation Tools</p>
			<p className="v4-body-copy" style={{ marginBottom: "1rem" }}>
			<strong>Simulate Student Experience</strong> uses local analysis only — no AI, no 429s.<br />
			<strong>Compare Profiles</strong> uses Gemini for multi-profile narrative simulation.
		</p>

			{/* ── Mode buttons ── */}
			<div className="v4-upload-actions" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
				<button
					type="button"
					className={`v4-button${mode === "single" ? " v4-button-active" : " v4-button-secondary"}`}
					onClick={() => handleModeSelect("single")}
				>
					Simulate Student Experience
				</button>
				<button
					type="button"
					className={`v4-button${mode === "multi" ? " v4-button-active" : " v4-button-secondary"}`}
					onClick={() => handleModeSelect("multi")}
				>
					Compare Profiles
				</button>
			</div>

			{/* Single mode uses short-circuit — no profile selection needed */}

			{/* ── Multi-mode profile checkboxes ── */}
			{mode === "multi" && (
				<div style={{ marginTop: "1rem" }}>
					<p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Select Profiles to Compare</p>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
						{STUDENT_PROFILE_PRESETS.map((p) => (
							<label
								key={p.label}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.35rem",
									padding: "0.3rem 0.6rem",
									border: "1px solid var(--v4-border, #e5e7eb)",
									borderRadius: "6px",
									cursor: "pointer",
									background: selectedMultiPresets.includes(p.label)
										? "var(--v4-accent-light, #eff6ff)"
										: "transparent",
									fontSize: "0.85rem",
								}}
							>
								<input
									type="checkbox"
									checked={selectedMultiPresets.includes(p.label)}
									onChange={(e) =>
										setSelectedMultiPresets((prev) =>
											e.target.checked
												? [...prev, p.label]
												: prev.filter((l) => l !== p.label)
										)
									}
								/>
								{p.label}
							</label>
						))}
					</div>
					{selectedMultiPresets.length < 2 && (
						<p style={{ fontSize: "0.78rem", color: "var(--v4-muted)", marginTop: "0.4rem" }}>
							Select at least 2 profiles.
						</p>
					)}
				</div>
			)}

			{/* ── Run button ── */}
			{mode !== null && (
				<div className="v4-upload-actions" style={{ marginTop: "1rem" }}>
					<button
						type="button"
						className="v4-button"
						disabled={!canRun}
						onClick={handleRun}
					>
						{loading
							? (mode === "single" ? "Analysing…" : "Running…")
							: (mode === "single" ? "Generate (Short-Circuit)" : "Run Simulation")}
					</button>
				</div>
			)}

			{/* ── Error ── */}
			{error && <p className="v4-error" style={{ marginTop: "0.75rem" }}>{error}</p>}

			{/* Token counter removed — single mode uses short-circuit (no AI) */}

			{/* ── Single-mode short-circuit result ── */}
			{mode === "single" && shortCircuitItems !== null && (
				<div style={{ marginTop: "1.5rem" }}>
					<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Measurables Graph</p>
					<ShortCircuitGraph items={shortCircuitItems} />
				</div>
			)}

			{/* ── Multi-mode Gemini result ── */}
			{mode !== "single" && hasResult && (
				<div style={{ marginTop: "1.5rem" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
						<p className="v4-kicker" style={{ margin: 0 }}>Simulation Narrative</p>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								type="button"
								className="v4-button v4-button-secondary v4-button-sm"
								onClick={handleDownload}
							>
								Download
							</button>
						</div>
					</div>

					{narrative && (
						<pre
							style={{
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								background: "var(--v4-surface, #f9f9fb)",
								border: "1px solid var(--v4-border, #e5e7eb)",
								borderRadius: "8px",
								padding: "1rem",
								fontFamily: "inherit",
								fontSize: "0.875rem",
								lineHeight: 1.65,
								maxHeight: "400px",
								overflowY: "auto",
							}}
						>
							{narrative}
						</pre>
					)}

					{profiles.length > 0 && (
						<>
							{simData && <OverallStats data={simData} />}
							<MeasurablesTable profiles={profiles} />
							<PredictedStatesTable profiles={profiles} />
							<ImmeasurablesPanel profiles={profiles} />

							{/* ── Phase 1.2: metric dropdown + generic chart ── */}
							<div style={{ marginTop: "1.5rem" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
									<p className="v4-kicker" style={{ margin: 0 }}>Measurable Metric Chart</p>
									<select
										value={selectedMetric.key}
										onChange={(e) => {
											const found = CHART_METRICS.find((m) => m.key === e.target.value);
											if (found) setSelectedMetric(found);
										}}
										className="v4-item-count-input"
										style={{ width: "auto", minWidth: "180px" }}
									>
										{CHART_METRICS.map((m) => (
											<option key={m.key} value={m.key}>{m.label}</option>
										))}
									</select>
								</div>
								<MetricLineChart
									profiles={profiles}
									metric={selectedMetric.key}
									label={selectedMetric.label}
									unit={selectedMetric.unit}
								/>
							</div>

							{/* ── Phase 5: immeasurable trends with CI bands ── */}
							<div style={{ marginTop: "1.5rem" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
									<p className="v4-kicker" style={{ margin: 0 }}>Immeasurable Trends</p>
									<select
										value={selectedImmeasurable.key}
										onChange={(e) => {
											const found = IMMEASURABLE_METRICS.find((m) => m.key === e.target.value);
											if (found) setSelectedImmeasurable(found);
										}}
										className="v4-item-count-input"
										style={{ width: "auto", minWidth: "180px" }}
									>
										{IMMEASURABLE_METRICS.map((m) => (
											<option key={m.key} value={m.key}>{m.label}</option>
										))}
									</select>
									<span style={{ fontSize: "0.72rem", color: "var(--v4-muted)" }}>Shaded band = ±15% confidence interval</span>
								</div>
								<ImmeasurableTrendsChart
									profiles={profiles}
									metricKey={selectedImmeasurable.key}
								/>
							</div>

							<ReadingVsCognitiveScatter profiles={profiles} />

							{/* ── Phase 3: per-profile narratives ── */}
							{Object.keys(profileNarratives).length > 0 && (
								<div style={{ marginTop: "1.5rem" }}>
									<button
										type="button"
										style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}
										onClick={() => setProfileNarrativesOpen((v) => !v)}
									>
										<p className="v4-kicker" style={{ margin: 0 }}>Per-Profile Narratives {profileNarrativesOpen ? "▲" : "▼"}</p>
									</button>
									{profileNarrativesOpen && (
										<div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
											{Object.entries(profileNarratives).map(([label, text]) => {
												const p = profiles.find((pr) => pr.profileLabel === label);
												return (
													<div
														key={label}
														style={{
															borderLeft: `3px solid ${p?.color ?? "var(--v4-accent)"}`,
															paddingLeft: "0.75rem",
															fontSize: "0.85rem",
															lineHeight: 1.65,
														}}
													>
														<div style={{ fontWeight: 700, marginBottom: "0.25rem", color: p?.color ?? "inherit" }}>{label}</div>
														<p style={{ margin: 0 }}>{text}</p>
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}

							<SuggestionsPanel
								profiles={profiles}
								selectedSuggestion={selectedSuggestion}
								onSelect={setSelectedSuggestion}
							/>
							<MetricGlossary />
						</>
					)}
				</div>
			)}
		</section>
	);
}

// Suppress unused-variable warnings for single-mode state that is retained
// for structural symmetry with the multi-mode path.
void (0 as unknown as ReturnType<typeof useState>);

