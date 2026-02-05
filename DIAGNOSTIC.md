# Pipeline Issue Diagnostic

## User Observation
User reports: "I don't see anything but assignment upload"

## Expected Flow After Upload
1. ✅ User sees "Get Started" button
2. ✅ User clicks → sees "Upload File" or "Generate with AI" tabs
3. ✅ User uploads file → sees "Continue" button after preview
4. ❌ **ISSUE**: Pipeline doesn't advance to next steps (PROBLEM_ANALYSIS, CLASS_BUILDER, etc.)

## Investigation Steps

### Step 1: Check console for errors
- Open DevTools (F12)
- Check Console tab for red errors
- Search for: "analyzeTextAndTags", "ERROR", or "Failed"

### Step 2: Check state transitions  
Look for console logs:
- 📍 handleNextStep called
- 🔄 nextStep() called at step
- ✅ SIMULATION COMPLETE
- (these are from usePipeline.ts)

### Step 3: Potential Issues

**Issue A**: `analyzeTextAndTags` throwing silent error
- Check if error state is set in pipe
- Look in usePipeline.ts line 45-65

**Issue B**: Step not advancing from INPUT
- After handleDirectUpload calls analyzeTextAndTags
- Check if state.currentStep is set to PROBLEM_ANALYSIS
- usePipeline.ts line 59

**Issue C**: Component conditionals blocking render
- PipelineShell only shows PROBLEM_ANALYSIS when:
  ```
  step === PipelineStep.PROBLEM_ANALYSIS && asteroids?.length > 0
  ```
- Verify asteroids are being extracted (line 55 in usePipeline.ts)

## Quick Fix Checklist

If asteroids aren't being extracted:
- `extractAsteroidsFromText()` may be failing
- Check `src/agents/pipelineIntegration.ts`
- File: `src/agents/shared/convertExtractedToAsteroid.ts`

## Files to Review
- `src/components/Pipeline/PipelineShell.tsx` - Main render logic
- `src/hooks/usePipeline.ts` - State machine
- `src/agents/pipelineIntegration.ts` - Asteroid extraction
