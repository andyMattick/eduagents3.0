import type { DocumentSession } from "../prism-v4/schema/domain";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";
import type { BlueprintModel, InstructionalAnalysis } from "../prism-v4/session/InstructionalIntelligenceSession";
import type { BlueprintVersionArtifact, TeacherStudioOutputArtifact, TeacherStudioSessionEnvelope, TeacherStudioTarget } from "../prism-v4/studio/artifacts";
import { fetchJson } from "./instructionalSessionApi";

export type RegisteredDocumentSummary = {
	documentId: string;
	sourceFileName: string;
	sourceMimeType: string;
	createdAt: string;
};

type UploadDocumentResponse = {
	documentId: string;
	sessionId: string;
	registered: RegisteredDocumentSummary[];
};

type SessionDocumentsPayload = {
	session: DocumentSession;
	documents: RegisteredDocumentSummary[];
	analyzedDocuments: AnalyzedDocument[];
};

type StudioBlueprintCreateResponse = {
	blueprint: {
		blueprintId: string;
		sessionId: string;
		analysisSessionId: string;
		teacherId?: string;
		unitId?: string;
		activeVersion: number;
		status: "active" | "archived";
		createdAt: string;
		updatedAt: string;
	};
	version: BlueprintVersionArtifact;
};

export function loadStudioSessionApi(sessionId: string) {
	return fetchJson<TeacherStudioSessionEnvelope>(`/api/v4/studio/sessions/${encodeURIComponent(sessionId)}`);
}

export function updateStudioSessionApi(
	sessionId: string,
	patch: { activeBlueprintId?: string | null; activeTarget?: TeacherStudioTarget | null; outputIds?: string[] },
) {
	return fetchJson<TeacherStudioSessionEnvelope>(`/api/v4/studio/sessions/${encodeURIComponent(sessionId)}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	});
}

export function loadStudioAnalysisApi(sessionId: string) {
	return fetchJson<{ sessionId: string; analysis: InstructionalAnalysis }>(`/api/v4/studio/sessions/${encodeURIComponent(sessionId)}/analysis`);
}

export function createStudioBlueprintApi(args: {
	sessionId: string;
	teacherId?: string;
	unitId?: string;
	itemCount?: number;
	conceptRankings?: Array<{ id: string; included: boolean; rank: number }>;
}) {
	return fetchJson<StudioBlueprintCreateResponse>(`/api/v4/studio/sessions/${encodeURIComponent(args.sessionId)}/blueprints`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			teacherId: args.teacherId,
			unitId: args.unitId,
			options: args.itemCount ? { itemCount: args.itemCount } : undefined,
			conceptRankings: args.conceptRankings,
		}),
	});
}

export function loadStudioBlueprintApi(blueprintId: string) {
	return fetchJson<{ blueprint: unknown; version: BlueprintVersionArtifact | null }>(`/api/v4/studio/blueprints/${encodeURIComponent(blueprintId)}`);
}

export function saveStudioBlueprintVersionApi(args: {
	blueprintId: string;
	patch: Partial<BlueprintModel>;
}) {
	return fetchJson<BlueprintVersionArtifact>(`/api/v4/studio/blueprints/${encodeURIComponent(args.blueprintId)}/versions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ patch: args.patch }),
	});
}

export function setActiveStudioBlueprintApi(sessionId: string, blueprintId: string) {
	return fetchJson<TeacherStudioSessionEnvelope>(`/api/v4/studio/sessions/${encodeURIComponent(sessionId)}/active-blueprint`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ blueprintId }),
	});
}

export function listStudioOutputsApi(sessionId: string) {
	return fetchJson<{ sessionId: string; outputs: TeacherStudioOutputArtifact[] }>(`/api/v4/studio/sessions/${encodeURIComponent(sessionId)}/outputs`);
}

export function loadStudioOutputApi(outputId: string) {
	return fetchJson<TeacherStudioOutputArtifact>(`/api/v4/studio/outputs/${encodeURIComponent(outputId)}`);
}

export function requestAssessmentOutputApi(args: {
	blueprintId: string;
	version?: number;
	teacherId?: string;
	unitId?: string;
	studentId?: string;
	itemCount?: number;
	adaptiveConditioning?: boolean;
}) {
	return fetchJson<{ output: TeacherStudioOutputArtifact }>(`/api/v4/studio/blueprints/${encodeURIComponent(args.blueprintId)}/outputs/assessment`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			version: args.version,
			teacherId: args.teacherId,
			unitId: args.unitId,
			studentId: args.studentId,
			options: {
				itemCount: args.itemCount,
				adaptiveConditioning: args.adaptiveConditioning,
			},
		}),
	});
}

export async function createStudioSessionFromFilesApi(selectedFiles: File[]) {
	const registered: RegisteredDocumentSummary[] = [];
	const nextFileMap: Record<string, File> = {};
	let sessionId: string | null = null;

	for (const file of selectedFiles) {
		const buffer = await file.arrayBuffer();
		const uploadPayload = await fetchJson<UploadDocumentResponse>("/api/v4/documents/upload", {
			method: "POST",
			headers: {
				"Content-Type": file.type || "application/octet-stream",
				"x-file-name": file.name,
				...(sessionId ? { "x-session-id": sessionId } : {}),
			},
			body: buffer,
		});
		const uploaded = uploadPayload.registered[0];
		if (!uploaded) {
			throw new Error(`Upload completed without a registered document for ${file.name}.`);
		}
		registered.push(uploaded);
		nextFileMap[uploaded.documentId] = file;
		sessionId = sessionId ?? uploadPayload.sessionId;
	}

	if (!sessionId) {
		throw new Error("Workspace creation did not return a sessionId.");
	}

	return { sessionId, registered, nextFileMap };
}

export function bindDocumentsToSessionApi(args: {
	sessionId: string;
	documentIds: string[];
	documentRoles: Record<string, string[]>;
	sessionRoles: Record<string, string[]>;
}) {
	return fetchJson<{ ok?: boolean }>("/api/v4/documents/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(args),
	});
}

export function loadSessionDocumentsApi(sessionId: string) {
	return fetchJson<SessionDocumentsPayload>(`/api/v4/documents/session?sessionId=${encodeURIComponent(sessionId)}`);
}

export type ItemRewriteIntent =
	| "easier"
	| "harder"
	| "change_numbers"
	| "real_world"
	| "concise"
	| "student_friendly"
	| "academic";

export function rewriteStudioItemApi(outputId: string, itemId: string, intent: ItemRewriteIntent) {
	return fetchJson<{ item: Record<string, unknown>; output: TeacherStudioOutputArtifact }>(
		`/api/v4/studio/outputs/${encodeURIComponent(outputId)}/items/${encodeURIComponent(itemId)}/rewrite`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ intent }),
		},
	);
}

export function replaceStudioItemApi(outputId: string, itemId: string) {
	return fetchJson<{ item: Record<string, unknown>; output: TeacherStudioOutputArtifact }>(
		`/api/v4/studio/outputs/${encodeURIComponent(outputId)}/items/${encodeURIComponent(itemId)}/replace`,
		{ method: "POST" },
	);
}

export function changeFormatStudioItemApi(outputId: string, itemId: string, format: string) {
	return fetchJson<{ item: Record<string, unknown>; output: TeacherStudioOutputArtifact }>(
		`/api/v4/studio/outputs/${encodeURIComponent(outputId)}/items/${encodeURIComponent(itemId)}/change-format`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ format }),
		},
	);
}