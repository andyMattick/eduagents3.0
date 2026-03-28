/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { IntentProduct } from "../../../prism-v4/schema/integration/IntentProduct";
import { ProductViewer } from "../ProductViewer";

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
});