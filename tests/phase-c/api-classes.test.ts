import { beforeEach, describe, expect, it, vi } from "vitest";

import classesHandler from "../../api/v4/classes/index";
import classDetailHandler from "../../api/v4/classes/[classId]";
import regenerateHandler from "../../api/v4/classes/[classId]/regenerate";

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

describe("phase-c class routes", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("creates, lists, loads, and regenerates class students", async () => {
    const createRes = createResponse();
    await classesHandler(
      {
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
          seed: "api-class-seed",
        },
      } as any,
      createRes as any,
    );

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.students).toHaveLength(20);

    const listRes = createResponse();
    await classesHandler({ method: "GET", headers: {} } as any, listRes as any);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.classes.length).toBeGreaterThan(0);

    const classId = createRes.body.class.id;

    const detailRes = createResponse();
    await classDetailHandler({ method: "GET", query: { classId } } as any, detailRes as any);
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.students).toHaveLength(20);

    const oldIds = new Set((detailRes.body.students as Array<{ id: string }>).map((student) => student.id));

    const regenRes = createResponse();
    await regenerateHandler({ method: "POST", query: { classId }, body: { seed: "regen-seed" } } as any, regenRes as any);
    expect(regenRes.statusCode).toBe(200);
    expect(regenRes.body.students).toHaveLength(20);

    const newIds = new Set((regenRes.body.students as Array<{ id: string }>).map((student) => student.id));
    expect(oldIds).not.toEqual(newIds);
  });
});
