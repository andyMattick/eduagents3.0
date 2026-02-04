# Phase 2 Implementation — Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ASSIGNMENT PIPELINE                          │
│                                                                     │
│  TEACHER INTERACTION:  [Upload] → [Simulate] → [Review] → [Export] │
│  INTERNAL PHASES:       [1]      →   [2&3]   →   [4&5]  → [Export] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Data Flow

### STEP 1: Upload/Generate Assignment

```
┌──────────────────────────────────┐
│   Teacher Interface              │
│                                  │
│  1. Click "Upload File" or       │
│     "Generate with AI"           │
│                                  │
│  2. Select Grade Level & Subject │
│                                  │
│  3. Click "Continue"             │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│   Output: Assignment Text String     │
│   Example:                           │
│   "1) Define symbolism.              │
│    2) Analyze the use of...          │
│    3) Create an alternative...       │
│    4) Compare Gatsby and Daisy...    │
│    5) Evaluate the narrator's..."   │
└──────────────────────────────────────┘
```

---

### STEP 2: [HIDDEN] Automated Problem Metadata Tagging

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Problem Metadata Tagging (AUTOMATIC - NOT SHOWN)       │
│                                                                  │
│  Input: Assignment Text ("1) Define symbolism. 2) Analyze...")  │
│     ↓                                                             │
│  [extractAsteroidsFromText()]                                   │
│     ↓                                                             │
│  Step 1: extractProblems() → Split by delimiters                │
│     • Problem 1: "Define symbolism" (1 sentence)                │
│     • Problem 2: "Analyze the use of..." (2 sentences)          │
│     • Problem 3: "Create an alternative..." (1 sentence)        │
│     • Problem 4: "Compare Gatsby and Daisy..." (1 sentence)     │
│     • Problem 5: "Evaluate the narrator's..." (1 sentence)      │
│     ↓                                                             │
│  Step 2: classifyBloomLevel() → Map action verbs                │
│     • Define → Remember                                         │
│     • Analyze → Analyze                                         │
│     • Create → Create                                           │
│     • Compare → Analyze                                         │
│     • Evaluate → Evaluate                                       │
│     ↓                                                             │
│  Step 3: calculateLinguisticComplexity() → Score 0.0-1.0        │
│     • Problem 1: 0.38 (simple vocabulary, short)                │
│     • Problem 2: 0.65 (includes "symbolism", jargon)            │
│     • Problem 3: 0.52 (creative task, medium length)            │
│     • Problem 4: 0.45 (compare operation)                       │
│     • Problem 5: 0.72 (evaluate, jargon, longer)                │
│     ↓                                                             │
│  Step 4: calculateSimilarity() → Compare to previous             │
│     • Problem 1: 0.00 (first problem)                           │
│     • Problem 2: 0.15 (different from #1)                       │
│     • Problem 3: 0.22 (different from #2)                       │
│     • Problem 4: 0.35 (similar analysis to #2)                  │
│     • Problem 5: 0.28 (similar eval to #2, but different)       │
│     ↓                                                             │
│  Step 5: recalculateNoveltyScores() → Inverse of avg similarity │
│     • Problem 1: 1.00 (completely novel - first)                │
│     • Problem 2: 0.85 (pretty novel)                            │
│     • Problem 3: 0.78 (novel)                                   │
│     • Problem 4: 0.65 (less novel - similar to #2)              │
│     • Problem 5: 0.72 (fairly novel)                            │
│     ↓                                                             │
│  Output: Asteroid[] {                                            │
│    [{                                                            │
│      ProblemId: "asteroid_1",                                    │
│      ProblemText: "Define symbolism",                            │
│      BloomLevel: "Remember",                                     │
│      LinguisticComplexity: 0.38,                                 │
│      SimilarityToPrevious: 0.00,                                 │
│      NoveltyScore: 1.00,                                         │
│      MultiPart: false,                                           │
│      ProblemLength: 2,                                           │
│      TestType: "free_response",                                  │
│      Subject: "English"                                          │
│    },                                                            │
│    { ... Problem 2 ... },                                        │
│    { ... Problem 3 ... },                                        │
│    { ... Problem 4 ... },                                        │
│    { ... Problem 5 ... }                                         │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
         ↓
    [AUTOMATIC - NO UI]
         ↓
   Jump to STEP 3
```

---

### STEP 3: Student Simulations (Using Phase 2 Metadata)

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 3: Simulate Student Performance (VISIBLE TO TEACHER)   │
│                                                               │
│  Input:                                                       │
│    • Asteroids[] (from Phase 2)                              │
│    • Astronauts[] (11 predefined student personas)           │
│                                                               │
│  Process: For each (Asteroid, Astronaut) pair:               │
│    • Calculate PerceivedSuccess using BloomLevel            │
│    • Calculate TimeOnTask using Complexity + Length          │
│    • Calculate ConfusionSignals using Novelty + Bloom        │
│    • Calculate EngagementScore using all metrics             │
│                                                               │
│  Example: "Create an alternative..." (Asteroid 3) +          │
│           "Struggling Learner" (Astronaut)                   │
│                                                               │
│    BloomLevel = Create (hardest)                             │
│    LinguisticComplexity = 0.52 (medium)                      │
│    NoveltyScore = 0.78 (fairly novel)                        │
│    StudentAbility = 0.45 (reads at 4th grade)                │
│                                                               │
│    PerceivedSuccess = 0.32 (LOW - mismatch!)                 │
│    TimeOnTask = 420 seconds (7 min - longer)                 │
│    ConfusionSignals = 4 (moderate confusion)                 │
│    EngagementScore = 0.38 (might disengage)                  │
│                                                               │
│  Output: StudentFeedback[]                                   │
│    • "🎯 Struggling Learner:"                                │
│    • "Found the creative task challenging"                  │
│    • "May need scaffolding for Create-level thinking"        │
│    • "Time estimate: 7 minutes"                              │
│    • "Engagement: ⭐⭐⭐ (medium - got bored)"                 │
└──────────────────────────────────────────────────────────────┘
         ↓
   [SHOW FEEDBACK TAB - STUDENT FEEDBACK]
   [NEW TAB - VIEW PROBLEM METADATA]
   [SHOW COMPLETION & PERFORMANCE TAB]
```

---

### STEP 3 (Optional): View Problem Metadata Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 VIEW PROBLEM METADATA (OPTIONAL - User clicks tab)          │
│                                                                 │
│  Phase 2 Made Visible to Teacher                               │
│                                                                 │
│  Problem 1: "Define symbolism"                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📚 BLOOM LEVEL       📖 COMPLEXITY    ✨ NOVELTY         │ │
│  │ Remember             38% [██░░]        100% [██████]      │ │
│  │                                                          │ │
│  │ 🔗 STRUCTURE        📏 LENGTH         🔄 SIMILARITY      │ │
│  │ Single part          2 words           0% [░░░░]         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Problem 2: "Analyze the use of symbolism in..."              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📚 BLOOM LEVEL       📖 COMPLEXITY    ✨ NOVELTY         │ │
│  │ Analyze              65% [███░░]      85% [█████░]       │ │
│  │                                                          │ │
│  │ 🔗 STRUCTURE        📏 LENGTH         🔄 SIMILARITY      │ │
│  │ Single part          18 words         15% [█░░░░]        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Problem 3: "Create an alternative ending..."                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📚 BLOOM LEVEL       📖 COMPLEXITY    ✨ NOVELTY         │ │
│  │ Create               52% [███░░]      78% [█████░]       │ │
│  │                                                          │ │
│  │ 🔗 STRUCTURE        📏 LENGTH         🔄 SIMILARITY      │ │
│  │ Single part          17 words         22% [██░░░]        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ... and so on                                                  │
│                                                                 │
│  💡 Insight:                                                    │
│    "This metadata drove the student feedback above.            │
│     Problems with high Bloom + high Complexity + high Novelty  │
│     show lower success rates. Problems with low Bloom + high   │
│     Novelty show higher engagement."                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### STEP 4: Review & Rewrite (Enhanced with Insights)

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 4: Rewriter (Not modified in Phase 2 implementation)  │
│                                                               │
│  Input: Original assignment + tags + insights                │
│                                                               │
│  Process:                                                     │
│    • Read feedback about struggling areas                    │
│    • Simplify high-complexity problems                       │
│    • Adjust Bloom levels to match target                     │
│    • Break multipart questions                               │
│    • Generate accessibility variants                         │
│                                                               │
│  Output: Rewritten assignment with improvements               │
└──────────────────────────────────────────────────────────────┘
         ↓
   [SHOW REWRITE RESULTS TAB]
```

---

### STEP 5: Version Comparison

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 5: Compare Original vs Rewritten (Analytics)          │
│                                                               │
│  Metrics:                                                     │
│    • Bloom coverage before/after                             │
│    • Average complexity before/after                         │
│    • Predicted engagement before/after                       │
│    • Estimated time before/after                             │
│    • At-risk student count before/after                      │
│                                                               │
│  Output:                                                      │
│    ✓ Assignment improved!                                    │
│    ✓ Bloom coverage: 20% → 60%                               │
│    ✓ Avg complexity: 55% → 45%                               │
│    ✓ Est. completion rate: 65% → 85%                         │
└──────────────────────────────────────────────────────────────┘
         ↓
   [EXPORT RESULTS]
```

---

## Code Architecture

```
src/
├── hooks/
│   └── usePipeline.ts
│       ├── analyzeTextAndTags()
│       │   └── extractAsteroidsFromText()  ← PHASE 2
│       │       ├── extractProblems()
│       │       ├── classifyBloomLevel()
│       │       ├── calculateLinguisticComplexity()
│       │       ├── calculateSimilarity()
│       │       └── recalculateNoveltyScores()
│       │
│       ├── getFeedback()
│       │   └── simulateStudents()  ← PHASE 3 (uses Asteroids)
│       │
│       ├── rewriteTextAndTags()  ← PHASE 4
│       ├── compareVersions()     ← PHASE 5
│       └── toggleProblemMetadataView()  ← NEW
│
├── components/Pipeline/
│   ├── PipelineShell.tsx
│   │   ├── [Shows Step 1 only]
│   │   ├── [Hides Step 2 - metadata generation]
│   │   ├── [Shows Step 3 - StudentSimulations]
│   │   │   └── New prop: asteroids, showProblemMetadata
│   │   ├── [Shows Step 4 - RewriteResults]
│   │   └── [Shows Step 5 - VersionComparison]
│   │
│   └── StudentSimulations.tsx
│       ├── Tab: "Student Feedback"
│       ├── Tab: "Completion & Performance"
│       └── Tab: "📋 View Problem Metadata" ← NEW
│           └── Display Asteroid[] with metadata cards
│
└── agents/
    ├── analysis/
    │   └── asteroidGenerator.ts  ← PHASE 2
    │
    ├── simulation/
    │   └── simulationEngine.ts   ← PHASE 3 (uses Asteroids)
    │
    └── pipelineIntegration.ts
        └── extractAsteroidsFromText() ← Orchestrates Phase 2
```

---

## State Management

```typescript
interface PipelineState {
  // Phase 1 (INPUT)
  originalText: string;
  
  // Phase 2 (HIDDEN TAGGING)
  asteroids: Asteroid[];           // ← NEW
  showProblemMetadata: boolean;    // ← NEW (toggle visibility)
  
  // Phase 3 (SIMULATION)
  tags: Tag[];
  studentFeedback: StudentFeedback[];
  
  // Phase 4 (REWRITE)
  rewrittenText: string;
  rewriteSummary: string;
  
  // Phase 5 (COMPARISON)
  tagChanges: TagChange[];
  versionAnalysis?: VersionAnalysis;
  
  // Navigation
  currentStep: PipelineStep;
  isLoading: boolean;
  error?: string;
}
```

---

## Time Complexity

```
Upload → Student Feedback:

Before: O(text + manual tagging)
After:  O(text + automatic tagging ~100ms + simulation)

Example timeline for 5-problem assignment:
  Phase 2 (Automatic):  ~50ms (local calculation)
  Phase 3 (Simulate):   ~200ms (AI for feedback)
  Phase 4 (Rewrite):    ~500ms (AI rewrite)
  Phase 5 (Compare):    ~100ms (local calculation)
  
Total: ~850ms (mostly AI operations)
```

---

## Benefits Summary

| Aspect | Benefit |
|--------|---------|
| **User Experience** | Clean flow; no manual tagging required |
| **Speed** | Instant (<100ms) metadata generation |
| **Transparency** | Optional "View Metadata" tab for curious users |
| **Data Quality** | Complete, structured metadata for simulation |
| **Maintainability** | Phase 2 logic isolated in `asteroidGenerator.ts` |
| **Extensibility** | Easy to add new metadata fields |
| **Debugging** | Can inspect `asteroids` array for troubleshooting |

---

## Next Steps

1. **Run the app** — `npm run dev`
2. **Upload an assignment** — Notice it skips Step 2!
3. **Click "View Problem Metadata"** — See all Phase 2 data
4. **Check feedback** — Notice it aligns with metadata
5. **Try mock data** — `window.demonstrateMockData()` in console

