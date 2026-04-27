import type { ProblemSlot } from "../../agents/pluginEngine";
import { assignPluginFields } from "./assignPluginFields";
import { chooseTaskType } from "./chooseTaskType";

type RawSlot = {
  id: string;
  questionType?: string;
  topic?: string;
  topicAngle?: string;
  sharedContext?: string | null;
  passage?: string | null;
  paragraph?: string | null;
  excerpt?: string | null;
  passageId?: string | null;
  requiresPassage?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  pacingSeconds?: number | null;
  cognitiveDemand?:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create"
    | null;
  constraints?: Record<string, any>;
};

type ArchitectContext = {
  topic?: string;
  domain?: string;
};

function buildBaseSlot(
  domain: string,
  rawSlot: RawSlot,
  context: ArchitectContext
): ProblemSlot {
  const normalizedType = String(rawSlot.questionType ?? "shortAnswer").trim();
  const rawTopic = rawSlot.topic ?? rawSlot.topicAngle ?? context.topic ?? "";
  const topicForPluginRouting = String(rawTopic)
    .toLowerCase()
    .replace(/—/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const slotTopic = String(rawTopic).trim() || "the topic";

  const plugin = assignPluginFields(topicForPluginRouting, normalizedType);
  const existingTaskType = rawSlot.constraints?.taskType;
  const resolvedTaskType =
    existingTaskType ?? chooseTaskType(domain, normalizedType, slotTopic) ?? undefined;

  return {
    questionType: normalizedType,
    slot_id: rawSlot.id,
    problem_source: plugin.problem_source as "template" | "diagram" | "image_analysis" | "llm",
    problem_type: normalizedType,
    template_id: plugin.template_id,
    diagram_type: plugin.diagram_type,
    image_reference_id: plugin.image_reference_id,
    topic: slotTopic,
    subtopic: rawSlot.sharedContext ?? null,
    difficulty: rawSlot.difficulty ?? "medium",
    pacing_seconds: rawSlot.pacingSeconds ?? undefined,
    question_format: normalizedType,
    cognitive_demand: rawSlot.cognitiveDemand ?? undefined,
    constraints: {
      ...(rawSlot.constraints ?? {}),
      ...(resolvedTaskType ? { taskType: resolvedTaskType } : {}),
    },
    sharedContext: rawSlot.sharedContext ?? null,
    passage: rawSlot.passage ?? null,
    paragraph: rawSlot.paragraph ?? null,
    excerpt: rawSlot.excerpt ?? null,
    passageId: rawSlot.passageId ?? null,
    requiresPassage: rawSlot.requiresPassage ?? Boolean(rawSlot.passage),
  };
}

export function buildELASlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("ela", rawSlot, context);
}

export function buildHistorySlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("history", rawSlot, context);
}

export function buildScienceSlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("science", rawSlot, context);
}

export function buildMathSlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("math", rawSlot, context);
}

export function buildSTEMSlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("stem", rawSlot, context);
}

export function buildGeneralSlot(rawSlot: RawSlot, context: ArchitectContext): ProblemSlot {
  return buildBaseSlot("general", rawSlot, context);
}