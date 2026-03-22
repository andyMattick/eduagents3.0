export interface NormalizedAzurePage {
	pageNumber: number;
	text: string;
}

export interface NormalizedAzureParagraph {
	text: string;
	pageNumber: number;
	role?: string;
}

export interface NormalizedAzureTableCell {
	rowIndex: number;
	columnIndex: number;
	text: string;
}

export interface NormalizedAzureTable {
	rowCount: number;
	columnCount: number;
	pageNumber?: number;
	cells: NormalizedAzureTableCell[];
}

export interface NormalizedAzureLayout {
	content: string;
	pages: NormalizedAzurePage[];
	paragraphs: NormalizedAzureParagraph[];
	tables: NormalizedAzureTable[];
	readingOrder: string[];
}

interface AzureBoundingRegion {
	pageNumber?: number;
}

interface AzureLine {
	content?: string;
}

interface AzurePage {
	pageNumber?: number;
	lines?: AzureLine[];
}

interface AzureParagraph {
	content?: string;
	role?: string;
	boundingRegions?: AzureBoundingRegion[];
}

interface AzureTableCell {
	rowIndex?: number;
	columnIndex?: number;
	content?: string;
}

interface AzureTable {
	rowCount?: number;
	columnCount?: number;
	boundingRegions?: AzureBoundingRegion[];
	cells?: AzureTableCell[];
}

interface AzureLayoutResult {
	content?: string;
	pages?: AzurePage[];
	paragraphs?: AzureParagraph[];
	tables?: AzureTable[];
}

export function normalizeAzureLayout(rawAzure: unknown): NormalizedAzureLayout {
	const azure = (rawAzure ?? {}) as AzureLayoutResult;

	const pages = (azure.pages ?? []).map((page) => ({
		pageNumber: page.pageNumber ?? 1,
		text: (page.lines ?? [])
			.map((line) => line.content?.trim() ?? "")
			.filter(Boolean)
			.join("\n"),
	}));

	const paragraphs = (azure.paragraphs ?? []).map((paragraph) => ({
		text: paragraph.content?.trim() ?? "",
		pageNumber: paragraph.boundingRegions?.[0]?.pageNumber ?? 1,
		role: paragraph.role,
	})).filter((paragraph) => paragraph.text.length > 0);

	const tables = (azure.tables ?? []).map((table) => ({
		rowCount: table.rowCount ?? 0,
		columnCount: table.columnCount ?? 0,
		pageNumber: table.boundingRegions?.[0]?.pageNumber,
		cells: (table.cells ?? []).map((cell) => ({
			rowIndex: cell.rowIndex ?? 0,
			columnIndex: cell.columnIndex ?? 0,
			text: cell.content?.trim() ?? "",
		})),
	}));

	const readingOrder = paragraphs.map((paragraph) => paragraph.text);

	return {
		content: azure.content?.trim() ?? "",
		pages,
		paragraphs,
		tables,
		readingOrder,
	};
}
