/**
 * metricDefinitions.ts
 *
 * Canonical teacher-facing definitions for every simulator metric.
 * Used by:
 *   - "What do these numbers mean?" tooltip / modal in the app.
 *   - The "Metric Reference" appendix page in the assessment PDF.
 *
 * Each entry carries:
 *   key        — machine identifier, matches the JSON field name
 *   label      — short display label
 *   unit       — display unit suffix (empty string if dimensionless)
 *   range      — human description of the valid range
 *   definition — one-sentence plain-English definition
 *   computation — how the value is derived (1–3 sentences)
 *   interpretation — how a teacher should act on this value
 */

export interface MetricDefinition {
	key: string;
	label: string;
	unit: string;
	range: string;
	definition: string;
	computation: string;
	interpretation: string;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{
		key: "wordCount",
		label: "Words",
		unit: "words",
		range: "0 +",
		definition: "Total number of words in the item stem (and choices, when present).",
		computation:
			"Counted by splitting the item text on whitespace after stripping punctuation. " +
			"Choices are included when the item is multiple-choice.",
		interpretation:
			"Items above ~50 words tend to increase reading load significantly. " +
			"Consider trimming or breaking a long item into two.",
	},
	{
		key: "cognitiveLoad",
		label: "Cognitive Load",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Composite score representing the total mental effort required to process and answer the item.",
		computation:
			"Assessed by the simulation model based on the number of reasoning steps required, " +
			"the abstractness of the language, and the number of distinct concepts in the stem. " +
			"Values are normalized to 0–1.",
		interpretation:
			"Below 0.4: accessible to most students. " +
			"0.4–0.65: moderate; appropriate for grade-level work. " +
			"Above 0.65: high — consider scaffolding or simplifying the stem.",
	},
	{
		key: "confusionRisk",
		label: "Confusion",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Multi-factor score estimating the probability that a typical student will be confused by this item.",
		computation:
			"Weighted composite: " +
			"30% cognitive load, 20% reading load, 15% distractor density, " +
			"15% reasoning steps (capped at 5), 10% misconception risk, 10% time-to-process (capped at 30 s).",
		interpretation:
			"Above 0.6: many students are likely to hesitate, misread, or guess. " +
			"Review distractor quality, stem clarity, and vocabulary load.",
	},
	{
		key: "readingLoad",
		label: "Reading Load",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Estimated effort required to decode and comprehend the text, independent of content difficulty.",
		computation:
			"Derived from sentence length, average syllables per word, and passive/complex syntactic constructions " +
			"as judged by the simulation model.",
		interpretation:
			"High reading load (> 0.6) can disadvantage ELL, dyslexic, and low-confidence readers " +
			"even when they understand the underlying concept. Simplify sentence structure rather than content.",
	},
	{
		key: "timeToProcessSeconds",
		label: "Time (s)",
		unit: "s",
		range: "0 +",
		definition:
			"Estimated number of seconds a typical student needs to read, think through, and respond to the item.",
		computation:
			"Estimated by the simulation model from word count, cognitive load, number of steps, " +
			"and the reading profile of the target student.",
		interpretation:
			"Sum across all items to check whether the total aligns with your test time limit. " +
			"Items over 120 s are outliers — consider splitting them.",
	},
	{
		key: "misconceptionRisk",
		label: "Misconception Risk",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Probability that a common misconception in this topic area could lead a student to choose the wrong answer even after careful reading.",
		computation:
			"Assessed by the simulation model based on known misconception patterns for the concept " +
			"and the plausibility of distractor choices.",
		interpretation:
			"High values (> 0.5) suggest the item tests a concept where students often hold incorrect " +
			"mental models. A pre-teaching moment or a targeted distractor review may help.",
	},
	{
		key: "vocabularyDifficulty",
		label: "Vocabulary Difficulty",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Estimated difficulty of the domain-specific and academic vocabulary used in the item.",
		computation:
			"Rated by the simulation model against grade-level word frequency lists and the identified " +
			"subject-area vocabulary from the uploaded document.",
		interpretation:
			"Items above 0.6 may unfairly disadvantage ELL and lower-proficiency readers. " +
			"Clarify technical terms in the stem or provide a brief glossary.",
	},
	{
		key: "distractorDensity",
		label: "Distractor Density",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Share of the answer choices specifically designed to exploit common mistakes or misunderstandings.",
		computation:
			"Estimated by the simulation model from how many choices map to known error patterns " +
			"relative to the total number of choices.",
		interpretation:
			"A moderate density (0.3–0.6) is desirable for diagnostic items. " +
			"Very high (> 0.75) may be unfairly tricky; very low (< 0.2) offers little diagnostic value.",
	},
	{
		key: "steps",
		label: "Reasoning Steps",
		unit: "steps",
		range: "1 +",
		definition:
			"Estimated number of discrete reasoning or calculation steps a student must complete to arrive at the answer.",
		computation:
			"Assessed by the simulation model from the structure of the item: single-recall items score 1, " +
			"multi-step problems that require applying concepts in sequence score higher.",
		interpretation:
			"Items with 4+ steps may exceed working-memory capacity for younger or lower-skilled students. " +
			"Consider breaking into sub-questions or providing scaffolding.",
	},
	{
		key: "fatigue",
		label: "Fatigue Risk",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Predicted probability that the student's performance degrades due to mental fatigue before finishing the assessment.",
		computation:
			"Predicted by the simulation model from the cumulative cognitive load trajectory across all items, " +
			"pacing style, and test length.",
		interpretation:
			"Above 0.6: consider reordering items (easier first), adding a break, or shortening the test.",
	},
	{
		key: "guessing",
		label: "Guessing Risk",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Estimated probability that the student resorts to guessing rather than reasoning through items.",
		computation:
			"Predicted from time-pressure risk, fatigue, confusion levels, and pacing style.",
		interpretation:
			"High guessing risk reduces the diagnostic validity of the assessment. " +
			"Reduce time pressure or clarify high-confusion items.",
	},
	{
		key: "overload",
		label: "Cognitive Overload",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Predicted probability that the student's working memory is overwhelmed at some point during the assessment.",
		computation:
			"Derived from peak cognitive load values across items and cumulative load across the test.",
		interpretation:
			"Above 0.5: consider chunking complex items or reducing simultaneous demands on working memory.",
	},
	{
		key: "frustration",
		label: "Frustration",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Predicted probability of a frustration response — emotional disengagement triggered by repeated difficulty.",
		computation:
			"Estimated from the density of high-confusion items, misconception risk, and student confidence profile.",
		interpretation:
			"A high frustration prediction signals a motivational risk in addition to a cognitive one. " +
			"Review item sequencing and difficulty progression.",
	},
	{
		key: "timePressureCollapse",
		label: "Time-Pressure Collapse",
		unit: "",
		range: "0.0 – 1.0",
		definition:
			"Predicted probability that the student's performance drops sharply in the final portion of the test due to time pressure.",
		computation:
			"Modeled from total estimated completion time versus typical pacing, and fatigue trajectory.",
		interpretation:
			"Above 0.5 for a timed assessment: either reduce item count, extend time, or remove the lowest-priority items from the end.",
	},
];

/** Look up a single metric definition by its key. Returns undefined if not found. */
export function getMetricDefinition(key: string): MetricDefinition | undefined {
	return METRIC_DEFINITIONS.find((m) => m.key === key);
}
