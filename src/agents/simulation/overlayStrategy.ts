/**
 * Overlay Strategy Module
 *
 * Applies accessibility overlays to astronauts strategically based on problem characteristics.
 * This replaces random overlay assignment with deterministic rules derived from the
 * "asteroid field" (problems in the assignment).
 *
 * Key Principle: Overlays are NOT random. They are determined by:
 * - Cognitive difficulty (Bloom levels)
 * - Linguistic complexity (vocabulary, sentence length)
 * - Temporal demands (total time)
 * - Difficulty progression (large Bloom jumps)
 *
 * Phase 4: Overlays applied AFTER astronaut creation, BEFORE simulation
 */

import { Astronaut } from '../../types/simulation';
import { BloomLevel } from '../analysis/types';

/**
 * Represents a problem with the characteristics we care about for overlay assignment
 */
export interface ProblemCharacteristics {
  BloomLevel: BloomLevel;
  LinguisticComplexity: number;
  EstimatedTimeMinutes?: number;
  SequenceIndex?: number;
}

/**
 * Statistics about the entire problem set
 */
interface ProblemSetStats {
  avgLinguisticComplexity: number;
  avgBloomLevel: number;
  maxBloomLevel: number;
  totalTimeMinutes: number;
  hasBloomSpike: boolean;
  complexityHigh: boolean;
}

/**
 * Convert Bloom level to a numeric value for calculations
 */
function bloomToNumber(bloomLevel: BloomLevel): number {
  const bloomMap: Record<BloomLevel, number> = {
    'Remember': 1,
    'Understand': 2,
    'Apply': 3,
    'Analyze': 4,
    'Evaluate': 5,
    'Create': 6,
  };
  return bloomMap[bloomLevel] || 1;
}

/**
 * Calculate statistics about the problem set
 */
function calculateProblemSetStats(problems: ProblemCharacteristics[]): ProblemSetStats {
  if (!problems || problems.length === 0) {
    return {
      avgLinguisticComplexity: 0,
      avgBloomLevel: 1,
      maxBloomLevel: 1,
      totalTimeMinutes: 0,
      hasBloomSpike: false,
      complexityHigh: false,
    };
  }

  const bloomNumbers = problems.map((p) => bloomToNumber(p.BloomLevel));
  const totalComplexity = problems.reduce((sum, p) => sum + (p.LinguisticComplexity || 0), 0);
  const totalTime = problems.reduce((sum, p) => sum + (p.EstimatedTimeMinutes || 0), 0);

  const avgLinguisticComplexity = totalComplexity / problems.length;
  const avgBloomLevel = bloomNumbers.reduce((sum, b) => sum + b, 0) / problems.length;
  const maxBloomLevel = Math.max(...bloomNumbers);

  // Check for Bloom spikes (large jumps between consecutive problems)
  let hasBloomSpike = false;
  for (let i = 0; i < problems.length - 1; i++) {
    const diff = Math.abs(bloomToNumber(problems[i].BloomLevel) - bloomToNumber(problems[i + 1].BloomLevel));
    if (diff >= 2) {
      hasBloomSpike = true;
      break;
    }
  }

  return {
    avgLinguisticComplexity,
    avgBloomLevel,
    maxBloomLevel,
    totalTimeMinutes: totalTime,
    hasBloomSpike,
    complexityHigh: avgLinguisticComplexity > 0.7,
  };
}

/**
 * Rule 1: High text load + weak reader → dyslexia overlay
 *
 * Rationale: If assignment has complex language AND student struggles with reading,
 * they need dyslexia-specific support (fonts, spacing, simplified text).
 */
function applyDyslexiaRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // Trigger: High linguistic complexity + low reading level
  if (stats.avgLinguisticComplexity > 0.7 && astronaut.ProfileTraits.ReadingLevel < 0.5) {
    overlays.push('dyslexia');
  }

  return overlays;
}

/**
 * Rule 2: Long assignments → fatigue_sensitive overlay
 *
 * Rationale: If assignment takes ≥60 minutes total, even strong students will tire.
 * Fatigue-sensitive students (ADHD, anxiety) need breaks and pacing adjustments.
 */
function applyFatigueRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // Trigger: Total time >= 60 minutes (indicates long assessment)
  if (stats.totalTimeMinutes >= 60) {
    overlays.push('fatigue_sensitive');
  }

  return overlays;
}

/**
 * Rule 3: Large Bloom jumps → anxiety_prone overlay
 *
 * Rationale: If difficulty suddenly jumps (e.g., Remember → Analyze),
 * students may feel overwhelmed and panicky. Anxiety-prone students need scaffolding.
 */
function applyAnxietyRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // Trigger: Assignment has Bloom spikes (sudden difficulty increases)
  if (stats.hasBloomSpike) {
    overlays.push('anxiety_prone');
  }

  return overlays;
}

/**
 * Rule 4: Heavy vocabulary → ESL overlay
 *
 * Rationale: Assignments with >0.8 linguistic complexity are hard for ESL students.
 * They need simpler language, definitions, or translations.
 */
function applyESLRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // Trigger: Very high linguistic complexity
  if (stats.avgLinguisticComplexity > 0.8) {
    overlays.push('esl');
  }

  return overlays;
}

/**
 * Rule 5: Low cognitive demand (Remember/Understand level) + low complexity
 *          → suggests procedural overload or fine-motor demands
 *          → ADHD students struggle with exec. function
 *
 * Rationale: Counter-intuitive, but "easy" problems with lots of steps/procedures
 * can overwhelm ADHD students (executive function issues). Monitor for this pattern.
 */
function applyADHDRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // This rule is less direct. It triggers if:
  // - Mostly low Bloom (Remember/Understand)
  // - AND low attention span student
  // - AND low complexity (procedural, repetitive)
  // => Suggests need for structure/breaks
  const mostly_low_bloom = stats.avgBloomLevel <= 2;
  const low_attention = astronaut.ProfileTraits.AttentionSpan < 0.5;
  const simple_but_long = stats.avgLinguisticComplexity < 0.4 && stats.totalTimeMinutes > 45;

  if (mostly_low_bloom && low_attention && simple_but_long) {
    overlays.push('adhd');
  }

  return overlays;
}

/**
 * Rule 6: Very high Bloom + confident learner → None (no overlay needed)
 * But: Very high Bloom + low confidence → struggling reader or anxiety prone
 *
 * Rationale: If we have very advanced problems but the student isn't confident,
 * they might need the cognitive_demand overlay (more thinking, more struggle).
 */
function applyCognitiveOverloadRule(
  astronaut: Astronaut,
  stats: ProblemSetStats
): string[] {
  const overlays: string[] = [];

  // Trigger: High Bloom level problems + low confidence student
  if (stats.maxBloomLevel >= 4 && astronaut.ProfileTraits.Confidence < 0.5) {
    overlays.push('cognitive_demand');
  }

  return overlays;
}

/**
 * Apply accessibility overlays to astronauts based on problem characteristics
 *
 * This is a deterministic process: same problems → same overlays for same astronaut.
 *
 * @param astronauts - Array of student profiles (with empty Overlays)
 * @param problems - Array of problem characteristics
 * @returns Astronauts with overlays assigned according to strategic rules
 */
export function applyOverlaysStrategically(
  astronauts: Astronaut[],
  problems: ProblemCharacteristics[]
): Astronaut[] {
  // Calculate aggregate statistics about the problem set
  const stats = calculateProblemSetStats(problems);

  // Apply rules to each astronaut
  return astronauts.map((astronaut) => {
    const overlays = new Set<string>();

    // Apply each rule and collect applicable overlays
    applyDyslexiaRule(astronaut, stats).forEach((o) => overlays.add(o));
    applyFatigueRule(astronaut, stats).forEach((o) => overlays.add(o));
    applyAnxietyRule(astronaut, stats).forEach((o) => overlays.add(o));
    applyESLRule(astronaut, stats).forEach((o) => overlays.add(o));
    applyADHDRule(astronaut, stats).forEach((o) => overlays.add(o));
    applyCognitiveOverloadRule(astronaut, stats).forEach((o) => overlays.add(o));

    // Convert set to array and assign to astronaut
    return {
      ...astronaut,
      Overlays: Array.from(overlays),
    };
  });
}

/**
 * Get debugging information about why overlays were assigned
 *
 * Useful for understanding the reasoning behind overlay choices.
 */
export interface OverlayDebugInfo {
  astronautId: string;
  personaName: string;
  appliedOverlays: string[];
  triggers: string[];
}

/**
 * Debug version: returns detailed reasoning for overlay assignments
 */
export function debugOverlayAssignment(
  astronauts: Astronaut[],
  problems: ProblemCharacteristics[]
): OverlayDebugInfo[] {
  const stats = calculateProblemSetStats(problems);

  return astronauts.map((astronaut) => {
    const triggers: string[] = [];
    const appliedOverlays: string[] = [];

    // Rule 1: Dyslexia
    if (stats.avgLinguisticComplexity > 0.7 && astronaut.ProfileTraits.ReadingLevel < 0.5) {
      triggers.push(
        `High text load (complexity: ${stats.avgLinguisticComplexity.toFixed(2)}) + weak reader (level: ${astronaut.ProfileTraits.ReadingLevel.toFixed(2)})`
      );
      appliedOverlays.push('dyslexia');
    }

    // Rule 2: Fatigue
    if (stats.totalTimeMinutes > 60) {
      triggers.push(`Long assessment (${stats.totalTimeMinutes} minutes total)`);
      appliedOverlays.push('fatigue_sensitive');
    }

    // Rule 3: Anxiety
    if (stats.hasBloomSpike) {
      triggers.push(`Assignment has Bloom spikes (large difficulty jumps)`);
      appliedOverlays.push('anxiety_prone');
    }

    // Rule 4: ESL
    if (stats.avgLinguisticComplexity > 0.8) {
      triggers.push(`Very high linguistic complexity (${stats.avgLinguisticComplexity.toFixed(2)})`);
      appliedOverlays.push('esl');
    }

    // Rule 5: ADHD
    const mostly_low_bloom = stats.avgBloomLevel <= 2;
    const low_attention = astronaut.ProfileTraits.AttentionSpan < 0.5;
    const simple_but_long = stats.avgLinguisticComplexity < 0.4 && stats.totalTimeMinutes > 45;
    if (mostly_low_bloom && low_attention && simple_but_long) {
      triggers.push(
        `Low Bloom level (avg: ${stats.avgBloomLevel.toFixed(1)}) + low attention (${astronaut.ProfileTraits.AttentionSpan.toFixed(2)}) + long simple tasks`
      );
      appliedOverlays.push('adhd');
    }

    // Rule 6: Cognitive Demand
    if (stats.maxBloomLevel >= 4 && astronaut.ProfileTraits.Confidence < 0.5) {
      triggers.push(
        `High Bloom (max: ${stats.maxBloomLevel}) + low confidence (${astronaut.ProfileTraits.Confidence.toFixed(2)})`
      );
      appliedOverlays.push('cognitive_demand');
    }

    return {
      astronautId: astronaut.StudentId,
      personaName: astronaut.PersonaName,
      appliedOverlays: Array.from(new Set(appliedOverlays)),
      triggers,
    };
  });
}
