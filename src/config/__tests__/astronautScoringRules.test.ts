/**
 * Unit Tests for getAstronautScoringRules
 * Tests the rubric generation, grade band baselines, class level multipliers, and accessibility overlays
 */

import { describe, it, expect } from 'vitest';
import { getAstronautScoringRules } from '../astronautScoringRules';

describe('getAstronautScoringRules', () => {
  const rubric = getAstronautScoringRules();

  /**
   * Test 1: Verify returned rubric has required structure
   */
  it('should return a valid AstronautRubric with all required properties', () => {
    expect(rubric).toBeDefined();
    expect(rubric).toHaveProperty('gradeBandBaselines');
    expect(rubric).toHaveProperty('classLevelMultipliers');
    expect(rubric).toHaveProperty('subjectModifiers');
    expect(rubric).toHaveProperty('overlayMultipliers');
  });

  /**
   * Test 2: Verify grade band baselines are present and have valid ranges
   */
  it('should have grade band baselines for all three levels (3-5, 6-8, 9-12)', () => {
    const { gradeBandBaselines } = rubric;
    
    expect(gradeBandBaselines).toHaveProperty('3-5');
    expect(gradeBandBaselines).toHaveProperty('6-8');
    expect(gradeBandBaselines).toHaveProperty('9-12');

    // Each grade band should have these properties as [min, max] arrays
    ['3-5', '6-8', '9-12'].forEach(band => {
      const baseline = gradeBandBaselines[band as '3-5' | '6-8' | '9-12'];
      expect(baseline).toHaveProperty('readingLevel');
      expect(baseline).toHaveProperty('mathLevel');
      expect(baseline).toHaveProperty('stamina');
      expect(baseline).toHaveProperty('reasoning');
      expect(baseline).toHaveProperty('confusionTolerance');

      // Verify each property is a [min, max] array
      expect(Array.isArray(baseline.readingLevel)).toBe(true);
      expect(baseline.readingLevel).toHaveLength(2);
      expect(baseline.readingLevel[0]).toBeLessThan(baseline.readingLevel[1]);
    });
  });

  /**
   * Test 3: Verify class level multipliers are correctly configured
   */
  it('should have class level multipliers with standard=1.0, honors=1.10, AP=1.20', () => {
    const { classLevelMultipliers } = rubric;

    expect(classLevelMultipliers).toHaveProperty('standard', 1.0);
    expect(classLevelMultipliers).toHaveProperty('honors', 1.1);
    expect(classLevelMultipliers).toHaveProperty('AP', 1.2);
  });

  /**
   * Test 4: Verify subject modifiers are present and have expected shape
   */
  it('should have subject modifiers for all supported subjects', () => {
    const { subjectModifiers } = rubric;

    // Check required subjects exist
    const subjects = ['math', 'english', 'science', 'history', 'general'] as const;
    subjects.forEach(subject => {
      expect(subjectModifiers).toHaveProperty(subject);
      const modifier = subjectModifiers[subject];
      
      // Each modifier should have numeric properties
      expect(modifier).toBeDefined();
      expect(typeof modifier.readingLevel).toBe('number');
      expect(typeof modifier.mathLevel).toBe('number');
      expect(typeof modifier.reasoning).toBe('number');
    });
  });

  /**
   * Test 5: Verify overlay multipliers exist for accessibility needs
   */
  it('should have overlay multipliers for accessibility needs', () => {
    const { overlayMultipliers } = rubric;

    // Check accessibility overlays exist
    expect(overlayMultipliers).toHaveProperty('adhd');
    expect(overlayMultipliers).toHaveProperty('dyslexia');
    expect(overlayMultipliers).toHaveProperty('fatigue_sensitive');
    expect(overlayMultipliers).toHaveProperty('esl');
    expect(overlayMultipliers).toHaveProperty('anxiety_prone');

    // Each overlay should have numeric property values between 0.5 and 1.5
    Object.values(overlayMultipliers).forEach(overlayConfig => {
      Object.values(overlayConfig).forEach(multiplier => {
        expect(typeof multiplier).toBe('number');
        expect(multiplier).toBeGreaterThan(0.5);
        expect(multiplier).toBeLessThan(1.5);
      });
    });
  });

  /**
   * Test 6: Verify grade band complexity increases appropriately
   */
  it('should show increasing complexity from elementary to high school', () => {
    const { gradeBandBaselines } = rubric;

    const elementaryReading = gradeBandBaselines['3-5'].readingLevel[0]; // min
    const middleReading = gradeBandBaselines['6-8'].readingLevel[0]; // min
    const highReading = gradeBandBaselines['9-12'].readingLevel[0]; // min

    // Reading level minimums should increase with grade
    expect(middleReading).toBeGreaterThanOrEqual(elementaryReading);
    expect(highReading).toBeGreaterThanOrEqual(middleReading);

    // High school baseline should be higher than elementary (examining max)
    expect(gradeBandBaselines['9-12'].readingLevel[1]).toBeGreaterThan(
      gradeBandBaselines['3-5'].readingLevel[1]
    );
  });
});
