/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentsPage } from "../DocumentsPage";

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DocumentsPage", () => {
  it("opens a saved test document in base-only mode", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      documents: [
        {
          documentId: "doc-test-1",
          sourceFileName: "Unit 4 Test.pdf",
          createdAt: "2026-05-12T00:00:00.000Z",
          docType: "problem",
          declaredRole: "test",
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();

    render(<DocumentsPage navigate={navigate} />);

    await waitFor(() => expect(screen.getByText("Unit 4 Test.pdf")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Open Unit 4 Test.pdf in simulation" }));

    expect(navigate).toHaveBeenCalledWith("/simulation?documentId=doc-test-1&mode=base");
  });

  it("shows an attach companions action for saved test documents", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      documents: [
        {
          documentId: "doc-test-1",
          sourceFileName: "Unit 4 Test.pdf",
          createdAt: "2026-05-12T00:00:00.000Z",
          docType: "problem",
          declaredRole: "test",
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();

    render(<DocumentsPage navigate={navigate} />);

    await waitFor(() => expect(screen.getByText("Unit 4 Test.pdf")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Attach saved companion docs to Unit 4 Test.pdf" }));

    expect(navigate).toHaveBeenCalledWith("/simulation?documentId=doc-test-1&mode=companions");
  });
});