import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table === "v4_items") {
      return [
        {
          id: "item-1",
          item_number: 1,
          stem: "Read the graph and explain the trend in one sentence.",
          metadata: {
            linguisticLoad: 2.8,
            confusionScore: 0.35,
            timeToProcessSeconds: 45,
            bloomsLevel: 3,
          },
        },
        {
          id: "item-2",
          item_number: 2,
          stem: "Calculate the mean and justify your method.",
          metadata: {
            linguisticLoad: 3.2,
            confusionScore: 0.4,
            timeToProcessSeconds: 60,
            bloomsLevel: 4,
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

describe("phase-c end-to-end integration", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("creates class, runs simulation, and supports class/profile/student views", async () => {
    const createRes = createResponse();
    await classesHandler({
      method: "POST",
      body: {
        className: "Period 3 - AP Statistics",
        classLevel: "AP",
        profilePercentages: {
          ell: 20,
          sped: 10,
          gifted: 20,
          adhd: 10,
          dyslexia: 10,
          attention504: 10,
        },
        seed: "integration-seed",
      },
    } as any, createRes as any);

    expect(createRes.statusCode).toBe(201);
    const classId = createRes.body.class.id as string;
    const studentId = createRes.body.students[0].id as string;

    const runRes = createResponse();
    await simulationRunHandler({ method: "POST", body: { classId, documentId: "doc-1" } } as any, runRes as any);

    expect(runRes.statusCode).toBe(201);
    expect(runRes.body.resultCount).toBeGreaterThan(0);

    const simulationId = runRes.body.simulationId as string;

    const classView = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId, view: "class" } } as any, classView as any);
    expect(classView.statusCode).toBe(200);
    expect(classView.body.summary.totalRecords).toBeGreaterThan(0);

    const profileView = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId, view: "profile", profile: "ELL" } } as any, profileView as any);
    expect(profileView.statusCode).toBe(200);

    const studentView = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId, view: "student", studentId } } as any, studentView as any);
    expect(studentView.statusCode).toBe(200);
    expect(studentView.body.items.length).toBeGreaterThan(0);

    expect(studentView.body).not.toHaveProperty("mastery");
    expect(studentView.body).not.toHaveProperty("misconceptions");
  });
});
