import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table === "v4_items") {
      return [
        {
          id: "item-e2e-1",
          item_number: 1,
          stem: "Interpret the graph and explain your reasoning.",
          metadata: {
            metrics: {
              bloom_level: 4,
              cognitive_load: 3,
              linguistic_load: 2,
              representation_load: 2,
            },
            confusionScore: 0.35,
            timeToProcessSeconds: 45,
          },
        },
      ];
    }
    return [];
  }),
}));

import classesHandler from "../../api/v4/classes/index";
import simulationRunHandler from "../../api/v4/simulations/index";
import simulationDetailHandler from "../../api/v4/simulations/[simulationId]";

function createResponse() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

describe("End-to-end simulation pipeline", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("keeps Phase B traits intact through to Phase C outputs", async () => {
    const createRes = createResponse();
    await classesHandler({
      method: "POST",
      body: {
        className: "E2E Boundary Class",
        classLevel: "AP",
        profilePercentages: {
          ell: 10,
          sped: 10,
          adhd: 10,
          dyslexia: 10,
          gifted: 10,
          attention504: 10,
        },
        studentCount: 1,
        seed: "e2e-boundary-seed",
      },
    } as any, createRes as any);

    expect(createRes.statusCode).toBe(201);

    const runRes = createResponse();
    await simulationRunHandler({
      method: "POST",
      body: {
        classId: createRes.body.class.id,
        documentId: "doc-e2e-boundary",
      },
    } as any, runRes as any);

    expect(runRes.statusCode).toBe(201);

    const simulationId = runRes.body.simulationId as string;
    const studentId = createRes.body.students[0].id as string;

    const studentView = createResponse();
    await simulationDetailHandler({
      method: "GET",
      query: { simulationId, view: "student", studentId },
    } as any, studentView as any);

    expect(studentView.statusCode).toBe(200);
    expect(studentView.body.items.length).toBeGreaterThan(0);

    for (const item of studentView.body.items as Array<Record<string, unknown>>) {
      expect(item.difficultyScore).toEqual(expect.any(Number));
      expect(item.abilityScore).toEqual(expect.any(Number));
      expect(item.pCorrect).toEqual(expect.any(Number));
      expect(item.bloomGap).toEqual(expect.any(Number));
    }
  });
});
