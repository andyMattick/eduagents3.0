import type { ItemType } from "./assessmentTypes";

/**
 * Maps canonical concept IDs to the item types that are pedagogically appropriate
 * for that concept.
 *
 * Rules of thumb:
 *   - Definitional/recall concepts → mc, short_answer
 *   - Applied/reasoning concepts   → mc, short_answer, frq
 *   - Synthesis/evaluation         → short_answer, frq
 *
 * Unknown concepts default to ["mc", "short_answer"].
 */
export const ITEM_TYPE_BY_CANONICAL: Record<string, ItemType[]> = {
	// ── Statistics ────────────────────────────────────────────────────────────
	"stats.null_hypothesis":          ["mc", "short_answer"],
	"stats.alternative_hypothesis":   ["mc", "short_answer"],
	"stats.p_value":                  ["mc", "short_answer", "frq"],
	"stats.decision_rule":            ["mc", "short_answer"],
	"stats.significance_level":       ["mc", "short_answer"],
	"stats.one_proportion_test":      ["mc", "short_answer", "frq"],
	"stats.type_i_error":             ["mc", "short_answer"],
	"stats.type_ii_error":            ["mc", "short_answer"],

	// ── Biology ───────────────────────────────────────────────────────────────
	"bio.photosynthesis":             ["mc", "short_answer", "frq"],
	"bio.light_reactions":            ["mc", "short_answer"],
	"bio.calvin_cycle":               ["mc", "short_answer"],
	"bio.chloroplast":                ["mc", "short_answer"],
	"bio.cellular_respiration":       ["mc", "short_answer", "frq"],
	"bio.glycolysis":                 ["mc", "short_answer"],
	"bio.atp_synthesis":              ["mc", "short_answer", "frq"],
	"bio.krebs_cycle":                ["mc", "short_answer"],
	"bio.ecosystem":                  ["mc", "short_answer", "frq"],
	"bio.food_chain":                 ["mc", "short_answer"],
	"bio.energy_flow":                ["mc", "short_answer", "frq"],

	// ── ELA ───────────────────────────────────────────────────────────────────
	"ela.narrative_structure":        ["mc", "short_answer", "frq"],
	"ela.plot":                       ["mc", "short_answer"],
	"ela.conflict":                   ["mc", "short_answer", "frq"],
	"ela.point_of_view":              ["mc", "short_answer"],
	"ela.figurative_language":        ["mc", "short_answer", "frq"],
	"ela.metaphor":                   ["mc", "short_answer"],
	"ela.simile":                     ["mc", "short_answer"],
	"ela.symbolism":                  ["mc", "short_answer", "frq"],
	"ela.theme":                      ["short_answer", "frq"],
	"ela.motif":                      ["short_answer", "frq"],
	"ela.characterization":           ["mc", "short_answer", "frq"],
};

const DEFAULT_TYPES: ItemType[] = ["mc", "short_answer"];

/**
 * Returns the allowed item types for a canonical concept ID.
 * Falls back to ["mc", "short_answer"] for unknown IDs.
 */
export function allowedTypesForConcept(canonicalId: string): ItemType[] {
	return ITEM_TYPE_BY_CANONICAL[canonicalId] ?? DEFAULT_TYPES;
}
