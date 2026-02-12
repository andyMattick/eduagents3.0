# Simulation Scoring Rules & Overlay Strategy

## Phase 4: Strategic Overlay Assignment

**Date**: February 2026  
**Status**: Final  
**Version**: 1.0

---

## Overview

Accessibility overlays are NO LONGER assigned randomly. Instead, they are applied **strategically** based on **problem characteristics** (the "asteroid field").

This document describes:
1. When and why overlays are applied
2. The six strategic overlay rules
3. How to integrate overlays into the Space Camp simulation
4. What the Simulation Machine needs to know

---

## Key Principle

**One-way flow:**
```
Astronauts Generated (empty Overlays)
    ↓
Asteroid Field Analyzed (problem complexity, Bloom, time)
    ↓
Overlays Applied Strategically (based on rules below)
    ↓
Astronauts + Overlays → Space Camp Simulation
```

Overlays are **deterministic**: same problems → same overlays for same student.

---

## The Six Overlay Rules

### Rule 1: Dyslexia Overlay 🔤

**Trigger**: High text load + weak reader

**Conditions**:
- Linguistic complexity **> 0.7** (across assignment)
- Student reading level **< 0.5**

**Why**: 
- When assignments have complex vocabulary, long sentences, and technical jargon...
- ...and the student struggles to decode text...
- ...they need dyslexia-specific support: sans-serif fonts, increased spacing, simplified vocabulary.

**Examples**:
- ✅ "Analyze the water cycle" + weak reader → dyslexia overlay
- ❌ "What is photosynthesis?" (simple) + weak reader → NO dyslexia overlay
- ❌ Complex text + strong reader (0.9) → NO dyslexia overlay

---

### Rule 2: Fatigue-Sensitive Overlay ⏰

**Trigger**: Long assignments

**Conditions**:
- Total estimated time **≥ 60 minutes**

**Why**:
- Long assessments (>60 min) cause mental exhaustion, especially for students with ADHD, anxiety, or attention issues.
- These students need breaks, pacing adjustments, or shorter segments.

**Examples**:
- ✅ 15 problems × 5 min each = 75 min → fatigue_sensitive overlay
- ✅ 3 problems × 25 min each = 75 min → fatigue_sensitive overlay
- ❌ 4 short problems = 40 min total → NO fatigue_sensitive overlay

**Space Camp Note**: This overlay affects fatigue curves and engagement models, not just the simulation.

---

### Rule 3: Anxiety-Prone Overlay 😰

**Trigger**: Large Bloom jumps

**Conditions**:
- At least one jump between consecutive problems where **|Bloom level distance| ≥ 2**

**Why**:
- Sudden difficulty increases (e.g., Remember → Analyze) can trigger panic in anxiety-prone students.
- They need warning, scaffolding, or gradual progression.

**Examples**:
- ✅ [Remember → Apply] (jump of 2) → anxiety_prone overlay
- ✅ [Understand → Evaluate] (jump of 3) → anxiety_prone overlay
- ❌ [Remember → Understand → Apply] (gradual) → NO anxiety_prone overlay

**What Bloom distances trigger**:
- 2+ levels = triggers anxiety_prone

---

### Rule 4: ESL Overlay 🌍

**Trigger**: Very high linguistic complexity

**Conditions**:
- Linguistic complexity **> 0.8** (across assignment)

**Why**:
- Assignments with rare vocabulary, complex grammar, and idiomatic language are hard for English learners.
- They need simplified language, definitions, or translations.

**Distinction from Dyslexia**:
- Dyslexia: complexity >0.7 + weak reader
- ESL: complexity >0.8 (regardless of reading level)
- ESL is about language complexity, not just individual reading struggles.

**Examples**:
- ✅ "Elucidate the thermodynamic implications..." → ESL overlay
- ❌ "Explain heat transfer" → NO ESL overlay

---

### Rule 5: ADHD Overlay 🧠

**Trigger**: Low cognitive demand + low attention + long simple tasks

**Conditions**:
- Average Bloom level **≤ 2** (mostly Remember/Understand)
- Student attention span **< 0.5**
- Assignment simple but long: complexity **< 0.4** AND time **> 45 min**

**Why**:
- Counter-intuitive, but repetitive, procedural tasks with low cognitive demand...
- ...can overwhelm ADHD students (executive function, working memory issues).
- They need structure, breaks, explicit instructions, and novelty/motivation.

**Examples**:
- ✅ 50 vocabulary matching problems (low Bloom, simple, 50 min) + low attention → ADHD overlay
- ✅ 20 arithmetic drills (low Bloom, simple, 40 min) + low attention → ADHD overlay
- ❌ Same but high attention student → NO ADHD overlay
- ❌ High Bloom complex problems → NO ADHD overlay

---

### Rule 6: Cognitive Demand Overlay 🎓

**Trigger**: Very hard problems + low confidence

**Conditions**:
- Maximum Bloom level **≥ 4** (Analyze or higher exists)
- Student confidence **< 0.5**

**Why**:
- When the assignment demands high-order thinking (Analyze, Evaluate, Create)...
- ...and the student isn't confident...
- ...they need support for cognitive load: more hints, worked examples, scaffolding.

**Examples**:
- ✅ Includes Analyze/Evaluate problems + low confidence → cognitive_demand overlay
- ❌ Includes Analyze/Evaluate problems + high confidence → NO cognitive_demand overlay
- ❌ Only Remember/Understand problems → NO cognitive_demand overlay

---

## Integration into Space Camp

### When Overlays Are Applied

**Sequence**:
1. Astronauts are generated (from predefined personas or teacher input) with **empty Overlays**
2. Problems are analyzed (Bloom levels, complexity, time estimates)
3. **applyOverlaysStrategically()** is called:
   ```typescript
   import { applyOverlaysStrategically } from './overlayStrategy';
   
   astronauts = applyOverlaysStrategically(astronauts, problems);
   ```
4. Astronauts now have overlays assigned deterministically
5. Astronauts + overlays are sent to simulation

### Module Location

```
src/agents/simulation/overlayStrategy.ts
├─ applyOverlaysStrategically(astronauts, problems) → Astronaut[]
└─ debugOverlayAssignment(astronauts, problems) → OverlayDebugInfo[]
```

### Function Signature

```typescript
export function applyOverlaysStrategically(
  astronauts: Astronaut[],
  problems: ProblemCharacteristics[]
): Astronaut[] {
  // Returns astronauts WITH overlays assigned
}

export interface ProblemCharacteristics {
  BloomLevel: BloomLevel; // "Remember", "Understand", etc.
  LinguisticComplexity: number; // 0.0–1.0
  EstimatedTimeMinutes?: number;
  SequenceIndex?: number;
}
```

---

## What the Simulation Machine Needs to Know

### 1. Overlays Modify Student Traits

Each overlay should modify the baseline Astronaut traits using **multipliers**:

| Overlay | ReadingLevel | MathFluency | AttentionSpan | Confidence | Notes |
|---------|--------------|-------------|---------------|------------|-------|
| dyslexia | ×0.6 | ×1.0 | ×0.9 | ×0.8 | Reading harder; slight attention/confidence hit |
| fatigue_sensitive | ×1.0 | ×1.0 | ×0.7 | ×0.8 | Attention drops; confidence affected |
| anxiety_prone | ×0.9 | ×0.9 | ×0.6 | ×0.5 | Significant confidence hit; attention reduced |
| esl | ×0.7 | ×1.0 | ×0.8 | ×0.6 | Reading harder; less confident |
| adhd | ×1.0 | ×0.9 | ×0.5 | ×0.7 | Attention heavily reduced |
| cognitive_demand | ×0.9 | ×0.8 | ×0.8 | ×0.4 | Struggle with complex tasks; confidence drops |

**Formula**:
```
effective_trait = base_trait × overlay_multiplier
```

### 2. Multiple Overlays Stack

If a student has multiple overlays (e.g., `["dyslexia", "anxiety_prone"]`):
- Apply multipliers **sequentially**
- Order: apply each overlay's multipliers in sequence

Example:
```
Base reading level: 0.7

After dyslexia (×0.6): 0.7 × 0.6 = 0.42
After anxiety (×0.9): 0.42 × 0.9 = 0.378
Effective reading level: 0.38
```

### 3. Overlays Are Fixed Per Simulation Run

Once overlays are assigned to an Astronaut, they **don't change** during a simulation run.

---

## Determinism Guarantee

**Same input must produce same output:**

```typescript
const run1 = applyOverlaysStrategically(astronauts, problems);
const run2 = applyOverlaysStrategically(astronauts, problems);

// run1[i].Overlays === run2[i].Overlays (for all i)
// No randomness involved
```

This allows:
- Reproducible simulations
- Automated testing
- Comparison before/after assignment changes

---

## Debugging & Transparency

Use `debugOverlayAssignment()` to understand why overlays were assigned:

```typescript
const debugInfo = debugOverlayAssignment(astronauts, problems);
// Returns:
// [{
//   astronautId: "s1",
//   personaName: "Visual Learner",
//   appliedOverlays: ["dyslexia", "fatigue_sensitive"],
//   triggers: [
//     "High text load (complexity: 0.82) + weak reader (level: 0.35)",
//     "Long assessment (75 minutes total)"
//   ]
// }]
```

---

## Examples: Complete Scenarios

### Scenario 1: Simple Math Worksheet
- 20 arithmetic problems
- Bloom levels: all "Remember" (1)
- Linguistic complexity: 0.2
- Time: 30 minutes

**Overlays applied**:
- ✅ `fatigue_sensitive` if total time > 60 min → NO
- ✅ `anxiety_prone` if Bloom spikes → NO
- ✅ Other rules → mostly NO
- Result: **No overlays** (safe, appropriate difficulty)

---

### Scenario 2: Complex Science Essay
- 3 analysis-heavy problems
- Bloom levels: [Analyze, Analyze, Evaluate]
- Linguistic complexity: 0.9
- Time: 90 minutes

**Overlays applied**:
- ✅ `fatigue_sensitive` (90 min > 60) → YES
- ✅ `esl` (complexity 0.9 > 0.8) → YES
- ✅ `anxiety_prone` (no Bloom spike, gradual progression) → NO
- ✅ `cognitive_demand` if student has low confidence → MAYBE
- Result: **['fatigue_sensitive', 'esl']** at minimum

---

### Scenario 3: Sudden Difficulty Jump
- Problems: [Remember, Understand, Apply, Evaluate, Create]
- Bloom levels: [1, 2, 3, 5, 6] ← **Jump of 2 at position 4**
- Complexity: 0.6
- Time: 50 min

**Overlays applied**:
- ✅ `anxiety_prone` (jump from Apply to Evaluate = 2 levels) → YES
- ✅ `fatigue_sensitive` (50 min < 60) → NO
- ✅ Other rules → likely NO
- Result: **['anxiety_prone']** (add scaffolding before hard jump)

---

## Migration Guide

### Old Way (Removed ❌)
```typescript
Overlays: selectRandomOverlays() // 0-2 random overlays
```

### New Way (✅)
```typescript
// Step 1: Generate astronauts without overlays
let astronauts = generateAstronautsFromContext(context);
// All have Overlays: []

// Step 2: After problems are known, apply overlays strategically
import { applyOverlaysStrategically } from './overlayStrategy';
astronauts = applyOverlaysStrategically(astronauts, problems);
// Now Overlays: ["dyslexia"], etc.
```

---

## Testing

All rules are tested in:
```
src/agents/simulation/__tests__/overlayStrategy.spec.ts
```

Tests cover:
- ✅ Each rule fires on correct trigger
- ✅ Each rule doesn't fire on wrong conditions
- ✅ Multiple overlays combined
- ✅ Determinism (same input → same output)
- ✅ Debug information accuracy

---

## FAQ

**Q: Can I override overlays after they're assigned?**  
A: Not automatically. If you need custom overlays, pass them at astronaut creation time (before applyOverlaysStrategically is called).

**Q: What if a rule would assign the same overlay twice?**  
A: The code uses a Set internally, so duplicates are automatically removed.

**Q: Do overlays change during a simulation run?**  
A: No. Overlays are fixed when assigned and don't change.

**Q: How do I debug why an overlay was or wasn't assigned?**  
A: Use `debugOverlayAssignment()` for detailed trigger information.

**Q: Can I add custom overlay rules?**  
A: Yes. Edit `src/agents/simulation/overlayStrategy.ts` and add a new rule function, then call it in `applyOverlaysStrategically()`.

---

*Last Updated: February 12, 2026*
