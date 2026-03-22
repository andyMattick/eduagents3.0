import type { ProblemTagVector } from "../../schema/semantic";

export type ProblemTypeName = keyof ProblemTagVector["problemType"];
export type RepresentationName = ProblemTagVector["representation"];

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function pickDominantKey(scores: Record<string, number>, fallback: string): string {
  let winner = fallback;
  let bestScore = -1;

  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      winner = key;
    }
  }

  return winner;
}

export function scoreToDifficultyBand(score: number): "very_easy" | "easy" | "medium" | "hard" | "very_hard" {
  if (score < 0.2) {
    return "very_easy";
  }
  if (score < 0.4) {
    return "easy";
  }
  if (score < 0.65) {
    return "medium";
  }
  if (score < 0.85) {
    return "hard";
  }
  return "very_hard";
}

export function scoreToSectionDifficulty(score: number): "easy" | "medium" | "hard" {
  if (score < 0.34) {
    return "easy";
  }
  if (score < 0.67) {
    return "medium";
  }
  return "hard";
}

