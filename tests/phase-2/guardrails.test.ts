import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FORBIDDEN_SCHEMA_MARKERS = [
  "MeasurablesV2",
  "AltMeasurables",
  "LegacyMeasurables",
];

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return fullPath;
  });
}

describe("phase-2 guardrails", () => {
  it("blocks parallel measurable schema names", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "../..");
    const files = listFiles(path.join(projectRoot, "src"))
      .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const marker of FORBIDDEN_SCHEMA_MARKERS) {
        expect(source, `${file} contains ${marker}`).not.toContain(marker);
      }
    }
  });

  it("keeps phase-c engine text-source agnostic", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "../..");
    const enginePath = path.join(projectRoot, "src/simulation/phase-c/engine.ts");
    const source = readFileSync(enginePath, "utf8");

    expect(source).not.toContain("answerKeyText");
    expect(source).not.toContain("workedSolutionText");
  });

  it("does not introduce measurable persistence columns in Supabase migrations", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "../..");
    const migrationFiles = listFiles(path.join(projectRoot, "supabase"))
      .filter((file) => file.endsWith(".sql"));

    const bannedColumnFragments = [
      "answer_key_difficulty_adjustment",
      "answer_key_p_correct_adjustment",
      "step_difficulty_curve",
      "step_time_curve",
      "step_cognitive_load_curve",
      "misconception_step_mapping",
      "distractor_step_mapping",
    ];

    for (const file of migrationFiles) {
      const source = readFileSync(file, "utf8").toLowerCase();
      for (const fragment of bannedColumnFragments) {
        expect(source, `${file} contains ${fragment}`).not.toContain(fragment);
      }
    }
  });
});
