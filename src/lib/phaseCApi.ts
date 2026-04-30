import { fetchJson } from "./instructionalSessionApi";

export type PresenceLevel = "None" | "A few" | "Some" | "Many";
export type ClassLevel = "AP" | "Honors" | "Standard" | "Remedial";

export type ClassComposition = {
  ell: PresenceLevel;
  sped: PresenceLevel;
  gifted: PresenceLevel;
  attentionChallenges: PresenceLevel;
  readingChallenges: PresenceLevel;
};

export type ProfilePercentages = {
  ell: number;
  sped: number;
  adhd: number;
  dyslexia: number;
  gifted: number;
  attention504: number;
};

export type PhaseCClass = {
  id: string;
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: "9-10" | "11-12" | "Mixed";
  schoolYear: string;
  createdAt: string;
};

export type SyntheticStudent = {
  id: string;
  classId: string;
  displayName: string;
  profiles: string[];
  positiveTraits: string[];
  profileSummaryLabel: string;
  traits: {
    readingLevel: number;
    vocabularyLevel: number;
    backgroundKnowledge: number;
    processingSpeed: number;
    bloomMastery: number;
    mathLevel: number;
    writingLevel: number;
  };
};

export type SimulationRun = {
  id: string;
  classId: string;
  documentId: string;
  createdAt: string;
};

export type SimulationSummary = {
  totalRecords: number;
  averageConfusionScore: number;
  averageTimeSeconds: number;
  averageBloomGap: number;
};

export type DocumentSummary = {
  documentId: string;
  sourceFileName: string;
  createdAt: string;
};

export function listClassesApi() {
  return fetchJson<{ classes: PhaseCClass[] }>("/api/v4/classes");
}

export function createClassApi(input: {
  className: string;
  classLevel: ClassLevel;
  gradeBand?: "9-10" | "11-12" | "Mixed";
  profilePercentages: ProfilePercentages;
  studentCount?: number;
  seed?: string;
}) {
  return fetchJson<{ class: PhaseCClass; students: SyntheticStudent[] }>("/api/v4/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getClassDetailApi(classId: string) {
  return fetchJson<{
    class: PhaseCClass;
    students: SyntheticStudent[];
    summary: {
      studentCount: number;
      profileCounts: Record<string, number>;
      positiveTraitCounts: Record<string, number>;
    };
    simulations?: SimulationRun[];
  }>(`/api/v4/classes/${encodeURIComponent(classId)}`);
}

export function regenerateClassApi(classId: string, seed?: string) {
  return fetchJson<{ classId: string; students: SyntheticStudent[]; studentCount: number }>(`/api/v4/classes/${encodeURIComponent(classId)}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
  });
}

export function runSimulationUnifiedApi(input: { classId: string; documentId: string; selectedProfileIds?: string[]; mode: "class"; phaseBItems?: Array<{ itemId?: string; itemNumber?: number; logicalLabel: string; bloomLevel?: number; ingestionBloomLevel?: number; linguisticLoad?: number; cognitiveLoad?: number; representationLoad?: number }> }) {
  return fetchJson<{
    simulationId: string;
    classId: string;
    documentId: string;
    createdAt: string;
    resultCount: number;
    mode?: "class";
    selectedProfileIds?: string[];
    phaseCResults?: unknown;
  }>("/api/v4/simulations/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getSimulationViewApi(simulationId: string, view: "class" | "profile" | "student" | "phase-b", options?: { profile?: string; studentId?: string }) {
  const query = new URLSearchParams({ view, ...(options?.profile ? { profile: options.profile } : {}), ...(options?.studentId ? { studentId: options.studentId } : {}) });
  return fetchJson<{
    simulationId: string;
    classId: string;
    documentId: string;
    view: "class" | "profile" | "student" | "phase-b";
    summary: SimulationSummary;
    narrative?: {
      provider?: string;
      text?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };
    suggestions?: {
      hardestItems?: Array<{
        itemId: string;
        itemLabel?: string;
        logicalLabel?: string;
        pCorrect?: number;
      }>;
    };
    items?: Array<{
      itemId: string;
      itemLabel?: string;
      itemNumber?: number;
      groupId?: string;
      partIndex?: number;
      logicalLabel?: string;
      isParent?: boolean;
      confusionScore?: number;
      timeSeconds?: number;
      timeSecondsNormalized?: number;
      bloomGap?: number;
      difficultyScore?: number;
      abilityScore?: number;
      pCorrect?: number;
      linguisticLoad?: number;
      cognitiveLoad?: number;
      bloomLevel?: number;
      representationLoad?: number;
      traits?: {
        bloomLevel?: number;
        linguisticLoad?: number;
        cognitiveLoad?: number;
        representationLoad?: number;
        vocabDensity?: number;
        symbolDensity?: number;
        steps?: number;
      };
      symbolDensity?: number;
      vocabCounts?: {
        level1: number;
        level2: number;
        level3: number;
      };
      metadata?: {
        linguisticLoad?: number;
        cognitiveLoad?: number;
        bloomLevel?: number;
        representationLoad?: number;
        symbolDensity?: number;
        vocabCounts?: {
          level1: number;
          level2: number;
          level3: number;
        };
      };
    }>;
    availableStudentIds?: string[];
  }>(`/api/v4/simulations/${encodeURIComponent(simulationId)}?${query.toString()}`);
}

export function listDocumentsApi() {
  return fetchJson<{ documents: DocumentSummary[] }>("/api/v4/documents");
}
