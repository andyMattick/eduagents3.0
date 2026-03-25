// planners/narrowing/types.ts
export type NarrowedTopic = {
  originalTopic: string;
  narrowedTopic: string;
  microTopic: string;
};

export type Subject =
  | "ela"
  | "history"
  | "socialstudies"
  | "civics"
  | "government"
  | "science"
  | "math"
  | "stem"
  | "general";
