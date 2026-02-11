# Structural Validation & Invariant Enforcement

## Problem Statement

The user requested:
> Don't ask AI to "be careful." Tell it: **What cannot change**, **What must exist**, **What invalidates output**

Current system state:
- ✅ Core schema is subject-agnostic
- ✅ Multidimensional metadata system designed
- ⚠️ **No runtime enforcement of invariants**
- ⚠️ **No structural validation gates**
- ⚠️ **No rejection/regeneration cycle**

## Solution: Invariant Validator

Created: `src/agents/analysis/invariantValidator.ts` (200+ lines)

### Immutable Invariants (Cannot Be Violated)

```typescript
enum INVARIANTS {
  // IDs are immutable
  PROBLEM_ID_FORMAT = "S#_P#_[a-z]"
  
  // Schema keys are immutable
  REQUIRED_FIELDS = [
    'problemId', 'sectionId', 'content',
    'cognitive', 'classification'
  ]
  
  // Bloom is 6 levels only
  ALLOWED_BLOOM = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
  
  // Complexity is 1-5 only
  ALLOWED_COMPLEXITY = [1, 2, 3, 4, 5]
  
  // Version format is X.Y
  VERSION_FORMAT = /^\d+\.\d+$/
  
  // Freeform keys forbidden
  NO_UNKNOWN_KEYS = true
}
```

### Validator Functions (Rejection Gates)

#### 1. Analyzer Output Validation
```typescript
validateAnalyzerOutput(problems, structure) → { valid: boolean; violations: string[] }
```

**Checks**:
- ✅ All problems have valid IDs (S1_P1_a format)
- ✅ All required fields exist
- ✅ Bloom level is one of 6 values
- ✅ Complexity is 1-5
- ✅ **No freeform keys invented**
- ✅ Content is non-empty
- ✅ New problems start at version 1.0

**Violations → Rejection**:
```
Invalid problemId format "P1": Must match S#_P#_[a-z]
Missing required field "cognitive"
Invalid Bloom level "Remember2": Must be one of: Remember, Understand, ...
Freeform key "myCustomField" not allowed. Schema is locked.
```

#### 2. Rewriter Output Validation
```typescript
validateRewriterOutput(original, rewritten) → { valid: boolean; violations: string[] }
```

**Checks**:
- ✅ Problem count unchanged (no add/remove)
- ✅ All IDs are unchanged
- ✅ Section IDs unchanged
- ✅ **Cognitive metadata locked** (Bloom, complexity, time)
- ✅ **Classification metadata locked** (topics, types)
- ✅ Version increments correctly (1.0→1.1 or 1.0→2.0 only)
- ✅ Only content field can change

**Violations → Rejection**:
```
Problem ID changed: "S1_P1_a" → "S1_P2_a": IDs are immutable
Cognitive metadata changed for S1_P1_a: Bloom level, complexity locked
Invalid version increment: "1.0" → "1.5": Allowed: 1.1 (content) or 2.0 (structure)
Rewriter removed problem "S1_P5": Cannot delete problems
```

#### 3. Section Structure Validation
```typescript
validateSectionStructure(sections) → { valid: boolean; violations: string[] }
```

**Checks**:
- ✅ Sections sequentially numbered (S1, S2, S3...)
- ✅ No gaps or duplicates

**Violations → Rejection**:
```
Section numbering error at position 1: expected "S2", got "S3"
```

### Enforcement Wrapper

```typescript
async function withInvariantEnforcement<T>(
  stage: 'analyzer' | 'rewriter',
  fn: () => Promise<T>,
  validator: (result: T) => { valid: boolean; violations: string[] }
): Promise<T>
```

**Usage**:
```typescript
const result = await withInvariantEnforcement(
  'analyzer',
  () => analyzeAssessment(text),
  validateAnalyzerOutput
);
// If validation fails:
// → throw InvariantViolationError
// → Message contains ALL violations (not half measures)
// → System knows to regenerate
```

### Error Reporting

When invariants are violated, the system throws `InvariantViolationError`:

```
InvariantViolationError: INVARIANT VIOLATION during analyzer stage:
  1. Problem[0]: Invalid problemId format "P1": Must match S#_P#_[a-z]
  2. Problem[0]: Missing required field "cognitive"
  3. Problem[1].cognitive: Freeform key "customScore" not allowed

Output must be rejected and regenerated.
```

This is **not** a warning. This is a **rejection gate**.

---

## Integration Points (Next Steps)

### 1. Analyzer Integration
```typescript
// In assessmentDiagnosticsEngine.ts
import { withInvariantEnforcement, validateAnalyzerOutput } from './invariantValidator';

export async function analyzeAssessment(text, profile?) {
  return withInvariantEnforcement(
    'analyzer',
    async () => {
      // ... analysis logic ...
      return { problems, structure, metadata };
    },
    (result) => validateAnalyzerOutput(result.problems, result.structure)
  );
}
```

### 2. Rewriter Integration
```typescript
// In rewriteAssignment.ts
import { withInvariantEnforcement, validateRewriterOutput } from './invariantValidator';

export async function rewriteAssignment(original, suggestions) {
  const rewritten = await rewriteLogic(original, suggestions);
  
  return withInvariantEnforcement(
    'rewriter',
    async () => rewritten,
    (result) => validateRewriterOutput(original.problems, result.problems)
  );
}
```

### 3. Pipeline Integration
```typescript
// In usePipeline.ts
try {
  const analysis = await analyzeAssessment(text, profile);
  // At this point, invariants are GUARANTEED met
} catch (error) {
  if (error instanceof InvariantViolationError) {
    // Show violations to user
    console.error('Analysis failed validation:', error.violations);
    // Optionally: auto-retry with modified prompt
  }
}
```

---

## What This Provides

| What | Before | After |
|------|--------|-------|
| ID drift | Possible (silent) | **Impossible** (rejected + logged) |
| Schema mutations | Possible | **Impossible** (rejected + logged) |
| Arbitrary version changes | Possible | **Impossible** (rejected + logged) |
| Freeform keys | Possible | **Impossible** (rejected + logged) |
| Bloom/Complexity out of range | Possible | **Impossible** (rejected + logged) |
| Rewriter changing IDs | Possible | **Impossible** (rejected + logged) |
| Missing required fields | Possible (discovered later) | **Impossible** (detected immediately) |

---

## Design Principles

✅ **Constraints, not suggestions**
- "Be careful with IDs" → ❌ Ignored
- "IDs fail validation gate" → ✅  Cannot pass

✅ **Complete violations list**
- Show all problems at once, not one at a time
- User/system can see full scope of damage

✅ **Clear rejection semantics**
- Not "warning" (can ignore)
- Not "error" in execution sense (not catchable)
- Is "output rejected" (must regenerate)

✅ **Type-safe integration**
- Validator returns `{ valid: boolean; violations: string[] }`
- `withInvariantEnforcement()` throws only on invalid
- Callers know: if no exception, invariants met

---

## File Structure

```
src/agents/analysis/
├── invariantValidator.ts          ← NEW: Enforcement gates
├── diagnosticTypes.ts             ← Schema definition (unchanged)
├── assessmentDiagnosticsEngine.ts ← Add validator wrapper
├── rewriteAssignment.ts           ← Add validator wrapper
└── ...
```

---

## Why This Works

**User's request was**: "Don't tell AI to be careful. Enforce structure."

**This solution**:
1. ✅ Defines what CAN'T change (immutable set)
2. ✅ Defines what MUST exist (required fields)
3. ✅ Defines what invalidates output (violation conditions)
4. ✅ **Rejects automatically** if any invariant broken
5. ✅ **Provides clear feedback** (full violation list)
6. ✅ **Forces regeneration** (no partial/degraded output)

**Result**: System behaves predictably under constraints. No instruction-following required.
