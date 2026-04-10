/**
 * src/components_new/v4/SimulationCharts.tsx
 *
 * Recharts-based visualization suite for ParallelSimulatorData.
 * All charts receive the full data object and are self-contained.
 *
 * Charts (reduced set):
 *   1. PrimaryItemGraph   — Item number vs cognitive load + reading level
 *   2. TimeToProcessChart — BarChart, grouped bars per item
 *   3. ConfusionMatrix    — CSS grid heat map (no extra library)
 */

import {
	BarChart,
	Bar,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
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

// Readable tick/label color that works on both light and dark panel backgrounds
const TICK_COLOR = "#a89070";

// Consistent dark tooltip for all charts
const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
	backgroundColor: "rgba(10,6,3,0.88)",
	border: "1px solid rgba(187,91,53,0.3)",
	borderRadius: "8px",
	color: "#f0e6d8",
	fontSize: "0.78rem",
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: "#f0e6d8", fontWeight: 600 };
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: "#f0e6d8" };
const LEGEND_STYLE: React.CSSProperties = { fontSize: "0.75rem", color: TICK_COLOR };

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
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_cognitive`] = item.cognitiveLoad;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_time`] = item.timeToProcessSeconds;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_confusion`] = item.confusionRisk;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_misconception`] = item.misconceptionRisk;
			(itemMap[item.itemNumber] as Record<string, number | string>)[`${profile}_reading`] = item.readingLoad;
		}
	}

	return Object.entries(itemMap)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([, v]) => v);
}

function riskBand(value: number): "high" | "medium" | "low" {
	if (value >= 0.7) return "high";
	if (value >= 0.45) return "medium";
	return "low";
}

function summarizePrimaryRiskItems(matrix: Array<Record<string, number | string>>, profiles: string[]): string[] {
	const out: string[] = [];
	for (const row of matrix) {
		const item = Number(row.item ?? 0);
		const hasHigh = profiles.some((profile) => {
			const cognitive = Number(row[`${profile}_cognitive`] ?? 0);
			const confusion = Number(row[`${profile}_confusion`] ?? 0);
			const misconception = Number(row[`${profile}_misconception`] ?? 0);
			return cognitive >= 0.75 || confusion >= 0.65 || misconception >= 0.65;
		});
		if (hasHigh) out.push(`#${item}`);
	}
	return out;
}

// ---------------------------------------------------------------------------
// 1. Primary Item Graph
// ---------------------------------------------------------------------------

function PrimaryGraphTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: Record<string, number | string> }>; label?: string | number; }) {
	if (!active || !payload || payload.length === 0) return null;
	const row = payload[0].payload;
	const profiles = Object.keys(row)
		.filter((key) => key.endsWith("_cognitive"))
		.map((key) => key.replace(/_cognitive$/, ""));

	return (
		<div style={TOOLTIP_CONTENT_STYLE}>
			<div style={{ ...TOOLTIP_LABEL_STYLE, marginBottom: "0.4rem" }}>Item {label}</div>
			{profiles.map((profile) => {
				const cognitive = Number(row[`${profile}_cognitive`] ?? 0);
				const reading = Number(row[`${profile}_reading`] ?? 0);
				const confusion = Number(row[`${profile}_confusion`] ?? 0);
				const misconception = Number(row[`${profile}_misconception`] ?? 0);
				const time = Number(row[`${profile}_time`] ?? 0);
				const delta = cognitive - reading;
				const band = riskBand(Math.max(cognitive, confusion, misconception));
				const bandColor = band === "high" ? "#fca5a5" : band === "medium" ? "#fde68a" : "#86efac";
				return (
					<div key={profile} style={{ marginBottom: "0.45rem" }}>
						<div style={{ ...TOOLTIP_ITEM_STYLE, fontWeight: 700, display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
							<span>{profile}</span>
							<span style={{ color: bandColor, textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.07em" }}>{band} risk</span>
						</div>
						<div style={TOOLTIP_ITEM_STYLE}>Cognitive: {Math.round(cognitive * 100)}%</div>
						<div style={TOOLTIP_ITEM_STYLE}>Reading: {Math.round(reading * 100)}%</div>
						<div style={TOOLTIP_ITEM_STYLE}>Gap (Cog-Read): {delta >= 0 ? "+" : ""}{Math.round(delta * 100)} pts</div>
						<div style={TOOLTIP_ITEM_STYLE}>Confusion: {Math.round(confusion * 100)}%</div>
						<div style={TOOLTIP_ITEM_STYLE}>Misconception: {Math.round(misconception * 100)}%</div>
						<div style={TOOLTIP_ITEM_STYLE}>Time: {time}s</div>
					</div>
				);
			})}
		</div>
	);
}

export function PrimaryItemGraph({ data }: { data: ParallelSimulatorData }) {
	const profiles = getProfiles(data);
	const matrix = buildItemMatrix(data);
	const highRiskItems = summarizePrimaryRiskItems(matrix, profiles);

	return (
		<div style={CHART_STYLE}>
			<p style={SECTION_KICKER}>Primary Item Graph (Cognitive + Reading)</p>
			<p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#7c5a46", lineHeight: 1.5 }}>
				Solid line = cognitive load. Dashed line = reading load. Use the tooltip for confusion, misconception, and time signals.
			</p>
			{highRiskItems.length > 0 && (
				<p style={{ margin: "0 0 0.65rem", fontSize: "0.76rem", color: "#9a3412" }}>
					Priority items to inspect: {highRiskItems.join(", ")}
				</p>
			)}
			<p style={{ margin: highRiskItems.length > 0 ? "-0.2rem 0 0.7rem" : "0 0 0.7rem", fontSize: "0.72rem", color: "#7c5a46" }}>
				Thresholds: High risk = cognitive ≥ 70% or confusion/misconception ≥ 65%. Medium risk = cognitive ≥ 45%.
			</p>
			<ResponsiveContainer width="100%" height={260}>
				<LineChart data={matrix} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(86,57,32,0.1)" />
					<XAxis
						dataKey="item"
						label={{ value: "Item #", position: "insideBottom", offset: -2, fontSize: 11, fill: TICK_COLOR }}
						tick={{ fontSize: 10, fill: TICK_COLOR }}
					/>
					<YAxis
						domain={[0, 1]}
						tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
						tick={{ fontSize: 10, fill: TICK_COLOR }}
					/>
					<Tooltip content={<PrimaryGraphTooltip />} />
					<Legend wrapperStyle={LEGEND_STYLE} />
					{profiles.map((profile, i) => (
						[
							<Line
								key={`${profile}-cognitive`}
								type="monotone"
								name={`${profile} Cognitive`}
								dataKey={`${profile}_cognitive`}
								stroke={profileColor(i)}
								strokeWidth={2.2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>,
							<Line
								key={`${profile}-reading`}
								type="monotone"
								name={`${profile} Reading`}
								dataKey={`${profile}_reading`}
								stroke={profileColor(i)}
								strokeOpacity={0.85}
								strokeDasharray="5 4"
								strokeWidth={2}
								dot={{ r: 2 }}
								activeDot={{ r: 4 }}
							/>
						]
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
					<XAxis dataKey="item" tick={{ fontSize: 10, fill: TICK_COLOR }} />
					<YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} unit="s" />
					<Tooltip
						contentStyle={TOOLTIP_CONTENT_STYLE}
					labelStyle={TOOLTIP_LABEL_STYLE}
					itemStyle={TOOLTIP_ITEM_STYLE}
					formatter={(value: number | undefined, name: string | undefined) => [`${value !== undefined ? value : 0}s`, name]}
					labelFormatter={(label) => `Item ${label}`}
				/>
				<Legend wrapperStyle={LEGEND_STYLE} />
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
// ---------------------------------------------------------------------------
// 3. Confusion Matrix (CSS grid — no extra library)
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
// Comparison Insights block
// ---------------------------------------------------------------------------

export function ComparisonInsights({ data }: { data: ParallelSimulatorData }) {
	const { comparison } = data;
	const hasUniversal = comparison.universallyDifficultItems.length > 0;
	const profileRisks = Object.entries(comparison.profileSpecificRisks).filter(
		([, items]) => items.length > 0,
	);

	if (!hasUniversal && profileRisks.length === 0) return null;

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
			<PrimaryItemGraph data={data} />
			<ConfusionMatrix data={data} />
			<TimeToProcessChart data={data} />
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
			<PrimaryItemGraph data={parallel} />
			<ConfusionMatrix data={parallel} />
			<TimeToProcessChart data={parallel} />
		</div>
	);
}
