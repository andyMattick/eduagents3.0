import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	appendStudentAssessmentEvents,
	getStudentPerformanceProfile,
	saveStudentPerformanceProfile,
	updateStudentPerformanceProfile,
	type StudentAssessmentEvent,
} from "../../../src/prism-v4/studentPerformance";
import { canonicalConceptId, type BloomLevel, type ItemMode, type ScenarioType } from "../../../src/prism-v4/teacherFeedback";
import type { ExtractedProblemDifficulty } from "../../../src/prism-v4/schema/semantic";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AssessmentIngestItem {
	itemId?: string;
	conceptId?: string;
	concept?: string;
	conceptDisplayName?: string;
	correct: boolean;
	bloom: BloomLevel;
	mode?: ItemMode;
	scenario?: ScenarioType;
	difficulty?: ExtractedProblemDifficulty;
	responseTimeSeconds?: number;
	confidence?: number;
	misconceptionKey?: string;
	incorrectResponse?: string;
	occurredAt?: string;
	metadata?: Record<string, unknown>;
}

function createEventId(studentId: string, assessmentId: string, item: AssessmentIngestItem, index: number) {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return globalThis.crypto.randomUUID();
	}
	return `${studentId}-${assessmentId}-${item.itemId ?? index}-${Date.now()}-${index}`;
}

function parseBody(body: unknown) {
	if (typeof body === "string") {
		return JSON.parse(body) as Record<string, unknown>;
	}
	return (body ?? {}) as Record<string, unknown>;
}

function isBloomLevel(value: unknown): value is BloomLevel {
	return typeof value === "string" && ["remember", "understand", "apply", "analyze", "evaluate", "create"].includes(value);
}

function toEvents(payload: Record<string, unknown>) {
	const studentId = typeof payload.studentId === "string" && payload.studentId.trim().length > 0 ? payload.studentId.trim() : null;
	const assessmentId = typeof payload.assessmentId === "string" && payload.assessmentId.trim().length > 0 ? payload.assessmentId.trim() : null;
	const unitId = typeof payload.unitId === "string" && payload.unitId.trim().length > 0 ? payload.unitId.trim() : undefined;
	const items = Array.isArray(payload.items) ? payload.items as AssessmentIngestItem[] : [];
	if (!studentId || !assessmentId || items.length === 0) {
		throw new Error("studentId, assessmentId, and items are required");
	}
	const now = new Date().toISOString();
	return items.map<StudentAssessmentEvent>((item, index) => {
		const conceptValue = typeof item.conceptId === "string" && item.conceptId.trim().length > 0
			? item.conceptId.trim()
			: typeof item.concept === "string" && item.concept.trim().length > 0
				? item.concept.trim()
				: null;
		if (!conceptValue || !isBloomLevel(item.bloom) || typeof item.correct !== "boolean") {
			throw new Error("Each item must include conceptId or concept, correct, and bloom");
		}
		return {
			eventId: createEventId(studentId, assessmentId, item, index),
			studentId,
			assessmentId,
			unitId,
			itemId: typeof item.itemId === "string" && item.itemId.trim().length > 0 ? item.itemId.trim() : undefined,
			conceptId: canonicalConceptId(conceptValue),
			conceptDisplayName: typeof item.conceptDisplayName === "string" && item.conceptDisplayName.trim().length > 0 ? item.conceptDisplayName.trim() : conceptValue,
			bloomLevel: item.bloom,
			itemMode: item.mode,
			scenarioType: item.scenario,
			difficulty: item.difficulty,
			correct: item.correct,
			responseTimeSeconds: typeof item.responseTimeSeconds === "number" ? item.responseTimeSeconds : undefined,
			confidence: typeof item.confidence === "number" ? item.confidence : undefined,
			misconceptionKey: typeof item.misconceptionKey === "string" ? item.misconceptionKey : undefined,
			incorrectResponse: typeof item.incorrectResponse === "string" ? item.incorrectResponse : undefined,
			occurredAt: typeof item.occurredAt === "string" && item.occurredAt.trim().length > 0 ? item.occurredAt.trim() : now,
			metadata: item.metadata,
		};
	});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body);
		const events = toEvents(payload);
		await appendStudentAssessmentEvents(events);
		const currentProfile = await getStudentPerformanceProfile(events[0]!.studentId, events[0]!.unitId);
		const updatedProfile = updateStudentPerformanceProfile(currentProfile, events);
		await saveStudentPerformanceProfile(updatedProfile);
		return res.status(200).json({
			profile: updatedProfile,
			appendedEvents: events.length,
		});
	} catch (error) {
		return res.status(400).json({
			error: error instanceof Error ? error.message : "Failed to ingest student assessment",
		});
	}
}