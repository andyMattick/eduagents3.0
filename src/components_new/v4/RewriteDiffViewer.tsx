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
					<div style={styles.headerRight}>
						{profileApplied && <span style={styles.profilePill}>{profileApplied}</span>}
						<button style={styles.closeButton} onClick={onDiscard} type="button" title="Close">
							✕
						</button>
					</div>
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
							<p style={styles.noRewrite}>No rewrite needed.</p>
						)}
					</div>
				</div>

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
					<button style={{ ...styles.button, ...styles.buttonTertiary }} onClick={onDiscard} type="button">
						Discard
					</button>
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
		background: "rgba(0, 0, 0, 0.4)",
		cursor: "pointer",
	},

	container: {
		position: "relative" as const,
		display: "flex",
		flexDirection: "column" as const,
		background: "#ffffff",
		borderRadius: "8px",
		boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
		padding: "24px",
		width: "min(960px, 90vw)",
		maxHeight: "80vh",
		overflowY: "auto" as const,
	},

	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "12px",
		paddingBottom: "16px",
		marginBottom: "16px",
		borderBottom: "1px solid #E5E7EB",
	},

	title: {
		margin: 0,
		fontSize: "18px",
		fontWeight: 600,
		color: "#111827",
	},

	headerRight: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
	},

	profilePill: {
		borderRadius: "999px",
		padding: "4px 10px",
		fontSize: "12px",
		fontWeight: 600,
		background: "#E6F0FF",
		color: "#1F4FD8",
	},

	closeButton: {
		all: "unset",
		cursor: "pointer",
		fontSize: "18px",
		color: "#6B7280",
		width: "32px",
		height: "32px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "6px",
		lineHeight: 1,
	},

	columns: {
		display: "grid" as const,
		gridTemplateColumns: "1fr 1fr",
		gap: "16px",
		marginTop: "16px",
		marginBottom: "16px",
	},

	column: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "8px",
	},

	columnTitle: {
		margin: 0,
		fontSize: "14px",
		fontWeight: 600,
		color: "#111827",
	},

	content: {
		margin: 0,
		padding: "12px",
		background: "#F9FAFB",
		border: "1px solid #E5E7EB",
		borderRadius: "6px",
		fontSize: "14px",
		lineHeight: 1.5,
		whiteSpace: "pre-wrap" as const,
		wordBreak: "break-word" as const,
		color: "#111827",
		maxHeight: "40vh",
		overflowY: "auto" as const,
	},

	noRewrite: {
		margin: 0,
		padding: "12px",
		background: "#F9FAFB",
		border: "1px solid #E5E7EB",
		borderRadius: "6px",
		fontSize: "14px",
		lineHeight: 1.5,
		color: "#6B7280",
	},

	exportButton: {
		padding: "6px 12px",
		background: "#ffffff",
		border: "1px solid #D1D5DB",
		borderRadius: "6px",
		fontSize: "12px",
		fontWeight: 600,
		color: "#374151",
		cursor: "pointer",
		marginTop: "8px",
		alignSelf: "flex-start" as const,
	},

	suggestionsSection: {
		marginTop: "16px",
	},

	metadataSection: {
		marginTop: "16px",
	},

	sectionTitle: {
		margin: "0 0 4px",
		fontSize: "14px",
		fontWeight: 600,
		color: "#111827",
	},

	suggestionsList: {
		margin: 0,
		paddingLeft: "20px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "4px",
	},

	suggestionItem: {
		fontSize: "14px",
		lineHeight: 1.4,
		color: "#374151",
	},

	glossaryList: {
		margin: 0,
		paddingLeft: "20px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "4px",
	},

	glossaryItem: {
		fontSize: "14px",
		lineHeight: 1.4,
		color: "#374151",
	},

	actions: {
		display: "flex",
		gap: "8px",
		justifyContent: "flex-end",
		paddingTop: "12px",
		marginTop: "16px",
		borderTop: "1px solid #E5E7EB",
	},

	button: {
		padding: "8px 16px",
		fontFamily: "inherit",
		fontSize: "14px",
		fontWeight: 500,
		borderRadius: "6px",
		cursor: "pointer",
		border: "1px solid transparent",
	},

	buttonPrimary: {
		background: "#2563EB",
		borderColor: "#2563EB",
		color: "#fff",
	},

	buttonSecondary: {
		background: "#ffffff",
		borderColor: "#D1D5DB",
		color: "#374151",
	},

	buttonTertiary: {
		background: "transparent",
		borderColor: "transparent",
		color: "#6B7280",
	},
};
