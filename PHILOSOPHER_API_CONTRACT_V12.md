# 🧙 PHILOSOPHER API CONTRACT V1.2
## Output-Only Specification (Input from Space Camp Observatory)

**Status:** Production  
**Last Updated:** 2026-02-12  
**Version:** 1.2  

---

## ⚠️ Important: Philosopher is a Black Box

The **Philosopher receives input from the Space Camp Observatory** (external system we don't control). We document only what the Philosopher **sends back** to the Pipeline.

```
Space Camp Observatory
    ↓
    (unknown format - external)
    ↓
🧙 PHILOSOPHER (BLACK BOX)
    ↓
    (documented below ↓)
    ↓
TeacherFeedbackOptions
  - rankedFeedback[]
  - visualizations{}
```

---

## 1️⃣ PHILOSOPHER OUTPUT

The Philosopher returns a `TeacherFeedbackOptions` object with ranked feedback and visualizations:

```typescript
interface TeacherFeedbackOptions {
  rankedFeedback: FeedbackItem[];
  visualizations: VisualizationBundle;
  metadata?: {
    generatedAt: string;
    analysisVersion: string;
  };
}

interface FeedbackItem {
  priority: 'high' | 'medium' | 'low';
  category: 'confusion' | 'engagement' | 'time' | 'clarity' | 'alignment';
  recommendation: string;
  affectedProblems: number[];      // Problem indices
  evidence: string;                // Why this recommendation
  actionItems?: string[];
}

interface VisualizationBundle {
  clusterHeatMap: string;           // SVG string
  bloomComplexityScatter: string;   // SVG string
  confusionDensityMap: string;      // SVG string
  fatigueCurve: string;             // SVG string
  topicRadarChart: string;          // SVG string
  sectionRiskMatrix: string;        // SVG string
}
```

---

## 2️⃣ THE 6 VISUALIZATIONS EXPLAINED

### 1. **Cluster Heat Map** (Problems × Confusion)
```
Confusion Level:
Problems →   ░░░ LOW  ▓▓▓ MEDIUM  ███ HIGH

Prob 1  | ░░░░░░░░
Prob 2  | ▓▓▓▓▓▓▓
Prob 3  | █████████
...

What it shows: Which problems confused students most
Teacher action: Rewrite high-confusion problems
```

### 2. **Bloom Level vs Complexity Scatter**
```
Complexity
    ^
  1.0 |     o (Create, complex)
      |   o o   (Analyze, complex)
  0.7 |  o   o  (Apply, medium)
      | o     o (Understand, low)
  0.5 | o       
      |o        (Remember, simple)
  0.0 +-----------------------------> Bloom Level
      Remember Understand Apply Analyze Evaluate Create

What it shows: Is there a mismatch? (complex Remember problems?)
Teacher action: Simplify overly-complex remembering tasks
```

### 3. **Confusion Density Map** (Problems over time)
```
Confusion Level
    ^
  HIGH |     
       |  █   
       |  ███  █
       |  ███ ███  
  LOW  |░░███░███░░
       +━━━━━━━━━━━━→ Problem Sequence
         Prob 1 2 3 4 5 6 7 8 9 10

What it shows: Which problems broke students' momentum
Teacher action: Check sequencing/difficulty progression
```

### 4. **Fatigue Curve** (Cumulative exhaustion)
```
Fatigue →  
Level      ╱─────
    HIGH  ╱
         ╱  
    MED ╱    
       ╱     
    LOW     
   ╱───┴────────────────>
       Time / Problem Sequence

What it shows: At what point did students get tired?
Teacher action: Break up long tests, add checkpoints
```

### 5. **Topic Radar Chart** (Coverage by Bloom)
```
        Topic A
       ╱         ╲
    B  │     ★    │  C
       │  ◇ ◇ ◇   │
       ╲         ╱
        Topic D

★ = Covered (Bloom-weighted)
◇ = Undercovered

What it shows: Which topics/Bloom combinations are missing
Teacher action: Add more Analyze/Evaluate for Topic A
```

### 6. **Section Risk Matrix** (Risk vs Impact)
```
Impact
  HIGH │  ★        (high risk, high impact) → FIX
       │     ◆
       │  ◇        (low risk, low impact) → IGNORE
       │
  LOW  └─────────────────────> Risk
       LOW              HIGH

★ = Problem, fix immediately
◆ = Low priority fix
◇ = Likely fine

What it shows: Which problems are riskiest for students
Teacher action: Prioritize rewrites by this matrix
```

---

## 3️⃣ EXAMPLE: PHILOSOPHER OUTPUT

### Input (from Space Camp - we don't document this)
```
[Space Camp Observatory sends various metrics about student performance]
```

### Output: TeacherFeedbackOptions
```json
{
  "rankedFeedback": [
    {
      "priority": "high",
      "category": "confusion",
      "recommendation": "Problem 7 confused 8/11 students. Break it into two simpler steps.",
      "affectedProblems": [7],
      "evidence": "Avg confusion signal: 0.82 for this problem. Weak readers struggled most.",
      "actionItems": [
        "Split into Part A (apply the rule) and Part B (verify answer)",
        "Add worked example before the problem",
        "Simplify wording in Part B"
      ]
    },
    {
      "priority": "high",
      "category": "engagement",
      "recommendation": "Test is too long. Students fatigued after problem 12.",
      "affectedProblems": [12, 13, 14, 15],
      "evidence": "Fatigue index jumped from 0.3 to 0.7 between problems 11-12",
      "actionItems": [
        "Move problems 13-15 to a follow-up assessment",
        "Add a 2-minute break indicator after problem 12"
      ]
    },
    {
      "priority": "medium",
      "category": "alignment",
      "recommendation": "Problem 3 (Remember) seems out of place in Apply section.",
      "affectedProblems": [3],
      "evidence": "Bloom jump backwards. May confuse student's mental model.",
      "actionItems": [
        "Move to Remember section",
        "Or rewrite to be an Apply-level problem"
      ]
    }
  ],
  "visualizations": {
    "clusterHeatMap": "SVG...",
    "bloomComplexityScatter": "SVG...",
    "confusionDensityMap": "SVG...",
    "fatigueCurve": "SVG...",
    "topicRadarChart": "SVG...",
    "sectionRiskMatrix": "SVG..."
  },
  "metadata": {
    "generatedAt": "2026-02-12T14:30:00Z",
    "analysisVersion": "1.2"
  }
}
```

---

## 4️⃣ INTEGRATION POINTS

### When Philosopher is Called
```
Teacher sends assignment
    ↓
Space Camp runs simulation (generates unknown format)
    ↓
Philosopher receives Space Camp output
    ↓
Philosopher.send() returns TeacherFeedbackOptions
    ↓
Pipeline receives feedback + visualizations
    ↓
PhilosopherReview UI displays ranked feedback + 6 charts
```

### Code Location
**Main export:** `src/agents/analysis/philosophers.ts`  
```typescript
export async function callPhilosopherWithVisualizations(
  spaceCapResponse: any  // ← Input from Space Camp (format unknown)
): Promise<TeacherFeedbackOptions> {
  // Process Space Camp response (internal, doesn't matter format)
  // Generate feedback and visualizations
  return {
    rankedFeedback: [...],
    visualizations: {
      clusterHeatMap: generateClusterHeatMap(...),
      bloomComplexityScatter: generateBloomComplexityScatter(...),
      confusionDensityMap: generateConfusionDensityMap(...),
      fatigueCurve: generateFatigueCurve(...),
      topicRadarChart: generateTopicRadarChart(...),
      sectionRiskMatrix: generateSectionRiskMatrix(...),
    }
  };
}
```

**Visualizations:** `src/agents/analytics/visualizations.ts` (6 deterministic SVG generators)  
**UI:** `src/components/Pipeline/PhilosopherReview.tsx` (displays feedback + charts in tabs)

---

## 5️⃣ VISUALIZATION GUARANTEES

All 6 visualizations are:

| Property | Guarantee |
|----------|-----------|
| **Deterministic** | Same Space Camp output → Same visualization |
| **SVG** | Rendered as inline SVG strings (no external image files) |
| **Colorblind-safe** | Use accessible color palettes |
| **Print-friendly** | All SVGs print correctly |
| **Responsive** | Scale to container width |
| **No JavaScript** | Pure SVG, no interactivity needed |

---

## 6️⃣ FEEDBACK PRIORITIES & CATEGORIES

### Priority Levels
```
HIGH   → Fix immediately (affects >50% of students or >3 problems)
MEDIUM → Fix before next iteration (affects 1-2 key problems)
LOW    → Nice-to-have improvements (edge cases)
```

### Feedback Categories
```
confusion  → Students didn't understand the problem
engagement → Students lost interest or got tired
time       → Test took longer than expected
clarity    → Wording was ambiguous
alignment  → Doesn't match original intent or Bloom level
```

---

## 7️⃣ TESTING

### Unit Test Template
```typescript
describe('Philosopher Output Contract', () => {
  test('Philosopher returns TeacherFeedbackOptions', async () => {
    const mockSpaceCampOutput = { /* ... */ };
    const result = await callPhilosopherWithVisualizations(mockSpaceCampOutput);
    
    expect(result).toHaveProperty('rankedFeedback');
    expect(result).toHaveProperty('visualizations');
  });

  test('rankedFeedback is sorted by priority (high → medium → low)', async () => {
    const result = await callPhilosopherWithVisualizations(mockSpaceCampOutput);
    
    for (let i = 0; i < result.rankedFeedback.length - 1; i++) {
      const current = priorityWeight(result.rankedFeedback[i].priority);
      const next = priorityWeight(result.rankedFeedback[i + 1].priority);
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test('All 6 visualizations are SVG strings', async () => {
    const result = await callPhilosopherWithVisualizations(mockSpaceCampOutput);
    const viz = result.visualizations;
    
    expect(viz.clusterHeatMap).toMatch(/^<svg/);
    expect(viz.bloomComplexityScatter).toMatch(/^<svg/);
    expect(viz.confusionDensityMap).toMatch(/^<svg/);
    expect(viz.fatigueCurve).toMatch(/^<svg/);
    expect(viz.topicRadarChart).toMatch(/^<svg/);
    expect(viz.sectionRiskMatrix).toMatch(/^<svg/);
  });

  test('All feedback items have required fields', async () => {
    const result = await callPhilosopherWithVisualizations(mockSpaceCampOutput);
    
    result.rankedFeedback.forEach(item => {
      expect(item.priority).toMatch(/^(high|medium|low)$/);
      expect(item.category).toBeDefined();
      expect(item.recommendation).toBeDefined();
      expect(item.affectedProblems).toBeInstanceOf(Array);
      expect(item.evidence).toBeDefined();
    });
  });
});
```

---

## 8️⃣ FAQ

**Q: What format does Space Camp send?**  
A: Unknown. Philosopher is a black box. We only document what it sends back.

**Q: Can we predict what visualizations will be generated?**  
A: No. Visualizations are deterministic based on Space Camp's response, but we don't control the formula.

**Q: Are visualizations always all 6 types?**  
A: Yes. Philosopher always returns all 6 visualizations, even if empty/null.

**Q: Can teachers customize the visualizations?**  
A: No. Visualizations are system-generated. Teachers can export/print them.

**Q: What if Philosopher disagrees with Space Camp data?**  
A: Philosopher processes whatever Space Camp sends. It's trustworthy downstream.

---

## ✅ Contract Verification Checklist

```
✓ OUTPUT interface clearly defined (TeacherFeedbackOptions)
✓ 6 visualizations documented with examples
✓ Feedback item structure specified
✓ Priority and category enums listed
✓ SVG format guaranteed
✓ Determinism explained
✓ Example output provided
✓ Testing template included
✓ Integration points clear
✓ Input acknowledged as external (Space Camp)
✓ No attempt to document unknown Space Camp format
```

---

## 📊 Contract Summary

**INPUT:** Whatever Space Camp Observatory sends (we don't document this - external)  
**OUTPUT:** TeacherFeedbackOptions with 20-40 ranked feedback items + 6 SVG visualizations  
**GUARANTEE:** Deterministic, colorblind-safe, print-friendly SVGs  
**FALLBACK:** If generation fails, return empty visualizations + explanatory feedback  

**Status:** ✅ Production ready (v1.2)
