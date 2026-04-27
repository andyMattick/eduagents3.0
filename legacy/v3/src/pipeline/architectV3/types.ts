import {
  UnifiedAnalyzerOutput,
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "../schema/unifiedSchema";




export interface ArchitectV3Input {
  view: string;
  schema: UnifiedAnalyzerOutput;
  viewData: any;
  teacherProfile: UnifiedTeacherStyleProfile;
  courseProfile: UnifiedTemplateProfile;
}

export interface ArchitectV3Slot {
  id: string;
  questionType: string;
  difficulty: "easy" | "medium" | "hard";
  cognitiveDemand?: string | null;
  pacingSeconds?: number | null;
  templateId?: string | null;
  diagramType?: string | null;
  imageReferenceId?: string | null;
  topicAngle?: string | null;
}

export interface ArchitectV3Plan {
  slots: ArchitectV3Slot[];
  difficultyProfile: string;
  cognitiveDistribution: Record<string, number>;
  pacingSecondsPerItem: number;
  depthFloor?: string | null;
  depthCeiling?: string | null;
}

export interface ArchitectV3Output {
  plan: ArchitectV3Plan;
  feasibilityReport?: any;
  styleConstraints?: any;
  derivedStructuralConstraints?: any;
}

export type ArchitectQuestionType =
  | "multipleChoice"
  | "multiSelect"
  | "trueFalse"
  | "matching"
  | "ordering"
  | "shortAnswer"
  | "constructedResponse"
  | "graphing"
  | "equationEntry"
  | "dragAndDrop"
  | "passageBased"
  | "performanceTask";



  