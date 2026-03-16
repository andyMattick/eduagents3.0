import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllProblemTypesForTeacher } from "../src/pipeline/schema/templates/problemTypes";
import { generateTemplateExplanation } from "../src/utils/templateExplanation";

const SUBJECT_MAP: Record<string, string> = {
  "English Language Arts": "ELA",
  "English": "ELA",
  "ELA": "ELA",
  "Math": "Math",
  "Mathematics": "Math",
  "Science": "Science",
  "History": "Social Studies",
  "Social Studies": "Social Studies",
  "STEM": "STEM",
  "World Languages": "World Languages",
  "Foreign Language": "World Languages",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function normalizeString(value: unknown, fallback = ""): string {
  const str = String(value ?? fallback).trim();
  return str || fallback;
}

function inferSystemSubject(templateId: string): string {
  if (templateId.startsWith("ela_")) return "English";
  if (templateId.startsWith("history_")) return "History";
  if (templateId.startsWith("science_")) return "Science";
  if (templateId.startsWith("stem_")) return "STEM";
  if (templateId === "foreign_language") return "World Languages";
  return "Math";
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

function fallbackPreviewItems(template: {
  label: string;
  subject: string;
  cognitiveIntent: string;
  sharedContext: string;
  configurableFields?: Record<string, unknown>;
}): Array<{ prompt: string; answer: string }> {
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
      answer: `Sample response should demonstrate consistent reasoning and domain-appropriate vocabulary.`,
    },
  ];
}

function normalizePreviewItems(entry: any, normalizedTemplate: {
  label: string;
  subject: string;
  cognitiveIntent: string;
  sharedContext: string;
  configurableFields?: Record<string, unknown>;
}) {
  if (Array.isArray(entry.previewItems) && entry.previewItems.length > 0) {
    return entry.previewItems;
  }

  if (Array.isArray(entry.examples) && entry.examples.length > 0) {
    return entry.examples.slice(0, 2).map((example: unknown, idx: number) => ({
      prompt: String(example),
      answer: `Sample answer outline ${idx + 1}`,
    }));
  }

  return fallbackPreviewItems(normalizedTemplate);
}

function normalizeSystemTemplate(entry: any) {
  const id = normalizeString(entry.id);

  // Determine raw subject from template or fallback inference
  const rawSubject =
    (typeof entry.subject === "string" && entry.subject.trim().length > 0
      ? entry.subject.trim()
      : inferSystemSubject(id));

  // Normalize to canonical subject
  const subject = SUBJECT_MAP[rawSubject] ?? "Other";

  const normalized = {
    id,
    label: normalizeString(entry.label, id),

    // Use normalized subject
    subject,

    // DO NOT STRINGIFY ENUMS — use raw values
    itemType: entry.itemType ?? "short_answer",
    cognitiveIntent: entry.defaultIntent ?? entry.cognitiveIntent ?? "analyze",
    difficulty: entry.defaultDifficulty ?? entry.difficulty ?? "medium",
    sharedContext: entry.sharedContext ?? "none",

    configurableFields: entry.configurableFields ?? {},
    previewItems: [] as unknown[],
    isTeacherTemplate: false,
  };

  normalized.previewItems = normalizePreviewItems(entry, normalized);

  return {
    ...normalized,
    explanation: generateTemplateExplanation(normalized),
  };
}

function normalizeTeacherTemplate(entry: any) {
  const id = normalizeString(entry.id);

  const normalized = {
    id,
    label: normalizeString(entry.label, id),

    // Teacher templates keep their subject or default to Other
    subject: normalizeString(entry.subject, "Other"),

    // Teacher templates use raw values, not stringified enums
    itemType: entry.itemType ?? "short_answer",
    cognitiveIntent: entry.cognitiveIntent ?? "analyze",
    difficulty: entry.difficulty ?? "medium",
    sharedContext: entry.sharedContext ?? "none",

    configurableFields: entry.configurableFields ?? {},
    previewItems: [] as unknown[],
    examples: Array.isArray(entry.examples) ? entry.examples : [],
    inferred: entry.inferred ?? {},
    isTeacherTemplate: true,
  };

  normalized.previewItems = normalizePreviewItems(entry, normalized);

  return {
    ...normalized,
    explanation: generateTemplateExplanation(normalized),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({});
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const teacherId = String(req.query.teacherId ?? "").trim();
    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required" });
    }

    const merged = await getAllProblemTypesForTeacher(teacherId);

    const systemSource = Array.isArray(merged.system)
      ? merged.system
      : Object.values(merged.system ?? {});

    const system = systemSource.map((entry: any) => normalizeSystemTemplate(entry));
    const teacher = (merged.teacher ?? []).map((entry: any) => normalizeTeacherTemplate(entry));

    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

    return res.status(200).json({
      system,
      teacher,
    });
  } catch (error: any) {
    console.error("[api/templates] Failed:", error?.message ?? error);
    console.error("[api/templates] SUPABASE_URL:", process.env.SUPABASE_URL ? "set" : "MISSING");
    console.error("[api/templates] SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "set" : "MISSING");
    return res.status(500).json({
      error: "templates listing failed",
      message: error?.message ?? "Unknown error",
    });
  }
}

export async function getTemplates(teacherId: string) {
  const res = await fetch(`/api/templates?teacherId=${teacherId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`Failed to load templates: ${res.statusText}`);
  }

  return res.json(); // { system: [...], teacher: [...] }
}
