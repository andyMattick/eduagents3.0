# Autonomous Problem Learning System

## Overview

The Writer service has an **autonomous learning layer** that improves problems after generating them—without any teacher involvement or visibility.

**Key Principle**: Teachers never see how this works. They only see better problems.

---

## How It Works

### Phase 1: Initial Generation (Standard)
Teacher enters a prompt → Writer generates an assignment using Gemini

### Phase 2: Autonomous Refinement (Hidden)
After generation, the system:

1. **Searches Problem Bank**
   - Looks for previous problems with similar:
     - Subject matter
     - Bloom's cognitive level  
     - Topic keywords

2. **Identifies Unsuccessful Problems**
   - Filters for problems that had poor performance:
     - Low success rate (<30%)
     - High confusion signals (>2.5)
     - Low student engagement (<0.4)
     - Marked as "problematic" by teacher

3. **Extracts Lessons**
   - "These similar problems were confusing because..."
   - "These had low engagement because..."
   - "These were too difficult because..."

4. **Calls Writer Again (Refinement)**
   - Tells Gemini: "Similar problems failed for these reasons, improve to avoid them"
   - Keeps same Bloom level and structure
   - Improves only clarity, engagement, scaffolding

5. **Returns Refined Problem**
   - Teacher receives the improved version
   - Teacher never knows refinement happened

---

## Data Structures

### Success Metrics (added to Problem Bank entries)

```typescript
successMetrics?: {
  averageSuccessRate: number;           // 0-1, from simulation
  averageConfusionSignals: number;      // 0-5, higher = worse
  averageEngagementScore: number;       // 0-1, higher = better
  totalStudentsExposed: number;         // How many students tried this
  flaggedAsProblematic: boolean;        // Teacher marked it
  problemDescription?: string;          // "High confusion, low engagement"
  suggestedImprovements?: string[];     // ["Clarify wording", "Add examples"]
}
```

These populate **automatically** after simulations (Phase 3 of pipeline).

---

## Integration Points

### For Teachers (No Changes Needed)
Teachers use the Pipeline normally:
- Upload assignment
- See problems generated
- Run simulation
- See feedback + analytics

The learning happens behind the scenes.

### For Developers (Optional Hookup)

#### Option 1: Use Enhanced Generator
```typescript
import { generateAssignmentWithAutonomousLearning } from '@/agents/analysis/generatorWithLearning';

const improved = await generateAssignmentWithAutonomousLearning(
  {
    prompt: "Explain photosynthesis",
    type: "essay",
    gradeLevel: "9-10",
    subject: "Biology"
  },
  {
    enableAutonomousRefinement: true,
    problemBankEntries: theProblemBankData,  // Optional: provide if you have it
    teacherId: currentUser.id
  }
);
```

#### Option 2: Wire Into Pipeline
In `usePipeline.ts`, after `aiService.generateAssignment()` call:
```typescript
// Current
const result = await aiService.generateAssignment({...});

// Enhanced
import { generateAssignmentWithAutonomousLearning } from '@/agents/analysis/generatorWithLearning';

const result = await generateAssignmentWithAutonomousLearning({...}, {
  enableAutonomousRefinement: true,
  problemBankEntries: await searchProblemBank(teacherId, subject),
  teacherId
});
```

#### Option 3: Update Problem Bank After Simulation
After a teacher finishes an assessment:
```typescript
import { updateProblemBankWithSimulationResults } from '@/agents/analysis/generatorWithLearning';

await updateProblemBankWithSimulationResults(
  assignmentId,
  problems,           // [{ id, bloomLevel }, ...]
  simulationResults,  // [{ problemId, successRate, confusion, engagement, ... }, ...]
  teacherId,
  supabaseClient      // Optional: for updating Problem Bank
);
```

---

## Learning Cycle

```
Iteration 1:
┌─────────────────┐
│ Teacher creates │
│   assignment    │ → Writer (no history yet) → OK assignment
└─────────────────┘

Iteration 2:
┌──────────────────────┐
│ Teacher creates new  │ → Writer + Refinement → BETTER assignment
│ similar assignment   │   (learns from Iteration 1)
└──────────────────────┘

Iteration 3:
┌──────────────────────┐
│ Teacher creates new  │ → Writer + Refinement → EVEN BETTER
│ similar assignment   │   (learns from Iterations 1 & 2)
└──────────────────────┘
```

---

## Transparency Note

Teachers should understand (optional):
> "We've given the Writer a memory. After generating a problem, it automatically compares to similar problems you've created before. If similar ones struggled, it improves the new one to avoid those mistakes. You never see this—you just get better problems."

---

## Configuration

### Disable Learning (Default: Enabled)
```typescript
// In config, set:
enableAutonomousRefinement: false

// System reverts to standard Writer behavior
```

### Adjust Learning Sensitivity
```typescript
{
  maxSimilarProblems: 3,        // How many past problems to look at
  successThreshold: 0.7,        // Only refine if past success rate < 70%
  minSimilarity: 0.4            // Only refine if 40%+ similar
}
```

---

## Success Metrics Source

When populated by `updateProblemBankWithSimulationResults()`:
- **averageSuccessRate**: % of students who correctly answered problem
- **averageConfusionSignals**: avg confusion score from simulation (0-5)
- **averageEngagementScore**: avg engagement (0-1) from simulation
- **totalStudentsExposed**: count of astronaut personas × simulations
- **flaggedAsProblematic**: teacher marked it for revision
- **suggestedImprovements**: ["Clarify wording", "Add scaffolding", ...]

---

## Privacy & Security

✅ **What the system sees**: Problem content, success metrics, structure
✅ **What teachers see**: Better problems (no mechanism visible)
✅ **What students never see**: The learning happening (it's during problem generation, before student interaction)

---

## Current Status

- ✅ Problem refinement logic implemented (`problemRefinement.ts`)
- ✅ Generator with learning wrapper created (`generatorWithLearning.ts`)
- ✅ Success metrics data structure added (`problemBank.ts`)
- ⏳ Integration with `usePipeline.ts` (optional, not yet wired)
- ⏳ Simulation results → Problem Bank update (skeleton provided, needs Supabase hookup)

---

## Next Steps

1. **Optional**: Wire `generateAssignmentWithAutonomousLearning` into the pipeline UI
2. **Optional**: Implement `updateProblemBankWithSimulationResults` to populate success metrics
3. **Test**: Generate assignment twice for same topic → verify second one is better
4. **Monitor**: Log refinement decisions to understand what the system learns

---

**Design Philosophy**: The system learns silently, transparently improving with each iteration. Teachers benefit without having to think about it.
