import type { ExtractedProblemDifficulty } from "../schema/semantic";
import type { BloomLevel, ItemMode, ScenarioType } from "../teacherFeedback";

export interface CountedMode {
  mode: ItemMode;
  count: number;
}

export interface CountedScenario {
  scenario: ScenarioType;
  count: number;
}

export interface CountedBloom {
  level: BloomLevel;
  count: number;
}

export interface CountedDifficulty {
  band: ExtractedProblemDifficulty;
  count: number;
}
