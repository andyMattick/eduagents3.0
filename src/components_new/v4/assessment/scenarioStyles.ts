/**
 * Scenario styles for assessment item generation.
 * Provides varied, domain-appropriate real-world contexts so successive
 * items and versions feel distinct rather than repetitive.
 *
 * `pickScenario(subject, seed)`:
 *   - With a seed  → deterministic pick (reproducible for a given concept × type)
 *   - Without seed → random pick (useful for UI preview)
 */

export const UNIVERSAL_SCENARIOS = [
	"medical testing (e.g., drug trials, diagnostic accuracy)",
	"sports analytics (e.g., performance metrics, win/loss data)",
	"public health (e.g., infection rates, vaccination coverage)",
	"consumer product testing (e.g., defect rates, quality control)",
	"education / classroom data (e.g., test scores, attendance)",
	"environmental science (e.g., pollution levels, temperature readings)",
	"business decision-making (e.g., sales conversion, marketing effectiveness)",
	"transportation (e.g., commute times, accident rates, fuel efficiency)",
	"agriculture (e.g., crop yield, germination rates, pesticide effectiveness)",
] as const;

export const SUBJECT_SCENARIOS = {
	statistics: [
		"clinical trials and hypothesis testing",
		"manufacturing quality control",
		"A/B testing for web products",
		"agricultural experiments and yield analysis",
		"sports performance analysis",
	],
	biology: [
		"ecosystem changes and biodiversity",
		"cell processes and metabolic pathways",
		"genetics and inheritance patterns",
		"human physiology lab data",
		"microbiology lab results and colony counts",
	],
	ela: [
		"literary analysis of short stories",
		"character motivation in novels",
		"theme development across chapters",
		"author's purpose in non-fiction",
		"comparing two texts on the same topic",
	],
	chemistry: [
		"reaction rate experiments",
		"titration lab results",
		"gas law applications",
		"solution concentration problems",
	],
	physics: [
		"projectile motion scenarios",
		"energy transfer in mechanical systems",
		"circuit analysis",
		"wave and optics experiments",
	],
	history: [
		"primary source analysis",
		"cause and effect of historical events",
		"comparing perspectives from different groups",
		"evaluating historical significance",
	],
};

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) >>> 0;
	}
	return h;
}

/**
 * Pick a scenario style for a concept × item type pair.
 *
 * @param subject  Subject key (e.g. "statistics", "biology", "ela") — optional
 * @param seed     Deterministic seed (e.g. conceptId + type) — omit for random
 */
export function pickScenario(subject?: string, seed?: string): string {
	const subjectKey = subject?.toLowerCase() as keyof typeof SUBJECT_SCENARIOS | undefined;
	const subjectList = subjectKey && SUBJECT_SCENARIOS[subjectKey] ? SUBJECT_SCENARIOS[subjectKey] : [];
	const combined = [...UNIVERSAL_SCENARIOS, ...subjectList];

	if (!seed) {
		return combined[Math.floor(Math.random() * combined.length)] ?? combined[0]!;
	}

	return combined[hashString(seed) % combined.length] ?? combined[0]!;
}
