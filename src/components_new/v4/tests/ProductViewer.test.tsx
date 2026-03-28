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
});