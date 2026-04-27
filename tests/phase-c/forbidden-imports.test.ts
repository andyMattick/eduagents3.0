import { readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const forbiddenTokens = [
  "studentPerformance",
  "preparedness",
  "compare",
  "prism-v4",
  "SpaceCampResponse",
  "phase-d",
  "PhaseD",
];

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}

describe("phase-c forbidden imports", () => {
  it("keeps phase-c modules isolated from forbidden dependencies", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "../..");
    const phaseCFiles = listFiles(path.join(projectRoot, "src/simulation/phase-c"));

    for (const filePath of phaseCFiles) {
      const source = readFileSync(filePath, "utf8");
      for (const token of forbiddenTokens) {
        expect(source).not.toContain(token);
      }
    }
  });
});
