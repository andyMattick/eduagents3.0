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

function normalizePreviewItems(legacyShape: LegacyProblemType, templateBase: Omit<SystemTemplate, "previewItems">): unknown[] {
  if (Array.isArray(legacyShape.previewItems) && legacyShape.previewItems.length > 0) {
    return legacyShape.previewItems;
  }

  if (Array.isArray(legacyShape.examples) && legacyShape.examples.length > 0) {
    return legacyShape.examples.slice(0, 2).map((example, idx) => ({
      prompt: String(example),
      answer: `Sample answer outline ${idx + 1}`,
    }));
  }

  return fallbackPreviewItems(templateBase);
}

export function withTemplate<T extends LegacyProblemType>(legacyShape: T, fallbackSubject: string): ProblemTypeWithTemplate<T> {
  const templateBase: Omit<SystemTemplate, "previewItems"> = {
    id: normalizeString(legacyShape.id, "unknown_template"),
    label: normalizeString(legacyShape.label, legacyShape.id),
    subject: normalizeString(legacyShape.subject ?? legacyShape.Subject, fallbackSubject),
    itemType: normalizeString(legacyShape.itemType, "short_answer"),
    cognitiveIntent: normalizeString(legacyShape.defaultIntent ?? legacyShape.cognitiveIntent, "analyze"),
    difficulty: normalizeString(legacyShape.defaultDifficulty ?? legacyShape.difficulty, "medium"),
    sharedContext: normalizeString(legacyShape.sharedContext, "none"),
    configurableFields: legacyShape.configurableFields ?? {},
    examples: Array.isArray(legacyShape.examples) ? legacyShape.examples : undefined,
  };

  const template: SystemTemplate = {
    ...templateBase,
    previewItems: normalizePreviewItems(legacyShape, templateBase),
  };

  return {
    ...legacyShape,
    subject: template.subject,
    template,
  };
}
