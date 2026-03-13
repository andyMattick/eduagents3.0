type LegacyProblemType = {
  id: string;
  label: string;
  subject?: string;
  Subject?: string;
  itemType?: unknown;
  defaultIntent?: unknown;
  cognitiveIntent?: unknown;
  defaultDifficulty?: unknown;
  difficulty?: unknown;
  sharedContext?: unknown;
  configurableFields?: Record<string, unknown>;
  previewItems?: unknown[];
  examples?: string[];
};

export type SystemTemplate = {
  id: string;
  label: string;
  subject: string;
  itemType: string;
  cognitiveIntent: string;
  difficulty: string;
  sharedContext: string;
  configurableFields: Record<string, unknown>;
  previewItems: unknown[];
  examples?: string[];
};

export type ProblemTypeWithTemplate<T extends LegacyProblemType = LegacyProblemType> = T & {
  template: SystemTemplate;
};

function normalizeString(value: unknown, fallback: string): string {
  const str = String(value ?? fallback).trim();
  return str || fallback;
}

function firstConfigOption(configurableFields: Record<string, unknown> | undefined): string | null {
  if (!configurableFields) return null;
  for (const value of Object.values(configurableFields)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function fallbackPreviewItems(template: Omit<SystemTemplate, "previewItems">): Array<{ prompt: string; answer: string }> {
  const focus = firstConfigOption(template.configurableFields);
  const contextPhrase = template.sharedContext && template.sharedContext !== "none"
    ? `using a ${template.sharedContext.replace(/_/g, " ")}`
    : "from a short prompt";
  const focusPhrase = focus ? ` Focus on ${String(focus).replace(/_/g, " ")}.` : "";

  return [
    {
      prompt: `${template.label}: Have students ${template.cognitiveIntent} ${contextPhrase}.${focusPhrase}`,
      answer: `Sample response should clearly ${template.cognitiveIntent} and reference key details accurately.`,
    },
    {
      prompt: `${template.subject} task: Ask students to ${template.cognitiveIntent} in a second variation of the same skill.${focusPhrase}`,
      answer: "Sample response should demonstrate consistent reasoning and domain-appropriate vocabulary.",
    },
  ];
}

function normalizePreviewItems(problemType: LegacyProblemType, templateBase: Omit<SystemTemplate, "previewItems">): unknown[] {
  if (Array.isArray(problemType.previewItems) && problemType.previewItems.length > 0) {
    return problemType.previewItems;
  }

  if (Array.isArray(problemType.examples) && problemType.examples.length > 0) {
    return problemType.examples.slice(0, 2).map((example, idx) => ({
      prompt: String(example),
      answer: `Sample answer outline ${idx + 1}`,
    }));
  }

  return fallbackPreviewItems(templateBase);
}

export function withTemplate<T extends LegacyProblemType>(problemType: T, fallbackSubject: string): ProblemTypeWithTemplate<T> {
  const templateBase: Omit<SystemTemplate, "previewItems"> = {
    id: normalizeString(problemType.id, "unknown_template"),
    label: normalizeString(problemType.label, problemType.id),
    subject: normalizeString(problemType.subject ?? problemType.Subject, fallbackSubject),
    itemType: normalizeString(problemType.itemType, "short_answer"),
    cognitiveIntent: normalizeString(problemType.defaultIntent ?? problemType.cognitiveIntent, "analyze"),
    difficulty: normalizeString(problemType.defaultDifficulty ?? problemType.difficulty, "medium"),
    sharedContext: normalizeString(problemType.sharedContext, "none"),
    configurableFields: problemType.configurableFields ?? {},
    examples: Array.isArray(problemType.examples) ? problemType.examples : undefined,
  };

  const template: SystemTemplate = {
    ...templateBase,
    previewItems: normalizePreviewItems(problemType, templateBase),
  };

  return {
    ...problemType,
    subject: template.subject,
    template,
  };
}
