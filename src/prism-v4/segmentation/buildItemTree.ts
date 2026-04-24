import type { SimulationItem } from "../schema/SimulationItem";
import type { SimulationItemTree } from "../schema/SimulationItemTree";
import { detectMultiPart } from "./detectMultiPart";
import { detectMultipleChoice } from "./detectMultipleChoice";
import { extractSubItems } from "./extractSubItems";
import { extractDistractors } from "./extractDistractors";
import { detectWritingMode } from "./writingModeDetector";
import { estimateReasoningSteps } from "./reasoningStepsEstimator";

function buildSubItem(parent: SimulationItem, itemNumber: number, text: string): SimulationItem {
  return {
    ...parent,
    itemNumber,
    text,
    isMultiPartItem: false,
    isMultipleChoice: false,
    subQuestionCount: 0,
    distractorCount: 0,
    branchingFactor: 0,
    writingMode: detectWritingMode(text),
    reasoningSteps: estimateReasoningSteps(text),
  };
}

export function buildItemTree(item: SimulationItem): SimulationItemTree {
  const text = item.text;
  const writingMode = detectWritingMode(text);
  const reasoningSteps = estimateReasoningSteps(text);

  if (detectMultiPart(text)) {
    const subItemsRaw = extractSubItems(text);
    const subItems = subItemsRaw.map((sub) => buildSubItem(item, sub.itemNumber, sub.text));

    return {
      item: {
        ...item,
        isMultiPartItem: true,
        isMultipleChoice: false,
        subQuestionCount: subItems.length,
        distractorCount: 0,
        branchingFactor: subItems.length,
        writingMode,
        reasoningSteps,
      },
      subItems,
    };
  }

  if (detectMultipleChoice(text)) {
    const distractors = extractDistractors(text);
    return {
      item: {
        ...item,
        isMultiPartItem: false,
        isMultipleChoice: true,
        subQuestionCount: 0,
        distractorCount: distractors.length,
        branchingFactor: 0,
        writingMode,
        reasoningSteps,
      },
      distractors,
    };
  }

  return {
    item: {
      ...item,
      isMultiPartItem: false,
      isMultipleChoice: false,
      subQuestionCount: 0,
      distractorCount: 0,
      branchingFactor: 0,
      writingMode,
      reasoningSteps,
    },
  };
}