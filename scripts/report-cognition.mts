import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type ProblemLike = {
	canonicalProblemId?: string;
	problemId?: string;
	tags?: {
		subject?: string;
		bloom?: Record<string, number>;
		cognitive?: {
			bloom?: Record<string, number>;
			difficulty?: number;
			multiStep?: number;
		};
		difficulty?: number;
		multiStep?: number;
	};
};

type PayloadLike = {
	problems?: ProblemLike[];
	problemVectors?: Array<{
		subject?: string;
		bloom?: Record<string, number>;
		cognitive?: {
			bloom?: Record<string, number>;
			difficulty?: number;
			multiStep?: number;
		};
		difficulty?: number;
		multiStep?: number;
	}>;
	documentInsights?: {
		problems?: ProblemLike[];
	};
};

function findJsonFiles(root: string): string[] {
	const entries = readdirSync(root);
	const results: string[] = [];

	for (const entry of entries) {
		if (["node_modules", ".git", "dist"].includes(entry)) {
			continue;
		}

		const fullPath = path.join(root, entry);
		const stats = statSync(fullPath);

		if (stats.isDirectory()) {
			results.push(...findJsonFiles(fullPath));
		} else if (entry.endsWith(".json")) {
			results.push(fullPath);
		}
	}

	return results;
}

function topBloom(record: Record<string, number> | undefined) {
	return Object.entries(record ?? {}).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "unknown";
}

function extractPayload(data: unknown): PayloadLike | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const value = data as Record<string, unknown>;
	if (Array.isArray(value.problems) || Array.isArray(value.problemVectors) || value.documentInsights) {
		return value as PayloadLike;
	}

	for (const nested of Object.values(value)) {
		if (nested && typeof nested === "object") {
			const payload = extractPayload(nested);
			if (payload) {
				return payload;
			}
		}
	}

	return null;
}

function reportFile(filePath: string) {
	const raw = readFileSync(filePath, "utf8");
	const parsed = JSON.parse(raw) as unknown;
	const payload = extractPayload(parsed);

	if (!payload) {
		return false;
	}

	const problems = payload.problems ?? payload.documentInsights?.problems ?? [];
	const vectors = payload.problemVectors ?? [];
	if (problems.length === 0 && vectors.length === 0) {
		return false;
	}

	const hasSemanticSignal = problems.some((problem) => Boolean(problem.tags?.cognitive || problem.tags?.bloom || problem.tags?.subject))
		|| vectors.some((vector) => Boolean(vector.cognitive || vector.bloom || vector.subject));
	if (!hasSemanticSignal) {
		return false;
	}

	console.log(`\n# ${path.relative(process.cwd(), filePath)}`);
	const rows = (problems.length > 0 ? problems : vectors).map((problem, index) => {
		const vector = vectors[index];
		const cognitive = problem.tags?.cognitive ?? vector?.cognitive;
		const bloom = cognitive?.bloom ?? problem.tags?.bloom ?? vector?.bloom;
		const difficulty = cognitive?.difficulty ?? problem.tags?.difficulty ?? vector?.difficulty ?? 0;
		const multiStep = cognitive?.multiStep ?? problem.tags?.multiStep ?? vector?.multiStep ?? 0;

		return {
			canonicalProblemId: problem.canonicalProblemId ?? problem.problemId ?? `problem-${index + 1}`,
			subject: problem.tags?.subject ?? vector?.subject ?? "unknown",
			topBloom: topBloom(bloom),
			difficulty: Number(difficulty).toFixed(2),
			multiStep: Number(multiStep).toFixed(2),
		};
	});

	console.table(rows);
	return true;
}

const args = process.argv.slice(2);
const targets = args.length > 0 ? args.map((entry) => path.resolve(entry)) : findJsonFiles(process.cwd());
let reported = 0;

for (const target of targets) {
	try {
		if (reportFile(target)) {
			reported += 1;
		}
	} catch {
		// Ignore malformed or unrelated JSON files.
	}
}

if (reported === 0) {
	console.log("No semantic cognition payloads found. Pass explicit JSON paths that contain problems/problemVectors/documentInsights.");
}