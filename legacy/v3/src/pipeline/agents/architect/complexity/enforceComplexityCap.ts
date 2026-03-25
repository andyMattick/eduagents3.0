import { computeSlotComplexity, type ComplexitySlot } from "./computeSlotComplexity";

export function enforceComplexityCap<T extends ComplexitySlot>(slots: T[], cap: number): T[] {
  let total = slots.reduce((sum: number, slot: T) => sum + computeSlotComplexity(slot), 0);

  if (total <= cap) return slots;

  const sorted = [...slots].sort(
    (a, b) => computeSlotComplexity(b) - computeSlotComplexity(a)
  );

  const removed = new Set<T>();

  for (const slot of sorted) {
    if (total <= cap) break;
    const cost = computeSlotComplexity(slot);
    if (total - cost >= cap) {
      removed.add(slot);
      total -= cost;
    }
  }

  return slots.filter((slot) => !removed.has(slot));
}
