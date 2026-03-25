export interface TopicRefinementResult {
  needsRefinement: boolean;
  prompt: string;
  suggestions: string[];
  reason?: string;
}

export function needsTopicRefinement(
  topic: string,
  domain: string,
  estimatedSeconds: number
): boolean {
  const t = String(topic ?? "").toLowerCase().trim();
  const normalizedDomain = normalizeDomain(domain);

  if (!t) return true;
  if (estimatedSeconds > 150) return true;

  const broadELA = ["novel", "book", "story", "play", "poem", "author"];
  const broadHistory = ["war", "revolution", "era", "period", "civilization", "empire"];
  const broadScience = ["energy", "ecosystems", "forces", "motion", "cells", "matter"];
  const broadMath = ["fractions", "algebra", "geometry", "statistics", "functions"];
  const broadSTEM = ["robotics", "coding", "engineering", "design", "computer science"];

  const domainMap: Record<string, string[]> = {
    ela: broadELA,
    history: broadHistory,
    science: broadScience,
    math: broadMath,
    stem: broadSTEM,
    socialstudies: broadHistory,
    civics: broadHistory,
    government: broadHistory,
    general: [],
  };

  const patterns = domainMap[normalizedDomain] ?? [];
  if (patterns.some((pattern) => t.includes(pattern))) return true;

  const hasMicroAnchor =
    /\b(chapter|scene|paragraph|battle|treaty|law|theorem|proof|equation|dataset|variable|function|module|subsystem)\b/i.test(t) ||
    /\b\d+(st|nd|rd|th)?\b/.test(t);

  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (!hasMicroAnchor && wordCount > 3) return true;

  return false;
}

export function evaluateTopicRefinement(
  topic: string,
  domain: string,
  estimatedSeconds: number,
  microTopic?: string | null
): TopicRefinementResult {
  const normalizedDomain = normalizeDomain(domain);
  const broadByHeuristic = needsTopicRefinement(topic, normalizedDomain, estimatedSeconds);
  const narrowingFailed = !microTopic || String(microTopic).trim().length < 4;
  const definitelyBroad = estimatedSeconds > 240;

  const needsRefinement = broadByHeuristic || narrowingFailed || definitelyBroad;

  return {
    needsRefinement,
    prompt:
      "This topic covers a large amount of content. Would you like to narrow it to a specific scene, event, phenomenon, skill, or function?",
    suggestions: getDomainSuggestions(normalizedDomain),
    reason: definitelyBroad
      ? "high_estimated_time"
      : narrowingFailed
      ? "missing_micro_topic"
      : broadByHeuristic
      ? "broad_topic_pattern"
      : undefined,
  };
}

function normalizeDomain(domain: string): string {
  const d = String(domain ?? "").toLowerCase().trim();
  if (d.includes("english") || d.includes("ela") || d.includes("language arts")) return "ela";
  if (d.includes("history")) return "history";
  if (d.includes("social studies") || d.includes("socialstudies")) return "socialstudies";
  if (d.includes("civics")) return "civics";
  if (d.includes("government")) return "government";
  if (d.includes("science")) return "science";
  if (d.includes("math")) return "math";
  if (d.includes("stem") || d.includes("computer science") || d === "cs") return "stem";
  return "general";
}

function getDomainSuggestions(domain: string): string[] {
  switch (domain) {
    case "ela":
      return [
        "Which chapter, scene, or paragraph?",
        "Which character moment or conflict?",
      ];
    case "history":
    case "socialstudies":
    case "civics":
    case "government":
      return [
        "Which event, battle, document, or turning point?",
        "Which primary source or perspective?",
      ];
    case "science":
      return [
        "Which phenomenon, data set, or variable pair?",
        "Which measurable mechanism or process?",
      ];
    case "math":
      return [
        "Which specific skill or standard?",
        "Which exact problem type (e.g., adding unlike fractions, solving one-step equations)?",
      ];
    case "stem":
      return [
        "Which subsystem, debugging task, or function?",
        "Which module or process behavior should students analyze?",
      ];
    default:
      return [
        "Can you narrow to one concrete scenario or case?",
        "What is one specific detail you want every question to center on?",
      ];
  }
}