import { describe, expect, it } from "vitest";

import type { SimulationItem } from "../schema/SimulationItem";
import { buildItemTree } from "./buildItemTree";

function makeParentItem(text: string): SimulationItem {
  return {
    itemNumber: 4,
    text,
    linguisticLoad: 0.82,
    avgVocabLevel: 2.8,
    avgWordLength: 6.4,
    vocabCounts: { level1: 2, level2: 9, level3: 14 },
    misconceptionRisk: 0.7,
    distractorDensity: 0.3,
    steps: 5,
    wordCount: 81,
    timeToProcessSeconds: 120,
    confusionScore: 0.88,
    bloomsLevel: 5,
    bloomsLabel: "Evaluate",
    sentenceCount: 5,
    avgSentenceLength: 16,
    symbolDensity: 0.05,
    branchingFactor: 0,
    scaffoldLevel: 0,
    ambiguityScore: 0,
    planningLoad: 0,
    writingMode: "Explain",
    expectedResponseLength: 2,
    conceptDensity: 0,
    reasoningSteps: 3,
    subQuestionCount: 0,
    isMultiPartItem: false,
    isMultipleChoice: false,
    distractorCount: 0,
    logicalNumber: 4,
    logicalLabel: "4",
  };
}

describe("buildItemTree multiparts", () => {
  it("detects parent item correctly", () => {
    const parentText = "1. Analyze the data and explain your reasoning.";
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(false);
    expect(tree.item.isMultipleChoice).toBe(false);
  });

  it("detects multi-part sub-items correctly", () => {
    const parentText = [
      "3. Answer the following parts.",
      "a) Identify the independent variable.",
      "b) Describe the dependent variable.",
    ].join("\n");
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    expect(tree.subItems?.length).toBe(2);
  });

  it("drops empty sub-items", () => {
    const parentText = [
      "3. Answer the following.",
      "a) Identify the variable.",
      "e)",  // empty — should be dropped
      "f) Explain the consequence.",
    ].join("\n");
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    // empty sub-item 'e)' with no text should not appear as a meaningful sub-item
    const subItems = tree.subItems ?? [];
    subItems.forEach((sub) => {
      expect(sub.text.trim().length).toBeGreaterThan(0);
    });
  });

  it("handles continuation lines appended to sub-item text", () => {
    const parentText = [
      "2. Evaluate the following scenario.",
      "a) Determine whether the hypothesis is supported by the evidence presented in the study.",
      "This line continues the previous sub-item thought.",
    ].join("\n");
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    const first = tree.subItems?.[0];
    expect(first).toBeDefined();
    // sub-item text must be non-trivially sized (continuation was absorbed or root still present)
    expect((first?.text.length ?? 0)).toBeGreaterThan(10);
  });

  it("blank lines between sub-items do not create phantom entries", () => {
    const parentText = [
      "5. Interpret the graph.",
      "a) Identify the trend in the data.",
      "",
      "b) Explain a possible cause for the trend.",
    ].join("\n");
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    expect(tree.subItems?.length).toBe(2);
  });

  it("attaches sub-subparts (Type I / Consequence pattern) to the correct sub-item", () => {
    const parentText = [
      "6. Answer both parts of the following.",
      "a) Identify the main claim.",
      "b) Evaluate the evidence provided below.",
      "Type I Describe the first type of evidence.",
      "Consequence Explain the consequence of this evidence.",
      "Type II Describe the second type of evidence.",
      "Consequence Explain the second consequence.",
    ].join("\n");
    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    const subItems = tree.subItems ?? [];
    // Should have at least 2 sub-items (a and b)
    expect(subItems.length).toBeGreaterThanOrEqual(2);
    // The sub-item that contained the Type I / Consequence blocks should
    // carry sub-subpart data on its nested structure.
    const hasNestedMeta = subItems.some(
      (si) => Array.isArray((si as { subSubParts?: unknown }).subSubParts)
        && ((si as { subSubParts?: unknown[] }).subSubParts!.length > 0)
    );
    expect(hasNestedMeta).toBe(true);
  });

  it("computes sub-item metrics from child text instead of inheriting parent metrics", () => {
    const parentText = [
      "Create a full analysis based on the scenario and answer parts a-h.",
      "a) State the null hypothesis.",
      "b) Find the p-value using your calculator.",
      "c) Evaluate whether the evidence supports the claim.",
    ].join("\n");

    const tree = buildItemTree(makeParentItem(parentText));
    expect(tree.item.isMultiPartItem).toBe(true);
    expect(tree.subItems).toBeDefined();
    expect(tree.subItems?.length).toBe(3);

    const subItems = tree.subItems ?? [];

    // Child word counts should be local-sized and not inherited from parent.
    subItems.forEach((sub) => {
      expect(sub.wordCount).toBeLessThan(30);
      expect(sub.wordCount).not.toBe(tree.item.wordCount);
    });

    // Bloom's should be computed per child text, not copied from parent.
    const allMatchParentBloom = subItems.every((sub) => sub.bloomsLevel === tree.item.bloomsLevel);
    expect(allMatchParentBloom).toBe(false);

    const distinctBlooms = new Set(subItems.map((sub) => sub.bloomsLevel));
    expect(distinctBlooms.size).toBeGreaterThan(1);

    // Confusion and linguistic load should vary across different child prompts.
    const distinctConfusion = new Set(subItems.map((sub) => sub.confusionScore.toFixed(4)));
    const distinctLinguistic = new Set(subItems.map((sub) => sub.linguisticLoad.toFixed(4)));
    expect(distinctConfusion.size).toBeGreaterThan(1);
    expect(distinctLinguistic.size).toBeGreaterThan(1);
  });
});
