import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/simulation/phase-c", () => ({
  runPhaseCSimulation: vi.fn(async ({ classId, documentId }: { classId: string; documentId: string }) => ({
    simulationRun: {
      id: "sim-1",
      classId,
      documentId,
      createdAt: "2026-04-25T00:00:00.000Z",
    },
    resultCount: 2,
  })),
  getSimulationRun: vi.fn(async (simulationId: string) => {
    if (simulationId !== "sim-1") {
      return null;
    }
    return {
      id: "sim-1",
      classId: "class-1",
      documentId: "doc-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    };
  }),
  getSyntheticStudentsForClass: vi.fn(async () => [
    {
      id: "student-1",
      classId: "class-1",
      displayName: "Student 1",
      traits: {
        readingLevel: 3,
        vocabularyLevel: 3,
        backgroundKnowledge: 3,
        processingSpeed: 3,
        bloomMastery: 3,
        mathLevel: 3,
        writingLevel: 3,
      },
      profiles: ["ELL"],
      positiveTraits: ["fast_worker"],
      profileSummaryLabel: "ELL | fast_worker",
      biases: { confusionBias: 0.05, timeBias: -0.1 },
    },
    {
      id: "student-2",
      classId: "class-1",
      displayName: "Student 2",
      traits: {
        readingLevel: 4,
        vocabularyLevel: 4,
        backgroundKnowledge: 4,
        processingSpeed: 4,
        bloomMastery: 4,
        mathLevel: 4,
        writingLevel: 4,
      },
      profiles: ["Gifted"],
      positiveTraits: ["detail_oriented"],
      profileSummaryLabel: "Gifted | detail_oriented",
      biases: { confusionBias: -0.05, timeBias: 0 },
    },
  ]),
  listSimulationResults: vi.fn(async () => [
    {
      id: "r1",
      simulationId: "sim-1",
      syntheticStudentId: "student-1",
      itemId: "item-1",
      itemLabel: "Item 1",
      linguisticLoad: 2,
      confusionScore: 0.5,
      timeSeconds: 30,
      bloomGap: 1,
    },
    {
      id: "r2",
      simulationId: "sim-1",
      syntheticStudentId: "student-2",
      itemId: "item-1",
      itemLabel: "Item 1",
      linguisticLoad: 2,
      confusionScore: 0.3,
      timeSeconds: 20,
      bloomGap: 0.5,
    },
  ]),
}));

import simulationsHandler from "../../api/v4/simulations/index";
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

describe("phase-c simulation routes", () => {
  it("runs simulation endpoint", async () => {
    const res = createResponse();
    await simulationsHandler({ method: "POST", body: { classId: "class-1", documentId: "doc-1" } } as any, res as any);
    expect(res.statusCode).toBe(201);
    expect(res.body.simulationId).toBe("sim-1");
    expect(res.body.resultCount).toBe(2);
  });

  it("returns class, profile, and student views", async () => {
    const classRes = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId: "sim-1", view: "class" } } as any, classRes as any);
    expect(classRes.statusCode).toBe(200);
    expect(classRes.body.summary.totalRecords).toBe(2);

    const profileRes = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId: "sim-1", view: "profile", profile: "ELL" } } as any, profileRes as any);
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.summary.totalRecords).toBe(1);

    const studentRes = createResponse();
    await simulationDetailHandler({ method: "GET", query: { simulationId: "sim-1", view: "student", studentId: "student-1" } } as any, studentRes as any);
    expect(studentRes.statusCode).toBe(200);
    expect(studentRes.body.items).toHaveLength(1);
  });
});
