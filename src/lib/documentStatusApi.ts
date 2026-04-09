import { fetchJson } from "./instructionalSessionApi";

export type DocumentStatus = {
	documentId: string;
	docType: "problem" | "notes" | "mixed" | null;
	items: number;
	sections: number;
	analysis: boolean;
};

export function getDocumentStatus(documentId: string) {
	return fetchJson<DocumentStatus>(`/api/v4/documents/status?documentId=${encodeURIComponent(documentId)}`);
}
