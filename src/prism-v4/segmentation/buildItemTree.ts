import type { SimulationItem } from "../schema/SimulationItem";
import type { SimulationItemTree } from "../schema/SimulationItemTree";
import { detectMultiPart } from "./detectMultiPart";
import { detectMultipleChoice } from "./detectMultipleChoice";
import { extractSubItems } from "./extractSubItems";
import { extractDistractors } from "./extractDistractors";
import { detectWritingMode } from "./writingModeDetector";
import { estimateReasoningSteps } from "./reasoningStepsEstimator";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 1;
  const withoutTrailingE = cleaned.endsWith("e") ? cleaned.slice(0, -1) : cleaned;
  const matches = withoutTrailingE.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

function computeSubItemMetrics(parent: SimulationItem, text: string): Pick<SimulationItem,
  "wordCount" |
  "steps" |
  "timeToProcessSeconds" |
  "avgVocabLevel" |
  "avgWordLength" |
  "vocabCounts" |
  "linguisticLoad" |
  "misconceptionRisk" |
  "distractorDensity" |
  "confusionScore" |
  "sentenceCount" |
  "avgSentenceLength" |
  "symbolDensity" |
  "writingMode" |
  "reasoningSteps" |
  "expectedResponseLength"
> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const wordCount = Math.max(words.length, 1);
  const levels = words.map((word) => {
    const syllables = countSyllables(word);
    if (syllables <= 1) return 1;
    if (syllables === 2) return 2;
    return 3;
  });

  const vocabCounts = {
    level1: levels.filter((level) => level === 1).length,
    level2: levels.filter((level) => level === 2).length,
    level3: levels.filter((level) => level === 3).length,
  };

  const avgVocabLevel = levels.length > 0
    ? levels.reduce((sum, level) => sum + level, 0) / levels.length
    : 1;
  const avgWordLength = words.length > 0
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 4;

  const normalizedVocab = (avgVocabLevel - 1) / 2;
  const normalizedWordLen = Math.min(avgWordLength / 10, 1);
  const linguisticLoad = clamp01(0.6 * normalizedVocab + 0.4 * normalizedWordLen);

  const reasoningSteps = Math.max(estimateReasoningSteps(text), 0);
  const steps = Math.max(reasoningSteps, 1);
  const timeToProcessSeconds = Math.max(5, Math.round(wordCount / 3.3 + steps * 8));

  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10;

  const symbolCount = (text.match(/[+\-*/=<>()[\]{}\^%÷×∑∫√≤≥≠±]/g) ?? []).length;
  const symbolDensity = Math.min(symbolCount / Math.max(text.length, 1), 1);

  const misconceptionRisk = clamp01((parent.misconceptionRisk ?? 0) * (0.6 + 0.4 * linguisticLoad));
  const distractorDensity = detectMultipleChoice(text) ? parent.distractorDensity : 0;
  const stepsNorm = Math.min(steps / 5, 1);
  const timeNorm = Math.min(timeToProcessSeconds / 30, 1);
  const confusionScore = clamp01(
    0.4 * linguisticLoad
    + 0.2 * distractorDensity
    + 0.15 * stepsNorm
    + 0.15 * misconceptionRisk
    + 0.1 * timeNorm,
  );

  const writingMode = detectWritingMode(text) || parent.writingMode;

  return {
    wordCount,
    steps,
    timeToProcessSeconds,
    avgVocabLevel,
    avgWordLength,
    vocabCounts,
    linguisticLoad,
    misconceptionRisk,
    distractorDensity,
    confusionScore,
    sentenceCount,
    avgSentenceLength,
    symbolDensity,
    writingMode,
    reasoningSteps,
    expectedResponseLength: 0,
  };
}

function buildSubItem(parent: SimulationItem, itemNumber: number, text: string): SimulationItem {
  const subMetrics = computeSubItemMetrics(parent, text);

  return {
    ...parent,
    ...subMetrics,
    itemNumber,
    text,
    isMultiPartItem: false,
    isMultipleChoice: false,
    subQuestionCount: 0,
    distractorCount: 0,
    branchingFactor: 0,
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