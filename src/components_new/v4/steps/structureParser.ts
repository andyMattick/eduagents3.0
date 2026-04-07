import type { StructureAnalysis } from "./stepTypes";

// ── Operation detectors ───────────────────────────────────────────────────────
// Each returns 1 when the signal is present, 0 when absent.
// Composing many small detectors keeps this subject-agnostic — add new signals
// here without touching any other file.

function detectDistribution(text: string): number {
	// "distribute", "expand", "FOIL", or expression like "3(x + 2)"
	return /distribut|expand|foil|\d\s*\([^)]+[+\-][^)]+\)/i.test(text) ? 1 : 0;
}

function detectCombiningLikeTerms(text: string): number {
	return /combin\w* like|simplif\w* express|collect\w* term/i.test(text) ? 1 : 0;
}

function detectMovingTerms(text: string): number {
	// "move", "isolate", "add X to both sides", "subtract … from both sides"
	return /move\w* term|add .+ to both|subtract .+ from both|bring .+ to/i.test(text) ? 1 : 0;
}

function detectIsolateVariable(text: string): number {
	return /isolat\w* (the )?(variable|x|y|z|n)|solv\w* for/i.test(text) ? 1 : 0;
}

function detectEvaluateExpression(text: string): number {
	return /evaluat\w* (the )?express|calculat\w* the value|find the value of/i.test(text) ? 1 : 0;
}

function detectComputeTestStatistic(text: string): number {
	return /test statistic|z-score|t-score|compute (the )?(z|t)\b/i.test(text) ? 1 : 0;
}

function detectComputePValue(text: string): number {
	return /p-value|p value|probability (of|that) .+ occur/i.test(text) ? 1 : 0;
}

function detectInterpretResult(text: string): number {
	return /interpret\w*|conclude|reject (the )?null|fail to reject|what does .+ (tell|suggest|indicate)/i.test(text) ? 1 : 0;
}

function detectIdentifyClaim(text: string): number {
	return /identif\w* (the )?claim|central argument|author.{0,20}claim|author.{0,20}assert/i.test(text) ? 1 : 0;
}

function detectIdentifyEvidence(text: string): number {
	return /identif\w* (the )?evidence|support\w* (detail|claim|argument)|textual evidence/i.test(text) ? 1 : 0;
}

function detectConnectReasoning(text: string): number {
	return /connect\w* .{0,20}reasoning|explain how .{0,20}support|how does .{0,20}develop|logical connection/i.test(text) ? 1 : 0;
}

/**
 * Counts the total number of distinct cognitive operations detected.
 * Subject signals are composable — stats signals firing on an ELA item is
 * harmless (score = 0) so no branching by subject is needed.
 */
function countOperations(text: string): number {
	return (
		detectDistribution(text) +
		detectCombiningLikeTerms(text) +
		detectMovingTerms(text) +
		detectIsolateVariable(text) +
		detectEvaluateExpression(text) +
		detectComputeTestStatistic(text) +
		detectComputePValue(text) +
		detectInterpretResult(text) +
		detectIdentifyClaim(text) +
		detectIdentifyEvidence(text) +
		detectConnectReasoning(text)
	);
}

// ── Transformation detectors ─────────────────────────────────────────────────

function countTransformations(text: string): number {
	let count = 0;
	// Unit conversion
	if (/convert\w*|in terms of|rewrite (as|in)|express .{0,20}(as|in terms of)/i.test(text)) count++;
	// Percentage ↔ decimal ↔ fraction
	if (/percent(age)?|decimal|fraction/i.test(text) && /convert|express|write/i.test(text)) count++;
	// Variable substitution
	if (/substitut|plug in|replace .{0,20}with/i.test(text)) count++;
	return count;
}

// ── Representation detectors ─────────────────────────────────────────────────

const REPRESENTATION_PATTERNS: Array<[string, RegExp]> = [
	["equation", /equation|formula|expression\s/i],
	["graph", /graph|plot|curve|axis|axes/i],
	["table", /table|row|column|data set/i],
	["scenario", /scenario|situation|context|problem states|passage/i],
	["diagram", /diagram|figure|illustration|image|picture/i],
];

function detectRepresentations(text: string): string[] {
	return REPRESENTATION_PATTERNS
		.filter(([, re]) => re.test(text))
		.map(([name]) => name);
}

// ── Scenario complexity ───────────────────────────────────────────────────────

function estimateScenarioComplexity(text: string): "low" | "medium" | "high" {
	const words = text.trim().split(/\s+/).length;
	// Count comma-separated clauses and connective words as a proxy for density
	const clauses = (text.match(/,|;| and | but | because | however | therefore /gi) ?? []).length;
	if (words > 120 || clauses > 6) return "high";
	if (words > 50 || clauses > 2) return "medium";
	return "low";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Analyses the cognitive structure of an assessment item's text.
 * Pure function — no side effects, no I/O.
 */
export function analyzeStructure(problemText: string): StructureAnalysis {
	const operations = Math.min(countOperations(problemText), 5); // cap at 5 to prevent runaway
	const transformations = Math.min(countTransformations(problemText), 3);
	const hasParentheses = /\([^)]+[+\-×÷*/][^)]+\)/.test(problemText);
	// Variable-on-both-sides: same single letter variable (not mid-word) appears on both sides of "="
	const variableBothSides = ((): boolean => {
		const eqIdx = problemText.indexOf("=");
		if (eqIdx === -1) return false;
		const lhs = problemText.slice(0, eqIdx);
		const rhs = problemText.slice(eqIdx + 1);
		// Match single-letter tokens not surrounded by other letters (handles "3x", " x ", etc.)
		const singleLetterRe = /(?<![a-zA-Z])([a-z])(?![a-zA-Z])/gi;
		const lhsVars = new Set(Array.from(lhs.matchAll(singleLetterRe), (m) => m[1]!.toLowerCase()));
		const rhsVars = Array.from(rhs.matchAll(singleLetterRe), (m) => m[1]!.toLowerCase());
		return rhsVars.some((v) => lhsVars.has(v));
	})();
	const representations = detectRepresentations(problemText);
	const scenarioComplexity = estimateScenarioComplexity(problemText);

	return {
		operations,
		transformations,
		hasParentheses,
		variableBothSides,
		representations,
		scenarioComplexity,
	};
}
