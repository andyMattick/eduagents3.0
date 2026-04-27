import type { TestItem } from "../schema/integration";
import type { ExtractedProblemDifficulty } from "../schema/semantic/ExtractedProblem";

export type ItemRewriteIntent =
	| "easier"
	| "harder"
	| "change_numbers"
	| "real_world"
	| "concise"
	| "student_friendly"
	| "academic";

const EASIER_PREFIXES = [
	"Describe, in your own words,",
	"In simple terms, what is",
	"Name one example of",
	"In one sentence, explain",
	"What does the term mean:",
];

const HARDER_PREFIXES = [
	"Analyze the relationship between",
	"Evaluate the significance of",
	"Construct an argument for or against",
	"Synthesize the key principles behind",
	"Critique the assumptions underlying",
];

const REAL_WORLD_PREFIXES = [
	"A student at school notices that",
	"In a local community context,",
	"Imagine you are a professional who must",
	"Based on a real-world scenario,",
	"A news article reports that",
];

const STUDENT_FRIENDLY_PREFIXES = [
	"Can you explain",
	"Think about this: what happens when",
	"In your own words,",
	"Imagine you had to teach a friend about",
	"How would you describe",
];

const ACADEMIC_PREFIXES = [
	"Provide a formal analysis of",
	"Articulate the theoretical basis for",
	"In academic terms, define and explain",
	"With reference to established principles,",
	"Systematically evaluate",
];

function pickByHash(items: string[], seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return items[hash % items.length]!;
}

function difficultyStep(current: ExtractedProblemDifficulty, direction: "up" | "down"): ExtractedProblemDifficulty {
	const levels: ExtractedProblemDifficulty[] = ["low", "medium", "high"];
	const idx = levels.indexOf(current);
	if (direction === "up") return levels[Math.min(idx + 1, levels.length - 1)]!;
	return levels[Math.max(idx - 1, 0)]!;
}

/**
 * Transform a number found in the prompt string. Replaces the first integer
 * found with a plausibly different value (avoids 0 and the original).
 */
function changeNumbers(prompt: string): string {
	const match = /\b(\d+)\b/.exec(prompt);
	if (!match) {
		return prompt;
	}
	const original = parseInt(match[1]!, 10);
	// Shift by a small prime to keep it plausible but different
	const replacement = original === 0 ? 7 : original + (original % 3 === 0 ? 5 : -3 + (original % 7));
	return prompt.replace(/\b\d+\b/, String(Math.max(1, replacement)));
}

/**
 * Make a prompt more concise: strip padding phrases, trim to core question.
 */
function makeConcise(prompt: string): string {
	return prompt
		.replace(/^(please\s+|kindly\s+|be\s+sure\s+to\s+)/i, "")
		.replace(/\s*\(.*?\)\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
}

/**
 * Rewrite a single TestItem according to the given intent.
 * This is a deterministic, server-side transform — no LLM call required.
 * The new itemId is derived from the original so it is stable across calls.
 */
export function rewriteTestItem(item: TestItem, intent: ItemRewriteIntent): TestItem {
	const seed = `${item.itemId}:${intent}`;
	let newPrompt = item.prompt;
	let newDifficulty = item.difficulty;

	switch (intent) {
		case "easier": {
			const prefix = pickByHash(EASIER_PREFIXES, seed);
			// Strip any existing question prefix to avoid double-wrapping
			const core = newPrompt.replace(/^(analyze|evaluate|construct|synthesize|critique)\s+/i, "");
			newPrompt = `${prefix} ${core.charAt(0).toLowerCase()}${core.slice(1)}`;
			newDifficulty = difficultyStep(item.difficulty, "down");
			break;
		}
		case "harder": {
			const prefix = pickByHash(HARDER_PREFIXES, seed);
			const core = newPrompt.replace(/^(describe|name|list|what\s+is)\s+/i, "");
			newPrompt = `${prefix} ${core.charAt(0).toLowerCase()}${core.slice(1)}`;
			newDifficulty = difficultyStep(item.difficulty, "up");
			break;
		}
		case "change_numbers": {
			newPrompt = changeNumbers(item.prompt);
			break;
		}
		case "real_world": {
			const prefix = pickByHash(REAL_WORLD_PREFIXES, seed);
			newPrompt = `${prefix} ${item.prompt.charAt(0).toLowerCase()}${item.prompt.slice(1)}`;
			break;
		}
		case "concise": {
			newPrompt = makeConcise(item.prompt);
			break;
		}
		case "student_friendly": {
			const prefix = pickByHash(STUDENT_FRIENDLY_PREFIXES, seed);
			const core = item.prompt.replace(/\?$/, "").trim();
			newPrompt = `${prefix} ${core.charAt(0).toLowerCase()}${core.slice(1)}?`;
			break;
		}
		case "academic": {
			const prefix = pickByHash(ACADEMIC_PREFIXES, seed);
			const core = item.prompt.replace(/^(what|how|why|describe|explain)\s+/i, "");
			newPrompt = `${prefix} ${core.charAt(0).toLowerCase()}${core.slice(1)}`;
			break;
		}
	}

	return {
		...item,
		itemId: `${item.itemId}-rw-${intent}`,
		prompt: newPrompt.trim(),
		difficulty: newDifficulty,
	};
}

/**
 * Immutably replace one item in a TestProduct-shaped payload.
 * Returns null if the item is not found.
 */
export function replaceItemInTestPayload(
	payload: { sections: Array<{ items: TestItem[] }> },
	targetItemId: string,
	replacement: TestItem,
): typeof payload | null {
	let found = false;
	const next = {
		...payload,
		sections: payload.sections.map((section) => {
			const itemIdx = section.items.findIndex((i) => i.itemId === targetItemId);
			if (itemIdx === -1) {
				return section;
			}
			found = true;
			const items = [...section.items];
			items[itemIdx] = replacement;
			return { ...section, items };
		}),
	};
	return found ? next : null;
}
