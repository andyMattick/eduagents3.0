/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BlueprintMetrics } from "../BlueprintMetrics";
import PreparednessPageV2 from "../preparedness_v2/PreparednessPageV2";
import type { AssessmentDocument, PrepDocument } from "../../../prism-v4/schema/domain/Preparedness";

const getAlignmentMock = vi.fn();

vi.mock("../../../services_new/preparednessService", () => ({
  getAlignment: (...args: unknown[]) => getAlignmentMock(...args),
  generatePreparednessReviewPacket: vi.fn(),
  generatePreparednessTestFromReview: vi.fn(),
  generatePreparednessPracticeItem: vi.fn(),
  generatePreparednessReviewSnippet: vi.fn(),
  rewritePreparednessQuestion: vi.fn(),
  rewritePreparednessQuestionToDifficulty: vi.fn(),
}));

const prep: PrepDocument = {
  title: "Prep Document",
  rawText: "Paragraph one with enough detail.\n\nParagraph two with fractions practice.\n\nParagraph three with examples.\n\nParagraph four with models.\n\nParagraph five with checks for understanding.",
};

const assessment: AssessmentDocument = {
  title: "Assessment",
  items: [
    { itemNumber: 1, text: "Compare 1/2 and 3/4." },
    { itemNumber: 2, text: "Explain why equivalent fractions are equal." },
  ],
};

describe("Preparedness alignment flow", () => {
  beforeEach(() => {
    getAlignmentMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders wrapped alignment payloads without requiring top-level coveredItems", async () => {
    getAlignmentMock.mockResolvedValue({
      alignment: {
        debug: {
          prepDifficulty: 3,
          teacherSummary: "Most items are covered, with one concept gap.",
          testItems: [
            {
              questionNumber: 1,
              questionText: "Compare 1/2 and 3/4.",
              concepts: ["fractions"],
              alignment: "covered",
              difficulty: 2,
              explanation: "Students compare benchmark fractions.",
            },
          ],
        },
      },
    });

    render(<PreparednessPageV2 prep={prep} assessment={assessment} />);

    expect(screen.getByText("Running alignment…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Teacher Summary")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Most items are covered, with one concept gap.")).toHaveLength(2);
    expect(screen.getByText("Compare 1/2 and 3/4.")).toBeInTheDocument();
    expect(getAlignmentMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the analysis screen mounted across collapse toggles", async () => {
    getAlignmentMock.mockResolvedValue({
      coveredItems: [],
      uncoveredItems: [
        {
          assessmentItemNumber: 1,
          concepts: [{ label: "fractions", count: 1, difficulties: [2] }],
          difficulty: 2,
          prepDifficulty: 2,
          alignment: "missing_in_prep",
        },
      ],
      debug: {
        prepDifficulty: 2,
        teacherSummary: "One item still needs prep support.",
        testItems: [
          {
            questionNumber: 1,
            questionText: "Compare 1/2 and 3/4.",
            concepts: ["fractions"],
            alignment: "uncovered",
            difficulty: 2,
            explanation: "The prep set does not model this comparison explicitly.",
          },
        ],
      },
    });

    render(<BlueprintMetrics prep={prep} assessment={assessment} />);

    expect(getAlignmentMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /concept & difficulty analysis/i }));

    await waitFor(() => {
      expect(screen.getByText("Teacher Summary")).toBeInTheDocument();
    });

    expect(getAlignmentMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /concept & difficulty analysis/i }));
    fireEvent.click(screen.getByRole("button", { name: /concept & difficulty analysis/i }));

    await waitFor(() => {
      expect(screen.getByText("Teacher Summary")).toBeInTheDocument();
    });

    expect(getAlignmentMock).toHaveBeenCalledTimes(1);
  });
});