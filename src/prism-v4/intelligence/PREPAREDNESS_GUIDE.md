# Preparedness Feature — Implementation Guide

## Overview

The Preparedness feature analyzes the alignment between an assessment and preparation materials, generates actionable suggestions to fix misalignments, and produces rewritten assessment/prep documents.

The feature operates in **three phases**:

1. **Alignment**: Compares assessment questions with prep content to identify concept coverage, cognitive level alignment, and gaps
2. **Suggestions**: Generates test-based or prep-based fixes for identified misalignments
3. **Rewrite**: Applies selected suggestions to produce a finalized, aligned assessment and/or prep addendum

---

## Architecture

### Data Models (`src/prism-v4/schema/domain/Preparedness.ts`)

All types are defined in the canonical schema layer:

```
PreparednessAlignment.ts  — Input documents + alignment results
PreparednessSuggestions.ts — Suggestion types and results
PreparednessRewrite.ts     — Rewrite output
```

**Key types:**

- `AssessmentDocument` — Student assessment (title + array of items)
- `PrepDocument` — Preparation materials (title + raw text)
- `AlignmentResult` — Alignment analysis for each question
- `SuggestionsResult` — Array of suggestions
- `RewriteResult` — Rewritten items + optional prep addendum

### LLM Orchestration (`src/prism-v4/intelligence/preparedness.ts`)

Handles the three LLM phases with structured prompts:

```ts
getAlignment(prep, assessment, callLLM)    // Phase 1
getSuggestions(alignment, callLLM)         // Phase 2
applySuggestions(assessment, suggestions)  // Phase 3
```

Each function:
- Formats the prompt with actual document content
- Calls the LLM (injected `LLMCaller`)
- Parses and validates the JSON response
- Returns typed results

### Client-Side Service (`src/services_new/preparednessService.ts`)

Exports async functions for calling the backend API:

```ts
getAlignment(prep, assessment)
getSuggestions(alignment)
applyRewrite(assessment, selectedSuggestions)
```

Also provides utility functions for rendering:

```ts
getBloomLabel(level: number)           // "Remember", "Understand", etc.
getAlignmentStatusLabel(status: string) // "Aligned", "Misaligned Above", etc.
getSuggestionTypeLabel(type: string)   // "Remove Question", "Add Prep Support", etc.
```

### UI Components

| Component | Purpose |
|-----------|---------|
| `AlignmentTable.tsx` | Display alignment results in an interactive table |
| `SuggestionsPanel.tsx` | Show suggestion cards for teacher selection |
| `RewriteOutput.tsx` | Display rewritten assessment + prep addendum with download |
| `PreparednessPage.tsx` | Main orchestration component managing all three phases |

### React Hook (`src/hooks/usePreparedness.ts`)

Simplifies state management for Preparedness workflows:

```ts
const {
  alignment, suggestions, rewrite,
  loading, errors,
  selectedSuggestions,
  startAlignment, fetchSuggestions, applyRewritePhase,
  toggleSuggestion, reset,
} = usePreparedness({
  onAlignmentComplete: (alignment) => { /* ... */ },
  onSuggestionsComplete: (suggestions) => { /* ... */ },
  onRewriteComplete: (rewrite) => { /* ... */ },
});
```

### API Route (`api/v4/preparedness.ts`)

Single POST endpoint with `phase` parameter:

```ts
POST /api/v4/preparedness
{
  "phase": "alignment" | "suggestions" | "rewrite",
  "prep": PrepDocument,
  "assessment": AssessmentDocument,
  "alignment": AlignmentResult | null,
  "selectedSuggestions": Suggestion[] | null
}
```

Returns typed JSON for each phase.

---

## Workflow

### For End Users (Teachers)

1. **Upload** prep document and assessment
2. **View Alignment Table** — see which questions are:
   - Aligned (assessment ≤ prep level)
   - Slightly above (1 level higher)
   - Misaligned above (2+ levels higher)
   - Missing in prep

3. **Select Suggestions**:
   - Remove question (test-based fix)
   - Lower Bloom level (test-based fix)
   - Add prep support (prep-based fix)
   - Raise prep level (prep-based fix)

4. **View Rewritten Assessment** and optional **Prep Addendum**
5. **Download** finalized documents

### For Developers

#### Using PreparednessPage (Easiest)

```tsx
import { PreparednessPage } from "@/components_new/v4/PreparednessPage";

export function MyTeacherView() {
  return <PreparednessPage />;
}
```

The component manages the entire flow internally.

#### Using usePreparedness Hook (More Control)

```tsx
import { usePreparedness } from "@/hooks/usePreparedness";
import { AlignmentTable } from "@/components_new/v4/AlignmentTable";

export function MyCustomView() {
  const { alignment, startAlignment, alignment } = usePreparedness();

  const handleAnalyze = async () => {
    await startAlignment(prep, assessment);
  };

  return (
    <>
      <button onClick={handleAnalyze}>Analyze</button>
      {alignment && <AlignmentTable alignment={alignment} />}
    </>
  );
}
```

#### Using Service Functions Directly

```tsx
import {
  getAlignment,
  getSuggestions,
  applyRewrite,
} from "@/services_new/preparednessService";

// Phase 1
const alignment = await getAlignment(prep, document);

// Phase 2
const suggestions = await getSuggestions(alignment);

// Phase 3 (user selects suggestions)
const rewrite = await applyRewrite(assessment, selectedSuggestions);
```

---

## Integration Points

### In App.tsx or Router

```tsx
import PreparednessPage from "@/components_new/v4/PreparednessPage";

export function App() {
  return (
    <Routes>
      <Route path="/preparedness" element={<PreparednessPage />} />
    </Routes>
  );
}
```

### In TeacherStudio

Add a "Preparedness Analysis" tab or button:

```tsx
import { PreparednessPage } from "@/components_new/v4/PreparednessPage";

export function TeacherStudio() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <button onClick={() => setActiveTab("preparedness")}>
        Preparedness
      </button>

      {activeTab === "preparedness" && (
        <PreparednessPage
          prep={currentPrepDocument}
          assessment={currentAssessmentDocument}
        />
      )}
    </>
  );
}
```

---

## Error Handling

Each phase has its own error state. Errors are displayed to the user with clear recovery paths:

```tsx
{errors.alignment && (
  <div style={{ color: "#c62828" }}>
    ✗ {errors.alignment}
  </div>
)}
```

Common errors:

- **JSON Parse Error**: LLM response was not valid JSON → check LLM service
- **Network Error**: API unreachable → check connectivity
- **Missing Fields**: Input documents incomplete → validate before submission

### Debug Mode

For development, set `DEBUG_PREPAREDNESS=true` in `.env` to log:

- Full prompts sent to LLM
- Raw LLM responses
- Parsed results before return

---

## Customization

### Change Bloom's Taxonomy Scale

Edit `ALIGNMENT_PROMPT_TEMPLATE` in `src/prism-v4/intelligence/preparedness.ts`:

```ts
Bloom's levels: 
  1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create,
  // or customize here
```

### Change LLM Model

In `api/v4/preparedness.ts`, change the `callGemini` call:

```ts
const response = await callClaude({  // or your desired LLM
  prompt,
  model: "claude-3-opus",
  // ...
});
```

### Customize UI Styling

All UI components use inline styles + `v4.css` classes:

```tsx
<div className="badge badge-success">Aligned</div>
<button className="v4-button v4-button-primary">Proceed</button>
```

Modify `src/components_new/v4/v4.css` to change appearance.

### Add Pre-Processing

Normalize assessment text before calling alignment:

```tsx
const normalized = normalizeAssessment(assessment);
const alignment = await getAlignment(prep, normalized);
```

Example normalizer:

```tsx
function normalizeAssessment(doc: AssessmentDocument): AssessmentDocument {
  const seen = new Set<string>();
  const unique = doc.items.filter((item) => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });
  return { ...doc, items: unique };
}
```

---

## Testing

### Unit Tests

Test LLM orchestration:

```ts
import { getAlignment } from "@/prism-v4/intelligence/preparedness";

it("analyzes alignment", async () => {
  const mockLLM = async (prompt: string) =>
    JSON.stringify([
      {
        assessmentItemNumber: 1,
        alignment: "aligned",
        // ...
      },
    ]);

  const result = await getAlignment(prep, assessment, mockLLM);
  expect(result).toHaveLength(1);
});
```

### Integration Tests

Test full flow with real API:

```ts
import { getAlignment, getSuggestions } from "@/services_new/preparednessService";

it("completes full analysis", async () => {
  const alignment = await getAlignment(prep, assessment);
  const suggestions = await getSuggestions(alignment);
  expect(suggestions.length > 0).toBe(true);
});
```

### Manual Testing

1. Open `/preparedness`
2. Input prep text and assessment items
3. Review alignment table
4. Select suggestions
5. Download rewritten assessment

---

## Performance Considerations

- **Parallel Calls**: Alignment → Suggestions can run sequentially (Suggestions depends on Alignment), but other operations are parallelizable
- **Streaming**: For long assessment documents, consider streaming LLM responses
- **Caching**: Cache alignment results in SessionStorage to avoid re-analyzing same documents
- **Rate Limiting**: Honor LLM API rate limits (currently configured per Vercel Runtime)

---

## Future Enhancements

- [ ] Save Preparedness analyses to Supabase
- [ ] Diff viewer for before/after assessment items
- [ ] Collaborative editing of suggestions
- [ ] Batch analysis of multiple assessments
- [ ] Custom Bloom's taxonomy scales per subject
- [ ] Integration with ConceptGraph for concept extraction
- [ ] PRISM v4 integration for student performance correlation

---

## References

- Schema: `src/prism-v4/schema/README.md`
- LLM Orchestration: `src/prism-v4/intelligence/preparedness.ts`
- Type Exports: `src/prism-v4/schema/domain/Preparedness.ts`
- API Route: `api/v4/preparedness.ts`
