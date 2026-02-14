/**
 * assessmentSummarizerService.test.ts
 * Unit tests for Phase 2 Assessment Summarizer Service
 *
 * Tests cover:
 * - Bloom distribution generation with emphasis modifiers
 * - Grade band and class level mapping validation
 * - Space Camp payload construction
 * - Natural language summary generation
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  estimateBloomDistribution,
  validateBloomDistribution,
  deriveSpaceCampMetadata,
  buildNaturalLanguageSummary,
  summarizeAssessmentIntent,
  getAssessmentMetadata,
  mapStudentLevelToGradeBand,
  mapStudentLevelToClassLevel,
} from '../assessmentSummarizerService';
import { AssessmentIntent } from '../../types/assessmentIntent';

describe('assessmentSummarizerService', () => {
  // =========================================================================
  // TEST SUITE 1: Bloom Distribution Estimation
  // =========================================================================

  describe('estimateBloomDistribution', () => {
    it('should return a valid Bloom distribution for Standard level', () => {
      const dist = estimateBloomDistribution('Standard', 'Test', 'Balanced');

      expect(dist).toHaveProperty('Remember');
      expect(dist).toHaveProperty('Understand');
      expect(dist).toHaveProperty('Apply');
      expect(dist).toHaveProperty('Analyze');
      expect(dist).toHaveProperty('Evaluate');
      expect(dist).toHaveProperty('Create');

      const sum = Object.values(dist).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should apply Conceptual emphasis modifiers', () => {
      const balanced = estimateBloomDistribution('Standard', 'Test', 'Balanced');
      const conceptual = estimateBloomDistribution('Standard', 'Test', 'Conceptual');

      // Conceptual should increase Understand and Analyze
      expect(conceptual.Understand).toBeGreaterThan(balanced.Understand);
      expect(conceptual.Analyze).toBeGreaterThan(balanced.Analyze);

      // Should decrease Apply and Remember
      expect(conceptual.Apply).toBeLessThan(balanced.Apply);
      expect(conceptual.Remember).toBeLessThan(balanced.Remember);
    });

    it('should apply Procedural emphasis modifiers', () => {
      const balanced = estimateBloomDistribution('Standard', 'Test', 'Balanced');
      const procedural = estimateBloomDistribution('Standard', 'Test', 'Procedural');

      // Procedural should increase Apply
      expect(procedural.Apply).toBeGreaterThan(balanced.Apply);
    });

    it('should enforce ExamStyle rules for Honors', () => {
      const examStyle = estimateBloomDistribution('Honors', 'Test', 'ExamStyle');

      // Min 20% Analyze + Evaluate
      const analyzeEvaluate = examStyle.Analyze + examStyle.Evaluate;
      expect(analyzeEvaluate).toBeGreaterThanOrEqual(0.18); // Allow 2% tolerance

      // Min 5% Create for Honors
      expect(examStyle.Create).toBeGreaterThanOrEqual(0.03); // Allow 2% tolerance

      // Sum should still be ~1.0
      const sum = Object.values(examStyle).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should enforce ExamStyle rules for AP', () => {
      const examStyle = estimateBloomDistribution('AP', 'Test', 'ExamStyle');

      // Min 20% Analyze + Evaluate
      const analyzeEvaluate = examStyle.Analyze + examStyle.Evaluate;
      expect(analyzeEvaluate).toBeGreaterThanOrEqual(0.18);

      // No hard min for Remember (should be low naturally)
      expect(examStyle.Remember).toBeLessThan(0.15);

      // Min 5% Create for AP
      expect(examStyle.Create).toBeGreaterThanOrEqual(0.03);
    });

    it('should not allow negative values', () => {
      const dist = estimateBloomDistribution('Remedial', 'Quiz', 'Conceptual');

      Object.values(dist).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle all student levels', () => {
      const levels = ['Remedial', 'Standard', 'Honors', 'AP'] as const;

      levels.forEach(level => {
        const dist = estimateBloomDistribution(level, 'Test');
        const sum = Object.values(dist).reduce((a, b) => a + b, 0);

        expect(sum).toBeCloseTo(1.0, 2);
      });
    });

    it('should handle all assessment types', () => {
      const types = ['Quiz', 'Test', 'Practice'] as const;

      types.forEach(type => {
        const dist = estimateBloomDistribution('Standard', type);
        const sum = Object.values(dist).reduce((a, b) => a + b, 0);

        expect(sum).toBeCloseTo(1.0, 2);
      });
    });

    it('should handle all emphasis types', () => {
      const emphases = ['Balanced', 'Procedural', 'Conceptual', 'Application', 'ExamStyle'] as const;

      emphases.forEach(emphasis => {
        const dist = estimateBloomDistribution('Standard', 'Test', emphasis);
        const sum = Object.values(dist).reduce((a, b) => a + b, 0);

        expect(sum).toBeCloseTo(1.0, 2);
      });
    });

    it('Remedial should not have Create', () => {
      const dist = estimateBloomDistribution('Remedial', 'Test');
      expect(dist.Create).toBe(0);
    });

    it('AP should emphasize higher order thinking', () => {
      const apDist = estimateBloomDistribution('AP', 'Test');
      const standardDist = estimateBloomDistribution('Standard', 'Test');

      // AP should have more Analyze, Evaluate, Create
      expect(apDist.Analyze + apDist.Evaluate + apDist.Create).toBeGreaterThan(
        standardDist.Analyze + standardDist.Evaluate + standardDist.Create
      );
    });
  });

  // =========================================================================
  // TEST SUITE 2: Bloom Distribution Validation
  // =========================================================================

  describe('validateBloomDistribution', () => {
    it('should validate correct distribution', () => {
      const dist = estimateBloomDistribution('Standard', 'Test');
      const result = validateBloomDistribution(dist, 0.02);

      expect(result.valid).toBe(true);
      expect(result.sum).toBeCloseTo(1.0, 2);
    });

    it('should reject distribution with sum > 1.02', () => {
      const invalidDist = {
        Remember: 0.3,
        Understand: 0.3,
        Apply: 0.3,
        Analyze: 0.3,
        Evaluate: 0.1,
        Create: 0.1,
      };

      const result = validateBloomDistribution(invalidDist, 0.02);
      expect(result.valid).toBe(false);
    });

    it('should use configurable tolerance', () => {
      const dist = {
        Remember: 0.2,
        Understand: 0.2,
        Apply: 0.2,
        Analyze: 0.2,
        Evaluate: 0.15,
        Create: 0.05,
      }; // sum = 1.0

      const result1 = validateBloomDistribution(dist, 0.02);
      expect(result1.valid).toBe(true);

      const dist2 = {
        Remember: 0.25,
        Understand: 0.25,
        Apply: 0.25,
        Analyze: 0.2,
        Evaluate: 0.03,
        Create: 0.02,
      }; // sum = 1.0

      const result2 = validateBloomDistribution(dist2, 0.02);
      expect(result2.valid).toBe(true);
    });
  });

  // =========================================================================
  // TEST SUITE 3: Grade Band Mapping
  // =========================================================================

  describe('mapStudentLevelToGradeBand', () => {
    it('should map Remedial to 3-5', () => {
      expect(mapStudentLevelToGradeBand('Remedial')).toBe('3-5');
    });

    it('should map Standard to 6-8', () => {
      expect(mapStudentLevelToGradeBand('Standard')).toBe('6-8');
    });

    it('should map Honors to 9-12', () => {
      expect(mapStudentLevelToGradeBand('Honors')).toBe('9-12');
    });

    it('should map AP to 9-12', () => {
      expect(mapStudentLevelToGradeBand('AP')).toBe('9-12');
    });
  });

  describe('mapStudentLevelToClassLevel', () => {
    it('should map Remedial to standard', () => {
      expect(mapStudentLevelToClassLevel('Remedial')).toBe('standard');
    });

    it('should map Standard to standard', () => {
      expect(mapStudentLevelToClassLevel('Standard')).toBe('standard');
    });

    it('should map Honors to honors', () => {
      expect(mapStudentLevelToClassLevel('Honors')).toBe('honors');
    });

    it('should map AP to AP', () => {
      expect(mapStudentLevelToClassLevel('AP')).toBe('AP');
    });
  });

  // =========================================================================
  // TEST SUITE 4: Space Camp Metadata Derivation
  // =========================================================================

  describe('deriveSpaceCampMetadata', () => {
    it('should return required payload fields', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Test Topic',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      const payload = deriveSpaceCampMetadata(intent);

      expect(payload).toHaveProperty('documentMetadata');
      expect(payload).toHaveProperty('estimatedBloomTargets');
      expect(payload).toHaveProperty('complexityRange');
      expect(payload).toHaveProperty('estimatedQuestionCount');

      expect(payload.documentMetadata).toHaveProperty('gradeBand');
      expect(payload.documentMetadata).toHaveProperty('classLevel');
      expect(payload.documentMetadata).toHaveProperty('subject');
      expect(payload.documentMetadata).toHaveProperty('timeTargetMinutes');
    });

    it('should set correct grade band in payload', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'AP',
        assessmentType: 'Test',
        timeMinutes: 60,
      };

      const payload = deriveSpaceCampMetadata(intent);
      expect(payload.documentMetadata.gradeBand).toBe('9-12');
    });

    it('should validate Bloom targets sum', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'Standard',
        assessmentType: 'Test',
        timeMinutes: 45,
      };

      const payload = deriveSpaceCampMetadata(intent);
      const sum = Object.values(payload.estimatedBloomTargets).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should include complexity range', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'Honors',
        assessmentType: 'Test',
        timeMinutes: 50,
      };

      const payload = deriveSpaceCampMetadata(intent);

      expect(payload.complexityRange).toHaveLength(2);
      expect(payload.complexityRange[0]).toBeLessThan(payload.complexityRange[1]);
      expect(payload.complexityRange[0]).toBeGreaterThanOrEqual(0);
      expect(payload.complexityRange[1]).toBeLessThanOrEqual(1);
    });

    it('should include optional fatigueImpactMultiplier when applicable', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'AP',
        assessmentType: 'Test',
        timeMinutes: 90,
      };

      const payload = deriveSpaceCampMetadata(intent);

      if (intent.timeMinutes > 60) {
        expect(payload.fatigueImpactMultiplier).toBeDefined();
        expect(payload.fatigueImpactMultiplier).toBeGreaterThan(0);
      }
    });

    it('should include scaffolding suggestion if context provided', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'Remedial',
        assessmentType: 'Practice',
        timeMinutes: 20,
        classroomContext: 'Students need visual aids',
      };

      const payload = deriveSpaceCampMetadata(intent);

      expect(payload.scaffoldingNeeded).toBeDefined();
    });

    it('should estimate question count correctly', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      const payload = deriveSpaceCampMetadata(intent);

      // Quiz: 5 min per question, so 30 min ≈ 6 questions
      expect(payload.estimatedQuestionCount).toBeGreaterThan(4);
      expect(payload.estimatedQuestionCount).toBeLessThan(8);
    });
  });

  // =========================================================================
  // TEST SUITE 5: Natural Language Summary
  // =========================================================================

  describe('buildNaturalLanguageSummary', () => {
    it('should generate summary from topic', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Chapter 5 Review',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      const summary = buildNaturalLanguageSummary(intent);

      expect(summary).toContain('Standard');
      expect(summary).toContain('Quiz');
      expect(summary).toContain('30');
      expect(summary).toContain('Chapter 5');
    });

    it('should be teacher-friendly (no technical jargon)', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'AP',
        assessmentType: 'Test',
        timeMinutes: 90,
      };

      const summary = buildNaturalLanguageSummary(intent);

      // Should not contain technical terms
      expect(summary).not.toContain('Bloom');
      expect(summary).not.toContain('complexity');
      expect(summary).not.toContain('fatigue');
      expect(summary).not.toContain('%');
    });

    it('should include focus areas if provided', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Biology',
        studentLevel: 'Honors',
        assessmentType: 'Test',
        timeMinutes: 60,
        focusAreas: ['Photosynthesis', 'Respiration'],
      };

      const summary = buildNaturalLanguageSummary(intent);

      expect(summary).toContain('Photosynthesis');
      expect(summary).toContain('Respiration');
    });

    it('should handle missing focus areas gracefully', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Math',
        studentLevel: 'Standard',
        assessmentType: 'Practice',
        timeMinutes: 20,
      };

      const summary = buildNaturalLanguageSummary(intent);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // TEST SUITE 6: Main Summarization Orchestrator
  // =========================================================================

  describe('summarizeAssessmentIntent', () => {
    it('should return complete SummarizedAssessmentIntent', async () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Test',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      const result = await summarizeAssessmentIntent(intent);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('spaceCampPayload');
      expect(result).toHaveProperty('derivedMetadata');
    });

    it('should validate XOR source constraint', async () => {
      const invalidIntent: AssessmentIntent = {
        sourceFile: new File(['test'], 'test.pdf'),
        sourceTopic: 'Also topic',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      await expect(summarizeAssessmentIntent(invalidIntent)).rejects.toThrow(
        'Exactly one of sourceFile or sourceTopic must be provided'
      );
    });

    it('should reject intents with neither file nor topic', async () => {
      const invalidIntent: AssessmentIntent = {
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      await expect(summarizeAssessmentIntent(invalidIntent)).rejects.toThrow(
        'Exactly one of sourceFile or sourceTopic must be provided'
      );
    });

    it('should generate valid AI Writer prompt', async () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Statistics',
        studentLevel: 'Honors',
        assessmentType: 'Test',
        timeMinutes: 60,
        emphasis: 'Conceptual',
      };

      const result = await summarizeAssessmentIntent(intent);

      expect(result.prompt).toBeDefined();
      expect(result.prompt.length).toBeGreaterThan(100); // Should be substantial

      // Should contain key sections
      expect(result.prompt).toContain('Teacher Intent');
      expect(result.prompt).toContain('Bloom');
      expect(result.prompt).toContain('question');
    });

    it('should include derived metadata in result', async () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Chemistry',
        studentLevel: 'AP',
        assessmentType: 'Test',
        timeMinutes: 90,
      };

      const result = await summarizeAssessmentIntent(intent);
      const metadata = result.derivedMetadata;

      expect(metadata.gradeBand).toBe('9-12');
      expect(metadata.classLevel).toBe('AP');
      expect(metadata.estimatedBloomDistribution).toBeDefined();
      expect(metadata.estimatedComplexityRange).toBeDefined();
    });
  });

  // =========================================================================
  // TEST SUITE 7: Metadata Retrieval Utility
  // =========================================================================

  describe('getAssessmentMetadata', () => {
    it('should return all metadata fields', () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Topic',
        studentLevel: 'Standard',
        assessmentType: 'Test',
        timeMinutes: 45,
      };

      const metadata = getAssessmentMetadata(intent);

      expect(metadata).toHaveProperty('gradeBand');
      expect(metadata).toHaveProperty('classLevel');
      expect(metadata).toHaveProperty('subject');
      expect(metadata).toHaveProperty('estimatedBloomDistribution');
      expect(metadata).toHaveProperty('estimatedComplexityRange');
      expect(metadata).toHaveProperty('estimatedTotalTimeMinutes');
      expect(metadata).toHaveProperty('estimatedQuestionCount');
    });

    it('should map levels correctly', () => {
      const remedialMetadata = getAssessmentMetadata({
        sourceTopic: 'Topic',
        studentLevel: 'Remedial',
        assessmentType: 'Practice',
        timeMinutes: 20,
      });

      expect(remedialMetadata.gradeBand).toBe('3-5');
      expect(remedialMetadata.classLevel).toBe('standard');

      const apMetadata = getAssessmentMetadata({
        sourceTopic: 'Topic',
        studentLevel: 'AP',
        assessmentType: 'Test',
        timeMinutes: 90,
      });

      expect(apMetadata.gradeBand).toBe('9-12');
      expect(apMetadata.classLevel).toBe('AP');
    });
  });

  // =========================================================================
  // TEST SUITE 8: Integration Tests
  // =========================================================================

  describe('Integration: Full Pipeline', () => {
    it('should handle complete workflow from intent to payload', async () => {
      const intent: AssessmentIntent = {
        sourceFile: new File(['Assessment content...'], 'assessment.pdf'),
        studentLevel: 'Honors',
        assessmentType: 'Test',
        timeMinutes: 75,
        emphasis: 'Application',
        focusAreas: ['Problem Solving', 'Critical Thinking'],
        classroomContext: 'Mixed ability classroom',
      };

      const summarized = await summarizeAssessmentIntent(intent);

      // Verify all components are present
      expect(summarized.summary).toBeDefined();
      expect(summarized.prompt).toBeDefined();
      expect(summarized.spaceCampPayload).toBeDefined();
      expect(summarized.derivedMetadata).toBeDefined();

      // Verify payload structure
      const payload = summarized.spaceCampPayload;
      expect(payload.documentMetadata.gradeBand).toBe('9-12');
      expect(payload.documentMetadata.classLevel).toBe('honors');

      // Verify Bloom targets are valid
      const bloomSum = Object.values(payload.estimatedBloomTargets).reduce((a, b) => a + b, 0);
      expect(bloomSum).toBeCloseTo(1.0, 2);

      // Verify question count is reasonable
      expect(payload.estimatedQuestionCount).toBeGreaterThan(0);
      expect(payload.estimatedQuestionCount).toBeLessThan(30);
    });

    it('should produce consistent results for same intent', async () => {
      const intent: AssessmentIntent = {
        sourceTopic: 'Consistent Test',
        studentLevel: 'Standard',
        assessmentType: 'Quiz',
        timeMinutes: 30,
      };

      const result1 = await summarizeAssessmentIntent(intent);
      const result2 = await summarizeAssessmentIntent(intent);

      // Same inputs should produce same outputs
      expect(result1.summary).toBe(result2.summary);
      expect(result1.spaceCampPayload.estimatedQuestionCount).toBe(
        result2.spaceCampPayload.estimatedQuestionCount
      );

      // Bloom distributions should be identical
      const bloom1 = result1.spaceCampPayload.estimatedBloomTargets;
      const bloom2 = result2.spaceCampPayload.estimatedBloomTargets;

      Object.keys(bloom1).forEach(key => {
        expect(bloom1[key as keyof typeof bloom1]).toEqual(bloom2[key as keyof typeof bloom2]);
      });
    });
  });
});
