# 🧪 Rewriter Testing Guide for Test Writers

## What to Test: The New AI Rewriter

Your assignment rewrites should now be **real AI improvements**, not placeholder find/replace operations.

---

## 🎯 Test Scenario 1: Verify AI is Actually Rewriting

**Setup:**
1. Start the app (`npm run dev`)
2. Paste a real assignment (math, science, or any subject)
3. Let it parse and tag
4. Run the simulation (you'll see student feedback)
5. Click **"✏️ Rewrite Again"** on the comparison page

**Expected Behavior:**
- Status shows "🔄 Rewriting..."
- After a few seconds, new version appears
- Questions should address specific student confusion points
- **It should NOT be just find/replace** (very→extremely)

**How to Verify Real AI:**
- Look at how confusing questions changed
- Example good rewrite: "Simplify this expression using order of operations" → "First, simplify what's in parentheses. Then multiply by 2. Finally, subtract 3."
- Example bad rewrite (NOT happening): "Simplify this extremely complex expression" (just added "extremely")

**✅ Test Passes If:**
- Wording is clearer and more step-by-step
- Confusion areas got specific attention
- Problem difficulty feels similar (not harder)
- Bloom's level didn't change

---

## 🎯 Test Scenario 2: Verify Bloom's Level Stays Same

**Setup:**
1. Create an assignment focused on "Remember" level (definitions, formulas, basic recall)
2. Simulate and get student feedback
3. Click "Rewrite Again"

**Expected Behavior:**
- Rewrite makes definitions clearer
- Adds examples or scaffolding
- **Does NOT introduce "Analyze" or "Evaluate" level questions**
- Same cognitive demand

**Manual Check:**
- Original: "Define photosynthesis"
- Rewriter should NOT change to: "Analyze how photosynthesis varies across ecosystem types" (that's "Analyze")
- Rewriter should change to: "Define photosynthesis. (Hint: Think about how plants use sunlight)"

**✅ Test Passes If:**
- All rewritten questions fit the same Bloom's level bucket
- View page shows Bloom's distribution unchanged before/after

---

## 🎯 Test Scenario 3: Verify Confusion Gets Addressed

**Setup:**
1. Generate an assignment with **complex, multistep problems**
2. Run simulation - expect high confusion scores
3. Click "Rewrite Again"

**Expected Behavior:** For a problem like:
```
Original: "Given triangle ABC with sides a=5, b=12, find angle C using the law of cosines."
```

Should rewrite to something like:
```
"Find angle C in triangle ABC.
   a = 5 (one side)
   b = 12 (another side)
   c = 13 (third side)
   
   Step 1: Use the law of cosines: c² = a² + b² - 2ab·cos(C)
   Step 2: Substitute the values
   Step 3: Solve for cos(C)
   Step 4: Use inverse cosine to find C"
```

**✅ Test Passes If:**
- Confusing multistep problems get broken down
- More scaffolding appears
- Still requires same level of thinking, just clearer

---

## 🎯 Test Scenario 4: Verify No Rigor Creep

**Setup:**
1. Create assessment for **Grade 6 (basic fractions and decimals)**
2. Simulate and note feedback
3. Rewrite
4. Compare metrics

**RED FLAG - DON'T PASS TEST If:**
- Rewritten problems suddenly ask for algebra
- New problem types appear (word problems become graphing)
- Difficulty noticeably increases
- Students would be blindsided by the rewrite

**✅ Test Passes If:**
- Difficulty feels familiar to original
- May clarify confusing wording, but scope is same
- Could be given to same student group without major changes needed

---

## 🎯 Test Scenario 5: Verify Version Tracking Works

**Setup:**
1. Generate assignment
2. Simulate → get feedback
3. Click "Rewrite Again" → Version 2 created
4. Simulate Version 2 → get new feedback
5. Click "Rewrite Again" → Version 3 created

**Expected Behavior:**
- UI shows you're working with Version 3
- Can see history of versions (backend is tracking)
- Each version has associated feedback that prompted it

**Code Check:**
```typescript
// In browser console:
import { useRewrite } from './hooks/useRewrite';
// Should show currentVersionNumber: 3
// Should show previousVersions with Version 1 and Version 2
```

**✅ Test Passes If:**
- Can do multiple rewrites in sequence
- No data loss between versions
- Version numbers increment

---

## 🎯 Test Scenario 6: Verify Universal Instructions Are Working

**Setup:**
1. Create assignment with mixed cognitive levels
2. Note the Bloom's distribution in View page
3. Simulate and get feedback
4. Rewrite

**What Happens Behind the Scenes:**
- Claude receives the **Universal Instruction Block**
- One of the rules: "Do not escalate Bloom's level"
- AI constrains itself to improvements within that level

**How to Verify:**
Check that:
- ✅ No "Remember" questions become "Analyze"
- ✅ No "Apply" questions become "Create"
- ✅ No new scaffolding removes thinking
- ✅ Clarity improves WITHOUT rigor increase
- ✅ Wording improved, but cognitive level same

**✅ Test Passes If:**
- Rewritten version feels at same difficulty as original
- Specific confusions addressed through clearer wording
- Not through easier thinking OR harder thinking

---

## 🛠️ Technical Testing Checklist

### Before Running Tests:
- [ ] `npm run dev` starts successfully
- [ ] No TypeScript errors in console
- [ ] `REACT_APP_ANTHROPIC_API_KEY` is set (check with `echo $REACT_APP_ANTHROPIC_API_KEY`)
- [ ] API key is valid (test: you have Anthropic account with credits)

### During Rewrite:
- [ ] "🔄 Rewriting..." message appears
- [ ] Takes 3-10 seconds (API call + parsing)
- [ ] New version appears with changed questions
- [ ] No browser errors in console (F12)
- [ ] Comparison view loads with both versions visible

### After Rewrite:
- [ ] Metrics appear (time, confusion, success rate)
- [ ] Comparison shows before/after stats
- [ ] Can click elements without freezing
- [ ] Can rewrite again (loop works)

---

## 📊 Expected Metrics Before/After Rewrite

### For High-Confusion Assignment:
```
BEFORE:
- Average confusion per question: 65%
- Student success rate: 52%
- Time on task: 35 min

AFTER (expected):
- Average confusion per question: 45% (↓20%)
- Student success rate: 68% (↑16%)
- Time on task: 33 min (~same)
  → Faster because clearer, not because easier
```

### Note on Time:
- Sometimes goes DOWN (clearer wording = faster)
- Sometimes goes UP (more scaffolding = slightly longer)
- Should NOT change dramatically (±5-10% is normal)

---

## 🐛 Common Issues & Solutions

### Issue: Rewrite Shows Same Text as Original
**Problem:** Rewriter might be falling back to local rules
**Solution:**
1. Check API key is set: `echo $REACT_APP_ANTHROPIC_API_KEY`
2. Check console for errors (F12)
3. If error: "API key invalid or expired" → Verify key in Anthropic dashboard

### Issue: Takes Too Long (>30 seconds)
**Solution:**
1. That's not normal - Claude usually responds in 5-15 seconds
2. Check network tab (F12) for stalled request
3. If stalled: May be rate-limited → Try again in 1 min

### Issue: Rewrite Seems Random/Inconsistent
**Expected:** Different rewrites each time (AI is generative)
**Expected:** But all should follow the same universal rules
**Check:** Does every rewrite keep Bloom's level same? If yes, it's working correctly.

### Issue: "Placeholder Rewrite" Appearance
**Old Problem (FIXED):** Used to do find/replace (very→extremely)
**New Implementation:** Real Claude API call
**Verify:** Check that changes are meaningful (not just word swaps)

---

## 📈 Success Criteria for Full Implementation

By the end of testing:

✅ **Functional:**
- AI rewriter responds to "Rewrite Again" button
- Takes student feedback into account
- Produces meaningful improvements to confusing questions

✅ **Pedagogical:**
- Bloom's levels maintained (no escalation)
- Difficulty comparable to original
- Confusion addressed through clarity, not dumbing down

✅ **Technical:**
- API integration works reliably
- Fallback to local rules if API unavailable
- Version history tracking works
- Build has no TypeScript errors

✅ **User Experience:**
- Loading states show progress
- Error messages are clear
- Can iterate (rewrite multiple times)
- Comparison view easy to understand

✅ **Professional:**
- Rewrites feel like a human educator made them
- Not obviously AI-generated awkwards
- Addresses specific feedback, not generic improvements

---

## 🧪 Test Template: Use This for Your Testing Session

```markdown
# Rewriter Test Results - [Date]

## Test 1: Real AI Rewriting (Scenario 1)
- Subject: ___
- Original confusion level: ___
- Rewrite happened: [ ] Yes [ ] No
- Improvements felt meaningful: [ ] Yes [ ] No
- Notes: ___

## Test 2: Bloom's Level Preserved (Scenario 2)
- Original Bloom's levels: ___
- Rewritten Bloom's levels: ___
- Escalation detected: [ ] Yes [ ] No
- Notes: ___

## Test 3: Confusion Addressed (Scenario 3)
- Problem with highest confusion: ___
- How rewriter addressed it: ___
- Effective: [ ] Yes [ ] No
- Notes: ___

## Test 4: No Rigor Creep (Scenario 4)
- Assessment level: ___
- Difficulty change: [ ] Lower [ ] Same [ ] Higher
- Acceptable: [ ] Yes [ ] No
- Notes: ___

## Test 5: Version Tracking (Scenario 5)
- Versions created: ___
- Version numbers correct: [ ] Yes [ ] No
- History tracking works: [ ] Yes [ ] No
- Notes: ___

## Test 6: Universal Instructions (Scenario 6)
- Bloom's level maintained: [ ] Yes [ ] No
- New task types: [ ] None detected [ ] Some detected
- Rigor appropriate: [ ] Yes [ ] No
- Notes: ___

## Overall Assessment
- System ready for production use: [ ] Yes [ ] No
- Major issues found: [ ] None [ ] Some
- Recommended next steps: ___
```

---

## 🚀 Ready to Test?

1. **Check environment:**
   ```bash
   npm run dev  # Should start with 0 TS errors
   ```

2. **Verify API key:**
   ```bash
   echo $REACT_APP_ANTHROPIC_API_KEY  # Should show your key
   ```

3. **Run Scenario 1** (Real AI Rewriting)
   - Load an assignment
   - Simulate
   - Click "Rewrite Again"
   - If you see meaningful improvements → API is working!

4. **Run remaining scenarios** in order

5. **Document findings** in test template above

---

## 📞 If Tests Fail

**Where to check for errors:**
1. Browser console (F12 → Console tab)
   - Look for "Error:", "Failed:", or red X messages
   
2. Network tab (F12 → Network tab)
   - Look for failed requests to anthropic.com
   - Check response status (should be 200)

3. Terminal where you ran `npm run dev`
   - Check for TypeScript errors or warnings

4. Application state:
   - Browse to `/admin` dashboard
   - Check if payload tracking shows what was sent to Claude

---

## ✅ When You're Done

Please report:
1. ✅ Which scenarios pass/fail
2. ✅ Any unexpected behaviors
3. ✅ Suggestions for improving rewrite quality
4. ✅ Whether deployment ready: Yes/No

