// planners/narrowing/narrowingPlanner.ts
import type { Subject } from "./types";
import { narrowTopic } from "./subjectNarrowers";

type ArchitectPlanContext = {
  courseSubject?: string;
  topic?: string;
  narrowedTopic?: unknown;
  [key: string]: any;
};

export function applyNarrowing(context: ArchitectPlanContext): ArchitectPlanContext {
  const subject = normalizeSubject(context.courseSubject);
  const originalTopic = context.topic ?? "the topic";

  const narrowed = narrowTopic(subject, originalTopic);

  return {
    ...context,
    topic: narrowed.narrowedTopic,
    narrowedTopic: narrowed, // keep full object if you want
  };
}

function normalizeSubject(raw?: string): Subject {
  const value = String(raw ?? "").toLowerCase().trim();

  if (value === "english" || value === "language arts") return "ela";
  if (value === "history") return "history";
  if (value === "social studies") return "socialstudies";
  if (value === "socialstudies") return "socialstudies";
  if (value === "civics") return "civics";
  if (value === "government") return "government";
  if (value === "science") return "science";
  if (value === "math" || value === "mathematics") return "math";
  if (value === "stem" || value === "computer science" || value === "cs") return "stem";

  return "general";
}
