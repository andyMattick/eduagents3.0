import type { GeneratedItem } from "pipeline/agents/writer/types";
import type { FinalAssessment, FinalAssessmentItem } from "./FinalAssessment";
import { normalizeItem, getPrompt, getAnswer, getOptions, getPassage } from "pipeline/utils/itemNormalizer";
import { normalizeMath } from "../../../utils/normalizeMath";
import { applyMathFormat } from "../../../utils/mathFormatters";
import type { MathFormat } from "../../../utils/mathFormatters";
import { applyLexicalCalibration } from "@/utils/lexical/Calibration";
import { formatTrueFalseItem } from "./trueFalseFormatter";
import { groupItemsBySection } from "./sectionGrouper";
import { internalLogger } from "../shared/internalLogging";

type BuilderInput =
  | GeneratedItem[]
  | { items: GeneratedItem[]; blueprint?: any };

function normalise(input: BuilderInput): { items: GeneratedItem[]; blueprint?: any } {
  if (Array.isArray(input)) return { items: input };
  return input;
}

 function generateId(): string {
   return `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
 }

export async function runBuilder(input: BuilderInput): Promise<FinalAssessment> {
  const { items, blueprint } = normalise(input);
  const plan = blueprint?.plan ?? blueprint ?? null;
  const slotMetaById = new Map((plan?.slots ?? []).map((s: any) => [s.id, s]));

  const arithmeticCount = items.filter(i => i.questionType === "arithmeticFluency").length;
  const layout: "columns" | "singleColumn" =
    arithmeticCount > items.length / 2 ? "columns" : "singleColumn";

  const SECTION_INSTRUCTIONS: Record<string, string> = {
    multipleChoice:      "Choose the best answer.",
    shortAnswer:         "Show your work when appropriate.",
    constructedResponse: "Explain your reasoning clearly.",
    trueFalse:           "Circle True or False for each statement.",
    passageBased:        "Read the passage and answer the questions.",
    arithmeticFluency:   "Solve each problem. Show your work.",
    graphInterpretation: "Use the graph to answer each question.",
    fillInTheBlank:      "Fill in each blank with the correct answer.",
    matching:            "Match each item on the left to its correct answer on the right.",
  };

  const presentTypes = [...new Set(items.map(i => i.questionType))];
  const sectionInstructions: Record<string, string> = {};
  for (const qt of presentTypes) {
    if (SECTION_INSTRUCTIONS[qt]) sectionInstructions[qt] = SECTION_INSTRUCTIONS[qt];
  }

  function cleanText(s: string | undefined): string | undefined {
    if (!s) return s;
    return s
      .replace(/\\'/g, "'")
      .replace(/\\"/g, "'")
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u2014/g, "--")
      .replace(/\u2013/g, "-")
      .replace(/\u2026/g, "...")
      .trim();
  }

  const grade = parseInt(
    blueprint?.uar?.grade ?? blueprint?.uar?.gradeLevels?.[0] ?? "9",
    10
  );
  const mathFmt: MathFormat = (blueprint?.uar?.mathFormat ?? "unicode") as MathFormat;

  function transformText(text?: string): string | undefined {
    if (typeof text !== "string") return undefined;
    const cleaned = cleanText(text) ?? "";
    const normalized = normalizeMath(cleaned) ?? cleaned;
    const formatted = applyMathFormat(normalized, mathFmt);
    return applyLexicalCalibration(formatted, grade);
  }

  /**
   * Render diagram item: uses diagram type to generate/reference a diagram asset.
   */
  function renderDiagram(item: any, diagramType?: string | null) {
    return {
      prompt: transformText(getPrompt(item)) ?? "",
      answer: transformText((getAnswer(item) as string) ?? "") ?? "",
      diagramUrl: diagramType ? `/diagrams/${diagramType}.svg` : null,
      diagramType: diagramType ?? null,
    };
  }

  /**
   * Render image item: resolves image reference and attaches asset URL.
   */
  function renderImage(item: any, imageReferenceId?: string | null) {
    return {
      prompt: transformText(getPrompt(item)) ?? "",
      answer: transformText((getAnswer(item) as string) ?? "") ?? "",
      imageUrl: imageReferenceId ? `/images/${imageReferenceId}.jpg` : null,
      imageReferenceId: imageReferenceId ?? null,
    };
  }

  /**
   * Render short answer item cleanly.
   */
  function renderShortAnswer(item: any) {
    return {
      prompt: transformText(getPrompt(item)) ?? "",
      answer: transformText((getAnswer(item) as string) ?? "") ?? ""
    };
  }

const finalItems: FinalAssessmentItem[] = items.map((item, i) => {
  const normalized = normalizeItem(item);
  const formattedItem = formatTrueFalseItem(normalized);
  const slotMeta: any = slotMetaById.get(formattedItem.slotId) ?? {};

  const mergedMetadata = {
    ...(formattedItem.metadata ?? {}),
    slotId: formattedItem.slotId,
    generationMethod: (formattedItem.metadata as any)?.generationMethod ?? slotMeta.generationMethod ?? null,
    templateId: (formattedItem.metadata as any)?.templateId ?? slotMeta.templateId ?? null,
    diagramType: (formattedItem.metadata as any)?.diagramType ?? slotMeta.diagramType ?? null,
    imageReferenceId: (formattedItem.metadata as any)?.imageReferenceId ?? slotMeta.imageReferenceId ?? null,
    topicAngle: (formattedItem.metadata as any)?.topicAngle ?? slotMeta.topicAngle ?? null,
    difficulty: slotMeta.difficulty ?? null,
    cognitiveDemand: slotMeta.cognitiveDemand ?? null,
    pacing: slotMeta.pacing ?? null,
  };

  const questionType =
    formattedItem.questionType && formattedItem.questionType !== "undefined"
      ? String(formattedItem.questionType)
      : "shortAnswer";

  const generationMethod = mergedMetadata.generationMethod;

  // Type guard: ensure metadata has required fields based on generationMethod
  if (generationMethod === "diagram" && !mergedMetadata.diagramType) {
    console.warn(`[Builder] Diagram slot ${formattedItem.slotId} missing diagramType; using default rendering`);
  }
  if (generationMethod === "image" && !mergedMetadata.imageReferenceId) {
    console.warn(`[Builder] Image slot ${formattedItem.slotId} missing imageReferenceId; using default rendering`);
  }
  if (generationMethod === "template" && !mergedMetadata.templateId) {
    console.warn(`[Builder] Template slot ${formattedItem.slotId} missing templateId; using default rendering`);
  }

  // Route based on generationMethod
  if (generationMethod === "diagram") {
    const rendered = renderDiagram(formattedItem, mergedMetadata.diagramType);
    return {
      questionNumber: i + 1,
      slotId: formattedItem.slotId,
      questionType,
      prompt: rendered.prompt,
      answer: rendered.answer,
      diagramUrl: rendered.diagramUrl,
      metadata: mergedMetadata,
    };
  }

  if (generationMethod === "image") {
    const rendered = renderImage(formattedItem, mergedMetadata.imageReferenceId);
    return {
      questionNumber: i + 1,
      slotId: formattedItem.slotId,
      questionType,
      prompt: rendered.prompt,
      answer: rendered.answer,
      imageUrl: rendered.imageUrl,
      metadata: mergedMetadata,
    };
  }

  if (questionType === "shortAnswer") {
    const sa = renderShortAnswer(formattedItem);
    return {
      questionNumber: i + 1,
      slotId: formattedItem.slotId,
      questionType,
      prompt: sa.prompt,
      answer: sa.answer,
      metadata: mergedMetadata
    };
  }


  return {
    questionNumber: i + 1,
    slotId: formattedItem.slotId,
    questionType,

    prompt: transformText(getPrompt(formattedItem)) ?? "",

options: Array.isArray(getOptions(formattedItem))
  ? (getOptions(formattedItem) as string[]).map((opt: string) => transformText(opt) ?? "")
  : undefined,

    answer: transformText((getAnswer(formattedItem) as string) ?? ""),

    passage:
      getPassage(formattedItem) != null
        ? (transformText(getPassage(formattedItem) as string) ?? "")
        : undefined,

questions: Array.isArray(formattedItem.questions)
  ? formattedItem.questions.map((q: { prompt: string; answer: string }) => ({
      prompt: transformText(q.prompt) ?? "",
      answer: transformText(q.answer) ?? "",
    }))
  : undefined,


    metadata: mergedMetadata,
  };
});

  const grouped = groupItemsBySection(blueprint ?? null, finalItems);

  // ── Internal logging: rendering decision summary ──────────────────────────
  const renderingCounts = finalItems.reduce((acc, item) => {
    const method = (item as any).metadata?.generationMethod ?? "default";
    acc[method] = (acc[method] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  internalLogger.info("Builder", "Assessment built", {
    totalItems: finalItems.length,
    renderingMethods: renderingCounts,
    hasDiagrams: finalItems.some((i: any) => i.diagramUrl),
    hasImages: finalItems.some((i: any) => i.imageUrl),
    sectionCount: grouped.sectionOrder.length,
  });

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    items: finalItems,
    totalItems: finalItems.length,
    metadata: {
      difficultyProfile: plan?.difficultyProfile,
      orderingStrategy: plan?.orderingStrategy,
      totalEstimatedTimeSeconds: plan?.totalEstimatedTimeSeconds,
      pacingSecondsPerItem: plan?.pacingSecondsPerItem,
      layout,
      sectionInstructions,
      sectionOrder: grouped.sectionOrder,
      sectionGroups: grouped.totalPerSection,
    },
  };
}
