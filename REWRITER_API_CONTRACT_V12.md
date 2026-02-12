# 📝 REWRITER API CONTRACT V1.2 (FINAL)
## Dockyard Rewrite Specification

**Status:** Production  
**Last Updated:** 2026-02-12  
**Version:** 1.2 (final)  

---

## ⚠️ Core Principle

The **Rewriter is the ONLY stage allowed to change assessment content**. It is content-only, never mutates metadata, never changes IDs.

---

## 1️⃣ REWRITER INPUT: RewriteRequest

```typescript
interface RewriteRequest {
  documentId: string;                     // current document
  version: number;                        // current version number
  problems: UniversalProblem[];           // canonical, immutable problem objects
  teacherNotes: TeacherNote[];            // document-level + problem-level notes
  selectedFeedback: FeedbackItem[];       // chosen from Philosopher output
  clusterReport: ClusterReport;           // Observatory output (simulation analysis)
  simulationSummary: SimulationSummary;   // confusion, fatigue, success rates
  generationContext: {
    gradeBand: string;
    classLevel: string;
    subject: string;
    timeTargetMinutes: number;
  };
}
```

### Input Rules: What's Immutable

**Problems ARE immutable.** The Rewriter may not change:
- `problemId` ← LOCKED
- `bloomLevel` ← LOCKED
- `linguisticComplexity` ← LOCKED
- `estimatedTimeMinutes` ← LOCKED
- Any canonical metadata ← LOCKED

**TeacherNotes** may influence rewrites but never override metadata.

**SelectedFeedback** is the ONLY actionable guidance. Not all Philosopher feedback drives rewrites.

**ClusterReport & SimulationSummary** provide context, not commands.

**GenerationContext** helps the Rewriter maintain grade-appropriate tone and difficulty.

---

## 2️⃣ REWRITER OUTPUT: RewriteResponse

```typescript
interface RewriteResponse {
  newVersion: number;                     // version + 1
  rewrittenProblems: RewrittenProblem[];  // content changes only
  rewriteSummary: RewriteSummary;         // what changed and why
}
```

---

## 3️⃣ RewrittenProblem Structure

```typescript
interface RewrittenProblem {
  problemId: string;                      // same as input (immutable)
  originalText: string;                   // for audit trail
  rewrittenText: string;                  // new student-facing text
  rationale: string;                      // why this rewrite was made
}
```

### Rewritten Problem Rules

**problemId must not change.**

**rewrittenText must preserve:**
- Original intent
- Cognitive demand (Bloom level)
- Estimated time
- Structure (unless feedback explicitly says otherwise)

**rationale must be:**
- Short and clear
- Tied to specific sources:
  - Which teacher note(s) influenced this
  - Which feedback item(s) from selectedFeedback
  - Which simulation signals (e.g., "confusion spike", "fatigue pattern")
  - Which cluster findings

---

## 4️⃣ RewriteSummary Structure

```typescript
interface RewriteSummary {
  totalProblemsRewritten: number;
  
  changesByProblem: {
    problemId: string;
    appliedFeedbackIds: string[];         // which feedback items drove this
    teacherNotesUsed: string[];           // which teacher notes were referenced
    simulationSignalsUsed: string[];      // e.g., "confusion_spike", "fatigue_pattern"
  }[];
  
  globalChanges: string[];                // e.g., "smoothed Bloom jump between problems 4-5"
}
```

### RewriteSummary Rules

**Must be deterministic** — Exact same reasoning every time.

**Must list exactly which feedback items influenced each rewrite** — Links back to Philosopher output.

**Must list which teacher notes were used** — Audit trail to teacher intent.

**Must list which simulation signals were relevant** — References to clusterReport/simulationSummary.

**Must include global changes if any** — Pacing adjustments, Bloom jump corrections, etc.

---

## 5️⃣ What the Rewriter CAN Change

✅ Rewrite problem text  
✅ Improve clarity  
✅ Adjust pacing  
✅ Reduce ambiguity  
✅ Simplify wording (without lowering cognitive demand)  
✅ Increase scaffolding (if feedback demands it)  
✅ Reduce scaffolding (if feedback demands it)  
✅ Reorder problems (only if feedback explicitly instructs)  
✅ Remove/replace a problem (only if feedback explicitly instructs)  

---

## 6️⃣ What the Rewriter CANNOT Change

❌ Problem IDs  
❌ Bloom levels  
❌ Complexity ratings  
❌ Estimated time  
❌ Canonical metadata  
❌ Number of problems (unless feedback explicitly instructs)  
❌ Teacher's mission context  
❌ Scoring rules  
❌ Overlays  
❌ Simulation logic  
❌ Cluster logic  
❌ Philosopher's output  

**The Rewriter is content-only.**

---

## 7️⃣ Versioning Rules

```
newVersion = oldVersion + 1
```

- Every rewrite increments the version
- Version numbers are integers
- No branching
- No overwriting
- No mutation of previous versions
- Each version is a complete snapshot

---

## 8️⃣ Determinism Requirements

Given the same:
- problems
- teacher notes
- selectedFeedback
- clusterReport
- simulationSummary
- generationContext

…**the Rewriter must produce the same output every time.**

- No randomness
- No temperature
- No creativity beyond the constraints
- Same seed = deterministic outcome

---

## 9️⃣ Example: RewriteResponse

### Input: RewriteRequest
```json
{
  "documentId": "doc_math_6b_v2",
  "version": 2,
  "problems": [
    {
      "ProblemId": "p_001",
      "Content": "A train leaves Chicago...",
      "BloomLevel": "Apply",
      "LinguisticComplexity": 0.65,
      "EstimatedTimeMinutes": 3.0
    }
  ],
  "selectedFeedback": [
    {
      "feedbackId": "fb_042",
      "category": "clarity",
      "affectedProblems": ["p_001"],
      "recommendation": "Problem is ambiguous about direction. Add 'eastbound'."
    }
  ],
  "teacherNotes": [
    {
      "problemId": "p_001",
      "note": "Students asking about direction"
    }
  ]
}
```

### Output: RewriteResponse
```json
{
  "newVersion": 3,
  "rewrittenProblems": [
    {
      "problemId": "p_001",
      "originalText": "A train leaves Chicago...",
      "rewrittenText": "An eastbound train leaves Chicago traveling at 60 mph...",
      "rationale": "Feedback fb_042 identified ambiguity. Teacher note confirmed students asked about direction. Added directional clarity without changing cognitive demand (Apply level preserved)."
    }
  ],
  "rewriteSummary": {
    "totalProblemsRewritten": 1,
    "changesByProblem": [
      {
        "problemId": "p_001",
        "appliedFeedbackIds": ["fb_042"],
        "teacherNotesUsed": ["tn_088"],
        "simulationSignalsUsed": ["clarity_confusion"]
      }
    ],
    "globalChanges": []
  }
}
```

---

## 🔟 Implementation Pattern

```typescript
export async function rewriteAssignment(
  request: RewriteRequest
): Promise<RewriteResponse> {
  
  // 1. Validate inputs (problems immutable, selectedFeedback only)
  validateImmutableProblems(request.problems);
  validateSelectedFeedbackOnly(request.selectedFeedback);
  
  // 2. For each problem with feedback:
  const rewrittenProblems: RewrittenProblem[] = [];
  for (const feedback of request.selectedFeedback) {
    for (const problemId of feedback.affectedProblems) {
      const problem = request.problems.find(p => p.ProblemId === problemId);
      
      // 3. Generate rationale with audit trail
      const rationale = buildRationale(
        feedback,
        request.teacherNotes.filter(n => n.problemId === problemId),
        request.simulationSummary
      );
      
      // 4. Rewrite text (preserve Bloom, time, intent)
      const rewrittenText = await callClaudeForRewrite(
        problem.Content,
        feedback,
        request.generationContext
      );
      
      // 5. Verify Bloom level preserved
      verifyBloomPreserved(problem.BloomLevel, rewrittenText);
      
      rewrittenProblems.push({
        problemId,
        originalText: problem.Content,
        rewrittenText,
        rationale
      });
    }
  }
  
  // 6. Build summary with complete audit trail
  const rewriteSummary = buildSummary(
    rewrittenProblems,
    request.selectedFeedback,
    request.teacherNotes
  );
  
  return {
    newVersion: request.version + 1,
    rewrittenProblems,
    rewriteSummary
  };
}
```

---

## Testing Requirements

### Unit Test Template
```typescript
describe('Rewriter API Contract', () => {
  test('Input problems are never mutated', () => {
    const request: RewriteRequest = { /* ... */ };
    const originalProblems = JSON.parse(JSON.stringify(request.problems));
    
    await rewriteAssignment(request);
    
    expect(request.problems).toEqual(originalProblems);
  });

  test('Output version = input version + 1', async () => {
    const request: RewriteRequest = { version: 2, /* ... */ };
    const response = await rewriteAssignment(request);
    expect(response.newVersion).toBe(3);
  });

  test('All rewritten problems have problemId from input', async () => {
    const response = await rewriteAssignment(request);
    response.rewrittenProblems.forEach(rp => {
      const exists = request.problems.find(p => p.ProblemId === rp.problemId);
      expect(exists).toBeDefined();
    });
  });

  test('Rewriter is deterministic', async () => {
    const result1 = await rewriteAssignment(request);
    const result2 = await rewriteAssignment(request);
    
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  test('Rationale links to feedback, teacher notes, simulation signals', async () => {
    const response = await rewriteAssignment(request);
    response.rewriteSummary.changesByProblem.forEach(change => {
      expect(change.appliedFeedbackIds.length).toBeGreaterThan(0);
      expect(change.rationale).toMatch(/feedback|teacher|simulation/i);
    });
  });

  test('Only selectedFeedback drives rewrites, not all feedback', () => {
    // Verify that feedback NOT in selectedFeedback doesn't cause rewrites
    const selectedIds = request.selectedFeedback.map(f => f.feedbackId);
    const summary = response.rewriteSummary;
    
    summary.changesByProblem.forEach(change => {
      change.appliedFeedbackIds.forEach(feedbackId => {
        expect(selectedIds).toContain(feedbackId);
      });
    });
  });
});
```

---

## FAQ

**Q: Can the Rewriter change problem order?**  
A: Only if `selectedFeedback` explicitly instructs it with a reason.

**Q: Can the Rewriter add new problems?**  
A: Only if `selectedFeedback` explicitly instructs removal/replacement.

**Q: Can the Rewriter lower complexity?**  
A: Only text simplification. Cannot change the `linguisticComplexity` rating.

**Q: How are teacher notes used?**  
A: As context and corroboration, not as commands. Must still be tied to `selectedFeedback`.

**Q: What if Rewriter disagrees with feedback?**  
A: Rewriter processes what it's given. Philosopher and teacher made selectFeedback decision upstream.

**Q: How does Rewriter know about simulation results?**  
A: Via `simulationSummary` (summary stats) and `clusterReport` (detailed analysis). Not allowed to re-interpret them—only use as context.

---

## ✅ Contract Verification Checklist

```
✓ RewriteRequest interface fully specified
✓ Problem immutability explicitly enforced
✓ selectedFeedback is actionable guidance (not all feedback)
✓ RewriteResponse with audit trail (changesByProblem)
✓ Rationale required for each change
✓ Version increment guaranteed (n → n+1)
✓ Determinism strict (same input = same output)
✓ What CAN change: text, clarity, pacing, scaffolding
✓ What CANNOT change: IDs, Bloom, complexity, time, metadata
✓ Audit trail complete (feedback IDs, notes used, simulation signals)
✓ Testing template includes determinism & immutability checks
✓ Integration points clear (Observatory → Philosopher → Rewriter → Teacher)
```

---

## 📊 Contract Summary

**INPUT:** RewriteRequest (problems immutable, selectedFeedback only, Observatory data as context)  
**OUTPUT:** RewriteResponse (newVersion, rewrittenProblems with rationale, audit trail)  
**GUARANTEE:** Deterministic, immutable problem metadata, content-only changes, complete audit trail  
**VERSIONING:** newVersion = oldVersion + 1 (no mutations, no branching)  

**Status:** ✅ Production ready (v1.2 FINAL)

---

## Code Location

**Main export:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts`  
**Hook:** `src/hooks/useRewrite.ts`  
**UI:** `src/components/Pipeline/RewriteComparisonStep.tsx`  

---

## Integration Point

```
Teacher Reviews Philosopher Feedback
    ↓
Teacher selects specific feedback items → "selectedFeedback"
    ↓
Rewriter receives RewriteRequest (not all feedback, just selected)
    ↓
Rewriter preserves immutable metadata
    ↓
Rewriter returns RewriteResponse with audit trail
    ↓
New version stored (no mutation of previous version)
    ↓
Teacher sees before/after comparison
```
