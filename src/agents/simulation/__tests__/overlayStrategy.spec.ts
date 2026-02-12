/**
 * Unit Tests for Overlay Strategy
 *
 * Tests cover:
 * - Each overlay rule fires correctly under its trigger conditions
 * - Deterministic output (same input → same overlays)
 * - Edge cases (empty problems, no triggers, multiple triggers)
 * - Accuracy of debug information
 */

import { describe, it, expect } from 'vitest';
import {
  applyOverlaysStrategically,
  debugOverlayAssignment,
  type ProblemCharacteristics,
} from '../overlayStrategy';
import type { Astronaut } from '../../../types/simulation';

/**
 * Helper: Create a mock problem with given characteristics
 */
function createMockProblem(overrides?: Partial<ProblemCharacteristics>): ProblemCharacteristics {
  return {
    BloomLevel: 'Understand',
    LinguisticComplexity: 0.5,
    EstimatedTimeMinutes: 10,
    SequenceIndex: 1,
    ...overrides,
  };
}

/**
 * Helper: Create a mock astronaut with given traits
 */
function createMockAstronaut(overrides?: Partial<Astronaut>): Astronaut {
  return {
    StudentId: 'test_student',
    PersonaName: 'Test Persona',
    Overlays: [], // Start with empty overlays
    NarrativeTags: [],
    ProfileTraits: {
      ReadingLevel: 0.7,
      MathFluency: 0.7,
      AttentionSpan: 0.7,
      Confidence: 0.7,
    },
    ...overrides,
  };
}

describe('Overlay Strategy', () => {
  describe('Rule 1: Dyslexia Overlay', () => {
    it('triggers on high complexity + weak reader', () => {
      const problems = [
        createMockProblem({ LinguisticComplexity: 0.8 }),
        createMockProblem({ LinguisticComplexity: 0.75 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.4, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('dyslexia');
    });

    it('does not trigger on high complexity + strong reader', () => {
      const problems = [
        createMockProblem({ LinguisticComplexity: 0.8 }),
        createMockProblem({ LinguisticComplexity: 0.75 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.9, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('dyslexia');
    });

    it('does not trigger on low complexity + weak reader', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.4 })];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.3, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('dyslexia');
    });
  });

  describe('Rule 2: Fatigue-Sensitive Overlay', () => {
    it('triggers on long assignments (>60 minutes)', () => {
      const problems = [
        createMockProblem({ EstimatedTimeMinutes: 25 }),
        createMockProblem({ EstimatedTimeMinutes: 25 }),
        createMockProblem({ EstimatedTimeMinutes: 15 }),
      ]; // Total: 65 minutes
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('fatigue_sensitive');
    });

    it('does not trigger on short assignments (<60 minutes)', () => {
      const problems = [
        createMockProblem({ EstimatedTimeMinutes: 15 }),
        createMockProblem({ EstimatedTimeMinutes: 15 }),
        createMockProblem({ EstimatedTimeMinutes: 10 }),
      ]; // Total: 40 minutes
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('fatigue_sensitive');
    });

    it('triggers at exactly 60+ minutes', () => {
      const problems = [
        createMockProblem({ EstimatedTimeMinutes: 30 }),
        createMockProblem({ EstimatedTimeMinutes: 30 }),
      ]; // Total: 60 minutes
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('fatigue_sensitive');
    });
  });

  describe('Rule 3: Anxiety-Prone Overlay', () => {
    it('triggers on large Bloom jumps', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember' }),
        createMockProblem({ BloomLevel: 'Analyze' }), // Jump of 3 levels
      ];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('anxiety_prone');
    });

    it('does not trigger on gradual Bloom progression', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember' }),
        createMockProblem({ BloomLevel: 'Understand' }),
        createMockProblem({ BloomLevel: 'Apply' }),
        createMockProblem({ BloomLevel: 'Analyze' }),
      ];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('anxiety_prone');
    });

    it('detects jump of exactly 2 levels', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember' }),
        createMockProblem({ BloomLevel: 'Apply' }), // Jump of 2
      ];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('anxiety_prone');
    });
  });

  describe('Rule 4: ESL Overlay', () => {
    it('triggers on very high linguistic complexity (>0.8)', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.85 })];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('esl');
    });

    it('does not trigger on moderate complexity', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.7 })];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('esl');
    });

    it('triggers at boundary (0.8)', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.8 })];
      const astronaut = createMockAstronaut();

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('esl'); // 0.8 is not > 0.8
    });
  });

  describe('Rule 5: ADHD Overlay', () => {
    it('triggers on low Bloom + low attention + simple but long', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember', LinguisticComplexity: 0.2, EstimatedTimeMinutes: 30 }),
        createMockProblem({ BloomLevel: 'Understand', LinguisticComplexity: 0.3, EstimatedTimeMinutes: 25 }),
      ]; // Total: 55 minutes, all simple
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.4, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('adhd');
    });

    it('does not trigger on high Bloom assignments', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Analyze', EstimatedTimeMinutes: 30 }),
        createMockProblem({ BloomLevel: 'Create', EstimatedTimeMinutes: 25 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.4, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('adhd');
    });

    it('does not trigger on strong attention students', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember', LinguisticComplexity: 0.2, EstimatedTimeMinutes: 30 }),
        createMockProblem({ BloomLevel: 'Understand', LinguisticComplexity: 0.3, EstimatedTimeMinutes: 25 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.8, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('adhd');
    });
  });

  describe('Rule 6: Cognitive Demand Overlay', () => {
    it('triggers on high Bloom + low confidence', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Analyze' }),
        createMockProblem({ BloomLevel: 'Evaluate' }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.4 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).toContain('cognitive_demand');
    });

    it('does not trigger on high Bloom + high confidence', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Analyze' }),
        createMockProblem({ BloomLevel: 'Create' }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.9 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('cognitive_demand');
    });

    it('does not trigger on low Bloom + low confidence', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember' }),
        createMockProblem({ BloomLevel: 'Understand' }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.3 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].Overlays).not.toContain('cognitive_demand');
    });
  });

  describe('Determinism', () => {
    it('produces same overlays for identical input', () => {
      const problems = [
        createMockProblem({ LinguisticComplexity: 0.85, EstimatedTimeMinutes: 40 }),
        createMockProblem({ BloomLevel: 'Analyze' }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.3, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result1 = applyOverlaysStrategically([astronaut], problems);
      const result2 = applyOverlaysStrategically([astronaut], problems);

      expect(result1[0].Overlays).toEqual(result2[0].Overlays);
    });

    it('produces same overlays across multiple calls', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember', EstimatedTimeMinutes: 30 }),
        createMockProblem({ BloomLevel: 'Apply', EstimatedTimeMinutes: 25 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.8, MathFluency: 0.7, AttentionSpan: 0.3, Confidence: 0.7 },
      });

      const results = Array.from({ length: 5 }, () =>
        applyOverlaysStrategically([astronaut], problems)
      );

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i][0].Overlays).toEqual(results[0][0].Overlays);
      }
    });
  });

  describe('Multiple Overlays', () => {
    it('applies multiple overlays when multiple rules trigger', () => {
      const problems = [
        createMockProblem({ BloomLevel: 'Remember', LinguisticComplexity: 0.9, EstimatedTimeMinutes: 40 }),
        createMockProblem({ BloomLevel: 'Analyze', LinguisticComplexity: 0.85 }), // Jump of 3 Bloom levels
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.3, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      // Should have: dyslexia (high complexity + weak reader), esl (complexity >0.8), anxiety (Bloom spike)
      expect(result[0].Overlays).toContain('dyslexia');
      expect(result[0].Overlays).toContain('esl');
      expect(result[0].Overlays).toContain('anxiety_prone');
    });

    it('avoids duplicate overlays', () => {
      const problems = [
        createMockProblem({ LinguisticComplexity: 0.9, EstimatedTimeMinutes: 30 }),
        createMockProblem({ LinguisticComplexity: 0.85 }),
      ];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.7, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      // Should only have 'esl' once, not twice
      const eslCount = result[0].Overlays.filter((o) => o === 'esl').length;
      expect(eslCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty problems array', () => {
      const astronaut = createMockAstronaut();
      const result = applyOverlaysStrategically([astronaut], []);

      expect(result[0].Overlays).toEqual([]);
    });

    it('handles single problem', () => {
      const problems = [createMockProblem({ BloomLevel: 'Understand' })];
      const astronaut = createMockAstronaut();
      const result = applyOverlaysStrategically([astronaut], problems);

      expect(Array.isArray(result[0].Overlays)).toBe(true);
    });

    it('handles multiple astronauts', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.85, EstimatedTimeMinutes: 70 })];
      const astronauts = [
        createMockAstronaut({ StudentId: 's1', ProfileTraits: { ReadingLevel: 0.2, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 } }),
        createMockAstronaut({ StudentId: 's2', ProfileTraits: { ReadingLevel: 0.9, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 } }),
      ];

      const result = applyOverlaysStrategically(astronauts, problems);

      expect(result.length).toBe(2);
      // s1 should have dyslexia and esl; s2 should only have esl
      expect(result[0].Overlays).toContain('dyslexia');
      expect(result[1].Overlays).not.toContain('dyslexia');
    });

    it('preserves other astronaut properties', () => {
      const problems = [createMockProblem()];
      const astronaut = createMockAstronaut({
        StudentId: 'unique_id',
        PersonaName: 'Unique Persona',
        NarrativeTags: ['tag1', 'tag2'],
      });

      const result = applyOverlaysStrategically([astronaut], problems);

      expect(result[0].StudentId).toBe('unique_id');
      expect(result[0].PersonaName).toBe('Unique Persona');
      expect(result[0].NarrativeTags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Debug Information', () => {
    it('returns debug info with correct structure', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.85, EstimatedTimeMinutes: 70 })];
      const astronaut = createMockAstronaut({
        StudentId: 'debug_test',
        PersonaName: 'Debug Persona',
        ProfileTraits: { ReadingLevel: 0.3, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const debugInfo = debugOverlayAssignment([astronaut], problems);

      expect(debugInfo).toHaveLength(1);
      expect(debugInfo[0].astronautId).toBe('debug_test');
      expect(debugInfo[0].personaName).toBe('Debug Persona');
      expect(Array.isArray(debugInfo[0].appliedOverlays)).toBe(true);
      expect(Array.isArray(debugInfo[0].triggers)).toBe(true);
    });

    it('lists all triggered rules in debug info', () => {
      const problems = [createMockProblem({ LinguisticComplexity: 0.9 })];
      const astronaut = createMockAstronaut({
        ProfileTraits: { ReadingLevel: 0.2, MathFluency: 0.7, AttentionSpan: 0.7, Confidence: 0.7 },
      });

      const debugInfo = debugOverlayAssignment([astronaut], problems);

      expect(debugInfo[0].triggers.length).toBeGreaterThan(0);
      expect(debugInfo[0].triggers[0]).toContain('complexity') || expect(debugInfo[0].triggers[0]).toContain('reader');
    });
  });
});
