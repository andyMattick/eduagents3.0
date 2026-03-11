import { ArchitectV3Input } from "../types";

export function planPacing(input: ArchitectV3Input): number {
  const pacing = input.teacherProfile?.pacing;

  if (typeof pacing === "number") {
    return pacing;
  }

  if (typeof pacing === "string") {
    switch (pacing) {
      case "slow": return 90;
      case "fast": return 45;
      case "normal":
      default:
        return 60;
    }
  }

  // fallback to course profile if numeric
  if (typeof input.courseProfile?.pacing === "number") {
    return input.courseProfile.pacing;
  }

  return 60;
}
