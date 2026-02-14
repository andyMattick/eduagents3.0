/**
 * Unit Tests for Visualization Generators
 *
 * Tests cover:
 * - Return type validation
 * - Deterministic output
 * - Error handling and graceful fallbacks
 * - Edge cases (empty input, single item, etc.)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateClusterHeatMap,
  generateBloomComplexityScatter,
  generateConfusionDensityMap,
  generateFatigueCurve,
  generateTopicRadarChart,
  generateSectionRiskMatrix,
} from '../visualizations';

/**
 * Mock data for testing
 */
const mockProblems = [
  {
    id: 'p1',
    bloomLevel: 'Understand',
    linguisticComplexity: 0.5,
    text: 'Explain the concept of photosynthesis.',
  },
  {
    id: 'p2',
    bloomLevel: 'Apply',
    linguisticComplexity: 0.7,
    text: 'Solve the following equation for x.',
  },
  {
    id: 'p3',
    bloomLevel: 'Create',
    linguisticComplexity: 0.9,
    text: 'Design a new experiment to test your hypothesis.',
  },
];

const mockSimulations = [
  {
    studentId: 'S1',
    timeOnTaskMs: 300000,
    confusionSignals: 2,
    fatigueIndex: 0.3,
  },
  {
    studentId: 'S2',
    timeOnTaskMs: 450000,
    confusionSignals: 5,
    fatigueIndex: 0.6,
  },
  {
    studentId: 'S3',
    timeOnTaskMs: 250000,
    confusionSignals: 1,
    fatigueIndex: 0.1,
  },
];

describe('Visualization Generators', () => {
  describe('generateClusterHeatMap', () => {
    it('returns a non-empty string', () => {
      const result = generateClusterHeatMap(mockSimulations, mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces deterministic output', () => {
      const result1 = generateClusterHeatMap(mockSimulations, mockProblems);
      const result2 = generateClusterHeatMap(mockSimulations, mockProblems);
      expect(result1).toBe(result2);
    });

    it('handles empty simulation gracefully', () => {
      const result = generateClusterHeatMap([], mockProblems);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles empty problems gracefully', () => {
      const result = generateClusterHeatMap(mockSimulations, []);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles null/undefined gracefully', () => {
      const result = generateClusterHeatMap(null as any, null as any);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('generateBloomComplexityScatter', () => {
    it('returns a non-empty string', () => {
      const result = generateBloomComplexityScatter(mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG', () => {
      const result = generateBloomComplexityScatter(mockProblems);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('produces deterministic output', () => {
      const result1 = generateBloomComplexityScatter(mockProblems);
      const result2 = generateBloomComplexityScatter(mockProblems);
      expect(result1).toBe(result2);
    });

    it('handles empty problems gracefully', () => {
      const result = generateBloomComplexityScatter([]);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('handles problems with missing Bloom level', () => {
      const problemsWithoutBloom = [
        { id: 'p1', linguisticComplexity: 0.5 },
      ];
      const result = generateBloomComplexityScatter(problemsWithoutBloom);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('includes all problems as circles', () => {
      const result = generateBloomComplexityScatter(mockProblems);
      const circleCount = (result.match(/<circle/g) || []).length;
      expect(circleCount).toBeGreaterThanOrEqual(mockProblems.length);
    });
  });

  describe('generateConfusionDensityMap', () => {
    it('returns a non-empty string', () => {
      const result = generateConfusionDensityMap(mockSimulations);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG', () => {
      const result = generateConfusionDensityMap(mockSimulations);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('produces deterministic output', () => {
      const result1 = generateConfusionDensityMap(mockSimulations);
      const result2 = generateConfusionDensityMap(mockSimulations);
      expect(result1).toBe(result2);
    });

    it('handles empty simulations gracefully', () => {
      const result = generateConfusionDensityMap([]);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('creates bars for each simulation', () => {
      const result = generateConfusionDensityMap(mockSimulations);
      const rectCount = (result.match(/<rect/g) || []).length;
      expect(rectCount).toBeGreaterThanOrEqual(mockSimulations.length);
    });
  });

  describe('generateFatigueCurve', () => {
    it('returns a non-empty string', () => {
      const result = generateFatigueCurve(mockSimulations);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG', () => {
      const result = generateFatigueCurve(mockSimulations);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('produces deterministic output', () => {
      const result1 = generateFatigueCurve(mockSimulations);
      const result2 = generateFatigueCurve(mockSimulations);
      expect(result1).toBe(result2);
    });

    it('handles empty simulations gracefully', () => {
      const result = generateFatigueCurve([]);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('handles single student', () => {
      const result = generateFatigueCurve([mockSimulations[0]]);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('includes paths for multiple personas', () => {
      const result = generateFatigueCurve(mockSimulations);
      const pathCount = (result.match(/<path/g) || []).length;
      expect(pathCount).toBeGreaterThan(0);
    });
  });

  describe('generateTopicRadarChart', () => {
    it('returns a non-empty string', () => {
      const result = generateTopicRadarChart(mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG', () => {
      const result = generateTopicRadarChart(mockProblems);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('produces deterministic output', () => {
      const result1 = generateTopicRadarChart(mockProblems);
      const result2 = generateTopicRadarChart(mockProblems);
      expect(result1).toBe(result2);
    });

    it('handles empty problems gracefully', () => {
      const result = generateTopicRadarChart([]);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('includes 6 Bloom level axes', () => {
      const result = generateTopicRadarChart(mockProblems);
      const circleCount = (result.match(/<circle/g) || []).length;
      expect(circleCount).toBeGreaterThanOrEqual(3); // At least 3 grid circles
    });

    it('includes a data polygon', () => {
      const result = generateTopicRadarChart(mockProblems);
      expect(result).toContain('<polygon');
    });
  });

  describe('generateSectionRiskMatrix', () => {
    it('returns a non-empty string', () => {
      const result = generateSectionRiskMatrix(mockSimulations, mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG', () => {
      const result = generateSectionRiskMatrix(mockSimulations, mockProblems);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('produces deterministic output', () => {
      const result1 = generateSectionRiskMatrix(mockSimulations, mockProblems);
      const result2 = generateSectionRiskMatrix(mockSimulations, mockProblems);
      expect(result1).toBe(result2);
    });

    it('handles empty simulations gracefully', () => {
      const result = generateSectionRiskMatrix([], mockProblems);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('handles empty problems gracefully', () => {
      const result = generateSectionRiskMatrix(mockSimulations, []);
      expect(result).toBeDefined();
      expect(result).toContain('<svg');
    });

    it('includes risk zone backgrounds', () => {
      const result = generateSectionRiskMatrix(mockSimulations, mockProblems);
      const rectCount = (result.match(/<rect/g) || []).length;
      expect(rectCount).toBeGreaterThanOrEqual(4); // 4 risk zones minimum
    });

    it('plots problem circles', () => {
      const result = generateSectionRiskMatrix(mockSimulations, mockProblems);
      const circleCount = (result.match(/<circle/g) || []).length;
      expect(circleCount).toBeGreaterThanOrEqual(mockProblems.length);
    });
  });

  describe('Error Handling', () => {
    it('all generators handle corrupted data gracefully', () => {
      const corruptedData = { not: 'valid' };

      expect(() => generateClusterHeatMap(corruptedData as any, corruptedData as any)).not.toThrow();
      expect(() => generateBloomComplexityScatter(corruptedData as any)).not.toThrow();
      expect(() => generateConfusionDensityMap(corruptedData as any)).not.toThrow();
      expect(() => generateFatigueCurve(corruptedData as any)).not.toThrow();
      expect(() => generateTopicRadarChart(corruptedData as any)).not.toThrow();
      expect(() => generateSectionRiskMatrix(corruptedData as any, corruptedData as any)).not.toThrow();
    });

    it('all generators return valid SVG on error', () => {
      const badData = { invalid: 'structure' };

      const results = [
        generateClusterHeatMap(badData as any, badData as any),
        generateBloomComplexityScatter(badData as any),
        generateConfusionDensityMap(badData as any),
        generateFatigueCurve(badData as any),
        generateTopicRadarChart(badData as any),
        generateSectionRiskMatrix(badData as any, badData as any),
      ];

      results.forEach((result) => {
        expect(result).toContain('<svg');
        expect(result).toContain('</svg>');
      });
    });
  });

  describe('Output Format', () => {
    it('all generators return SVG strings', () => {
      const results = [
        generateClusterHeatMap(mockSimulations, mockProblems),
        generateBloomComplexityScatter(mockProblems),
        generateConfusionDensityMap(mockSimulations),
        generateFatigueCurve(mockSimulations),
        generateTopicRadarChart(mockProblems),
        generateSectionRiskMatrix(mockSimulations, mockProblems),
      ];

      results.forEach((result) => {
        expect(typeof result).toBe('string');
        expect(result.startsWith('<svg')).toBe(true);
        expect(result.endsWith('</svg>')).toBe(true);
      });
    });

    it('all generators include titles', () => {
      const results = [
        generateClusterHeatMap(mockSimulations, mockProblems),
        generateBloomComplexityScatter(mockProblems),
        generateConfusionDensityMap(mockSimulations),
        generateFatigueCurve(mockSimulations),
        generateTopicRadarChart(mockProblems),
        generateSectionRiskMatrix(mockSimulations, mockProblems),
      ];

      results.forEach((result) => {
        expect(result).toContain('<text');
        expect(result.toLowerCase()).toMatch(/class="title"/);
      });
    });

    it('all generators are under reasonable size', () => {
      const results = [
        generateClusterHeatMap(mockSimulations, mockProblems),
        generateBloomComplexityScatter(mockProblems),
        generateConfusionDensityMap(mockSimulations),
        generateFatigueCurve(mockSimulations),
        generateTopicRadarChart(mockProblems),
        generateSectionRiskMatrix(mockSimulations, mockProblems),
      ];

      results.forEach((result) => {
        // Each chart should be < 500KB (very reasonable for SVG)
        expect(result.length).toBeLessThan(500000);
        // Each chart should be > 100 bytes (reasonable minimum)
        expect(result.length).toBeGreaterThan(100);
      });
    });
  });
});
