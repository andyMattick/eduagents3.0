# 🎯 AIService: Start Here

## What Is This?
A unified abstraction layer for all AI operations that:
- ✅ Works offline with mocks (today)
- ✅ Connects to real APIs (when you're ready)
- ✅ Requires zero code changes to switch

## Quick Start (30 seconds)

```typescript
import { aiService } from '@/agents/api/aiService';

// It just works!
const assignment = await aiService.generateAssignment({
  prompt: 'Write about climate change',
  type: 'essay',
  gradeLevel: '10',
  subject: 'Science'
});
```

No setup. No API key. No backend. It's mocked and ready.

---

## Files You Need

### Read First (Choose One)
- 📄 **[README_AISERVICE.md](README_AISERVICE.md)** ← Start here (10 min)
- 📄 **[AISERVICE_QUICK_REFERENCE.md](AISERVICE_QUICK_REFERENCE.md)** ← Even quicker (5 min)

### Implementation Details
- 📄 **[AISERVICE_GUIDE.md](AISERVICE_GUIDE.md)** ← Complete reference
- 📄 **[AISERVICE_INTEGRATION_EXAMPLES.md](AISERVICE_INTEGRATION_EXAMPLES.md)** ← Code examples
- 📄 **[src/agents/api/aiService.ts](src/agents/api/aiService.ts)** ← Source code

### Related
- 📄 **[MOCK_TO_REAL_API_COMPLETE.md](MOCK_TO_REAL_API_COMPLETE.md)** ← Full overview
- 📄 **[API_PROCESSOR_INTEGRATION.md](API_PROCESSOR_INTEGRATION.md)** ← API integration

---

## The 9 Operations

| # | Operation | Status | Use When |
|---|-----------|--------|----------|
| 1 | `generateAssignmentQuestions()` | ✅ Mocked | Need individual questions |
| 2 | `generateAssignment()` | ✅ Mocked | Create full assignment |
| 3 | `analyzeTags()` | ✅ Mocked | Extract metadata |
| 4 | `breakDownProblems()` | ✅ Mocked | Split multi-part problems |
| 5 | `simulateStudentInteraction()` | ✅ Mocked | Model student metrics |
| 6 | `analyzeStudentWork()` | ✅ Mocked | Grade/feedback on work |
| 7 | `generateStudentFeedback()` | ✅ Mocked | Personalized feedback |
| 8 | `rewriteAssignment()` | ✅ Mocked | Improve assignment |
| 9 | `generateAccessibilityVariant()` | ✅ Mocked | Create accessible version |

---

## Switch Implementation

```typescript
// Development (default, no setup needed)
aiService.setImplementation('mock');

// Production (when ready)
aiService.setImplementation('real', {
  apiKey: 'sk-...',
  apiUrl: 'https://api.example.com'
});

// Check current
aiService.getImplementation(); // 'mock' | 'real'
```

Or use environment variables:
```env
REACT_APP_USE_REAL_API=false  # mock
REACT_APP_USE_REAL_API=true   # real
REACT_APP_API_KEY=sk-...
REACT_APP_API_URL=https://api.example.com
```

---

## Current State

| Category | Status | Details |
|----------|--------|---------|
| **Writing questions** | ✅ Complete mock | Generates realistic assignments |
| **Breaking problems apart** | ✅ Complete mock | Splits and tags problems |
| **Tagging** | ✅ Complete mock | Extracts metadata |
| **Student interaction** | ✅ Complete mock | Models realistic metrics |
| **Student analysis** | ✅ Complete mock | Provides feedback |
| **Rewriting** | ✅ Complete mock | Improves assignments |
| **Real API ready** | ✅ Framework | Just implement endpoints |

---

## Files to Integrate Later

These have hardcoded mock logic and can use `aiService`:

1. `src/agents/shared/generateAssignment.ts` → `aiService.generateAssignment()`
2. `src/agents/analysis/analyzeTags.ts` → `aiService.analyzeTags()`
3. `src/agents/analysis/asteroidGenerator.ts` → `aiService.breakDownProblems()`
4. `src/agents/rewrite/rewriteAssignment.ts` → `aiService.rewriteAssignment()`
5. `src/agents/simulation/simulateStudents.ts` → `aiService.generateStudentFeedback()`
6. `src/agents/simulation/simulationEngine.ts` → `aiService.simulateStudentInteraction()`

See [AISERVICE_INTEGRATION_EXAMPLES.md](AISERVICE_INTEGRATION_EXAMPLES.md) for before/after code.

---

## Try It Now

### In Your App
```typescript
import { aiService } from '@/agents/api/aiService';

// Any of these work right now:
await aiService.generateAssignment({...});
await aiService.analyzeTags({...});
await aiService.breakDownProblems({...});
await aiService.simulateStudentInteraction({...});
await aiService.generateStudentFeedback({...});
await aiService.rewriteAssignment({...});
```

### In Browser Console
```javascript
// Check implementation
window.aiService.getImplementation()

// Try an operation
window.aiService.generateAssignment({
  prompt: 'Test',
  type: 'essay',
  gradeLevel: '10',
  subject: 'Science'
})

// Switch implementation
window.aiService.setImplementation('mock')
```

---

## Benefits

✅ **Works today** - Complete mocks, no setup  
✅ **Works offline** - No internet needed  
✅ **Realistic data** - Proper data structures, confidence scores  
✅ **Type safe** - Full TypeScript support  
✅ **Single interface** - One place for all AI operations  
✅ **Zero switching cost** - One line to swap mock ↔ real  
✅ **Future-proof** - Real API framework ready  

---

## Timeline

**Now (v3.0)**: Mock implementations work offline  
**Later**: Implement 9 API endpoints, set env vars, done!

No code changes needed in your application when switching.

---

## Questions?

1. **How does it work?** → [README_AISERVICE.md](README_AISERVICE.md)
2. **Quick reference?** → [AISERVICE_QUICK_REFERENCE.md](AISERVICE_QUICK_REFERENCE.md)
3. **Full details?** → [AISERVICE_GUIDE.md](AISERVICE_GUIDE.md)
4. **Code examples?** → [AISERVICE_INTEGRATION_EXAMPLES.md](AISERVICE_INTEGRATION_EXAMPLES.md)
5. **Implementation?** → [src/agents/api/aiService.ts](src/agents/api/aiService.ts)

---

**Status**: ✅ Complete and ready to use

