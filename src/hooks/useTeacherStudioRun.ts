import { useState } from "react";

import type { DocumentRole, SessionRole } from "../prism-v4/schema/domain";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";
import type { InstructionalAnalysis } from "../prism-v4/session/InstructionalIntelligenceSession";
import type { BlueprintVersionArtifact, TeacherStudioOutputArtifact, TeacherStudioSessionEnvelope } from "../prism-v4/studio/artifacts";
import {
	bindDocumentsToSessionApi,
	createStudioBlueprintApi,
	createStudioSessionFromFilesApi,
	listStudioOutputsApi,
	loadSessionDocumentsApi,
	loadStudioAnalysisApi,
	loadStudioOutputApi,
	loadStudioSessionApi,
	requestAssessmentOutputApi,
	rewriteStudioItemApi,
	replaceStudioItemApi,
	saveStudioBlueprintVersionApi,
	setActiveStudioBlueprintApi,
	type ItemRewriteIntent,
	type RegisteredDocumentSummary,
} from "../lib/teacherStudioApi";

function guessDocumentRole(file: File): DocumentRole {
	const lowerName = file.name.toLowerCase();
	if (lowerName.includes("slide") || file.type.includes("presentation")) {
		return "slides";
	}
	if (lowerName.includes("note") || file.type.includes("wordprocessingml")) {
		return "notes";
	}
	if (lowerName.includes("review")) {
		return "review";
	}
	if (lowerName.includes("quiz") || lowerName.includes("test") || lowerName.includes("assessment")) {
		return "test";
	}
	if (lowerName.includes("worksheet") || lowerName.includes("practice")) {
		return "worksheet";
	}
	if (lowerName.includes("article") || lowerName.includes("reading")) {
		return "article";
	}
	return "unknown";
}

function guessSessionRole(role: DocumentRole): SessionRole {
	if (role === "test") {
		return "target-assessment";
	}
	if (role === "review") {
		return "target-review";
	}
	return "unit-member";
}

type TeacherStudioState = {
	session: TeacherStudioSessionEnvelope | null;
	analysis: InstructionalAnalysis | null;
	activeBlueprint: BlueprintVersionArtifact | null;
	outputs: TeacherStudioOutputArtifact[];
	documents: RegisteredDocumentSummary[];
	analyzedDocuments: AnalyzedDocument[];
	isLoading: boolean;
	error: string | null;
};

export function useTeacherStudioRun() {
	const [state, setState] = useState<TeacherStudioState>({
		session: null,
		analysis: null,
		activeBlueprint: null,
		outputs: [],
		documents: [],
		analyzedDocuments: [],
		isLoading: false,
		error: null,
	});

	function setError(error: string | null) {
		setState((current) => ({ ...current, error }));
	}

	async function loadStudioSession(sessionId: string) {
		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const [session, analysisPayload, outputsPayload, documentsPayload] = await Promise.all([
				loadStudioSessionApi(sessionId),
				loadStudioAnalysisApi(sessionId),
				listStudioOutputsApi(sessionId),
				loadSessionDocumentsApi(sessionId),
			]);
			setState((current) => ({
				...current,
				session,
				analysis: analysisPayload.analysis,
				outputs: outputsPayload.outputs,
				documents: documentsPayload.documents,
				analyzedDocuments: documentsPayload.analyzedDocuments,
				isLoading: false,
			}));
			return session;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Failed to load Teacher Studio session.",
			}));
			return null;
		}
	}

	async function createSessionFromFiles(selectedFiles: File[]) {
		if (selectedFiles.length === 0) {
			setError("Choose one or more PDF, DOCX, or PPTX files before building Teacher Studio.");
			return null;
		}

		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const { sessionId, registered, nextFileMap } = await createStudioSessionFromFilesApi(selectedFiles);
			const documentRoles = Object.fromEntries(registered.map((entry) => {
				const file = nextFileMap[entry.documentId];
				const role = file ? guessDocumentRole(file) : "unknown";
				return [entry.documentId, [role]];
			}));
			const sessionRoles = Object.fromEntries(registered.map((entry) => {
				const role = (documentRoles[entry.documentId]?.[0] ?? "unknown") as DocumentRole;
				return [entry.documentId, [guessSessionRole(role)]];
			}));

			await bindDocumentsToSessionApi({
				sessionId,
				documentIds: registered.map((entry) => entry.documentId),
				documentRoles,
				sessionRoles,
			});

			await loadStudioSession(sessionId);
			return sessionId;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Teacher Studio session creation failed.",
			}));
			return null;
		}
	}

	async function createBlueprint(args: { sessionId: string; teacherId?: string; unitId?: string; itemCount?: number }) {
		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const payload = await createStudioBlueprintApi(args);
			const session = await loadStudioSessionApi(args.sessionId);
			setState((current) => ({
				...current,
				session,
				activeBlueprint: payload.version,
				isLoading: false,
			}));
			return payload.version;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Blueprint creation failed.",
			}));
			return null;
		}
	}

	async function saveBlueprintVersion(blueprintId: string, patch: Parameters<typeof saveStudioBlueprintVersionApi>[0]["patch"]) {
		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const version = await saveStudioBlueprintVersionApi({ blueprintId, patch });
			setState((current) => ({ ...current, activeBlueprint: version, isLoading: false }));
			return version;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Blueprint save failed.",
			}));
			return null;
		}
	}

	async function setActiveBlueprint(sessionId: string, blueprintId: string) {
		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const session = await setActiveStudioBlueprintApi(sessionId, blueprintId);
			setState((current) => ({ ...current, session, isLoading: false }));
			return session;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Failed to set active blueprint.",
			}));
			return null;
		}
	}

	async function loadOutputs(sessionId: string) {
		try {
			const payload = await listStudioOutputsApi(sessionId);
			setState((current) => ({ ...current, outputs: payload.outputs }));
			return payload.outputs;
		} catch (error) {
			setError(error instanceof Error ? error.message : "Failed to load outputs.");
			return [];
		}
	}

	async function loadOutput(outputId: string) {
		try {
			return await loadStudioOutputApi(outputId);
		} catch (error) {
			setError(error instanceof Error ? error.message : "Failed to load output.");
			return null;
		}
	}

	async function requestAssessmentOutput(args: {
		blueprintId: string;
		version?: number;
		teacherId?: string;
		unitId?: string;
		studentId?: string;
		itemCount?: number;
		adaptiveConditioning?: boolean;
	}) {
		setState((current) => ({ ...current, isLoading: true, error: null }));
		try {
			const payload = await requestAssessmentOutputApi(args);
			setState((current) => ({
				...current,
				outputs: [payload.output, ...current.outputs.filter((output) => output.outputId !== payload.output.outputId)],
				isLoading: false,
			}));
			return payload.output;
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "Assessment output request failed.",
			}));
			return null;
		}
	}

	async function rewriteItem(outputId: string, itemId: string, intent: ItemRewriteIntent) {
		try {
			const payload = await rewriteStudioItemApi(outputId, itemId, intent);
			setState((current) => ({
				...current,
				outputs: current.outputs.map((output) =>
					output.outputId === payload.output.outputId ? payload.output : output,
				),
			}));
			return payload;
		} catch (error) {
			setError(error instanceof Error ? error.message : "Item rewrite failed.");
			return null;
		}
	}

	async function replaceItem(outputId: string, itemId: string) {
		try {
			const payload = await replaceStudioItemApi(outputId, itemId);
			setState((current) => ({
				...current,
				outputs: current.outputs.map((output) =>
					output.outputId === payload.output.outputId ? payload.output : output,
				),
			}));
			return payload;
		} catch (error) {
			setError(error instanceof Error ? error.message : "Item replace failed.");
			return null;
		}
	}

	function clearStudio() {
		setState({
			session: null,
			analysis: null,
			activeBlueprint: null,
			outputs: [],
			documents: [],
			analyzedDocuments: [],
			isLoading: false,
			error: null,
		});
	}

	return {
		...state,
		setError,
		loadStudioSession,
		createSessionFromFiles,
		createBlueprint,
		saveBlueprintVersion,
		setActiveBlueprint,
		loadOutputs,
		loadOutput,
		requestAssessmentOutput,
		rewriteItem,
		replaceItem,
		clearStudio,
	};
}