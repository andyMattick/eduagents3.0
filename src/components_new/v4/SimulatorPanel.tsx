/**
 * src/components_new/v4/SimulatorPanel.tsx
 *
 * Student Simulation Tools panel — displayed after a document session is created.
 * Three modes, each triggering a single LLM call:
 *
 *  1. Simulate Student Experience  — single doc, narrative + per-item analytics
 * No ingestion. No pipeline. No concept extraction.
 */

import { useState } from "react";
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
} from "recharts";
import { runSingleSimulatorApi } from "../../lib/simulatorApi";
import type {
	SimulationProfileMetrics,
	SimulationSuggestion,
	SimulationSuggestionType,
	SimulatorData,
	StudentProfile,
} from "../../types/simulator";
import { DEFAULT_STUDENT_PROFILE, STUDENT_PROFILE_PRESETS } from "../../types/simulator";

import { loadToColor, colorForProfile } from "../../lib/colorScale";
import { buildSuggestionsAllProfiles } from "../../lib/suggestionTargeting";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SimMode = "single" | null;

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
			cognitiveLoad: item.cognitiveLoad,
			difficulty: 1 + item.cognitiveLoad * 4, // approximation when difficulty absent
			timeToProcessSeconds: item.timeToProcessSeconds,
			readingLoad: item.readingLoad,
			steps: item.sentenceCount,
			distractorDensity: 0,
		})),
		predictedStates: {
			fatigue: data.overall.predictedStates?.fatigue ?? data.overall.fatigueRisk,
			confusion: data.overall.predictedStates?.confusion ?? 0,
			guessing: data.overall.predictedStates?.guessing ?? 0,
			overload: data.overall.predictedStates?.overload ?? 0,
			frustration: data.overall.predictedStates?.frustration ?? 0,
			timePressureCollapse: data.overall.predictedStates?.timePressureCollapse ?? data.overall.pacingRisk,
		},
	}];
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
// Measurables table (multi-profile, color-scaled)
// ---------------------------------------------------------------------------

const MEASURABLE_COLS = [
	{ key: "wordCount" as const, label: "Words", scaled: false },
	{ key: "cognitiveLoad" as const, label: "Cog. Load", scaled: true },
	{ key: "timeToProcessSeconds" as const, label: "Time (s)", scaled: false },
	{ key: "readingLoad" as const, label: "Reading Load", scaled: true },
] as const;

function MeasurablesTable({ profiles }: { profiles: SimulationProfileMetrics[] }) {
	if (profiles.length === 0 || profiles[0].measurables.length === 0) return null;
	const itemCount = profiles[0].measurables.length;
	const tdBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.78rem", textAlign: "center" };
	const thBase: React.CSSProperties = { padding: "0.3rem 0.5rem", fontSize: "0.72rem", color: "var(--v4-muted)", textAlign: "center", fontWeight: 600 };

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
						MEASURABLE_COLS.map((col, ci) => (
							<tr key={`${i}-${col.key}`} style={{ borderBottom: ci === MEASURABLE_COLS.length - 1 ? "2px solid var(--v4-border, #e5e7eb)" : "1px solid var(--v4-border, #e5e7eb)" }}>
								{ci === 0 && (
									<td rowSpan={MEASURABLE_COLS.length} style={{ ...tdBase, fontWeight: 700, textAlign: "left", verticalAlign: "middle" }}>
										#{profiles[0].measurables[i].index}
									</td>
								)}
								<td style={{ ...tdBase, textAlign: "left", color: "var(--v4-muted)", whiteSpace: "nowrap" }}>{col.label}</td>
								{profiles.map((p) => {
									const val = p.measurables[i]?.[col.key] as number | undefined;
									const bg = col.scaled && val !== undefined ? loadToColor(val) : "transparent";
									return (
										<td key={p.profileId} style={{ ...tdBase, background: bg, color: bg !== "transparent" ? "#111827" : undefined }}>
											{val !== undefined ? (col.key === "wordCount" ? val : val.toFixed(col.key === "timeToProcessSeconds" ? 1 : 2)) : "—"}
										</td>
									);
								})}
							</tr>
						))
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Predicted states table (multi-profile, color-scaled)
// ---------------------------------------------------------------------------

const STATE_ROWS = [
	{ key: "fatigue" as const, label: "Fatigue" },
	{ key: "confusion" as const, label: "Confusion" },
	{ key: "guessing" as const, label: "Guessing" },
	{ key: "overload" as const, label: "Overload" },
	{ key: "frustration" as const, label: "Frustration" },
	{ key: "timePressureCollapse" as const, label: "Time-Pressure Collapse" },
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

	// Result state
	const [loading, setLoading] = useState(false);
	const [narrative, setNarrative] = useState<string | null>(null);
	const [simData, setSimData] = useState<SimulatorData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tokenUsage, setTokenUsage] = useState<{ used: number; remaining: number; limit: number } | null>(null);
	const [selectedSuggestion, setSelectedSuggestion] = useState<SimulationSuggestion | null>(null);

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
		setError(null);
		setSelectedSuggestion(null);
	}

	async function handleRun() {
		setLoading(true);
		setSelectedSuggestion(null);
		setNarrative(null);
		setSimData(null);
		setError(null);
		try {
			if (mode === "single") {
				const res = await runSingleSimulatorApi({ sessionId, studentProfile: profile });
				setNarrative(res.narrative);
				setSimData(res.data);
				if (res.tokenUsage) setTokenUsage(res.tokenUsage);
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

	const profiles = simData ? singleDataToProfiles(simData, selectedPreset) : [];

	// ── Render ────────────────────────────────────────────────────────────────

	const canRun = mode !== null && !loading;
	const hasResult = narrative !== null;

	return (
		<section className="v4-panel v4-vector-span">
			<p className="v4-kicker">Student Simulation Tools</p>
			<p className="v4-body-copy" style={{ marginBottom: "1rem" }}>
				Run a quick simulation using your uploaded document — no pipeline, one AI call.
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
			</div>

			{/* ── Student Profile dropdown ── */}
			{mode !== null && (
				<div style={{ marginTop: "1rem" }}>
					<label className="v4-kicker" htmlFor="simulator-profile-select">
						Student Profile
					</label>
					<select
						id="simulator-profile-select"
						className="v4-item-count-input"
						style={{ marginTop: "0.35rem", width: "auto", minWidth: "200px" }}
						value={selectedPreset}
						onChange={(e) => handlePresetChange(e.target.value)}
					>
						{STUDENT_PROFILE_PRESETS.map((p) => (
							<option key={p.label} value={p.label}>
								{p.label}
							</option>
						))}
					</select>
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
						{loading ? "Running…" : "Run Simulation"}
					</button>
				</div>
			)}

			{/* ── Error ── */}
			{error && <p className="v4-error" style={{ marginTop: "0.75rem" }}>{error}</p>}

			{/* ── Token usage ── */}
			{tokenUsage && (
				<div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--v4-muted)" }}>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
						<span>Daily tokens: {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}</span>
						<span>{tokenUsage.remaining.toLocaleString()} remaining</span>
					</div>
					<div style={{ height: 5, borderRadius: 3, background: "var(--v4-border, #e5e7eb)" }}>
						<div style={{
							height: 5, borderRadius: 3, transition: "width 0.4s",
							width: `${Math.min(100, Math.round((tokenUsage.used / tokenUsage.limit) * 100))}%`,
							background: tokenUsage.used / tokenUsage.limit >= 0.9 ? "var(--v4-error, #dc2626)" : "var(--v4-accent, #2563eb)",
						}} />
					</div>
				</div>
			)}

			{hasResult && (
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

					{simData && profiles.length > 0 && (
						<>
							<OverallStats data={simData} />
							<MeasurablesTable profiles={profiles} />
							<PredictedStatesTable profiles={profiles} />
							<CognitiveLoadGraph profiles={profiles} />
							<TimeToProcessGraph profiles={profiles} />
							<ReadingVsCognitiveScatter profiles={profiles} />
							<SuggestionsPanel
								profiles={profiles}
								selectedSuggestion={selectedSuggestion}
								onSelect={setSelectedSuggestion}
							/>
						</>
					)}
				</div>
			)}
		</section>
	);
}
