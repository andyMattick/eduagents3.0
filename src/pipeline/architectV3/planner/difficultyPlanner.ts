import { ArchitectV3Input } from "../types";

export type DifficultyProfile = "easy" | "medium" | "hard" | "rampUp" | "rampDown";

export function planDifficultyProfile(input: ArchitectV3Input): DifficultyProfile {
  const curve = input.teacherProfile?.rigor_curve;

  if (Array.isArray(curve) && curve.length > 1) {
    const first = curve[0];
    const last = curve[curve.length - 1];

    if (first < last) return "rampUp";
    if (first > last) return "rampDown";

    const avg = curve.reduce((a, b) => a + b, 0) / curve.length;
    if (avg < 0.33) return "easy";
    if (avg < 0.66) return "medium";
    return "hard";
  }

  if (typeof input.courseProfile?.difficulty_curve === "string") {
    return input.courseProfile.difficulty_curve as DifficultyProfile;
  }

  return "medium";
}

export function pickDifficultyForIndex(
  profile: DifficultyProfile,
  index: number,
  total: number
): "easy" | "medium" | "hard" {
  if (profile === "easy" || profile === "medium" || profile === "hard") {
    return profile;
  }

  const ratio = total > 1 ? index / (total - 1) : 0;

  if (profile === "rampUp") {
    if (ratio < 0.33) return "easy";
    if (ratio < 0.66) return "medium";
    return "hard";
  }

  if (profile === "rampDown") {
    if (ratio < 0.33) return "hard";
    if (ratio < 0.66) return "medium";
    return "easy";
  }

  return "medium";
}
