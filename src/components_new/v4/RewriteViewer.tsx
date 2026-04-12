import { useMemo, useState } from "react";

import type { RewriteResponse } from "../../types/rewrite";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

type RewrittenSection = {
	sectionId: string;
	rewrittenText: string;
	original?: string;
};

type LegacyItem = {
	itemNumber: number;
	rewrittenStem: string;
	original?: string;
};

type LegacyRewrittenItem = {
	originalItemNumber: number;
	rewrittenStem: string;
	original?: string;
};

type ViewerRewrite = RewriteResponse & {
	docType?: "problem" | "notes" | "mixed";
	sections?: RewrittenSection[];
	items?: LegacyItem[];
	rewrittenItems?: LegacyRewrittenItem[];
	testLevel?: string[];
};

type Props = {
	rewrite: ViewerRewrite;
	documentId?: string | null;
};

function detectDocType(rewrite: ViewerRewrite): "problem" | "notes" | "mixed" {
	if (rewrite.docType) return rewrite.docType;
	const hasSections = (rewrite.sections?.length ?? 0) > 0;
	const hasItems = (rewrite.items?.length ?? 0) > 0 || (rewrite.rewrittenItems?.length ?? 0) > 0;
	if (hasSections && hasItems) return "mixed";
	if (hasSections) return "notes";
	return "problem";
}

export function RewriteViewer({ rewrite, documentId = null }: Props) {
	const docType = detectDocType(rewrite);
	const [localSections, setLocalSections] = useState<RewrittenSection[]>(rewrite.sections ?? []);

	const normalizedItems = useMemo(() => {
		if (rewrite.items && rewrite.items.length > 0) return rewrite.items;
		if (rewrite.rewrittenItems && rewrite.rewrittenItems.length > 0) {
			return rewrite.rewrittenItems.map((item) => ({
			itemNumber: item.originalItemNumber,
			rewrittenStem: item.rewrittenStem,
			}));
		}
		return []; // <-- THIS prevents the crash
		}, [rewrite.items, rewrite.rewrittenItems]);


	function updateSection(sectionId: string, rewrittenText: string) {
		setLocalSections((current) => current.map((section) => (
			section.sectionId === sectionId ? { ...section, rewrittenText } : section
		)));
	}

	return (
		<div style={{ marginTop: "1.25rem", fontSize: "0.95rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>
				Rewrite Preview ({docType})
			</p>
			{documentId ? <DocumentStatusBadge documentId={documentId} /> : null}

			{(docType === "notes" || docType === "mixed") && localSections.length > 0 ? (
				<div style={{ marginBottom: "1rem" }}>
					<h4 style={{ margin: "0 0 0.5rem" }}>Sections</h4>
					{localSections.map((section) => (
						<div
							key={section.sectionId}
							style={{
								background: "rgba(255,251,245,0.9)",
								border: "1px solid rgba(86,57,32,0.14)",
								borderRadius: "14px",
								padding: "1rem 1.25rem",
								marginBottom: "0.75rem",
							}}
						>
							<p style={{ margin: "0 0 0.45rem", fontWeight: 700, fontSize: "0.82rem", color: "#563920" }}>
								Section {section.sectionId}
							</p>
							<textarea
								value={section.rewrittenText}
								onChange={(event) => updateSection(section.sectionId, event.target.value)}
								rows={4}
								style={{
									width: "100%",
									padding: "0.6rem",
									borderRadius: "10px",
									border: "1px solid rgba(86,57,32,0.2)",
									background: "rgba(255,251,245,0.7)",
									fontFamily: "inherit",
									fontSize: "0.88rem",
									lineHeight: 1.5,
								}}
							/>
						</div>
					))}
				</div>
			) : null}

			{(docType === "problem" || docType === "mixed") && normalizedItems.length > 0 ? (
				<div style={{ marginBottom: "1rem" }}>
					<h4 style={{ margin: "0 0 0.5rem" }}>Items</h4>
					{normalizedItems.map((item) => (
						<div
							key={item.itemNumber}
							style={{
								background: "rgba(255,251,245,0.9)",
								border: "1px solid rgba(86,57,32,0.14)",
								borderRadius: "14px",
								padding: "1rem 1.25rem",
								marginBottom: "0.75rem",
							}}
						>
							<p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "0.82rem", color: "#563920" }}>
								Item {item.itemNumber}
							</p>
							<p style={{ margin: 0, lineHeight: 1.65 }}>{item.rewrittenStem}</p>
						</div>
					))}
				</div>
			) : null}

			{normalizedItems.length === 0 && localSections.length === 0 && typeof rewrite.rewritten === "string" ? (
				<div
					style={{
						background: "rgba(255,251,245,0.9)",
						border: "1px solid rgba(86,57,32,0.14)",
						borderRadius: "14px",
						padding: "1rem 1.25rem",
						marginBottom: "0.75rem",
					}}
				>
					<h4 style={{ margin: "0 0 0.5rem" }}>Rewritten Document</h4>
					<p style={{ margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{rewrite.rewritten}</p>
				</div>
			) : null}

			{rewrite.testLevel && rewrite.testLevel.length > 0 ? (
				<div>
					<h4 style={{ margin: "0 0 0.5rem" }}>Test-Level Suggestions</h4>
					<ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
						{rewrite.testLevel.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}
					</ul>
				</div>
			) : null}
		</div>
	);
}
