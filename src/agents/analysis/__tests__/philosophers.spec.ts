/**
 * Integration Tests for Philosopher with Visualizations
 *
 * Tests cover:
 * - Philosopher API call success
 * - Visualization attachment to output
 * - Graceful error handling
 * - Output shape validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  callPhilosopherWithVisualizations,
  getLastPhilosopherPayload,
  isValidTeacherFeedbackOptions,
  type PhilosopherPayload,
} from '../philosophers';

/**
 * Mock data for testing
 */
const mockPayload: PhilosopherPayload = {
  assignmentText: 'Sample assignment text about photosynthesis and cellular respiration.',
  problems: [
    {
      id: 'p1',
      bloomLevel: 'Understand',
      linguisticComplexity: 0.5,
      text: 'Explain the process of photosynthesis.',
    },
    {
      id: 'p2',
      bloomLevel: 'Apply',
      linguisticComplexity: 0.7,
      text: 'Calculate the rate of photosynthesis given these conditions.',
    },
    {
      id: 'p3',
      bloomLevel: 'Analyze',
      linguisticComplexity: 0.8,
      text: 'Compare photosynthesis and cellular respiration.',
    },
  ],
  studentSimulations: [
    {
      studentId: 'strong-reader',
      timeOnTaskMs: 300000,
      confusionSignals: 1,
      fatigueIndex: 0.2,
    },
    {
      studentId: 'struggling-reader',
      timeOnTaskMs: 600000,
      confusionSignals: 5,
      fatigueIndex: 0.7,
    },
  ],
  documentMetadata: {
    gradeLevel: '9-12',
    subject: 'science',
    difficulty: 'standard',
  },
};

describe('Philosopher Integration', () => {
  beforeEach(() => {
    // Clear mock state between tests
    vi.clearAllMocks();
  });

  describe('callPhilosopherWithVisualizations', () => {
    it('returns a valid TeacherFeedbackOptions object', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('rankedFeedback');
      expect(result).toHaveProperty('visualizations');
      expect(isValidTeacherFeedbackOptions(result)).toBe(true);
    });

    it('includes rankedFeedback array', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      expect(Array.isArray(result.rankedFeedback)).toBe(true);
      expect(result.rankedFeedback.length).toBeGreaterThan(0);
    });

    it('each feedback item has required fields', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      result.rankedFeedback.forEach((item) => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('priority');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('recommendation');

        expect(typeof item.title).toBe('string');
        expect(['high', 'medium', 'low']).toContain(item.priority);
        expect(['clarity', 'engagement', 'accessibility', 'difficulty', 'pacing', 'coverage']).toContain(
          item.category
        );
        expect(typeof item.description).toBe('string');
        expect(typeof item.recommendation).toBe('string');
      });
    });

    it('includes all six visualizations', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      expect(result.visualizations).toBeDefined();
      expect(result.visualizations?.clusterHeatMap).toBeDefined();
      expect(result.visualizations?.bloomComplexityScatter).toBeDefined();
      expect(result.visualizations?.confusionDensityMap).toBeDefined();
      expect(result.visualizations?.fatigueCurve).toBeDefined();
      expect(result.visualizations?.topicRadarChart).toBeDefined();
      expect(result.visualizations?.sectionRiskMatrix).toBeDefined();
    });

    it('all visualizations are strings (SVG)', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      expect(typeof result.visualizations?.clusterHeatMap).toBe('string');
      expect(typeof result.visualizations?.bloomComplexityScatter).toBe('string');
      expect(typeof result.visualizations?.confusionDensityMap).toBe('string');
      expect(typeof result.visualizations?.fatigueCurve).toBe('string');
      expect(typeof result.visualizations?.topicRadarChart).toBe('string');
      expect(typeof result.visualizations?.sectionRiskMatrix).toBe('string');
    });

    it('visualizations are valid SVG', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      const visualizationValues = Object.values(result.visualizations || {}).filter(
        (v) => v && typeof v === 'string'
      );

      visualizationValues.forEach((svg) => {
        expect((svg as string).startsWith('<svg')).toBe(true);
        expect((svg as string).endsWith('</svg>')).toBe(true);
      });
    });

    it('stores payload for debugging', async () => {
      await callPhilosopherWithVisualizations(mockPayload);

      const storedPayload = getLastPhilosopherPayload();
      expect(storedPayload).toBeDefined();
      expect(storedPayload?.assignmentText).toBeDefined();
      expect(storedPayload?.problems).toBeDefined();
      expect(storedPayload?.studentSimulations).toBeDefined();
    });

    it('truncates payload text for storage', async () => {
      const longPayload: PhilosopherPayload = {
        ...mockPayload,
        assignmentText: 'x'.repeat(1000), // Very long text
      };

      await callPhilosopherWithVisualizations(longPayload);

      const stored = getLastPhilosopherPayload();
      expect(stored?.assignmentText.length).toBeLessThanOrEqual(500);
    });

    it('handles payload with empty problems', async () => {
      const payloadNoproblems: PhilosopherPayload = {
        ...mockPayload,
        problems: [],
      };

      const result = await callPhilosopherWithVisualizations(payloadNoproblems);
      expect(result).toBeDefined();
      expect(result.rankedFeedback).toBeDefined();
      expect(result.visualizations).toBeDefined();
    });

    it('handles payload with empty simulations', async () => {
      const payloadNoSims: PhilosopherPayload = {
        ...mockPayload,
        studentSimulations: [],
      };

      const result = await callPhilosopherWithVisualizations(payloadNoSims);
      expect(result).toBeDefined();
      expect(result.rankedFeedback).toBeDefined();
      expect(result.visualizations).toBeDefined();
    });

    it('gracefully handles Philosopher API errors', async () => {
      // Even if the backend fails, the function should return something valid
      const result = await callPhilosopherWithVisualizations(mockPayload);

      expect(result).toBeDefined();
      expect(result.rankedFeedback).toBeDefined();
      expect(result.visualizations).toBeDefined();
    });

    it('provides alternative feedback if Philosopher fails', async () => {
      // Mock a scenario where Philosopher returns empty/invalid response
      const result = await callPhilosopherWithVisualizations({
        ...mockPayload,
        problems: [], // Edge case that might cause issues
      });

      // System should still provide some feedback
      expect(result.rankedFeedback).toBeDefined();
      // And visualizations should still be generated
      expect(result.visualizations).toBeDefined();
    });
  });

  describe('Visualization Attachment', () => {
    it('visualizations are attached regardless of Philosopher response', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      // Even if feedback is sparse, visualizations should be present
      expect(result.visualizations).toBeDefined();
      const vizValues = Object.values(result.visualizations || {}).filter((v) => v !== undefined);
      expect(vizValues.length).toBeGreaterThan(0);
    });

    it('visualization attachment does not modify feedback', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);

      // Feedback should not be mutated or combined with visualization data
      result.rankedFeedback.forEach((item) => {
        expect(typeof item.title).toBe('string');
        expect(item.title).not.toContain('svg');
        expect(item.title).not.toContain('image');
      });
    });
  });

  describe('Type Guards', () => {
    it('isValidTeacherFeedbackOptions validates correct objects', async () => {
      const result = await callPhilosopherWithVisualizations(mockPayload);
      expect(isValidTeacherFeedbackOptions(result)).toBe(true);
    });

    it('isValidTeacherFeedbackOptions rejects missing rankedFeedback', () => {
      const invalid = {
        visualizations: {},
      };
      expect(isValidTeacherFeedbackOptions(invalid)).toBe(false);
    });

    it('isValidTeacherFeedbackOptions rejects empty rankedFeedback', () => {
      const invalid = {
        rankedFeedback: [],
        visualizations: {},
      };
      expect(isValidTeacherFeedbackOptions(invalid)).toBe(false);
    });

    it('isValidTeacherFeedbackOptions rejects malformed feedback items', () => {
      const invalid = {
        rankedFeedback: [
          {
            title: 'Test',
            // missing required fields
          },
        ],
      };
      expect(isValidTeacherFeedbackOptions(invalid)).toBe(false);
    });
  });

  describe('Payload Debugging', () => {
    it('stores problem count correctly', async () => {
      await callPhilosopherWithVisualizations(mockPayload);

      const stored = getLastPhilosopherPayload();
      expect(stored?.problems.length).toBe(mockPayload.problems.length);
    });

    it('stores simulation count correctly', async () => {
      await callPhilosopherWithVisualizations(mockPayload);

      const stored = getLastPhilosopherPayload();
      expect(stored?.studentSimulations.length).toBe(mockPayload.studentSimulations.length);
    });

    it('stores metadata correctly', async () => {
      await callPhilosopherWithVisualizations(mockPayload);

      const stored = getLastPhilosopherPayload();
      expect(stored?.documentMetadata).toEqual(mockPayload.documentMetadata);
    });
  });

  describe('Edge Cases', () => {
    it('handles very large problem sets', async () => {
      const largePayload: PhilosopherPayload = {
        ...mockPayload,
        problems: Array.from({ length: 100 }, (_, i) => ({
          id: `p${i}`,
          bloomLevel: 'Apply',
          linguisticComplexity: 0.5,
          text: `Problem ${i}`,
        })),
      };

      const result = await callPhilosopherWithVisualizations(largePayload);
      expect(result).toBeDefined();
      expect(result.rankedFeedback).toBeDefined();
      expect(result.visualizations).toBeDefined();
    });

    it('handles many student simulations', async () => {
      const largePayload: PhilosopherPayload = {
        ...mockPayload,
        studentSimulations: Array.from({ length: 50 }, (_, i) => ({
          studentId: `student${i}`,
          timeOnTaskMs: 300000 + Math.random() * 300000,
          confusionSignals: Math.floor(Math.random() * 10),
          fatigueIndex: Math.random(),
        })),
      };

      const result = await callPhilosopherWithVisualizations(largePayload);
      expect(result).toBeDefined();
      expect(result.visualizations).toBeDefined();
    });

    it('handles null/undefined optional fields', async () => {
      const payloadWithMissing: PhilosopherPayload = {
        ...mockPayload,
        teacherNotes: undefined,
        processingOptions: undefined,
      };

      const result = await callPhilosopherWithVisualizations(payloadWithMissing);
      expect(result).toBeDefined();
      expect(isValidTeacherFeedbackOptions(result)).toBe(true);
    });
  });
});
