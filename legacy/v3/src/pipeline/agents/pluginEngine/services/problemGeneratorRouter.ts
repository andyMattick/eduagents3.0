import { getPlugin, getPlugins } from "./pluginRegistry";
import {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
  TemplateGeneratedProblem,
} from "../interfaces/problemPlugin";

const QUESTION_TYPE_MAP: Record<string, string> = {
  multipleChoice: "mcq",
  passageBased: "passageBased",
  shortAnswer: "shortAnswer",
  extendedResponse: "extendedResponse",
};

type RoutedProblem = TemplateGeneratedProblem & { _pluginId: string };

export async function problemGeneratorRouter(
  slot: ProblemSlot,
  context: GenerationContext
): Promise<RoutedProblem> {
  const direct = resolveDirectPlugin(slot);
  if (direct) return generateWithPlugin(direct, slot, context);

  const template = resolveTemplateForSlot(slot);
  if (template) return generateWithPlugin(template, slot, context);

  const llm = getPlugin("llm_default");
  if (llm) return generateWithPlugin(llm, slot, context);

  throw new Error(
    `[ProblemGeneratorRouter] No plugin resolved for slot ${slot.slot_id}.`
  );
}

// -----------------------------
// Direct plugin resolution
// -----------------------------
function resolveDirectPlugin(slot: ProblemSlot): ProblemPlugin | undefined {
  switch (slot.problem_source) {
    case "template":
      return getPlugin(slot.template_id ?? undefined);
    case "diagram":
      return getPlugin(slot.diagram_type ?? undefined);
    case "image_analysis":
      return getPlugin(slot.image_reference_id ?? undefined) ?? getPlugin("llm_default");
    case "llm":
      return getPlugin("llm_default");
    default:
      return undefined;
  }
}

// -----------------------------
// Template selection logic
// -----------------------------
function resolveTemplateForSlot(slot: ProblemSlot): ProblemPlugin | undefined {
  const qt = QUESTION_TYPE_MAP[slot.questionType] ?? slot.questionType;
  const hasPassageAnchor = Boolean(
    (slot as any).passage || (slot as any).paragraph || (slot as any).excerpt
  );
  const slotRequiresPassage =
    Boolean((slot as any).requiresPassage) || hasPassageAnchor || qt === "passageBased";

  const candidates: ProblemPlugin[] = getPlugins().filter((plugin: ProblemPlugin) => {
    if (plugin.generationType !== "template") return false;
    if (!plugin.template) return false;

    const t = plugin.template;
    const supports = t.supports ?? {};

    const supportsQuestionType = supports[qt] === true;
    const supportsPassageAnchors = supports.requiresPassage === true || supports.passageBased === true;

    if (!supportsQuestionType && !(slotRequiresPassage && supportsPassageAnchors)) {
      return false;
    }

    if (supports.requiresPassage === true && !slotRequiresPassage) return false;

    if (slot.sharedContext && t.sharedContext !== slot.sharedContext) return false;

    if (slot.itemType && t.itemType !== slot.itemType) return false;

    return true;
  });

  if (candidates.length === 0) return undefined;

  candidates.sort(
    (a: ProblemPlugin, b: ProblemPlugin) =>
      scoreTemplate(b.template, slot) - scoreTemplate(a.template, slot)
  );

  return candidates[0];
}

// -----------------------------
// Scoring function
// -----------------------------
function scoreTemplate(template: any, slot: ProblemSlot): number {
  let score = 0;

  // Intent match
  if (template.defaultIntent && slot.cognitiveDemand) {
    if (template.defaultIntent === slot.cognitiveDemand) score += 4;
  }

  // Difficulty match
  if (template.defaultDifficulty && slot.difficulty) {
    if (template.defaultDifficulty === slot.difficulty) score += 2;
  }

  // Shared context match
  if (template.sharedContext && slot.sharedContext) {
    if (template.sharedContext === slot.sharedContext) score += 2;
  }

  // TopicAngle fuzzy match
  if (slot.topicAngle && template.label) {
    const angle = slot.topicAngle.toLowerCase();
    const label = template.label.toLowerCase();
    if (label.includes(angle) || angle.includes(label)) score += 1;
  }

  // Balanced domain priority
  const alias: Record<string, string> = {
    socialstudies: "history",
    civics: "history",
    government: "history",
    biology: "science",
    chemistry: "science",
    physics: "science",
    stem: "science",
  };

  const slotDomain = slot.domain?.toLowerCase() ?? "";
  const templateDomain = template.domain?.toLowerCase() ?? "";

  const normalizedSlotDomain = alias[slotDomain] ?? slotDomain;
  const normalizedTemplateDomain = alias[templateDomain] ?? templateDomain;

  if (normalizedSlotDomain && normalizedTemplateDomain) {
    if (normalizedSlotDomain === normalizedTemplateDomain) {
      score += 3; // balanced positive match
    } else {
      score -= 1; // soft penalty
    }
  }

  return score;
}



// -----------------------------
// Plugin execution
// -----------------------------
async function generateWithPlugin(
  plugin: ProblemPlugin,
  slot: ProblemSlot,
  context: GenerationContext
): Promise<RoutedProblem> {
  const problem = await plugin.generate(slot, context);
  return { ...problem, _pluginId: plugin.id };
}
