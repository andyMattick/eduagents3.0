/**
 * src/components_new/v4/ShortCircuitPage.tsx
 *
 * Primary simulation experience -- single screen, progressive reveal.
 *
 * Phases:
 *   1. Upload  -- drag/drop a PDF (or Word/PowerPoint)
 *   2. Profiles -- select up to 3 student profiles (default: Average Student)
 *   3. Results  -- ShortCircuitGraph + SimulationExplanationPanel + Start over
 *
 * Calls POST /api/v4/simulator/shortcircuit with { sessionId, profiles }.
 * All measurables are computed locally -- no Gemini, no 429s.
 */

import { useState, useRef, useCallback } from "react";
import { ShortCircuitGraph } from "./ShortCircuitGraph";
import { SimulationExplanationPanel } from "./SimulationExplanationPanel";
import { createStudioSessionFromFilesApi } from "../../lib/teacherStudioApi";
import type { ShortCircuitItem, ProfileShortCircuitResult } from "../../../api/v4/simulator/shortcircuit";
import "./v4.css";

const PROFILES = [
	{ id: "average",  label: "Average Student",   color: "#3b82f6" },
	{ id: "adhd",     label: "ADHD Profile",       color: "#f97316" },
	{ id: "dyslexia", label: "Dyslexia Profile",   color: "#22c55e" },
	{ id: "ell",      label: "ELL Profile",        color: "#a855f7" },
	{ id: "gifted",   label: "Gifted / Fast",      color: "#eab308" },
] as const;

const MAX_PROFILES = 3;
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx";
const DROP_RE = /\.(pdf|doc|docx|ppt|pptx)$/i;

type Phase = "upload" | "profile" | "running" | "results";

export function ShortCircuitPage() {
	const [phase, setPhase] = useState<Phase>("upload");
	const [file, setFile] = useState<File | null>(null);
	const [dragging, setDragging] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set(["average"]));
	const [runError, setRunError] = useState<string | null>(null);
	const [items, setItems] = useState<ShortCircuitItem[] | null>(null);
	const [profiles, setProfiles] = useState<ProfileShortCircuitResult[] | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const startOver = useCallback(() => {
		setPhase("upload");
		setFile(null);
		setDragging(false);
		setUploadError(null);
		setUploading(false);
		setSessionId(null);
		setSelectedProfiles(new Set(["average"]));
		setRunError(null);
		setItems(null);
		setProfiles(null);
	}, []);

	const handleFile = useCallback((f: File) => {
		if (!DROP_RE.test(f.name)) {
			setUploadError("Only PDF, Word, or PowerPoint files are accepted.");
			return;
		}
		setFile(f);
		setUploadError(null);
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) handleFile(f);
	};

	const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
	const handleDragLeave = () => setDragging(false);
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		const f = Array.from(e.dataTransfer.files).find((ff) => DROP_RE.test(ff.name));
		if (f) { handleFile(f); } else { setUploadError("Only PDF, Word, or PowerPoint files are accepted."); }
	};

	const handleUpload = async () => {
		setUploading(true);
		setUploadError(null);
		try {
			const { sessionId: sid } = await createStudioSessionFromFilesApi([file]);
			setSessionId(sid);
			setPhase("profile");
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	const toggleProfile = (id: string) => {
		setSelectedProfiles((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				if (next.size === 1) return prev;
				next.delete(id);
			} else {
				if (next.size >= MAX_PROFILES) return prev;
				next.add(id);
			}
			return next;
		});
	};

	const handleRun = async () => {
		setPhase("running");
		setRunError(null);
		setItems(null);
		setProfiles(null);
		try {
			const res = await fetch("/api/v4/simulator/shortcircuit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, profiles: Array.from(selectedProfiles) }),
			});
			const data = await res.json();
			if (!res.ok) {
				setRunError(data.error ?? "Simulation failed.");
				setPhase("profile");
				return;
			}
			setItems(data.items ?? []);
			setProfiles(data.profiles ?? []);
			setPhase("results");
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Network error. Please try again.");
			setPhase("profile");
		}
	};

	const phaseOrder: Phase[] = ["upload", "profile", "running", "results"];
	const currentPhaseIdx = phaseOrder.indexOf(phase);

	return (
		<div className="v4-shortcircuit-page">
			<div className="v4-shortcircuit-steps">
				{[
					{ key: "upload" as Phase,  label: "1. Upload" },
					{ key: "profile" as Phase, label: "2. Profiles" },
					{ key: "results" as Phase, label: "3. Results" },
				].map(({ key, label }, idx, arr) => {
					const stepIdx = phaseOrder.indexOf(key);
					const done = currentPhaseIdx > stepIdx;
					const active = key === "profile" ? (phase === "profile" || phase === "running") : phase === key;
					const stepClass = active
						? "v4-shortcircuit-step v4-shortcircuit-step-active"
						: done
							? "v4-shortcircuit-step v4-shortcircuit-step-done"
							: "v4-shortcircuit-step";
					return (
						<span key={key} className="v4-shortcircuit-step-wrap">
							<span className={stepClass}>{label}</span>
							{idx < arr.length - 1 && <span className="v4-shortcircuit-step-sep">›</span>}
						</span>
					);
				})}
			</div>

			{phase === "upload" && (
				<div style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(86,57,32,0.16)", borderRadius: "20px", padding: "2rem", maxWidth: "560px" }}>
					<h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#1f1a17" }}>Upload your document</h2>
					<p style={{ fontSize: "0.85rem", color: "#6b5040", marginBottom: "1.25rem" }}>
						PDF, Word, or PowerPoint. This is the document your students will experience.
					</p>
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
						style={{
							border: `2px dashed ${dragging ? "#bb5b35" : file ? "#22c55e" : "rgba(86,57,32,0.3)"}`,
							borderRadius: "12px", padding: "2.5rem 1.5rem", textAlign: "center", cursor: "pointer",
							background: dragging ? "rgba(187,91,53,0.05)" : file ? "rgba(34,197,94,0.05)" : "transparent",
							transition: "all 0.15s", marginBottom: "1rem",
						}}
					>
						<input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} style={{ display: "none" }} onChange={handleInputChange} />
						{file ? (
							<>
								<div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>&#x2713;</div>
								<p style={{ margin: 0, fontWeight: 600, color: "#1f1a17" }}>{file.name}</p>
								<p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>{(file.size / 1024).toFixed(0)} KB -- click to change</p>
							</>
						) : (
							<>
								<div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "rgba(86,57,32,0.4)" }}>⬆</div>
								<p style={{ margin: 0, fontWeight: 600, color: "#1f1a17" }}>Drop your file here</p>
								<p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>or click to browse -- PDF, Word, PowerPoint accepted</p>
							</>
						)}
					</div>
					{uploadError && (
						<div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#dc2626", fontSize: "0.82rem", marginBottom: "1rem" }}>
							{uploadError}
						</div>
					)}
					<button
						type="button"
						onClick={() => void handleUpload()}
						disabled={!file || uploading}
						style={{ padding: "0.65rem 1.5rem", background: !file || uploading ? "#9ca3af" : "#bb5b35", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, cursor: !file || uploading ? "not-allowed" : "pointer", width: "100%" }}
					>
						{uploading ? "Uploading…" : "Continue →"}
					</button>
				</div>
			)}

			{(phase === "profile" || phase === "running") && (
				<div style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(86,57,32,0.16)", borderRadius: "20px", padding: "2rem", maxWidth: "560px" }}>
					<h2 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", color: "#1f1a17" }}>Select student profiles</h2>
					<p style={{ fontSize: "0.85rem", color: "#6b5040", marginBottom: "1.25rem" }}>
						Choose up to {MAX_PROFILES} profiles to compare. Modifiers are deterministic -- no AI calls.
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
						{PROFILES.map(({ id, label, color }) => {
							const checked = selectedProfiles.has(id);
							const disabled = !checked && selectedProfiles.size >= MAX_PROFILES;
							return (
								<label key={id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "10px", border: `2px solid ${checked ? color : "rgba(86,57,32,0.14)"}`, background: checked ? `${color}14` : "transparent", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, transition: "all 0.15s" }}>
									<input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleProfile(id)} style={{ accentColor: color, width: "16px", height: "16px" }} />
									<span style={{ width: "12px", height: "12px", borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
									<span style={{ fontWeight: checked ? 600 : 400, color: "#1f1a17", fontSize: "0.9rem" }}>{label}</span>
								</label>
							);
						})}
					</div>
					<p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>{selectedProfiles.size}/{MAX_PROFILES} selected -- must keep at least 1</p>
					{runError && (
						<div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#dc2626", fontSize: "0.82rem", marginBottom: "1rem" }}>
							{runError}
						</div>
					)}
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button type="button" onClick={startOver} style={{ padding: "0.65rem 1.25rem", background: "transparent", color: "#6b5040", border: "1px solid rgba(86,57,32,0.25)", borderRadius: "8px", fontSize: "0.9rem", cursor: "pointer" }}>
							← Back
						</button>
						<button
							type="button"
							onClick={() => void handleRun()}
							disabled={phase === "running" || selectedProfiles.size === 0}
							style={{ padding: "0.65rem 1.5rem", background: phase === "running" || selectedProfiles.size === 0 ? "#9ca3af" : "#bb5b35", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, cursor: phase === "running" || selectedProfiles.size === 0 ? "not-allowed" : "pointer", flex: 1 }}
						>
							{phase === "running" ? "Running simulation…" : "Run Simulation →"}
						</button>
					</div>
				</div>
			)}

			{phase === "results" && items && (
				<div>
					<div className="v4-shortcircuit-results-head">
						<div>
							<h2 className="v4-shortcircuit-results-title">Simulation Results</h2>
							<p className="v4-shortcircuit-results-meta">
								{file?.name} · {items.length} item{items.length !== 1 ? "s" : ""} · {profiles?.length ?? 0} profile{(profiles?.length ?? 0) !== 1 ? "s" : ""}
							</p>
						</div>
						<button type="button" onClick={startOver} className="v4-shortcircuit-startover">
							← Start over
						</button>
					</div>
					<div className="v4-shortcircuit-result-card">
						<ShortCircuitGraph items={items} profiles={profiles ?? undefined} />
					</div>
					<div className="v4-shortcircuit-result-card">
						<SimulationExplanationPanel />
					</div>
				</div>
			)}
		</div>
	);
}
