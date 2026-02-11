# 🚀 Real AI Rewriter: End-to-End Quick Start

## ⚡ 5-Minute Setup

### Step 1: Get Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to "API Keys" (left sidebar)
4. Click "Create Key"
5. Copy the key: `sk-ant-v1-...`

### Step 2: Set Environment Variable
```bash
# In terminal, at workspace root:
export REACT_APP_ANTHROPIC_API_KEY="sk-ant-v1-your-key-here"

# Verify it's set:
echo $REACT_APP_ANTHROPIC_API_KEY  # Should show your key
```

### Step 3: Start Dev Server
```bash
npm run dev
# Should start on http://localhost:5173
```

### Step 4: Verify Build
```bash
# In another terminal:
npm run build

# Should complete with:
# ✓ 992 modules transformed
# ✗ Zero TypeScript errors
```

---

## 🧪 Test the Full Loop (10 minutes)

### 1️⃣ Generate Assignment
1. Open http://localhost:5173
2. Paste this assignment:

```
Section 1: Photosynthesis Identification
1. Define photosynthesis.
2. List three inputs of photosynthesis (water, light, CO2).
3. What is the primary product of photosynthesis? (Glucose)

Section 2: Process Understanding
4. Explain where photosynthesis occurs in the plant cell.
5. Why is photosynthesis essential for life on Earth?
6. Compare photosynthesis to cellular respiration.

Section 3: Application
7. If a plant is in darkness, what happens to photosynthesis?
8. Design an experiment to show that light is necessary for photosynthesis.
```

3. Click "Analyze & Tag"
4. Wait for tags to appear

### 2️⃣ View Analysis
1. Look at "Tag Analysis" tab
   - Should see Bloom's levels (Remember, Understand, Apply)
   - Should see complexity scores
2. Click "Next" to see student feedback

### 3️⃣ Check Student Simulations
1. On "Student Feedback" tab, you'll see feedback from different student personas
2. Look for:
   - ✅ Confusion signals (problems marked with high confusion %)
   - ✅ Time on task (should align with problem complexity)
   - ✅ Student success rates (struggle areas)

**Expected confused problems:** 5, 6, 8 (higher cognitive levels)

### 4️⃣ View Before/After Metrics
1. Click "Rewrite Comparison" tab
2. See:
   - **Before:** Original metrics (confusion %, success rate, time)
   - **After:** Rewritten metrics (should improve)
3. Problems should be clearer, not harder

### 5️⃣ **THE KEY TEST - Rewrite Again**
1. On comparison view, scroll to "Rewrite Again" button
2. Click it
3. **OBSERVE:**
   - Should see "🔄 Rewriting..." message
   - Takes 5-15 seconds
   - New version appears with rewritten problems

**WHAT TO CHECK:**
- ✅ Problems got step-by-step scaffolding
- ✅ Confusing terminology clarified
- ✅ Same Bloom's level (not harder thinking)
- ✅ Confusion likely decreased

**Example - Before vs After:**

```
BEFORE:
"Why is photosynthesis essential for life on Earth?"
→ Confusion: 65%

AFTER (Real AI):
"Photosynthesis is essential for life because:
   A. It produces _______ (the energy source for most organisms)
   B. It produces _______ (the gas we breathe)
   
   Why would life on Earth not survive without photosynthesis?
   (Think about food chains and oxygen availability)"
→ Confusion: 35%
```

**Example - BAD (Not happening anymore):**
```
BEFORE: "Why is photosynthesis extremely essential..."
↑ This was the old placeholder (just word swaps)
↓ This does NOT happen now
```

### 6️⃣ Loop Again (Optional but Recommended)
1. On new rewritten version, click "Retest" button
2. Watch simulation run again on improved version
3. Get new student feedback
4. Click "Rewrite Again" if confusion still high
5. Repeat 2-3 times to see iterative improvement

**Expected Pattern:**
```
Version 1 (Original)
→ Simulate → Confusion: 50%, Time: 28 min, Success: 58%
  
  "Rewrite Again"
  ↓
  
Version 2 (First Rewrite)
→ Simulate → Confusion: 38%, Time: 27 min, Success: 72%
  
  "Rewrite Again"
  ↓
  
Version 3 (Second Rewrite)
→ Simulate → Confusion: 28%, Time: 26 min, Success: 81%
```

---

## ✅ Success Criteria Checklist

### Must Pass:
- [ ] "Rewrite Again" button triggers API call (shows loading state)
- [ ] New problems appear with different wording
- [ ] Changes are meaningful (not just find/replace)
- [ ] Bloom's level stays same (no escalation)
- [ ] Confusion reduces in comparison metrics

### Should See:
- [ ] Problems with high confusion get scaffolding
- [ ] Unclear terminology gets clarified
- [ ] Multistep problems broken into steps
- [ ] Metrics improve (confusion down, success up)
- [ ] Can rewrite multiple times in sequence

### Technical Checks:
- [ ] No TypeScript errors in console
- [ ] API key loaded (check terminal: `echo $REACT_APP_ANTHROPIC_API_KEY`)
- [ ] No network errors (check F12 Network tab)
- [ ] Build successful (`npm run build` = 0 TS errors)

---

## 🐛 Troubleshooting

### "Rewrite Again" button doesn't do anything
**Check:**
```bash
echo $REACT_APP_ANTHROPIC_API_KEY
# Should print your key, not empty
```

If empty:
```bash
export REACT_APP_ANTHROPIC_API_KEY="sk-ant-v1-..."
npm run dev  # Restart dev server
```

### Rewrite shows same text (falling back to local rules)
**Check Console (F12):**
- Look for "Error:" messages
- Check Network tab → anthropic.com requests

**Common errors:**
```
"Invalid API key" 
→ Check key is correct, has no extra spaces

"Rate limited"
→ Wait 60 seconds, try again

"Connection failed"
→ Check internet, Anthropic API status
```

### Takes too long (>30 seconds)
**Normal:** 5-15 seconds
**If longer:**
1. Check Network tab (F12) for stalled request
2. Check if Anthropic API is down (status.anthropic.com)
3. Try again - may be transient

### "Local rewrite rules" appear
**This means:**
- API failed, fallback activated
- Should still see improvements (just less sophisticated)
- Check console for why API failed

```typescript
// In console, check:
getLastSimulateStudentsPayload()  // Should show data
```

---

## 📊 Understanding the Metrics

### Before Rewrite (Original)
```
Confusion: 50%
  ↓ Lower is better
Success Rate: 60%
  ↓ Higher is better
Time: 28 minutes
  ↓ Should be ~same after rewrite
```

### After Rewrite (AI Improved)
```
Confusion: 35% (↓15% improvement)
  ✅ Clearer wording, scaffolding added
Success Rate: 75% (↑15% improvement)
  ✅ More accessible, still same level
Time: 27 minutes (↓1 min, ~same)
  ✅ Slightly faster because clearer
```

### Red Flags (DON'T ACCEPT)
```
❌ Confusion: 60% (increased!)
❌ Success Rate: 40% (decreased!)
❌ Time: 45 minutes (much longer)
❌ New problem types appeared
❌ Bloom's level clearly escalated
```

---

## 🔍 Deep Inspection: What Claude Receives

To debug/verify the prompt being sent to Claude:

```javascript
// In browser console:
import { generateRewritePrompt } from './agents/rewrite/rewriteAssignmentWithFeedback.ts';

// This shows what gets sent to Claude
console.log(generateRewritePrompt(context));
```

**Should see:**
1. UNIVERSAL_INSTRUCTION_BLOCK (at top)
2. Original assignment structure
3. Bloom's distribution
4. Student feedback (specific confusion points)
5. Completion statistics
6. Examples of first 2 problems

---

## 🎯 What Improved AI Rewriter Does

### Before (Old System - Placeholder)
```typescript
// Old rewriteAssignment.ts (regex-based)
const newText = problemText
  .replace(/very/g, 'extremely')
  .replace(/really/g, 'notably');
// ❌ Just word swaps, no actual improvement
```

### After (New System - Real AI)
```typescript
// New rewriteAssignmentWithFeedback.ts (Claude-powered)

// 1. Analyze confusion (which problems confused students?)
const confusingProblems = feedb back
  .filter(f => f.confusionLevel > 0.60)
  .map(f => originalAssignment.problems[f.problemId]);

// 2. Create detailed prompt with:
//    - Universal Instruction Block
//    - Student feedback
//    - Original Bloom's levels
//    - Confusion hotspots

// 3. Send to Claude with constraints

// 4. Claude rewrites:
//    ✅ Adds scaffolding (steps, hints)
//    ✅ Clarifies terminology
//    ✅ Breaks multistep into digestible pieces
//    ✅ Maintains same cognitive level
//    ✅ Respects structure

// Result: Real, meaningful improvements
```

---

## 🔄 The Rewrite-Test-Improve Loop Explained

```
START
  ↓
[1] CREATE ASSIGNMENT
    └─ Teacher enters text or uploads file
       ↓
[2] PARSE & TAG
    └─ System extracts problems
    └─ Tags Bloom's level, complexity, novelty
       ↓
[3] SIMULATE
    └─ Run on student personas
    └─ Get feedback per problem
       ↓
[4] VIEW RESULTS
    └─ See which problems confused students
    └─ Compare metrics vs targets
       ↓
[5] DECISION POINT: Acceptable?
    ├─ YES → Export & Use ✅
    └─ NO → Go to [6]
       ↓
[6] REWRITE AGAIN
    └─ Click "✏️ Rewrite Again" button
    └─ AI analyzes confusion
    └─ Creates improved version
       ↓
[7] SIMULATE AGAIN
    └─ Test improved version
    └─ Get new feedback
       ↓
[8] COMPARE VERSIONS
    └─ See improvement metrics
    └─ Check if confusion reduced
       ↓
[9] LOOP: Go to [5] or [6]
```

---

## 📚 Key Documents (Use These!)

1. **UNIVERSAL_ASSESSMENT_INSTRUCTIONS.md** - What the AI follows
2. **REWRITER_TESTING_GUIDE.md** - How to test thoroughly
3. **REWRITER_ARCHITECTURE.md** - Deep technical dive
4. **This file** - Quick start

---

## 🚀 You're Ready!

```bash
# 1. Set api key
export REACT_APP_ANTHROPIC_API_KEY="sk-ant-v1-..."

# 2. Start dev server
npm run dev

# 3. Test it!
# - Generate assignment
# - Simulate
# - Click "Rewrite Again"
# - See real AI improvements
```

### Expected Timeline:
- Generate assignment: 2-3 seconds
- Parse & tag: 1-2 seconds
- Simulate: 2-3 seconds
- **Rewrite Again: 8-15 seconds** (API call + parsing)
- View results: instant

---

## 💬 Quick FAQ

**Q: Why does rewrite take 10+ seconds?**
A: It's making a real API call to Claude (not local). Network includes request → Claude thinking → response → parsing.

**Q: Can I edit the rewrite?**
A: After rewrite, you can manually edit before saving.

**Q: What if I don't have API key?**
A: System falls back to local rules (less sophisticated but still improves clarity).

**Q: Can I rewrite multiple times?**
A: Yes! Each rewrite creates a new version. System tracks all versions.

**Q: How many rewrites cost?**
A: Claude charges per 1M input tokens (~$3) and output tokens (~$15). Each rewrite ~4K tokens = ~$0.05-0.10 per rewrite.

**Q: Does it maintain my original assignment?**
A: ✅ Yes. Bloom's level, structure, and number of problems stay the same. Only wording/clarity improves.

**Q: What if the rewrite is bad?**
A: You can manually edit it, or click "Rewrite Again" for a different improvement.

---

## 📞 Can't Figure Something Out?

Check these docs in order:
1. **Console errors** (F12 → Console tab) - Read error message
2. **REWRITER_TESTING_GUIDE.md** - Specific test scenarios
3. **REWRITER_ARCHITECTURE.md** - Technical details
4. **This quick start** - Basic troubleshooting

