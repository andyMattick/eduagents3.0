import { useEffect, useState } from "react";

import type {
  ConceptBlueprint,
  ConceptBlueprintBloomLevel,
  ConceptBlueprintScenarioType,
  TestProduct,
} from "../../prism-v4/schema/integration";
import type { IntentProduct, IntentProductPayload } from "../../prism-v4/schema/integration/IntentProduct";
import { buildInstructionalUnitOverrideId, canonicalConceptId, type AssessmentFingerprint } from "../../prism-v4/teacherFeedback";
import type { StudentPerformanceProfile } from "../../prism-v4/studentPerformance";
import type { AssessmentPreviewModel, BlueprintModel, BuilderPlanModel, ClassProfileModel, ConceptMapModel, DifferentiatedBuildModel } from "../../types/v4/InstructionalSession";
import { AssessmentPreview } from "./AssessmentPreview";
import { BuilderPlanView } from "./BuilderPlanView";
import { BlueprintPanel } from "./BlueprintPanel";
import { ClassDifferentiator } from "./ClassDifferentiator";
import { ConceptMap } from "./ConceptMap";
import { StudentProfilePanel } from "./StudentProfilePanel";
import { TeacherFingerprintPanel } from "./TeacherFingerprintPanel";
import { cleanupProductPayload } from "./utils/cleanup";

const BLOOM_LEVEL_OPTIONS: ConceptBlueprintBloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
const SCENARIO_TYPE_OPTIONS: ConceptBlueprintScenarioType[] = ["real-world", "simulation", "data-table", "graphical", "abstract-symbolic"];
const LOCAL_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

type SessionBlueprintResponse = {
  sessionId: string;
  assessmentId: string;
  teacherId: string;
  blueprint: BlueprintModel;
  conceptMap: ConceptMapModel;
};

type StudentProfileResponse = {
  studentId: string;
  unitId?: string;
  profile: StudentPerformanceProfile;
  misconceptions: Array<string>;
  exposureTimeline: Array<{ timestamp: string; conceptId: string; conceptLabel?: string }>;
  responseTimes: Array<{ itemId: string; conceptId: string; ms: number }>;
};

type BuilderPlanResponse = {
  sessionId: string;
  builderPlan: BuilderPlanModel;
};

type AssessmentPreviewResponse = {
  sessionId: string;
  assessmentPreview: AssessmentPreviewModel;
};

type SectionBlueprintDraft = {
  concept: string;
  itemCount: number;
  included: boolean;
  bloomCeiling: ConceptBlueprintBloomLevel | "";
  scenarioPatterns: ConceptBlueprintScenarioType[];
  bloomDistribution: Partial<Record<ConceptBlueprintBloomLevel, number>>;
};

type AddedConceptDraft = {
  id: string;
  displayName: string;
  conceptId: string;
  absoluteItemHint: number;
  maxBloomLevel: ConceptBlueprintBloomLevel | "";
  scenarioPatterns: ConceptBlueprintScenarioType[];
};

type MergeConceptDraft = {
  id: string;
  conceptIdsText: string;
  mergedConceptId: string;
  displayName: string;
};

type AssessmentDraftSummaryEntry = {
  conceptId: string;
  label: string;
  sourceLabels: string[];
  itemCount: number;
  bloomCeiling: ConceptBlueprintBloomLevel | "";
  bloomDistribution: Partial<Record<ConceptBlueprintBloomLevel, number>>;
  scenarioPatterns: ConceptBlueprintScenarioType[];
  isAdded: boolean;
  isMerged: boolean;
};

function groupLessonScaffolds(scaffolds: Array<{ concept: string; level: "low" | "medium" | "high"; strategy: string }>) {
  return scaffolds.reduce<Map<string, typeof scaffolds>>((map, scaffold) => {
    const bucket = map.get(scaffold.concept) ?? [];
    bucket.push(scaffold);
    map.set(scaffold.concept, bucket);
    return map;
  }, new Map());
}

function parseConceptList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toTitleLabel(value: string) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ");
}

function createSectionBlueprintDraft(section: TestProduct["sections"][number]): SectionBlueprintDraft {
  return {
    concept: section.concept,
    itemCount: section.items.length,
    included: true,
    bloomCeiling: "",
    scenarioPatterns: [],
    bloomDistribution: {},
  };
}

function createAddedConceptDraft(index: number): AddedConceptDraft {
  return {
    id: `added-concept-${index}`,
    displayName: "",
    conceptId: "",
    absoluteItemHint: 1,
    maxBloomLevel: "",
    scenarioPatterns: [],
  };
}

function createMergeConceptDraft(index: number): MergeConceptDraft {
  return {
    id: `merge-concept-${index}`,
    conceptIdsText: "",
    mergedConceptId: "",
    displayName: "",
  };
}

function toggleScenarioPattern<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
}

function normalizeBloomDistribution(distribution: Partial<Record<ConceptBlueprintBloomLevel, number>>) {
  const entries = Object.entries(distribution).flatMap(([level, count]) => {
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
      return [];
    }
    return [[level, Math.floor(count)] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) as Partial<Record<ConceptBlueprintBloomLevel, number>> : undefined;
}

function highestBloomLevel(levels: Array<ConceptBlueprintBloomLevel | "">) {
  return levels.reduce<ConceptBlueprintBloomLevel | "">((current, level) => {
    if (!level) {
      return current;
    }
    if (!current) {
      return level;
    }
    return BLOOM_LEVEL_OPTIONS.indexOf(level) > BLOOM_LEVEL_OPTIONS.indexOf(current) ? level : current;
  }, "");
}

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

function sumBloomDistributions(entries: Partial<Record<ConceptBlueprintBloomLevel, number>>[]) {
  return Object.fromEntries(BLOOM_LEVEL_OPTIONS.flatMap((level) => {
    const total = entries.reduce((sum, entry) => sum + (entry[level] ?? 0), 0);
    return total > 0 ? [[level, total] as const] : [];
  })) as Partial<Record<ConceptBlueprintBloomLevel, number>>;
}

function formatBloomDistributionSummary(distribution: Partial<Record<ConceptBlueprintBloomLevel, number>>) {
  const entries = BLOOM_LEVEL_OPTIONS.flatMap((level) => {
    const count = distribution[level];
    return typeof count === "number" && count > 0 ? [`${toTitleLabel(level)} x${count}`] : [];
  });
  return entries.length > 0 ? entries.join(", ") : "Builder default";
}

function formatScenarioSummary(scenarios: ConceptBlueprintScenarioType[]) {
  return scenarios.length > 0 ? scenarios.map((scenario) => toTitleLabel(scenario)).join(", ") : "Builder default";
}

function buildAssessmentDraftSummary(
  sectionDrafts: SectionBlueprintDraft[],
  addedConceptDrafts: AddedConceptDraft[],
  mergeDrafts: MergeConceptDraft[],
) {
  const entries = new Map<string, AssessmentDraftSummaryEntry>();
  let order = sectionDrafts
    .filter((entry) => entry.included)
    .map((entry) => {
      const conceptId = canonicalConceptId(entry.concept);
      entries.set(conceptId, {
        conceptId,
        label: entry.concept,
        sourceLabels: [entry.concept],
        itemCount: Math.max(1, Math.floor(entry.itemCount)),
        bloomCeiling: entry.bloomCeiling,
        bloomDistribution: normalizeBloomDistribution(entry.bloomDistribution) ?? {},
        scenarioPatterns: [...entry.scenarioPatterns],
        isAdded: false,
        isMerged: false,
      });
      return conceptId;
    });

  for (const entry of addedConceptDrafts) {
    const displayName = entry.displayName.trim();
    if (!displayName) {
      continue;
    }
    const conceptId = canonicalConceptId(entry.conceptId.trim() || displayName);
    entries.set(conceptId, {
      conceptId,
      label: displayName,
      sourceLabels: [displayName],
      itemCount: Math.max(1, Math.floor(entry.absoluteItemHint)),
      bloomCeiling: entry.maxBloomLevel,
      bloomDistribution: {},
      scenarioPatterns: [...entry.scenarioPatterns],
      isAdded: true,
      isMerged: false,
    });
    if (!order.includes(conceptId)) {
      order.push(conceptId);
    }
  }

  for (const merge of mergeDrafts) {
    const sourceIds = uniqueValues(parseConceptList(merge.conceptIdsText).map((entry) => canonicalConceptId(entry)));
    const mergedConceptId = merge.mergedConceptId.trim() ? canonicalConceptId(merge.mergedConceptId) : "";
    if (sourceIds.length < 2 || !mergedConceptId) {
      continue;
    }

    const sourceEntries = sourceIds.flatMap((conceptId) => {
      const entry = entries.get(conceptId);
      return entry ? [entry] : [];
    });
    const existingMerged = !sourceIds.includes(mergedConceptId) ? entries.get(mergedConceptId) : undefined;
    if (existingMerged) {
      sourceEntries.push(existingMerged);
    }
    if (sourceEntries.length === 0) {
      continue;
    }

    const mergedEntry: AssessmentDraftSummaryEntry = {
      conceptId: mergedConceptId,
      label: merge.displayName.trim() || sourceEntries[0]?.label || merge.mergedConceptId.trim(),
      sourceLabels: uniqueValues(sourceEntries.flatMap((entry) => entry.sourceLabels)),
      itemCount: sourceEntries.reduce((sum, entry) => sum + Math.max(1, entry.itemCount), 0),
      bloomCeiling: highestBloomLevel(sourceEntries.map((entry) => entry.bloomCeiling)),
      bloomDistribution: sumBloomDistributions(sourceEntries.map((entry) => entry.bloomDistribution)),
      scenarioPatterns: uniqueValues(sourceEntries.flatMap((entry) => entry.scenarioPatterns)),
      isAdded: false,
      isMerged: true,
    };

    for (const conceptId of sourceIds) {
      entries.delete(conceptId);
    }
    if (existingMerged) {
      entries.delete(mergedConceptId);
    }
    entries.set(mergedConceptId, mergedEntry);

    const nextOrder: string[] = [];
    for (const conceptId of order) {
      if (sourceIds.includes(conceptId) || conceptId === mergedConceptId) {
        if (!nextOrder.includes(mergedConceptId)) {
          nextOrder.push(mergedConceptId);
        }
        continue;
      }
      if (!nextOrder.includes(conceptId)) {
        nextOrder.push(conceptId);
      }
    }
    if (!nextOrder.includes(mergedConceptId)) {
      nextOrder.push(mergedConceptId);
    }
    order = nextOrder;
  }

  const orderedEntries = order.flatMap((conceptId) => {
    const entry = entries.get(conceptId);
    return entry ? [entry] : [];
  });

  return {
    entries: orderedEntries,
    finalOrderLabels: orderedEntries.map((entry) => entry.label),
    totalItemCount: orderedEntries.reduce((sum, entry) => sum + Math.max(1, entry.itemCount), 0),
  };
}

function moveDraftSection(drafts: SectionBlueprintDraft[], concept: string, direction: -1 | 1) {
  const index = drafts.findIndex((entry) => entry.concept === concept);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= drafts.length) {
    return drafts;
  }
  const next = [...drafts];
  const [entry] = next.splice(index, 1);
  next.splice(nextIndex, 0, entry);
  return next;
}

function toConceptWeights(concepts: string[]) {
  return concepts.reduce<Record<string, number>>((accumulator, concept) => {
    accumulator[concept] = 1;
    return accumulator;
  }, {});
}

function buildAssessmentConceptBlueprintEdits(
  product: Extract<IntentProductPayload, { kind: "test" }>,
  sectionDrafts: SectionBlueprintDraft[],
  addedConceptDrafts: AddedConceptDraft[],
  mergeDrafts: MergeConceptDraft[],
): ConceptBlueprint["edits"] {
  const includedDrafts = sectionDrafts.filter((entry) => entry.included);
  const itemCountOverrides = Object.fromEntries(includedDrafts.map((entry) => [entry.concept, Math.max(1, Math.floor(entry.itemCount))]));
  const bloomCeilings = Object.fromEntries(includedDrafts.flatMap((entry) => entry.bloomCeiling ? [[entry.concept, entry.bloomCeiling] as const] : []));
  const scenarioOverrides = Object.fromEntries(includedDrafts.flatMap((entry) => entry.scenarioPatterns.length > 0 ? [[entry.concept, entry.scenarioPatterns] as const] : []));
  const bloomDistributions = Object.fromEntries(includedDrafts.flatMap((entry) => {
    const normalized = normalizeBloomDistribution(entry.bloomDistribution);
    return normalized ? [[entry.concept, normalized] as const] : [];
  }));
  const addConcepts = addedConceptDrafts.flatMap((entry) => {
    const displayName = entry.displayName.trim();
    if (!displayName) {
      return [];
    }
    const conceptId = entry.conceptId.trim();
    return [{
      displayName,
      conceptId: conceptId || undefined,
      absoluteItemHint: Math.max(1, Math.floor(entry.absoluteItemHint)),
      maxBloomLevel: entry.maxBloomLevel || undefined,
      scenarioPatterns: entry.scenarioPatterns.length > 0 ? entry.scenarioPatterns : undefined,
    }];
  });
  const mergeConcepts = mergeDrafts.flatMap((entry) => {
    const conceptIds = parseConceptList(entry.conceptIdsText);
    const mergedConceptId = entry.mergedConceptId.trim();
    if (conceptIds.length < 2 || !mergedConceptId) {
      return [];
    }
    const displayName = entry.displayName.trim();
    return [{
      conceptIds,
      mergedConceptId,
      displayName: displayName || undefined,
    }];
  });

  return {
    removeConceptIds: sectionDrafts.filter((entry) => !entry.included).map((entry) => entry.concept),
    itemCountOverrides,
    bloomCeilings,
    bloomDistributions,
    scenarioOverrides,
    addConcepts,
    mergeConcepts,
    sectionOrder: includedDrafts.length > 0 ? includedDrafts.map((entry) => entry.concept) : product.sections.map((section) => section.concept),
  };
}

function buildAssessmentConceptBlueprint(
  product: Extract<IntentProductPayload, { kind: "test" }>,
  sectionDrafts: SectionBlueprintDraft[],
  addedConceptDrafts: AddedConceptDraft[],
  mergeDrafts: MergeConceptDraft[],
): ConceptBlueprint {
  return {
    edits: buildAssessmentConceptBlueprintEdits(product, sectionDrafts, addedConceptDrafts, mergeDrafts),
  };
}

function buildDefaultAssessmentDraftState(product: Extract<IntentProductPayload, { kind: "test" }>) {
  return {
    sectionDrafts: product.sections.map(createSectionBlueprintDraft),
    addedConceptDrafts: [] as AddedConceptDraft[],
    mergeDrafts: [] as MergeConceptDraft[],
    nextAddedConceptId: 1,
    nextMergeId: 1,
  };
}

function buildAssessmentDraftStateFromFingerprint(product: Extract<IntentProductPayload, { kind: "test" }>, assessment: AssessmentFingerprint) {
  const originalSections = new Map(product.sections.map((section) => [canonicalConceptId(section.concept), section] as const));
  const profilesById = new Map(assessment.conceptProfiles.map((profile) => [profile.conceptId, profile] as const));
  const orderedProfileIds = [...new Set([...assessment.flowProfile.sectionOrder, ...assessment.conceptProfiles.map((profile) => profile.conceptId)])];

  const sectionDrafts: SectionBlueprintDraft[] = orderedProfileIds.flatMap((conceptId) => {
    const profile = profilesById.get(conceptId);
    if (!profile || !originalSections.has(conceptId)) {
      return [];
    }
    return [{
      concept: profile.displayName,
      itemCount: Math.max(1, profile.absoluteItemHint ?? originalSections.get(conceptId)?.items.length ?? 1),
      included: true,
      bloomCeiling: profile.maxBloomLevel,
      scenarioPatterns: [...profile.scenarioPatterns],
      bloomDistribution: Object.fromEntries(BLOOM_LEVEL_OPTIONS.flatMap((level) => profile.bloomDistribution[level] > 0 ? [[level, profile.bloomDistribution[level]] as const] : [])),
    }];
  });

  for (const section of product.sections) {
    const conceptId = canonicalConceptId(section.concept);
    if (!profilesById.has(conceptId)) {
      sectionDrafts.push({
        ...createSectionBlueprintDraft(section),
        included: false,
      });
    }
  }

  const addedConceptDrafts = orderedProfileIds.flatMap((conceptId, index) => {
    const profile = profilesById.get(conceptId);
    if (!profile || originalSections.has(conceptId)) {
      return [];
    }
    return [{
      id: `loaded-added-concept-${index + 1}`,
      displayName: profile.displayName,
      conceptId: profile.conceptId,
      absoluteItemHint: Math.max(1, profile.absoluteItemHint ?? 1),
      maxBloomLevel: profile.maxBloomLevel,
      scenarioPatterns: [...profile.scenarioPatterns],
    }];
  });

  return {
    sectionDrafts,
    addedConceptDrafts,
    mergeDrafts: [] as MergeConceptDraft[],
    nextAddedConceptId: addedConceptDrafts.length + 1,
    nextMergeId: 1,
  };
}

function ItemExplanation(props: { item: Extract<TestProduct["sections"][number]["items"][number], { explanation?: unknown }> }) {
  const { item } = props;
  if (!item.explanation) {
    return null;
  }

  return (
    <div className="v4-item-explanation">
      <p><strong>Concept:</strong> {item.explanation.conceptReason}</p>
      <p><strong>Bloom:</strong> {item.explanation.bloomReason}</p>
      <p><strong>Scenario:</strong> {item.explanation.scenarioReason}</p>
      <p><strong>Item Mode:</strong> {item.explanation.itemModeReason}</p>
    </div>
  );
}

function AssessmentWorkbench(props: {
  product: Extract<IntentProductPayload, { kind: "test" }>;
  assessmentId: string;
  sessionId?: string;
  classId?: string;
  documentIds: string[];
  availableStudentIds?: string[];
  classProfile?: ClassProfileModel | null;
  onLoadClassProfile?: ((classId: string) => Promise<unknown>) | null;
  differentiatedBuild?: DifferentiatedBuildModel | null;
  onLoadDifferentiatedBuild?: ((classId: string) => Promise<unknown>) | null;
}) {
  const { product, assessmentId, sessionId, classId, documentIds, availableStudentIds = [], classProfile = null, onLoadClassProfile = null, differentiatedBuild = null, onLoadDifferentiatedBuild = null } = props;
  const [activeTab, setActiveTab] = useState<"blueprint" | "concept-map" | "student" | "class" | "plan" | "preview" | "fingerprint">("blueprint");
  const [sessionBlueprint, setSessionBlueprint] = useState<SessionBlueprintResponse | null>(null);
  const [isLoadingBlueprint, setIsLoadingBlueprint] = useState(false);
  const [blueprintStatus, setBlueprintStatus] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string>(availableStudentIds[0] ?? "");
  const [studentProfilePayload, setStudentProfilePayload] = useState<StudentProfileResponse | null>(null);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [builderPlanPayload, setBuilderPlanPayload] = useState<BuilderPlanResponse | null>(null);
  const [assessmentPreviewPayload, setAssessmentPreviewPayload] = useState<AssessmentPreviewResponse | null>(null);
  const [isLoadingBuilderPlan, setIsLoadingBuilderPlan] = useState(false);
  const [isLoadingAssessmentPreview, setIsLoadingAssessmentPreview] = useState(false);
  const [builderPlanStatus, setBuilderPlanStatus] = useState<string | null>(null);
  const [assessmentPreviewStatus, setAssessmentPreviewStatus] = useState<string | null>(null);

  async function loadSessionBlueprint() {
    if (!sessionId) {
      return;
    }
    setIsLoadingBlueprint(true);
    setBlueprintStatus(null);
    try {
      const response = await fetch(`/api/v4/sessions/${encodeURIComponent(sessionId)}/blueprint`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load session blueprint.");
      }
      setSessionBlueprint(payload as SessionBlueprintResponse);
    } catch (error) {
      setBlueprintStatus(error instanceof Error ? error.message : "Failed to load session blueprint.");
    } finally {
      setIsLoadingBlueprint(false);
    }
  }

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    void loadSessionBlueprint();
  }, [sessionId, assessmentId]);

  async function loadStudentProfile(studentId: string) {
    setIsLoadingStudent(true);
    setStudentStatus(null);
    try {
      const response = await fetch(`/api/v4/students/${encodeURIComponent(studentId)}/performance`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load student profile.");
      }
      setStudentProfilePayload(payload as StudentProfileResponse);
      setActiveStudentId(studentId);
    } catch (error) {
      setStudentStatus(error instanceof Error ? error.message : "Failed to load student profile.");
    } finally {
      setIsLoadingStudent(false);
    }
  }

  async function loadBuilderPlan(studentId?: string) {
    if (!sessionId) {
      return;
    }
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    setIsLoadingBuilderPlan(true);
    setBuilderPlanStatus(null);
    try {
      const response = await fetch(`/api/v4/sessions/${encodeURIComponent(sessionId)}/builder-plan${query}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load builder plan.");
      }
      setBuilderPlanPayload(payload as BuilderPlanResponse);
    } catch (error) {
      setBuilderPlanStatus(error instanceof Error ? error.message : "Failed to load builder plan.");
    } finally {
      setIsLoadingBuilderPlan(false);
    }
  }

  async function loadAssessmentPreview(studentId?: string) {
    if (!sessionId) {
      return;
    }
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    setIsLoadingAssessmentPreview(true);
    setAssessmentPreviewStatus(null);
    try {
      const response = await fetch(`/api/v4/sessions/${encodeURIComponent(sessionId)}/assessment-preview${query}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load assessment preview.");
      }
      setAssessmentPreviewPayload(payload as AssessmentPreviewResponse);
    } catch (error) {
      setAssessmentPreviewStatus(error instanceof Error ? error.message : "Failed to load assessment preview.");
    } finally {
      setIsLoadingAssessmentPreview(false);
    }
  }

  useEffect(() => {
    if (!activeStudentId) {
      return;
    }
    void loadStudentProfile(activeStudentId);
  }, [activeStudentId]);

  useEffect(() => {
    if (!sessionId || activeTab !== "plan" || builderPlanPayload) {
      return;
    }
    void loadBuilderPlan(activeStudentId || undefined);
  }, [activeStudentId, activeTab, builderPlanPayload, sessionId]);

  useEffect(() => {
    if (!sessionId || activeTab !== "preview" || assessmentPreviewPayload) {
      return;
    }
    void loadAssessmentPreview(activeStudentId || undefined);
  }, [activeStudentId, activeTab, assessmentPreviewPayload, sessionId]);

  useEffect(() => {
    setBuilderPlanPayload(null);
    setAssessmentPreviewPayload(null);
    setBuilderPlanStatus(null);
    setAssessmentPreviewStatus(null);
  }, [activeStudentId, sessionId]);

  return (
    <div className="v4-product-grid">
      <div className="v4-product-card v4-product-span">
        <div className="v4-tab-strip" role="tablist" aria-label="Assessment workbench tabs">
          <button className={`v4-tab-button ${activeTab === "blueprint" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "blueprint"} onClick={() => setActiveTab("blueprint")}>Blueprint</button>
          <button className={`v4-tab-button ${activeTab === "concept-map" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "concept-map"} onClick={() => setActiveTab("concept-map")}>Concept Map</button>
          <button className={`v4-tab-button ${activeTab === "student" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "student"} onClick={() => setActiveTab("student")}>Student Brain</button>
          <button className={`v4-tab-button ${activeTab === "class" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "class"} onClick={() => setActiveTab("class")}>Class</button>
          <button className={`v4-tab-button ${activeTab === "plan" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "plan"} onClick={() => setActiveTab("plan")}>Builder Plan</button>
          <button className={`v4-tab-button ${activeTab === "preview" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "preview"} onClick={() => setActiveTab("preview")}>Living Assessment</button>
          <button className={`v4-tab-button ${activeTab === "fingerprint" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "fingerprint"} onClick={() => setActiveTab("fingerprint")}>Teacher Fingerprint</button>
        </div>
      </div>
      <div className="v4-product-span">
        {activeTab === "blueprint" ? (
          <BlueprintPanel
            blueprint={sessionBlueprint?.blueprint ?? null}
            conceptMap={sessionBlueprint?.conceptMap ?? null}
            isLoading={isLoadingBlueprint}
            status={blueprintStatus}
            onRefresh={sessionId ? () => { void loadSessionBlueprint(); } : null}
          >
            <AssessmentConceptVerificationPanel assessmentId={assessmentId} sessionId={sessionId} documentIds={documentIds} product={product} />
          </BlueprintPanel>
        ) : null}
        {activeTab === "concept-map" ? (
          <ConceptMap conceptMap={sessionBlueprint?.conceptMap ?? null} studentProfile={studentProfilePayload?.profile ?? null} isLoading={isLoadingBlueprint} onRefresh={sessionId ? () => { void loadSessionBlueprint(); } : null} />
        ) : null}
        {activeTab === "student" ? (
          <div className="v4-product-grid">
            <div className="v4-product-span">
              <StudentProfilePanel
                availableStudentIds={availableStudentIds}
                activeStudentId={activeStudentId}
                profile={studentProfilePayload?.profile ?? null}
                misconceptions={studentProfilePayload?.misconceptions ?? []}
                exposureTimeline={studentProfilePayload?.exposureTimeline ?? []}
                responseTimes={studentProfilePayload?.responseTimes ?? []}
                status={studentStatus}
                isLoading={isLoadingStudent}
                onStudentChange={(studentId) => setActiveStudentId(studentId)}
                onLoadStudent={(studentId) => { void loadStudentProfile(studentId); }}
              />
            </div>
            <div className="v4-product-span">
              <ConceptMap conceptMap={sessionBlueprint?.conceptMap ?? null} studentProfile={studentProfilePayload?.profile ?? null} isLoading={isLoadingBlueprint || isLoadingStudent} onRefresh={sessionId ? () => { void loadSessionBlueprint(); } : null} />
            </div>
          </div>
        ) : null}
        {activeTab === "class" ? (
          <ClassDifferentiator classId={classId ?? sessionId} classProfile={classProfile} onLoadClassProfile={onLoadClassProfile} differentiatedBuild={differentiatedBuild} onLoadDifferentiatedBuild={onLoadDifferentiatedBuild} />
        ) : null}
        {activeTab === "plan" ? (
          <BuilderPlanView
            plan={builderPlanPayload?.builderPlan ?? null}
            isLoading={isLoadingBuilderPlan}
            status={builderPlanStatus}
            onRefresh={sessionId ? () => { void loadBuilderPlan(activeStudentId || undefined); } : null}
          />
        ) : null}
        {activeTab === "preview" ? (
          <AssessmentPreview
            preview={assessmentPreviewPayload?.assessmentPreview ?? null}
            isLoading={isLoadingAssessmentPreview}
            status={assessmentPreviewStatus}
            onRefresh={sessionId ? () => { void loadAssessmentPreview(activeStudentId || undefined); } : null}
          />
        ) : null}
        {activeTab === "fingerprint" ? (
          <TeacherFingerprintPanel teacherId={sessionBlueprint?.teacherId ?? LOCAL_TEACHER_ID} />
        ) : null}
      </div>
    </div>
  );
}

function AssessmentConceptVerificationPanel(props: {
  sessionId?: string;
  documentIds: string[];
  assessmentId: string;
  product: Extract<IntentProductPayload, { kind: "test" }>;
}) {
  const { sessionId, documentIds, assessmentId, product } = props;
  const [sectionDrafts, setSectionDrafts] = useState<SectionBlueprintDraft[]>(() => buildDefaultAssessmentDraftState(product).sectionDrafts);
  const [addedConceptDrafts, setAddedConceptDrafts] = useState<AddedConceptDraft[]>([]);
  const [mergeDrafts, setMergeDrafts] = useState<MergeConceptDraft[]>([]);
  const [nextAddedConceptId, setNextAddedConceptId] = useState(1);
  const [nextMergeId, setNextMergeId] = useState(1);
  const [preview, setPreview] = useState<Extract<IntentProductPayload, { kind: "test" }> | null>(null);
  const [previewNarrative, setPreviewNarrative] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);

  function resetDraftState() {
    const next = buildDefaultAssessmentDraftState(product);
    setSectionDrafts(next.sectionDrafts);
    setAddedConceptDrafts(next.addedConceptDrafts);
    setMergeDrafts(next.mergeDrafts);
    setNextAddedConceptId(next.nextAddedConceptId);
    setNextMergeId(next.nextMergeId);
  }

  function applyLoadedDraftState(next: ReturnType<typeof buildDefaultAssessmentDraftState>) {
    setSectionDrafts(next.sectionDrafts);
    setAddedConceptDrafts(next.addedConceptDrafts);
    setMergeDrafts(next.mergeDrafts);
    setNextAddedConceptId(next.nextAddedConceptId);
    setNextMergeId(next.nextMergeId);
  }

  useEffect(() => {
    resetDraftState();
    setPreview(null);
    setPreviewNarrative(null);
    setStatus(null);
    setHasStoredDraft(false);
  }, [product]);

  useEffect(() => {
    let isCancelled = false;

    async function loadStoredBlueprint(silent: boolean) {
      setBusyAction("load-draft");
      try {
        const response = await fetch(`/api/v4/teacher-feedback/assessment-blueprint?assessmentId=${encodeURIComponent(assessmentId)}`);
        if (response.status === 404) {
          if (!isCancelled) {
            setHasStoredDraft(false);
            applyLoadedDraftState(buildDefaultAssessmentDraftState(product));
            if (!silent) {
              setStatus("No saved draft found.");
            }
          }
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load saved draft.");
        }
        if (!isCancelled) {
          applyLoadedDraftState(buildAssessmentDraftStateFromFingerprint(product, payload.assessment as AssessmentFingerprint));
          setHasStoredDraft(true);
          if (!silent) {
            setStatus("Saved draft loaded.");
          }
        }
      } catch (error) {
        if (!isCancelled && !silent) {
          setStatus(error instanceof Error ? error.message : "Failed to load saved draft.");
        }
      } finally {
        if (!isCancelled) {
          setBusyAction(null);
        }
      }
    }

    void loadStoredBlueprint(true);
    return () => {
      isCancelled = true;
    };
  }, [assessmentId, product]);

  if (!sessionId) {
    return (
      <div className="v4-product-card">
        <h3>Assessment Sections</h3>
        <p>{product.overview}</p>
        {product.sections.map((entry) => (
          <div key={entry.concept} className="v4-segment-card">
            <strong>{entry.concept}</strong>
            <ul>{entry.items.map((item) => <li key={`${entry.concept}-${item.itemId}`}>{item.prompt}</li>)}</ul>
          </div>
        ))}
      </div>
    );
  }

  const effectiveProduct = preview ?? product;
  const draftSummary = buildAssessmentDraftSummary(sectionDrafts, addedConceptDrafts, mergeDrafts);

  function updateSectionDraft(concept: string, updater: (draft: SectionBlueprintDraft) => SectionBlueprintDraft) {
    setSectionDrafts((current) => current.map((entry) => entry.concept === concept ? updater(entry) : entry));
  }

  function updateAddedConceptDraft(id: string, updater: (draft: AddedConceptDraft) => AddedConceptDraft) {
    setAddedConceptDrafts((current) => current.map((entry) => entry.id === id ? updater(entry) : entry));
  }

  function updateMergeDraft(id: string, updater: (draft: MergeConceptDraft) => MergeConceptDraft) {
    setMergeDrafts((current) => current.map((entry) => entry.id === id ? updater(entry) : entry));
  }

  async function handleLoadDraft() {
    setStatus(null);
    setBusyAction("load-draft");
    try {
      const response = await fetch(`/api/v4/teacher-feedback/assessment-blueprint?assessmentId=${encodeURIComponent(assessmentId)}`);
      if (response.status === 404) {
        setHasStoredDraft(false);
        resetDraftState();
        setStatus("No saved draft found.");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load saved draft.");
      }
      applyLoadedDraftState(buildAssessmentDraftStateFromFingerprint(product, payload.assessment as AssessmentFingerprint));
      setHasStoredDraft(true);
      setStatus("Saved draft loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load saved draft.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveDraft() {
    setBusyAction("save-draft");
    setStatus(null);
    try {
      const edits = buildAssessmentConceptBlueprintEdits(product, sectionDrafts, addedConceptDrafts, mergeDrafts);
      const response = await fetch("/api/v4/teacher-feedback/assessment-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          teacherId: LOCAL_TEACHER_ID,
          product,
          edits,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save draft.");
      }
      applyLoadedDraftState(buildAssessmentDraftStateFromFingerprint(product, payload.assessment as AssessmentFingerprint));
      setHasStoredDraft(true);
      setStatus("Draft saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save draft.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePreview() {
    setBusyAction("preview");
    setStatus(null);
    try {
      const conceptBlueprint = buildAssessmentConceptBlueprint(product, sectionDrafts, addedConceptDrafts, mergeDrafts);
      const response = await fetch("/api/v4/teacher-feedback/concept-verification-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          documentIds,
          options: {
            itemCount: product.totalItemCount,
            conceptBlueprint,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Preview failed.");
      }
      setPreview(payload.preview as Extract<IntentProductPayload, { kind: "test" }>);
      setPreviewNarrative(typeof payload.explanation?.narrative === "string" ? payload.explanation.narrative : null);
      setStatus("Preview updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRegenerateItem(concept: string, itemId: string, prompt: string) {
    setBusyAction(`item:${itemId}`);
    setStatus(null);
    try {
      const conceptBlueprint = buildAssessmentConceptBlueprint(product, sectionDrafts, addedConceptDrafts, mergeDrafts);
      const response = await fetch("/api/v4/teacher-feedback/regenerate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          documentIds,
          itemId,
          concept,
          prompt,
          options: {
            itemCount: effectiveProduct.totalItemCount,
            conceptBlueprint,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Item regeneration failed.");
      }
      setPreview((current) => {
        const base = current ?? product;
        return {
          ...base,
          sections: base.sections.map((section) => section.concept !== concept
            ? section
            : {
                ...section,
                items: section.items.map((item) => item.itemId === itemId && item.prompt === prompt ? payload.replacementItem : item),
              }),
        };
      });
      setStatus("Item regenerated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Item regeneration failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRegenerateSection(concept: string) {
    setBusyAction(`section:${concept}`);
    setStatus(null);
    try {
      const conceptBlueprint = buildAssessmentConceptBlueprint(product, sectionDrafts, addedConceptDrafts, mergeDrafts);
      const response = await fetch("/api/v4/teacher-feedback/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          documentIds,
          concept,
          options: {
            itemCount: effectiveProduct.totalItemCount,
            conceptBlueprint,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Section regeneration failed.");
      }
      setPreview((current) => {
        const base = current ?? product;
        return {
          ...base,
          sections: base.sections.map((section) => section.concept === concept ? payload.replacementSection : section),
        };
      });
      setStatus("Section regenerated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Section regeneration failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="v4-product-grid">
      <div className="v4-product-card">
        <h3>Concept Verification</h3>
        <p className="v4-body-copy">Reorder sections, tighten Bloom ceilings, shift scenario preferences, and stage concept merges before previewing a fingerprint-conditioned rebuild.</p>
        <div className="v4-upload-actions">
          <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleLoadDraft()} disabled={busyAction !== null}>
            {busyAction === "load-draft" ? "Loading..." : hasStoredDraft ? "Reload Saved Draft" : "Load Saved Draft"}
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleSaveDraft()} disabled={busyAction !== null}>
            {busyAction === "save-draft" ? "Saving..." : "Save Draft"}
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={() => void handlePreview()} disabled={busyAction !== null}>
            {busyAction === "preview" ? "Previewing..." : "Preview Fingerprint Build"}
          </button>
          <button className="v4-button v4-button-secondary" type="button" onClick={resetDraftState} disabled={busyAction !== null}>
            Reset Draft
          </button>
        </div>
        {previewNarrative ? <p className="v4-body-copy">{previewNarrative}</p> : null}
        {status ? <p className="v4-upload-name">{status}</p> : null}
      </div>
      <div className="v4-product-card v4-product-span">
        <h3>Resulting Draft Summary</h3>
        <p className="v4-body-copy">Final order: {draftSummary.finalOrderLabels.length > 0 ? draftSummary.finalOrderLabels.join(" -> ") : "No sections selected"}.</p>
        <p className="v4-body-copy">Target items across resulting sections: {draftSummary.totalItemCount}.</p>
        <div className="v4-document-list">
          {draftSummary.entries.map((entry) => (
            <article key={`summary-${entry.conceptId}`} className="v4-document-card">
              <div className="v4-document-card-header">
                <div>
                  <h4>{entry.label}</h4>
                  <p>Sources: {entry.sourceLabels.join(", ")}</p>
                </div>
                <div className="v4-upload-actions">
                  {entry.isMerged ? <span className="v4-pill">Merged</span> : null}
                  {entry.isAdded ? <span className="v4-pill">Added</span> : null}
                </div>
              </div>
              <p>Target items: {entry.itemCount}.</p>
              <p>Bloom ceiling: {entry.bloomCeiling ? toTitleLabel(entry.bloomCeiling) : "Builder default"}.</p>
              <p>Bloom distribution: {formatBloomDistributionSummary(entry.bloomDistribution)}.</p>
              <p>Scenario preferences: {formatScenarioSummary(entry.scenarioPatterns)}.</p>
            </article>
          ))}
        </div>
      </div>
      <div className="v4-product-card v4-product-span">
        <h3>Section Blueprint</h3>
        <div className="v4-document-list">
          {sectionDrafts.map((sectionDraft, index) => (
            <article key={sectionDraft.concept} className="v4-document-card">
              <div className="v4-document-card-header">
                <div>
                  <h4>{sectionDraft.concept}</h4>
                  <p>{sectionDraft.included ? `Order ${index + 1}. ${sectionDraft.itemCount} target item(s).` : "Excluded from the next preview build."}</p>
                </div>
                <div className="v4-upload-actions">
                  <button
                    className="v4-button v4-button-secondary"
                    type="button"
                    aria-label={`Move ${sectionDraft.concept} up`}
                    onClick={() => setSectionDrafts((current) => moveDraftSection(current, sectionDraft.concept, -1))}
                    disabled={busyAction !== null || index === 0}
                  >
                    Up
                  </button>
                  <button
                    className="v4-button v4-button-secondary"
                    type="button"
                    aria-label={`Move ${sectionDraft.concept} down`}
                    onClick={() => setSectionDrafts((current) => moveDraftSection(current, sectionDraft.concept, 1))}
                    disabled={busyAction !== null || index === sectionDrafts.length - 1}
                  >
                    Down
                  </button>
                  <button
                    className="v4-button v4-button-secondary"
                    type="button"
                    aria-label={sectionDraft.included ? `Exclude ${sectionDraft.concept}` : `Include ${sectionDraft.concept}`}
                    onClick={() => updateSectionDraft(sectionDraft.concept, (current) => ({ ...current, included: !current.included }))}
                    disabled={busyAction !== null}
                  >
                    {sectionDraft.included ? "Exclude" : "Include"}
                  </button>
                </div>
              </div>
              <label className="v4-upload-field">
                <span>Item count</span>
                <input
                  aria-label={`${sectionDraft.concept} item count`}
                  type="number"
                  min={1}
                  value={sectionDraft.itemCount}
                  disabled={!sectionDraft.included}
                  onChange={(event) => updateSectionDraft(sectionDraft.concept, (current) => ({
                    ...current,
                    itemCount: Math.max(1, Number(event.target.value) || 1),
                  }))}
                />
              </label>
              <label className="v4-upload-field">
                <span>Bloom ceiling</span>
                <select
                  aria-label={`${sectionDraft.concept} bloom ceiling`}
                  value={sectionDraft.bloomCeiling}
                  disabled={!sectionDraft.included}
                  onChange={(event) => updateSectionDraft(sectionDraft.concept, (current) => ({
                    ...current,
                    bloomCeiling: event.target.value as ConceptBlueprintBloomLevel | "",
                  }))}
                >
                  <option value="">Keep current fingerprint</option>
                  {BLOOM_LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{toTitleLabel(level)}</option>)}
                </select>
              </label>
              <div className="v4-upload-field">
                <span>Scenario preferences</span>
                <div className="v4-upload-actions">
                  {SCENARIO_TYPE_OPTIONS.map((scenario) => {
                    const active = sectionDraft.scenarioPatterns.includes(scenario);
                    return (
                      <button
                        key={`${sectionDraft.concept}-${scenario}`}
                        className={`v4-button v4-button-secondary${active ? " v4-button-active" : ""}`}
                        type="button"
                        aria-label={`${sectionDraft.concept} scenario ${scenario}`}
                        aria-pressed={active}
                        disabled={!sectionDraft.included || busyAction !== null}
                        onClick={() => updateSectionDraft(sectionDraft.concept, (current) => ({
                          ...current,
                          scenarioPatterns: toggleScenarioPattern(current.scenarioPatterns, scenario),
                        }))}
                      >
                        {toTitleLabel(scenario)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="v4-upload-field">
                <span>Bloom distribution</span>
                <div className="v4-product-grid">
                  {BLOOM_LEVEL_OPTIONS.map((level) => (
                    <label key={`${sectionDraft.concept}-${level}`} className="v4-upload-field">
                      <span>{toTitleLabel(level)}</span>
                      <input
                        aria-label={`${sectionDraft.concept} bloom distribution ${level}`}
                        type="number"
                        min={0}
                        value={sectionDraft.bloomDistribution[level] ?? 0}
                        disabled={!sectionDraft.included}
                        onChange={(event) => updateSectionDraft(sectionDraft.concept, (current) => ({
                          ...current,
                          bloomDistribution: {
                            ...current.bloomDistribution,
                            [level]: Math.max(0, Number(event.target.value) || 0),
                          },
                        }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="v4-product-card">
        <h3>New Concepts</h3>
        <p className="v4-body-copy">Append brand-new sections when the current assessment misses a target concept.</p>
        <div className="v4-document-list">
          {addedConceptDrafts.map((entry, index) => (
            <article key={entry.id} className="v4-document-card">
              <div className="v4-document-card-header">
                <h4>Added Concept {index + 1}</h4>
                <button className="v4-button v4-button-secondary" type="button" onClick={() => setAddedConceptDrafts((current) => current.filter((draft) => draft.id !== entry.id))} disabled={busyAction !== null}>
                  Remove
                </button>
              </div>
              <label className="v4-upload-field">
                <span>Display name</span>
                <input aria-label={`Added concept ${index + 1} display name`} value={entry.displayName} onChange={(event) => updateAddedConceptDraft(entry.id, (current) => ({ ...current, displayName: event.target.value }))} />
              </label>
              <label className="v4-upload-field">
                <span>Concept id</span>
                <input aria-label={`Added concept ${index + 1} concept id`} value={entry.conceptId} onChange={(event) => updateAddedConceptDraft(entry.id, (current) => ({ ...current, conceptId: event.target.value }))} placeholder="optional canonical id" />
              </label>
              <label className="v4-upload-field">
                <span>Target item count</span>
                <input aria-label={`Added concept ${index + 1} item count`} type="number" min={1} value={entry.absoluteItemHint} onChange={(event) => updateAddedConceptDraft(entry.id, (current) => ({ ...current, absoluteItemHint: Math.max(1, Number(event.target.value) || 1) }))} />
              </label>
              <label className="v4-upload-field">
                <span>Bloom ceiling</span>
                <select aria-label={`Added concept ${index + 1} bloom ceiling`} value={entry.maxBloomLevel} onChange={(event) => updateAddedConceptDraft(entry.id, (current) => ({ ...current, maxBloomLevel: event.target.value as ConceptBlueprintBloomLevel | "" }))}>
                  <option value="">Keep current fingerprint</option>
                  {BLOOM_LEVEL_OPTIONS.map((level) => <option key={`${entry.id}-${level}`} value={level}>{toTitleLabel(level)}</option>)}
                </select>
              </label>
              <div className="v4-upload-field">
                <span>Scenario preferences</span>
                <div className="v4-upload-actions">
                  {SCENARIO_TYPE_OPTIONS.map((scenario) => {
                    const active = entry.scenarioPatterns.includes(scenario);
                    return (
                      <button
                        key={`${entry.id}-${scenario}`}
                        className={`v4-button v4-button-secondary${active ? " v4-button-active" : ""}`}
                        type="button"
                        aria-label={`Added concept ${index + 1} scenario ${scenario}`}
                        aria-pressed={active}
                        disabled={busyAction !== null}
                        onClick={() => updateAddedConceptDraft(entry.id, (current) => ({
                          ...current,
                          scenarioPatterns: toggleScenarioPattern(current.scenarioPatterns, scenario),
                        }))}
                      >
                        {toTitleLabel(scenario)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="v4-upload-actions">
          <button
            className="v4-button v4-button-secondary"
            type="button"
            onClick={() => {
              setAddedConceptDrafts((current) => [...current, createAddedConceptDraft(nextAddedConceptId)]);
              setNextAddedConceptId((current) => current + 1);
            }}
            disabled={busyAction !== null}
          >
            Add Concept
          </button>
        </div>
      </div>
      <div className="v4-product-card">
        <h3>Concept Merges</h3>
        <p className="v4-body-copy">Fuse overlapping sections into a single target concept before rebuilding the assessment.</p>
        <div className="v4-document-list">
          {mergeDrafts.map((entry, index) => (
            <article key={entry.id} className="v4-document-card">
              <div className="v4-document-card-header">
                <h4>Merge {index + 1}</h4>
                <button className="v4-button v4-button-secondary" type="button" onClick={() => setMergeDrafts((current) => current.filter((draft) => draft.id !== entry.id))} disabled={busyAction !== null}>
                  Remove
                </button>
              </div>
              <label className="v4-upload-field">
                <span>Source concepts</span>
                <input aria-label={`Merge ${index + 1} source concepts`} value={entry.conceptIdsText} onChange={(event) => updateMergeDraft(entry.id, (current) => ({ ...current, conceptIdsText: event.target.value }))} placeholder="concept.one, concept.two" />
              </label>
              <label className="v4-upload-field">
                <span>Merged concept id</span>
                <input aria-label={`Merge ${index + 1} merged concept id`} value={entry.mergedConceptId} onChange={(event) => updateMergeDraft(entry.id, (current) => ({ ...current, mergedConceptId: event.target.value }))} />
              </label>
              <label className="v4-upload-field">
                <span>Display name</span>
                <input aria-label={`Merge ${index + 1} display name`} value={entry.displayName} onChange={(event) => updateMergeDraft(entry.id, (current) => ({ ...current, displayName: event.target.value }))} placeholder="optional display name" />
              </label>
            </article>
          ))}
        </div>
        <div className="v4-upload-actions">
          <button
            className="v4-button v4-button-secondary"
            type="button"
            onClick={() => {
              setMergeDrafts((current) => [...current, createMergeConceptDraft(nextMergeId)]);
              setNextMergeId((current) => current + 1);
            }}
            disabled={busyAction !== null}
          >
            Add Merge
          </button>
        </div>
      </div>
      <div className="v4-product-card v4-product-span">
        <h3>Assessment Sections</h3>
        <p>{effectiveProduct.overview}</p>
        {effectiveProduct.sections.map((entry) => (
          <div key={entry.concept} className="v4-segment-card">
            <div className="v4-document-card-header">
              <strong>{entry.concept}</strong>
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleRegenerateSection(entry.concept)} disabled={busyAction !== null}>
                {busyAction === `section:${entry.concept}` ? "Regenerating..." : "Regenerate Section"}
              </button>
            </div>
            <ul>
              {entry.items.map((item) => (
                <li key={`${entry.concept}-${item.itemId}`}>
                  <p>{item.prompt}</p>
                  <div className="v4-upload-actions">
                    <button className="v4-button v4-button-secondary" type="button" onClick={() => void handleRegenerateItem(entry.concept, item.itemId, item.prompt)} disabled={busyAction !== null}>
                      {busyAction === `item:${item.itemId}` ? "Regenerating..." : "Regenerate Item"}
                    </button>
                  </div>
                  <ItemExplanation item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstructionalMapConceptEditor(props: {
  sessionId: string;
  product: Extract<IntentProductPayload, { kind: "instructional-map" }>;
  onRefresh: () => Promise<void>;
}) {
  const { sessionId, product, onRefresh } = props;
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(product.unitConceptAlignment.map((entry) => [entry.unitId, entry.concepts.join(", ")])));
  const [provenance, setProvenance] = useState<Record<string, "inferred" | "teacher-adjusted">>({});
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
  const [statusByUnitId, setStatusByUnitId] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(product.unitConceptAlignment.map((entry) => [entry.unitId, entry.concepts.join(", ")])));
  }, [product]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProvenance() {
      const results = await Promise.all(product.unitConceptAlignment.map(async (entry) => {
        try {
          const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(buildInstructionalUnitOverrideId(sessionId, entry.unitId))}`);
          if (!response.ok) {
            return [entry.unitId, "inferred"] as const;
          }
          const payload = await response.json().catch(() => ({}));
          return [entry.unitId, payload?.overrides?.concepts ? "teacher-adjusted" : "inferred"] as const;
        } catch {
          return [entry.unitId, "inferred"] as const;
        }
      }));

      if (!isCancelled) {
        setProvenance(Object.fromEntries(results));
      }
    }

    void loadProvenance();
    return () => {
      isCancelled = true;
    };
  }, [product, sessionId]);

  async function saveUnitConcepts(unitId: string, currentConcepts: string[]) {
    setSavingUnitId(unitId);
    setStatusByUnitId((current) => ({ ...current, [unitId]: "" }));

    try {
      const concepts = parseConceptList(drafts[unitId] ?? "");
      const response = await fetch("/api/v4/teacher-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: "00000000-0000-4000-8000-000000000001",
          documentId: sessionId,
          sessionId,
          unitId,
          scope: "instructional-unit",
          target: "concepts",
          aiValue: toConceptWeights(currentConcepts),
          teacherValue: toConceptWeights(concepts),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to save unit concepts.");
      }

      setProvenance((current) => ({ ...current, [unitId]: "teacher-adjusted" }));
      setStatusByUnitId((current) => ({ ...current, [unitId]: "Saved" }));
      await onRefresh();
    } catch (error) {
      setStatusByUnitId((current) => ({ ...current, [unitId]: error instanceof Error ? error.message : "Failed to save unit concepts." }));
    } finally {
      setSavingUnitId(null);
    }
  }

  return (
    <div className="v4-product-card v4-product-span">
      <h3>Instructional Units</h3>
      <div className="v4-document-list">
        {product.unitConceptAlignment.map((entry) => (
          <article key={entry.unitId} className="v4-document-card">
            <div className="v4-document-card-header">
              <div>
                <h4>{entry.title}</h4>
                <p>{entry.sourceFileNames.join(", ")}</p>
              </div>
              <span className="v4-pill">{provenance[entry.unitId] === "teacher-adjusted" ? "Teacher-adjusted concepts" : "Inferred concepts"}</span>
            </div>
            <label className="v4-upload-field">
              <span>Concepts</span>
              <input
                aria-label={`Concepts for ${entry.title}`}
                value={drafts[entry.unitId] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [entry.unitId]: event.target.value }))}
                placeholder="concept.one, concept.two"
              />
            </label>
            <p className="v4-body-copy">Anchors: {entry.anchorNodeIds.length}. Documents: {entry.documentIds.length}.</p>
            <div className="v4-upload-actions">
              <button className="v4-button v4-button-secondary" type="button" onClick={() => void saveUnitConcepts(entry.unitId, entry.concepts)} disabled={savingUnitId === entry.unitId}>
                {savingUnitId === entry.unitId ? "Saving..." : "Save concepts"}
              </button>
              {statusByUnitId[entry.unitId] ? <span className="v4-upload-name">{statusByUnitId[entry.unitId]}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type ProductViewerProps = {
  product: IntentProduct;
  sessionId?: string;
  classId?: string;
  classProfile?: ClassProfileModel | null;
  onLoadClassProfile?: ((classId: string) => Promise<unknown>) | null;
  differentiatedBuild?: DifferentiatedBuildModel | null;
  onLoadDifferentiatedBuild?: ((classId: string) => Promise<unknown>) | null;
  onInstructionalMapRefresh?: () => Promise<void>;
  variant?: "app" | "print";
  showAnswerGuidance?: boolean;
  availableStudentIds?: string[];
};

export function getProductTitle(product: IntentProduct) {
  const payload = product.payload as IntentProductPayload;
  if ("title" in payload && typeof payload.title === "string") {
    return payload.title;
  }
  if (payload.kind === "summary") {
    return "Summary";
  }
  if (payload.kind === "compare-documents") {
    return "Document Comparison";
  }
  if (payload.kind === "merge-documents") {
    return "Merged Document Set";
  }
  if (payload.kind === "sequence") {
    return "Instructional Sequence";
  }
  if (payload.kind === "curriculum-alignment") {
    return "Curriculum Alignment";
  }
  if (payload.kind === "instructional-map") {
    return "Instructional Map";
  }
  if (payload.kind === "test") {
    return "Assessment Draft";
  }
  if (payload.kind === "review") {
    return "Review Plan";
  }
  if (payload.kind === "lesson") {
    return "Lesson Plan";
  }
  if (payload.kind === "unit") {
    return "Unit Plan";
  }
  return product.intentType;
}

function renderResponseLines(count = 4) {
  return (
    <div className="v4-print-response-lines" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => <div key={index} className="v4-print-response-line" />)}
    </div>
  );
}

function getResponseLineCount(options: {
  difficulty?: "low" | "medium" | "high" | string;
  cognitiveDemand?: "recall" | "procedural" | "conceptual" | "modeling" | "analysis" | string;
}) {
  if (options.cognitiveDemand === "analysis" || options.cognitiveDemand === "modeling" || options.difficulty === "high") {
    return 6;
  }
  if (options.cognitiveDemand === "conceptual" || options.difficulty === "medium") {
    return 5;
  }
  return 4;
}

function toPrintHeading(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function renderPrintProduct(payload: IntentProductPayload, options: { showAnswerGuidance: boolean }) {
  if (payload.kind === "test") {
    return (
      <article className="v4-print-product v4-print-product-test">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Overview</h2>
          <p className="v4-print-paragraph">{payload.overview}</p>
          <p className="v4-print-meta">Estimated duration: {payload.estimatedDurationMinutes} minutes. Total items: {payload.totalItemCount}.</p>
        </section>
        {payload.sections.map((section, sectionIndex) => (
          <section key={section.concept} className="v4-print-section v4-print-major-section v4-print-test-section">
            <p className="v4-print-section-kicker">Section {sectionIndex + 1}</p>
            <h2 className="v4-print-section-title">{toPrintHeading(section.concept)}</h2>
            <ol className="v4-print-numbered">
              {section.items.map((item) => (
                <li key={item.itemId} className="v4-print-item">
                  <p className="v4-print-question">{item.prompt}</p>
                  {renderResponseLines(getResponseLineCount({ difficulty: item.difficulty, cognitiveDemand: item.cognitiveDemand }))}
                </li>
              ))}
            </ol>
          </section>
        ))}
        {options.showAnswerGuidance && (
          <section className="v4-print-section v4-print-major-section v4-print-teacher-section v4-print-test-answer-key">
            <h2 className="v4-print-section-title">Teacher Notes (Optional)</h2>
            <h3 className="v4-print-subsection-title">Answer Guidance</h3>
            <ol className="v4-print-numbered">
              {payload.sections.flatMap((section) => section.items).map((item, index) => (
                <li key={item.itemId} className="v4-print-item">
                  <p className="v4-print-answer-guidance"><strong>{index + 1}.</strong> {item.answerGuidance}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    );
  }

  if (payload.kind === "lesson") {
    const scaffoldGroups = groupLessonScaffolds(payload.scaffolds);
    const lessonSections: Array<{ label: string; segments: typeof payload.warmUp }> = [
      { label: "Warm-Up", segments: payload.warmUp },
      { label: "Concept Introduction", segments: payload.conceptIntroduction },
      { label: "Guided Practice", segments: payload.guidedPractice },
      { label: "Independent Practice", segments: payload.independentPractice },
      { label: "Exit Ticket", segments: payload.exitTicket },
    ];

    return (
      <article className="v4-print-product v4-print-product-lesson">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Learning Objectives</h2>
          <ul className="v4-print-list">{payload.learningObjectives.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
        {payload.prerequisiteConcepts.length > 0 && (
          <section className="v4-print-section">
            <h2 className="v4-print-section-title">Prerequisites</h2>
            <ul className="v4-print-list">{payload.prerequisiteConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </section>
        )}
        {lessonSections.map((section) => (
          <section
            key={section.label}
            className={`v4-print-section v4-print-major-section v4-print-lesson-section ${section.label === "Guided Practice" ? "v4-print-lesson-practice" : ""} ${section.label === "Exit Ticket" ? "v4-print-lesson-exit-ticket" : ""}`.trim()}
          >
            <h2 className="v4-print-section-title">{section.label}</h2>
            <ol className="v4-print-numbered">
              {section.segments.map((segment) => (
                <li key={segment.title} className="v4-print-item">
                  <p className="v4-print-question"><strong>{segment.title}</strong></p>
                  <p className="v4-print-paragraph">{segment.description}</p>
                  {renderResponseLines(section.label === "Guided Practice" || section.label === "Independent Practice" ? 4 : section.label === "Exit Ticket" ? 3 : 2)}
                </li>
              ))}
            </ol>
          </section>
        ))}
        {payload.scaffolds.length > 0 && (
          <section className="v4-print-section v4-print-teacher-section">
            <h2 className="v4-print-section-title">Scaffolds</h2>
            {[...scaffoldGroups.entries()].map(([concept, entries]) => (
              <div key={concept} className="v4-print-scaffold-group">
                <h3 className="v4-print-subsection-title">{concept}</h3>
                <ul className="v4-print-list">{entries.map((entry) => <li key={`${entry.concept}-${entry.level}-${entry.strategy}`}>{entry.strategy}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {payload.misconceptions.length > 0 && (
          <section className="v4-print-section">
            <h2 className="v4-print-section-title">Misconceptions</h2>
            <ul className="v4-print-list">{payload.misconceptions.map((entry) => <li key={entry.trigger}><strong>{entry.trigger}</strong>: {entry.correction}</li>)}</ul>
          </section>
        )}
        {payload.teacherNotes.length > 0 && (
          <section className="v4-print-section v4-print-teacher-section">
            <h2 className="v4-print-section-title">Teacher Notes</h2>
            <ul className="v4-print-list">{payload.teacherNotes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            {renderResponseLines(3)}
          </section>
        )}
      </article>
    );
  }

  if (payload.kind === "review") {
    return (
      <article className="v4-print-product v4-print-product-review">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Overview</h2>
          <p className="v4-print-paragraph">{payload.overview}</p>
          <p className="v4-print-meta">Concepts covered: {payload.sections.map((entry) => entry.concept).join(", ")}.</p>
        </section>
        {payload.sections.map((section) => (
          <section key={section.concept} className="v4-print-section v4-print-major-section v4-print-review-section">
            <h2 className="v4-print-section-title">{section.concept}</h2>
            <div className="v4-print-review-rationale">
              <p className="v4-print-paragraph"><strong>Rationale:</strong> {section.rationale}</p>
            </div>
            <div className="v4-print-review-points">
              <h3 className="v4-print-subsection-title">Review Points</h3>
              <ul className="v4-print-list">{section.reviewPoints.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
            <div className="v4-print-review-practice">
              <h3 className="v4-print-subsection-title">Practice Prompts</h3>
              <ol className="v4-print-numbered">
                {section.practicePrompts.map((entry) => (
                  <li key={entry} className="v4-print-item">
                    <p className="v4-print-question">{entry}</p>
                    {renderResponseLines(3)}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </article>
    );
  }

  if (payload.kind === "instructional-map") {
    return (
      <article className="v4-print-product v4-print-product-instructional-map">
        <section className="v4-print-section v4-print-map-concepts">
          <h2 className="v4-print-section-title">Concepts</h2>
          <ul className="v4-print-list">{payload.conceptGraph.nodes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-units">
          <h2 className="v4-print-section-title">Units</h2>
          <table className="v4-print-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Concepts</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {payload.unitConceptAlignment.map((entry) => (
                <tr key={entry.unitId}>
                  <td>{entry.title}</td>
                  <td>{entry.concepts.join(", ") || "None listed"}</td>
                  <td>{entry.sourceFileNames.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-anchors">
          <h2 className="v4-print-section-title">Anchors</h2>
          <ul className="v4-print-list">
            {payload.unitConceptAlignment.map((entry) => <li key={`${entry.unitId}-anchors`}>{entry.title}: {entry.anchorNodeIds.length} anchor(s)</li>)}
          </ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-map-relationships">
          <h2 className="v4-print-section-title">Relationships</h2>
          <ul className="v4-print-list">
            {payload.conceptGraph.edges.length > 0
              ? payload.conceptGraph.edges.map((entry, index) => <li key={`${entry.from}-${entry.to}-${index}`}>{entry.from}{" -> "}{entry.to}</li>)
              : <li>No explicit concept relationships were generated.</li>}
          </ul>
          <p className="v4-print-meta">Representations: {payload.representationGraph.nodes.join(", ") || "None listed"}.</p>
        </section>
      </article>
    );
  }

  if (payload.kind === "unit") {
    return (
      <article className="v4-print-product v4-print-product-unit">
        <section className="v4-print-section v4-print-unit-sequence">
          <h2 className="v4-print-section-title">Lesson Sequence</h2>
          <ol className="v4-print-numbered">{payload.lessonSequence.map((entry) => <li key={entry.documentId}><strong>{entry.sourceFileName}</strong>: {entry.rationale}</li>)}</ol>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-unit-concept-map">
          <h2 className="v4-print-section-title">Concept Map</h2>
          <ul className="v4-print-list">{payload.conceptMap.map((entry) => <li key={entry.concept}>{entry.concept}{entry.prerequisites.length > 0 ? ` -> prerequisites: ${entry.prerequisites.join(", ")}` : ""}</li>)}</ul>
        </section>
        <section className="v4-print-section v4-print-major-section v4-print-unit-assessments">
          <h2 className="v4-print-section-title">Suggested Assessments</h2>
          <ul className="v4-print-list">{payload.suggestedAssessments.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "summary") {
    return (
      <article className="v4-print-product v4-print-product-summary">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Summary</h2>
          <p className="v4-print-paragraph">{payload.overallSummary}</p>
        </section>
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Cross-Document Takeaways</h2>
          <ul className="v4-print-list">{payload.crossDocumentTakeaways.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "problem-extraction") {
    return (
      <article className="v4-print-product v4-print-product-problem-extraction">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Problems</h2>
          <ol className="v4-print-numbered">{payload.problems.map((entry) => <li key={entry.problemId}>{entry.text}</li>)}</ol>
        </section>
      </article>
    );
  }

  if (payload.kind === "concept-extraction") {
    return (
      <article className="v4-print-product v4-print-product-concept-extraction">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Concepts</h2>
          <ul className="v4-print-list">{payload.concepts.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "curriculum-alignment") {
    return (
      <article className="v4-print-product v4-print-product-curriculum-alignment">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Standards Coverage</h2>
          <ul className="v4-print-list">{payload.standardsCoverage.map((entry) => <li key={entry.standardId}>{entry.standardId}: {entry.coverage}</li>)}</ul>
        </section>
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Gaps</h2>
          <ul className="v4-print-list">{payload.gaps.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "compare-documents") {
    return (
      <article className="v4-print-product v4-print-product-compare-documents">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Shared Concepts</h2>
          <ul className="v4-print-list">{payload.sharedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "merge-documents") {
    return (
      <article className="v4-print-product v4-print-product-merge-documents">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Merged Concepts</h2>
          <ul className="v4-print-list">{payload.mergedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </article>
    );
  }

  if (payload.kind === "sequence") {
    return (
      <article className="v4-print-product v4-print-product-sequence">
        <section className="v4-print-section">
          <h2 className="v4-print-section-title">Recommended Order</h2>
          <ol className="v4-print-numbered">{payload.recommendedOrder.map((entry) => <li key={entry.documentId}><strong>{entry.sourceFileName}</strong>: {entry.rationale}</li>)}</ol>
        </section>
      </article>
    );
  }

  return <pre className="v4-debug-block">{JSON.stringify(payload, null, 2)}</pre>;
}

export function ProductViewer(props: ProductViewerProps) {
  const { product, sessionId, classId, classProfile = null, onLoadClassProfile = null, differentiatedBuild = null, onLoadDifferentiatedBuild = null, onInstructionalMapRefresh, variant = "app", showAnswerGuidance = false, availableStudentIds = [] } = props;
  const payload = cleanupProductPayload(product.payload as IntentProductPayload);

  if (variant === "print") {
    return renderPrintProduct(payload, { showAnswerGuidance });
  }

  function renderAppProduct() {
    if (payload.kind === "lesson") {
      const scaffoldGroups = groupLessonScaffolds(payload.scaffolds);
      const lessonSections: Array<{ label: string; segments: typeof payload.warmUp }> = [
        { label: "Warm-up", segments: payload.warmUp },
        { label: "Concept Introduction", segments: payload.conceptIntroduction },
        { label: "Guided Practice", segments: payload.guidedPractice },
        { label: "Independent Practice", segments: payload.independentPractice },
        { label: "Exit Ticket", segments: payload.exitTicket },
      ];

      return (
        <div className="v4-product-grid">
          <div className="v4-product-card">
            <h3>Learning Objectives</h3>
            <ul>{payload.learningObjectives.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Prerequisites</h3>
            <ul>{payload.prerequisiteConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card v4-product-span">
            <h3>Lesson Flow</h3>
            <div className="v4-segment-grid">
              {lessonSections.map((section) => (
                <div key={section.label} className="v4-segment-column">
                  <h4>{section.label}</h4>
                  {section.segments.map((segment) => (
                    <div key={segment.title} className="v4-segment-card">
                      <strong>{segment.title}</strong>
                      <p>{segment.description}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="v4-product-card">
            <h3>Misconceptions</h3>
            <ul>{payload.misconceptions.map((entry) => <li key={entry.trigger}>{entry.trigger}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Scaffolds</h3>
            {[...scaffoldGroups.entries()].map(([concept, entries]) => (
              <div key={concept}>
                <strong>{concept}</strong>
                <ul>{entries.map((entry) => <li key={`${entry.concept}-${entry.level}-${entry.strategy}`}>{entry.strategy}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="v4-product-card">
            <h3>Teacher Notes</h3>
            <ul>{payload.teacherNotes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "unit") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Lesson Sequence</h3>
            <ol>{payload.lessonSequence.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}: {entry.rationale}</li>)}</ol>
          </div>
          <div className="v4-product-card">
            <h3>Concept Map</h3>
            <ul>{payload.conceptMap.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Assessments</h3>
            <ul>{payload.suggestedAssessments.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "instructional-map") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card">
            <h3>Concept Graph</h3>
            <p>{payload.conceptGraph.nodes.length} nodes, {payload.conceptGraph.edges.length} edges</p>
            <ul>{payload.conceptGraph.nodes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Representation Graph</h3>
            <p>{payload.representationGraph.nodes.length} nodes, {payload.representationGraph.edges.length} edges</p>
          </div>
          <div className="v4-product-card v4-product-span">
            <h3>Document Alignment</h3>
            <ul>{payload.documentConceptAlignment.map((entry) => <li key={entry.documentId}>{entry.sourceFileName}: {entry.concepts.join(", ") || "No concepts extracted"}</li>)}</ul>
          </div>
          {sessionId && onInstructionalMapRefresh ? <InstructionalMapConceptEditor sessionId={sessionId} product={payload} onRefresh={onInstructionalMapRefresh} /> : null}
        </div>
      );
    }

    if (payload.kind === "curriculum-alignment") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Standards Coverage</h3>
            <ul>{payload.standardsCoverage.map((entry) => <li key={entry.standardId}>{entry.standardId}: {entry.coverage}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Gaps</h3>
            <ul>{payload.gaps.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Suggested Fixes</h3>
            <ul>{payload.suggestedFixes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "compare-documents") {
      return <div className="v4-product-card"><h3>Shared Concepts</h3><ul>{payload.sharedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>;
    }

    if (payload.kind === "merge-documents") {
      return <div className="v4-product-card"><h3>Merged Concepts</h3><ul>{payload.mergedConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>;
    }

    if (payload.kind === "sequence") {
      return (
        <div className="v4-product-grid">
          <div className="v4-product-card v4-product-span">
            <h3>Recommended Order</h3>
            <ol>
              {payload.recommendedOrder.map((entry) => (
                <li key={entry.documentId}>
                  <strong>{entry.sourceFileName}</strong>: {entry.rationale}
                </li>
              ))}
            </ol>
          </div>
          <div className="v4-product-card">
            <h3>Bridging Concepts</h3>
            <ul>{payload.bridgingConcepts.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
          <div className="v4-product-card">
            <h3>Missing Prerequisites</h3>
            <ul>{payload.missingPrerequisites.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </div>
        </div>
      );
    }

    if (payload.kind === "review") {
      return <div className="v4-product-card"><h3>Review Sections</h3><ul>{payload.sections.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul></div>;
    }

    if (payload.kind === "test") {
      return <AssessmentWorkbench assessmentId={product.productId} sessionId={sessionId ?? product.sessionId} classId={classId} classProfile={classProfile} onLoadClassProfile={onLoadClassProfile} differentiatedBuild={differentiatedBuild} onLoadDifferentiatedBuild={onLoadDifferentiatedBuild} documentIds={product.documentIds} product={payload} availableStudentIds={availableStudentIds} />;
    }

    if (payload.kind === "problem-extraction") {
      return <div className="v4-product-card"><h3>Problems</h3><ul>{payload.problems.map((entry) => <li key={entry.problemId}>{entry.text}</li>)}</ul></div>;
    }

    if (payload.kind === "concept-extraction") {
      return <div className="v4-product-card"><h3>Concepts</h3><ul>{payload.concepts.map((entry) => <li key={entry.concept}>{entry.concept}</li>)}</ul></div>;
    }

    if (payload.kind === "summary") {
      return <div className="v4-product-card"><h3>Summary</h3><p>{payload.overallSummary}</p></div>;
    }

    return <pre className="v4-debug-block">{JSON.stringify(payload, null, 2)}</pre>;
  }

  return (
    <>
      {payload.domain ? (
        <div className="v4-product-domain">
          <strong>Domain:</strong> {payload.domain}
        </div>
      ) : null}
      {renderAppProduct()}
    </>
  );
}