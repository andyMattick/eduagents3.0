import { useRef, useState } from "react";

import type { DocumentRole, DocumentSession, SessionRole } from "../prism-v4/schema/domain";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";
import type { IntentProduct } from "../prism-v4/schema/integration";
import type { StudentPerformanceProfile } from "../prism-v4/studentPerformance";
import type { AssessmentPreviewModel, BlueprintModel, BuilderPlanModel, ClassProfileModel, ConceptMapModel, DifferentiatedBuildModel, InstructionalIntelligenceSession, InstructionalSessionEnvelope, InstructionalSessionWorkspace, TeacherFingerprintModel } from "../types/v4/InstructionalSession";
import type { StudentExposureEntry, StudentResponseTimeEntry } from "../types/v4/InstructionalSession";

type BlueprintResponse = {
	sessionId: string;
	assessmentId: string;
	teacherId: string;
	blueprint: BlueprintModel;
	conceptMap: ConceptMapModel;
};

type StudentProfileResponse = {
	studentId: string;
	unitId?: string;
	profile: StudentPerformanceProfile;
	misconceptions: string[];
	exposureTimeline: StudentExposureEntry[];
	responseTimes: StudentResponseTimeEntry[];
};

type BuilderPlanResponse = {
	sessionId: string;
	builderPlan: BuilderPlanModel;
};

type AssessmentPreviewResponse = {
	sessionId: string;
	assessmentPreview: AssessmentPreviewModel;
};

type ClassProfileResponse = {
	classProfile: ClassProfileModel;
};

type DifferentiatedBuildResponse = {
	differentiatedBuild: DifferentiatedBuildModel;
};

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

type SessionPayload = {
	session: DocumentSession;
	documents: RegisteredDocumentSummary[];
	analyzedDocuments: AnalyzedDocument[];
};

type ProductsPayload = {
	sessionId: string;
	products: IntentProduct[];
};

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

async function fetchJson<T>(input: string, init?: RequestInit) {
	const response = await fetch(input, init);
	const rawBody = await response.text();
	const trimmedBody = rawBody.trim();

	if (!trimmedBody) {
		throw new Error(`Empty response from ${input}`);
	}

	if (trimmedBody.startsWith("<!DOCTYPE") || trimmedBody.startsWith("<html") || trimmedBody.startsWith("<")) {
		throw new Error(`Non-JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmedBody);
	} catch {
		throw new Error(`Invalid JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
	}

	if (!response.ok) {
		const errorMessage = typeof payload === "object" && payload !== null && "error" in payload
			? String((payload as { error?: unknown }).error ?? `Request failed: ${input}`)
			: `Request failed: ${input}`;
		throw new Error(errorMessage);
	}

	return payload as T;
}

function createInstructionalSession(envelope: InstructionalSessionEnvelope): InstructionalIntelligenceSession {
	return {
		sessionId: envelope.sessionId,
		documentIds: envelope.documentIds,
		analysis: envelope.analysis,
	};
}

function mergeInstructionalSession(
	current: InstructionalIntelligenceSession | null,
	envelope: InstructionalSessionEnvelope,
): InstructionalIntelligenceSession {
	const nextBase = createInstructionalSession(envelope);
	if (!current || current.sessionId !== envelope.sessionId) {
		return nextBase;
	}

	return {
		...current,
		...nextBase,
		analysis: envelope.analysis,
	};
}

export function useInstructionalSession() {
	const [workspace, setWorkspace] = useState<InstructionalSessionWorkspace | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const workspaceRef = useRef<InstructionalSessionWorkspace | null>(null);

	function replaceWorkspace(nextWorkspace: InstructionalSessionWorkspace | null) {
		workspaceRef.current = nextWorkspace;
		setWorkspace(nextWorkspace);
	}

	function updateInstructionalSession(
		updater: (current: InstructionalIntelligenceSession) => InstructionalIntelligenceSession,
	) {
		const currentWorkspace = workspaceRef.current;
		if (!currentWorkspace?.instructionalSession) {
			return;
		}

		replaceWorkspace({
			...currentWorkspace,
			instructionalSession: updater(currentWorkspace.instructionalSession),
		});
	}

	async function refreshWorkspace(sessionId: string) {
		const [sessionPayload, analysisPayload, productsPayload] = await Promise.all([
			fetchJson<SessionPayload>(`/api/v4/documents/session?sessionId=${encodeURIComponent(sessionId)}`),
			fetchJson<InstructionalSessionEnvelope>(`/api/v4/documents/session-analysis?sessionId=${encodeURIComponent(sessionId)}`),
			fetchJson<ProductsPayload>(`/api/v4/documents/intent?sessionId=${encodeURIComponent(sessionId)}`),
		]);

		const nextWorkspace: InstructionalSessionWorkspace = {
			sessionId,
			documents: sessionPayload.documents,
			analyzedDocuments: sessionPayload.analyzedDocuments,
			rawAnalysis: analysisPayload.rawAnalysis ?? null,
			instructionalSession: mergeInstructionalSession(workspaceRef.current?.instructionalSession ?? null, analysisPayload),
			products: productsPayload.products,
		};

		replaceWorkspace(nextWorkspace);
		return nextWorkspace;
	}

	async function createSessionFromFiles(selectedFiles: File[]) {
		if (selectedFiles.length === 0) {
			setError("Choose one or more PDF, DOCX, or PPTX files before building the workspace.");
			return null;
		}

		setIsUploading(true);
		setError(null);

		try {
			const registered: RegisteredDocumentSummary[] = [];
			const nextFileMap: Record<string, File> = {};
			let sessionId: string | null = null;

			for (const file of selectedFiles) {
				const buffer = await file.arrayBuffer();
				const uploadPayload: UploadDocumentResponse = await fetchJson<UploadDocumentResponse>("/api/v4/documents/upload", {
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

			const documentRoles = Object.fromEntries(registered.map((entry) => {
				const file = nextFileMap[entry.documentId];
				const role = file ? guessDocumentRole(file) : "unknown";
				return [entry.documentId, [role]];
			}));
			const sessionRoles = Object.fromEntries(registered.map((entry) => {
				const role = documentRoles[entry.documentId]?.[0] ?? "unknown";
				return [entry.documentId, [guessSessionRole(role)]];
			}));

			await fetchJson("/api/v4/documents/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId,
					documentIds: registered.map((entry) => entry.documentId),
					documentRoles,
					sessionRoles,
				}),
			});

			if (!sessionId) {
				throw new Error("Workspace creation did not return a sessionId.");
			}

			return await refreshWorkspace(sessionId);
		} catch (uploadError) {
			replaceWorkspace(null);
			setError(uploadError instanceof Error ? uploadError.message : "Workspace creation failed.");
			return null;
		} finally {
			setIsUploading(false);
		}
	}

	async function loadBlueprint(sessionId: string) {
		const payload = await fetchJson<BlueprintResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/blueprint`);
		updateInstructionalSession((current) => ({
			...current,
			blueprint: payload.blueprint,
			conceptMap: payload.conceptMap,
		}));
		return payload;
	}

	async function updateBlueprint(sessionId: string, patch: Partial<BlueprintModel>) {
		const payload = await fetchJson<BlueprintResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/blueprint`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		});
		updateInstructionalSession((current) => ({
			...current,
			blueprint: payload.blueprint,
			conceptMap: payload.conceptMap,
		}));
		return payload;
	}

	async function loadTeacherFingerprint(teacherId: string) {
		const payload = await fetchJson<{ teacherId: string; fingerprint: TeacherFingerprintModel }>(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`);
		updateInstructionalSession((current) => ({
			...current,
			teacherFingerprint: payload.fingerprint,
		}));
		return payload.fingerprint;
	}

	async function updateTeacherFingerprint(teacherId: string, patch: Partial<TeacherFingerprintModel>) {
		const payload = await fetchJson<{ teacherId: string; fingerprint: TeacherFingerprintModel }>(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		});
		updateInstructionalSession((current) => ({
			...current,
			teacherFingerprint: payload.fingerprint,
		}));
		return payload.fingerprint;
	}

	function setActiveStudent(studentId: string) {
		updateInstructionalSession((current) => ({
			...current,
			activeStudentId: studentId,
			...(current.studentProfile?.studentId === studentId
				? {}
				: {
					studentProfile: undefined,
					studentMisconceptions: undefined,
					studentExposureTimeline: undefined,
					studentResponseTimes: undefined,
				}),
		}));
	}

	async function loadStudentProfile(studentId: string, unitId?: string) {
		const query = unitId ? `?unitId=${encodeURIComponent(unitId)}` : "";
		const payload = await fetchJson<StudentProfileResponse>(`/api/v4/students/${encodeURIComponent(studentId)}/performance${query}`);
		updateInstructionalSession((current) => ({
			...current,
			activeStudentId: payload.studentId,
			studentProfile: payload.profile,
			studentMisconceptions: payload.misconceptions,
			studentExposureTimeline: payload.exposureTimeline,
			studentResponseTimes: payload.responseTimes,
		}));
		return payload;
	}

	async function loadBuilderPlan(sessionId: string, studentId?: string) {
		const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
		const payload = await fetchJson<BuilderPlanResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/builder-plan${query}`);
		updateInstructionalSession((current) => ({
			...current,
			builderPlan: payload.builderPlan,
		}));
		return payload;
	}

	async function loadAssessmentPreview(sessionId: string, studentId?: string) {
		const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
		const payload = await fetchJson<AssessmentPreviewResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/assessment-preview${query}`);
		updateInstructionalSession((current) => ({
			...current,
			assessmentPreview: payload.assessmentPreview,
		}));
		return payload;
	}

	async function loadClassProfile(classId: string) {
		const payload = await fetchJson<ClassProfileResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/performance`);
		updateInstructionalSession((current) => ({
			...current,
			classProfile: payload.classProfile,
		}));
		return payload.classProfile;
	}

	async function loadDifferentiatedBuild(classId: string) {
		const payload = await fetchJson<DifferentiatedBuildResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/differentiated-build`);
		updateInstructionalSession((current) => ({
			...current,
			differentiatedBuild: payload.differentiatedBuild,
		}));
		return payload.differentiatedBuild;
	}

	function clearSession() {
		replaceWorkspace(null);
		setError(null);
		setIsUploading(false);
	}

	return {
		workspace,
		instructionalSession: workspace?.instructionalSession ?? null,
		isUploading,
		error,
		setError,
		createSessionFromFiles,
		refreshWorkspace,
		loadBlueprint,
		updateBlueprint,
		loadTeacherFingerprint,
		updateTeacherFingerprint,
		loadStudentProfile,
		setActiveStudent,
		loadBuilderPlan,
		loadAssessmentPreview,
		loadClassProfile,
		loadDifferentiatedBuild,
		clearSession,
	};
}