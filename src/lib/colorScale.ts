/**
 * src/lib/colorScale.ts — Green → yellow → red load color scale
 *
 * Used by simulator graphs and tables to visually encode load / risk values.
 */

/**
 * Map a 0–1 load value to a color string.
 *   0.00–0.33 → green  (#22c55e)
 *   0.34–0.66 → yellow (#eab308)
 *   0.67–1.00 → red    (#ef4444)
 */
export function loadToColor(load: number): string {
	if (load <= 0.33) return "#22c55e";
	if (load <= 0.66) return "#eab308";
	return "#ef4444";
}

/** Canonical profile colors — consistent across all graphs/tables. */
export const PROFILE_COLORS: Record<string, string> = {
	average: "#2563eb",
	"low confidence": "#7c3aed",
	"high anxiety": "#db2777",
	adhd: "#f97316",
	dyslexia: "#0891b2",
	ell: "#059669",
	"gifted / fast processor": "#16a34a",
	perfectionist: "#9333ea",
	"easily frustrated": "#dc2626",
	"slow reader": "#0369a1",
	"strong reader": "#15803d",
	"slow processor": "#b45309",
	"weak math background": "#c2410c",
	"strong math background": "#166534",
};

/**
 * Return a deterministic color for a profile by label (case-insensitive).
 * Falls back to a blue-grey if the label is not in the canonical map.
 */
export function colorForProfile(profileLabel: string): string {
	return PROFILE_COLORS[profileLabel.toLowerCase()] ?? "#6b7280";
}
