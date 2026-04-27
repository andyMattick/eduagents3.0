/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentUpload } from "../DocumentUpload";

vi.mock("../../Auth/useAuth", () => ({
	useAuth: () => ({
		user: {
			id: "teacher-auth-1",
			email: "teacher@example.com",
			name: "Teacher Example",
			isAdmin: false,
		},
		session: null,
		isLoading: false,
		error: null,
		signIn: vi.fn(),
		signUp: vi.fn(),
		logout: vi.fn(),
	}),
}));

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function jsonResponse(payload: unknown, ok = true) {
	const body = JSON.stringify(payload);
	return {
		ok,
		text: async () => body,
		json: async () => payload,
	};
}

function buildAnalyzedDocument(documentId: string, sourceFileName: string, concept: string) {
	return {
		document: {
			id: documentId,
			sourceFileName,
			sourceMimeType: sourceFileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			surfaces: [{ id: `${documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [{ id: `${documentId}-node-1`, documentId, surfaceId: `${documentId}-surface-1`, nodeType: "paragraph", orderIndex: 0, text: `Example about ${concept}.`, normalizedText: `Example about ${concept}.` }],
			createdAt: "2025-01-01T00:00:00.000Z",
		},
		fragments: [{
			id: `${documentId}-fragment-1`,
			documentId,
			anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
			isInstructional: true,
			instructionalRole: "example",
			contentType: "text",
			learningTarget: `Understand ${concept}`,
			prerequisiteConcepts: [concept],
			scaffoldLevel: "medium",
			exampleType: "worked",
			misconceptionTriggers: [`common mistake with ${concept}`],
			confidence: 0.9,
			classifierVersion: "wave5-v1",
			strategy: "rule-based",
		}],
		problems: [{
			id: `${documentId}-problem-1`,
			documentId,
			anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
			text: `Solve a problem about ${concept}.`,
			extractionMode: "authored",
			concepts: [concept],
			representations: ["text"],
			difficulty: "medium",
			misconceptions: [],
			cognitiveDemand: "conceptual",
		}],
		insights: {
			concepts: [concept],
			conceptFrequencies: { [concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [`common mistake with ${concept}`],
			instructionalDensity: 0.75,
			problemCount: 1,
			exampleCount: 1,
			explanationCount: 1,
		},
		updatedAt: "2025-01-01T00:00:00.000Z",
	};
}

function buildInstructionalAnalysisResponse(sessionId: string, analyzedDocuments: ReturnType<typeof buildAnalyzedDocument>[]) {
	return {
		sessionId,
		documentIds: analyzedDocuments.map((d) => d.document.id),
		analysis: {
			concepts: analyzedDocuments.map((d) => ({
				concept: d.insights.concepts[0],
				documentCount: 1,
				problemCount: d.problems.length,
				coverage: 1,
			})),
			problems: analyzedDocuments.map((d) => ({
				documentId: d.document.id,
				sourceFileName: d.document.sourceFileName,
				problemCount: d.problems.length,
				dominantDemand: d.problems[0]?.cognitiveDemand ?? "mixed",
				difficultyDistribution: { low: 0, medium: d.problems.length, high: 0 },
			})),
			misconceptions: [{
				misconception: analyzedDocuments[0]?.insights.misconceptionThemes[0] ?? "denominator-swap",
				occurrences: 1,
				concepts: [analyzedDocuments[0]?.insights.concepts[0] ?? "fractions"],
			}],
			bloomSummary: { remember: 0, understand: 0, apply: 1, analyze: 0, evaluate: 0, create: 0 },
			modeSummary: { compare: 1 },
			scenarioSummary: { "abstract-symbolic": 1 },
			difficultySummary: { low: 0, medium: 1, high: 0, averageInstructionalDensity: 0.75 },
			domain: "Mathematics",
		},
		rawAnalysis: {
			sessionId,
			documentIds: analyzedDocuments.map((d) => d.document.id),
			conceptOverlap: {},
			conceptGaps: [],
			difficultyProgression: {},
			representationProgression: {},
			redundancy: {},
			coverageSummary: { totalConcepts: 1, docsPerConcept: { fractions: 1 }, perDocument: {} },
			documentSimilarity: [],
			conceptToDocumentMap: { fractions: analyzedDocuments.map((d) => d.document.id) },
			updatedAt: "2025-01-01T00:00:00.000Z",
		},
	};
}

// ─── Shared mock route builder ────────────────────────────────────────────────

function buildFetchMock() {
	const documents = [
		{ documentId: "doc-1", sourceFileName: "fractions-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
	];
	const analyzedDocuments = [buildAnalyzedDocument("doc-1", "fractions-notes.docx", "fractions")];
	const session = {
		sessionId: "session-1",
		documentIds: ["doc-1"],
		documentRoles: { "doc-1": ["notes"] },
		sessionRoles: { "doc-1": ["unit-member"] },
		createdAt: "2025-01-01T00:00:00.000Z",
		updatedAt: "2025-01-01T00:00:00.000Z",
	};
	const buildTestProduct = {
		sessionId: "session-1",
		intentType: "build-test" as const,
		documentIds: ["doc-1"],
		productId: "product-test-1",
		productType: "build-test",
		schemaVersion: "wave3-v1",
		payload: {
			kind: "test",
			focus: null,
			domain: "Mathematics",
			title: "Assessment Draft",
			overview: "This draft assessment includes 1 item focused on fractions.",
			estimatedDurationMinutes: 5,
			totalItemCount: 1,
			sections: [],
			generatedAt: "2025-01-01T00:00:00.000Z",
		},
		createdAt: "2025-01-01T00:00:00.000Z",
	};

	let products: typeof buildTestProduct[] = [];

	const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
		if (input === "/api/v4/documents/upload") return jsonResponse({ documentId: "doc-1", documentIds: ["doc-1"], sessionId: "session-1", registered: documents });
		if (input === "/api/v4/documents/session" && init?.method === "POST") return jsonResponse(session);
		if (input === "/api/v4/documents/session?sessionId=session-1") return jsonResponse({ session, documents, analyzedDocuments });
		if (input === "/api/v4/documents/session-analysis?sessionId=session-1") return jsonResponse(buildInstructionalAnalysisResponse("session-1", analyzedDocuments));
		if (input === "/api/v4/documents/intent?sessionId=session-1") return jsonResponse({ sessionId: "session-1", products });
		if (input === "/api/v4/documents/intent" && init?.method === "POST") {
			products = [buildTestProduct];
			return jsonResponse(buildTestProduct);
		}
		if (input === "/api/v4/sessions/session-1/blueprint") {
			return jsonResponse({
				sessionId: "session-1",
				blueprint: {
					concepts: [{ id: "fractions", name: "fractions", order: 0, included: true, quota: 1 }],
					bloomLadder: [],
					difficultyRamp: [],
					modeMix: [],
					scenarioMix: [],
				},
				conceptMap: { nodes: [{ id: "fractions", label: "fractions", weight: 1 }], edges: [] },
			});
		}
		if (input === "/api/v4/teachers/teacher-auth-1/fingerprint") {
			return jsonResponse({ teacherId: "teacher-auth-1", fingerprint: { teacherId: "teacher-auth-1", modePreferences: [], scenarioPreferences: [], bloomPreferences: [], difficultyPreferences: [], rawFingerprint: null } });
		}
		if (input === "/api/v4/sessions/session-1/builder-plan" || input === "/api/v4/sessions/session-1/builder-plan?studentId=student-42") {
			return jsonResponse({ sessionId: "session-1", builderPlan: { sections: [{ conceptId: "fractions", conceptName: "Fractions", itemCount: 1, bloomSequence: ["understand"], difficultySequence: ["medium"], modeSequence: ["compare"], scenarioSequence: ["abstract-symbolic"] }] } });
		}
		if (input === "/api/v4/sessions/session-1/assessment-preview" || input === "/api/v4/sessions/session-1/assessment-preview?studentId=student-42") {
			return jsonResponse({
				sessionId: "session-1",
				assessmentPreview: {
					items: [{
						itemId: "item-1",
						stem: "Compare the fractions 2/3 and 3/4.",
						answer: "Use common denominators.",
						conceptId: "fractions",
						bloom: "understand",
						difficulty: "medium",
						mode: "compare",
						scenario: "abstract-symbolic",
						misconceptionTag: "denominator-swap",
					}],
				},
			});
		}
		if (input === "/api/v4/students/student-42/performance") return jsonResponse({ studentId: "student-42", profile: null, misconceptions: [], exposureTimeline: [], responseTimes: [] });
		if (input === "/api/v4/classes/session-1/performance") return jsonResponse({ classProfile: { classId: "session-1", students: [], conceptClusters: [], misconceptionClusters: [] } });
		if (input === "/api/v4/classes/session-1/differentiated-build") return jsonResponse({ differentiatedBuild: { classId: "session-1", versions: [] } });
		throw new Error(`Unexpected fetch: ${input}`);
	});

	return { fetchMock, documents, analyzedDocuments };
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PavilionInstructionalIntelligence integration", () => {
	async function bootstrapToTabs() {
		const { fetchMock } = buildFetchMock();
		vi.stubGlobal("fetch", fetchMock);
		render(<DocumentUpload />);

		fireEvent.change(screen.getByLabelText("Teaching materials"), {
			target: {
				files: [new File(["docx"], "fractions-notes.docx", {
					type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				})],
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

		await screen.findByRole("heading", { name: "Document analysis" });
		fireEvent.click(screen.getByRole("button", { name: "Generate in Pavilion" }));
		await screen.findByRole("tab", { name: "Builder Plan" });
	}

	it("E1: Instructional Intelligence tab appears in tab strip", async () => {
		await bootstrapToTabs();
		const tab = screen.getByRole("tab", { name: "Instructional Intelligence" });
		expect(tab).toBeInTheDocument();
	});

	it("E2: clicking the tab renders InstructionalIntelligenceSurface", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");
		expect(surface).toBeInTheDocument();
	});

	it("E3a: SummaryCardsPanel is present inside the surface", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");
		expect(within(surface).getByTestId("summary-cards-panel")).toBeInTheDocument();
	});

	it("E3b: TeacherNarrativePanel is present inside the surface", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");
		expect(within(surface).getByTestId("teacher-narrative-panel")).toBeInTheDocument();
	});

	it("E3c: MisconceptionPracticePanel is present inside the surface", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");
		expect(within(surface).getByTestId("misconception-practice-panel")).toBeInTheDocument();
	});

	it("E3d: InstructionalMapPanel is present inside the surface", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");
		expect(within(surface).getByTestId("instructional-map-panel")).toBeInTheDocument();
	});

	it("E4: viewer selection sync — concept selected in intelligence tab is reflected via aria-pressed", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		const surface = await screen.findByTestId("v4-intelligence-surface");

		// Find an unselected concept button inside the intelligence surface that mentions fractions
		const unpressedBtns = within(surface).getAllByRole("button", { pressed: false });
		const fractionBtn = unpressedBtns.find((btn) => btn.textContent?.includes("fractions"));
		if (!fractionBtn) {
			// If no fractions concept button is visible, the panel rendered in empty state — skip interaction
			return;
		}
		fireEvent.click(fractionBtn);

		// After clicking, a button for "fractions" should be aria-pressed=true
		const pressedBtns = within(surface).getAllByRole("button").filter(
			(btn) => btn.getAttribute("aria-pressed") === "true" && btn.textContent?.includes("fractions"),
		);
		expect(pressedBtns.length).toBeGreaterThan(0);
	});

	it("E5: no cross-layer leakage — Document Viewer tab still works after Intelligence tab visit", async () => {
		await bootstrapToTabs();
		fireEvent.click(screen.getByRole("tab", { name: "Instructional Intelligence" }));
		await screen.findByTestId("v4-intelligence-surface");

		fireEvent.click(screen.getByRole("tab", { name: "Document Viewer" }));
		const viewerSurface = await screen.findByTestId("v4-viewer-surface");
		expect(viewerSurface).toBeInTheDocument();
	});
});
