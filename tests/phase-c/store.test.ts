import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async () => []),
}));

import { supabaseRest } from "../../lib/supabase";

import {
  createClassWithSyntheticStudents,
  createSimulationRun,
  getClassById,
  getSyntheticStudentsForClass,
  listClasses,
  listSimulationResults,
  regenerateClassStudents,
  saveSimulationResults,
} from "../../src/simulation/phase-c";

describe("phase-c store", () => {
  beforeEach(() => {
    const supabaseRestMock = vi.mocked(supabaseRest);
    supabaseRestMock.mockClear();
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("supports class/student/run/result CRUD in memory mode", async () => {
    const created = await createClassWithSyntheticStudents({
      teacherId: "teacher-1",
      name: "Period 1",
      level: "Honors",
      overlays: {
        composition: {
          ell: "A few",
          sped: "None",
          gifted: "Some",
          attentionChallenges: "None",
          readingChallenges: "A few",
        },
        tendencies: {
          manyFastWorkers: true,
        },
      },
      seed: "store-seed",
    });

    expect(created.students).toHaveLength(20);

    const classes = await listClasses("teacher-1");
    expect(classes.some((entry) => entry.id === created.classRecord.id)).toBe(true);

    const classRecord = await getClassById(created.classRecord.id);
    expect(classRecord?.name).toBe("Period 1");

    const regenerated = await regenerateClassStudents({ classId: created.classRecord.id, seed: "store-seed-regen" });
    expect(regenerated).toHaveLength(20);

    const students = await getSyntheticStudentsForClass(created.classRecord.id);
    expect(students).toHaveLength(20);

    const run = await createSimulationRun({ classId: created.classRecord.id, documentId: "doc-1" });
    const saved = await saveSimulationResults(run.id, [
      {
        id: "result-1",
        simulationId: run.id,
        syntheticStudentId: students[0].id,
        itemId: "item-1",
        itemLabel: "Item 1",
        linguisticLoad: 2,
        confusionScore: 0.3,
        timeSeconds: 45,
        bloomGap: 0.5,
      },
    ]);

    expect(saved).toHaveLength(1);
    const loaded = await listSimulationResults(run.id);
    expect(loaded).toHaveLength(1);
  });

  it("uses only Phase C tables in supabase mode", async () => {
    const supabaseRestMock = vi.mocked(supabaseRest);
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");

    supabaseRestMock.mockImplementation(async (table: string, options?: { method?: string }) => {
      if (table === "classes" && (options?.method ?? "GET") === "GET") {
        return [];
      }
      return [];
    });

    await createClassWithSyntheticStudents({
      teacherId: "teacher-2",
      name: "Period 2",
      level: "Standard",
      overlays: {
        composition: {
          ell: "None",
          sped: "None",
          gifted: "None",
          attentionChallenges: "None",
          readingChallenges: "None",
        },
        tendencies: {},
      },
    });

    const usedTables = new Set(supabaseRestMock.mock.calls.map((call) => call[0] as string));
    for (const table of usedTables) {
      expect(["classes", "synthetic_students", "simulation_runs", "simulation_results"]).toContain(table);
      expect(table).not.toContain("student_performance");
      expect(table).not.toContain("preparedness");
      expect(table).not.toContain("compare");
    }
  });
});
