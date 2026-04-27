import { buildIntentPayload } from "../documents/intents/buildIntentProduct";
import { deriveAdaptiveTargets } from "../documents/intents/adaptiveTargets";
import { getDocumentSessionStore, listIntentProductsForSessionStore, loadPrismSessionContextCached, saveIntentProductStore, type PrismSessionContext } from "../documents/registryStore";
import type { IntentProduct, TestProduct } from "../schema/integration";
import { getStudentPerformanceProfile } from "../studentPerformance";
import {
	buildAssessmentFingerprint,
	getAssessmentFingerprint,
	getTeacherFingerprint,
	getUnitFingerprint,
	mergeAssessmentIntoTeacherFingerprint,
	mergeAssessmentIntoUnitFingerprint,
	explainTestItemAlignment,
	type AssessmentFingerprint,
	type TeacherFingerprint,
	type UnitFingerprint,
} from "../teacherFeedback";

const DEFAULT_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

function isTestProductRecord(product: IntentProduct): product is IntentProduct<"build-test"> {
	return product.intentType === "build-test" && product.payload.kind === "test";
}

function attachItemExplanations(product: TestProduct, itemExplanations: ReturnType<typeof explainTestItemAlignment>): TestProduct {
	const explanationById = new Map(itemExplanations.map((entry) => [entry.itemId, entry.explanation]));
	return {
		...product,
		sections: product.sections.map((section) => ({
			...section,
			items: section.items.map((item) => ({
				...item,
				explanation: explanationById.get(item.itemId),
			})),
		})),
	};
}

export interface ResolvedInstructionalAssessmentRuntime {
	sessionId: string;
	productRecord: IntentProduct<"build-test">;
	product: TestProduct;
	assessmentFingerprint: AssessmentFingerprint;
	teacherFingerprint: TeacherFingerprint;
	unitFingerprint: UnitFingerprint | null;
	studentPerformanceProfile: Awaited<ReturnType<typeof getStudentPerformanceProfile>>;
	adaptiveTargets: ReturnType<typeof deriveAdaptiveTargets> | null;
	context: PrismSessionContext;
}

export async function resolveInstructionalAssessmentRuntime(args: {
	sessionId: string;
	studentId?: string;
	teacherId?: string;
	unitId?: string;
}): Promise<ResolvedInstructionalAssessmentRuntime> {
	const session = await getDocumentSessionStore(args.sessionId);
	if (!session) {
		throw new Error("Session not found");
	}

	const context = await loadPrismSessionContextCached(args.sessionId);
	if (!context) {
		throw new Error("Session not found");
	}

	const products = await listIntentProductsForSessionStore(args.sessionId);
	let productRecord = [...products]
		.filter(isTestProductRecord)
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

	if (!productRecord) {
		const payload = await buildIntentPayload({
			sessionId: args.sessionId,
			documentIds: session.documentIds,
			intentType: "build-test",
			studentId: args.studentId,
			options: {
				...(args.teacherId ? { teacherId: args.teacherId } : {}),
				...(args.unitId ? { unitId: args.unitId } : {}),
			},
		}, context);
		productRecord = await saveIntentProductStore({
			sessionId: args.sessionId,
			documentIds: session.documentIds,
			intentType: "build-test",
			studentId: args.studentId,
			options: {
				...(args.teacherId ? { teacherId: args.teacherId } : {}),
				...(args.unitId ? { unitId: args.unitId } : {}),
			},
		}, payload, "wave3-v1");
	}

	const savedAssessment = await getAssessmentFingerprint(productRecord.productId);
	const teacherId = args.teacherId ?? savedAssessment?.teacherId ?? DEFAULT_TEACHER_ID;
	const unitId = args.unitId ?? savedAssessment?.unitId;
	const assessmentFingerprint = savedAssessment ?? buildAssessmentFingerprint({
		teacherId,
		assessmentId: productRecord.productId,
		unitId,
		product: productRecord.payload,
		sourceType: "generated",
	});
	const storedTeacher = await getTeacherFingerprint(teacherId);
	const storedUnit = unitId ? await getUnitFingerprint(teacherId, unitId) : null;
	const teacherFingerprint = mergeAssessmentIntoTeacherFingerprint({
		previous: storedTeacher,
		assessment: assessmentFingerprint,
		alpha: 1,
		now: assessmentFingerprint.lastUpdated,
	});
	const unitFingerprint = unitId || storedUnit
		? mergeAssessmentIntoUnitFingerprint({
			previous: storedUnit,
			assessment: assessmentFingerprint,
			alpha: 1,
			now: assessmentFingerprint.lastUpdated,
		})
		: null;
	const studentPerformanceProfile = args.studentId
		? await getStudentPerformanceProfile(args.studentId, unitId)
		: null;
	const adaptiveTargets = studentPerformanceProfile
		? deriveAdaptiveTargets(studentPerformanceProfile, assessmentFingerprint.conceptProfiles, {
			teacherFingerprint,
			unitFingerprint,
		}, productRecord.payload.totalItemCount)
		: null;
	const itemExplanations = explainTestItemAlignment({
		product: productRecord.payload,
		teacherFingerprint,
		unitFingerprint,
		studentPerformanceProfile,
	});

	return {
		sessionId: args.sessionId,
		productRecord,
		product: attachItemExplanations(productRecord.payload, itemExplanations),
		assessmentFingerprint,
		teacherFingerprint,
		unitFingerprint,
		studentPerformanceProfile,
		adaptiveTargets,
		context,
	};
}