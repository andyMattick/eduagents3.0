import { SUBJECT_GRADE_PROBLEM_TYPES } from "./subjectGradeProblemTypeMap";

/**
 * Given a subject and an array of grade level strings (e.g. ["10"]),
 * returns the best matching grade key from the subject's map.
 *
 * Strategy:
 * 1. Use the first grade that has a direct entry in the map.
 * 2. If none match exactly, find the closest grade by numeric distance.
 * 3. If the subject has no map at all, returns null.
 *
 * @example
 * inferGradeBand("biology", ["10"])     // → "10"
 * inferGradeBand("biology", ["10th"])   // → "10"
 * inferGradeBand("science", ["9"])      // → "8"  (closest available)
 * inferGradeBand("math", [])            // → null
 */
export function inferGradeBand(
  subject: string,
  gradeLevels: string[]
): string | null {
  const subjectMap = SUBJECT_GRADE_PROBLEM_TYPES[subject.toLowerCase()];
  if (!subjectMap) return null;

  const availableKeys = Object.keys(subjectMap);
  if (availableKeys.length === 0) return null;

  // Normalize a grade string to a number: "10th", "Grade 10", "10" → 10
  function toNumber(g: string): number | null {
    const match = g.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  for (const raw of gradeLevels) {
    const normalized = raw.trim();

    // Direct string match (e.g. "10" → "10")
    if (subjectMap[normalized]) return normalized;

    // Numeric extraction match (e.g. "10th" → "10")
    const num = toNumber(normalized);
    if (num !== null) {
      const strKey = String(num);
      if (subjectMap[strKey]) return strKey;
    }
  }

  // No direct match — find the closest grade numerically to the first grade
  const firstNum = gradeLevels.length > 0 ? toNumber(gradeLevels[0]) : null;
  if (firstNum === null) return availableKeys[0];

  const closest = availableKeys.reduce((best, key) => {
    const keyNum = toNumber(key);
    if (keyNum === null) return best;
    const bestNum = toNumber(best);
    if (bestNum === null) return key;
    return Math.abs(keyNum - firstNum) < Math.abs(bestNum - firstNum) ? key : best;
  });

  return closest;
}
