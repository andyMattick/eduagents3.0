import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { describe, expect, it } from "vitest";

const forbiddenImports = [
  "src/pipeline/",
  "src/system/",
  "src/types/",
  "src/components_new/Pipeline/",
  "src/hooks/usePipeline",
  "../pipeline/",
  "../../pipeline/",
  "../../../pipeline/",
  "../system/",
  "../../system/",
  "../../../system/",
  "../types/",
  "../../types/",
  "../../../types/",
  "components_new/Pipeline",
  "usePipeline",
];

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("v4 boundary imports", () => {
  it("keeps v4 components and handlers free of quarantined v3 imports", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "../../../..");
    const files = [
      ...listFiles(path.join(projectRoot, "src/components_new/v4")),
      ...listFiles(path.join(projectRoot, "src/pages/api/v4")),
    ].filter((filePath) => !filePath.includes(`${path.sep}tests${path.sep}`));

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      for (const forbiddenImport of forbiddenImports) {
        expect(contents).not.toContain(forbiddenImport);
      }
    }
  });
});