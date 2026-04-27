/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrintProductPage } from "../PrintProductPage";

function jsonResponse(payload: unknown, ok = true) {
  const body = JSON.stringify(payload);
  return {
    ok,
    text: async () => body,
    json: async () => payload,
  };
}

describe("PrintProductPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("loads a product by productId and opens the browser print dialog", async () => {
    window.history.replaceState({}, "", "/print/product-test-1?returnTo=%2F");
    const printMock = vi.fn();
    vi.stubGlobal("print", printMock);

    const testProduct = {
      sessionId: "session-1",
      intentType: "build-test",
      documentIds: ["doc-1"],
      productId: "product-test-1",
      productType: "build-test",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "test",
        focus: null,
        domain: "Life Science",
        title: "Assessment Draft",
        subject: "mathematics",
        gradeLevel: 7,
        overview: "This draft assessment pulls 1 item from grouped instructional units.",
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
                prompt: "What organelle performs photosynthesis?",
                concept: "decimal operations",
                sourceDocumentId: "doc-1",
                sourceFileName: "lesson-notes.docx",
                difficulty: "medium",
                cognitiveDemand: "conceptual",
                answerGuidance: "Look for chloroplast.",
              },
            ],
          },
        ],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v4/documents/intent?productId=product-test-1") {
        return jsonResponse(testProduct);
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<PrintProductPage />);

    expect((await screen.findAllByRole("heading", { name: "Assessment Draft" })).length).toBeGreaterThan(0);
    expect(screen.getByText("Domain:")).toBeInTheDocument();
    expect(screen.getByText(/Life Science/)).toBeInTheDocument();
    expect(screen.getByText("Grade 7 • Mathematics")).toBeInTheDocument();
    expect(screen.getByText("What organelle performs photosynthesis?")).toBeInTheDocument();
    expect(screen.getAllByText("What organelle performs photosynthesis?")).toHaveLength(1);
    expect(container.querySelector(".v4-print-product-test")).not.toBeNull();
    expect(screen.queryByText("Look for chloroplast.")).not.toBeInTheDocument();
    expect(screen.queryByText("RAW FRAGMENT TEXT SHOULD NOT APPEAR")).not.toBeInTheDocument();
    expect(screen.getByText("Prepared from teacher documents.")).toBeInTheDocument();
    expect(screen.getAllByText("Prepared from teacher documents.")).toHaveLength(1);
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decimal Operations" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("Assessment DraftAssessment Draft");

    fireEvent.click(screen.getByRole("checkbox", { name: "Show answer guidance" }));
  expect(screen.getByText("Teacher Notes (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Look for chloroplast.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Print or Save PDF" }));
    expect(printMock).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v4/documents/intent?productId=product-test-1"));
  });

  it("returns to the provided path when the print tab has no history", async () => {
    window.history.replaceState({}, "", "/print/product-test-1?returnTo=%2F");

    const testProduct = {
      sessionId: "session-1",
      intentType: "build-test",
      documentIds: ["doc-1"],
      productId: "product-test-1",
      productType: "build-test",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "test",
        focus: null,
        domain: "Life Science",
        title: "Assessment Draft",
        overview: "This draft assessment pulls 1 item from grouped instructional units.",
        estimatedDurationMinutes: 10,
        totalItemCount: 1,
        sections: [
          {
            concept: "photosynthesis",
            sourceDocumentIds: ["doc-1"],
            items: [
              {
                itemId: "item-1",
                prompt: "What organelle performs photosynthesis?",
                concept: "photosynthesis",
                sourceDocumentId: "doc-1",
                sourceFileName: "lesson-notes.docx",
                difficulty: "medium",
                cognitiveDemand: "conceptual",
                answerGuidance: "Look for chloroplast.",
              },
            ],
          },
        ],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(testProduct)));
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);

    render(<PrintProductPage />);

    expect((await screen.findAllByRole("heading", { name: "Assessment Draft" })).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(window.location.pathname).toBe("/");
  });
});
