import { SectionStructure } from "./section";

export interface TeacherStyleProfile {
  preferredQuestionTypes: string[];
  preferredDifficultyMix: Record<string, number>;
  preferredBloomMix: Record<string, number>;
  preferredRepresentations: string[];
  preferredSurfaceArea: string;
  preferredInstructionsStyle: string;
  preferredTone: string;
  preferredSectionStructure?: SectionStructure;
}
