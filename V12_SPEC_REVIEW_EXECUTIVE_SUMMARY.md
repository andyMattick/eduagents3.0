# 🎯 v1.2 Spec Review: Executive Summary
## What's Built, What's Missing, What's Next

**Date:** February 12, 2026  
**Spec Version:** 1.2 (Merged + Visual Analytics)

---

## 🟢 What's Working Well (Aligned With Spec)

### ✅ Core Architecture
- **Pipeline structure** (10 steps: Launchpad → Dockyard → Foundry → Space Camp → Philosophers → Rewrite → Export)
- **Metaphor layer** (All 7 major stages properly conceptualized)
- **Asteroid models** (Rich Bloom/complexity/novelty metadata)
- **Simulation engine** (Runs Asteroids × Astronauts correctly)
- **Assessment analytics** (Post-analysis stats working)
- **Teacher dashboard** (Assignments tracked, versioning works)

### ✅ Fully Implemented & Ready
- Deterministic problem analysis (Bloom classification, time estimation)
- Raw document generation (AI-powered, no metadata in output)
- Problem extraction and canonicalization (Foundry stage working)
- Student simulation feedback collection
- Rewrite and content modification
- Problem bank persistence

---

## 🔴 Critical Gaps (Must Fix Before v1.2 Release)

### ❌ 1. Astronaut Generation (CRITICAL)

**Problem:** Astronauts are currently **random**. Spec says they should be **context-derived**.

**Current Behavior:**
```typescript
// WRONG: Random overlays, random traits
Overlays: selectRandomOverlays(),  // ADHD, dyslexia, fatigue... randomly chosen
ReadingLevel: gaussianRandom(0.65, 0.15),  // Random value
```

**What Spec Requires:**
```typescript
// RIGHT: Derived from assessment context
interface AstronautGenerationContext {
  gradeBand: string;      // "6-8", "9-12"
  classLevel: string;     // "advanced", "mixed", "struggling"
  subject: string;        // "math", "english", "science"
  timeTargetMinutes: number;
}

// Example: Math class, grades 6-8, mixed level
// → Generate 11 astronauts representing typical class
// → Base reading level on subject (math lower than english)
// → DO NOT add overlays at generation (Space Camp does that)
```

**Impact:** 🔴 **HIGH**
- Breaks entire simulation validity
- Students should represent actual class, not random personas
- Space Camp overlay injection depends on this

**Fix Timeline:** 2-3 days

---

### ❌ 2. Teacher Notes (CRITICAL)

**Problem:** Teachers can add notes in UI, but they're **not persisted to database**.

**Current Behavior:**
- DOCUMENT_NOTES step has textarea
- Notes stored in pipeline state only
- Lost when session ends
- No teacher note retrieval

**What Spec Requires:**
```typescript
interface TeacherNote {
  noteId: string;
  documentId: string;
  problemId?: string;      // Document or problem level
  authorId: string;
  note: string;
  category?: "clarity" | "difficulty" | "alignment";
}
```

**What's Missing:**
- 🔴 `teacher_notes` Supabase table
- 🔴 Service functions (save, retrieve, update)
- 🔴 Problem-level note UI (for Foundry stage)
- 🔴 Note display in Philosopher review

**Impact:** 🔴 **HIGH**
- Teacher feedback lost
- Can't inform rewrite decisions
- No persistence between sessions

**Fix Timeline:** 3 days

---

### ❌ 3. Visual Analytics (HIGH PRIORITY)

**Problem:** Philosophers stage should return **visual artifacts**, but currently only returns accept/reject decision.

**What Spec Requires:**
```typescript
interface VisualizationBundle {
  clusterHeatMap?: string;          // Which problems cluster together?
  bloomComplexityScatter?: string;  // Bloom vs Complexity scatter
  confusionDensityMap?: string;     // Confusion by problem
  fatigueCurve?: string;            // Fatigue accumulation curve
  topicRadarChart?: string;         // Topic coverage
  sectionRiskMatrix?: string;       // Risk by section
}
```

**Current Output:**
- Just stats (score, time, % successful)
- No visual interpretation
- No teacher insight into patterns

**Impact:** 🟡 **MEDIUM**
- Teachers can't visualize patterns
- Limits decision-making confidence
- But assessment still functional without this

**Fix Timeline:** 5 days

---

## 🟡 Important Gaps (Should Fix Before Release)

### 🔄 4. Simulation Overlays (Strategic vs Random)

**Current:** Overlays applied randomly during astronaut generation  
**Spec:** Space Camp should apply overlays **strategically** based on problem difficulty

**Example:**
```typescript
// WRONG: Random at generation
Overlays: selectRandomOverlays()  // 0-2 random overlays per student

// RIGHT: Strategic at simulation time
// If average Bloom > 5 and student is weak reader... add dyslexic overlay
// If test is 60+ minutes... add fatigue_sensitive overlay
```

**Impact:** 🟡 **MEDIUM**
- Simulation results may not reflect true difficulty
- Overlay logic buried in random selection
- But simulation engine itself is correct

**Fix Timeline:** 2 days

---

### 🔄 5. Problem Similarity Index

**Current:** Asteroids have `NoveltyScore` (0-1), but no embeddings  
**Spec:** Store embedding vectors for future writing context

**Missing:**
- 🔄 `problem_similarity_index` table
- 🔄 Embedding generation on problem save
- 🔄 Similarity search API

**Impact:** 🟡 **MEDIUM**
- Important for future problem bank reuse
- Not blocking current functionality
- Nice-to-have for writer context

**Fix Timeline:** 4 days (if using OpenAI embeddings)

---

### 🔄 6. Problem Evolution Tracking

**Current:** Rewrite history in pipeline state only  
**Spec:** Persist version history with teacher notes + feedback applied

**Missing:**
- 🔄 `problem_evolution` table
- 🔄 Version tracking on save
- 🔄 Links between versions and notes

**Impact:** 🟡 **LOW**
- Not blocking current functionality
- Valuable for audit trail
- Can delay to v1.3

**Fix Timeline:** 3 days

---

### 🔄 7. Dashboard Abstraction

**Current:** Dashboard shows assignment with `problemCount`, can navigate to asteroids  
**Spec:** Dashboard should show **missions**, hide asteroid details

**Cosmetic fix (mostly UI labels):**
- Rename "Assignment" → "Mission" (user-facing)
- Hide `problemCount` from cards
- Remove asteroid browsing from dashboard
- Hide astronaut profiles from assessment results
- Show only clustered insights (not per-student results)

**Impact:** 🟡 **LOW**
- Doesn't break functionality
- Pure UX/privacy alignment
- Can be done incrementally

**Fix Timeline:** 2 days

---

## 📊 Gap Summary Table

| Gap | Type | Severity | Effort | Impact |
|-----|------|----------|--------|--------|
| Astronaut derivation | Logic | 🔴 CRITICAL | 2-3d | Can't proceed with valid sims |
| Teacher notes persistence | Feature | 🔴 CRITICAL | 3d | Data loss, no feedback loop |
| Visual analytics | Feature | 🟡 HIGH | 5d | Limited teacher insight |
| Overlay strategy | Logic | 🟡 MEDIUM | 2d | Sims less accurate |
| Similarity index | Feature | 🟡 MEDIUM | 4d | Limits reusability |
| Problem evolution | Feature | 🟡 LOW | 3d | No audit trail |
| Dashboard abstraction | UX | 🟡 LOW | 2d | Privacy/clarity |

---

## 🎯 Recommended Implementation Order

### Week 1: Fix Critical Issues
1. **Astronaut Derivation** (2-3 days)
   - Implement `generateAstronautsFromContext()`
   - Wire assessment intent through pipeline
   - Test with multiple contexts
   
2. **Teacher Notes** (3 days)
   - Add Supabase table + migration
   - Implement service functions
   - Wire UI and persistence

### Week 2: Add High-Value Features
3. **Visual Analytics** (5 days)
   - Design charts
   - Implement generators
   - Integrate into Philosopher review

4. **Overlay Strategy** (1-2 days)
   - Implement strategic overlay injection
   - Test with problem distributions

### Week 3: Polish & Low-Priority Gaps
5. **Problem Similarity + Evolution** (3-4 days combined)
6. **Dashboard Abstraction** (2 days)
7. **Full QA & Testing** (2-3 days)

---

## 🚀 Immediate Next Steps

### To Start Right Now:

1. **Review** `SPECIFICATION_ALIGNMENT_ANALYSIS.md` (detailed analysis)
2. **Create** `004_astronaut_derivation.feature` branch
3. **Implement** Phase 1 (Astronaut Derivation):
   ```typescript
   // In astronautGenerator.ts
   export function generateAstronautsFromContext(
     context: AstronautGenerationContext
   ): Astronaut[] {
     // Base stats from context
     // Core 11 personas representing class
     // NO random overlays
   }
   ```
4. **Update** tests to verify context-based generation
5. **Wire** into `SPACE_CAMP_ANALYSIS` step

### Success Criteria (When Done):
- [ ] Astronauts are derived from gradeBand + classLevel + subject
- [ ] Teacher can write persistent notes
- [ ] Philosophers displays visual analytics
- [ ] Dashboard hides asteroid/astronaut details
- [ ] All tests passing
- [ ] Zero random overlay application at generation

---

## 📝 Files to Review/Modify

### Phase 1 (Astronaut Derivation):
- [ ] `src/agents/simulation/astronautGenerator.ts` (rewrite)
- [ ] `src/hooks/usePipeline.ts` (pass context)
- [ ] `src/components/Pipeline/PipelineShell.tsx` (capture intent)
- [ ] `src/agents/simulation/*.test.ts` (update tests)

### Phase 2 (Teacher Notes):
- [ ] `supabase/migrations/003_*.sql` (new table)
- [ ] `src/services/teacherSystemService.ts` (new functions)
- [ ] `src/components/Pipeline/ProblemNotes.tsx` (new component)
- [ ] `src/types/pipeline.ts` (add TeacherNote interface)

### Phase 3 (Visual Analytics):
- [ ] `src/agents/analytics/visualizations.ts` (new module)
- [ ] `src/types/pipeline.ts` (add VisualizationBundle)
- [ ] `src/components/Pipeline/PhilosopherReview.tsx` (display)

---

## ✅ Build Status

```
Current Production Status:
✅ Pipeline restructured (10 steps working)
✅ Assessment analytics functional
✅ Rewrite engine operational
🔴 Astronaut derivation incomplete
❌ Teacher notes not persisted
❌ Visual analytics missing
🟡 Dashboard exposes too much detail

Estimated Path to v1.2 Complete: 3 weeks
```

---

## Questions for Design Review

1. **Astronaut derivation:** Should we keep predefined personas + context overlay, or generate entirely from scratch?
2. **Visual analytics:** Priority order—which charts matter most for teacher decisions?
3. **Dashboard:** Should we hide problem count entirely, or show aggregated stats (e.g., "Avg 8.5 questions")?
4. **Overlays:** Should Space Camp apply overlays to 10-20% of students, or more strategically based on problem load?

---

## Bottom Line

**The system is ~70% aligned with v1.2 spec.** Critical gaps are in **astronaut generation** and **teacher notes**, which are foundational. Visual analytics is high-value but not blocking. All fixes are straightforward implementations; no architectural issues discovered.

**Recommendation:** Proceed with Phase 1 immediately. Full v1.2 compliance achievable in 3 weeks.
