/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IntentProduct } from "../../../prism-v4/schema/integration/IntentProduct";
import { ProductViewer } from "../ProductViewer";

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

    const previewRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Assessment fingerprint not found" }),
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
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Assessment fingerprint not found" }),
      })
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
      });
    vi.stubGlobal("fetch", fetchMock);

    const product = buildAssessmentProduct();

    render(<ProductViewer product={product} sessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Load Saved Draft" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "Preview Fingerprint Build" }));
    await screen.findByText("Previewed assessment.");

    fireEvent.click(screen.getByRole("button", { name: "Regenerate Item" }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v4/teacher-feedback/regenerate-item",
      expect.objectContaining({ method: "POST" }),
    ));

    fireEvent.click(screen.getByRole("button", { name: "Regenerate Section" }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
      4,
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

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Assessment fingerprint not found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ assessment: savedAssessment }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ assessment: savedAssessment }),
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

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v4/teacher-feedback/assessment-blueprint",
      expect.objectContaining({ method: "POST" }),
    ));

    const saveRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
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

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v4/teacher-feedback/assessment-blueprint?assessmentId=product-test-1",
    ));

    expect(await screen.findByText("Saved draft loaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("decimal operations item count")).toHaveValue(3);
    expect(screen.getByLabelText("Added concept 1 display name")).toHaveValue("Percent Increase");
  });
});