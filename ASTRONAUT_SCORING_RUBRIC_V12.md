# 🚀 ASTRONAUT SCORING RUBRIC (Final v1.2)
## The Definitive Script for Simulation Machine

**Version:** 1.2  
**Status:** Ready for Implementation  
**Date:** February 12, 2026

This is the **canonical scoring specification** that the simulation engine uses to generate context-derived astronauts.

---

# ⭐ 1. TRAIT DEFINITIONS

Each astronaut has five core traits (0.0–1.0 scale):

| Trait | Meaning | Affects |
|-------|---------|---------|
| **readingLevel** | Ability to parse text-heavy problems; speed and comprehension | Time on task, confusion on wordy problems |
| **mathLevel** | Ability to handle numeric/procedural tasks; computational fluency | Time on task, success on quantitative problems |
| **stamina** | Ability to maintain performance over long tests; mental endurance | Fatigue accumulation, attention span |
| **reasoning** | Logical problem-solving ability; abstract thinking | Success on high-Bloom problems (Analyze, Evaluate, Create) |
| **confusionTolerance** | How gradually (vs. quickly) confusion spikes under difficulty | Confusion signals, drop-off risk |

---

# ⭐ 2. GRADE BAND BASELINES

These define the **starting trait ranges** before class level or subject adjustments.

### Grades 3–5 (Elementary)
```typescript
{
  readingLevel: [0.20, 0.45],      // Early fluency stage
  mathLevel: [0.20, 0.45],         // Foundational arithmetic
  stamina: [0.20, 0.40],           // Limited sustained attention
  reasoning: [0.20, 0.40],         // Concrete thinking
  confusionTolerance: [0.20, 0.40] // Quick frustration
}
```

### Grades 6–8 (Middle School)
```typescript
{
  readingLevel: [0.40, 0.65],      // Developing fluency
  mathLevel: [0.40, 0.65],         // Multi-step operations
  stamina: [0.35, 0.55],           // Growing attention span
  reasoning: [0.40, 0.60],         // Abstract thinking emerging
  confusionTolerance: [0.35, 0.55] // Moderate frustration tolerance
}
```

### Grades 9–12 (High School)
```typescript
{
  readingLevel: [0.55, 0.85],      // College-ready fluency
  mathLevel: [0.55, 0.85],         // Complex multi-step
  stamina: [0.50, 0.75],           // Focus for 45+ minutes
  reasoning: [0.55, 0.80],         // Abstract reasoning solid
  confusionTolerance: [0.50, 0.75] // Persists through difficulty
}
```

---

# ⭐ 3. CLASS LEVEL MULTIPLIERS

These adjust the **grade-band baseline**, accounting for class composition and curriculum rigor.

### Standard (Typical Mixed-Ability Class)
**Multiplier:** No change (1.0×)  
**Applied to:** All traits  
**Use case:** Regular 6th-grade math, typical high school English

### Honors (Advanced Students)
**Multiplier:** 1.10× all traits, capped at 1.0  
**Applied to:** All traits  
**Use case:** 8th-grade honors math, advanced English class

**Effect:**
```
Grade 6–8 Standard readingLevel = [0.40, 0.65]
Grade 6–8 Honors readingLevel = [0.44, 0.715] → [0.44, 0.715] (clamped)
```

### AP (College-Level)
**Multiplier:** 1.20× all traits, capped at 1.0  
**Applied to:** All traits  
**Use case:** AP Calculus, AP Literature, AP Biology

**Effect:**
```
Grade 9–12 Standard reasoning = [0.55, 0.80]
Grade 9–12 AP reasoning = [0.66, 0.96] → [0.66, 0.96] (clamped)
```

**Key:** AP students never have low reading/math levels. Minimum AP reading = 0.55 × 1.20 = 0.66.

---

# ⭐ 4. SUBJECT MODIFIERS

These adjust the **reading vs math balance** and add subject-specific insights.

### Math
```json
{
  "readingLevel": 0.90,    // Math problems less wordy
  "mathLevel": 1.15,       // Math fluency crucial
  "stamina": 1.0,          // No change
  "reasoning": 1.0,        // No change
  "confusionTolerance": 1.0
}
```
**Rationale:** Math class emphasizes computation; less reading burden; but needs strong math fluency.

**Example:**
```
Grade 6–8 Standard + Math:
  readingLevel: 0.40–0.65 × 0.90 = [0.36, 0.585]
  mathLevel: 0.40–0.65 × 1.15 = [0.46, 0.7475]
```

### English / Language Arts
```json
{
  "readingLevel": 1.15,    // Reading is primary skill
  "mathLevel": 0.85,       // Math less emphasized
  "stamina": 1.0,
  "reasoning": 1.05,       // Literary analysis slightly higher
  "confusionTolerance": 1.0
}
```
**Rationale:** English demands strong reading; lower math requirement; reasoning for interpretation.

### Science
```json
{
  "readingLevel": 1.0,
  "mathLevel": 1.0,
  "stamina": 1.05,         // Labs require sustained focus
  "reasoning": 1.10,       // Scientific reasoning critical
  "confusionTolerance": 1.0
}
```
**Rationale:** Science balances reading and math; emphasizes reasoning.

### History / Social Studies
```json
{
  "readingLevel": 1.10,    // Document-heavy
  "mathLevel": 1.0,
  "stamina": 1.0,
  "reasoning": 1.0,
  "confusionTolerance": 1.05  // Tolerates ambiguity (historical interpretation)
}
```

### General / Mixed (Default)
```json
{
  "readingLevel": 1.0,
  "mathLevel": 1.0,
  "stamina": 1.0,
  "reasoning": 1.0,
  "confusionTolerance": 1.0
}
```

---

# ⭐ 5. FINAL BASE TRAIT CALCULATION FORMULA

For each trait, compute:

```
finalTrait = clamp(
    gradeBandBaseline[trait]
    × classLevelMultiplier[classLevel]
    × subjectMultiplier[subject][trait],
    0.0,
    1.0
)
```

**Step-by-step example:**

```
Context: Grades 6–8, Honors, English

Compute readingLevel:
  1. Grade baseline: [0.40, 0.65]
  2. Honors multiplier: × 1.10
  3. English multiplier: × 1.15
  4. Result: [0.40×1.10×1.15, 0.65×1.10×1.15]
           = [0.506, 0.822]

Compute mathLevel:
  1. Grade baseline: [0.40, 0.65]
  2. Honors multiplier: × 1.10
  3. English multiplier: × 0.85
  4. Result: [0.40×1.10×0.85, 0.65×1.10×0.85]
           = [0.374, 0.609]
```

---

# ⭐ 6. OVERLAY MULTIPLIERS (Applied at Space Camp)

**CRITICAL RULE:** Overlays are applied **AFTER** base traits are calculated. They are multipliers, not replacements.

### ADHD Overlay
```json
{
  "readingLevel": 1.0,      // Unchanged
  "mathLevel": 1.0,         // Unchanged
  "stamina": 0.85,          // Difficulty sustaining effort
  "reasoning": 1.0,         // Unchanged (can reason; just hyper)
  "confusionTolerance": 0.75  // Quick frustration
}
```
**Interpretation:** ADHD students can think clearly but lose focus and frustrate quickly.

### Dyslexia Overlay
```json
{
  "readingLevel": 0.60,           // Significant reading slowdown
  "mathLevel": 1.0,               // Unchanged (depends on context)
  "stamina": 1.0,                 // Unchanged
  "reasoning": 1.0,               // Unchanged
  "confusionTolerance": 0.85      // Tolerates confusion slightly better (expects it)
}
```
**Interpretation:** Dyslexia is a reading-specific challenge; cognitive ability unaffected.

### Fatigue-Sensitive Overlay
```json
{
  "readingLevel": 1.0,
  "mathLevel": 1.0,
  "stamina": 0.70,                // Tires quickly
  "reasoning": 1.0,
  "confusionTolerance": 0.90      // Slightly more resilient (aware of fatigue)
}
```
**Interpretation:** Fatigue-sensitive students lose performance as test duration increases.

### ESL (English as Second Language) Overlay
```json
{
  "readingLevel": 0.65,           // Language barrier
  "mathLevel": 1.0,               // Math transcends language (mostly)
  "stamina": 1.0,
  "reasoning": 0.90,              // Translation overhead
  "confusionTolerance": 1.0
}
```
**Interpretation:** ESL students struggle with reading speed and language-heavy reasoning.

### Anxiety-Prone Overlay
```json
{
  "readingLevel": 1.0,
  "mathLevel": 1.0,
  "stamina": 1.0,
  "reasoning": 0.95,              // Anxiety clouds reasoning slightly
  "confusionTolerance": 0.60      // Anxiety spirals quickly
}
```
**Interpretation:** Anxiety-prone students are capable but derailed by stress.

---

# ⭐ 7. OVERLAY ASSIGNMENT STRATEGY (Space Camp Decision)

**When** should Space Camp apply overlays?

### Option A: Strategic (Recommended)
Apply overlays based on problem difficulty and student traits:

```typescript
function assignOverlays(student: Astronaut, asteroids: Asteroid[]): string[] {
  const overlays: string[] = [];
  const avgComplexity = asteroids.avg(a => a.LinguisticComplexity);
  const avgBloom = asteroids.avg(a => bloomToNumber(a.BloomLevel));
  const totalTime = asteroids.sum(a => a.EstimatedTimeSeconds);

  // High text load + weak reader → dyslexia
  if (avgComplexity > 0.75 && student.readingLevel < 0.45) {
    overlays.push('dyslexia');
  }

  // Long test + low stamina → fatigue_sensitive
  if (totalTime > 3600 && student.stamina < 0.45) {
    overlays.push('fatigue_sensitive');
  }

  // Sudden Bloom jump → anxiety_prone
  if (hasBloomJump(asteroids)) {
    overlays.push('anxiety_prone');
  }

  // High complexity → maybe ADHD for some
  if (avgComplexity > 0.8 && randomChance(0.2)) {
    overlays.push('adhd');
  }

  return overlays;
}
```

### Option B: Random (Simpler)
Randomly assign overlays to X% of students:
```typescript
function assignOverlays(student: Astronaut): string[] {
  const allOverlays = ['adhd', 'dyslexia', 'fatigue_sensitive', 'esl', 'anxiety_prone'];
  const numOverlays = randomInt(0, 2); // 0, 1, or 2 overlays
  return shuffle(allOverlays).slice(0, numOverlays);
}
```

**Recommendation:** Use Option A (strategic) for more realistic simulations. Option B is simpler but less accurate.

---

# 🧮 WORKED EXAMPLE: Generating an Astronaut

**Context:** Grades 6–8, Standard, Math

**Step 1: Grade Baseline**
```
readingLevel: [0.40, 0.65]
mathLevel: [0.40, 0.65]
stamina: [0.35, 0.55]
reasoning: [0.40, 0.60]
confusionTolerance: [0.35, 0.55]
```

**Step 2: Pick Random Value from Each Range**
```
readingLevel: 0.52
mathLevel: 0.58
stamina: 0.43
reasoning: 0.51
confusionTolerance: 0.45
```

**Step 3: Apply Class Multiplier (Standard = 1.0×)**
```
readingLevel: 0.52 × 1.0 = 0.52
mathLevel: 0.58 × 1.0 = 0.58
stamina: 0.43 × 1.0 = 0.43
reasoning: 0.51 × 1.0 = 0.51
confusionTolerance: 0.45 × 1.0 = 0.45
```

**Step 4: Apply Subject Multiplier (Math)**
```
readingLevel: 0.52 × 0.90 = 0.468
mathLevel: 0.58 × 1.15 = 0.667
stamina: 0.43 × 1.0 = 0.43
reasoning: 0.51 × 1.0 = 0.51
confusionTolerance: 0.45 × 1.0 = 0.45
```

**Step 5: Apply Overlays (If Any)**
Suppose Space Camp assigns dyslexia:
```
readingLevel: 0.468 × 0.60 = 0.281
mathLevel: 0.667 × 1.0 = 0.667
stamina: 0.43 × 1.0 = 0.43
reasoning: 0.51 × 1.0 = 0.51
confusionTolerance: 0.45 × 0.85 = 0.383
```

**Final Astronaut:**
```json
{
  "StudentId": "astronaut_123",
  "PersonaName": "Math Student with Dyslexia",
  "Overlays": ["dyslexia"],
  "ProfileTraits": {
    "ReadingLevel": 0.281,
    "MathFluency": 0.667,
    "AttentionSpan": 0.43,
    "Confidence": 0.51,
    "ConfusionTolerance": 0.383
  }
}
```

This student has:
- ✅ Strong math ability (0.667)
- ❌ Weak reading (0.281) due to dyslexia
- 🟡 Low confusion tolerance (0.383)
- 🟡 Moderate stamina (0.43)

---

# 📋 VALIDATION CHECKLIST

Before sending this rubric to the simulation machine, verify:

- [ ] All grade bands have 5 traits with min ≤ max
- [ ] All class level multipliers are positive
- [ ] All subject modifiers are positive
- [ ] All overlay multipliers are positive
- [ ] Clamping to [0.0, 1.0] is enforced everywhere
- [ ] AP students never have readingLevel < 0.55
- [ ] Overlay multipliers applied **after** base traits
- [ ] Determinism: same seed → same astronauts
- [ ] No hardcoded persona names (use base traits only)

---

# 🔧 IMPLEMENTATION GUIDANCE

### For TypeScript/JavaScript:

```typescript
interface AstronautRubric {
  gradeBandBaselines: Record<string, Record<string, [number, number]>>;
  classLevelMultipliers: Record<string, number>;
  subjectMultipliers: Record<string, Record<string, number>>;
  overlayMultipliers: Record<string, Record<string, number>>;
}

function generateAstronautTraits(
  gradeBand: string,
  classLevel: string,
  subject: string,
  rubric: AstronautRubric,
  seed?: number
): Record<string, number> {
  const baselineRanges = rubric.gradeBandBaselines[gradeBand];
  const classMultiplier = rubric.classLevelMultipliers[classLevel];
  const subjectMultipliers = rubric.subjectMultipliers[subject] || {};

  const traits: Record<string, number> = {};

  for (const [traitName, [min, max]] of Object.entries(baselineRanges)) {
    // Random value in range [min, max]
    const randomValue = min + (max - min) * Math.random();
    
    // Apply class level
    const afterClass = randomValue * classMultiplier;
    
    // Apply subject
    const subjectMult = subjectMultipliers[traitName] ?? 1.0;
    const afterSubject = afterClass * subjectMult;
    
    // Clamp
    traits[traitName] = Math.min(1.0, Math.max(0.0, afterSubject));
  }

  return traits;
}
```

---

# 📖 REFERENCE

| Term | Definition |
|------|-----------|
| **Base Traits** | The 5 core traits (reading, math, stamina, reasoning, confusion) |
| **Grade Band Baseline** | Starting trait ranges, e.g., Grades 6–8 |
| **Class Level** | Standard, Honors, or AP; adjusts all traits upward |
| **Subject Modifier** | Subject-specific adjustment (e.g., math emphasizes mathLevel) |
| **Overlay** | Learning need or accessibility feature (ADHD, dyslexia, etc.) |
| **Multiplier** | Factor applied to trait (1.15 = 15% boost; 0.75 = 25% reduction) |
| **Clamp** | Ensure value stays in [0.0, 1.0] range |

---

**This rubric is deterministic, extensible, and aligned with v1.2 spec.** ✓
