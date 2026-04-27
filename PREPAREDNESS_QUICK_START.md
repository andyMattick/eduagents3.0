# Preparedness Feature — Quick Start Guide

## 🚀 Start Here

The **Preparedness Feature** is a complete, production-ready assessment-to-prep alignment analysis system.

### What It Does (In 30 Seconds)

1. Teacher uploads assessment + prep materials
2. LLM analyzes alignment (concepts, Bloom's levels, gaps)
3. System suggests test-based or prep-based fixes
4. Teacher selects suggestions
5. System rewrites assessment and/or adds prep materials
6. Teacher downloads the result

---

## 📍 Where Everything Is

### Data Types & Contracts
```
src/prism-v4/schema/domain/
├── PreparednessAlignment.ts    (alignment results type)
├── PreparednessSuggestions.ts  (suggestion types)
├── PreparednessRewrite.ts      (rewrite output type)
└── Preparedness.ts             (central exports) ✨
```

### LLM Logic
```
src/prism-v4/intelligence/
├── preparedness.ts              (3-phase LLM orchestrator)
└── PREPAREDNESS_GUIDE.md        (detailed docs)
```

### Backend API
```
api/v4/
└── preparedness.ts              (Vercel serverless handler)
```

### Frontend Services & Hooks
```
src/services_new/preparednessService.ts  (API calls + utilities)
src/hooks/usePreparedness.ts             (React hook for state)
```

### UI Components
```
src/components_new/v4/
├── AlignmentTable.tsx      (show alignment results)
├── SuggestionsPanel.tsx     (selectable fix suggestions)
├── RewriteOutput.tsx        (download rewritten docs)
└── PreparednessPage.tsx     (main orchestrator) ✨
```

### Documentation
```
src/prism-v4/intelligence/PREPAREDNESS_GUIDE.md  (architecture & integration)
PREPAREDNESS_IMPLEMENTATION_SUMMARY.md            (what was built)
PREPAREDNESS_USAGE_EXAMPLES.tsx                   (copy-paste examples)
```

---

## 🎯 Three Ways to Use It

### 1️⃣ **Simplest: Just Drop It In**

```tsx
import PreparednessPage from "@/components_new/v4/PreparednessPage";

<PreparednessPage />
```

The component handles everything. Done.

### 2️⃣ **With Pre-Loaded Documents**

```tsx
<PreparednessPage
  prep={{ rawText: "..." }}
  assessment={{ items: [...] }}
/>
```

### 3️⃣ **Fine-Grained Control via Hook**

```tsx
const { alignment, suggestions, startAlignment } = usePreparedness();

<button onClick={() => startAlignment(prep, assessment)}>
  Analyze
</button>
{alignment && <AlignmentTable alignment={alignment} />}
```

---

## ✅ Integration Checklist

- [ ] **Found the right file?**  
  👉 Decide: use `PreparednessPage` (easiest) or `usePreparedness` hook (custom)?

- [ ] **Add to routing**  
  👉 Add route or button that shows the component

- [ ] **Test it**  
  👉 Navigate to the page, input prep + assessment, follow the flow

- [ ] **Customize (optional)**  
  👉 Change prompts in `preparedness.ts`  
  👉 Change LLM model in `api/v4/preparedness.ts`  
  👉 Change styling in `v4.css`

---

## 🔌 Integration Examples

See **`PREPAREDNESS_USAGE_EXAMPLES.tsx`** for 6 copy-paste examples:

1. Standalone page
2. TeacherStudio tab
3. Custom multi-step workflow
4. Direct service usage  
5. Button in document viewer
6. Pre-loaded documents

---

## 🧪 Quick Test (2 Minutes)

1. Add route:
   ```tsx
   <Route path="/preparedness" element={<PreparednessPage />} />
   ```

2. Navigate to `/preparedness`

3. Click "Input Documents"

4. Paste this prep:
   ```
   Introduction to z-scores. A z-score tells you how many 
   standard deviations a value is from the mean.
   ```

5. Paste assessment (one per line):
   ```
   1. What is a z-score?
   2. Calculate z-scores for: x=80, mean=75, std=5
   ```

6. Watch it analyze, suggest, and rewrite! 🎉

---

## ❓ Common Questions

**Q: Can I change the LLM model?**  
A: Yes. In `api/v4/preparedness.ts`, change the `callGemini` function to use your preferred LLM.

**Q: Can I customize the Bloom's taxonomy?**  
A: Yes. Edit the prompt in `src/prism-v4/intelligence/preparedness.ts`.

**Q: How do I style the UI?**  
A: Components use inline styles + `src/components_new/v4/v4.css` classes.

**Q: Does it save results?**  
A: Not yet. You can add Supabase persistence to `applyRewrite`. See `PREPAREDNESS_GUIDE.md`.

**Q: Can I batch analyze multiple assessments?**  
A: No, but the architecture supports it. See "Future Enhancements" in the guide.

---

## 📚 Read Next

1. **Quick integration?** → `PREPAREDNESS_USAGE_EXAMPLES.tsx` (copy-paste)
2. **Deep dive?** → `src/prism-v4/intelligence/PREPAREDNESS_GUIDE.md` (architecture, customization, testing)
3. **What was built?** → `PREPAREDNESS_IMPLEMENTATION_SUMMARY.md` (overview)

---

## 🎓 How It Works (ELI5)

1. **Teacher**: "Here's my lesson and my quiz. Are they aligned?"
2. **System**: Gets quiz questions. Searches lesson. Rates match (Bloom levels). [Alignment Phase]
3. **System**: "Question 3 is asking for Analysis, but you only taught Application." [Suggestion Phase]
4. **Teacher**: "Fix it by making Question 3 easier."
5. **System**: "Here's the revised quiz." [Rewrite Phase]
6. **Teacher**: Downloads the fixed quiz.

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Component not found | Check imports: `from "@/components_new/v4/PreparednessPage"` |
| API returns error | Make sure Gemini API is configured in your Vercel env |
| LLM response invalid JSON | Check your LLM is returning valid JSON (not markdown) |
| Styling looks weird | Import `v4.css` in your application |

---

## 🆘 Need Help?

- **Architecture questions?** → See `PREPAREDNESS_GUIDE.md`
- **Usage examples?** → See `PREPAREDNESS_USAGE_EXAMPLES.tsx`
- **What files exist?** → This file (Quick Start)
- **Type definitions?** → See `src/prism-v4/schema/domain/Preparedness.ts`

---

**Status: ✅ Build successful. Ready to integrate.**

You have everything you need. Pick your integration style and go! 🚀
