import { randomUUID } from "crypto";

import { supabaseRest } from "../../../lib/supabase";
import { generateSyntheticStudents } from "./generator";
import { PHASE_C_CONFIG } from "./traits";
import type {
  CreateClassInput,
  PhaseCClass,
  RegenerateStudentsInput,
  SimulationResult,
  SimulationRun,
  SyntheticStudent,
} from "./types";

const classesMemory = new Map<string, PhaseCClass>();
const studentsMemory = new Map<string, SyntheticStudent[]>();
const simulationRunsMemory = new Map<string, SimulationRun>();
const simulationResultsMemory = new Map<string, SimulationResult[]>();
let phaseCSupabaseDisabled = false;

const LEGACY_PROFILE_FALLBACK: CreateClassInput["profilePercentages"] = {
  ell: 10,
  sped: 10,
  adhd: 10,
  dyslexia: 10,
  gifted: 10,
  attention504: 10,
};

function canUseSupabase() {
  return !phaseCSupabaseDisabled
    && typeof window === "undefined"
    && Boolean(process.env.SUPABASE_URL)
    && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isSupabaseSchemaCacheError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("PGRST205")
    || error.message.includes("PGRST204")
    || error.message.includes("Could not find the table");
}

function disableSupabaseForPhaseC(reason: unknown) {
  if (phaseCSupabaseDisabled) {
    return;
  }

  phaseCSupabaseDisabled = true;
  const detail = reason instanceof Error ? reason.message : String(reason);
  console.warn(`Phase C: disabling Supabase persistence and falling back to in-memory store. ${detail}`);
}

function needsLegacyProfileBackfill(students: SyntheticStudent[]): boolean {
  return students.length > 0 && students.every((student) => student.profiles.length === 0 && student.positiveTraits.length === 0);
}

function isZeroProfilePercentages(profilePercentages: CreateClassInput["profilePercentages"] | undefined): boolean {
  if (!profilePercentages) {
    return true;
  }

  return Object.values(profilePercentages).every((value) => Number(value ?? 0) <= 0);
}

function resolveRequestedProfilePercentages(profilePercentages: CreateClassInput["profilePercentages"] | undefined): CreateClassInput["profilePercentages"] {
  return isZeroProfilePercentages(profilePercentages) ? { ...LEGACY_PROFILE_FALLBACK } : profilePercentages!;
}

function currentSchoolYear(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

type SupabaseClassRow = {
  id: string;
  teacher_id: string | null;
  name: string;
  level: PhaseCClass["level"];
  grade_band: PhaseCClass["gradeBand"] | null;
  school_year: string;
  created_at: string;
};

type SupabaseStudentRow = {
  id: string;
  class_id: string;
  display_name: string;
  reading_level: number;
  vocabulary_level: number;
  background_knowledge: number;
  processing_speed: number;
  bloom_mastery: number;
  math_level: number;
  writing_level: number;
  profiles: SyntheticStudent["profiles"];
  positive_traits: SyntheticStudent["positiveTraits"];
  profile_summary_label: string;
  biases: SyntheticStudent["biases"] | null;
};

type SupabaseSimulationRunRow = {
  id: string;
  class_id: string;
  document_id: string;
  created_at: string;
};

type SupabaseSimulationResultRow = {
  id: string;
  simulation_id: string;
  synthetic_student_id: string;
  item_id: string;
  item_label: string;
  linguistic_load: number;
  confusion_score: number;
  time_seconds: number;
  bloom_gap: number;
  difficulty_score: number;
  ability_score: number;
  p_correct: number;
  traits_snapshot: SimulationResult["traitsSnapshot"] | null;
};

function normalizeClassRow(item: PhaseCClass): SupabaseClassRow {
  return {
    id: item.id,
    teacher_id: item.teacherId ?? null,
    name: item.name,
    level: item.level,
    grade_band: item.gradeBand ?? null,
    school_year: item.schoolYear,
    created_at: item.createdAt,
  };
}

function hydrateClassRow(row: SupabaseClassRow): PhaseCClass {
  return {
    id: row.id,
    teacherId: row.teacher_id ?? undefined,
    name: row.name,
    level: row.level,
    gradeBand: row.grade_band ?? undefined,
    schoolYear: row.school_year,
    createdAt: row.created_at,
  };
}

function normalizeStudentRow(item: SyntheticStudent): SupabaseStudentRow {
  return {
    id: item.id,
    class_id: item.classId,
    display_name: item.displayName,
    reading_level: item.traits.readingLevel,
    vocabulary_level: item.traits.vocabularyLevel,
    background_knowledge: item.traits.backgroundKnowledge,
    processing_speed: item.traits.processingSpeed,
    bloom_mastery: item.traits.bloomMastery,
    math_level: item.traits.mathLevel,
    writing_level: item.traits.writingLevel,
    profiles: item.profiles,
    positive_traits: item.positiveTraits,
    profile_summary_label: item.profileSummaryLabel,
    biases: item.biases,
  };
}

function hydrateStudentRow(row: SupabaseStudentRow): SyntheticStudent {
  return {
    id: row.id,
    classId: row.class_id,
    displayName: row.display_name,
    traits: {
      readingLevel: Number(row.reading_level ?? 3),
      vocabularyLevel: Number(row.vocabulary_level ?? 3),
      backgroundKnowledge: Number(row.background_knowledge ?? 3),
      processingSpeed: Number(row.processing_speed ?? 3),
      bloomMastery: Number(row.bloom_mastery ?? 3),
      mathLevel: Number(row.math_level ?? 3),
      writingLevel: Number(row.writing_level ?? 3),
    },
    profiles: row.profiles ?? [],
    positiveTraits: row.positive_traits ?? [],
    profileSummaryLabel: row.profile_summary_label,
    biases: row.biases ?? { confusionBias: 0, timeBias: 0 },
  };
}

function normalizeSimulationRun(run: SimulationRun): SupabaseSimulationRunRow {
  return {
    id: run.id,
    class_id: run.classId,
    document_id: run.documentId,
    created_at: run.createdAt,
  };
}

function hydrateSimulationRun(row: SupabaseSimulationRunRow): SimulationRun {
  return {
    id: row.id,
    classId: row.class_id,
    documentId: row.document_id,
    createdAt: row.created_at,
  };
}

function normalizeSimulationResult(result: SimulationResult): SupabaseSimulationResultRow {
  return {
    id: result.id,
    simulation_id: result.simulationId,
    synthetic_student_id: result.syntheticStudentId,
    item_id: result.itemId,
    item_label: result.itemLabel,
    linguistic_load: result.linguisticLoad,
    confusion_score: result.confusionScore,
    time_seconds: result.timeSeconds,
    bloom_gap: result.bloomGap,
    difficulty_score: result.difficultyScore,
    ability_score: result.abilityScore,
    p_correct: result.pCorrect,
    traits_snapshot: result.traitsSnapshot ?? null,
  };
}

function hydrateSimulationResult(row: SupabaseSimulationResultRow): SimulationResult {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    syntheticStudentId: row.synthetic_student_id,
    itemId: row.item_id,
    itemLabel: row.item_label,
    linguisticLoad: Number(row.linguistic_load ?? 0),
    confusionScore: Number(row.confusion_score ?? 0),
    timeSeconds: Number(row.time_seconds ?? 0),
    bloomGap: Number(row.bloom_gap ?? 0),
    difficultyScore: Number(row.difficulty_score ?? 0),
    abilityScore: Number(row.ability_score ?? 0),
    pCorrect: Number(row.p_correct ?? 0),
    traitsSnapshot: row.traits_snapshot ?? undefined,
  };
}

function deriveProfilePercentagesFromStudents(students: SyntheticStudent[]): CreateClassInput["profilePercentages"] {
  if (students.length === 0 || needsLegacyProfileBackfill(students)) {
    return { ...LEGACY_PROFILE_FALLBACK };
  }

  const total = students.length;
  const ratioToPercent = (count: number) => (count / total) * 100;
  const adhdCount = students.filter((student) => student.profiles.includes("ADHD")).length;

  return {
    ell: ratioToPercent(students.filter((student) => student.profiles.includes("ELL")).length),
    sped: ratioToPercent(students.filter((student) => student.profiles.includes("SPED")).length),
    adhd: ratioToPercent(adhdCount),
    dyslexia: ratioToPercent(students.filter((student) => student.profiles.includes("Dyslexic")).length),
    gifted: ratioToPercent(students.filter((student) => student.profiles.includes("Gifted")).length),
    attention504: ratioToPercent(adhdCount),
  };
}

export async function createClassWithSyntheticStudents(input: CreateClassInput): Promise<{ classRecord: PhaseCClass; students: SyntheticStudent[] }> {
  const classRecord: PhaseCClass = {
    id: randomUUID(),
    teacherId: input.teacherId,
    name: input.name,
    level: input.level,
    gradeBand: input.gradeBand,
    schoolYear: input.schoolYear ?? currentSchoolYear(),
    createdAt: new Date().toISOString(),
  };

  const students = generateSyntheticStudents({
    classId: classRecord.id,
    classLevel: classRecord.level,
    profilePercentages: resolveRequestedProfilePercentages(input.profilePercentages),
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed,
  });

  classesMemory.set(classRecord.id, classRecord);
  studentsMemory.set(classRecord.id, students);

  if (canUseSupabase()) {
    try {
      await supabaseRest("classes", {
        method: "POST",
        body: normalizeClassRow(classRecord),
        prefer: "return=minimal",
      });

      if (students.length > 0) {
        await supabaseRest("synthetic_students", {
          method: "POST",
          body: students.map((student) => normalizeStudentRow(student)),
          prefer: "return=minimal",
        });
      }
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return { classRecord, students };
}

export async function listClasses(teacherId?: string): Promise<PhaseCClass[]> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("classes", {
        method: "GET",
        select: "id,teacher_id,name,level,grade_band,school_year,created_at",
        filters: {
          order: "created_at.desc",
          ...(teacherId ? { teacher_id: `eq.${teacherId}` } : {}),
        },
      });

      return ((rows as SupabaseClassRow[]) ?? []).map((row) => hydrateClassRow(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  const values = Array.from(classesMemory.values());
  const filtered = teacherId ? values.filter((item) => item.teacherId === teacherId) : values;
  return filtered.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getClassById(classId: string): Promise<PhaseCClass | null> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("classes", {
        method: "GET",
        select: "id,teacher_id,name,level,grade_band,school_year,created_at",
        filters: { id: `eq.${classId}` },
      });
      const row = ((rows as SupabaseClassRow[]) ?? [])[0];
      return row ? hydrateClassRow(row) : null;
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return classesMemory.get(classId) ?? null;
}

export async function getSyntheticStudentsForClass(classId: string): Promise<SyntheticStudent[]> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("synthetic_students", {
        method: "GET",
        select: "id,class_id,display_name,reading_level,vocabulary_level,background_knowledge,processing_speed,bloom_mastery,math_level,writing_level,profiles,positive_traits,profile_summary_label,biases",
        filters: {
          class_id: `eq.${classId}`,
          order: "display_name.asc",
        },
      });
      return ((rows as SupabaseStudentRow[]) ?? []).map((row) => hydrateStudentRow(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return [...(studentsMemory.get(classId) ?? [])];
}

export async function regenerateClassStudents(input: RegenerateStudentsInput): Promise<SyntheticStudent[]> {
  const classRecord = await getClassById(input.classId);
  if (!classRecord) {
    throw new Error("Class not found");
  }

  const existingStudents = await getSyntheticStudentsForClass(classRecord.id);
  const profilePercentages = input.profilePercentages ?? deriveProfilePercentagesFromStudents(existingStudents);

  const students = generateSyntheticStudents({
    classId: classRecord.id,
    classLevel: classRecord.level,
    profilePercentages,
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed,
  });

  studentsMemory.set(classRecord.id, students);

  if (canUseSupabase()) {
    try {
      await supabaseRest("synthetic_students", {
        method: "DELETE",
        filters: { class_id: `eq.${classRecord.id}` },
        prefer: "return=minimal",
      });

      if (students.length > 0) {
        await supabaseRest("synthetic_students", {
          method: "POST",
          body: students.map((student) => normalizeStudentRow(student)),
          prefer: "return=minimal",
        });
      }
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return students;
}

export async function createSimulationRun(input: { classId: string; documentId: string }): Promise<SimulationRun> {
  const run: SimulationRun = {
    id: randomUUID(),
    classId: input.classId,
    documentId: input.documentId,
    createdAt: new Date().toISOString(),
  };

  simulationRunsMemory.set(run.id, run);

  if (canUseSupabase()) {
    try {
      await supabaseRest("simulation_runs", {
        method: "POST",
        body: normalizeSimulationRun(run),
        prefer: "return=minimal",
      });
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return run;
}

export async function saveSimulationResults(simulationId: string, results: SimulationResult[]): Promise<SimulationResult[]> {
  simulationResultsMemory.set(simulationId, [...results]);

  if (canUseSupabase() && results.length > 0) {
    try {
      await supabaseRest("simulation_results", {
        method: "POST",
        body: results.map((result) => normalizeSimulationResult(result)),
        prefer: "return=minimal",
      });
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return results;
}

export async function getSimulationRun(simulationId: string): Promise<SimulationRun | null> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_runs", {
        method: "GET",
        select: "id,class_id,document_id,created_at",
        filters: { id: `eq.${simulationId}` },
      });
      const row = ((rows as SupabaseSimulationRunRow[]) ?? [])[0];
      return row ? hydrateSimulationRun(row) : null;
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return simulationRunsMemory.get(simulationId) ?? null;
}

export async function listSimulationRunsForClass(classId: string): Promise<SimulationRun[]> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_runs", {
        method: "GET",
        select: "id,class_id,document_id,created_at",
        filters: {
          class_id: `eq.${classId}`,
          order: "created_at.desc",
        },
      });
      return ((rows as SupabaseSimulationRunRow[]) ?? []).map((row) => hydrateSimulationRun(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return Array.from(simulationRunsMemory.values())
    .filter((run) => run.classId === classId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listSimulationResults(simulationId: string): Promise<SimulationResult[]> {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_results", {
        method: "GET",
        select: "id,simulation_id,synthetic_student_id,item_id,item_label,linguistic_load,confusion_score,time_seconds,bloom_gap,difficulty_score,ability_score,p_correct,traits_snapshot",
        filters: {
          simulation_id: `eq.${simulationId}`,
          order: "item_id.asc,synthetic_student_id.asc",
        },
      });

      return ((rows as SupabaseSimulationResultRow[]) ?? []).map((row) => hydrateSimulationResult(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }

  return [...(simulationResultsMemory.get(simulationId) ?? [])];
}
