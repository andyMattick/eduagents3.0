export type MasteryBand = "low" | "mid" | "high";

export const LOW_MASTERY_THRESHOLD = 0.45;
export const MID_MASTERY_THRESHOLD = 0.75;

export function classifyMasteryBand(value: number | null | undefined): MasteryBand | "neutral" {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "neutral";
	}
	if (value < LOW_MASTERY_THRESHOLD) {
		return "low";
	}
	if (value < MID_MASTERY_THRESHOLD) {
		return "mid";
	}
	return "high";
}