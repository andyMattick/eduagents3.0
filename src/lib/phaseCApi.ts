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

export type ClassTendencies = {
  manyFastWorkers?: boolean;
  manySlowAndCareful?: boolean;
  manyDetailOriented?: boolean;
  manyTestAnxious?: boolean;
  manyMathConfident?: boolean;
  manyStruggleReading?: boolean;
  manyEasilyDistracted?: boolean;
};

export type ClassOverlays = {
  composition: ClassComposition;
  tendencies: ClassTendencies;
};

export type PhaseCClass = {
  id: string;
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: "9-10" | "11-12" | "Mixed";
  schoolYear: string;
  overlays: ClassOverlays;
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
  name: string;
  level: ClassLevel;
  gradeBand?: "9-10" | "11-12" | "Mixed";
  schoolYear?: string;
  overlays: ClassOverlays;
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

export function runSimulationApi(input: { classId: string; documentId: string }) {
  return fetchJson<{
    simulationId: string;
    classId: string;
    documentId: string;
    createdAt: string;
    resultCount: number;
  }>("/api/v4/simulations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getSimulationViewApi(simulationId: string, view: "class" | "profile" | "student", options?: { profile?: string; studentId?: string }) {
  const query = new URLSearchParams({ view, ...(options?.profile ? { profile: options.profile } : {}), ...(options?.studentId ? { studentId: options.studentId } : {}) });
  return fetchJson<{
    simulationId: string;
    view: "class" | "profile" | "student";
    summary: SimulationSummary;
    items?: Array<{ itemId: string; itemLabel: string; confusionScore: number; timeSeconds: number; bloomGap: number }>;
    availableStudentIds?: string[];
  }>(`/api/v4/simulations/${encodeURIComponent(simulationId)}?${query.toString()}`);
}

export function listDocumentsApi() {
  return fetchJson<{ documents: DocumentSummary[] }>("/api/v4/documents");
}
