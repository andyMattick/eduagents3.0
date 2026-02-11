# 🔒 Universal Assessment Creation & Rewriting Guide

## Quick Start: Copy-Paste Instructions for AI

You can use these instructions **anywhere** you ask AI to create or rewrite an assessment:

---

## 🧠 UNIVERSAL ASSESSMENT ALIGNMENT & RIGOR CONTROL INSTRUCTIONS

When creating or rewriting this assessment, follow these rules STRICTLY:

### 1️⃣ Alignment Priority
The assessment must mirror the structure, difficulty, and cognitive level of the source material.
- Do not introduce new types of tasks that were not practiced
- Do not increase conceptual depth beyond what students experienced
- Do not escalate to higher-order thinking unless it was explicitly present in the source material

**Alignment is more important than rigor.**

---

### 2️⃣ Bloom's Level Restriction
Match the highest Bloom's level present in the source material.
- If the material focuses on recall, identification, formula use, and procedural computation → assessment must remain at that level
- Do not introduce synthesis, evaluation, experimental design, or extended essays unless they were practiced
- Do not add multi-step reasoning if practice problems were single-step

**The test must NOT exceed the cognitive demand students were trained for.**

---

### 3️⃣ Structural Similarity (Not 1-to-1 Copying)
The assessment should:
- Include similar categories of questions
- Maintain similar balance of computation vs conceptual questions
- Use similar scaffolding level
- Change numbers or context, but NOT structure
- Feel familiar to students who completed the review

**It should feel like a natural extension of practice — not a new challenge format.**

---

### 4️⃣ Difficulty Guardrails (NO CREEP)
Do NOT:
- Combine multiple concepts into one question if practice kept them separate
- Remove scaffolding if practice included it
- Add "design," "create," or "justify deeply" prompts unless practiced
- Increase abstraction level
- Add rigor for its own sake

**If unsure, choose the SIMPLER version.**

---

### 5️⃣ When Rewriting Based on Student Feedback
If rewriting an existing assessment based on simulation feedback:
- Address specific student struggles WITHIN the same cognitive level
- Clarify confusing wording
- Break down multistep problems students struggled with (but maintain overall difficulty)
- Add intermediate scaffolding steps without increasing overall rigor
- Fix terminology inconsistencies
- Do NOT change Bloom's levels of existing problems

---

### 6️⃣ Self-Check Before Finalizing
Before presenting the assessment, VERIFY:
- Does any question exceed the practiced Bloom's level?
- Did you introduce a new task type?
- Is the difficulty noticeably higher than the training material?
- Would students feel blindsided by the rewrite?

**If YES to any of these → revise downward.**

---

## 📊 Integration in eduagents3.0

### Where This Is Used

**In the AI Rewriter** (`src/agents/rewrite/rewriteAssignmentWithFeedback.ts`):
- Every time you click "✏️ Rewrite Again", the universal instructions are automatically included
- Claude AI receives the full instruction block + student feedback
- The AI improves clarity and reduces confusion while maintaining the same cognitive level

**Key Features:**
- ✅ Prevents difficulty creep
- ✅ Maintains Bloom's alignment
- ✅ Targets specific confusion points
- ✅ Uses real AI analysis (Claude 3.5 Sonnet)
- ✅ Iterative improvement loop

---

###  The Rewrite-Test-Improve Loop

1. **Generate** → Create assignment
2. **Test** → Run simulation on student personas
3. **Analyze** → View feedback by question, see which problems confused students
4. **Compare** → View metrics showing which changed
5. **Rewrite Again** → AI applies Universal Instructions + student feedback
6. **Loop** → Test new version and compare again

Each iteration stays within original cognitive level while improving clarity.

---

## 📝 Example: What Gets Better

### Before Rewrite
Student Feedback:
- ❌ "This problem is confusing - I don't know where to start"
- ❌ "Too many things happening at once"
- ❌ "The wording is unclear"

### After AI Rewrite (With Universal Instructions)
- ✅ Confusing wording clarified (same Bloom's level)
- ✅ Multistep problem broken into clearer sections (same cognitive level)
- ✅ Terminology made consistent
- ✅ Scaffolding added without reducing rigor
- **Bloom's level: UNCHANGED**
- **Cognitive demand: SAME**

---

## 🔧 For Developers: How It Works

### File Structure

**New Files Added:**
- `src/agents/rewrite/rewriteAssignmentWithFeedback.ts` - AI rewriter with universal instructions
- `src/hooks/useRewrite.ts` - State management for rewrite loop
- `src/components/Pipeline/RewriteComparisonStep.tsx` - UI for version comparison

### The Rewrite Process

```typescript
// Step 1: Collect feedback + original assignment
const context = {
  originalAssignment,      // GeneratedAssignment
  studentFeedback,         // StudentFeedback[]
  completionStats: {       // Metrics from simulation
    averageTimeSeconds,
    confusionLevel,
    successRate,
    strugglingProblems: []
  }
};

// Step 2: Call AI rewriter
const result = await rewriteAssignment(context);

// Step 3: Returns improved GeneratedAssignment
// (with same structure, same Bloom's levels, clearer wording)
```

### What Claude Receives

```
[UNIVERSAL INSTRUCTION BLOCK]

Original Assignment:
- Bloom's distribution
- All problems (first 2 from each section shown)
- Structure

Student Feedback:
- Specific confusion points
- Suggestions
- Completion stats

Your task: Rewrite addressing confusion while maintaining:
- Same cognitive level (Bloom's)
- Same problem count
- Same structure
- No added rigor
```

---

## 🎯 Best Practices for Using This

### For Test Writers
1. Upload source material → Generate assignment
2. Look at Bloom's distribution in View page
3. Run simulation to see student feedback
4. If confusion/weaknesses present → Click "Rewrite Again"
5. Compare versions - see metrics improvement
6. Save when satisfied

### For Teachers Using AI
1. Paste universal instructions **before** asking AI to create/modify assignments
2. Provides clarity on what level you need
3. AI won't accidentally add rigor or new task types

### For Developers Extending This
1. The universal block is embedded in `rewriteAssignmentWithFeedback.ts` (line ~10)
2. Claude prompt includes it automatically
3. Can be customized per subject/grade by modifying the instruction text
4. Local fallback (if Claude unavailable) in `applyLocalRewriteRules()`

---

## ⚙️ Configuration

### Environment Variables Needed
```bash
REACT_APP_ANTHROPIC_API_KEY=your_claude_api_key
```

### API Endpoint
```
https://api.anthropic.com/v1/messages
Model: claude-3-5-sonnet-20241022
Max tokens: 4000
```

### Response Format
AI returns JSON:
```json
{
  "title": "rewritten title",
  "sections": [...],
  "summaryOfChanges": "Bullet list of improvements"
}
```

---

## 💡 Why This Works

**AI Tends To:**
- Add synthesis questions
- Add application beyond practice
- Design more "interesting" problems
- Increase abstraction
- Add rigor

**Universal Instructions:**
- Force alignment with original
- Cap Bloom's level
- Prevent scope creep
- Make difficulty predictable
- Keep students from being blindsided

---

## 🚀 Current Implementation Status

✅ **Implemented:**
- Universal Instruction Block (embedded in rewriter)
- AI-powered rewriting via Claude
- Feedback integration
- Rewrite loop UI (RewriteComparisonStep)
- Version history tracking
- Build successful (992 modules)

🔄 **Next Steps:**
- Test end-to-end rewrite flow with actual API key
- Implement version comparison visualization
- Add rewrite suggestions to question feedback
- Track which specific problems improved

---

## 📞 Troubleshooting

### "AI Rewrite Failed, Using Local Rules"
- Check `REACT_APP_ANTHROPIC_API_KEY` is set
- Verify API key is valid
- Local improvements will still be applied

### "Placeholder Rewrite" (Old Issue - Now Fixed!)
- Previous version used find/replace
- New version calls Claude with full context
- Should now see real improvements

### Build CSS Warnings
- Non-critical CSS parsing warning
- Does not affect functionality
- Can be ignored

---

## 📚 References

- **Bloom's Taxonomy**: https://www.vanderbilt.edu/cft/guides-sub-pages/blooms-taxonomy/
- **Cognitive Load Theory**: Sweller et al.
- **Assessment Alignment**: Webb's Depth of Knowledge (DOK)
- **Universal Design**: UDLI principles

