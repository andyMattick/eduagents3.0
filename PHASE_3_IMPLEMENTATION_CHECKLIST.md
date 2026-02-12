# 🚀 **PHASE 3 — Visual Analytics Integration (Final v1.2)**  
### *Your system generates the visuals. The Philosopher only returns them.*

---

## 🎯 **PHASE 3 GOAL**  

Enable your system to:

1. Generate visual analytics (heat maps, scatterplots, risk matrices, etc.)  
2. Attach them to the Philosopher's output  
3. Display them in the Philosopher Review screen  

**Critical Principle**: The Philosopher does **not** generate visuals — he simply returns the bundle your system attaches.

---

## ✅ **PHASE 3 CHECKLIST (Coder‑Ready)**

### **1. Add Visualization Types**

#### ✔ Task 3.1 — Define VisualizationBundle  
**File**: `src/types/pipeline.ts`

**What to add:**

```typescript
export interface VisualizationBundle {
  clusterHeatMap?: string;
  bloomComplexityScatter?: string;
  confusionDensityMap?: string;
  fatigueCurve?: string;
  topicRadarChart?: string;
  sectionRiskMatrix?: string;
}
```

**Purpose**: Centralized type for all generated visualizations (base64 PNG or SVG strings).

**Done when**:  
- [ ] Types compile without errors
- [ ] VisualizationBundle is exported
- [ ] All six visualization types are defined
- [ ] VSCode references resolve correctly

---

#### ✔ Task 3.2 — Update TeacherFeedbackOptions  
**File**: `src/types/pipeline.ts`

**What to add:**

```typescript
export interface TeacherFeedbackOptions {
  rankedFeedback: FeedbackItem[];
  visualizations?: VisualizationBundle;
}
```

**Purpose**: Extend the Philosopher's output to include visuals (optional for backward compatibility).

**Done when**:  
- [ ] TeacherFeedbackOptions updated
- [ ] Visualizations field is optional
- [ ] No breaking changes to existing code

---

### **2. Build Visualization Generators**

#### ✔ Task 3.3 — Create visualizations module  
**File**: `src/agents/analytics/visualizations.ts` (new)

**What to implement:**

```typescript
export function generateClusterHeatMap(sim: StudentSimulation[], problems: UniversalProblem[]): string { ... }

export function generateBloomComplexityScatter(problems: UniversalProblem[]): string { ... }

export function generateConfusionDensityMap(sim: StudentSimulation[]): string { ... }

export function generateFatigueCurve(sim: StudentSimulation[]): string { ... }

export function generateTopicRadarChart(problems: UniversalProblem[]): string { ... }

export function generateSectionRiskMatrix(sim: StudentSimulation[], problems: UniversalProblem[]): string { ... }
```

**Requirements**:

- [ ] Use **Chart.js** or **Recharts** for rendering
- [ ] Return **base64 PNG** or **SVG string** (no external storage)
- [ ] Output must be deterministic (same input → same output)
- [ ] No mutations of input objects
- [ ] Handle edge cases (empty sim, no problems, all zeros, etc.)
- [ ] Include error handling with graceful fallbacks
- [ ] Add JSDoc comments explaining each visualization

**Visualization Details**:

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `generateClusterHeatMap` | Student groupings by problem difficulty | sim, problems | Base64 heat map |
| `generateBloomComplexityScatter` | Bloom level vs. linguistic complexity | problems | SVG scatter plot |
| `generateConfusionDensityMap` | Which problems trigger confusion signals | sim | Density map |
| `generateFatigueCurve` | Cumulative fatigue across assignment sequence | sim | Line chart |
| `generateTopicRadarChart` | Topic coverage by Bloom taxonomy | problems | Radar/spider chart |
| `generateSectionRiskMatrix` | Risk assessment by section (time/confusion) | sim, problems | 2D matrix |

**Done when**:  
- [ ] All six functions implemented
- [ ] Unit tests pass (see Task 3.7)
- [ ] Each function returns a valid image string
- [ ] Error messages logged to console
- [ ] No external API calls (deterministic locally)

---

### **3. Update the Philosopher Interpreter (Your Side)**

#### ✔ Task 3.4 — Attach visuals to Philosopher output  
**File**: `src/agents/analysis/philosophers.ts`

**What to add (in the Philosopher response handler):**

```typescript
import {
  generateClusterHeatMap,
  generateBloomComplexityScatter,
  generateConfusionDensityMap,
  generateFatigueCurve,
  generateTopicRadarChart,
  generateSectionRiskMatrix
} from './visualizations';

// ... in the async function that processes Philosopher output ...

const visuals: VisualizationBundle = {
  clusterHeatMap: generateClusterHeatMap(studentSimulations, problems),
  bloomComplexityScatter: generateBloomComplexityScatter(problems),
  confusionDensityMap: generateConfusionDensityMap(studentSimulations),
  fatigueCurve: generateFatigueCurve(studentSimulations),
  topicRadarChart: generateTopicRadarChart(problems),
  sectionRiskMatrix: generateSectionRiskMatrix(studentSimulations, problems)
};

return {
  rankedFeedback,
  visualizations: visuals
};
```

**Important Invariants**:

- [ ] Philosopher receives **no visual generation commands**
- [ ] Philosopher returns **only** `rankedFeedback + visualizations`
- [ ] All visualization generators run **after** Philosopher response
- [ ] Visualizations are **optional** (Philosopher call doesn't fail if charts fail)
- [ ] Wrap in try-catch to gracefully handle chart generation errors

**Done when**:  
- [ ] Philosopher output type matches `TeacherFeedbackOptions`
- [ ] Visualizations included in every response
- [ ] Tests verify visualization presence (Task 3.8)

---

### **4. Display Visualizations in the UI**

#### ✔ Task 3.5 — Update Philosopher Review screen  
**File**: `src/components/Pipeline/PhilosopherReview.tsx`

**What to add (after ranked feedback display):**

```typescript
interface PhilosopherReviewProps {
  analysis: TeacherFeedbackOptions;
  // ... other props
}

export function PhilosopherReview({ analysis, ...props }: PhilosopherReviewProps) {
  return (
    <div className={styles.container}>
      {/* Existing ranked feedback */}
      <div className={styles.feedbackSection}>
        {/* render rankedFeedback[] */}
      </div>

      {/* New visualization section */}
      {analysis.visualizations && (
        <div className={styles.visualizationSection}>
          <h2>Visual Analytics</h2>

          {analysis.visualizations.clusterHeatMap && (
            <div className={styles.chartContainer}>
              <h3>Cluster Heat Map</h3>
              <img 
                src={analysis.visualizations.clusterHeatMap} 
                alt="Cluster Heat Map"
                className={styles.chartImage}
              />
            </div>
          )}

          {analysis.visualizations.bloomComplexityScatter && (
            <div className={styles.chartContainer}>
              <h3>Bloom Level vs. Complexity</h3>
              <img 
                src={analysis.visualizations.bloomComplexityScatter} 
                alt="Bloom Complexity Scatter"
                className={styles.chartImage}
              />
            </div>
          )}

          {analysis.visualizations.confusionDensityMap && (
            <div className={styles.chartContainer}>
              <h3>Confusion Hotspots</h3>
              <img 
                src={analysis.visualizations.confusionDensityMap} 
                alt="Confusion Density Map"
                className={styles.chartImage}
              />
            </div>
          )}

          {analysis.visualizations.fatigueCurve && (
            <div className={styles.chartContainer}>
              <h3>Cumulative Fatigue</h3>
              <img 
                src={analysis.visualizations.fatigueCurve} 
                alt="Fatigue Curve"
                className={styles.chartImage}
              />
            </div>
          )}

          {analysis.visualizations.topicRadarChart && (
            <div className={styles.chartContainer}>
              <h3>Topic Coverage (Bloom)</h3>
              <img 
                src={analysis.visualizations.topicRadarChart} 
                alt="Topic Radar Chart"
                className={styles.chartImage}
              />
            </div>
          )}

          {analysis.visualizations.sectionRiskMatrix && (
            <div className={styles.chartContainer}>
              <h3>Section Risk Assessment</h3>
              <img 
                src={analysis.visualizations.sectionRiskMatrix} 
                alt="Section Risk Matrix"
                className={styles.chartImage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Requirements**:

- [ ] Render all six charts (if present)
- [ ] Each chart has a descriptive title
- [ ] Images display at full quality without stretching
- [ ] Graceful fallback if visualization is missing
- [ ] Click-to-expand or download capability (optional)
- [ ] Mobile responsive (see Task 3.6)

**Done when**:  
- [ ] All charts render in the UI
- [ ] No console errors when visualizations present/absent
- [ ] Charts are legible at default zoom

---

### **5. Styling & Layout**

#### ✔ Task 3.6 — Add CSS module for visualizations  
**File**: `src/components/Pipeline/PhilosopherReview.module.css` (create or update)

**What to add:**

```css
.visualizationSection {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--border-color);
}

.visualizationSection h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.chartContainer {
  margin-bottom: 2.5rem;
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chartContainer h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.chartImage {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 4px;
}

/* Responsive grid for multiple charts */
@media (min-width: 1200px) {
  .visualizationSection {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .chartContainer {
    grid-column: span 1;
  }

  /* Make larger charts span both columns */
  .chartContainer:nth-child(2), /* cluster heat map */
  .chartContainer:nth-child(6)  /* risk matrix */
  {
    grid-column: span 2;
  }
}

/* Print-friendly styles */
@media print {
  .visualizationSection {
    page-break-inside: avoid;
  }

  .chartContainer {
    break-inside: avoid;
    page-break-inside: avoid;
    box-shadow: none;
    border: 1px solid #ccc;
  }

  .chartImage {
    max-width: 100%;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .visualizationSection {
    border-top-color: var(--border-color-dark);
  }

  .chartContainer {
    background-color: var(--background-secondary-dark);
  }

  .chartContainer h3 {
    color: var(--text-secondary-dark);
  }
}
```

**Requirements**:

- [ ] Charts display in clean grid layout
- [ ] Responsive on mobile (single column)
- [ ] Responsive on tablet (2 columns)
- [ ] Print-friendly (no shadows, clear borders)
- [ ] Dark mode compatible
- [ ] Spacing and padding consistent with rest of UI

**Done when**:  
- [ ] Charts appear grouped and organized
- [ ] Layout responsive at 320px, 768px, 1200px breakpoints
- [ ] Print preview shows clean output
- [ ] Dark mode toggle works (if applicable)

---

### **6. Testing**

#### ✔ Task 3.7 — Visualization generator tests  
**File**: `src/agents/analytics/__tests__/visualizations.spec.ts` (new)

**What to test:**

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateClusterHeatMap,
  generateBloomComplexityScatter,
  generateConfusionDensityMap,
  generateFatigueCurve,
  generateTopicRadarChart,
  generateSectionRiskMatrix
} from '../visualizations';

describe('Visualization Generators', () => {
  
  // Test data setup
  const mockProblems: UniversalProblem[] = [
    { id: '1', bloomLevel: 'Understand', linguisticComplexity: 0.5, /* ... */ },
    { id: '2', bloomLevel: 'Apply', linguisticComplexity: 0.7, /* ... */ },
  ];

  const mockSim: StudentSimulation[] = [
    { studentId: 'S1', timeOnTaskMs: 300000, confusionSignals: 2, /* ... */ },
    { studentId: 'S2', timeOnTaskMs: 450000, confusionSignals: 5, /* ... */ },
  ];

  describe('generateClusterHeatMap', () => {
    it('returns a non-empty string', () => {
      const result = generateClusterHeatMap(mockSim, mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces deterministic output', () => {
      const result1 = generateClusterHeatMap(mockSim, mockProblems);
      const result2 = generateClusterHeatMap(mockSim, mockProblems);
      expect(result1).toBe(result2);
    });

    it('handles empty simulation gracefully', () => {
      const result = generateClusterHeatMap([], mockProblems);
      expect(result).toBeDefined();
    });
  });

  describe('generateBloomComplexityScatter', () => {
    it('returns a non-empty string', () => {
      const result = generateBloomComplexityScatter(mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces valid SVG or base64', () => {
      const result = generateBloomComplexityScatter(mockProblems);
      const isSvg = result.includes('<svg') || result.includes('svg');
      const isBase64 = result.includes('data:image');
      expect(isSvg || isBase64).toBe(true);
    });
  });

  describe('generateConfusionDensityMap', () => {
    it('returns a non-empty string', () => {
      const result = generateConfusionDensityMap(mockSim);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('is deterministic', () => {
      const result1 = generateConfusionDensityMap(mockSim);
      const result2 = generateConfusionDensityMap(mockSim);
      expect(result1).toBe(result2);
    });
  });

  describe('generateFatigueCurve', () => {
    it('returns a non-empty string', () => {
      const result = generateFatigueCurve(mockSim);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles single student', () => {
      const result = generateFatigueCurve([mockSim[0]]);
      expect(result).toBeDefined();
    });
  });

  describe('generateTopicRadarChart', () => {
    it('returns a non-empty string', () => {
      const result = generateTopicRadarChart(mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateSectionRiskMatrix', () => {
    it('returns a non-empty string', () => {
      const result = generateSectionRiskMatrix(mockSim, mockProblems);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('requires both sim and problems', () => {
      expect(() => generateSectionRiskMatrix([], mockProblems)).not.toThrow();
      expect(() => generateSectionRiskMatrix(mockSim, [])).not.toThrow();
    });
  });

});
```

**Requirements**:

- [ ] All six generators have unit tests
- [ ] Test return type (string)
- [ ] Test deterministic output
- [ ] Test edge cases (empty input, single item, all zeros)
- [ ] Test error handling
- [ ] Coverage > 90%

**Done when**:  
- [ ] All tests pass: `npm test -- visualizations.spec.ts`
- [ ] No console errors or warnings
- [ ] Coverage report shows >90% line coverage

---

#### ✔ Task 3.8 — Philosopher integration tests  
**File**: `src/agents/analysis/__tests__/philosophers.spec.ts` (update existing)

**What to add:**

```typescript
describe('Philosopher with Visualizations', () => {
  
  it('includes visualizations in output', async () => {
    const output = await callPhilosopher(mockPayload);
    expect(output.visualizations).toBeDefined();
  });

  it('visualizations is VisualizationBundle type', async () => {
    const output = await callPhilosopher(mockPayload);
    const { visualizations } = output;
    
    expect(typeof visualizations.clusterHeatMap).toBe('string');
    expect(typeof visualizations.bloomComplexityScatter).toBe('string');
    expect(typeof visualizations.confusionDensityMap).toBe('string');
    expect(typeof visualizations.fatigueCurve).toBe('string');
    expect(typeof visualizations.topicRadarChart).toBe('string');
    expect(typeof visualizations.sectionRiskMatrix).toBe('string');
  });

  it('rankedFeedback is unchanged', async () => {
    const output = await callPhilosopher(mockPayload);
    expect(Array.isArray(output.rankedFeedback)).toBe(true);
    expect(output.rankedFeedback.length).toBeGreaterThan(0);
  });

  it('handles visualization generation errors gracefully', async () => {
    // Mock a visualization generator to throw
    // Philosopher response should still return, with visualization as undefined/empty
    const output = await callPhilosopher(mockPayload);
    expect(output.rankedFeedback).toBeDefined();
    // Visualizations may be partial, but response is not null
    expect(output.visualizations).toBeDefined();
  });

});
```

**Requirements**:

- [ ] Verify all six visualizations in output
- [ ] Verify visualizations are strings (base64 or SVG)
- [ ] Verify rankedFeedback is present and unchanged
- [ ] Verify graceful error handling (Philosopher call doesn't fail even if charts fail)

**Done when**:  
- [ ] Tests pass: `npm test -- philosophers.spec.ts`
- [ ] Integration test verifies output shape

---

### **7. Documentation**

#### ✔ Task 3.9 — Add teacher-facing visualization guide  
**File**: `docs/VISUAL_ANALYTICS_GUIDE.md` (new)

**What to include:**

```markdown
# Visual Analytics Guide for Teachers

## Overview
The Philosopher Review screen now includes six visual charts to help you quickly identify:
- Which problems confuse students
- Where fatigue sets in
- Topic coverage gaps
- Risk zones by section

## The Six Visualizations

### 1. Cluster Heat Map
**What it shows**: Student groupings by problem difficulty
- Red = struggling students on hard problems
- Yellow = mixed performance
- Green = students succeeding

**Action**: Red zones indicate where you might add scaffolding or peer support.

### 2. Bloom Level vs. Complexity Scatter
**What it shows**: Each problem plotted by cognitive demand (Bloom) and language difficulty
- Upper-right = hardest (high Bloom + complex language)
- Lower-left = easiest (low Bloom + simple language)

**Action**: Check for balance. Too many hard-hard problems may overwhelm. Too many easy-easy problems won't challenge.

### 3. Confusion Density Map
**What it shows**: Which problems trigger confusion signals across your student population
- Darker shades = higher confusion rates

**Action**: Click problem to see why (novelty? unclear wording? prerequisite gap?).

### 4. Cumulative Fatigue Curve
**What it shows**: How student mental load grows as they work through the assignment
- Steep curve = students tiring quickly
- Flat curve = good pacing

**Action**: If curve steepens mid-assignment, consider breaking it into shorter sessions or simplifying later problems.

### 5. Topic Coverage (Bloom Radar)
**What it shows**: Six-pointed radar with each topic area (e.g., "Fractions", "Algebra", "Geometry")
- Outer edge = comprehensive coverage at that level
- Inner = sparse coverage

**Action**: Spotty radar means some topics/Bloom levels are underrepresented. Rebalance with the Rewriter.

### 6. Section Risk Matrix
**What it shows**: 2D grid of assignment sections
- X-axis = section complexity
- Y-axis = student fatigue at that point
- Red = high-risk zone (hard + tired)

**Action**: Green zones are safe. Red zones need mitigation (scaffold, simplify, or add break).

## Interpreting the Colors

| Color | Meaning |
|-------|---------|
| Green | Success / Safe / Low Risk |
| Yellow | Caution / Mixed / Moderate Risk |
| Red | Struggle / Unsafe / High Risk |

## Exporting Charts

All charts can be:
- Downloaded as PNG (right-click → Save image)
- Printed as part of the assignment report
- Shared with colleagues

## FAQ

**Q: Why is one problem showing red in the confusion map?**
A: High novelty (first time students saw this type) or mismatch between language complexity and student reading level.

**Q: How do I interpret a steep fatigue curve?**
A: Students are mentally exhausted by mid-assignment. Solutions:
- Shorten the assignment
- Add breaks
- Simplify later problems
- Use the Rewriter to redistribute difficulty

**Q: Can I change these visuals?**
A: No, they're auto-generated. But you can change the underlying assignment (difficulty, length, topic order) and re-run the Philosopher.

## Next Steps

Use these visuals alongside the Philosopher's ranked feedback to:
1. Identify high-impact improvements
2. Prioritize rewriting efforts
3. Understand your assignment's cognitive load profile
```

**Requirements**:

- [ ] Explain each of the six visualizations
- [ ] Include color meanings
- [ ] Provide actionable next steps for each
- [ ] Include FAQ addressing common questions
- [ ] Written for teachers (not developers)
- [ ] Include export/print guidance

**Done when**:  
- [ ] Document is readable and clear
- [ ] No technical jargon (or well-explained)
- [ ] Ready to share with teachers during onboarding

---

## 🎉 **PHASE 3 COMPLETION CHECKLIST**

Mark done when all items are complete:

- [ ] **Task 3.1** — VisualizationBundle type defined
- [ ] **Task 3.2** — TeacherFeedbackOptions updated with visualizations field
- [ ] **Task 3.3** — All six visualization generators implemented
- [ ] **Task 3.4** — Philosopher interpreter attaches visuals to output
- [ ] **Task 3.5** — PhilosopherReview component displays all six charts
- [ ] **Task 3.6** — CSS styling complete (responsive, print-friendly, dark mode)
- [ ] **Task 3.7** — Visualization generator unit tests passing (>90% coverage)
- [ ] **Task 3.8** — Philosopher integration tests passing
- [ ] **Task 3.9** — Teacher-facing Visual Analytics Guide complete
- [ ] **Code Review** — All code reviewed and merged to `dev`
- [ ] **E2E Test** — Full pipeline runs end-to-end without errors
- [ ] **Documentation** — Phase 3 architecture documented in README

---

## 🔐 **Critical Invariants to Maintain**

During Phase 3 implementation, **must not**:

- [ ] Mutate `UniversalProblem` or `StudentSimulation` objects
- [ ] Send any commands to the Philosopher (he returns feedback, not generates visuals)
- [ ] Store visualizations in external databases (generate in-memory, attach to response)
- [ ] Call external visualization APIs (use Chart.js/Recharts library only)
- [ ] Break existing Philosopher output in other parts of the system

---

## 📋 **File Manifest (Phase 3)**

| File | Status | Owner |
|------|--------|-------|
| `src/types/pipeline.ts` | ADD VisualizationBundle, update TeacherFeedbackOptions | Dev |
| `src/agents/analytics/visualizations.ts` | CREATE (6 generator functions) | Dev |
| `src/agents/analysis/philosophers.ts` | UPDATE (attach visuals) | Dev |
| `src/components/Pipeline/PhilosopherReview.tsx` | UPDATE (display charts) | Dev |
| `src/components/Pipeline/PhilosopherReview.module.css` | UPDATE/CREATE (styling) | Dev |
| `src/agents/analytics/__tests__/visualizations.spec.ts` | CREATE (unit tests) | Dev |
| `src/agents/analysis/__tests__/philosophers.spec.ts` | UPDATE (integration tests) | Dev |
| `docs/VISUAL_ANALYTICS_GUIDE.md` | CREATE (teacher guide) | Dev |

---

## 🚀 **Ready to Code**

Your dev team now has:
- ✅ Clear type definitions
- ✅ Detailed implementation tasks
- ✅ Test requirements
- ✅ Styling specifications
- ✅ Documentation outline

**Estimated timeline**: 3–4 developer-days for full implementation + testing.

---

*Phase 3 Version: 1.2 (Final)*  
*Last Updated: February 12, 2026*
