# Invariant Enforcement Strategy

## Overview

The eduagents3.0 platform enforces strict invariants on UniversalProblems to maintain data integrity and prevent unintended modifications to critical cognitive and classification metadata.

**Core Principle**: Once a problem's cognitive and classification metadata has been analyzed, it is LOCKED and cannot be changed. Only the problem content (and version) can be modified.

---

## Immutable Fields

These fields **CANNOT** be changed after the analyzer processes a problem:

### 1. Problem Identity
- `problemId` - Format: `"S1_P3_a"` (hierarchical)
  - Once assigned, this ID uniquely identifies the problem
  - Changing it would break all references in simulations, question banks, etc.

### 2. Cognitive Metadata (Complete Object)
All fields within `cognitive` are locked:
- `bloomsLevel` - Bloom's taxonomy classification (Remember, Understand, Apply, Analyze, Evaluate, Create)
- `bloomsConfidence` - Confidence score (0-1)
- `bloomsReasoning` - Text explanation of Bloom classification
- `bloomsContextDependent` - Boolean flag
- `complexityLevel` - Complexity rating (1-5)
- `estimatedTimeMinutes` - Time estimate
- `timeBreakdown` - Detailed time breakdown (reading, comprehension, computation, reasoning, writing)
- `linguisticComplexity` - Linguistic complexity (0-1)
- `reasoningStepsRequired` - Number of reasoning steps
- `proceduralWeight` - Procedural weight (0-1)

**Why Locked?**
- These represent the objective cognitive demands of the problem
- Changing them would invalidate all student simulations based on this metadata
- They are determined by domain experts during analysis

### 3. Classification Metadata (Complete Object)
All fields within `classification` are locked:
- `problemType` - e.g., "hypothesis_test"
- `topics` - e.g., ["sampling_distributions", "central_limit_theorem"]
- `requiresCalculator` - Boolean
- `requiresInterpretation` - Boolean

**Why Locked?**
- These define what subject-specific concepts the problem tests
- Changing them would misalign the problem with curriculum standards
- They depend on the original problem content at the time of analysis

### 4. Structure Metadata (Complete Object)
All fields within `structure` are locked:
- `isSubpart` - Is this a subpart of a larger problem?
- `numberingStyle` - "1.", "a.", "roman", "parenthetical", "inferred"
- `multiPartCount` - Number of parts
- `sourceLineStart`, `sourceLineEnd` - Line numbers in source document

**Why Locked?**
- These define the problem's position and relationships in the assessment
- Changing them would break hierarchical relationships

---

## Mutable Fields

Only these fields can be modified after analysis:

### 1. Content
- `content` - The problem text itself
- **When Can It Change?**
  - Rewriter can improve wording, grammar, clarity
  - Teacher can make minor edits
  - Accessibility transformations can reformulate the text for readability
  
- **Example Update Chain**
  ```
  v1.0 (Original)
  "Which of the following represents..."
  
  v1.1 (Accessibility rewrite for dyslexia)
  "Here are four options. Pick the one that represents..."
  (Cognitive metadata stays exactly the same)
  ```

### 2. Version
- `version` - Semantic version (e.g., "1.0" → "1.1" → "1.2")
- **Update Semantics**
  - Changes to content = minor version bump (1.0 → 1.1)
  - Major rewrites = potential major version (1.1 → 2.0, if significant)
  - Version history maintained in `problem_versions` table

---

## Enforcement Mechanism

### 1. Database-Level Constraints

**Table: `universal_problems`**
```sql
-- Cognitive and classification are stored as JSONB
-- Indexed for querying and validation
cognitive JSONB NOT NULL,
classification JSONB NOT NULL,
```

**Table: `problem_versions`**
```sql
-- Tracks all changes to a problem
version_number TEXT NOT NULL,
problem_snapshot JSONB NOT NULL,
immutable_fields_locked BOOLEAN DEFAULT TRUE,
```

### 2. TypeScript Validation Function

```typescript
export function validateProblemInvariants(
  original: UniversalProblem,
  updated: UniversalProblem
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check problemId
  if (original.problemId !== updated.problemId) {
    violations.push(`problemId cannot change`);
  }

  // Check cognitive fields (entire object)
  if (JSON.stringify(original.cognitive) !== JSON.stringify(updated.cognitive)) {
    violations.push('cognitive metadata cannot be modified');
  }

  // Check classification fields (entire object)
  if (JSON.stringify(original.classification) !== JSON.stringify(updated.classification)) {
    violations.push('classification metadata cannot be modified');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
```

**When Called:**
- Before updating any problem
- Called from `updateUniversalProblemContent()`
- Called from `validateAndEnforceInvariants()`

### 3. Logging and Audit Trail

**Table: `invariant_violations`**
```sql
-- Logs any attempts to violate invariants
problem_id TEXT NOT NULL,
violation_type TEXT NOT NULL,
violation_description TEXT,
original_value JSONB,
attempted_value JSONB,
detected_at TIMESTAMP,
detected_by TEXT,
resolved BOOLEAN DEFAULT FALSE,
```

**Logged When:**
- Any attempt to modify immutable fields is detected
- System prevents the change and logs the violation
- Violations are queryable for audit purposes

---

## Update Workflows

### Scenario 1: Content Rewrite Only
**Goal:** Improve problem wording

**Steps:**
1. Original problem v1.0:
   ```json
   {
     "problemId": "S1_P2_a",
     "cognitive": { /* locked */ },
     "classification": { /* locked */ },
     "content": "Original text",
     "version": "1.0"
   }
   ```

2. Call `updateUniversalProblemContent()`:
   ```typescript
   await updateUniversalProblemContent(
     "S1_P2_a",
     "Improved text with better clarity",
     "1.1",
     teacherId
   )
   ```

3. System validates:
   - ✓ `problemId` unchanged
   - ✓ `cognitive` unchanged
   - ✓ `classification` unchanged
   - ✓ Only `content` and `version` changed

4. Result: Problem v1.1 saved, version history recorded

---

### Scenario 2: Accessibility Transform
**Goal:** Create dyslexia-friendly variant

**Steps:**
1. Original: v1.0
2. Accessibility rewriter transforms content:
   - Uses sans-serif font guidance in content
   - Breaks sentences into shorter, simpler chunks
   - BUT: cognitive/classification metadata stays identical
3. New version: v1.1 (accessibility variant)
4. Both versions available, same cognitive profile

---

### Scenario 3: Attempted Invariant Violation (BLOCKED)
**Scenario:** Teacher tries to change Bloom level

**Steps:**
1. Teacher uploads modified version with:
   ```json
   {
     "cognitive": {
       "bloomsLevel": "Evaluate"  // Changed from "Understand"
     }
   }
   ```

2. System detects violation:
   ```typescript
   const result = validateProblemInvariants(original, updated);
   // result.valid === false
   // result.violations = ['cognitive metadata cannot be modified']
   ```

3. Action taken:
   - ✗ Update is REJECTED
   - ✓ Violation is logged to `invariant_violations` table
   - User receives error: "Cannot modify cognitive metadata after analysis"

---

## Enforcing Invariants at Each Stage

### Stage 1: Problem Creation (Analyzer)
- Analyzer generates initial cognitive/classification metadata
- These are marked as locked = true
- `analysis.processedAt` timestamp recorded

### Stage 2: Problem Update (Rewriter)
- Rewriter can only change `content`
- `validateProblemInvariants()` is called
- If invariants violated → operation fails with audit log
- If valid → new version created with incremented version number

### Stage 3: Problem Use (Simulation)
- Simulations reference problem by `problemId` (immutable)
- Use cognitive metadata (immutable) for student matching
- If metadata changed between simulation runs, audit log shows the history
- Results are tied to specific problem version

---

## Best Practices for Teachers/Authors

### ✅ DO:
- Modify problem content for clarity, grammar, style
- Create accessibility variants (new version numbers)
- Add supplementary materials or hints
- Update version when content changes meaningfully

### ❌ DON'T:
- Change the Bloom level (it's determined by content, not you)
- Modify classification topics (these represent what's actually tested)
- Change estimated time without reanalysis
- Attempt to cherry-pick from cognitive metadata

### ⚠️ If You Need to Change Cognitive Metadata:
This requires **re-analysis**:
1. Submit the modified problem to the analyzer
2. Analyzer re-classifies and generates new cognitive metadata
3. New `version` assigned (potentially 2.0 if significant)
4. Entire version history maintained

---

## Query Examples

### Find All Violations for a Problem
```typescript
const { data } = await db
  .from('invariant_violations')
  .select('*')
  .eq('problem_id', 'S1_P2_a')
  .order('detected_at', { ascending: false });
```

### Get Problem Version History
```typescript
const { data } = await db
  .from('problem_versions')
  .select('*')
  .eq('problem_id', 'S1_P2_a')
  .order('version_number', { ascending: false });
```

### Check If Cognitive Metadata Was Ever Modified
```typescript
const violations = await db
  .from('invariant_violations')
  .select('*')
  .eq('problem_id', 'S1_P2_a')
  .eq('violation_type', 'immutable_field_changed');
```

---

## API Reference

### Validation Function
```typescript
function validateProblemInvariants(
  original: UniversalProblem,
  updated: UniversalProblem
): { valid: boolean; violations: string[] }
```

### Service Function for Invariant Enforcement
```typescript
export async function validateAndEnforceInvariants(
  original: UniversalProblem,
  updated: UniversalProblem
): Promise<{ valid: boolean; violations: string[] }>
```

### Update Function (with Built-in Invariant Checking)
```typescript
export async function updateUniversalProblemContent(
  problemId: string,
  newContent: string,
  newVersion: string,
  teacherId: string
): Promise<UniversalProblem>
```

---

## Summary

| Aspect | Status | Reason |
|--------|--------|--------|
| `problemId` | 🔒 Locked | Unique identifier for all references |
| `cognitive.*` | 🔒 Locked | Objective cognitive demands (expert-determined) |
| `classification.*` | 🔒 Locked | Subject-specific alignment (standards-based) |
| `structure.*` | 🔒 Locked | Hierarchical relationships (breaks if changed) |
| `content` | ✏️ Mutable | Can be improved, rewritten, adapted |
| `version` | ✏️ Mutable | Updated when content changes |

This enforcement strategy ensures that:
1. **Integrity**: Simulations remain valid because problem metadata doesn't change unexpectedly
2. **Auditability**: All attempted changes (successful or not) are logged
3. **Flexibility**: Teachers can still improve content without re-analysis
4. **Standards Compliance**: Cognitive and subject alignment cannot be accidentally altered
