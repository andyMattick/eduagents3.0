import type { IntentRequest } from "../prism-v4/schema/integration/IntentRequest";
import type { IntentProduct } from "../prism-v4/schema/integration";
import type { TeacherFeedbackPayload } from "../prism-v4/teacherFeedback";
import type { ProblemOverrideRecord } from "../prism-v4/teacherFeedback/TeacherFeedback";
import type { AssessmentPreviewModel, BlueprintModel, BuilderPlanModel, ClassProfileModel, ConceptMapModel, DifferentiatedBuildModel, TeacherFingerprintModel } from "../types/v4/InstructionalSession";
import type { StudentPerformanceProfile } from "../prism-v4/studentPerformance";
import type { BloomLevel, ItemMode, ScenarioType } from "../prism-v4/teacherFeedback";

type StudentProfileResponse = {
	studentId: string;
	unitId?: string;
	profile: StudentPerformanceProfile;
	misconceptions: string[];
	exposureTimeline: Array<{ timestamp: string; conceptId: string; conceptLabel?: string }>;
	responseTimes: Array<{ itemId: string; conceptId: string; ms: number }>;
};

type BlueprintResponse = {
	sessionId: string;
	assessmentId: string;
	teacherId: string;
	blueprint: BlueprintModel;
	conceptMap: ConceptMapModel;
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

type TeacherFingerprintResponse = {
	teacherId: string;
	fingerprint: TeacherFingerprintModel;
};

type AssessmentBlueprintResponse = {
	assessment?: unknown;
	explanation?: unknown;
};

export type ConceptVerificationPreviewRequest = {
	assessmentId: string;
	teacherId?: string;
	unitId?: string;
	options?: Record<string, unknown>;
};

export type RegenerateAssessmentItemRequest = {
	assessmentId: string;
	itemId: string;
	teacherId?: string;
	unitId?: string;
	options?: Record<string, unknown>;
};

export type RegenerateAssessmentSectionRequest = {
	assessmentId: string;
	conceptId: string;
	teacherId?: string;
	unitId?: string;
	options?: Record<string, unknown>;
};

export async function fetchJson<T>(input: string, init?: RequestInit) {
	const response = await fetch(input, init);
	let rawBody = "";
	let payload: unknown;

	if (typeof response.text === "function") {
		rawBody = await response.text();
	} else if (typeof response.json === "function") {
		payload = await response.json();
		rawBody = JSON.stringify(payload ?? null);
	}

	const trimmedBody = rawBody.trim();

	if (!trimmedBody) {
		throw new Error(`Empty response from ${input}`);
	}

	if (trimmedBody.startsWith("<!DOCTYPE") || trimmedBody.startsWith("<html") || trimmedBody.startsWith("<")) {
		throw new Error(`Non-JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
	}

	if (payload === undefined) {
		try {
			payload = JSON.parse(trimmedBody);
		} catch {
			throw new Error(`Invalid JSON response from ${input}: ${trimmedBody.slice(0, 120)}`);
		}
	}

	if (!response.ok) {
		const errorMessage = typeof payload === "object" && payload !== null && "error" in payload
			? String((payload as { error?: unknown }).error ?? `Request failed: ${input}`)
			: `Request failed: ${input}`;
		throw new Error(errorMessage);
	}

	return payload as T;
}

export function loadSessionBlueprintApi(sessionId: string) {
	return fetchJson<BlueprintResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/blueprint`);
}

export function loadStudentProfileApi(studentId: string, unitId?: string) {
	const query = unitId ? `?unitId=${encodeURIComponent(unitId)}` : "";
	return fetchJson<StudentProfileResponse>(`/api/v4/students/${encodeURIComponent(studentId)}/performance${query}`);
}

export function loadBuilderPlanApi(sessionId: string, studentId?: string) {
	const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
	return fetchJson<BuilderPlanResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/builder-plan${query}`);
}

export function loadAssessmentPreviewApi(sessionId: string, studentId?: string) {
	const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
	return fetchJson<AssessmentPreviewResponse>(`/api/v4/sessions/${encodeURIComponent(sessionId)}/assessment-preview${query}`);
}

export function loadClassProfileApi(classId: string) {
	return fetchJson<ClassProfileResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/performance`);
}

export function loadDifferentiatedBuildApi(classId: string) {
	return fetchJson<DifferentiatedBuildResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/differentiated-build`);
}

export function loadTeacherFingerprintApi(teacherId: string) {
	return fetchJson<TeacherFingerprintResponse>(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`);
}

export function updateTeacherFingerprintApi(teacherId: string, patch: Partial<TeacherFingerprintModel>) {
	return fetchJson<TeacherFingerprintResponse>(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	});
}

export function generateIntentProductApi(args: IntentRequest) {
	return fetchJson<IntentProduct>("/api/v4/documents/intent", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(args),
	});
}

export function loadAssessmentBlueprintApi(assessmentId: string) {
	return fetch(`/api/v4/teacher-feedback/assessment-blueprint?assessmentId=${encodeURIComponent(assessmentId)}`).then(async (response) => {
		if (response.status === 404) {
			return null;
		}
		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error((payload as { error?: unknown })?.error ? String((payload as { error?: unknown }).error) : "Failed to load saved draft.");
		}
		return payload as AssessmentBlueprintResponse;
	});
}

export function saveAssessmentBlueprintApi(body: Record<string, unknown>) {
	return fetchJson<AssessmentBlueprintResponse>("/api/v4/teacher-feedback/assessment-blueprint", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function previewConceptVerificationApi(body: ConceptVerificationPreviewRequest) {
	return fetchJson<{ explanation?: unknown; preview?: unknown }>("/api/v4/teacher-feedback/concept-verification-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function regenerateAssessmentItemApi(body: RegenerateAssessmentItemRequest) {
	return fetchJson<{ replacementItem?: unknown }>("/api/v4/teacher-feedback/regenerate-item", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function regenerateAssessmentSectionApi(body: RegenerateAssessmentSectionRequest) {
	return fetchJson<{ replacementSection?: unknown }>("/api/v4/teacher-feedback/regenerate-section", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function loadProblemOverrideApi(canonicalProblemId: string) {
	return fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`).then(async (response) => {
		if (!response.ok) {
			return null;
		}
		return response.json().catch(() => ({ overrides: null })) as Promise<{ overrides?: ProblemOverrideRecord | null }>;
	});
}

export function saveTeacherFeedbackApi(body: TeacherFeedbackPayload) {
	return fetchJson<{ ok?: boolean; feedback?: unknown }>("/api/v4/teacher-feedback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}