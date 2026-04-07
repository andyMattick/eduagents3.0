/**
 * src/components_new/v4/SimulatorPanel.tsx
 *
 * Student Simulation Tools panel — displayed after a document session is created.
 * Three modes, each triggering a single LLM call:
 *
 *  1. Simulate Student Experience  — single doc, narrative + per-item analytics
 *  2. Simulate Test Preparedness   — upload a prep doc, compare against session
 * No ingestion. No pipeline. No concept extraction.
 */

import { useRef, useState } from "react";
import { runPreparednessSimulatorApi, runSingleSimulatorApi } from "../../lib/simulatorApi";
import type {
	SimulatorData,
	StudentProfile,
} from "../../types/simulator";
import { DEFAULT_STUDENT_PROFILE, STUDENT_PROFILE_PRESETS } from "../../types/simulator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SimMode = "single" | "preparedness" | null;

interface SimulatorPanelProps {
	sessionId: string;
}

// ---------------------------------------------------------------------------
// Text extraction helper (client-side, non-PDF)
// ---------------------------------------------------------------------------

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsText(file, "utf-8");
	});
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

function OverallStats({ data, mode }: { data: SimulatorData; mode: SimMode }) {
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
				{overall.alignmentScore !== undefined && mode === "preparedness" && (
					<div className="v4-panel" style={{ padding: "0.75rem", background: "var(--v4-surface)" }}>
						<div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{Math.round(overall.alignmentScore * 100)}%</div>
						<div className="v4-stat-label">Alignment</div>
					</div>
				)}
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
// Item analytics table
// ---------------------------------------------------------------------------

function ItemTable({ data, mode }: { data: SimulatorData; mode: SimMode }) {
	if (data.items.length === 0) return null;
	return (
		<div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Item-by-Item Analysis</p>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
				<thead>
					<tr style={{ borderBottom: "2px solid var(--v4-border, #e5e7eb)" }}>
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>#</th>
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Words</th>
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Cog. Load</th>
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Confusion</th>
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Time (s)</th>
						{mode === "preparedness" && <th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Alignment</th>}
						<th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--v4-muted)" }}>Flags</th>
					</tr>
				</thead>
				<tbody>
					{data.items.map((item) => {
						const highCog = item.cognitiveLoad > 0.7;
						const highConf = item.confusionRisk > 0.7;
						return (
							<tr key={item.itemNumber} style={{ borderBottom: "1px solid var(--v4-border, #e5e7eb)", background: (highCog || highConf) ? "var(--v4-surface-warn, #fef9c3)" : undefined }}>
								<td style={{ padding: "0.35rem 0.5rem", fontWeight: 600 }}>{item.itemNumber}</td>
								<td style={{ padding: "0.35rem 0.5rem" }}>{item.wordCount}</td>
								<td style={{ padding: "0.35rem 0.5rem", color: highCog ? "var(--v4-error, #dc2626)" : undefined }}>{Math.round(item.cognitiveLoad * 100)}%</td>
								<td style={{ padding: "0.35rem 0.5rem", color: highConf ? "var(--v4-error, #dc2626)" : undefined }}>{Math.round(item.confusionRisk * 100)}%</td>
								<td style={{ padding: "0.35rem 0.5rem" }}>{item.timeToProcessSeconds}</td>
								{mode === "preparedness" && (
									<td style={{ padding: "0.35rem 0.5rem" }}>
										{item.alignmentScore !== undefined ? `${Math.round(item.alignmentScore * 100)}%` : "—"}
									</td>
								)}
								<td style={{ padding: "0.35rem 0.5rem", color: "var(--v4-error, #dc2626)", maxWidth: "200px" }}>
									{item.redFlags.join(", ") || "—"}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimulatorPanel({ sessionId }: SimulatorPanelProps) {
	const [mode, setMode] = useState<SimMode>(null);
	const [profile, setProfile] = useState<StudentProfile>(DEFAULT_STUDENT_PROFILE);
	const [selectedPreset, setSelectedPreset] = useState<string>("Average Student");

	// Second-document state (preparedness)
	const [secondFile, setSecondFile] = useState<File | null>(null);
	const [secondFileError, setSecondFileError] = useState<string | null>(null);
	const secondFileRef = useRef<HTMLInputElement>(null);

	// Result state
	const [loading, setLoading] = useState(false);
	const [narrative, setNarrative] = useState<string | null>(null);
	const [simData, setSimData] = useState<SimulatorData | null>(null);
	const [error, setError] = useState<string | null>(null);

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
		setSecondFile(null);
		setSecondFileError(null);
	}

	function handleSecondFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0] ?? null;
		setSecondFile(file);
		setSecondFileError(null);
		if (file && file.type === "application/pdf") {
			setSecondFileError("PDF text extraction for a second document is not supported yet. Please use a .txt, .doc, or .docx file.");
			setSecondFile(null);
		}
	}

	async function handleRun() {
		setLoading(true);
		setNarrative(null);
		setSimData(null);
		setError(null);
		try {
			if (mode === "single") {
				const res = await runSingleSimulatorApi({ sessionId, studentProfile: profile });
				setNarrative(res.narrative);
				setSimData(res.data);
			} else if (mode === "preparedness") {
				if (!secondFile) {
					setError("Please upload the prep/study material before running.");
					return;
				}
				const prepText = await readFileAsText(secondFile);
				const res = await runPreparednessSimulatorApi({ sessionId, prepText, studentProfile: profile });
				setNarrative(res.narrative);
				setSimData(res.data);
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


	// ── Render ────────────────────────────────────────────────────────────────

	const needsSecondDoc = mode === "preparedness";
	const canRun = mode !== null && !loading && (mode === "preparedness" ? !!secondFile : true);
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
				<button
					type="button"
					className={`v4-button${mode === "preparedness" ? " v4-button-active" : " v4-button-secondary"}`}
					onClick={() => handleModeSelect("preparedness")}
				>
					Simulate Test Preparedness
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

			{/* ── Second document slot ── */}
			{needsSecondDoc && (
				<div style={{ marginTop: "1rem" }}>
					<p className="v4-kicker" style={{ marginBottom: "0.35rem" }}>
					"Upload prep / study material (required)"
					</p>
					<div className="v4-upload-actions">
						<button
							type="button"
							className="v4-button v4-button-secondary v4-button-sm"
							onClick={() => secondFileRef.current?.click()}
						>
							{secondFile ? `✓ ${secondFile.name}` : "Choose file (.txt, .doc, .docx)"}
						</button>
						<input
							ref={secondFileRef}
							type="file"
							accept=".txt,.doc,.docx,.rtf"
							style={{ display: "none" }}
							onChange={handleSecondFileChange}
						/>
						{secondFile && (
							<button
								type="button"
								className="v4-button v4-button-secondary v4-button-sm"
								onClick={() => { setSecondFile(null); if (secondFileRef.current) secondFileRef.current.value = ""; }}
							>
								Remove
							</button>
						)}
					</div>
					{secondFileError && <p className="v4-error" style={{ marginTop: "0.5rem" }}>{secondFileError}</p>}
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

			{/* ── Result ── */}
			{hasResult && (
				<div style={{ marginTop: "1.5rem" }}>
					{/* Header row with actions */}
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

					{/* Narrative */}
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

					{/* Simulation data — analytics dashboard */}
					{simData && simData.items.length > 0 && (
						<>
							<OverallStats data={simData} mode={mode} />
							<ItemTable data={simData} mode={mode} />
						</>
					)}

				</div>
			)}
		</section>
	);
}
