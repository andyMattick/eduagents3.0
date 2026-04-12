import { fetchJson } from "./instructionalSessionApi";

export type DocumentStatus = {
	documentId: string;
	docType: "assignment" | "assessment" | "mixed" | "notes" | null;
	analysisAvailable: boolean;
	rewriteEligible: boolean;
};

export function getDocumentStatus(documentId: string) {
	return fetchJson<DocumentStatus>(`/api/v4/documents/status?documentId=${encodeURIComponent(documentId)}`);
}
