import type { SimulationItem } from "../schema/SimulationItem";
import type { SimulationItemTree, SimulationSubItem } from "../schema/SimulationItemTree";
import { detectMultiPart } from "./detectMultiPart";
import { detectMultipleChoice } from "./detectMultipleChoice";
import { extractSubItemsWithNesting } from "./extractSubItems";
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

const BLOOMS_KEYWORDS = {
  create: ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
  evaluate: ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
  analyze: ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
  apply: ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out", "find"],
  understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate", "state", "name"],
  remember: ["identify", "list", "define", "recall", "label", "match", "select", "recognize", "repeat", "choose", "underline", "point", "circle", "highlight"],
} as const;

function computeBloomsLevel(text: string): { level: number; label: string } {
  const lower = text.toLowerCase();
  const hit = (keywords: readonly string[]) => keywords.some((keyword) => lower.includes(keyword));

  if (hit(BLOOMS_KEYWORDS.create)) return { level: 6, label: "Create" };
  if (hit(BLOOMS_KEYWORDS.evaluate)) return { level: 5, label: "Evaluate" };
  if (hit(BLOOMS_KEYWORDS.analyze)) return { level: 4, label: "Analyze" };
  if (hit(BLOOMS_KEYWORDS.apply)) return { level: 3, label: "Apply" };
  if (hit(BLOOMS_KEYWORDS.understand)) return { level: 2, label: "Understand" };
  if (hit(BLOOMS_KEYWORDS.remember)) return { level: 1, label: "Remember" };
  return { level: 2, label: "Understand" };
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
  "bloomsLevel" |
  "bloomsLabel" |
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
  const { level: bloomsLevel, label: bloomsLabel } = computeBloomsLevel(text);

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
    bloomsLevel,
    bloomsLabel,
    writingMode,
    reasoningSteps,
    expectedResponseLength: 0,
  };
}

function buildSubItem(
  parent: SimulationItem,
  args: {
    itemNumber: number;
    text: string;
    logicalLabel: string;
    groupId: string;
    partIndex: number;
    itemId: string;
  }
): SimulationSubItem {
  const subMetrics = computeSubItemMetrics(parent, args.text);
  const logicalNumber = parent.logicalNumber ?? parent.itemNumber;

  return {
    ...parent,
    ...subMetrics,
    itemNumber: parent.itemNumber,
    logicalNumber,
    logicalLabel: args.logicalLabel,
    text: args.text,
    isMultiPartItem: false,
    isMultipleChoice: false,
    subQuestionCount: 0,
    distractorCount: 0,
    branchingFactor: 0,
    itemId: args.itemId,
    groupId: args.groupId,
    partIndex: args.partIndex,
  };
}

export function buildItemTree(item: SimulationItem): SimulationItemTree {
  const text = item.text;
  const writingMode = detectWritingMode(text);
  const reasoningSteps = estimateReasoningSteps(text);

  if (detectMultiPart(text)) {
    const subItemsRaw = extractSubItemsWithNesting(text);
    const subItems: SimulationSubItem[] = subItemsRaw.map((sub) => {
      const built = buildSubItem(item, {
        itemNumber: sub.itemNumber,
        text: sub.text.trim(),
        logicalLabel: sub.logicalLabel,
        groupId: sub.groupId,
        partIndex: sub.partIndex,
        itemId: sub.itemId,
      });
      // Attach structured nesting data as metadata without breaking SimulationItem shape.
      built.letter = sub.letter;
      built.subSubParts = sub.subSubParts;
      return built;
    });

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