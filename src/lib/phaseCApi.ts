import { fetchJson } from "./instructionalSessionApi";

function buildAuthHeaders(userId?: string): Record<string, string> {
  if (!userId) {
    return {};
  }
  return {
    "x-user-id": userId,
    "x-auth-user-id": userId,
  };
}

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

export type UploadUsageTodayResponse = {
  userId: string | null;
  date: string;
  pagesUploaded: number;
  maxPagesPerDay: number;
  remainingPages: number;
};

export type SimulationUsageTodayResponse = {
  userId: string | null;
  date: string;
  simulationsRun: number;
  maxSimulationsPerDay: number;
  remainingSimulations: number | null;
  adminOverride: boolean;
};

export type SimulationReviewPayload = {
  simulationId: string;
  classId: string;
  documentId: string;
  severity: "low" | "medium" | "high";
  message: string;
  simulationSnapshot?: Record<string, unknown> | null;
};

export type AdminSimulationReview = {
  id: string;
  simulationId: string;
  classId: string;
  className: string | null;
  documentId: string;
  userId: string;
  severity: "low" | "medium" | "high";
  message: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt: string | null;
};

export type DocumentSummary = {
  documentId: string;
  sourceFileName: string;
  createdAt: string;
};

export type ClassResultHistoryItem = {
  assessmentId: string;
  type: "predicted" | "actual";
  timestamp: string;
};

export type ActualItemResult = {
  itemId: string;
  correct: boolean;
  time: number;
  confusion: number;
};

export type ActualStudentResult = {
  studentId: string;
  profiles: string[];
  positiveTraits: string[];
  actual: {
    score: number;
    time: number;
    itemResults: ActualItemResult[];
  };
};

export type ClassActualResultsResponse = {
  classId: string;
  assessmentId: string | null;
  students: ActualStudentResult[];
  summary?: {
    averageScore: number;
    averageTime: number;
    averageConfusion: number;
    averageCorrectRate: number;
  };
};

export type ProfileDelta = {
  timingDelta: number;
  confusionDelta: number;
  accuracyDelta: number;
};

export type ClassCompareResultsResponse = {
  classId: string;
  assessmentId: string | null;
  timingDelta: number;
  confusionDelta: number;
  accuracyDelta: number;
  profileDeltas: Record<string, ProfileDelta>;
  classAverages?: {
    predicted: {
      avgTime: number;
      avgConfusion: number;
      avgPCorrect: number;
    };
    actual: {
      avgTime: number;
      avgConfusion: number;
      avgPCorrect: number;
    };
  };
  itemDeltas?: Array<{
    itemId: string;
    timingDelta: number;
    confusionDelta: number;
    accuracyDelta: number;
  }>;
};

export function listClassesApi(userId?: string) {
  return fetchJson<{ classes: PhaseCClass[] }>("/api/v4/classes", {
    headers: buildAuthHeaders(userId),
  });
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

export function regenerateClassApi(classId: string, seed?: string, userId?: string) {
  return fetchJson<{ classId: string; students: SyntheticStudent[]; studentCount: number }>(`/api/v4/classes/${encodeURIComponent(classId)}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(userId) },
    body: JSON.stringify({ seed }),
  });
}

export function getUploadUsageTodayApi(userId?: string) {
  return fetchJson<UploadUsageTodayResponse>("/api/v4/documents/usage-today", {
    headers: buildAuthHeaders(userId),
  });
}

export function getSimulationUsageTodayApi(userId?: string) {
  return fetchJson<SimulationUsageTodayResponse>("/api/v4/simulations/usage-today", {
    headers: buildAuthHeaders(userId),
  });
}

export function runSimulationUnifiedApi(input: { classId: string; documentId: string; selectedProfileIds?: string[]; mode: "class"; phaseBItems?: Array<{ itemId?: string; itemNumber?: number; logicalLabel: string; bloomLevel?: number; ingestionBloomLevel?: number; linguisticLoad?: number; cognitiveLoad?: number; representationLoad?: number }> }, userId?: string) {
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
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(userId) },
    body: JSON.stringify(input),
  });
}

export function getSimulationViewApi(simulationId: string, view: "class" | "profile" | "student" | "phase-b", options?: { profile?: string; studentId?: string }, userId?: string) {
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
    students?: SyntheticStudent[];
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
  }>(`/api/v4/simulations/${encodeURIComponent(simulationId)}?${query.toString()}`, {
    headers: buildAuthHeaders(userId),
  });
}

export function submitSimulationReviewApi(payload: SimulationReviewPayload, userId?: string) {
  return fetchJson<{ ok: boolean; reviewId: string }>("/api/v4/simulations/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(userId) },
    body: JSON.stringify(payload),
  });
}

export function listAdminSimulationReviewsApi(filters?: {
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  classId?: string;
  userId?: string;
  resolved?: string;
}, userId?: string) {
  const query = new URLSearchParams();
  if (filters?.severity) query.set("severity", filters.severity);
  if (filters?.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) query.set("dateTo", filters.dateTo);
  if (filters?.classId) query.set("classId", filters.classId);
  if (filters?.userId) query.set("userId", filters.userId);
  if (filters?.resolved) query.set("resolved", filters.resolved);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchJson<{ reviews: AdminSimulationReview[] }>(`/api/v4/admin/simulation-reviews${suffix}`, {
    headers: { ...buildAuthHeaders(userId), "x-admin-override": "true" },
  });
}

export function resolveAdminSimulationReviewApi(reviewId: string, userId?: string) {
  return fetchJson<{ ok: boolean; reviewId: string }>(`/api/v4/admin/simulation-reviews/${encodeURIComponent(reviewId)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(userId), "x-admin-override": "true" },
  });
}

export function listDocumentsApi() {
  return fetchJson<{ documents: DocumentSummary[] }>("/api/v4/documents");
}

export function listClassResultsHistoryApi(classId: string) {
  return fetchJson<ClassResultHistoryItem[]>(`/api/v4/classes/${encodeURIComponent(classId)}/results`);
}

export function getClassActualResultsApi(classId: string, assessmentId?: string) {
  const query = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : "";
  return fetchJson<ClassActualResultsResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/results/actual${query}`);
}

export function getClassCompareResultsApi(classId: string, assessmentId?: string) {
  const query = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : "";
  return fetchJson<ClassCompareResultsResponse>(`/api/v4/classes/${encodeURIComponent(classId)}/results/compare${query}`);
}
