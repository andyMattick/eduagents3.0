import { supabaseRest } from "../../../lib/supabase";
import type { ItemMeasurables, ItemResources, StepType } from "../phase-c/types";

type ItemRow = {
  id: string;
  item_number?: number;
  stem?: string;
  answer_key?: unknown;
  metadata?: Record<string, unknown>;
};

export type PhaseBOverrideMaps = {
  answerKeyByItem?: Record<string, string>;
  workedSolutionByItem?: Record<string, string | string[]>;
  rubricByItem?: Record<string, string>;
};

export type NormalizedPhaseBItem = {
  itemId: string;
  itemNumber?: number;
  groupId: string;
  partIndex: number;
  logicalLabel: string;
  isParent: boolean;
  resources?: ItemResources;
  measurables?: ItemMeasurables;
  traits: {
    bloomLevel: number;
    linguisticLoad: number;
    cognitiveLoad: number;
    representationLoad: number;
    vocabDensity?: number;
    symbolDensity?: number;
    steps?: number;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function hasAnswerKey(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length === 0) {
      return false;
    }

    return Object.values(record).some((entry) => {
      if (entry === null || entry === undefined) {
        return false;
      }
      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (typeof entry === "object") {
        return Object.keys(entry as Record<string, unknown>).length > 0;
      }
      return true;
    });
  }

  return true;
}

function letterToPartIndex(letter: string): number {
  const code = letter.toLowerCase().charCodeAt(0);
  if (code >= 97 && code <= 122) {
    return (code - 97) + 1;
  }
  return 0;
}

function readPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function readNumber(source: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBoolean(source: unknown, paths: string[]): boolean | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }
  }
  return undefined;
}

function readString(source: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function partIndexToSuffix(partIndex: number): string {
  if (!Number.isFinite(partIndex) || partIndex <= 0) {
    return "";
  }
  return String.fromCharCode(96 + partIndex);
}

function normalizeAnswerText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeAnswerText(entry))
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const canonical = [
      record.correct,
      record.answer,
      record.value,
      record.key,
      record.final,
      record.result,
    ];
    for (const candidate of canonical) {
      const normalized = normalizeAnswerText(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return Object.values(record)
      .map((entry) => normalizeAnswerText(entry))
      .filter(Boolean)
      .join(" | ");
  }

  return String(value).trim();
}

function normalizeOverrideKey(value: number | string | undefined | null): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "";
}

function readOverride<T>(map: Record<string, T> | undefined, itemNumber: number | undefined): T | undefined {
  if (!map || typeof itemNumber !== "number" || !Number.isFinite(itemNumber)) {
    return undefined;
  }
  const key = normalizeOverrideKey(itemNumber);
  return key ? map[key] : undefined;
}

function detectAnswerType(answer: string): "numeric" | "symbolic" | "mc" | "text" {
  const trimmed = answer.trim();
  if (!trimmed) {
    return "text";
  }

  if (/^[a-e]$/i.test(trimmed)) {
    return "mc";
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return "numeric";
  }

  if (/[=^\-+*/(){}[\]<>]/.test(trimmed)) {
    return "symbolic";
  }

  return "text";
}

function inferDistractorCount(metadata: Record<string, unknown> | undefined, answerType: "numeric" | "symbolic" | "mc" | "text"): number | undefined {
  const explicit = readNumber(metadata, [
    "distractorCount",
    "distractor_count",
    "phaseB.distractorCount",
    "phaseB.distractor_count",
  ]);

  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit);
  }

  const choices = readPath(metadata, "choices") ?? readPath(metadata, "phaseB.choices");
  if (Array.isArray(choices) && choices.length > 1) {
    return Math.max(choices.length - 1, 0);
  }

  if (answerType === "mc") {
    return 3;
  }

  return undefined;
}

function normalizeMapping(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, raw]) => [key, normalizeAnswerText(raw)] as const)
    .filter(([, normalized]) => normalized.length > 0);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function computeAnswerKeyMeasurables(
  answerKey: unknown,
  metadata: Record<string, unknown> | undefined,
): ItemMeasurables["answerKey"] {
  if (!hasAnswerKey(answerKey)) {
    return undefined;
  }

  const correctAnswer = normalizeAnswerText(answerKey);
  const answerType = detectAnswerType(correctAnswer);
  const distractorCount = inferDistractorCount(metadata, answerType);
  const distractorMapping = normalizeMapping(
    readPath(metadata, "distractorMapping")
      ?? readPath(metadata, "distractor_mapping")
      ?? readPath(metadata, "phaseB.distractorMapping")
      ?? readPath(metadata, "phaseB.distractor_mapping"),
  );
  const misconceptionIds = Array.from(new Set([
    ...(Object.values(distractorMapping ?? {})),
    ...(Array.isArray(readPath(metadata, "misconceptionIds")) ? (readPath(metadata, "misconceptionIds") as unknown[]).map((entry) => normalizeAnswerText(entry)) : []),
  ].filter(Boolean)));

  const answerAmbiguityScore = clamp01(
    (/[|/,]|\bor\b/i.test(correctAnswer) ? 0.5 : 0)
    + (correctAnswer.split(/\s+/).length > 5 ? 0.25 : 0)
    + (correctAnswer.length > 24 ? 0.25 : 0),
  );

  const answerFormatComplexity = clamp01(
    (answerType === "numeric" ? 0.2 : 0)
    + (answerType === "mc" ? 0.1 : 0)
    + (answerType === "symbolic" ? 0.55 : 0)
    + (answerType === "text" ? 0.45 : 0)
    + Math.min(correctAnswer.length / 80, 0.25),
  );

  const distractorImpact = distractorCount ? Math.min(distractorCount / 10, 0.2) : 0;
  const answerKeyDifficultyAdjustment = Number((
    (answerAmbiguityScore * 0.18)
    + (answerFormatComplexity * 0.12)
    + distractorImpact
  ).toFixed(4));
  const answerKeyPCorrectAdjustment = Number(clamp(
    -answerKeyDifficultyAdjustment * 0.55,
    -0.3,
    0.2,
  ).toFixed(4));

  return {
    hasAnswerKey: true,
    correctAnswer,
    answerType,
    distractorCount,
    distractorMapping,
    misconceptionIds: misconceptionIds.length > 0 ? misconceptionIds : undefined,
    answerAmbiguityScore: Number(answerAmbiguityScore.toFixed(4)),
    answerFormatComplexity: Number(answerFormatComplexity.toFixed(4)),
    answerKeyDifficultyAdjustment,
    answerKeyPCorrectAdjustment,
  };
}

function extractWorkedSolutionLines(row: ItemRow, metadata: Record<string, unknown> | undefined): string[] {
  const candidate =
    readPath(metadata, "workedSolution")
    ?? readPath(metadata, "worked_solution")
    ?? readPath(metadata, "phaseB.workedSolution")
    ?? readPath(metadata, "phaseB.worked_solution")
    ?? readPath(metadata, "solutionSteps")
    ?? readPath(metadata, "solution_steps");

  if (Array.isArray(candidate)) {
    return candidate.map((entry) => normalizeAnswerText(entry)).filter(Boolean);
  }

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const stem = (row.stem ?? "").trim();
  if (!stem) {
    return [];
  }

  const numbered = stem
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[\).:-]\s+/.test(line));

  return numbered.length >= 2 ? numbered : [];
}

function classifyStepType(text: string): StepType {
  const lower = text.toLowerCase();
  if (/calculate|compute|solve|simplify|substitute|evaluate/.test(lower)) {
    return "computational";
  }
  if (/infer|conclude|deduce|imply|therefore/.test(lower)) {
    return "inferential";
  }
  if (/define|concept|principle|why|because/.test(lower)) {
    return "conceptual";
  }
  if (/first|next|then|step|procedure|algorithm/.test(lower)) {
    return "procedural";
  }
  return "interpretive";
}

function extractConceptTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 5)
    .slice(0, 4);
}

function computeStepMeasurables(
  row: ItemRow,
  metadata: Record<string, unknown> | undefined,
  baseDifficulty: number,
): ItemMeasurables["steps"] {
  const lines = extractWorkedSolutionLines(row, metadata);
  if (lines.length === 0) {
    return undefined;
  }

  const stepTypes: Record<StepType, number> = {
    computational: 0,
    inferential: 0,
    conceptual: 0,
    procedural: 0,
    interpretive: 0,
  };

  const complexityByType: Record<StepType, number> = {
    computational: 0.45,
    inferential: 0.75,
    conceptual: 0.68,
    procedural: 0.55,
    interpretive: 0.6,
  };

  const transitionMap: string[] = [];
  const stepDifficultyCurve: number[] = [];
  const stepTimeCurve: number[] = [];
  const stepCognitiveLoadCurve: number[] = [];

  let symbolCount = 0;
  let characterCount = 0;

  lines.forEach((line, index) => {
    const stepType = classifyStepType(line);
    stepTypes[stepType] += 1;

    const words = line.split(/\s+/).filter(Boolean).length;
    const symbols = (line.match(/[=+\-*/^<>()[\]{}]/g) ?? []).length;
    symbolCount += symbols;
    characterCount += Math.max(line.length, 1);

    const baseStepComplexity = complexityByType[stepType];
    const positionLift = Math.min(index / Math.max(lines.length - 1, 1), 1) * 0.15;
    stepDifficultyCurve.push(Number(clamp01(baseDifficulty + baseStepComplexity * 0.35 + positionLift).toFixed(4)));
    stepTimeCurve.push(Number(Math.max(8, (words * 2.1) + (symbols * 1.8) + (baseStepComplexity * 9)).toFixed(4)));
    stepCognitiveLoadCurve.push(Number(clamp01((baseStepComplexity * 0.8) + (symbols * 0.03)).toFixed(4)));

    const concepts = extractConceptTokens(line);
    if (concepts.length > 0) {
      transitionMap.push(concepts[0]);
    }
  });

  const stepCount = lines.length;
  const branchingFactor = Math.max(
    1,
    Math.min(
      6,
      Math.round(
        Number(
          readNumber(metadata, [
            "branchingFactor",
            "branching_factor",
            "phaseB.branchingFactor",
            "phaseB.branching_factor",
          ])
          ?? (Object.values(stepTypes).filter((count) => count > 0).length / 2),
        ),
      ),
    ),
  );

  const transformationDensity = Number(clamp01(symbolCount / Math.max(characterCount, 1)).toFixed(4));
  const errorOpportunityCount = Math.max(1, Math.round((stepCount - 1) + (branchingFactor - 1)));
  const stepComplexity = Number(clamp01(
    (stepCognitiveLoadCurve.reduce((sum, value) => sum + value, 0) / Math.max(stepCognitiveLoadCurve.length, 1))
    + (branchingFactor * 0.04),
  ).toFixed(4));

  return {
    hasWorkedSolution: true,
    stepCount,
    stepTypes,
    stepComplexity,
    branchingFactor,
    transformationDensity,
    errorOpportunityCount,
    stepDifficultyCurve,
    stepTimeCurve,
    stepCognitiveLoadCurve,
    conceptTransitionMap: transitionMap,
  };
}

function computeBaseMeasurables(args: {
  bloomLevel: number;
  linguisticLoad: number;
  cognitiveLoad: number;
  representationLoad: number;
  stem: string;
}): ItemMeasurables["base"] {
  const stemText = args.stem.trim();
  const words = stemText.split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean));
  const itemLength = Math.max(words.length, 1);
  const conceptDensity = clamp01(unique.size / Math.max(itemLength, 1));
  const surfaceDifficulty =
    (0.30 * args.linguisticLoad)
    + (0.30 * args.cognitiveLoad)
    + (0.20 * args.bloomLevel)
    + (0.20 * args.representationLoad);

  return {
    linguisticLoad: Number(args.linguisticLoad.toFixed(4)),
    cognitiveLoad: Number(args.cognitiveLoad.toFixed(4)),
    bloomEstimate: Number(args.bloomLevel.toFixed(4)),
    conceptDensity: Number(conceptDensity.toFixed(4)),
    representationLoad: Number(args.representationLoad.toFixed(4)),
    itemLength,
    readingComplexity: Number(args.linguisticLoad.toFixed(4)),
    surfaceDifficulty: Number(surfaceDifficulty.toFixed(4)),
  };
}

function computeRubricMeasurables(metadata: Record<string, unknown> | undefined): ItemMeasurables["rubric"] {
  if (!metadata) {
    return undefined;
  }

  const rubricRaw = readPath(metadata, "rubric")
    ?? readPath(metadata, "phaseB.rubric")
    ?? readPath(metadata, "phaseB.resources.rubric")
    ?? readPath(metadata, "resources.rubric");

  if (!rubricRaw) {
    return undefined;
  }

  const rubricText = typeof rubricRaw === "string"
    ? rubricRaw
    : JSON.stringify(rubricRaw);
  const normalized = rubricText.toLowerCase();

  const strictMarkers = (normalized.match(/strict|must include|required|deduct|penalty/g) ?? []).length;
  const tolerantMarkers = (normalized.match(/partial credit|attempt|alternative|equivalent|accept/g) ?? []).length;
  const requiredElementsCount = Math.max(
    Math.round(readNumber(metadata, [
      "rubric.requiredElementsCount",
      "phaseB.rubric.requiredElementsCount",
      "rubric.required_elements_count",
      "phaseB.rubric.required_elements_count",
    ]) ?? ((normalized.match(/required|must include|criterion|criteria/g) ?? []).length)),
    0,
  );
  const qualityThreshold = clamp01(
    Number(readNumber(metadata, [
      "rubric.qualityThreshold",
      "phaseB.rubric.qualityThreshold",
      "rubric.quality_threshold",
      "phaseB.rubric.quality_threshold",
    ]) ?? 0.65),
  );
  const rubricStrictness = clamp01((strictMarkers * 0.12) + (requiredElementsCount * 0.06) + (qualityThreshold * 0.5));
  const rubricTolerance = clamp01((tolerantMarkers * 0.14) + ((1 - rubricStrictness) * 0.35));
  const partialCreditEnabled = /partial credit|partial|attempt/i.test(normalized);

  return {
    hasRubric: true,
    rubricStrictness: Number(rubricStrictness.toFixed(4)),
    rubricTolerance: Number(rubricTolerance.toFixed(4)),
    partialCreditEnabled,
    requiredElementsCount,
    qualityThreshold: Number(qualityThreshold.toFixed(4)),
  };
}

function buildCombinedMappings(answerKey: NonNullable<ItemMeasurables["answerKey"]>, steps: NonNullable<ItemMeasurables["steps"]>) {
  const misconceptionStepMapping: Record<string, number[]> = {};
  const distractorStepMapping: Record<string, number[]> = {};

  const tokensByStep = steps.conceptTransitionMap.map((token, index) => ({ token: token.toLowerCase(), index }));

  for (const misconceptionId of answerKey.misconceptionIds ?? []) {
    const needle = misconceptionId.toLowerCase();
    const hits = tokensByStep.filter((entry) => entry.token.includes(needle) || needle.includes(entry.token)).map((entry) => entry.index);
    misconceptionStepMapping[misconceptionId] = hits.length > 0 ? hits : [Math.max(steps.stepCount - 1, 0)];
  }

  for (const [choice, misconceptionId] of Object.entries(answerKey.distractorMapping ?? {})) {
    const mapped = misconceptionStepMapping[misconceptionId] ?? [Math.max(steps.stepCount - 1, 0)];
    distractorStepMapping[choice] = mapped;
  }

  return { misconceptionStepMapping, distractorStepMapping };
}

function computeCombinedMeasurables(
  answerKey: ItemMeasurables["answerKey"],
  steps: ItemMeasurables["steps"],
): ItemMeasurables["combined"] {
  if (!answerKey || !steps) {
    return undefined;
  }

  const minimalStepBaseline = answerKey.answerType === "numeric" || answerKey.answerType === "mc" ? 1 : 2;
  const minimalStepComparison = Number((steps.stepCount / minimalStepBaseline).toFixed(4));
  const terminalStepLoad = steps.stepCognitiveLoadCurve[steps.stepCognitiveLoadCurve.length - 1] ?? 0;
  const answerStepAlignment = Number(clamp01(1 - Math.abs(terminalStepLoad - answerKey.answerFormatComplexity)).toFixed(4));
  const solutionPathFidelity = Number(clamp01(1 / Math.max(minimalStepComparison, 1)).toFixed(4));
  const solutionEfficiencyScore = Number(clamp01(1 - Math.min((minimalStepComparison - 1) * 0.35, 0.8)).toFixed(4));
  const conceptToAnswerAlignment = Number(clamp01((answerStepAlignment + solutionPathFidelity) / 2).toFixed(4));
  const mappings = buildCombinedMappings(answerKey, steps);

  return {
    hasAnswerKeyAndSteps: true,
    solutionPathFidelity,
    answerStepAlignment,
    minimalStepComparison,
    solutionEfficiencyScore,
    misconceptionStepMapping: mappings.misconceptionStepMapping,
    distractorStepMapping: mappings.distractorStepMapping,
    conceptToAnswerAlignment,
  };
}

const PARENT_ITEM_REGEX = /^\s*\d+[\.)]\s+/;
const LETTERED_CANDIDATE_REGEX = /^\s*\(?([a-zA-Z])\)?[\.)]\s+/;
const VERB_REGEX = /\b(identify|determine|interpret|explain|calculate|find|solve|justify|evaluate|compare|describe|choose|select|compute|state|write|graph|prove|show)\b/i;

function isSubItemLine(line: string, parentText: string): boolean {
  const text = line.trim();
  const withoutLabel = text.replace(LETTERED_CANDIDATE_REGEX, "").trim();
  const wordCount = withoutLabel.split(/\s+/).filter(Boolean).length;

  if (VERB_REGEX.test(withoutLabel)) {
    return true;
  }

  if (wordCount > 8) {
    return true;
  }

  if (wordCount <= 8 && !VERB_REGEX.test(withoutLabel)) {
    if (/[?]/.test(parentText)) {
      return false;
    }
    if (VERB_REGEX.test(parentText)) {
      return false;
    }
  }

  return true;
}

function deriveStructure(row: ItemRow): Pick<NormalizedPhaseBItem, "itemNumber" | "groupId" | "partIndex" | "logicalLabel" | "isParent"> {
  const itemNumber = typeof row.item_number === "number" && Number.isFinite(row.item_number)
    ? row.item_number
    : undefined;
  const metadata = row.metadata as Record<string, unknown> | undefined;
  const metadataGroupId = readString(metadata, ["groupId", "group_id", "phaseB.groupId", "phaseB.group_id"]);
  const metadataPartIndexRaw = readNumber(metadata, ["partIndex", "part_index", "phaseB.partIndex", "phaseB.part_index"]);
  const metadataLogicalLabel = readString(metadata, ["logicalLabel", "logical_label", "phaseB.logicalLabel", "phaseB.logical_label"]);
  const metadataIsParent = readBoolean(metadata, ["isParent", "is_parent", "phaseB.isParent", "phaseB.is_parent"]);

  const metadataPartIndex = typeof metadataPartIndexRaw === "number" && Number.isFinite(metadataPartIndexRaw)
    ? Math.max(0, Math.floor(metadataPartIndexRaw))
    : undefined;

  const extractedProblemId = readString(metadata, ["extractedProblemId", "extracted_problem_id", "problemId", "problem_id"]);
  if (extractedProblemId) {
    const extractedMatch = extractedProblemId.match(/^p?(\d+)([a-z])?$/i);
    if (extractedMatch?.[1]) {
      const groupId = extractedMatch[1];
      const partIndex = extractedMatch[2] ? letterToPartIndex(extractedMatch[2]) : 0;
      const logicalLabel = `${groupId}${partIndexToSuffix(partIndex)}`;
      return {
        itemNumber,
        groupId,
        partIndex,
        logicalLabel,
        isParent: metadataIsParent ?? (partIndex === 0 && !hasAnswerKey(row.answer_key)),
      };
    }
  }

  if (metadataGroupId || metadataLogicalLabel || metadataPartIndex !== undefined || metadataIsParent !== undefined) {
    const groupId = metadataGroupId
      ?? (metadataLogicalLabel ? (metadataLogicalLabel.match(/^(\d+)/)?.[1] ?? metadataLogicalLabel) : undefined)
      ?? (typeof itemNumber === "number" ? String(itemNumber) : row.id);
    const partIndex = metadataPartIndex ?? (metadataLogicalLabel ? letterToPartIndex(metadataLogicalLabel.slice(-1)) : 0);
    const logicalLabel = metadataLogicalLabel ?? `${groupId}${partIndexToSuffix(partIndex)}`;
    return {
      itemNumber,
      groupId,
      partIndex,
      logicalLabel,
      isParent: metadataIsParent ?? !hasAnswerKey(row.answer_key),
    };
  }

  const stem = (row.stem ?? "").trim();
  const answerPresent = hasAnswerKey(row.answer_key);
  const alphaNumeric = stem.match(/^(\d+)\s*([a-z])[\).:\s]/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    const groupId = alphaNumeric[1];
    const suffix = alphaNumeric[2].toLowerCase();
    return {
      itemNumber,
      groupId,
      partIndex: letterToPartIndex(suffix),
      logicalLabel: `${groupId}${suffix}`,
      isParent: !answerPresent,
    };
  }

  const numeric = stem.match(/^(\d+)[\).:\s]/);
  if (numeric?.[1]) {
    const groupId = numeric[1];
    return {
      itemNumber,
      groupId,
      partIndex: 0,
      logicalLabel: groupId,
      isParent: !answerPresent,
    };
  }

  const fallback = typeof itemNumber === "number" ? String(itemNumber) : row.id;
  return {
    itemNumber,
    groupId: fallback,
    partIndex: 0,
    logicalLabel: fallback,
    isParent: !answerPresent,
  };
}

function inferMultipartPartIndices(row: ItemRow): number[] {
  const metadata = row.metadata as Record<string, unknown> | undefined;

  const explicitCount = readNumber(metadata, ["subQuestionCount", "sub_question_count", "phaseB.subQuestionCount", "phaseB.sub_question_count"]);
  if (typeof explicitCount === "number" && Number.isFinite(explicitCount) && explicitCount > 1) {
    return Array.from({ length: Math.floor(explicitCount) }, (_, index) => index + 1);
  }

  const subItems = readPath(metadata, "subItems") ?? readPath(metadata, "sub_items") ?? readPath(metadata, "phaseB.subItems") ?? readPath(metadata, "phaseB.sub_items");
  if (Array.isArray(subItems) && subItems.length > 1) {
    return Array.from({ length: subItems.length }, (_, index) => index + 1);
  }

  if (row.answer_key && typeof row.answer_key === "object" && !Array.isArray(row.answer_key)) {
    const keys = Object.keys(row.answer_key as Record<string, unknown>)
      .map((key) => key.trim().toLowerCase())
      .filter((key) => /^[a-z]$/.test(key))
      .sort();
    if (keys.length > 1) {
      return keys.map((key) => letterToPartIndex(key));
    }
  }

  const stem = row.stem ?? "";
  const lines = stem
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parentLine = lines.find((line) => PARENT_ITEM_REGEX.test(line)) ?? lines[0] ?? "";
  const subItemCandidates = lines.filter((line) => LETTERED_CANDIDATE_REGEX.test(line));

  if (subItemCandidates.length > 0) {
    let subItemCount = 0;
    for (const candidate of subItemCandidates) {
      if (isSubItemLine(candidate, parentLine)) {
        subItemCount += 1;
      }
    }

    if (subItemCount > 0) {
      return Array.from({ length: subItemCount }, (_, index) => index + 1);
    }

    return [];
  }

  const markers = [...stem.matchAll(/(?:\(|\b)([a-z])(?:\)|\.)/gi)]
    .map((match) => match[1]?.toLowerCase() ?? "")
    .filter((value) => /^[a-z]$/.test(value));
  const unique = [...new Set(markers)].map((letter) => letterToPartIndex(letter)).filter((value) => value > 0);
  if (unique.length > 1) {
    return unique.sort((a, b) => a - b);
  }

  return [];
}

function estimateLinguisticLoad(stem: string): number {
  const text = stem.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!?]+/).filter((entry) => entry.trim().length > 0).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  return clamp(avgSentenceLength / 20, 0, 1);
}

function toNormalizedItems(row: ItemRow, overrides: PhaseBOverrideMaps = {}): NormalizedPhaseBItem[] {
  const structure = deriveStructure(row);
  const metadata = row.metadata as Record<string, unknown> | undefined;
  const overrideAnswer = readOverride(overrides.answerKeyByItem, row.item_number);
  const overrideSteps = readOverride(overrides.workedSolutionByItem, row.item_number);
  const overrideRubric = readOverride(overrides.rubricByItem, row.item_number);

  const effectiveAnswerKey = overrideAnswer ?? row.answer_key;
  const effectiveSteps = overrideSteps;
  const effectiveRubric = overrideRubric;

  const metadataWithOverrides: Record<string, unknown> | undefined = metadata
    ? { ...metadata }
    : (effectiveSteps || effectiveRubric ? {} : undefined);
  if (metadataWithOverrides) {
    if (effectiveSteps !== undefined) {
      metadataWithOverrides.workedSolution = effectiveSteps;
      metadataWithOverrides.solutionSteps = effectiveSteps;
      metadataWithOverrides.phaseB = {
        ...(metadataWithOverrides.phaseB as Record<string, unknown> | undefined),
        workedSolution: effectiveSteps,
      };
    }
    if (effectiveRubric !== undefined) {
      metadataWithOverrides.rubric = effectiveRubric;
      metadataWithOverrides.phaseB = {
        ...(metadataWithOverrides.phaseB as Record<string, unknown> | undefined),
        rubric: effectiveRubric,
      };
    }
  }
  const linguisticLoad = clamp(
    readNumber(metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"]) ?? estimateLinguisticLoad(row.stem ?? ""),
    0,
    1,
  );
  const cognitiveLoad = clamp(
    readNumber(metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"]) ?? linguisticLoad,
    0,
    1,
  );
  const representationLoad = clamp(
    readNumber(metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"]) ?? 0.5,
    0,
    1,
  );
  const bloomLevel = clamp(
    readNumber(metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"]) ?? 3,
    1,
    6,
  );
  const baseMeasurables = computeBaseMeasurables({
    bloomLevel,
    linguisticLoad,
    cognitiveLoad,
    representationLoad,
    stem: row.stem ?? "",
  });
  const answerKeyMeasurables = computeAnswerKeyMeasurables(effectiveAnswerKey, metadataWithOverrides);
  const stepMeasurables = computeStepMeasurables(row, metadataWithOverrides, baseMeasurables.surfaceDifficulty);
  const rubricMeasurables = computeRubricMeasurables(metadataWithOverrides);
  const combinedMeasurables = computeCombinedMeasurables(answerKeyMeasurables, stepMeasurables);
  const resources: ItemResources = {
    hasAnswerKey: Boolean(answerKeyMeasurables?.hasAnswerKey),
    hasWorkedSolution: Boolean(stepMeasurables?.hasWorkedSolution),
    hasRubric: Boolean(rubricMeasurables?.hasRubric),
  };
  const measurables: ItemMeasurables = {
    base: baseMeasurables,
    answerKey: answerKeyMeasurables,
    steps: stepMeasurables,
    rubric: rubricMeasurables,
    combined: combinedMeasurables,
  };

  const vocabLevel1 = readNumber(metadataWithOverrides, ["vocabCounts.level1", "vocab_counts.level1", "metrics.vocab_counts.level1", "metrics.vocabCounts.level1"]) ?? 0;
  const vocabLevel2 = readNumber(metadataWithOverrides, ["vocabCounts.level2", "vocab_counts.level2", "metrics.vocab_counts.level2", "metrics.vocabCounts.level2"]) ?? 0;
  const vocabLevel3 = readNumber(metadataWithOverrides, ["vocabCounts.level3", "vocab_counts.level3", "metrics.vocab_counts.level3", "metrics.vocabCounts.level3"]) ?? 0;
  const vocabDensity = vocabLevel1 + vocabLevel2 + vocabLevel3;
  const symbolDensity = readNumber(metadataWithOverrides, ["symbolDensity", "symbol_density", "metrics.symbol_density"]);
  const steps = readNumber(metadataWithOverrides, ["steps", "phaseB.steps", "metrics.steps"]);

  const baseItem: NormalizedPhaseBItem = {
    itemId: row.id,
    itemNumber: structure.itemNumber,
    groupId: structure.groupId,
    partIndex: structure.partIndex,
    logicalLabel: structure.logicalLabel,
    isParent: structure.isParent,
    resources,
    measurables,
    traits: {
      bloomLevel,
      linguisticLoad,
      cognitiveLoad,
      representationLoad,
      vocabDensity: vocabDensity > 0 ? vocabDensity : undefined,
      symbolDensity,
      steps,
    },
  };

  if (!baseItem.isParent || baseItem.partIndex > 0) {
    return [baseItem];
  }

  const inferredParts = inferMultipartPartIndices(row);
  if (inferredParts.length === 0) {
    return [baseItem];
  }

  return inferredParts.map((partIndex) => ({
    ...baseItem,
    itemId: `${row.id}::part-${partIndex}`,
    partIndex,
    logicalLabel: `${baseItem.groupId}${partIndexToSuffix(partIndex)}`,
    isParent: false,
  }));
}

function sortNormalizedItems(items: NormalizedPhaseBItem[]): NormalizedPhaseBItem[] {
  return [...items].sort((a, b) => {
    if (a.groupId !== b.groupId) {
      return a.groupId.localeCompare(b.groupId, undefined, { numeric: true });
    }
    if (a.partIndex !== b.partIndex) {
      return a.partIndex - b.partIndex;
    }
    const aNumber = a.itemNumber ?? Number.POSITIVE_INFINITY;
    const bNumber = b.itemNumber ?? Number.POSITIVE_INFINITY;
    return aNumber - bNumber;
  });
}

function isSyntheticPartItem(item: NormalizedPhaseBItem): boolean {
  return item.partIndex > 0 && item.itemId.includes("::part-");
}

function dedupeNormalizedItems(items: NormalizedPhaseBItem[]): NormalizedPhaseBItem[] {
  const byGroupPart = new Map<string, NormalizedPhaseBItem>();

  for (const item of items) {
    if (item.partIndex <= 0) {
      const parentKey = `${item.groupId}::0::${item.itemId}`;
      byGroupPart.set(parentKey, item);
      continue;
    }

    const key = `${item.groupId}::${item.partIndex}`;
    const existing = byGroupPart.get(key);

    if (!existing) {
      byGroupPart.set(key, item);
      continue;
    }

    // Prefer explicit child rows from ingestion over inferred synthetic rows.
    if (isSyntheticPartItem(existing) && !isSyntheticPartItem(item)) {
      byGroupPart.set(key, item);
    }
  }

  return [...byGroupPart.values()];
}

export async function normalizeItemsPhaseB(documentId: string, overrides: PhaseBOverrideMaps = {}): Promise<{ items: NormalizedPhaseBItem[] }> {
  const rows = await supabaseRest("v4_items", {
    method: "GET",
    select: "id,item_number,stem,answer_key,metadata",
    filters: {
      document_id: `eq.${documentId}`,
      order: "item_number.asc",
    },
  }) as ItemRow[];

  const normalizedRaw = (rows ?? []).flatMap((row) => toNormalizedItems(row, overrides));
  const normalized = dedupeNormalizedItems(normalizedRaw);
  const groupsWithChildren = new Set(
    normalized
      .filter((item) => item.partIndex > 0)
      .map((item) => item.groupId),
  );

  // Keep standalone items (part 0 with no child parts) even when parent
  // inference marks them as parent due to missing answer keys.
  const withoutMultipartParents = normalized.filter((item) => !item.isParent || !groupsWithChildren.has(item.groupId));

  // Some ingested docs may not carry answer keys on item rows. In that case,
  // parent inference can mark every row as parent; preserve source order instead
  // of returning an empty item list.
  const effectiveItems = withoutMultipartParents.length > 0 ? withoutMultipartParents : normalized;

  return {
    items: sortNormalizedItems(effectiveItems),
  };
}

function parseByItemNumber(rawText: string): Record<string, string> {
  const byItem: Record<string, string> = {};
  const lines = rawText
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const direct = line.match(/^(\d{1,3})[\).:\-]\s*(.+)$/i);
    if (direct?.[1] && direct?.[2]) {
      byItem[direct[1]] = direct[2].trim();
      continue;
    }
    const prefixed = line.match(/^item\s*(\d{1,3})\s*[:\-]\s*(.+)$/i);
    if (prefixed?.[1] && prefixed?.[2]) {
      byItem[prefixed[1]] = prefixed[2].trim();
    }
  }

  return byItem;
}

function extractDocumentText(document: Record<string, unknown> | undefined): string {
  if (!document) {
    return "";
  }
  const canonical = document.canonical_document as { nodes?: Array<{ text?: string; normalizedText?: string }> } | undefined;
  if (canonical?.nodes && Array.isArray(canonical.nodes) && canonical.nodes.length > 0) {
    return canonical.nodes
      .map((node) => (typeof node.normalizedText === "string" && node.normalizedText.trim().length > 0 ? node.normalizedText : node.text ?? ""))
      .filter(Boolean)
      .join("\n");
  }
  const azure = document.azure_extract as { content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string }> } | undefined;
  if (typeof azure?.content === "string" && azure.content.trim().length > 0) {
    return azure.content;
  }
  if (Array.isArray(azure?.paragraphs) && azure.paragraphs.length > 0) {
    return azure.paragraphs.map((p) => p.text ?? "").filter(Boolean).join("\n");
  }
  if (Array.isArray(azure?.pages) && azure.pages.length > 0) {
    return azure.pages.map((p) => p.text ?? "").filter(Boolean).join("\n");
  }
  return "";
}

async function loadOverrideMapsFromResourceLinks(documentId: string): Promise<PhaseBOverrideMaps> {
  const links = await supabaseRest("v4_document_resource_links", {
    method: "GET",
    select: "resource_document_id,resource_type",
    filters: { document_id: `eq.${documentId}` },
  }) as Array<{ resource_document_id?: string; resource_type?: string }>;

  const resourceIds = Array.from(new Set((links ?? [])
    .map((link) => (typeof link.resource_document_id === "string" ? link.resource_document_id : ""))
    .filter((value) => value.length > 0)));

  if (resourceIds.length === 0) {
    return {};
  }

  const escapedIds = resourceIds.map((id) => `"${id}"`).join(",");
  const documents = await supabaseRest("prism_v4_documents", {
    method: "GET",
    select: "document_id,canonical_document,azure_extract",
    filters: { document_id: `in.(${escapedIds})` },
  }) as Array<Record<string, unknown> & { document_id?: string }>;

  const docById = new Map<string, Record<string, unknown>>();
  for (const document of documents ?? []) {
    if (typeof document.document_id === "string" && document.document_id.length > 0) {
      docById.set(document.document_id, document);
    }
  }

  const answerKeyByItem: Record<string, string> = {};
  const workedSolutionByItem: Record<string, string> = {};
  const rubricByItem: Record<string, string> = {};

  for (const link of links ?? []) {
    const linkDocId = typeof link.resource_document_id === "string" ? link.resource_document_id : "";
    const resourceType = typeof link.resource_type === "string" ? link.resource_type : "";
    if (!linkDocId || !resourceType) {
      continue;
    }
    const text = extractDocumentText(docById.get(linkDocId));
    if (!text.trim()) {
      continue;
    }
    const parsed = parseByItemNumber(text);
    if (resourceType === "answer-key") {
      Object.assign(answerKeyByItem, parsed);
    } else if (resourceType === "worked-solution") {
      Object.assign(workedSolutionByItem, parsed);
    } else if (resourceType === "rubric") {
      Object.assign(rubricByItem, parsed);
    }
  }

  return {
    answerKeyByItem: Object.keys(answerKeyByItem).length > 0 ? answerKeyByItem : undefined,
    workedSolutionByItem: Object.keys(workedSolutionByItem).length > 0 ? workedSolutionByItem : undefined,
    rubricByItem: Object.keys(rubricByItem).length > 0 ? rubricByItem : undefined,
  };
}

export async function runPhaseB(documentId: string): Promise<{ items: NormalizedPhaseBItem[] }> {
  const overrides = await loadOverrideMapsFromResourceLinks(documentId);
  return normalizeItemsPhaseB(documentId, overrides);
}
