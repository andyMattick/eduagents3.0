/**
 * src/components_new/v4/ShortCircuitPage.tsx
 *
 * Single-screen diagnostic harness.
 *
 * Flow:
 *   1. Enter or paste a sessionId
 *   2. Click "Generate"
 *   3. API runs Azure ingestion → local semantic measurables (no Gemini)
 *   4. Graph renders immediately on the same screen
 *
 * No profiles. No narratives. No immeasurables. No rewrite. No 429s.
 */

import { useState } from "react";
import { ShortCircuitGraph } from "./ShortCircuitGraph";
import type { ShortCircuitItem } from "../../../api/v4/simulator/shortcircuit";

export function ShortCircuitPage() {
	const [sessionId, setSessionId] = useState("");
	const [items, setItems] = useState<ShortCircuitItem[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const generate = async () => {
		if (!sessionId.trim()) {
			setError("Enter a session ID first.");
			return;
		}
		setLoading(true);
		setError(null);
		setItems(null);

		try {
			const res = await fetch("/api/v4/simulator/shortcircuit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: sessionId.trim() }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error ?? `Server error ${res.status}`);
				return;
			}

			setItems(data.items ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Network error");
		} finally {
			setLoading(false);
		}
	};

	const reset = () => {
		setItems(null);
		setError(null);
	};

	return (
		<div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
			<h2 style={{ marginBottom: "0.25rem" }}>Short-Circuit Diagnostic</h2>
			<p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
				Azure ingestion → local measurable analysis → graph. No Gemini. No profiles.
			</p>

			{!items && (
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1rem" }}>
					<div>
						<label
							htmlFor="sc-session-id"
							style={{
								display: "block",
								fontSize: "0.8rem",
								fontWeight: 600,
								color: "#374151",
								marginBottom: "0.25rem",
							}}
						>
							Session ID
						</label>
						<input
							id="sc-session-id"
							type="text"
							value={sessionId}
							onChange={(e) => setSessionId(e.target.value)}
							placeholder="Paste session ID here"
							disabled={loading}
							style={{
								width: "320px",
								padding: "0.5rem 0.75rem",
								border: "1px solid #d1d5db",
								borderRadius: "6px",
								fontSize: "0.875rem",
								outline: "none",
							}}
						/>
					</div>

					<button
						onClick={generate}
						disabled={loading || !sessionId.trim()}
						style={{
							padding: "0.5rem 1.25rem",
							background: loading || !sessionId.trim() ? "#9ca3af" : "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: "6px",
							fontSize: "0.875rem",
							fontWeight: 600,
							cursor: loading || !sessionId.trim() ? "not-allowed" : "pointer",
						}}
					>
						{loading ? "Processing…" : "Generate"}
					</button>
				</div>
			)}

			{error && (
				<div
					style={{
						background: "#fef2f2",
						border: "1px solid #fca5a5",
						borderRadius: "6px",
						padding: "0.75rem 1rem",
						color: "#dc2626",
						fontSize: "0.875rem",
						marginBottom: "1rem",
					}}
				>
					{error}
				</div>
			)}

			{items && (
				<div>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
						<h3 style={{ margin: 0 }}>Measurables Graph</h3>
						<button
							onClick={reset}
							style={{
								padding: "0.3rem 0.75rem",
								border: "1px solid #d1d5db",
								borderRadius: "6px",
								fontSize: "0.8rem",
								cursor: "pointer",
								background: "transparent",
							}}
						>
							← New session
						</button>
					</div>

					<ShortCircuitGraph items={items} />
				</div>
			)}
		</div>
	);
}
