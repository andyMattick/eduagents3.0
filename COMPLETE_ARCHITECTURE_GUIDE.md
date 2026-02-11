# Complete Architecture: From Schema to Enforcement

## 1. SCHEMA LAYER (Type Definitions)

**File**: `diagnosticTypes.ts`
**Purpose**: Define the immutable schema

```typescript
interface UniversalProblem {
  // Immutable (cannot change once created)
  problemId: string;              // Format: S1_P1_a (locked)
  sectionId: string;              // Format: S1 (locked)
  
  // Immutable (cognitive must not change)
  cognitive: CognitiveMetadata {
    bloomsLevel: BloomLevel;       // Remember|Understand|Apply|Analyze|Evaluate|Create
    complexityLevel: 1|2|3|4|5;    // Bounded 1-5
    estimatedTimeMinutes: number;  // Computed, not editable
    linguisticComplexity: 0-1;     // Computed
    proceduralWeight: 0-1;         // Computed
  };
  
  // Subject-specific but locked
  classification?: ClassificationMetadata {
    topics?: string[];             // From profile
    problemType?: string;          // From profile
  };
  
  // Mutable (only content can change after creation)
  content: string;                 // The actual problem text
}

// Schema is READ-ONLY after output from Analyzer
// Schema is WRITE-PROTECTED by Validator
```

## 2. ANALYSIS LAYER (Cognitive Extraction)

**File**: `cognitiveAnalyzer.ts`
**Purpose**: Extract universal cognitive properties (subject-agnostic)

```typescript
// Input: Raw problem text
// Output: CognitiveMetadata (everything that CANNOT change later)

function analyzeCognitiveDimensions(problemText: string): CognitiveMetadata {
  return {
    bloomsLevel: classifyBloomLevel(problemText),           // ← Locked
    complexityLevel: calculateComplexity(problemText),      // ← Locked
    estimatedTimeMinutes: estimateTime(problemText),        // ← Locked
    linguisticComplexity: calculateLinguistic(problemText), // ← Locked
    proceduralWeight: calculateProcedural(problemText),     // ← Locked
  };
}
```

**Key**: All outputs are **immutable predictions**. They cannot be changed by rewriter.

## 3. ORCHESTRATION LAYER (Atomization)

**File**: `assessmentDiagnosticsEngine.ts`
**Purpose**: Assemble UniversalProblems and attach subject-specific metadata

```typescript
async function analyzeAssessment(text: string, profile?: SubjectProfile) {
  // Step 1: Parse text into sections + problems
  const sections = parseStructure(text);
  
  // Step 2: For each problem, compute immutable cognitive layer
  const problems: UniversalProblem[] = sections.flatMap(section =>
    section.problems.map(p => ({
      problemId: `S${section.id}_P${p.id}`,
      sectionId: `S${section.id}`,
      content: p.text,
      cognitive: analyzeCognitiveDimensions(p.text),      // ← Immutable
      classification: profile ? classifyWithProfile(p, profile) : undefined,
    }))
  );
  
  // Step 3: Validate output before returning
  const validation = validateAnalyzerOutput(problems);
  if (!validation.valid) {
    throw new InvariantViolationError('analyzer', validation.violations);
  }
  
  return { problems, structure: sections };
}
```

**Key**: At function exit, all invariants are guaranteed met or exception is thrown.

## 4. VALIDATION LAYER (Enforcement Gates)

**File**: `invariantValidator.ts`
**Purpose**: Reject any output that violates immutable invariants

### Analyzer Validator
```typescript
validateAnalyzerOutput(problems): { valid: boolean; violations: string[] }

CHECKS:
✅ All problems have valid IDs (S#_P#_[a-z])
✅ All required cognitive fields present
✅ Bloom level ∈ {Remember, Understand, Apply, Analyze, Evaluate, Create}
✅ Complexity level ∈ {1,2,3,4,5}
✅ No freeform keys invented
✅ Content is non-empty

VIOLATIONS → Output Rejected
```

### Rewriter Validator
```typescript
validateRewriterOutput(original, rewritten): { valid: boolean; violations: string[] }

CHECKS:
✅ Problem count unchanged
✅ All original IDs still present
✅ No new problems added
✅ No problems removed
✅ Cognitive metadata IDENTICAL
✅ Classification metadata IDENTICAL
✅ Only content field can differ
✅ Version increments correctly (1.0→1.1 or 1.0→2.0)

VIOLATIONS → Output Rejected
```

## 5. REWRITER LAYER (Content-Only Edits)

**File**: `rewriteAssignment.ts`
**Purpose**: Improve problem content while respecting invariants

```typescript
async function rewriteAssignment(
  original: UniversalProblem[],
  suggestions: string[]
): Promise<UniversalProblem[]> {
  // Generate rewritten problems (content only)
  const rewritten = await generateRewritesAI(original, suggestions);
  
  // Validate before returning
  return withInvariantEnforcement(
    'rewriter',
    async () => rewritten,
    (result) => validateRewriterOutput(original, result)
  );
  
  // If validation fails, throws InvariantViolationError
  // System knows to retry rewriter with stricter prompt
}
```

**Key**: Rewriter cannot:
- Change problem IDs
- Change Bloom levels
- Change complexity
- Change topics
- Add/remove problems

Rewriter can ONLY:
- Rewrite content for clarity
- Rephrase for accessibility
- Simplify wording

## 6. PIPELINE INTEGRATION

```
USER UPLOADS ASSIGNMENT
         ↓
    Analyzer (Step 1)
         ↓
    Validate Output (Gate 1)
    ├─ Valid? → Continue
    └─ Invalid? → REJECT + Log + Regenerate
         ↓
    Store/Display Analysis Results
         ↓
    USER REQUESTS REWRITE
         ↓
    Rewriter (Step 2)
         ↓
    Validate Output (Gate 2)
    ├─ Valid? → Continue
    └─ Invalid? → REJECT + Log + Regenerate
         ↓
    Return Rewritten Version
         ↓
    VERSION TRACKING
    └─ Track lineage: 1.0 → 1.1 (content) → 1.2 (more content)
```

## 7. Error Cascade

```
┌─────────────────────────────────────────────────────────────┐
│ Try to execute Analyzer                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ withInvariantEnforcement('analyzer', fn, validator)        │
│   1. Execute analyzeAssessment()                            │
│   2. Call validateAnalyzerOutput(result)                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
           ┌──────────────┴──────────────┐
           ↓                             ↓
      ✅ VALID                       ❌ INVALID
      Return result                violations: [
                                      "Problem[0]: Invalid ID",
                                      "Problem[1]: Bloom out of range",
                                      ...
                                    ]
                                      ↓
                                  throw InvariantViolationError
                                      ↓
                                  Caller catches error
                                      ↓
                                  Log all violations
                                      ↓
                                  Retry analyzer with stricter prompt:
                                  "Your previous output violated:
                                   - Problem IDs must match S#_P#_[a-z]
                                   - Bloom levels must be one of the 6 allowed values
                                   - Do not invent unknown keys"
```

## 8. Why This Works

### Problem: AI Sometimes Makes Mistakes
```
❌ BEFORE
└─ AI told: "Be careful with Bloom levels"
└─ AI told: "Don't change IDs"
└─ AI told: "Keep metadata intact"
└─ But sometimes...
   └─ Outputs Bloom="Remember2" ← Not caught until later
   └─ Or changes ID from P1 to P2 ← Breaks referential integrity
   └─ Or adds unknown keys ← System crashes
```

### Solution: Enforce Structure
```
✅ AFTER
└─ Analyzer produces output
└─ Validator checks EVERY invariant
├─ If Bloom invalid → Rejection
├─ If ID format wrong → Rejection  
├─ If unknown keys → Rejection
└─ Result: Zero invalid outputs reach downstream systems
```

### Behavioral Change
```
AI LEARNS: "My output is REJECTED if it has these errors"
           "System doesn't warn me, it discards my output"
           "I must satisfy ALL constraints to proceed"
```

This is same as:
- Compiler rejects code that doesn't compile
- Type checker rejects code with wrong types
- Unit tests reject code that fails assertions

AI learns to respect constraints because **constraints are enforced, not suggested**.

## 9. Comparison: Before vs After

| Concern | Before | After |
|---------|--------|-------|
| **ID Drift** | Possible (caught later) | Impossible (caught immediately) |
| **Schema Mutations** | Possible | Impossible |
| **Bloom Invalid** | Possible | Impossible |
| **Complexity OOB** | Possible | Impossible |
| **Freeform Keys** | Possible | Impossible |
| **Unknown Errors** | Discovered in production | Discovered at analyzer exit |
| **Error Scope** | Single error reported | All violations reported |
| **Recovery** | Manual intervention | Auto-regeneration possible |
| **Guarantee** | Best-effort | Contractual (invariants met) |

---

## 10. Remaining Work

- [ ] Integrate `withInvariantEnforcement()` into analyzer pipeline
- [ ] Integrate `withInvariantEnforcement()` into rewriter pipeline
- [ ] Create error handling UI showing violations list
- [ ] Implement auto-regeneration with constraint feedback
- [ ] Add metrics: violations/attempt, regeneration count
- [ ] Create test suite for all validators

---

## Key Takeaway

**Structural validation is stronger than instruction-following.**

When you tell AI "be careful," it tries its best but sometimes fails.
When you tell AI "this format is rejected," it adapts to satisfy the constraint.

Invariants are the difference between **hope** and **guarantee**.
