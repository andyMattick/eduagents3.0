/**
 * src/components_new/v4/SimulationCharts.tsx
 *
 * Recharts-based visualization suite for ParallelSimulatorData.
 * All charts receive the full data object and are self-contained.
 *
 * Charts:
 *   1. CognitiveLoadChart      — LineChart, one line per profile
 *   2. TimeToProcessChart      — BarChart, grouped bars per item
 *   3. ReadingVsCogScatter     — ScatterChart, one series per profile
 *   4. RedFlagDensityChart     — BarChart, stacked flags per item
 *   5. ConfusionMatrix         — CSS grid heat map (no extra library)
 *   6. DifficultySpreadChart   — ComposedChart with min/max/variance bars
 */

import {
	BarChart,
	Bar,
	CartesianGrid,
	ComposedChart,
	ErrorBar,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import type { ParallelSimulatorData, SimulatorData } from "../../types/simulator";

// ---------------------------------------------------------------------------
// Palette — one stable colour per profile index
// ---------------------------------------------------------------------------

const PALETTE = [
	"#bb5b35",
	"#2563eb",
	"#059669",
	"#9333ea",
	"#d97706",
	"#0891b2",
	"#be185d",
	"#4d7c0f",
];

function profileColor(index: number): string {
	return PALETTE[index % PALETTE.length];
}

const CHART_STYLE: React.CSSProperties = {
	marginTop: "2rem",
};

const SECTION_KICKER: React.CSSProperties = {
	margin: "0 0 0.6rem",
	textTransform: "uppercase" as const,
	letterSpacing: "0.14em",
	fontSize: "0.74rem",
	color: "#9c4d2b",
	fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProfiles(data: ParallelSimulatorData): string[] {
	return Object.keys(data.students);
}

/** Merge per-profile item arrays into one flat array keyed by itemNumber. */
function buildItemMatrix(data: ParallelSimulatorData): Array<Record<string, number | string>> {
	const profiles = getProfiles(data);
	const itemMap: Record<number, Record<string, number | string>> = {};

	for (const profile of profiles) {
		for (const item of data.students[profile].items) {
			if (!itemMap[item.itemNumber]) {
				itemMap[item.itemNumber] = { item: item.itemNumber };
			}
			(itemMap[item.itemNumber] as Record<string, number | string>)[profile] = item.cognitiveLoad;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_time`] = item.timeToProcessSeconds;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_confusion`] = item.confusionRisk;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_reading`] = item.readingLoad;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_flags`] = item.redFlags.length;
		}
	}

	return Object.entries(itemMap)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([, v]) => v);
}

// ---------------------------------------------------------------------------
// 1. Cognitive Load Curve
// ---------------------------------------------------------------------------

export function CognitiveLoadChart({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);
	const matrix = buildItemMatrix(data);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Cognitive Load Curve</p>
			<ResponsiveContainer width="100%" height={260}>
				<LineChart data={matrix} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis
						dataKey="item"
						label={{ value: "Item #", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6b5040" }}
						tick={{ fontSize: 10, fill: "#6b5040" }}
					/>
					<YAxis
						domain={[0, 1]}
						tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
						tick={{ fontSize: 10, fill: "#6b5040" }}
					/>
					<Tooltip
						formatter={(value: number | undefined, name: string | undefined) => [`${value !== undefined ? Math.round(value * 100) : 0}%`, name]}
						labelFormatter={(label) => `Item ${label}`}
					/>
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((profile, i) => (
						<Line
							key={profile}
							type="monotone"
							dataKey={profile}
							stroke={profileColor(i)}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 2. Time-to-Process Bar Chart
// ---------------------------------------------------------------------------

export function TimeToProcessChart({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);
	const matrix = buildItemMatrix(data);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Time to Process (seconds per item)</p>
			<ResponsiveContainer width="100%" height={260}>
				<BarChart data={matrix} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis dataKey="item" tick={{ fontSize: 10, fill: "#6b5040" }} />
					<YAxis tick={{ fontSize: 10, fill: "#6b5040" }} unit="s" />
					<Tooltip
						formatter={(value: number | undefined, name: string | undefined) => [`${value !== undefined ? value : 0}s`, name]}
						labelFormatter={(label) => `Item ${label}`}
					/>
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((profile, i) => (
						<Bar
							key={profile}
							dataKey={`${profile}_time`}
							name={profile}
							fill={profileColor(i)}
							fillOpacity={0.8}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 3. Reading Load vs Cognitive Load Scatter
// ---------------------------------------------------------------------------

export function ReadingVsCogScatter({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Reading Load vs Cognitive Load</p>
			<ResponsiveContainer width="100%" height={260}>
				<ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis
						type="number"
						dataKey="x"
						domain={[0, 1]}
						tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
						tick={{ fontSize: 10, fill: "#6b5040" }}
						label={{ value: "Reading Load", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6b5040" }}
					/>
					<YAxis
						type="number"
						dataKey="y"
						domain={[0, 1]}
						tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
						tick={{ fontSize: 10, fill: "#6b5040" }}
						label={{ value: "Cognitive Load", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6b5040" }}
					/>
					<ZAxis range={[40, 40]} />
					<Tooltip
						formatter={(value: number | undefined, name: string | undefined) => [`${value !== undefined ? Math.round(value * 100) : 0}%`, name]}
						cursor={{ strokeDasharray: "3 3" }}
					/>
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((profile, i) => {
						const points = data.students[profile].items.map((item) => ({
							x: item.readingLoad,
							y: item.cognitiveLoad,
							item: item.itemNumber,
						}));
						return (
							<Scatter
								key={profile}
								name={profile}
								data={points}
								fill={profileColor(i)}
								fillOpacity={0.75}
							/>
						);
					})}
				</ScatterChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 4. Red Flag Density Chart
// ---------------------------------------------------------------------------

export function RedFlagDensityChart({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);
	const matrix = buildItemMatrix(data);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Red Flag Density (flags per item)</p>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={matrix} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis dataKey="item" tick={{ fontSize: 10, fill: "#6b5040" }} />
					<YAxis tick={{ fontSize: 10, fill: "#6b5040" }} allowDecimals={false} />
					<Tooltip labelFormatter={(label) => `Item ${label}`} />
					<Legend wrapperStyle={{ fontSize: "0.75rem" }} />
					{profiles.map((profile, i) => (
						<Bar
							key={profile}
							dataKey={`${profile}_flags`}
							name={profile}
							stackId="flags"
							fill={profileColor(i)}
							fillOpacity={0.85}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 5. Confusion Matrix (CSS grid — no extra library)
// ---------------------------------------------------------------------------

function confusionColor(value: number): string {
	if (value >= 0.8) return "#dc2626";
	if (value >= 0.6) return "#f97316";
	if (value >= 0.4) return "#fbbf24";
	if (value >= 0.2) return "#a3e635";
	return "#dcfce7";
}

export function ConfusionMatrix({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);
	if (profiles.length === 0) return null;

	const items = data.students[profiles[0]].items.map((it) => it.itemNumber);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Confusion Risk Heatmap</p>
			<div style={{ overflowX: "auto" }}>
				<table style={{ borderCollapse: "collapse", fontSize: "0.74rem", minWidth: "100%" }}>
					<thead>
						<tr>
							<th
								style={{
									padding: "0.25rem 0.5rem",
									textAlign: "left",
									color: "#6b5040",
									background: "transparent",
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
							>
								Profile ↓ / Item →
							</th>
							{items.map((item) => (
								<th
									key={item}
									style={{
										padding: "0.25rem 0.4rem",
										textAlign: "center",
										color: "#6b5040",
										fontWeight: 600,
									}}
								>
									{item}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{profiles.map((profile) => (
							<tr key={profile}>
								<td
									style={{
										padding: "0.25rem 0.5rem",
										color: "#1f1a17",
										fontWeight: 600,
										whiteSpace: "nowrap",
									}}
								>
									{profile}
								</td>
								{data.students[profile].items.map((item) => (
									<td
										key={item.itemNumber}
										title={`${profile} — Item ${item.itemNumber}: ${Math.round(item.confusionRisk * 100)}%`}
										style={{
											padding: "0.25rem 0.4rem",
											textAlign: "center",
											background: confusionColor(item.confusionRisk),
											color: item.confusionRisk >= 0.6 ? "#fff" : "#1f1a17",
											borderRadius: "3px",
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{Math.round(item.confusionRisk * 100)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
				<p style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#6b5040" }}>
					Values are confusion risk % (0–100). Red = high risk.
				</p>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 6. Difficulty Spread Chart (min/max/variance per item)
// ---------------------------------------------------------------------------

export function DifficultySpreadChart({ data }: { data: ParallelSimulatorData }) {
	const spread = data.comparison.itemDifficultySpread;

	// Recharts ErrorBar needs: value = midpoint, errorY = [lowerDelta, upperDelta]
	const chartData = Object.entries(spread)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([itemNum, s]) => {
			const mid = (s.min + s.max) / 2;
			return {
				item: Number(itemNum),
				mid: parseFloat(mid.toFixed(3)),
				variance: parseFloat(s.variance.toFixed(3)),
				errorY: [
					parseFloat((mid - s.min).toFixed(3)),
					parseFloat((s.max - mid).toFixed(3)),
				],
			};
		});

	if (chartData.length === 0) return null;

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Difficulty Spread (min / mid / max cognitive load per item)</p>
			<ResponsiveContainer width="100%" height={240}>
				<ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis dataKey="item" tick={{ fontSize: 10, fill: "#6b5040" }} />
					<YAxis
						domain={[0, 1]}
						tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
						tick={{ fontSize: 10, fill: "#6b5040" }}
					/>
					<Tooltip
						formatter={(value: number | undefined, name: string | undefined) => {
							if (name === "variance") return [(value ?? 0).toFixed(3), "Variance" as const];
							return [`${Math.round((value ?? 0) * 100)}%`, "Midpoint" as const];
						}}
						labelFormatter={(label) => `Item ${label}`}
					/>
					<Bar dataKey="mid" name="Midpoint" fill="#bb5b35" fillOpacity={0.75} radius={[4, 4, 0, 0]}>
						<ErrorBar dataKey="errorY" width={6} strokeWidth={2} stroke="#874122" direction="y" />
					</Bar>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Comparison Insights block
// ---------------------------------------------------------------------------

export function ComparisonInsights({ data }: { data: ParallelSimulatorData }) {
	const { comparison } = data;
	const hasUniversal = comparison.universallyDifficultItems.length > 0;
	const profileRisks = Object.entries(comparison.profileSpecificRisks).filter(
		([, items]) => items.length > 0,
	);

	const highVarianceItems = Object.entries(comparison.itemDifficultySpread)
		.filter(([, s]) => s.variance > 0.05)
		.sort(([, a], [, b]) => b.variance - a.variance)
		.slice(0, 5)
		.map(([n]) => Number(n));

	if (!hasUniversal && profileRisks.length === 0 && highVarianceItems.length === 0) return null;

	return (
		<div
			style={{
				marginTop: "2rem",
				padding: "1.25rem 1.5rem",
				background: "rgba(187,91,53,0.05)",
				border: "1px solid rgba(187,91,53,0.2)",
				borderRadius: "16px",
			}}
		>
			<p style={SECTION_KICKER}>Comparison Insights</p>

			{hasUniversal && (
				<div style={{ marginBottom: "0.75rem" }}>
					<span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Universally difficult items: </span>
					<span style={{ fontSize: "0.85rem" }}>
						{comparison.universallyDifficultItems.map((n) => `#${n}`).join(", ")}
					</span>
				</div>
			)}

			{profileRisks.map(([profile, items]) => (
				<div key={profile} style={{ marginBottom: "0.5rem" }}>
					<span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{profile} struggles most with: </span>
					<span style={{ fontSize: "0.85rem" }}>{items.map((n) => `#${n}`).join(", ")}</span>
				</div>
			))}

			{highVarianceItems.length > 0 && (
				<div style={{ marginTop: "0.5rem" }}>
					<span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Highest equity risk (widest difficulty spread): </span>
					<span style={{ fontSize: "0.85rem" }}>
						{highVarianceItems.map((n) => `#${n}`).join(", ")} — these items affect learners very differently.
					</span>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// ParallelSimulationResults — full dashboard, single import
// ---------------------------------------------------------------------------

export function ParallelSimulationResults({ data }: { data: ParallelSimulatorData }) {
	return (
		<div style={{ width: "100%", minWidth: 0, display: "block" }}>
			<ComparisonInsights data={data} />
			<CognitiveLoadChart data={data} />
			<ConfusionMatrix data={data} />
			<TimeToProcessChart data={data} />
			<RedFlagDensityChart data={data} />
			<ReadingVsCogScatter data={data} />
			<DifficultySpreadChart data={data} />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Normalizer — convert single-profile SimulatorData → ParallelSimulatorData
// ---------------------------------------------------------------------------

function normalizeToParallel(data: SimulatorData): ParallelSimulatorData {
	return {
		students: { Student: data },
		comparison: {
			universallyDifficultItems: [],
			profileSpecificRisks: {},
			itemDifficultySpread: {},
		},
	};
}

// ---------------------------------------------------------------------------
// Unified entry — accepts SimulatorData OR ParallelSimulatorData
// ---------------------------------------------------------------------------

function isParallel(data: SimulatorData | ParallelSimulatorData): data is ParallelSimulatorData {
	return "students" in data;
}

export function SimulationCharts({ data }: { data: SimulatorData | ParallelSimulatorData }) {
	if (!data) return null;

	const parallel = isParallel(data) ? data : normalizeToParallel(data);
	const isMulti = isParallel(data);

	return (
		<div style={{ width: "100%", minWidth: 0, display: "block" }}>
			{isMulti && <ComparisonInsights data={parallel} />}
			<CognitiveLoadChart data={parallel} />
			<ConfusionMatrix data={parallel} />
			<TimeToProcessChart data={parallel} />
			<RedFlagDensityChart data={parallel} />
			<ReadingVsCogScatter data={parallel} />
			{isMulti && <DifficultySpreadChart data={parallel} />}
		</div>
	);
}
