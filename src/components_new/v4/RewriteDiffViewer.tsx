/**
 * RewriteDiffViewer.tsx
 *
 * Pure UI component for displaying side-by-side comparison of original vs. rewritten content.
 * Shows a modal with:
 * - Two-column layout (original | rewritten)
 * - Applied suggestions list
 * - Profile indicator
 * - Metadata (glossary, etc.)
 * - Action buttons: Replace, Copy, Discard, Export PDF (Before/After)
 *
 * This component does NOT:
 * - Modify state
 * - Call APIs
 * - Alter pipeline logic
 */

export interface RewriteDiffViewerProps {
	original: string;
	rewritten: string;
	appliedSuggestions: string[];
	profileApplied: string | null;
	metadata?: Record<string, unknown>;
	onReplace: () => void;
	onCopy: () => void;
	onDiscard: () => void;
	onExportBefore: () => void;
	onExportAfter: () => void;
}

export function RewriteDiffViewer({
	original,
	rewritten,
	appliedSuggestions,
	profileApplied,
	metadata,
	onReplace,
	onCopy,
	onDiscard,
	onExportBefore,
	onExportAfter,
}: RewriteDiffViewerProps) {
	const glossary = (metadata?.glossary as Record<string, string>) || null;

	return (
		<div style={styles.modal}>
			{/* Modal backdrop */}
			<div style={styles.backdrop} onClick={onDiscard} />

			{/* Modal content */}
			<div style={styles.container}>
				{/* Header */}
				<div style={styles.header}>
					<h3 style={styles.title}>Rewrite Preview</h3>
					{profileApplied && <span style={styles.profilePill}>{profileApplied}</span>}
					<button style={styles.closeButton} onClick={onDiscard} type="button" title="Close">
						✕
					</button>
				</div>

				{/* Two-column layout */}
				<div style={styles.columns}>
					{/* Original column */}
					<div style={styles.column}>
						<h4 style={styles.columnTitle}>Original</h4>
						<pre style={styles.content}>{original}</pre>
						<button style={styles.exportButton} onClick={onExportBefore} type="button">
							Export PDF (Before)
						</button>
					</div>

					{/* Rewritten column */}
					<div style={styles.column}>
						<h4 style={styles.columnTitle}>Rewritten</h4>
						{rewritten ? (
							<>
								<pre style={styles.content}>{rewritten}</pre>
								<button style={styles.exportButton} onClick={onExportAfter} type="button">
									Export PDF (After)
								</button>
							</>
						) : (
							<p style={styles.noRewrite}>No rewrite suggested.</p>
						)}
					</div>
				</div>

				{/* Applied suggestions section */}
				{appliedSuggestions && appliedSuggestions.length > 0 && (
					<div style={styles.suggestionsSection}>
						<h4 style={styles.sectionTitle}>Applied Suggestions</h4>
						<ul style={styles.suggestionsList}>
							{appliedSuggestions.map((suggestion, idx) => (
								<li key={idx} style={styles.suggestionItem}>
									{suggestion}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Glossary section */}
				{glossary && Object.keys(glossary).length > 0 && (
					<div style={styles.metadataSection}>
						<h4 style={styles.sectionTitle}>Glossary</h4>
						<ul style={styles.glossaryList}>
							{Object.entries(glossary).map(([term, definition]) => (
								<li key={term} style={styles.glossaryItem}>
									<strong>{term}:</strong> {definition}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Action buttons */}
				<div style={styles.actions}>
					{rewritten && (
						<>
							<button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={onReplace} type="button">
								Replace
							</button>
							<button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={onCopy} type="button">
								Copy
							</button>
						</>
					)}
					<button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={onDiscard} type="button">
						Discard
					</button>
				</div>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────────

const styles = {
	modal: {
		position: "fixed" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 9999,
	},

	backdrop: {
		position: "absolute" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		background: "rgba(0, 0, 0, 0.5)",
		cursor: "pointer",
	},

	container: {
		position: "relative" as const,
		display: "flex",
		flexDirection: "column" as const,
		gap: "1.25rem",
		background: "rgba(255, 251, 245, 0.98)",
		border: "1px solid rgba(86, 57, 32, 0.2)",
		borderRadius: "16px",
		boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
		padding: "1.5rem",
		maxWidth: "1000px",
		maxHeight: "90vh",
		overflowY: "auto" as const,
		width: "calc(100% - 32px)",
	},

	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		paddingBottom: "0.75rem",
		borderBottom: "1px solid rgba(86, 57, 32, 0.12)",
	},

	title: {
		margin: 0,
		fontSize: "1.25rem",
		fontWeight: 700,
		color: "#1f1a17",
		fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
	},

	profilePill: {
		marginLeft: "auto",
		padding: "0.35rem 0.75rem",
		background: "rgba(187, 91, 53, 0.1)",
		border: "1px solid rgba(187, 91, 53, 0.3)",
		borderRadius: "20px",
		fontSize: "0.75rem",
		fontWeight: 600,
		color: "#9c4d2b",
		textTransform: "uppercase" as const,
		letterSpacing: "0.08em",
	},

	closeButton: {
		all: "unset",
		cursor: "pointer",
		fontSize: "1.5rem",
		color: "#9c4d2b",
		width: "32px",
		height: "32px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transition: "color 0.2s",
	},

	columns: {
		display: "grid" as const,
		gridTemplateColumns: "1fr 1fr",
		gap: "1.5rem",
		minHeight: "300px",
	},

	column: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "0.75rem",
	},

	columnTitle: {
		margin: "0 0 0.5rem",
		fontSize: "0.95rem",
		fontWeight: 700,
		color: "#563920",
		fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
		textTransform: "uppercase" as const,
		letterSpacing: "0.08em",
	},

	content: {
		flex: 1,
		margin: 0,
		padding: "0.75rem",
		background: "rgba(30, 20, 10, 0.04)",
		border: "1px solid rgba(86, 57, 32, 0.12)",
		borderRadius: "10px",
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		fontSize: "0.8rem",
		lineHeight: 1.6,
		whiteSpace: "pre-wrap" as const,
		wordBreak: "break-word" as const,
		color: "#1f1a17",
		overflowY: "auto" as const,
	},

	noRewrite: {
		margin: "1rem 0 0",
		padding: "1rem",
		background: "rgba(251, 191, 36, 0.08)",
		border: "1px solid rgba(251, 191, 36, 0.2)",
		borderRadius: "10px",
		fontSize: "0.875rem",
		color: "#9c4d2b",
		textAlign: "center" as const,
	},

	exportButton: {
		padding: "0.5rem 1rem",
		background: "rgba(187, 91, 53, 0.08)",
		border: "1px solid rgba(187, 91, 53, 0.24)",
		borderRadius: "8px",
		fontSize: "0.8rem",
		fontWeight: 600,
		color: "#bb5b35",
		cursor: "pointer",
		transition: "all 0.2s",
	},

	suggestionsSection: {
		padding: "1rem",
		background: "rgba(187, 91, 53, 0.05)",
		border: "1px solid rgba(187, 91, 53, 0.18)",
		borderRadius: "12px",
	},

	metadataSection: {
		padding: "1rem",
		background: "rgba(255, 251, 245, 0.5)",
		border: "1px solid rgba(86, 57, 32, 0.12)",
		borderRadius: "12px",
	},

	sectionTitle: {
		margin: "0 0 0.75rem",
		fontSize: "0.85rem",
		fontWeight: 700,
		color: "#563920",
		fontFamily: "Avenir Next Condensed, Franklin Gothic Medium, sans-serif",
		textTransform: "uppercase" as const,
		letterSpacing: "0.08em",
	},

	suggestionsList: {
		margin: 0,
		paddingLeft: "1.25rem",
		display: "flex",
		flexDirection: "column" as const,
		gap: "0.4rem",
	},

	suggestionItem: {
		fontSize: "0.8rem",
		color: "#433228",
		lineHeight: 1.5,
	},

	glossaryList: {
		margin: 0,
		paddingLeft: "1.25rem",
		display: "flex",
		flexDirection: "column" as const,
		gap: "0.4rem",
	},

	glossaryItem: {
		fontSize: "0.8rem",
		color: "#433228",
		lineHeight: 1.5,
	},

	actions: {
		display: "flex",
		gap: "0.75rem",
		justifyContent: "flex-end",
		paddingTop: "0.75rem",
		borderTop: "1px solid rgba(86, 57, 32, 0.12)",
	},

	button: {
		padding: "0.6rem 1.25rem",
		fontFamily: "inherit",
		fontSize: "0.8rem",
		fontWeight: 600,
		borderRadius: "8px",
		cursor: "pointer",
		border: "none",
		transition: "all 0.2s",
		textTransform: "uppercase" as const,
		letterSpacing: "0.08em",
	},

	buttonPrimary: {
		background: "#bb5b35",
		color: "#fff",
	},

	buttonSecondary: {
		background: "rgba(187, 91, 53, 0.1)",
		color: "#bb5b35",
		border: "1px solid rgba(187, 91, 53, 0.24)",
	},
};
