/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IntentProduct } from "../../../prism-v4/schema/integration/IntentProduct";
import type { ClassProfileModel } from "../../../types/v4/InstructionalSession";
import { ProductViewer } from "../ProductViewer";

function buildSessionBlueprintResponse() {
  return {
    sessionId: "session-1",
    assessmentId: "product-test-1",
    teacherId: "00000000-0000-4000-8000-000000000001",
    blueprint: {
      concepts: [{ id: "decimal-operations", name: "decimal operations", order: 0, included: true, quota: 1 }],
      bloomLadder: [{ level: "understand", count: 1 }],
      difficultyRamp: [{ band: "medium", count: 1 }],
      modeMix: [{ mode: "compare", count: 1 }],
      scenarioMix: [{ scenario: "abstract-symbolic", count: 1 }],
    },
    conceptMap: {
      nodes: [{ id: "decimal-operations", label: "decimal operations", weight: 1 }],
      edges: [],
    },
  };
}

function buildBuilderPlanResponse() {
  return {
    sessionId: "session-1",
    builderPlan: {
      sections: [{
        conceptId: "decimal-operations",
        conceptName: "decimal operations",
        itemCount: 1,
        bloomSequence: ["understand"],
        difficultySequence: ["medium"],
        modeSequence: ["compare"],
        scenarioSequence: ["abstract-symbolic"],
      }],
      adaptiveTargets: {
        boostedConcepts: ["decimal-operations"],
        suppressedConcepts: [],
        boostedBloom: ["understand"],
        suppressedBloom: ["analyze"],
      },
    },
  };
}

function buildAssessmentPreviewResponse() {
  return {
    sessionId: "session-1",
    assessmentPreview: {
      items: [{
        itemId: "item-1",
        stem: "Compare the decimals 0.41 and 0.35.",
        answer: "Look for place value reasoning.",
        conceptId: "decimal-operations",
        bloom: "understand",
        difficulty: "medium",
        mode: "compare",
        scenario: "abstract-symbolic",
        misconceptionTag: "digit-place-confusion",
        teacherReasons: [
          "Decimal Operations appears because the blueprint targets 1 item for this concept.",
          "understand was selected because the distribution emphasizes understanding.",
          "abstract-symbolic was kept because the fingerprint prefers abstract-symbolic scenarios.",
          "compare fits the fingerprint preference for compare.",
        ],
        studentReasons: ["This item stays symbolic to reduce reading load for the learner profile."],
      }],
    },
  };
}

function buildTeacherFingerprintResponse() {
  return {
    teacherId: "00000000-0000-4000-8000-000000000001",
    fingerprint: {
      teacherId: "00000000-0000-4000-8000-000000000001",
      modePreferences: [{ mode: "compare", count: 1 }],
      scenarioPreferences: [{ scenario: "abstract-symbolic", count: 1 }],
      bloomPreferences: [{ level: "understand", count: 1 }],
      difficultyPreferences: [],
      rawFingerprint: null,
    },
  };
}

function buildClassProfileResponse(): ClassProfileModel {
  return {
    classId: "class-1",
    students: [
      {
        studentId: "student-low",
        lastUpdated: "2026-03-29T00:00:00.000Z",
        totalEvents: 2,
        totalAssessments: 1,
        assessmentIds: ["assessment-1"],
        overallMastery: 0.33,
        overallConfidence: 0.52,
        averageResponseTimeSeconds: 9,
        conceptMastery: { fractions: 0.32 },
        conceptExposure: { fractions: 2 },
        bloomMastery: { understand: 0.3 },
        modeMastery: { compare: 0.4 },
        scenarioMastery: { "abstract-symbolic": 0.3 },
        conceptBloomMastery: { fractions: { understand: 0.3 } },
        conceptModeMastery: { fractions: { compare: 0.4 } },
        conceptScenarioMastery: { fractions: { "abstract-symbolic": 0.3 } },
        conceptAverageResponseTimeSeconds: { fractions: 9 },
        conceptConfidence: { fractions: 0.52 },
        misconceptions: { fractions: [{ misconceptionKey: "denominator-swap", occurrences: 2, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["1/4 + 1/3 = 2/7"], relatedBloomLevels: ["understand"], relatedModes: ["compare"] }] },
      },
      {
        studentId: "student-high",
        lastUpdated: "2026-03-29T00:00:00.000Z",
        totalEvents: 3,
        totalAssessments: 1,
        assessmentIds: ["assessment-1"],
        overallMastery: 0.81,
        overallConfidence: 0.7,
        averageResponseTimeSeconds: 6,
        conceptMastery: { fractions: 0.84 },
        conceptExposure: { fractions: 3 },
        bloomMastery: { understand: 0.8 },
        modeMastery: { compare: 0.7 },
        scenarioMastery: { "abstract-symbolic": 0.8 },
        conceptBloomMastery: { fractions: { understand: 0.8 } },
        conceptModeMastery: { fractions: { compare: 0.7 } },
        conceptScenarioMastery: { fractions: { "abstract-symbolic": 0.8 } },
        conceptAverageResponseTimeSeconds: { fractions: 6 },
        conceptConfidence: { fractions: 0.7 },
        misconceptions: {},
      },
    ],
    conceptClusters: [
      { conceptId: "fractions", low: ["student-low"], mid: [], high: ["student-high"] },
    ],
    misconceptionClusters: [
      { misconception: "denominator-swap", students: ["student-low"] },
    ],
  };
}

function findFetchCall(fetchMock: ReturnType<typeof vi.fn>, url: string) {
  return fetchMock.mock.calls.find((call) => String(call[0]) === url);
}

function buildAssessmentProduct() {
  return {
    sessionId: "session-1",
    intentType: "build-test",
    documentIds: ["doc-1"],
    productId: "product-test-1",
    productType: "build-test",
    schemaVersion: "wave3-v1",
    payload: {
      kind: "test",
      focus: null,
      domain: "Mathematics",
      title: "Assessment Draft",
      overview: "This draft assessment includes 1 item focused on Decimal Operations.",
      estimatedDurationMinutes: 10,
      totalItemCount: 1,
      sections: [
        {
          concept: "decimal operations",
          sourceDocumentIds: ["doc-1"],
          items: [
            {
              itemId: "item-1",
              prompt: "Compare the decimals 0.4 and 0.35.",
              concept: "decimal operations",
              sourceDocumentId: "doc-1",
              sourceFileName: "decimals.pdf",
              difficulty: "medium",
              cognitiveDemand: "conceptual",
              answerGuidance: "Look for place value reasoning.",
            },
          ],
        },
      ],
      generatedAt: "2025-01-01T00:00:00.000Z",
    },
    createdAt: "2025-01-01T00:00:00.000Z",
  } as IntentProduct;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProductViewer", () => {
  it("renders the inferred domain when present", () => {
    const product: IntentProduct<"summarize"> = {
      sessionId: "session-1",
      intentType: "summarize",
      documentIds: ["doc-1"],
      productId: "product-summary-1",
      productType: "summarize",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "summary",
        focus: null,
        domain: "General Instruction",
        overallSummary: "Students are working on ecosystem interactions.",
        documents: [
          {
            documentId: "doc-1",
            sourceFileName: "ecosystems-notes.pdf",
            summary: "Notes about food webs and habitats.",
            keyConcepts: ["food webs"],
            problemCount: 2,
            instructionalProfile: {
              exampleCount: 1,
              explanationCount: 1,
              questionCount: 0,
            },
          },
        ],
        crossDocumentTakeaways: ["Habitat relationships recur across the materials."],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    render(<ProductViewer product={product} />);

    expect(screen.getByText(/Domain:/i)).toBeInTheDocument();
    expect(screen.getByText(/General Instruction/)).toBeInTheDocument();
    expect(screen.getByText("Students are working on ecosystem interactions.")).toBeInTheDocument();
  });

  it("renders test section headers in title case without exposing raw fragment text in print mode", () => {
    const product = {
      sessionId: "session-1",
      intentType: "build-test",
      documentIds: ["doc-1"],
      productId: "product-test-1",
      productType: "build-test",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "test",
        focus: null,
        domain: "Mathematics",
        title: "Assessment Draft",
        overview: "This draft assessment includes 1 item focused on Decimal Operations.",
        estimatedDurationMinutes: 10,
        totalItemCount: 1,
        debugRawFragments: ["RAW FRAGMENT TEXT SHOULD NOT APPEAR"],
        sections: [
          {
            concept: "decimal operations",
            sourceDocumentIds: ["doc-1"],
            items: [
              {
                itemId: "item-1",
                prompt: "Compare the decimals 0.4 and 0.35.",
                concept: "decimal operations",
                sourceDocumentId: "doc-1",
                sourceFileName: "decimals.pdf",
                difficulty: "medium",
                cognitiveDemand: "conceptual",
                answerGuidance: "Look for place value reasoning.",
              },
            ],
          },
        ],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    } as IntentProduct;

    render(<ProductViewer product={product} variant="print" />);

    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decimal Operations" })).toBeInTheDocument();
    expect(screen.getAllByText(/Compare the decimals 0\.\s*4 and 0\.\s*35\./)).toHaveLength(1);
    expect(screen.queryByText("RAW FRAGMENT TEXT SHOULD NOT APPEAR")).not.toBeInTheDocument();
  });

  it("previews a fingerprint-conditioned assessment and renders item explanations in app mode", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url.startsWith("/api/v4/teacher-feedback/assessment-blueprint?assessmentId=")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Assessment fingerprint not found" }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          explanation: { narrative: "This assessment matches the teacher fingerprint." },
          preview: {
            kind: "test",
            focus: null,
            domain: "Mathematics",
            title: "Assessment Draft",
            overview: "Previewed assessment.",
            estimatedDurationMinutes: 10,
            totalItemCount: 1,
            sections: [
              {
                concept: "decimal operations",
                sourceDocumentIds: ["doc-1"],
                items: [
                  {
                    itemId: "item-1",
                    prompt: "Compare the decimals 0.41 and 0.35.",
                    concept: "decimal operations",
                    sourceDocumentId: "doc-1",
                    sourceFileName: "decimals.pdf",
                    difficulty: "medium",
                    cognitiveDemand: "conceptual",
                    answerGuidance: "Look for place value reasoning.",
                    explanation: {
                      conceptId: "decimal-operations",
                      conceptReason: "Decimal Operations appears because the blueprint targets 1 item for this concept.",
                      bloomLevel: "understand",
                      bloomReason: "understand was selected because the distribution emphasizes understanding.",
                      scenarioTypes: ["abstract-symbolic"],
                      scenarioReason: "abstract-symbolic was kept because the fingerprint prefers abstract-symbolic scenarios.",
                      itemModes: ["compare"],
                      itemModeReason: "compare fits the fingerprint preference for compare.",
                      narrative: "Explanation narrative.",
                    },
                  },
                ],
              },
            ],
            generatedAt: "2025-01-01T00:00:00.000Z",
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const product = buildAssessmentProduct();

    render(<ProductViewer product={product} sessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Load Saved Draft" })).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText("decimal operations item count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("decimal operations bloom ceiling"), { target: { value: "apply" } });
    fireEvent.click(screen.getByRole("button", { name: "decimal operations scenario simulation" }));
    fireEvent.change(screen.getByLabelText("decimal operations bloom distribution understand"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Concept" }));
    fireEvent.change(screen.getByLabelText("Added concept 1 display name"), { target: { value: "Percent Increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 concept id"), { target: { value: "percent-increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 item count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 bloom ceiling"), { target: { value: "analyze" } });
    fireEvent.click(screen.getByRole("button", { name: "Added concept 1 scenario real-world" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Merge" }));
    fireEvent.change(screen.getByLabelText("Merge 1 source concepts"), { target: { value: "decimal operations, percent-increase" } });
    fireEvent.change(screen.getByLabelText("Merge 1 merged concept id"), { target: { value: "number-sense" } });
    fireEvent.change(screen.getByLabelText("Merge 1 display name"), { target: { value: "Number Sense" } });

    fireEvent.click(screen.getByRole("button", { name: "Preview Fingerprint Build" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback/concept-verification-preview",
      expect.objectContaining({ method: "POST" }),
    ));

    const previewCall = findFetchCall(fetchMock, "/api/v4/teacher-feedback/concept-verification-preview");
    const previewRequest = JSON.parse(String(previewCall?.[1]?.body ?? "{}"));
    expect(previewRequest.options.conceptBlueprint.edits).toMatchObject({
      itemCountOverrides: { "decimal operations": 2 },
      bloomCeilings: { "decimal operations": "apply" },
      bloomDistributions: { "decimal operations": { understand: 2 } },
      scenarioOverrides: { "decimal operations": ["simulation"] },
      addConcepts: [{
        displayName: "Percent Increase",
        conceptId: "percent-increase",
        absoluteItemHint: 2,
        maxBloomLevel: "analyze",
        scenarioPatterns: ["real-world"],
      }],
      mergeConcepts: [{
        conceptIds: ["decimal operations", "percent-increase"],
        mergedConceptId: "number-sense",
        displayName: "Number Sense",
      }],
      sectionOrder: ["decimal operations"],
    });

    expect(await screen.findByText("Previewed assessment.")).toBeInTheDocument();
    expect(screen.getByText("This assessment matches the teacher fingerprint.")).toBeInTheDocument();
    expect(screen.getByText(/understand was selected/i)).toBeInTheDocument();
    expect(screen.getByText(/compare fits the fingerprint preference/i)).toBeInTheDocument();
  });

  it("shows a resulting draft summary for merged and added concepts before preview", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "Assessment fingerprint not found" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const product = buildAssessmentProduct();
    render(<ProductViewer product={product} sessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Load Saved Draft" })).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText("decimal operations item count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("decimal operations bloom ceiling"), { target: { value: "apply" } });
    fireEvent.change(screen.getByLabelText("decimal operations bloom distribution understand"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "decimal operations scenario simulation" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Concept" }));
    fireEvent.change(screen.getByLabelText("Added concept 1 display name"), { target: { value: "Percent Increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 concept id"), { target: { value: "percent-increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 item count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 bloom ceiling"), { target: { value: "analyze" } });
    fireEvent.click(screen.getByRole("button", { name: "Added concept 1 scenario real-world" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Merge" }));
    fireEvent.change(screen.getByLabelText("Merge 1 source concepts"), { target: { value: "decimal operations, percent-increase" } });
    fireEvent.change(screen.getByLabelText("Merge 1 merged concept id"), { target: { value: "number-sense" } });
    fireEvent.change(screen.getByLabelText("Merge 1 display name"), { target: { value: "Number Sense" } });

    expect(screen.getByRole("heading", { name: "Resulting Draft Summary" })).toBeInTheDocument();
    expect(screen.getByText("Final order: Number Sense.")).toBeInTheDocument();
    expect(screen.getByText("Target items across resulting sections: 4.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Number Sense" })).toBeInTheDocument();
    expect(screen.getByText("Sources: decimal operations, Percent Increase")).toBeInTheDocument();
    expect(screen.getByText("Bloom ceiling: Analyze.")).toBeInTheDocument();
    expect(screen.getByText("Bloom distribution: Understand x2.")).toBeInTheDocument();
    expect(screen.getByText("Scenario preferences: Simulation, Real World.")).toBeInTheDocument();
    expect(screen.getByText("Merged")).toBeInTheDocument();
  });

  it("calls regenerate item and section endpoints from the assessment viewer", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url.startsWith("/api/v4/teacher-feedback/assessment-blueprint?assessmentId=")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Assessment fingerprint not found" }),
        };
      }
      if (url === "/api/v4/teacher-feedback/concept-verification-preview") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            explanation: { narrative: "Preview explanation." },
            preview: {
              kind: "test",
              focus: null,
              domain: "Mathematics",
              title: "Assessment Draft",
              overview: "Previewed assessment.",
              estimatedDurationMinutes: 10,
              totalItemCount: 1,
              sections: [{
                concept: "decimal operations",
                sourceDocumentIds: ["doc-1"],
                items: [{
                  itemId: "item-1",
                  prompt: "Compare the decimals 0.41 and 0.35.",
                  concept: "decimal operations",
                  sourceDocumentId: "doc-1",
                  sourceFileName: "decimals.pdf",
                  difficulty: "medium",
                  cognitiveDemand: "conceptual",
                  answerGuidance: "Look for place value reasoning.",
                  explanation: {
                    conceptId: "decimal-operations",
                    conceptReason: "Reason",
                    bloomLevel: "understand",
                    bloomReason: "Bloom reason",
                    scenarioTypes: ["abstract-symbolic"],
                    scenarioReason: "Scenario reason",
                    itemModes: ["compare"],
                    itemModeReason: "Mode reason",
                    narrative: "Narrative",
                  },
                }],
              }],
              generatedAt: "2025-01-01T00:00:00.000Z",
            },
          }),
        };
      }
      if (url === "/api/v4/teacher-feedback/regenerate-item") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            replacementItem: {
              itemId: "item-1-regen-1",
              prompt: "Compare the decimals 0.42 and 0.35.",
              concept: "decimal operations",
              sourceDocumentId: "doc-1",
              sourceFileName: "decimals.pdf",
              difficulty: "medium",
              cognitiveDemand: "conceptual",
              answerGuidance: "Look for place value reasoning.",
              explanation: {
                conceptId: "decimal-operations",
                conceptReason: "Reason",
                bloomLevel: "understand",
                bloomReason: "Bloom reason",
                scenarioTypes: ["abstract-symbolic"],
                scenarioReason: "Scenario reason",
                itemModes: ["compare"],
                itemModeReason: "Mode reason",
                narrative: "Narrative",
              },
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          replacementSection: {
            concept: "decimal operations",
            sourceDocumentIds: ["doc-1"],
            items: [{
              itemId: "item-1-regen-2",
              prompt: "Compare the decimals 0.43 and 0.35.",
              concept: "decimal operations",
              sourceDocumentId: "doc-1",
              sourceFileName: "decimals.pdf",
              difficulty: "medium",
              cognitiveDemand: "conceptual",
              answerGuidance: "Look for place value reasoning.",
              explanation: {
                conceptId: "decimal-operations",
                conceptReason: "Reason",
                bloomLevel: "understand",
                bloomReason: "Bloom reason",
                scenarioTypes: ["abstract-symbolic"],
                scenarioReason: "Scenario reason",
                itemModes: ["compare"],
                itemModeReason: "Mode reason",
                narrative: "Narrative",
              },
            }],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const product = buildAssessmentProduct();

    render(<ProductViewer product={product} sessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Load Saved Draft" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "Preview Fingerprint Build" }));
    await screen.findByText("Previewed assessment.");

    fireEvent.click(screen.getByRole("button", { name: "Regenerate Item" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback/regenerate-item",
      expect.objectContaining({ method: "POST" }),
    ));

    fireEvent.click(screen.getByRole("button", { name: "Regenerate Section" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback/regenerate-section",
      expect.objectContaining({ method: "POST" }),
    ));
  });

  it("saves and reloads a persisted assessment blueprint draft", async () => {
    const savedAssessment = {
      teacherId: "00000000-0000-4000-8000-000000000001",
      assessmentId: "product-test-1",
      conceptProfiles: [
        {
          conceptId: "decimal-operations",
          displayName: "decimal operations",
          frequencyWeight: 1,
          absoluteItemHint: 3,
          bloomDistribution: {
            remember: 0,
            understand: 2,
            apply: 1,
            analyze: 0,
            evaluate: 0,
            create: 0,
          },
          scenarioPatterns: ["simulation"],
          itemModes: ["compare"],
          maxBloomLevel: "apply",
        },
        {
          conceptId: "percent-increase",
          displayName: "Percent Increase",
          frequencyWeight: 0.4,
          absoluteItemHint: 2,
          bloomDistribution: {
            remember: 0,
            understand: 0,
            apply: 0,
            analyze: 1,
            evaluate: 0,
            create: 0,
          },
          scenarioPatterns: ["real-world"],
          itemModes: ["analyze"],
          maxBloomLevel: "analyze",
        },
      ],
      flowProfile: {
        sectionOrder: ["decimal-operations", "percent-increase"],
        typicalLengthRange: [1, 3],
        cognitiveLadderShape: ["understand", "apply"],
      },
      itemCount: 5,
      sourceType: "generated",
      lastUpdated: "2025-01-01T00:00:00.000Z",
      version: 2,
    };

    let assessmentBlueprintReads = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url.startsWith("/api/v4/teacher-feedback/assessment-blueprint?assessmentId=")) {
        assessmentBlueprintReads += 1;
        return assessmentBlueprintReads === 1
          ? {
              ok: false,
              status: 404,
              json: async () => ({ error: "Assessment fingerprint not found" }),
            }
          : {
              ok: true,
              status: 200,
              json: async () => ({ assessment: savedAssessment }),
            };
      }
      if (url === "/api/v4/teacher-feedback/assessment-blueprint" && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ assessment: savedAssessment }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => buildTeacherFingerprintResponse(),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const product = buildAssessmentProduct();
    render(<ProductViewer product={product} sessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Load Saved Draft" })).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText("decimal operations item count"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("decimal operations bloom ceiling"), { target: { value: "apply" } });
    fireEvent.click(screen.getByRole("button", { name: "decimal operations scenario simulation" }));
    fireEvent.change(screen.getByLabelText("decimal operations bloom distribution understand"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("decimal operations bloom distribution apply"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Concept" }));
    fireEvent.change(screen.getByLabelText("Added concept 1 display name"), { target: { value: "Percent Increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 concept id"), { target: { value: "percent-increase" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 item count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Added concept 1 bloom ceiling"), { target: { value: "analyze" } });
    fireEvent.click(screen.getByRole("button", { name: "Added concept 1 scenario real-world" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback/assessment-blueprint",
      expect.objectContaining({ method: "POST" }),
    ));

    const saveCall = findFetchCall(fetchMock, "/api/v4/teacher-feedback/assessment-blueprint");
    const saveRequest = JSON.parse(String(saveCall?.[1]?.body ?? "{}"));
    expect(saveRequest).toMatchObject({
      assessmentId: "product-test-1",
      teacherId: "00000000-0000-4000-8000-000000000001",
      edits: {
        itemCountOverrides: { "decimal operations": 3 },
        bloomCeilings: { "decimal operations": "apply" },
        bloomDistributions: { "decimal operations": { understand: 2, apply: 1 } },
        scenarioOverrides: { "decimal operations": ["simulation"] },
        addConcepts: [{
          displayName: "Percent Increase",
          conceptId: "percent-increase",
          absoluteItemHint: 2,
          maxBloomLevel: "analyze",
          scenarioPatterns: ["real-world"],
        }],
      },
    });

    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reload Saved Draft" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback/assessment-blueprint?assessmentId=product-test-1",
    ));

    expect(await screen.findByText("Saved draft loaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("decimal operations item count")).toHaveValue(3);
    expect(screen.getByLabelText("Added concept 1 display name")).toHaveValue("Percent Increase");
  });

  it("renders concept map and teacher fingerprint tabs for assessment products", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url === "/api/v4/teachers/00000000-0000-4000-8000-000000000001/fingerprint" && (!init?.method || init.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => buildTeacherFingerprintResponse(),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => buildTeacherFingerprintResponse(),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductViewer product={buildAssessmentProduct()} sessionId="session-1" />);

    expect(await screen.findByRole("heading", { name: "Blueprint Engine" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Concept Map" }));
    expect(await screen.findByRole("heading", { name: "Concept Map" })).toBeInTheDocument();
    expect(screen.getByText("decimal operations")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Teacher Fingerprint" }));
    expect(await screen.findByRole("heading", { name: "Teacher Fingerprint" })).toBeInTheDocument();
    expect(screen.getByLabelText("Teacher bloom understand")).toHaveValue(1);
  });

  it("loads a student profile and tints concept map nodes by mastery", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url === "/api/v4/students/student-1/performance") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            studentId: "student-1",
            unitId: "unit-1",
            profile: {
              studentId: "student-1",
              unitId: "unit-1",
              lastUpdated: "2026-03-29T00:00:00.000Z",
              totalEvents: 2,
              totalAssessments: 1,
              assessmentIds: ["assessment-1"],
              overallMastery: 0.45,
              overallConfidence: 0.5,
              averageResponseTimeSeconds: 1.1,
              conceptMastery: { "decimal-operations": 0.32 },
              conceptExposure: { "decimal-operations": 2 },
              bloomMastery: { understand: 0.3, apply: 0.6 },
              modeMastery: { compare: 0.4 },
              scenarioMastery: { "abstract-symbolic": 0.4 },
              conceptBloomMastery: { "decimal-operations": { understand: 0.3, apply: 0.6 } },
              conceptModeMastery: { "decimal-operations": { compare: 0.4 } },
              conceptScenarioMastery: { "decimal-operations": { "abstract-symbolic": 0.4 } },
              conceptAverageResponseTimeSeconds: { "decimal-operations": 1.1 },
              conceptConfidence: { "decimal-operations": 0.5 },
              misconceptions: { "decimal-operations": [{ misconceptionKey: "place-value-confusion", occurrences: 1, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["0.35 is larger than 0.4"], relatedBloomLevels: ["understand"], relatedModes: ["compare"] }] },
            },
            misconceptions: ["place-value-confusion"],
            exposureTimeline: [{ timestamp: "2026-03-29T00:00:00.000Z", conceptId: "decimal-operations", conceptLabel: "Decimal Operations" }],
            responseTimes: [{ itemId: "item-1", conceptId: "decimal-operations", ms: 1250 }],
          }),
        };
      }
      if (url === "/api/v4/teachers/00000000-0000-4000-8000-000000000001/fingerprint" && (!init?.method || init.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => buildTeacherFingerprintResponse(),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductViewer product={buildAssessmentProduct()} sessionId="session-1" availableStudentIds={["student-1"]} />);

    fireEvent.click(await screen.findByRole("tab", { name: "Student Brain" }));
    expect(await screen.findByRole("heading", { name: "Student Brain" })).toBeInTheDocument();
    expect(screen.getByText("place-value-confusion")).toBeInTheDocument();

    const conceptNode = screen.getByText("decimal operations").closest("li");
    expect(conceptNode).toHaveAttribute("data-mastery-band", "low");
  });

  it("loads adaptive builder plan and living assessment tabs", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      if (url === "/api/v4/sessions/session-1/builder-plan") {
        return {
          ok: true,
          status: 200,
          json: async () => buildBuilderPlanResponse(),
        };
      }
      if (url === "/api/v4/sessions/session-1/assessment-preview") {
        return {
          ok: true,
          status: 200,
          json: async () => buildAssessmentPreviewResponse(),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductViewer product={buildAssessmentProduct()} sessionId="session-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v4/sessions/session-1/blueprint"));

    fireEvent.click(screen.getByRole("tab", { name: "Builder Plan" }));

    await screen.findByText("Boosted concepts: decimal-operations.");
    expect(screen.getByText("Mode rotation: compare")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Living Assessment" }));

    await screen.findByText("Compare the decimals 0.41 and 0.35.");
    fireEvent.click(screen.getByRole("button", { name: "Explain Item" }));
    expect(await screen.findByText(/distribution emphasizes understanding/i)).toBeInTheDocument();
    expect(screen.getByText(/reduce reading load/i)).toBeInTheDocument();
  });

  it("loads a class profile and renders the class aggregate view", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v4/sessions/session-1/blueprint") {
        return {
          ok: true,
          status: 200,
          json: async () => buildSessionBlueprintResponse(),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const loadClassProfile = vi.fn(async () => buildClassProfileResponse());

    function ProductViewerHarness() {
      const [classProfile, setClassProfile] = useState<ClassProfileModel | null>(null);

      return (
        <ProductViewer
          product={buildAssessmentProduct()}
          sessionId="session-1"
          classId="class-1"
          classProfile={classProfile}
          onLoadClassProfile={async (classId) => {
            const payload = await loadClassProfile(classId);
            setClassProfile(payload);
            return payload;
          }}
        />
      );
    }

    render(<ProductViewerHarness />);

    await screen.findByRole("heading", { name: "Blueprint Engine" });
    fireEvent.click(screen.getByRole("tab", { name: "Class" }));

    await waitFor(() => expect(loadClassProfile).toHaveBeenCalledWith("class-1"));
    expect(await screen.findByRole("heading", { name: "Class Differentiator" })).toBeInTheDocument();
    expect(screen.getByText("fractions")).toBeInTheDocument();
    expect(screen.getByText("denominator-swap")).toBeInTheDocument();
  });
});