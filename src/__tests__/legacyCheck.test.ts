import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FORBIDDEN_IMPORT_FRAGMENTS = [
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
	"architectV3",
	"legacyV2",
	"v3-ingest",
];

const FORBIDDEN_CONTENT_PATTERNS = [
	/\blegacyBloom\b/,
	/\boldProblem\b/,
	/\boldAssessment\b/,
	/assessment-v3/,
	/problem-v3/,
	/\/api\/ingest\b/,
];

function listCodeFiles(dirPath: string): string[] {
	return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			if (["tests", "__tests__"].includes(entry.name)) {
				return [];
			}
			return listCodeFiles(fullPath);
		}
		return /\.(ts|tsx)$/.test(fullPath) ? [fullPath] : [];
	});
}

function getImports(sourceText: string) {
	const importLikePattern = /(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g;
	const imports: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = importLikePattern.exec(sourceText)) !== null) {
		imports.push(match[1]);
	}
	return imports;
}

describe("v4 legacy guardrails", () => {
	it("keeps active v4 codepaths free of quarantined imports and stale shape names", () => {
		const currentDir = path.dirname(fileURLToPath(import.meta.url));
		const projectRoot = path.resolve(currentDir, "../..");
		const files = [
			...listCodeFiles(path.join(projectRoot, "src/prism-v4")),
			...listCodeFiles(path.join(projectRoot, "src/components_new/v4")),
			path.join(projectRoot, "api/v4-ingest.ts"),
		].filter((filePath, index, all) => all.indexOf(filePath) === index);

		for (const filePath of files) {
			const contents = readFileSync(filePath, "utf8");
			const imports = getImports(contents);

			for (const importedPath of imports) {
				for (const forbiddenFragment of FORBIDDEN_IMPORT_FRAGMENTS) {
					expect(importedPath, `${filePath} imported ${importedPath}`).not.toContain(forbiddenFragment);
				}
			}

			for (const forbiddenPattern of FORBIDDEN_CONTENT_PATTERNS) {
				expect(contents, `${filePath} matched ${forbiddenPattern}`).not.toMatch(forbiddenPattern);
			}
		}
	});
});