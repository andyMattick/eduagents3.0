# AI Copilot Instructions for eduagents3.0

## Project Overview

**eduagents3.0** transforms static educational assessments into dynamic, multidimensional simulations. Teachers author or upload assignments (PDF, Word, in-app), which are decomposed into **Asteroids** (tagged problems) and evaluated against **Astronauts** (student profiles) through a unified simulation engine that produces actionable analytics and intelligent rewrites.

### Core Philosophy
- **Problem-centric tagging**: Every problem is decomposed with Bloom's taxonomy, linguistic complexity, and novelty scores
- **Learner profiling**: Students represented as personas with overlays (ADHD, fatigue sensitivity) and trait profiles
- **Simulation-driven feedback**: Rich StudentProblemInput objects model realistic interactions, producing aggregated analytics
- **Iterative refinement**: Rewriter adjusts difficulty, clarity, and coverage based on simulation output

---

## Architecture: Five Phases

### Phase 1: Document Ingestion → Asteroids
**Files**: `src/agents/shared/parseFiles.ts`, `src/agents/shared/assignmentMetadata.ts`

- **Input**: PDF, Word, or in-app text
- **Processing**:
  - Parse documents (PDF via `pdfjs-dist`, Word via `mammoth`, plain text)
  - Extract discrete problems/questions
  - Tag each with:
    - `BloomLevel`: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
    - `LinguisticComplexity`: 0.0–1.0 (use Flesch-Kincaid or word rarity)
    - `SimilarityToPrevious`: 0.0–1.0 (cosine similarity of embeddings)
    - `NoveltyScore`: 0.0–1.0 (inverse of similarity)
    - `MultiPart`: boolean
    - `ProblemLength`: word count or step count
- **Output**: Array of `Asteroid` objects (currently represented as problems with metadata in `GeneratedAssignment`)

**Key Files to Reference**:
- `src/agents/shared/generateAssignment.ts` — Mock problem templates by type
- `src/agents/analysis/analyzeTags.ts` — Tag extraction and classification
- `src/agents/analysis/types.ts` — `BloomLevel` and `TagFrequencyEntry` definitions

---

### Phase 2: Student Creation → Astronauts
**Files**: `src/agents/simulation/accessibilityProfiles.ts`, `src/components/Pipeline/LearnerProfileWeighting.tsx`

- **Input**: Teacher-defined or AI-generated student profiles
- **Output**: `Astronaut` objects with:
  - `StudentId`: unique identifier
  - `Overlays`: accessibility/learning needs (e.g., "adhd", "dyslexic", "fatigue_sensitive")
  - `NarrativeTags`: learning characteristics (e.g., "focused", "curious", "visual-learner")
  - `ProfileTraits`:
    - `ReadingLevel`: 0.0–1.0
    - `MathFluency`: 0.0–1.0
    - `AttentionSpan`: 0.0–1.0
    - `Confidence`: 0.0–1.0

**Key Files to Reference**:
- `src/agents/simulation/accessibilityProfiles.ts` — Predefined learner profiles
- `src/types/assignmentTypes.ts` — Assignment type distributions inform student matching

---

### Phase 3: Simulation Engine → Gameplay
**Files**: `src/agents/simulation/simulateStudents.ts`, `src/agents/analysis/completionSimulation.ts`

- **Input**: All Asteroids + All Astronauts
- **Process**:
  - For each (Student, Problem) pair, generate `StudentProblemInput`:
    - `PerceivedSuccess`: 0.0–1.0 based on student traits vs. problem BloomLevel
    - `TimeOnTask`: seconds = ProblemLength × (1 + LinguisticComplexity + BloomWeight)
    - `TimePressureIndex`: >1 = rushed, <1 = relaxed
    - `FatigueIndex`: 0.0–1.0 cumulative from prior problems
    - `ConfusionSignals`: integer (triggered by high novelty, complexity, Bloom mismatch)
    - `EngagementScore`: 0.0–1.0 inferred from novelty, success, fatigue
- **Output**: `StudentFeedback[]` with `timeToCompleteMinutes`, `understoodConcepts`, `struggledWith`, `atRiskProfile`

**Key Files to Reference**:
- `src/agents/simulation/simulateStudents.ts` — Main simulation engine; stores payload in `lastSimulateStudentsPayload` for verification
- `src/agents/analysis/completionSimulation.ts` — Bloom-based time estimation
- `src/agents/analysis/timeEstimation.ts` — Student persona time modeling

---

### Phase 4: Aggregated Analysis
**Files**: `src/agents/analysis/analyzeAssignment.ts`, `src/agents/analytics/analyzeVersions.ts`

Produces four aggregation levels:

1. **Per-Problem Analytics**:
   - Average time on task
   - Confusion hotspots (high ConfusionSignals)
   - Bloom-level distribution across student personas

2. **Per-Student Analytics**:
   - Engagement arc (novelty → success → fatigue trajectory)
   - Predicted performance (GPA estimate)

3. **Test-Level Summary**:
   - Total estimated duration
   - Bloom taxonomy coverage (%)
   - Novelty and redundancy curves

4. **Predicted Completion Rate**: % of student personas expected to finish within time limit

**Key Files to Reference**:
- `src/agents/analysis/types.ts` — `AssignmentAnalysis`, `StudentSimulation`
- `src/agents/analytics/analyzeVersions.ts` — Version-to-version impact analysis

---

### Phase 5: Rewriter Input
**Files**: `src/agents/rewrite/rewriteAssignment.ts`

- **Input**: Simulation results + optional teacher suggestions
- **Behavior**: Rewrite problems to:
  - Adjust Bloom levels (e.g., "Remember" → "Understand")
  - Reduce linguistic complexity (simpler vocabulary, shorter sentences)
  - Break up multipart questions
  - Improve novelty balance (spread out similar questions)
  - Generate accessibility variants (ADHD-friendly layout, dyslexia-optimized fonts)
- **Output**: Rewritten assignment + summary of changes + updated Asteroid metadata

---

## Data Flow & Integration Points

### Main Pipeline (React Hook)
**File**: `src/hooks/usePipeline.ts`

The `usePipeline()` hook orchestrates five steps:

1. **INPUT**: User enters text/uploads file
2. **TAG_ANALYSIS**: `analyzeTags()` extracts Bloom levels and pedagogical tags
3. **STUDENT_FEEDBACK**: `simulateStudents()` runs Astronaut simulation
4. **REWRITE**: `rewriteAssignment()` generates improved version
5. **ANALYSIS**: `analyzeVersions()` compares before/after

**State Structure** (`PipelineState`):
- `originalText`: raw assignment content
- `tags`: extracted `Tag[]` with confidence scores
- `studentFeedback`: `StudentFeedback[]` from all personas
- `assignmentMetadata`: `{ gradeLevel, subject, difficulty }`
- `selectedStudentTags`: filter for specific learner profiles
- `rewrittenText`, `rewriteSummary`: output from rewriter

### Component Tree
**Root**: `src/components/Pipeline/PipelineShell.tsx`
- **AssignmentInput** → `usePipeline.analyzeTextAndTags()`
- **TagAnalysis** → displays tags, allows manual adjustment
- **StudentSimulations** → displays per-persona feedback
- **RewriteResults** → shows rewritten content
- **VersionComparison** → metrics before/after

### API Payloads
All async operations store their input payloads for verification:
- `simulateStudents()` → `lastSimulateStudentsPayload` (see `src/agents/simulation/simulateStudents.ts`)
- Use `getLastSimulateStudentsPayload()` to inspect actual data passed

---

## Critical Patterns & Conventions

### 1. **Bloom's Taxonomy as Central Classifier**
Every problem and expected student response is classified by Bloom level. Use when:
- Estimating problem difficulty
- Predicting student struggle points
- Generating assessment rubrics
- Rewriting for accessible versions

**Example** (`src/agents/analysis/types.ts`):
```typescript
type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
```

### 2. **Learner Overlays for Accessibility**
Rather than hard-coding ADHD or dyslexia logic, use overlays:
- `"adhd"` → shorter tasks, frequent checkpoints
- `"dyslexic"` → sans-serif fonts, avoid light colors
- `"fatigue_sensitive"` → reduce cumulative load

See `src/agents/simulation/accessibilityProfiles.ts` for predefined profiles.

### 3. **Time Estimation as Simulation Output**
Never hardcode time estimates. Derive from:
```
TimeOnTask = ProblemLength × (1 + LinguisticComplexity + BloomWeight)
TimePressureIndex = (RemainingTime / EstimatedTimeLeft)
```

Reference: `src/agents/analysis/timeEstimation.ts`, `src/agents/analysis/completionSimulation.ts`

### 4. **Payload Verification Pattern**
Before major operations, capture input payload for debugging:
```typescript
const payload: SimulateStudentsPayload = {
  assignmentText: assignmentText.substring(0, 500),
  textMetadata: { /* ... */ },
  assignmentMetadata: { /* ... */ },
  processingOptions: { /* ... */ },
  timestamp: new Date().toISOString(),
};
lastSimulateStudentsPayload = payload;
```

This allows post-hoc verification that metadata was correctly transmitted.

### 5. **Version Comparison Workflow**
Always compare original and rewritten assignments:
- Extract tags from both
- Run simulation on both
- Use `analyzeVersions()` to quantify improvements
- Report: "Bloom coverage improved from X% to Y%, average time reduced from M to N minutes"

---

## Build & Test Commands

```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Production build
npm run preview  # Preview built version
npm test         # Run Vitest suite
```

Key test files:
- `src/agents/**/__tests__/` (when adding unit tests)
- Simulation is integration-tested via `usePipeline.ts`

---

## Project Dependencies

**Core Libraries**:
- **React 19** — UI framework
- **Vite 5** — Build tool
- **TypeScript 5.6** — Type safety
- **pdfjs-dist** — PDF parsing (uses `/public/pdf.worker.min.js`)
- **mammoth** — Word document parsing
- **jspdf** — PDF export

**Testing**:
- **Vitest** — Test runner
- **@testing-library/react** — Component testing

---

## Common Development Tasks

### Adding a New Learner Overlay
1. Define trait schema in `src/agents/simulation/accessibilityProfiles.ts`
2. Add feedback templates referencing the overlay
3. Update `StudentProblemInput` logic to adjust metrics (e.g., reduce `AttentionSpan` for ADHD)
4. Test via `StudentSimulations` component

### Adding a New Problem Tag
1. Add tag name to `commonTags[]` in `src/agents/analysis/analyzeAssignment.ts`
2. Define Bloom classification in `classifyBloomLevel()`
3. Update `src/agents/analysis/types.ts` if adding new tag type
4. Re-run simulation to verify tag extraction

### Implementing a Rewrite Rule
1. Open `src/agents/rewrite/rewriteAssignment.ts`
2. Add rule to `GeneratedRewriteRule[]` array (e.g., "simplify-language", "break-multipart")
3. Implement rule logic that modifies problem text and updates metadata
4. Test on sample assignment via UI

### Debugging Payload Flow
1. Open browser DevTools (F12) → Console
2. Import and run: `getLastSimulateStudentsPayload()`
3. Inspect to verify `assignmentMetadata`, `selectedStudentTags`, and `processingOptions` were passed correctly
4. Check `src/agents/simulation/simulateStudents.ts` line ~80 for payload construction

---

## File Structure Summary

```
src/
├── agents/
│   ├── analysis/          # Bloom classification, tag extraction, time estimation
│   ├── simulation/        # Astronaut profiles, student feedback generation
│   ├── rewrite/           # Problem rewriting engine
│   ├── shared/            # Document parsing, assignment metadata
│   └── analytics/         # Version comparison
├── components/
│   ├── Pipeline/          # Main UI workflow (5 steps)
│   └── Analysis/          # Dashboard components
├── hooks/
│   └── usePipeline.ts     # State management + orchestration
├── types/
│   ├── pipeline.ts        # PipelineState, StudentFeedback
│   └── assignmentTypes.ts # Assignment type templates, Bloom distributions
└── lib/
    └── supabaseClient.ts  # (Future: backend integration)
```

---

## Key Insights for AI Agents

1. **Simulation is the heartbeat**: Every decision (rewrite rule, time estimate, Bloom classification) is validated through the simulation engine. Always run simulation before and after changes.

2. **Overlays over hard-coded logic**: Avoid if-statements like `if (studentHasAdhd)`. Instead, use the overlay pattern to compose behavior.

3. **Metadata flows end-to-end**: Grade level, subject, and learner profiles are threaded from `usePipeline` → `simulateStudents()` → `StudentFeedback`. Never drop metadata.

4. **Version comparison is proof**: When optimizing, always compare original vs. rewritten via `analyzeVersions()`. Metrics tell the true story.

5. **PDF parsing preserves layout**: The PDF parser (`parseFiles.ts`) respects line and page breaks. Respect this structure when extracting problems.

---

## References

- **Bloom's Taxonomy**: Use verbs in instructions to classify level (e.g., "analyze" = Analyze, "remember" = Remember)
- **Flesch-Kincaid Grade Level**: Basis for LinguisticComplexity (convert 0.0–1.0)
- **Accessibility Standards**: WCAG 2.1 for overlay definitions
- **Time Estimation Model**: See `completionSimulation.ts` for formula derivation
