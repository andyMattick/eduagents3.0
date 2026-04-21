/**
 * src/components_new/v4/SegmentationVisualizer.tsx
 *
 * Debug panel — shows Azure full text alongside Gemini segment boundaries.
 * Lets you spot segmentation drift instantly:
 *   - Missing item break  → items merged
 *   - Extra item break    → items split
 *   - Text mutation       → Gemini rewrote content (should never happen)
 *
 * Usage:
 *   <SegmentationVisualizer fullText={...} segmented={[{ itemNumber, text }]} />
 */

interface SegmentedItem {
	itemNumber: number;
	text: string;
}

interface Props {
	fullText: string;
	segmented: SegmentedItem[];
}

const SEGMENT_COLORS = [
	"#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3",
	"#ede9fe", "#ffedd5", "#f0fdf4", "#f1f5f9",
];

export function SegmentationVisualizer({ fullText, segmented }: Props) {
	const totalChars  = fullText.length;
	const coveredChars = segmented.reduce((acc, s) => acc + s.text.length, 0);
	const coveragePct  = totalChars > 0 ? Math.round((coveredChars / totalChars) * 100) : 0;

	return (
		<div style={{ marginTop: "2rem" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
				<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
					Segmentation Visualizer
				</h3>
				<span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
					{segmented.length} item{segmented.length !== 1 ? "s" : ""} · {coveragePct}% coverage
				</span>
			</div>

			{/* Two-column layout */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
				{/* Left: Azure full text */}
				<div>
					<div style={{
						fontSize: "0.75rem",
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						color: "#374151",
						marginBottom: "0.5rem",
					}}>
						Azure extract ({totalChars.toLocaleString()} chars)
					</div>
					<pre style={{
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
						background: "#f8fafc",
						border: "1px solid #e2e8f0",
						borderRadius: "6px",
						padding: "0.875rem",
						fontSize: "0.75rem",
						lineHeight: 1.6,
						maxHeight: "600px",
						overflowY: "auto",
						margin: 0,
					}}>
						{fullText}
					</pre>
				</div>

				{/* Right: Gemini segments */}
				<div>
					<div style={{
						fontSize: "0.75rem",
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						color: "#374151",
						marginBottom: "0.5rem",
					}}>
						Gemini segments
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "600px", overflowY: "auto" }}>
						{segmented.map((seg, i) => (
							<div
								key={seg.itemNumber}
								style={{
									background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
									border: "1px solid #e2e8f0",
									borderRadius: "6px",
									padding: "0.625rem 0.875rem",
								}}
							>
								<div style={{
									fontSize: "0.7rem",
									fontWeight: 700,
									color: "#1e40af",
									marginBottom: "0.375rem",
									display: "flex",
									justifyContent: "space-between",
								}}>
									<span>Item {seg.itemNumber}</span>
									<span style={{ color: "#6b7280", fontWeight: 400 }}>
										{seg.text.trim().split(/\s+/).length} words
									</span>
								</div>
								<pre style={{
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									fontSize: "0.75rem",
									lineHeight: 1.5,
									margin: 0,
									background: "transparent",
								}}>
									{seg.text}
								</pre>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Coverage warning */}
			{coveragePct < 80 && (
				<div style={{
					marginTop: "0.75rem",
					background: "#fef3c7",
					border: "1px solid #f59e0b",
					borderRadius: "6px",
					padding: "0.5rem 0.875rem",
					fontSize: "0.8rem",
					color: "#92400e",
				}}>
					⚠ Segment coverage {coveragePct}% — some text may be missing from segmentation output.
					Check the cave-man prompt or increase the text length limit.
				</div>
			)}
		</div>
	);
}
