# Step 2 Implementation — Quick Reference

## What Changed?

✅ **Step 2 (Tag Analysis) is now hidden and automated**

Teachers now see:
1. Upload/Generate assignment
2. **[Automatic tagging happens here — not visible]**
3. Student feedback
4. Rewrite suggestions
5. Version comparison

---

## New User Experience

### Upload Flow
```
User uploads assignment
  ↓
ReviewMetadataForm appears (select grade level + subject)
  ↓
Click "Continue"
  ↓
IMMEDIATELY shows Student Simulations (Step 3)
  ↓ [NOT Step 2: Tag Analysis anymore!]
```

### Optional: View Problem Metadata
```
In Step 3 (Student Simulations):
  ↓
Click "📋 View Problem Metadata" tab
  ↓
See all problems with:
  • Bloom Level (Remember → Create)
  • Linguistic Complexity (%) 
  • Novelty Score (%)
  • MultiPart (Yes/No)
  • Word Count
  • Similarity to Previous (%)
```

---

## What is Phase 2 Doing (Hidden)?

When you upload an assignment, the system automatically:

1. **Extracts problems** — Splits by punctuation/numbers into discrete questions
2. **Classifies Bloom level** — Analyzes action verbs (define→Remember, analyze→Analyze)
3. **Calculates complexity** — Scores 0.0-1.0 based on word length, sentence length, vocabulary
4. **Compares to previous** — Jaccard index similarity to other problems
5. **Calculates novelty** — 1.0 minus average similarity = uniqueness score

**Result:** Each problem becomes an `Asteroid` with complete metadata

---

## Code Changes Summary

### Files Modified

**1. src/hooks/usePipeline.ts**
- Added `extractAsteroidsFromText()` call
- Added `asteroids` to state
- Skip TAG_ANALYSIS step → go directly to STUDENT_SIMULATIONS
- Export `toggleProblemMetadataView()`

**2. src/types/pipeline.ts**
- Added `showProblemMetadata?: boolean`

**3. src/components/Pipeline/PipelineShell.tsx**
- Pass `asteroids`, `showProblemMetadata`, `toggleProblemMetadataView` to StudentSimulations

**4. src/components/Pipeline/StudentSimulations.tsx**
- New tab: "📋 View Problem Metadata"
- Display all asteroids with color-coded metadata
- Explanation of Phase 2 and how it affects Phase 3

---

## Testing

### Quick Test in Browser Console

```javascript
// See what Phase 2 does
window.demonstrateMockData()

// Get mock problems with metadata
const asteroids = window.generateMockAsteroids()
console.table(asteroids.map(a => ({
  Bloom: a.BloomLevel,
  Complexity: (a.LinguisticComplexity * 100).toFixed(0) + '%',
  Novelty: (a.NoveltyScore * 100).toFixed(0) + '%',
  Length: a.ProblemLength,
  MultiPart: a.MultiPart
})))
```

### Manual Test

1. Upload an assignment
2. Notice: Goes straight to "Step 3: Simulated Student Feedback" (NOT Step 2 Tag Analysis)
3. Click "📋 View Problem Metadata" tab
4. See color-coded metrics for each problem
5. High complexity + high Bloom = students will struggle
6. High novelty + low Bloom = good for engagement but manageable

---

## Metadata Meaning

| Metric | Scale | What It Means |
|--------|-------|---------------|
| **Bloom Level** | Remember → Create | Cognitive complexity (Remember is easiest, Create is hardest) |
| **Complexity** | 0-100% | How hard to read/understand (word length, jargon) |
| **Novelty** | 0-100% | How unique vs other problems (0% = copy of another, 100% = completely new) |
| **MultiPart** | Yes/No | Has this problem multiple sub-questions? |
| **Length** | Words | Total word count of the problem |
| **Similarity to Previous** | 0-100% | How similar is this to the problem before it? |

---

## How Phase 2 Affects Phase 3

When Phase 3 simulates student feedback, it uses Phase 2 metadata:

```
Asteroid Metadata → Student Simulation → Feedback

Example:
  Problem = "Create a hypothesis for..." (Bloom: Create, Complexity: 70%)
  Student = "Struggling learner" (Math Fluency: 0.40)
  
  Simulation calculates:
    ✓ PerceivedSuccess = LOW (Create is hard, student struggles)
    ✓ TimeOnTask = LONG (70% complexity + Create)
    ✓ ConfusionSignals = HIGH (Bloom mismatch)
    ✓ Engagement = MEDIUM (Novel problem might engage, but too hard)
    
  Feedback: "This student may struggle with this question."
```

---

## New Return Values from usePipeline()

```typescript
const {
  // ... existing
  asteroids,              // Asteroid[] with Bloom, Complexity, Novelty
  showProblemMetadata,    // boolean for tab visibility
  toggleProblemMetadataView, // () => void
} = usePipeline();
```

---

## UI Changes

### Step 2 (Tag Analysis) → REMOVED from UI

**Before:**
```
Step 2: Tag Analysis [user manually adjusts tags]
```

**After:**
```
[Hidden: Automatic tagging happens here]
```

### Step 3: Student Simulations → ENHANCED

**New tab button:** "📋 View Problem Metadata"

**When clicked, shows:**
- Problem text (first 150 chars)
- 6 color-coded metric cards (Bloom, Complexity, Novelty, Structure, Length, Similarity)
- Progress bars for percentage metrics
- Explanation of Phase 2 and Phase 3 relationship

---

## Error Handling

If `asteroids.length === 0`:
- The "📋 View Problem Metadata" tab doesn't appear
- System falls back to showing only Student Feedback
- No breaking changes

---

## Performance

- **Asteroid generation:** <100ms (included in initial upload)
- **Metadata display:** Instant (pre-calculated)
- **No new API calls:** Uses `extractAsteroidsFromText()` (local)

---

## Future Enhancements

1. **Teacher Overrides** — Click metadata to edit Bloom level before simulation
2. **Rewriter Targeting** — Use metadata to suggest specific problem rewrites
3. **Standards Mapping** — Tag each asteroid to curriculum standards
4. **Complexity Reduction Hints** — "Simplify vocabulary" or "Break into 2 parts"
5. **Time Budget** — "This assignment would take ~45 min for average students"

