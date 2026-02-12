# 🚀 PHASE 1 LAUNCH BRIEF
## Context-Derived Astronaut Generation - Ready to Start

**Date:** February 12, 2026  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Phase:** 1 of 6  
**Duration:** 2-3 days  
**Team Capacity:** 1 developer + optional QA

---

# 📋 EXECUTIVE SUMMARY

**What we're doing:** Replace random student generation with context-derived astronauts based on class grade, level, and subject.

**Why it matters:** 
- Teachers enter "Grades 6-8, Standard, Math" → system generates students that represent that actual class
- Removes randomness and unpredictability
- Enables deterministic, repeatable simulations
- Foundation for all remaining phases

**Effort:** ~2-3 days development + testing

**Risk Level:** 🟢 LOW (well-specified, deterministic, testable)

---

# 🎯 WHAT WE'RE BUILDING

### Before Phase 1 (Current State)
```
Teacher uploads assignment
                ↓
Random astronauts generated (11 students, no pattern)
                ↓
Simulation runs
                ↓
Results (unpredictable class composition)
```

**Problem:** Same assignment, different astronauts every run. Confusing.

### After Phase 1 (Target State)
```
Teacher uploads assignment
                ↓
Teacher specifies: "6-8, Standard, Math"
                ↓
Context-derived astronauts generated (11 students matching that class)
                ↓
Simulation runs
                ↓
Results (consistent, repeatable)
```

**Solution:** Astronauts reflect the actual class context. Deterministic.

---

# 📦 DELIVERABLES

### Code Changes (10 Tasks)
1. Add `AstronautGenerationContext` type
2. Add to pipeline state management
3. Capture assessment intent in ASTRONOMER step form
4. Implement `AstronautRubric` type
5. Implement `generateBaseTraits()` function
6. Implement `generateAstronautsFromContext()` main function
7. Wire SPACE_CAMP_ANALYSIS step to use new generation
8. Create 8-test suite
9. Build verification
10. Manual UI testing

### Documentation (Already Complete ✅)
- ✅ ASTRONAUT_SCORING_RUBRIC_V12.md (complete specification)
- ✅ SPACE_CAMP_API_CONTRACT_V12.md (API contract)
- ✅ PHASE_1_IMPLEMENTATION_CHECKLIST.md (detailed code tasks)
- ✅ PHASE_1_QUICK_REFERENCE.md (patterns & debugging)
- ✅ PHASE_1_DOCUMENTATION_INDEX.md (navigation guide)

---

# 🎓 PHASE 1 SPECIFICATION SUMMARY

### Grade Band Baselines
```
Grades 3-5:   Lower baseline traits (building blocks)
Grades 6-8:   Mid-range traits (transitional)  
Grades 9-12:  Higher baseline traits (advanced)
```

Example (Math):
- 3-5:   Math fluency [0.3, 0.6]  →  avg 0.45
- 6-8:   Math fluency [0.5, 0.8]  →  avg 0.65
- 9-12:  Math fluency [0.6, 0.9]  →  avg 0.75

### Class Level Multipliers
```
Standard:  1.0× (baseline)
Honors:    1.10× (10% higher traits)
AP:        1.20× (20% higher traits)
```

### Subject Modifiers
```
Math:      1.1× math fluency (emphasize math)
English:   1.1× reading level (emphasize reading)
Science:   1.1× reasoning (emphasize critical thinking)
History:   1.1× reading level (emphasize reading)
General:   1.0× all traits (no emphasis)
```

### Calculation Formula
```
For each trait:
  baselineTrait = random(min, max) for grade band
  withClass = baselineTrait × classMultiplier
  withSubject = withClass × subjectModifier
  final = clamp(withSubject, 0.0, 1.0)
```

### 5 Core Traits
```
1. readingLevel    - 0.0 (struggling reader) to 1.0 (advanced)
2. mathLevel       - 0.0 (struggling at math) to 1.0 (advanced)
3. stamina         - 0.0 (easily fatigued) to 1.0 (persistent)
4. reasoning       - 0.0 (concrete) to 1.0 (abstract)
5. confusionTolerance - 0.0 (frustrated easily) to 1.0 (patient)
```

---

# 🏗️ ARCHITECTURE CHANGES

### New Type: AstronautGenerationContext
```typescript
{
  gradeBand: "3-5" | "6-8" | "9-12",
  classLevel: "standard" | "honors" | "AP",
  subject: "math" | "english" | "science" | "history" | "general",
  timeTargetMinutes?: number,
  seed?: number,  // For reproducible generation
}
```

### New Interface: AstronautRubric
Contains:
- `gradeBandBaselines` (3 levels × 5 traits)
- `classLevelMultipliers` (3 levels)
- `subjectModifiers` (5 subjects)
- `overlayMultipliers` (5 overlays)

### New Function: generateAstronautsFromContext()
```typescript
(payload: GenerateAstronautsPayload) => {
  astronauts: Astronaut[],
  log: string[]
}
```

### Pipeline State Addition
```typescript
astronautContext?: AstronautGenerationContext
```

### Pipeline Step: ASTRONOMER_DEFINITION
New form step that captures grade/subject/class level from teacher

---

# ✅ QUALITY GATES

Phase 1 is done when all 8 gates pass:

| Gate | Success Criteria | How to Verify |
|------|-----------------|--------------|
| 🏗️ **Build** | TypeScript compiles, 0 errors | `npm run build` succeeds |
| 🧮 **Calculation** | Formula applied correctly | Test #3 (determinism) passes |
| 🔒 **Clamping** | All traits in [0.0, 1.0] | Test #2 passes |
| 🎭 **Overlays** | Overlays array empty at generation | Test #6 passes |
| 🔄 **Context Flow** | Context captured and transmitted | Manual test: form → generation |
| 📝 **Naming** | Persona names match traits | Manual test: console readable |
| 🔁 **Determinism** | Same seed → same astronauts | Test #3 passes |
| 📊 **Tests** | All 8 unit tests pass | `npm test` output |

---

# 🎬 THE IMPLEMENTATION PROCESS

### Day 1: Setup & Types
**Tasks 1-4** (2-3 hours)
- Add AstronautGenerationContext type
- Add AstronautRubric type
- Update PipelineState
- Update usePipeline.ts

**Output:** Project compiles with new types

### Day 2: Core Logic
**Tasks 5-6** (4-5 hours)
- Implement generateBaseTraits()
- Implement generateAstronautsFromContext()
- Add generation log
- Verify trait ranges

**Output:** Functions work in isolation

### Day 3: Integration & Testing
**Tasks 7-10** (3-4 hours)
- Wire ASTRONOMER form to capture context
- Wire SPACE_CAMP step to use new generation
- Implement 8 unit tests
- Manual UI testing

**Output:** End-to-end flow works

---

# 📚 DOCUMENTATION QUICK LINKS

| When You Need... | See This | Time |
|------------------|----------|------|
| Quick overview | PHASE_1_QUICK_REFERENCE.md | 5 min |
| Exact spec values | ASTRONAUT_SCORING_RUBRIC_V12.md | 20 min |
| API design | SPACE_CAMP_API_CONTRACT_V12.md | 15 min |
| Step-by-step code | PHASE_1_IMPLEMENTATION_CHECKLIST.md | 40 min |
| Navigation help | PHASE_1_DOCUMENTATION_INDEX.md | 10 min |

**Total reading time:** ~90 minutes (thorough immersion)  
**Or skip to:** PHASE_1_IMPLEMENTATION_CHECKLIST.md and reference docs as needed

---

# 🛠️ TECHNICAL SETUP REQUIRED

Before starting:

**Environment:**
- [ ] Node.js 18+ (check: `node --version`)
- [ ] npm 9+ (check: `npm --version`)
- [ ] VS Code with TypeScript extension

**Project:**
- [ ] `npm install` completed
- [ ] `npm run build` works (baseline build time ~14s)
- [ ] `npm run dev` works (can open http://localhost:5173)
- [ ] `npm test` works (can run tests)

**Verification:**
```bash
# Run these to verify setup
npm run build  # Should complete in ~14s with 0 errors
npm test       # Should show Vitest ready
npm run dev    # Should start dev server
```

---

# 👥 TEAM ASSIGNMENTS

### Recommended Setup
**Primary Developer:** Implement Tasks 1-10  
**QA (Optional):** Implement tests, verify quality gates  
**Product Manager:** Track progress, unblock issues  

### Workload
- **Developer:** ~15-20 hours
- **QA:** ~5-8 hours (if separate)
- **Manager:** ~2 hours (check-ins)

### Communication
- Daily standup: 15 min (blockers, progress)
- Code review: Before merge (verify formula, tests)
- Launch checklist: When all tasks complete

---

# 🚦 GO / NO-GO CRITERIA

**GO if:**
- ✅ All 5 spec documents approved
- ✅ Team understands formula and approach
- ✅ Build environment verified
- ✅ Developer capacity available 2-3 days

**NO-GO if:**
- ❌ Questions about specification (clarify first)
- ❌ Build environment broken (fix first)
- ✅ Team bandwidth unavailable (schedule for later)

---

# 📊 SUCCESS METRICS

**When Phase 1 is complete:**

✅ **Functionality:** Astronauts generated from context (not random)  
✅ **Reliability:** Same seed produces same astronauts 100% of the time  
✅ **Correctness:** All traits in [0.0, 1.0] range  
✅ **Quality:** 8 unit tests pass + manual testing complete  
✅ **Build:** Production build succeeds with 0 errors  
✅ **Code:** Zero TypeScript errors, clean merge  

**Teacher Experience:**
- Teacher fills form: "6-8, Standard, Math"
- System generates 11 representative students
- Simulation runs deterministically
- Results reproducible and explainable

---

# 🎯 WHAT'S BLOCKED ON PHASE 1

**Phases 2-6 cannot start until Phase 1 complete:**

Phase 2 (Teacher Notes): Needs pipeline context flow ← from Phase 1  
Phase 3 (Analytics): Needs deterministic astronauts ← from Phase 1  
Phase 4 (Overlays): Needs base traits first ← from Phase 1  
Phase 5 (Evolution): Needs new context system ← from Phase 1  
Phase 6 (Dashboard): Needs all previous phases  

**One critical path item.** Prioritize accordingly.

---

# ⏰ TIMELINE ESTIMATE

```
Day 1:   Setup + Types (2-3 hours)        Start morning
Day 2:   Core Logic (4-5 hours)           Full day
Day 3:   Integration + Testing (3-4 hrs)  Full day
─────────────────────────────────────────────────
Total:   9-12 hours dev + 5-8 hours QA
         = 2-3 calendar days
```

**Ideal:** Start Monday, complete Wednesday  
**Planned completion:** Thursday afternoon code review  
**Phase 2 kickoff:** Friday  

---

# ❓ FREQUENTLY ASKED QUESTIONS

### Q: Can we do Phase 2 while Phase 1 is in progress?
**A:** No. Phase 2 depends on Phase 1 context flow. Complete Phase 1 first.

### Q: What if we find a bug in the rubric specification?
**A:** Update ASTRONAUT_SCORING_RUBRIC_V12.md, re-run tests, document change.

### Q: Do overlays apply during generation?
**A:** No. Overlays apply in Phase 4 (Space Camp). Phase 1 generates base traits only.

### Q: Can we use different seed values per teacher?
**A:** Yes. Seed is optional in context. If omitted, uses Math.random(). If provided, deterministic.

### Q: What if build time exceeds 14s?
**A:** Normal. Might be 12-16s depending on machine. Anything <30s is fine.

### Q: Who approves the code before merge?
**A:** Any team member familiar with spec. Check: formula correct, all tests pass, types clean.

---

# 📞 ESCALATION PATH

**If you're stuck:**

1. **First:** Check PHASE_1_QUICK_REFERENCE.md (debugging checklist)
2. **Second:** Check ASTRONAUT_SCORING_RUBRIC_V12.md (spec verification)
3. **Third:** Check test output (`npm test`) for clue
4. **Fourth:** Ask team (Slack/meeting)
5. **Fifth:** Escalate to product (may need spec clarification)

**Common issues:**
- "Traits all 0.0" → RNG returning wrong values
- "Different users get different astronauts with same seed" → Seed not threaded properly
- "Build fails" → Type mismatch; check imports

---

# 🎉 LAUNCH CHECKLIST

Before writing any code:

**Understanding Phase:**
- [ ] I've read PHASE_1_QUICK_REFERENCE.md
- [ ] I understand the formula
- [ ] I understand why overlays aren't applied here
- [ ] I've asked clarifying questions

**Setup Phase:**
- [ ] Environment verified (`npm run build` works)
- [ ] All 5 spec documents open in tabs
- [ ] PHASE_1_IMPLEMENTATION_CHECKLIST.md ready to follow
- [ ] Editor with TypeScript strict mode enabled

**Team Phase:**
- [ ] Team kickoff scheduled (optional)
- [ ] Daily standup time agreed
- [ ] Code review process defined
- [ ] Slack channel ready for questions

**Go Decision:**
- [ ] [ ] All above checked?
- [ ] [ ] Ready to start?

**❌ IF NO** → Address blockers above  
**✅ IF YES** → Begin with PHASE_1_IMPLEMENTATION_CHECKLIST.md Task 1

---

# 🚀 NEXT STEPS

**Immediate (Today):**
1. Distribute phase 1 documents to team
2. Read PHASE_1_QUICK_REFERENCE.md as group (15 min)
3. Answer clarifying questions
4. Verify build environment

**Tomorrow (Day 1):**
1. Dev starts Task 1 in PHASE_1_IMPLEMENTATION_CHECKLIST.md
2. Daily standup at [TIME]
3. QA reviews spec and prepares test environment

**Day 2-3:**
1. Dev completes Tasks 1-10
2. QA runs tests, verifies gates
3. Code review with rubric expert
4. Merge to main

**Thursday:**
1. Phase 1 complete, passes all gates
2. Phase 2 planning kickoff
3. Celebrate! 🎉

---

# 📋 FINAL READINESS CHECKLIST

Execute this before typing code:

**Technical:**
- [ ] `node --version` → 18 or higher
- [ ] `npm run build` → completes in ~14s
- [ ] `npm test` → Vitest ready
- [ ] `npm run dev` → starts successfully
- [ ] VS Code open with TypeScript extension

**Documentation:**
- [ ] PHASE_1_QUICK_REFERENCE.md read
- [ ] ASTRONAUT_SCORING_RUBRIC_V12.md available
- [ ] PHASE_1_IMPLEMENTATION_CHECKLIST.md open
- [ ] All 5 spec docs in bookmarks

**Team:**
- [ ] Developer assigned
- [ ] QA assigned (if applicable)
- [ ] Manager briefed
- [ ] 2-3 day time block protected

**Questions:**
- [ ] No blockers on understanding spec
- [ ] No blockers on environment
- [ ] Team aligned on approach

**Decision:**
```
START PHASE 1 IMPLEMENTATION?
    
    [ ] YES - Begin with Task 1
    [ ] NO  - Address blockers above
```

---

# 🎓 LEARNING RESOURCES

If you want deeper context:

**On Educational Assessment:**
- "Bloom's Taxonomy Revised" - Anderson & Krathwohl
- "Universal Design for Learning" - CAST framework
- "Accessibility in K-12" - WCAG 2.1 standards

**On Simulation:**
- "Discrete Event Simulation" - Banks, Carson, Nelson, Nicol
- "Student Modeling" - VanLehn (research paper)

**For this project:**
- ASTRONAUT_SCORING_RUBRIC_V12.md (pedagogy)
- SPACE_CAMP_API_CONTRACT_V12.md (system design)

---

**🎯 Status:** ✅ READY FOR LAUNCH  
**📅 Start Date:** [TODAY]  
**⏱️ Duration:** 2-3 calendar days  
**🎉 Expected Completion:** [+3 DAYS]  

---

**Questions?** Reference documentation above or ask team.  
**Ready?** Begin with PHASE_1_IMPLEMENTATION_CHECKLIST.md Task 1.  
**Go!** 🚀

