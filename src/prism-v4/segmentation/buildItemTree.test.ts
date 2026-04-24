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
