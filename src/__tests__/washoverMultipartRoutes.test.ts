import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sessionHandler from "../../api/v4/documents/session";
import simulationRunHandler from "../../api/v4/simulations/run";

type SessionRow = {
	session_id: string;
	document_ids: string[];
	document_roles: Record<string, string[]>;
	session_roles: Record<string, string[]>;
	created_at: string;
	updated_at: string;
};

type DocumentRow = {
	document_id: string;
	session_id: string | null;
	source_file_name: string;
	source_mime_type: string;
	created_at: string;
	canonical_document: unknown | null;
	azure_extract: unknown | null;
};

type ResourceLinkRow = {
	session_id: string;
	document_id: string;
	resource_document_id: string;
	resource_type: string;
	content_text: string | null;
};

type ItemRow = {
	id: string;
	document_id: string;
	item_number: number;
	stem: string;
	metadata: Record<string, any>;
	updated_at?: string;
};

type DailyUsageRow = {
	user_id: string;
	date: string;
	simulations_run: number;
};

type MockDb = {
	sessions: SessionRow[];
	documents: DocumentRow[];
	analyzedDocuments: Array<{ document_id: string; session_id: string | null; analyzed_document: unknown; updated_at: string }>;
	resourceLinks: ResourceLinkRow[];
	items: ItemRow[];
	userDailySimulations: DailyUsageRow[];
	syntheticStudents: any[];
	simulationRuns: any[];
	systemEvents: any[];
	simulationResults: any[];
};

function createResponse() {
	const res: any = {};
	res.headers = {};
	res.statusCode = 200;
	res.setHeader = (name: string, value: string) => {
		res.headers[name.toLowerCase()] = value;
		return res;
	};
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	res.end = () => res;
	return res;
}

function jsonResponse(body: unknown, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: {
			get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
		},
		json: async () => body,
		text: async () => JSON.stringify(body),
	};
}

function textResponse(text: string, status = 500) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: {
			get: () => "text/plain",
		},
		json: async () => {
			throw new Error("Not JSON");
		},
		text: async () => text,
	};
}

function parseRequestBody(options?: RequestInit) {
	if (!options?.body) {
		return undefined;
	}
	if (typeof options.body === "string") {
		return JSON.parse(options.body);
	}
	return options.body;
}

function parseEq(value: string | null) {
	if (!value?.startsWith("eq.")) {
		return null;
	}
	return value.slice(3);
}

function parseIn(value: string | null) {
	if (!value?.startsWith("in.(") || !value.endsWith(")")) {
		return null;
	}
	return value
		.slice(4, -1)
		.split(",")
		.map((entry) => entry.trim().replace(/^"|"$/g, ""))
		.filter(Boolean);
}

function sortByOrder<T extends Record<string, any>>(rows: T[], orderParam: string | null) {
	if (!orderParam) {
		return rows;
	}
	const [field, direction] = orderParam.split(".");
	const factor = direction === "desc" ? -1 : 1;
	return [...rows].sort((left, right) => {
		const a = left[field];
		const b = right[field];
		if (a === b) return 0;
		return a > b ? factor : -factor;
	});
}

function buildDocumentRow(documentId: string, sourceFileName: string, content: string): DocumentRow {
	return {
		document_id: documentId,
		session_id: null,
		source_file_name: sourceFileName,
		source_mime_type: "application/pdf",
		created_at: "2025-01-01T00:00:00.000Z",
		canonical_document: null,
		azure_extract: {
			content,
			pages: [{ pageNumber: 1, text: content }],
			paragraphs: [{ text: content, pageNumber: 1 }],
			tables: [],
			readingOrder: [content],
		},
	};
}

function buildMultipartItem(params: {
	id: string;
	documentId: string;
	itemNumber: number;
	stem: string;
	groupId: string;
	logicalLabel: string;
	partIndex: number;
	isParent: boolean;
	concepts: string[];
	representations: string[];
	bloomLevel: number;
	cognitiveLoad: number;
	linguisticLoad: number;
	representationLoad: number;
	stepCount: number;
	vocabularyCount: number;
	itemType?: string;
	base?: Record<string, unknown>;
}): ItemRow {
	return {
		id: params.id,
		document_id: params.documentId,
		item_number: params.itemNumber,
		stem: params.stem,
		metadata: {
			phaseB: {
				structure: {
					groupId: params.groupId,
					logicalLabel: params.logicalLabel,
					partIndex: params.partIndex,
					isParent: params.isParent,
				},
			},
			concepts: params.concepts,
			representations: params.representations,
			bloomLevel: params.bloomLevel,
			cognitiveLoad: params.cognitiveLoad,
			linguisticLoad: params.linguisticLoad,
			representationLoad: params.representationLoad,
			stepCount: params.stepCount,
			vocabularyCount: params.vocabularyCount,
			itemType: params.itemType ?? (params.isParent ? "multipart" : "open-response"),
			base: params.base,
		},
	};
}

function createMockDb(overrides?: Partial<MockDb>): MockDb {
	return {
		sessions: [],
		documents: [],
		analyzedDocuments: [],
		resourceLinks: [],
		items: [],
		userDailySimulations: [],
		syntheticStudents: [],
		simulationRuns: [],
		systemEvents: [],
		simulationResults: [],
		...overrides,
	};
}

function installSupabaseFetchMock(db: MockDb) {
	const fetchMock = vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
		const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
		const table = requestUrl.pathname.split("/").pop();
		const method = (options?.method ?? "GET").toUpperCase();
		const body = parseRequestBody(options);

		if (!table) {
			return textResponse("Missing table", 404);
		}

		switch (table) {
			case "prism_v4_sessions": {
				if (method === "GET") {
					const sessionId = parseEq(requestUrl.searchParams.get("session_id"));
					return jsonResponse(sessionId ? db.sessions.filter((row) => row.session_id === sessionId) : db.sessions);
				}
				if (method === "POST") {
					const row = body as SessionRow;
					const existingIndex = db.sessions.findIndex((entry) => entry.session_id === row.session_id);
					if (existingIndex >= 0) {
						db.sessions[existingIndex] = { ...db.sessions[existingIndex], ...row };
					} else {
						db.sessions.push(row);
					}
					return jsonResponse(null);
				}
				break;
			}
			case "prism_v4_documents": {
				if (method === "GET") {
					const documentIds = parseIn(requestUrl.searchParams.get("document_id"));
					const sessionId = parseEq(requestUrl.searchParams.get("session_id"));
					let rows = db.documents;
					if (documentIds) {
						rows = rows.filter((row) => documentIds.includes(row.document_id));
					}
					if (sessionId) {
						rows = rows.filter((row) => row.session_id === sessionId);
					}
					return jsonResponse(sortByOrder(rows, requestUrl.searchParams.get("order")));
				}
				if (method === "PATCH") {
					const documentIds = parseIn(requestUrl.searchParams.get("document_id")) ?? [];
					for (const row of db.documents) {
						if (documentIds.includes(row.document_id)) {
							Object.assign(row, body);
						}
					}
					return jsonResponse(null);
				}
				break;
			}
			case "prism_v4_analyzed_documents": {
				if (method === "GET") {
					const sessionId = parseEq(requestUrl.searchParams.get("session_id"));
					const rows = sessionId
						? db.analyzedDocuments.filter((row) => row.session_id === sessionId)
						: db.analyzedDocuments;
					return jsonResponse(sortByOrder(rows, requestUrl.searchParams.get("order")));
				}
				if (method === "PATCH") {
					const documentIds = parseIn(requestUrl.searchParams.get("document_id")) ?? [];
					for (const row of db.analyzedDocuments) {
						if (documentIds.includes(row.document_id)) {
							Object.assign(row, body);
						}
					}
					return jsonResponse(null);
				}
				break;
			}
			case "prism_v4_session_snapshots": {
				if (method === "DELETE") {
					return jsonResponse(null);
				}
				if (method === "GET") {
					return jsonResponse([]);
				}
				break;
			}
			case "v4_document_resource_links": {
				if (method === "GET") {
					const sessionId = parseEq(requestUrl.searchParams.get("session_id"));
					const rows = sessionId ? db.resourceLinks.filter((row) => row.session_id === sessionId) : db.resourceLinks;
					return jsonResponse(rows);
				}
				if (method === "DELETE") {
					const sessionId = parseEq(requestUrl.searchParams.get("session_id"));
					db.resourceLinks = sessionId
						? db.resourceLinks.filter((row) => row.session_id !== sessionId)
						: [];
					return jsonResponse(null);
				}
				if (method === "POST") {
					const rows = (Array.isArray(body) ? body : [body]) as ResourceLinkRow[];
					for (const row of rows) {
						const existingIndex = db.resourceLinks.findIndex(
							(entry) =>
								entry.session_id === row.session_id &&
								entry.document_id === row.document_id &&
								entry.resource_document_id === row.resource_document_id &&
								entry.resource_type === row.resource_type,
						);
						if (existingIndex >= 0) {
							db.resourceLinks[existingIndex] = { ...db.resourceLinks[existingIndex], ...row };
						} else {
							db.resourceLinks.push(row);
						}
					}
					return jsonResponse(null);
				}
				break;
			}
			case "v4_items": {
				if (method === "GET") {
					const documentId = parseEq(requestUrl.searchParams.get("document_id"));
					const rows = documentId ? db.items.filter((row) => row.document_id === documentId) : db.items;
					return jsonResponse(sortByOrder(rows, requestUrl.searchParams.get("order")));
				}
				if (method === "PATCH") {
					const itemId = parseEq(requestUrl.searchParams.get("id"));
					const target = db.items.find((row) => row.id === itemId);
					if (target) {
						Object.assign(target, body);
					}
					return jsonResponse(null);
				}
				break;
			}
			case "user_daily_simulations": {
				if (method === "GET") {
					const userId = parseEq(requestUrl.searchParams.get("user_id"));
					const date = parseEq(requestUrl.searchParams.get("date"));
					return jsonResponse(
						db.userDailySimulations.filter((row) => (!userId || row.user_id === userId) && (!date || row.date === date)),
					);
				}
				if (method === "POST") {
					const row = body as DailyUsageRow;
					const existingIndex = db.userDailySimulations.findIndex(
						(entry) => entry.user_id === row.user_id && entry.date === row.date,
					);
					if (existingIndex >= 0) {
						db.userDailySimulations[existingIndex] = row;
					} else {
						db.userDailySimulations.push(row);
					}
					return jsonResponse(null);
				}
				break;
			}
			case "synthetic_students": {
				if (method === "GET") {
					const classId = parseEq(requestUrl.searchParams.get("class_id"));
					const rows = classId ? db.syntheticStudents.filter((row) => row.class_id === classId) : db.syntheticStudents;
					return jsonResponse(sortByOrder(rows, requestUrl.searchParams.get("order")));
				}
				if (method === "POST") {
					const rows = Array.isArray(body) ? body : [body];
					for (const row of rows) {
						const existingIndex = db.syntheticStudents.findIndex((entry) => entry.id === row.id);
						if (existingIndex >= 0) {
							db.syntheticStudents[existingIndex] = { ...db.syntheticStudents[existingIndex], ...row };
						} else {
							db.syntheticStudents.push(row);
						}
					}
					return jsonResponse(null);
				}
				break;
			}
			case "simulation_runs": {
				if (method === "POST") {
					db.simulationRuns.push(body);
					return jsonResponse(null);
				}
				break;
			}
			case "system_events": {
				if (method === "POST") {
					db.systemEvents.push(body);
					return jsonResponse(null);
				}
				break;
			}
			case "simulation_results": {
				if (method === "POST") {
					const rows = Array.isArray(body) ? body : [body];
					db.simulationResults.push(...rows);
					return jsonResponse(null);
				}
				break;
			}
		}

		return textResponse(`Unhandled ${method} ${table}`, 500);
	});

	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function buildMultipartFixture(includeParentRow = true) {
	const documentId = "doc-test";
	const items: ItemRow[] = [];

	if (includeParentRow) {
		items.push(
			buildMultipartItem({
				id: "item-parent",
				documentId,
				itemNumber: 1,
				stem: "1. Solve both parts.",
				groupId: "1",
				logicalLabel: "1",
				partIndex: 0,
				isParent: true,
				concepts: ["fraction addition", "equivalent fractions"],
				representations: ["diagram", "symbolic"],
				bloomLevel: 3,
				cognitiveLoad: 0.55,
				linguisticLoad: 0.45,
				representationLoad: 0.5,
				stepCount: 2,
				vocabularyCount: 12,
			}),
		);
	}

	items.push(
		buildMultipartItem({
			id: "item-child-a",
			documentId,
			itemNumber: includeParentRow ? 2 : 7,
			stem: "1a. Add the fractions with a diagram.",
			groupId: includeParentRow ? "1" : "7",
			logicalLabel: includeParentRow ? "1a" : "7a",
			partIndex: 1,
			isParent: false,
			concepts: ["fraction addition"],
			representations: ["diagram"],
			bloomLevel: 3,
			cognitiveLoad: 0.6,
			linguisticLoad: 0.4,
			representationLoad: 0.6,
			stepCount: 2,
			vocabularyCount: 8,
		}),
		buildMultipartItem({
			id: "item-child-b",
			documentId,
			itemNumber: includeParentRow ? 3 : 8,
			stem: "1b. Rewrite with equivalent fractions and solve symbolically.",
			groupId: includeParentRow ? "1" : "7",
			logicalLabel: includeParentRow ? "1b" : "7b",
			partIndex: 2,
			isParent: false,
			concepts: ["equivalent fractions"],
			representations: ["symbolic"],
			bloomLevel: 4,
			cognitiveLoad: 0.7,
			linguisticLoad: 0.5,
			representationLoad: 0.4,
			stepCount: 3,
			vocabularyCount: 10,
		}),
	);

	return createMockDb({
		documents: [
			buildDocumentRow(documentId, "assessment.pdf", "1. Solve both parts."),
			buildDocumentRow("doc-answer", "answer-key.pdf", includeParentRow ? "1a. x = 2\n1b. y = 3" : "7a. x = 2\n7b. y = 3"),
			buildDocumentRow(
				"doc-worked",
				"worked.pdf",
				includeParentRow
					? "1a. First compute equivalent fractions.\nThen solve the equation.\n1b. First isolate the variable.\nThen calculate the result.\nTherefore justify the value."
					: "7a. First compute equivalent fractions.\nThen solve the equation.\n7b. First isolate the variable.\nThen calculate the result.\nTherefore justify the value.",
			),
			buildDocumentRow(
				"doc-rubric",
				"rubric.pdf",
				includeParentRow
					? "1a. strict partial credit required criterion\n1b. alternative accept partial credit criterion"
					: "7a. strict partial credit required criterion\n7b. alternative accept partial credit criterion",
			),
			buildDocumentRow(
				"doc-prep",
				"prep.pdf",
				"Students explain fraction addition and equivalent fractions with a diagram and symbolic equation. Step 1 model the fractions with a diagram. Step 2 compute equivalent fractions. Step 3 solve and explain the symbolic equation.",
			),
		],
		items,
	});
}

async function bindSession(
	db: MockDb,
	sessionId: string,
	logicalGroup = "1",
	overrides?: {
		documentIds?: string[];
		documentRoles?: Record<string, string[]>;
		sessionRoles?: Record<string, string[]>;
		resourceLinks?: Array<{ documentId: string; resourceDocumentId: string; resourceType: string }>;
	},
) {
	installSupabaseFetchMock(db);
	const response = createResponse();
	const documentIds = overrides?.documentIds ?? ["doc-test", "doc-answer", "doc-worked", "doc-rubric", "doc-prep"];
	const documentRoles = overrides?.documentRoles ?? {
		"doc-test": ["test"],
		"doc-answer": ["answer-key"],
		"doc-worked": ["worked-solution"],
		"doc-rubric": ["rubric"],
		"doc-prep": ["prep-doc"],
	};
	const sessionRoles = overrides?.sessionRoles ?? {
		"doc-test": ["target-assessment"],
		"doc-answer": ["unit-member"],
		"doc-worked": ["unit-member"],
		"doc-rubric": ["unit-member"],
		"doc-prep": ["unit-member"],
	};
	const resourceLinks = overrides?.resourceLinks ?? [
		{ documentId: "doc-test", resourceDocumentId: "doc-answer", resourceType: "answer-key" },
		{ documentId: "doc-test", resourceDocumentId: "doc-worked", resourceType: "worked-solution" },
		{ documentId: "doc-test", resourceDocumentId: "doc-rubric", resourceType: "rubric" },
		{ documentId: "doc-test", resourceDocumentId: "doc-prep", resourceType: "prep-doc" },
	];
	await sessionHandler(
		{
			method: "POST",
			body: {
				sessionId,
				documentIds,
				documentRoles,
				sessionRoles,
				resourceLinks,
			},
		} as any,
		response as any,
	);

	expect(response.statusCode).toBe(200);
	expect(response.body.resourceLinks).toHaveLength(resourceLinks.length);
	expect(db.resourceLinks.every((row) => row.session_id === sessionId)).toBe(true);
	if (logicalGroup !== "1") {
		expect(db.items.every((item) => item.metadata.phaseB.structure.groupId === logicalGroup)).toBe(true);
	}
}

describe("multipart washover regressions", () => {
	beforeEach(() => {
		vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
		vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");
		vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("updates child rows and recomputes an explicit parent aggregate across layers", async () => {
		const db = buildMultipartFixture(true);

		await bindSession(db, "session-explicit-parent");

		const parent = db.items.find((item) => item.id === "item-parent");
		const childA = db.items.find((item) => item.id === "item-child-a");
		const childB = db.items.find((item) => item.id === "item-child-b");

		expect(parent?.metadata.answerKey.correctAnswer).toBe("1a: x = 2 | 1b: y = 3");
		expect(childA?.metadata.answerKey.correctAnswer).toBe("x = 2");
		expect(childB?.metadata.answerKey.correctAnswer).toBe("y = 3");

		expect(childA?.metadata.worked.stepCount).toBe(2);
		expect(childB?.metadata.worked.stepCount).toBe(3);
		expect(parent?.metadata.worked.stepCount).toBe(5);
		expect(parent?.metadata.worked.stepDifficultyCurve).toHaveLength(5);

		expect(childA?.metadata.rubric.partialCreditEnabled).toBe(true);
		expect(childB?.metadata.rubric.partialCreditEnabled).toBe(true);
		expect(parent?.metadata.rubric.partialCreditEnabled).toBe(true);
		expect(parent?.metadata.rubric.requiredElementsCount).toBe(
			childA!.metadata.rubric.requiredElementsCount + childB!.metadata.rubric.requiredElementsCount,
		);

		expect(childA?.metadata.prep.inferredOnly).toBe(false);
		expect(childB?.metadata.prep.inferredOnly).toBe(false);
		expect(parent?.metadata.prep.inferredOnly).toBe(false);
		expect(childA?.metadata.prep.difficultyAdjustment).toBeLessThan(0);
		expect(childA?.metadata.prep.confusionAdjustment).toBeLessThan(0);
		expect(childA?.metadata.prep.timeMultiplier).toBeLessThan(0);
		expect(childB?.metadata.prep.difficultyAdjustment).toBeLessThan(0);
		expect(childB?.metadata.prep.confusionAdjustment).toBeLessThan(0);
		expect(childB?.metadata.prep.timeMultiplier).toBeLessThan(0);
		expect(parent?.metadata.prep.difficultyAdjustment).toBeLessThan(0);
		expect(parent?.metadata.prep.confusionAdjustment).toBeLessThan(0);
		expect(parent?.metadata.prep.timeMultiplier).toBeLessThan(0);
		expect(parent?.metadata.prep.coveredConcepts).toEqual(
			expect.arrayContaining(["fraction addition", "equivalent fractions"]),
		);

		expect(parent?.metadata.final.partialCreditEnabled).toBe(true);
		expect(parent?.metadata.final.stepCount).toBe(5);
		expect(parent?.metadata.final.stepDifficultyCurve).toHaveLength(5);
		expect(parent?.metadata.final.timeSeconds).toBeGreaterThan(childA!.metadata.final.timeSeconds);
		expect(parent?.metadata.final.timeSeconds).toBeGreaterThan(childB!.metadata.final.timeSeconds);
	});

	it("makes items harder when prep docs do not cover the tested concepts", async () => {
		const db = buildMultipartFixture(true);
		db.documents = db.documents.map((document) => document.document_id === "doc-prep"
			? buildDocumentRow("doc-prep", "prep.pdf", "Students review classroom norms, attendance routines, and note-taking expectations before the unit quiz.")
			: document);

		await bindSession(db, "session-prep-none");

		const parent = db.items.find((item) => item.id === "item-parent");
		const childA = db.items.find((item) => item.id === "item-child-a");
		const childB = db.items.find((item) => item.id === "item-child-b");

		expect(childA?.metadata.prep.strength).toBe("none");
		expect(childB?.metadata.prep.strength).toBe("none");
		expect(parent?.metadata.prep.strength).toBe("none");
		expect(childA?.metadata.prep.difficultyAdjustment).toBeGreaterThan(0);
		expect(childA?.metadata.prep.confusionAdjustment).toBeGreaterThan(0);
		expect(childA?.metadata.prep.timeMultiplier).toBeGreaterThan(0);
		expect(childA?.metadata.prep.bloomAdjustment).toBeGreaterThan(0);
		expect(childB?.metadata.prep.difficultyAdjustment).toBeGreaterThan(0);
		expect(childB?.metadata.prep.confusionAdjustment).toBeGreaterThan(0);
		expect(childB?.metadata.prep.timeMultiplier).toBeGreaterThan(0);
		expect(childB?.metadata.prep.bloomAdjustment).toBeGreaterThan(0);
		expect(parent?.metadata.prep.difficultyAdjustment).toBeGreaterThan(0);
		expect(parent?.metadata.prep.confusionAdjustment).toBeGreaterThan(0);
		expect(parent?.metadata.prep.timeMultiplier).toBeGreaterThan(0);
		expect(parent?.metadata.prep.bloomAdjustment).toBeGreaterThan(0);
	});

	it("keeps child updates intact when a multipart group has no explicit parent row", async () => {
		const db = buildMultipartFixture(false);

		await bindSession(db, "session-child-only", "7");

		const childA = db.items.find((item) => item.id === "item-child-a");
		const childB = db.items.find((item) => item.id === "item-child-b");

		expect(db.items).toHaveLength(2);
		expect(childA?.metadata.answerKey.correctAnswer).toBe("x = 2");
		expect(childB?.metadata.answerKey.correctAnswer).toBe("y = 3");
		expect(childA?.metadata.answerKey.correctAnswer).not.toContain("7b:");
		expect(childB?.metadata.answerKey.correctAnswer).not.toContain("7a:");
		expect(childA?.metadata.final.stepDifficultyCurve).toHaveLength(2);
		expect(childB?.metadata.final.stepDifficultyCurve).toHaveLength(3);
		expect(childA?.metadata.prep).not.toBeNull();
		expect(childB?.metadata.prep).not.toBeNull();
	});

	it("does not smear parent-level companion rows across explicit subparts", async () => {
		const db = buildMultipartFixture(true);
		const replaceDocumentContent = (document: DocumentRow, content: string): DocumentRow => ({
			...document,
			azure_extract: {
				content,
				pages: [{ pageNumber: 1, text: content }],
				paragraphs: [{ text: content, pageNumber: 1 }],
				tables: [],
				readingOrder: [content],
			},
		});
		db.documents = db.documents.map((document) => {
			if (document.document_id === "doc-answer") {
				return replaceDocumentContent(document, "1. Combined parent answer only.");
			}
			if (document.document_id === "doc-worked") {
				return replaceDocumentContent(document, "1. Parent worked explanation only.");
			}
			if (document.document_id === "doc-rubric") {
				return replaceDocumentContent(document, "1. Parent rubric only.");
			}
			return document;
		});

		await bindSession(db, "session-no-parent-smear");

		const parent = db.items.find((item) => item.id === "item-parent");
		const childA = db.items.find((item) => item.id === "item-child-a");
		const childB = db.items.find((item) => item.id === "item-child-b");

		expect(childA?.metadata.answerKey).toBeNull();
		expect(childB?.metadata.answerKey).toBeNull();
		expect(childA?.metadata.worked).toBeNull();
		expect(childB?.metadata.worked).toBeNull();
		expect(childA?.metadata.rubric).toBeNull();
		expect(childB?.metadata.rubric).toBeNull();
		expect(parent?.metadata.answerKey).toBeNull();
		expect(parent?.metadata.worked).toBeNull();
		expect(parent?.metadata.rubric).toBeNull();
	});

	it("merges multi-prep coverage by union and keeps low-signal stopwords out of concept matches", async () => {
		const db = buildMultipartFixture(true);
		db.documents.push(
			buildDocumentRow(
				"doc-prep-2",
				"prep-2.pdf",
				"Students will practice equivalent fractions with strip models. They will compare unlike denominators, justify the equivalent fractions, and annotate the diagram before solving.",
			),
		);

		await bindSession(db, "session-multi-prep", "1", {
			documentIds: ["doc-test", "doc-answer", "doc-worked", "doc-rubric", "doc-prep", "doc-prep-2"],
			documentRoles: {
				"doc-test": ["test"],
				"doc-answer": ["answer-key"],
				"doc-worked": ["worked-solution"],
				"doc-rubric": ["rubric"],
				"doc-prep": ["prep-doc"],
				"doc-prep-2": ["prep-doc"],
			},
			sessionRoles: {
				"doc-test": ["target-assessment"],
				"doc-answer": ["unit-member"],
				"doc-worked": ["unit-member"],
				"doc-rubric": ["unit-member"],
				"doc-prep": ["unit-member"],
				"doc-prep-2": ["unit-member"],
			},
			resourceLinks: [
				{ documentId: "doc-test", resourceDocumentId: "doc-answer", resourceType: "answer-key" },
				{ documentId: "doc-test", resourceDocumentId: "doc-worked", resourceType: "worked-solution" },
				{ documentId: "doc-test", resourceDocumentId: "doc-rubric", resourceType: "rubric" },
				{ documentId: "doc-test", resourceDocumentId: "doc-prep", resourceType: "prep-doc" },
				{ documentId: "doc-test", resourceDocumentId: "doc-prep-2", resourceType: "prep-doc" },
			],
		});

		const parent = db.items.find((item) => item.id === "item-parent");
		const childA = db.items.find((item) => item.id === "item-child-a");
		const childB = db.items.find((item) => item.id === "item-child-b");

		expect(childA?.metadata.prep.coveredConcepts).toContain("fraction addition");
		expect(childB?.metadata.prep.coveredConcepts).toContain("equivalent fractions");
		expect(parent?.metadata.prep.coveredConcepts).toEqual(
			expect.arrayContaining(["fraction addition", "equivalent fractions"]),
		);
		expect(parent?.metadata.prep.coveredConcepts).not.toContain("will");
		expect(parent?.metadata.prep.evidence).toEqual(expect.arrayContaining([expect.stringContaining("Prep doc —") ]));
	});

	it("uses the recomputed aggregate final traits in the simulation runtime", async () => {
		const db = buildMultipartFixture(true);

		await bindSession(db, "session-simulation-parent");

		installSupabaseFetchMock(db);
		const simulationRes = createResponse();
		await simulationRunHandler(
			{
				method: "POST",
				headers: {
					"x-user-id": "00000000-0000-4000-8000-000000000001",
					"x-user-tier": "teacher",
				},
				body: {
					classId: "class-1",
					documentId: "doc-test",
					studentCount: 3,
					seed: "washover-regression",
				},
			} as any,
			simulationRes as any,
		);

		expect(simulationRes.statusCode).toBe(201);
		expect(simulationRes.body.snapshot.items).toHaveLength(3);
		expect(simulationRes.body.snapshot.items[0].itemId).toBe("item-1");
		expect(simulationRes.body.snapshot.items[0].predictedDifficultyCurve).toHaveLength(5);
		expect(simulationRes.body.snapshot.items[0].rubricNarrative).toContain("partial credit");
		expect(simulationRes.body.snapshot.items[0].timeSeconds).toBeGreaterThan(simulationRes.body.snapshot.items[1].timeSeconds);
		expect(db.userDailySimulations).toHaveLength(1);
	});
});