# Preparedness Feature — Visual Architecture

## High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                          TEACHER INPUT                               │
│  Prep Materials (text) + Assessment Items (numbered questions)       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PreparednessPage Component (orchestrator)                           │
│  ├─ Manages 3 phases: alignment → suggestions → rewrite              │
│  ├─ Handles loading states and errors                               │
│  └─ Coordinates UI component display                                │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
   PHASE 1        PHASE 2         PHASE 3      FINAL STATE
   Alignment      Suggestions     Rewrite      Download
```

---

## Detailed Phase Flow

### PHASE 1: ALIGNMENT ANALYSIS

```
┌─────────────────────────────────────┐
│ Teacher Input                       │
│ ├─ Prep: "I taught z-scores..."    │
│ └─ Assessment: 3 questions          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Client Service: getAlignment(prep, assessment)              │
│ └─ Calls: POST /api/v4/preparedness { phase: "alignment" } │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ API Handler (api/v4/preparedness.ts)                        │
│ └─ Calls LLM with ALIGNMENT_PROMPT_TEMPLATE                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Gemini 2.0 Flash LLM                                        │
│ Task: Analyze each question's concepts, Bloom level, gaps   │
│ Returns: Structured JSON (AlignmentResult)                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ AlignmentTable Component                                     │
│ Displays:                                                    │
│ ├─ Question number                                          │
│ ├─ Concepts required                                        │
│ ├─ Evidence found in prep                                   │
│ ├─ Bloom levels (prep vs assessment)                       │
│ └─ Alignment status (Aligned/Slightly Above/Misaligned)    │
│                                                              │
│ Teacher clicks: "View Suggestions"                          │
└────────────┬───────────────────────────────────────────────┘
             │
             └──────────────────────→ PHASE 2
```

### PHASE 2: SUGGESTION GENERATION

```
┌──────────────────────────┐
│ Alignment Results        │
│ (from Phase 1)           │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ Client Service: getSuggestions(alignment)                   │
│ └─ Calls: POST /api/v4/preparedness { phase: "suggestions" }│
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ API Handler                                                  │
│ └─ Calls LLM with SUGGESTIONS_PROMPT_TEMPLATE               │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ Gemini 2.0 Flash LLM                                        │
│ Task: For each misalignment, suggest:                       │
│ ├─ remove_question (test fix)                              │
│ ├─ lower_bloom_level (test fix)                            │
│ ├─ add_prep_support (prep fix)                             │
│ └─ raise_prep_level (prep fix)                             │
│ Returns: Structured JSON (SuggestionsResult)               │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ SuggestionsPanel Component                                   │
│ Displays:                                                    │
│ ├─ Cards (one per suggestion)                              │
│ ├─ Issue type & rationale                                  │
│ ├─ Suggested addendum (if prep-based)                      │
│ └─ Checkboxes for teacher selection                        │
│                                                              │
│ Teacher selects which fixes to apply                        │
│ Clicks: "Apply [N] Suggestions"                            │
└────────────┬───────────────────────────────────────────────┘
             │
             └──────────────────────→ PHASE 3
```

### PHASE 3: REWRITE & OUTPUT

```
┌──────────────────────────────┐
│ Selected Suggestions         │
│ (checked by teacher)         │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ Client Service: applyRewrite(assessment, selectedSuggestions)│
│ └─ Calls: POST /api/v4/preparedness { phase: "rewrite" }    │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ API Handler                                                  │
│ └─ Calls LLM with REWRITE_PROMPT_TEMPLATE                   │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ Gemini 2.0 Flash LLM                                        │
│ Task:                                                        │
│ ├─ Rewrite Q1 if marked for rewrite                        │
│ ├─ Keep Q2 as-is if aligned                                │
│ ├─ Mark Q3 as removed if marked for removal                │
│ └─ Generate prep addendum if any prep fixes selected       │
│ Returns: Structured JSON (RewriteResult)                   │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ RewriteOutput Component                                      │
│ Displays:                                                    │
│ ├─ Rewritten assessment (with notes on changes)           │
│ ├─ Prep addendum (if any)                                 │
│ ├─ Summary of changes                                      │
│ └─ [Copy] & [Download] buttons                            │
│                                                              │
│ Teacher downloads: assessment-rewritten.txt                │
│                   prep-addendum.txt (optional)             │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App
 └─ Router
     └─ Route: /preparedness
         └─ PreparednessPage (orchestrator)
            │
            ├─ Phase 1: Alignment
            │   └─ AlignmentTable
            │       └─ Expandable rows for details
            │
            ├─ Phase 2: Suggestions
            │   └─ SuggestionsPanel
            │       └─ Suggestion Cards (checkboxes)
            │
            └─ Phase 3: Rewrite
                └─ RewriteOutput
                    ├─ Assessment display
                    ├─ Prep addendum display
                    └─ Copy/Download buttons
```

---

## State Management

### Using Hook (usePreparedness)

```
usePreparedness() returns:
├─ alignment: AlignmentResult | null
├─ suggestions: SuggestionsResult | null
├─ rewrite: RewriteResult | null
├─ loading: { alignment, suggestions, rewrite }
├─ errors: { alignment, suggestions, rewrite }
├─ selectedSuggestions: Set<number> (indices)
├─ startAlignment(prep, assessment): Promise
├─ fetchSuggestions(alignment): Promise
├─ applyRewritePhase(assessment, selected): Promise
├─ toggleSuggestion(index): void
└─ reset(): void
```

### Using Component (PreparednessPage)

```
PreparednessPage manages internally:
├─ phase: "upload" | "alignment" | "suggestions" | "rewrite"
├─ state: { prep, assessment, alignment, suggestions, rewrite }
├─ loading: per-phase
├─ errors: per-phase
└─ selectedSuggestions: Set<number>

Renders appropriate UI based on phase
```

---

## Type Flow

```
User Input
  ├─ PrepDocument { title, rawText }
  └─ AssessmentDocument { title, items[] }
       └─ AssessmentItem { itemNumber, text }
           
           ▼ Phase 1 LLM ▼
           
AlignmentResult[]
  └─ AlignmentRecord
      ├─ assessmentItemNumber
      ├─ concepts[]
      ├─ prepEvidence[]  ← Evidence for each concept
      │   └─ PrepEvidence { concept, sourceText, prepBloomLevel }
      └─ alignment: AlignmentStatus
           └─ "aligned" | "slightly_above" | "misaligned_above" | "missing_in_prep"

           ▼ Phase 2 LLM ▼
           
SuggestionsResult[]
  └─ Suggestion (discriminated union)
      ├─ RemoveQuestionSuggestion
      ├─ LowerBloomSuggestion { targetBloomLevel }
      ├─ AddPrepSupportSuggestion { prepAddendum }
      └─ RaisePrepLevelSuggestion { prepAddendum }

           ▼ Phase 3 LLM ▼
           
RewriteResult
  ├─ rewrittenItems[]
  │   └─ RewrittenAssessmentItem { assessmentItemNumber, rewrittenText }
  │        (empty string = removed)
  └─ prepAddendum?: string (combined)

           ▼ Download ▼
           
Teacher gets:
  ├─ assessment-rewritten.txt
  └─ prep-addendum.txt (optional)
```

---

## Error Handling

Each phase has independent error handling:

```
Phase 1 Error:
  └─ errors.alignment = message
     └─ User sees: "✗ Couldn't analyze alignment"
     └─ User can: Retry or start over

Phase 2 Error:
  └─ errors.suggestions = message
     └─ User sees: "✗ Couldn't generate suggestions"
     └─ User can: Go back or retry

Phase 3 Error:
  └─ errors.rewrite = message
     └─ User sees: "✗ Couldn't rewrite assessment"
     └─ User can: Deselect some suggestions and retry
```

---

## Loading States

All LLM calls show feedback:

```
❌ Initial:     Phase disabled
⏳ Calling LLM: "Analyzing..." with spinner
✅ Complete:    Results displayed
```

---

## API Contract

### Request
```json
{
  "phase": "alignment|suggestions|rewrite",
  "prep": { "title": "...", "rawText": "..." },
  "assessment": { "title": "...", "items": [...] },
  "alignment": null | AlignmentResult,
  "selectedSuggestions": null | Suggestion[]
}
```

### Response
```json
{
  "phase": "alignment" → AlignmentResult[]
  "phase": "suggestions" → SuggestionsResult[]  
  "phase": "rewrite" → RewriteResult
}
```

### Error
```json
{
  "error": "Error message"
}
```

---

## Customization Points

```
Code | What You Can Change
─────┼─────────────────────────────────────────────────────────
Prompts | src/prism-v4/intelligence/preparedness.ts
        │ → Edit ALIGNMENT_PROMPT_TEMPLATE
        │ → Edit SUGGESTIONS_PROMPT_TEMPLATE
        │ → Edit REWRITE_PROMPT_TEMPLATE
─────┼─────────────────────────────────────────────────────────
LLM   | api/v4/preparedness.ts
      │ → Change callGemini to your provider
─────┼─────────────────────────────────────────────────────────
Style | src/components_new/v4/v4.css
      │ → Global styles
      │ + Inline styles in each .tsx component
─────┼─────────────────────────────────────────────────────────
Flow  | Override PreparednessPage.tsx
      │ → Change phase transitions
      │ → Add custom UI
─────┼─────────────────────────────────────────────────────────
```

---

## Summary

**Input:** Prep + Assessment  
**Output:** Aligned Assessment + Optional Prep Addendum  
**Process:** 3 LLM calls with user selection in between  
**Time:** ~5-10 seconds per phase  
**UI:** 3 main views (alignment, suggestions, output)  
**Integration:** 1 component import or 1 hook usage  

That's it! 🎯
