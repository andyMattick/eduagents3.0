# Arithmetic Fluency Assessment Guide

## Overview

**Arithmetic Fluency** is a specialized assessment type designed to measure students' speed and accuracy with basic math operations (addition, subtraction, multiplication, division). Unlike word problems or application-based questions, arithmetic fluency focuses on **bare expressions**: "7 + 4", "12 - 5", "3 × 6".

## How Arithmetic Fluency Works

### 1. **User Selection**
Teachers select "Arithmetic Fluency" as the **Question Format** in the assessment creation form.

### 2. **Intent Conversion**
- **UI**: `questionFormat = "arithmeticFluency"`
- **Pipeline**: Converted to `questionTypes = ["arithmeticFluency"]` in UnifiedAssessmentRequest
- **Architect**: Creates blueprint slots all with `questionType: "arithmeticFluency"`

### 3. **Local Pre-Generation (Zero LLM Cost)**
**File**: `/src/pipeline/agents/writer/chunk/writerParallel.ts` (lines 246-281)

Arithmetic fluency slots are **NOT** sent to the LLM. Instead, they are pre-generated deterministically:

```typescript
// For each "arithmeticFluency" slot:
const generated = generateArithmeticItem(stub, {
  grade,              // e.g., 3
  topic,
  operation,          // e.g., "add", "subtract", "multiply"
  range,              // e.g., { min: 1, max: 20 }
});
```

**Function**: `/src/pipeline/agents/rewriter/rewriteSingle.ts` 
- Selects operator based on:
  1. Slot's explicit operation constraint
  2. Topic keywords (e.g., "division" topic → ÷)
  3. Fallback to detected operator or "+"
- Generates two random operands within the grade/range
- Computes correct answer

### 4. **Output Format**

Each arithmetic fluency item looks like:

```json
{
  "slotId": "slot_5",
  "questionType": "arithmeticFluency",
  "prompt": "7 + 4 = ?",
  "answer": "11"
}
```

## Troubleshooting

### ❌ Problem: "I selected Arithmetic Fluency but got word problems"

**Possible Causes**:

1. **Wrong Question Format Selected**
   - Verify you selected "Arithmetic Fluency" in the **Question Format** chips
   - Avoid selecting "Mixed Format" (which includes word problems)

2. **Assessment Type Mismatch**
   - Some assessment types (e.g., "test", "quiz") have implicit question type mixing
   - Try selecting a dedicated "Arithmetic Fluency" or "Bell Ringer" assessment type

3. **Topic/Operation Not Specified**
   - If operation is "any" and topic doesn't contain arithmetic keywords, items fallback to LLM
   - Specify **Operation** (add, subtract, multiply, divide) explicitly in form

4. **LLM Fallback** (debugging)
   - Check console logs: `[writerParallel] Pre-generated X arithmetic fluency slot(s) locally`
   - If this doesn't show, slots never reached the writer, check architect output
   - If slots show as "0 arithmetic pre-generated", they're being sent to LLM incorrectly

### ✅ Solution Steps

1. **Verify Your Selection**:
   - Open Assessment Form → **Question Format**
   - Select **only** "Arithmetic Fluency" (single select, not multi)
   - Do NOT select "Mixed Format"

2. **Specify Operation** (optional but recommended):
   - In form: set **Arithmetic Operation** dropdown (Add, Subtract, Multiply, Divide)
   - Leave blank for "any" (LLM may generate word problems as fallback)

3. **Specify Operand Range** (optional):
   - Set **Min** and **Max** operands (e.g., 1–20)
   - Grade-appropriate defaults are used if not set

4. **Check Assessment Type**:
   - Select "Bell Ringer", "Quick Check", or "Quiz" (not "Test"—tests can auto-mix types)
   - These types default to simpler, focused assessments

5. **Regenerate**:
   - Once settings are confirmed, click **"Generate Assessment"**
   - Check console: should show "Pre-generated X arithmetic fluency slot(s) locally"

### 🐛 If Word Problems Still Appear

**This indicates a pipeline issue**. Please report with:

- **Your selections**: assessment type, question format, operation, range, grade
- **Console logs**: open DevTools (F12) → Console → copy [writerParallel] and [Architect] logs
- **PDF output**: download and share screenshot showing mixed types
- **Error messages**: any red text in the console

---

## Technical Details

### Architecture Decision

We **pre-generate** arithmetic fluency locally (not via LLM) because:

1. **Deterministic quality**: No LLM latency or randomness
2. **Fast generation**: Instant, zero API cost
3. **Grade-appropriate**: Built-in grade-to-range mappings
4. **Repeatable**: Same uar.grade + operation + range = same items (for testing)

### Grade-to-Range Defaults

| Grade | Addition/Subtraction | Multiplication | Division |
|-------|----------------------|----------------|----------|
| 1–2   | 1–10                 | —              | —        |
| 3–4   | 10–99 + 1–49         | 2–9 × 2–9      | 2–9 ÷ 1–9|
| 5     | 100–499 + 10–99      | 10–99 × 10–99  | —        |
| 6+    | 100–999 + 100–499    | 100–999 × 100–999 | —   |

Overridden if `uar.range` is explicitly set.

### Writer Prompt Fallback

Even though arithmetic fluency typically bypasses the LLM (writerParallel line 280), if a slot somehow reaches callGroupLLM, the prompt now includes:

```
ARITHMETIC FLUENCY STRICT REQUIREMENTS
⚠️  CRITICAL: This is an ARITHMETIC FLUENCY slot ONLY.
- MUST be a bare arithmetic expression (e.g., "7 + 4", "12 - 5")
- NEVER include words, stories, or context narratives
- NEVER generate word problems
```

This helps the LLM reject word problems if a fallback occurs.

---

## See Also

- [Builder Agent](./src/pipeline/agents/builder/) – transforms generated items into FinalAssessment
- [Gatekeeper Agent](./src/pipeline/agents/gatekeeper/) – validates arithmetic format
- [Rewriter](./src/pipeline/agents/rewriter/rewriteSingle.ts) – regenerates items
