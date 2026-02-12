# ⚡ PHASE 1 QUICK REFERENCE
## Context-Derived Astronaut Generation - Key Patterns & Decisions

**📚 Read in this order:**
1. This file first (quick patterns)
2. PHASE_1_IMPLEMENTATION_CHECKLIST.md (detailed tasks)
3. ASTRONAUT_SCORING_RUBRIC_V12.md (specification)
4. SPACE_CAMP_API_CONTRACT_V12.md (API definition)

---

# 🎯 THE CORE PATTERN

```
Input Context (grade, subject, level)
         ↓
  Apply Rubric (baselines + multipliers)
         ↓
  Generate 11 Astronauts (base traits, no overlays)
         ↓
Run Simulation (each astronaut × each problem)
         ↓
   Return Results (metrics, warnings)
```

**Key Insight:** 
- Astronauts ≠ random
- Astronauts ≈ derived from context via rubric
- Overlays ≠ applied at generation
- Overlays ⟹ applied in Space Camp (Phase 4)

---

# 🧮 CALCULATION FORMULA (Critical!)

```
For each trait:

1. Get grade band baseline
   baseline = random between [min, max] for grade band

2. Apply class multiplier
   withClass = baseline × classMultiplier
   
3. Apply subject modifier
   withSubject = withClass × subjectModifier
   
4. Clamp to [0.0, 1.0]
   final = max(0.0, min(1.0, withSubject))
```

**In Code:**
```typescript
const baseline = min + (max - min) * rng();
const withClass = baseline * classMultiplier;
const withSubject = withClass * subjectModifier;
const final = Math.max(0.0, Math.min(1.0, withSubject));
```

---

# 📍 KEY TYPES

### AstronautGenerationContext
```typescript
{
  gradeBand: "3-5" | "6-8" | "9-12",      // Required
  classLevel: "standard" | "honors" | "AP", // Required
  subject: "math" | "english" | "science" | "history" | "general", // Required
  
  timeTargetMinutes?: 45,
  className?: "Mrs. Chen's 6th Grade Math",
  seed?: 42,  // For reproducible generation
  overlayStrategy?: "strategic" | "random",
}
```

### AstronautRubric
```typescript
{
  gradeBandBaselines: {
    "3-5": { readingLevel: [0.3, 0.6], mathLevel: [0.4, 0.7], ... },
    "6-8": { readingLevel: [0.4, 0.7], mathLevel: [0.5, 0.8], ... },
    "9-12": { readingLevel: [0.6, 0.9], mathLevel: [0.6, 0.9], ... },
  },
  classLevelMultipliers: {
    standard: 1.0,
    honors: 1.10,
    AP: 1.20,
  },
  subjectModifiers: {
    math: { mathLevel: 1.1, readingLevel: 1.0, reasoning: 1.0 },
    english: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
    science: { mathLevel: 1.0, reasoning: 1.1, readingLevel: 1.0 },
    history: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
    general: { mathLevel: 1.0, readingLevel: 1.0, reasoning: 1.0 },
  },
  overlayMultipliers: {
    adhd: { stamina: 0.85, reasoning: 0.90, confusionTolerance: 0.75 },
    dyslexia: { readingLevel: 0.65, confidence: 0.80 },
    // ... etc
  },
}
```

### Generated Astronaut (from context)
```typescript
{
  StudentId: "ast_doc_abc123_0",
  PersonaName: "Strong Mathematician",  // Derived from traits
  Overlays: [],  // ← EMPTY (no overlays at generation!)
  ProfileTraits: {
    ReadingLevel: 0.65,    // Clamped [0.0, 1.0]
    MathFluency: 0.72,     // Clamped [0.0, 1.0]
    AttentionSpan: 0.58,   // Clamped [0.0, 1.0]
    Confidence: 0.70,      // Clamped [0.0, 1.0]
  },
  GradeLevel: "6-8",
  NarrativeTags: ["persistent", "analytical"],
}
```

---

# 🔄 DETERMINISM RULE

**Same context + same seed = same astronauts**

```typescript
// Run A
const result1 = generateAstronautsFromContext({
  gradeBand: "6-8",
  classLevel: "standard",
  subject: "math",
  rubric: RUBRIC,
  documentId: "doc123",
  seed: 42,  // ← Same seed
});

// Run B
const result2 = generateAstronautsFromContext({
  gradeBand: "6-8",
  classLevel: "standard",
  subject: "math",
  rubric: RUBRIC,
  documentId: "doc123",
  seed: 42,  // ← Same seed
});

// Result: result1.astronauts === result2.astronauts (bit-for-bit identical)
```

**Why?** Seeded RNG ensures reproducibility. Essential for:
- Debugging
- Regression testing
- Teacher explanations ("this student always struggles")

---

# 🎨 PERSONA NAME GENERATION

Names should match traits (for teacher transparency):

```typescript
function generatePersonaName(traits, gradeBand, subject): string {
  // Read level + Math level → persona type
  
  if (traits.readingLevel > 0.7 && traits.mathLevel > 0.7) {
    return "Well-Rounded Learner";
  } else if (traits.mathLevel > 0.7) {
    return "Strong Mathematician";
  } else if (traits.readingLevel > 0.7) {
    return "Strong Reader";
  } else if (traits.stamina < 0.4) {
    return "Easily-Fatigued Learner";
  } else {
    return "Typical Learner";
  }
}
```

**Examples (6-8 Math):**
- 0.75 reading, 0.80 math → "Strong Mathematician"
- 0.65 reading, 0.45 math → "Math Learner (Reading-Focused)"
- 0.35 reading, 0.35 math → "Struggling Learner"

---

# 📌 PIPELINE STATE WIRING

**In `usePipeline.ts`:**
```typescript
export interface PipelineState {
  // ... existing fields ...
  
  // NEW for Phase 1:
  astronautContext?: AstronautGenerationContext;
}

// NEW action in reducer:
case 'SET_ASTRONAUT_CONTEXT':
  return {
    ...state,
    astronautContext: action.payload,
  };
```

**In `PipelineShell.tsx`:**
```typescript
// In ASTRONOMER_DEFINITION step:
dispatchPipeline({
  type: 'SET_ASTRONAUT_CONTEXT',
  payload: {
    gradeBand: '6-8',
    classLevel: 'standard',
    subject: 'math',
  },
});

// In SPACE_CAMP_ANALYSIS step:
const { astronauts } = generateAstronautsFromContext({
  gradeBand: state.astronautContext.gradeBand,
  classLevel: state.astronautContext.classLevel,
  subject: state.astronautContext.subject,
  rubric: ASTRONAUT_SCORING_RUBRIC,
  documentId: state.documentId,
  seed: state.astronautContext.seed,
});
```

---

# ✅ CHECKLIST: BEFORE YOU START CODING

Verify you have:

- [ ] Read ASTRONAUT_SCORING_RUBRIC_V12.md completely
- [ ] Read SPACE_CAMP_API_CONTRACT_V12.md completely
- [ ] Opened PHASE_1_IMPLEMENTATION_CHECKLIST.md in editor
- [ ] Followed tasks in order (1 → 10)
- [ ] Have TypeScript strict mode enabled
- [ ] Have ESLint configured
- [ ] Have Vitest available for testing
- [ ] Can run `npm run build` and `npm run dev`
- [ ] Browser DevTools console open for debugging

---

# 🐛 DEBUGGING CHECKLIST

If something goes wrong:

### "Astronauts have NaN values"
→ Check grade band baselines are valid [min, max] ranges
→ Verify multipliers are positive numbers
→ Verify `rng()` returns values in [0.0, 1.0]

### "Same seed produces different astronauts"
→ Check seeded RNG is using `seed + i` for each astronaut
→ Verify you're not using `Math.random()` anywhere
→ Check multipliers don't include randomness

### "Traits not clamped properly"
→ Verify `Math.max(0.0, Math.min(1.0, value))` is called
→ Check it happens **after** all multiplications
→ Verify clamp is applied to all 5 traits

### "Pipeline context not flowing"
→ Check `SET_ASTRONAUT_CONTEXT` action exists in reducer
→ Verify form captures all 3 required fields
→ Check `dispatchPipeline()` call uses correct action type
→ Verify `state.astronautContext` is available in next step

### "generateBaseTraits() returns wrong values"
→ Compare formula against spec: `baseline × classMultiplier × subjectModifier`
→ Verify grade band baselines loaded from rubric correctly
→ Check subject modifier for the subject you're testing

---

# 🎯 EXPECTED VALUES (For Testing)

**Scenario:** Grades 6-8, Standard, Math

Using this rubric:
```
Baseline Reading (6-8):   [0.4, 0.7]   → avg 0.55
Baseline Math (6-8):      [0.5, 0.8]   → avg 0.65
Class Multiplier:         1.0× (Standard)
Math Subject Modifier:    1.1× (emphasize math)
```

**Expected range after application:**
```
Reading Level:  [0.4×1.0×1.0, 0.7×1.0×1.0]   =  [0.4, 0.7]     → typically 0.5-0.6
Math Fluency:   [0.5×1.0×1.1, 0.8×1.0×1.1]   =  [0.55, 0.88]   → typically 0.65-0.75
```

**Scenario:** Grades 6-8, Honors, Math

```
Class Multiplier:         1.10× (Honors)
Math Subject Modifier:    1.1× (emphasize math)

Reading Level:  [0.4×1.10×1.0, 0.7×1.10×1.0]   =  [0.44, 0.77]  → typically 0.55-0.65
Math Fluency:   [0.5×1.10×1.1, 0.8×1.10×1.1]   =  [0.605, 0.968] → clamped [0.605, 0.968] → typically 0.70-0.80
```

If your values are way off from these ranges, check:
1. Rubric values loaded correctly
2. Math on multipliers
3. Clamping logic correct

---

# 📊 QUICK FILE MAP

| File | Purpose | What to Add/Change |
|------|---------|-------------------|
| `src/types/pipeline.ts` | Type definitions | Add AstronautGenerationContext |
| `src/types/simulation.ts` | Simulation types | Add AstronautRubric |
| `src/hooks/usePipeline.ts` | State management | Add astronautContext field + setter |
| `src/agents/simulation/astronautGenerator.ts` | Generation logic | Implement generateAstronautsFromContext() |
| `src/components/Pipeline/PipelineShell.tsx` | UI/routing | Capture context in ASTRONOMER, use in SPACE_CAMP |
| `src/agents/simulation/__tests__/astronautGenerator.test.ts` | Tests | Create new file with 8 tests |

---

# 🚀 EXPECTED OUTCOME OF PHASE 1

After completing all 10 tasks:

✅ Teacher enters assignment in Launchpad  
✅ Proceeds to Astronomer Definition step  
✅ Fills form: "6-8, Standard, Math"  
✅ Proceeds to Space Camp Analysis step  
✅ System generates 11 context-derived astronauts (not random)  
✅ Simulation runs (per-student × per-problem)  
✅ Results shown in Philosopher step  
✅ Generation log visible for debugging  
✅ Same inputs → same astronauts (deterministic)  

**Example console output:**
```
Generating 11 astronauts for 6-8 standard math
Astronaut 0: reading=0.52, math=0.71, stamina=0.64
Astronaut 1: reading=0.48, math=0.73, stamina=0.62
Astronaut 2: reading=0.61, math=0.68, stamina=0.70
...
Astronaut 10: reading=0.45, math=0.74, stamina=0.58
Generated 11 astronauts successfully
```

---

# 📚 DOCUMENT HIERARCHY

```
PHASE_1_IMPLEMENTATION_CHECKLIST.md  ← Start here (detailed tasks)
│
├─ ASTRONAUT_SCORING_RUBRIC_V12.md          (spec details)
├─ SPACE_CAMP_API_CONTRACT_V12.md           (API details)
└─ PHASE_1_QUICK_REFERENCE.md               (this file - high-level patterns)

V12_IMPLEMENTATION_CHECKLIST.md             (all 6 phases overview)
```

**When to use each:**
- **This file:** Quick pattern lookup, debugging checklist, expected values
- **PHASE_1_IMPLEMENTATION_CHECKLIST.md:** Step-by-step code tasks
- **ASTRONAUT_SCORING_RUBRIC_V12.md:** Verify multiplier values, understand calculation
- **SPACE_CAMP_API_CONTRACT_V12.md:** Understand full request/response contract

---

# 💡 KEY PRINCIPLES

1. **Context-Derived, Not Random**
   - Astronauts match class composition (Grades 6-8 Standard Math produces 6-8 Standard Math learners)
   - Removes surprise factor (teacher can reason about why certain students struggle)

2. **Determinism with Seed**
   - Same context + seed = same astronauts
   - Allows teacher to re-run simulation and explain results consistently

3. **Overlays Applied Later (in Space Camp, Phase 4)**
   - Base traits are clean and predictable
   - Overlays modify base traits strategically, not randomly

4. **Multiplicative Modifiers**
   - Class level raises *all* traits (1.1× for Honors)
   - Subject mods emphasize relevant trait (1.1× math for math class)
   - Result: Natural variation reflecting real classroom diversity

5. **Trait Clamping**
   - No trait outside [0.0, 1.0]
   - Prevents unrealistic RNG values
   - Protects downstream simulation logic

---

# ✨ QUALITY GATES

Phase 1 is successful when:

| Gate | Criteria | How to Verify |
|------|----------|---------------|
| **Type Safety** | All code compiles, 0 TypeScript errors | `npm run build` exits 0 |
| **Determinism** | Same seed = same results | Run tests, check test #3 passes |
| **Clamping** | All traits in [0.0, 1.0] | Run tests, check test #2 passes |
| **No Overlays** | Astronaut.Overlays always [] | Run tests, check test #6 passes |
| **Context Flow** | Context captured and transmitted | Manual test: fill form, watch astronauts generate |
| **Persona Names** | Names match traits (readable) | Manual test: check console output for names |
| **Build** | Production build completes | `npm run build` succeeds |
| **Tests** | All 8 tests pass | `npm test` or Vitest runs |

---

# 🎓 TEACHING EXAMPLE

**Teacher:** "Why does this student struggle with my math test?"

**Eduagents:** "The student simulation for 'Dyslexic Learner' (overlay) shows:
- Reading Level: 0.35 (6-8 baseline: 0.4-0.7)
- Math Fluency: 0.61 (6-8 baseline: 0.5-0.8, × math modifier 1.1)
- On word-heavy problems, this student takes 1.8× normal time
- Recommended: Reduce linguistic complexity, use diagrams"

**Why?** Because we generated the student from actual class context (6-8 Math), not randomly.

---

# 🏁 LAUNCH READINESS CHECKLIST

Before running Phase 1 implementation:

- [ ] All team members read these 4 docs
- [ ] Rubric values agreed upon (baselines, multipliers)
- [ ] Seeded RNG function exists and tested
- [ ] AstronautRubric loaded from constants file
- [ ] Pipeline reducer handles SET_ASTRONAUT_CONTEXT
- [ ] ASTRONOMER form captures 3 required fields
- [ ] SPACE_CAMP step calls generateAstronautsFromContext()
- [ ] TypeScript strict mode enabled
- [ ] Build passes (0 errors, 0 warnings)
- [ ] All 8 tests pass
- [ ] Manual UI test successful (form → generation → results)

---

**📅 Estimated Phase 1 Duration:** 2-3 days  
**🎯 Next Phase:** Phase 2 (Teacher Notes Persistence)  
**📞 Questions?** Reference the 4 specification documents above

