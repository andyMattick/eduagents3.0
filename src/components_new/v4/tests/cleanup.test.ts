import { describe, expect, it } from "vitest";

import { cleanupProductPayload } from "../utils/cleanup";

describe("cleanupProductPayload", () => {
  it("dedupes repeated lesson content across strings and segments", () => {
    const product = {
      kind: "lesson" as const,
      focus: null,
      title: "Lesson Builder: Photosynthesis",
      learningObjectives: [
        "Students will explain photosynthesis.",
        "Students will explain photosynthesis.",
      ],
      prerequisiteConcepts: ["chloroplast", " chloroplast "],
      warmUp: [],
      conceptIntroduction: [
        {
          title: "Key Idea 1",
          description: "Photosynthesis occurs in the chloroplast.\nPhotosynthesis occurs in the chloroplast.",
          documentId: "doc-1",
          sourceFileName: "lesson-notes.docx",
          anchorNodeIds: ["a1"],
          concepts: ["photosynthesis"],
        },
        {
          title: "Key Idea 1",
          description: "Photosynthesis occurs in the chloroplast.",
          documentId: "doc-1",
          sourceFileName: "lesson-notes.docx",
          anchorNodeIds: ["a2"],
          concepts: ["photosynthesis"],
        },
      ],
      guidedPractice: [],
      independentPractice: [],
      exitTicket: [],
      misconceptions: [
        { trigger: "Missing sunlight", correction: "Add a light source.", documentIds: ["doc-1"] },
        { trigger: "Missing sunlight", correction: "Add a light source.", documentIds: ["doc-1", "doc-2"] },
      ],
      scaffolds: [
        { concept: "photosynthesis", level: "medium" as const, strategy: "Model the first example.", documentIds: ["doc-1"] },
        { concept: "photosynthesis", level: "high" as const, strategy: "Model the first example.", documentIds: ["doc-2"] },
      ],
      extensions: ["Extend with plant cells.", "Extend with plant cells."],
      teacherNotes: [
        "Watch for students confusing chloroplast and mitochondria.",
        "Watch for students confusing chloroplast and mitochondria.",
      ],
      sourceAnchors: [],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };

    const cleaned = cleanupProductPayload(product);
    if (cleaned.kind !== "lesson") {
      throw new Error("expected lesson payload");
    }

    expect(cleaned.learningObjectives).toHaveLength(1);
    expect(cleaned.prerequisiteConcepts).toEqual(["chloroplast"]);
    expect(cleaned.conceptIntroduction).toHaveLength(1);
    expect(cleaned.conceptIntroduction[0]?.description).toBe("Photosynthesis occurs in the chloroplast.");
    expect(cleaned.scaffolds).toHaveLength(1);
    expect(cleaned.teacherNotes).toHaveLength(1);
    expect(cleaned.misconceptions).toHaveLength(1);
  });

  it("dedupes repeated test items by prompt and recalculates totals", () => {
    const product = {
      kind: "test" as const,
      focus: null,
      title: "Assessment Draft",
      overview: "Assess proportional reasoning.\nAssess proportional reasoning.",
      estimatedDurationMinutes: 10,
      totalItemCount: 3,
      sections: [
        {
          concept: " proportional relationships ",
          sourceDocumentIds: ["doc-1"],
          items: [
            {
              itemId: "item-1",
              prompt: "What organelle performs photosynthesis?",
              concept: "photosynthesis",
              sourceDocumentId: "doc-1",
              sourceFileName: "lesson-notes.docx",
              difficulty: "medium" as const,
              cognitiveDemand: "conceptual" as const,
              answerGuidance: "Look for chloroplast.\nLook for chloroplast.",
            },
            {
              itemId: "item-2",
              prompt: "What organelle performs photosynthesis?",
              concept: "photosynthesis",
              sourceDocumentId: "doc-2",
              sourceFileName: "practice.pdf",
              difficulty: "medium" as const,
              cognitiveDemand: "conceptual" as const,
              answerGuidance: "Look for chloroplast.",
            },
          ],
        },
        {
          concept: "percent increase",
          sourceDocumentIds: ["doc-2"],
          items: [],
        },
      ],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };

    const cleaned = cleanupProductPayload(product);
    if (cleaned.kind !== "test") {
      throw new Error("expected test payload");
    }

    expect(cleaned.overview).toBe("Assess proportional reasoning.");
    expect(cleaned.sections).toHaveLength(1);
    expect(cleaned.sections[0]?.items).toHaveLength(1);
    expect(cleaned.sections[0]?.concept).toBe("proportional relationships");
    expect(cleaned.sections[0]?.items[0]?.answerGuidance).toBe("Look for chloroplast.");
    expect(cleaned.totalItemCount).toBe(1);
  });
});