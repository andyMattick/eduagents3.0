/**
 * mathUtils.ts — Shared deterministic math utilities for template plugins.
 *
 * No LLM calls. Pure functions only.
 */

/** Random integer in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array. */
export function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** Shuffle an array (Fisher-Yates). Returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Greatest common divisor (Euclidean). */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Generate N unique random integers in [min, max]. */
export function uniqueRandInts(n: number, min: number, max: number): number[] {
  const set = new Set<number>();
  while (set.size < n && set.size < max - min + 1) {
    set.add(randInt(min, max));
  }
  return [...set];
}
