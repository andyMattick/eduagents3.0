export interface CanonicalDocument {
	id: string;
	sourceFileName: string;
	sourceMimeType: string;
	surfaces: Surface[];
	nodes: DocumentNode[];
	createdAt: string;
}

export interface Surface {
	id: string;
	surfaceType: "page" | "slide" | "other";
	index: number;
	label?: string;
}

export type DocumentNodeType =
	| "section"
	| "paragraph"
	| "listItem"
	| "table"
	| "tableRow"
	| "tableCell"
	| "figure"
	| "caption"
	| "heading"
	| "inline";

export interface DocumentNode {
	id: string;
	documentId: string;
	surfaceId: string;
	nodeType: DocumentNodeType;
	parentId?: string;
	orderIndex: number;
	text?: string;
	normalizedText?: string;
	geometry?: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	metadata?: {
		headingLevel?: number;
		listDepth?: number;
		tableRowIndex?: number;
		tableColumnIndex?: number;
		noteSource?: string;
		styleHint?: string;
		[key: string]: unknown;
	};
}

export interface DocumentAnchor {
	documentId: string;
	surfaceId: string;
	nodeId: string;
	startOffset?: number;
	endOffset?: number;
}
