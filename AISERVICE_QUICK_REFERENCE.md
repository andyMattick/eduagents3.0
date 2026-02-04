# AIService Quick Reference

## One-Liner: What is it?
**Unified abstraction layer for all AI/API operations - switch between mock (dev) and real (production) with one line.**

---

## Import & Use

```typescript
import { aiService } from '@/agents/api/aiService';

// Use it!
const result = await aiService.generateAssignment({...});
```

---

## All Operations (9 Methods)

| Method | Purpose | When to Add |
|--------|---------|-----------|
| `generateAssignmentQuestions()` | Create individual questions | After assignment generation |
| `generateAssignment()` | Create complete assignment | In PromptBuilder component |
| `analyzeTags()` | Extract tags/metadata | In ProblemAnalysis step |
| `breakDownProblems()` | Split multi-part problems | In asteroidGenerator |
| `simulateStudentInteraction()` | Model student metrics | In simulationEngine |
| `analyzeStudentWork()` | Provide student feedback | In analyzeStudentWork() |
| `generateStudentFeedback()` | Personalized feedback | In StudentSimulations |
| `rewriteAssignment()` | Improve assignment | In RewriteResults step |
| `generateAccessibilityVariant()` | Create accessible version | In accessibility overlays |

---

## Switch Implementation

```typescript
// Development (Mock - Default)
aiService.setImplementation('mock');

// Production (Real API)
aiService.setImplementation('real', {
  apiKey: 'sk-...',
  apiUrl: 'https://api.example.com',
});

// Check current
const impl = aiService.getImplementation(); // 'mock' | 'real'
```

---

## Environment Config

```env
# .env.local

# Use real API (true/false)
REACT_APP_USE_REAL_API=false

# Real API credentials (if true above)
REACT_APP_API_KEY=sk-your-key
REACT_APP_API_URL=https://api.example.com
REACT_APP_API_TIMEOUT=30000
```

---

## Files to Integrate

Replace hardcoded mock logic in:

1. `src/agents/shared/generateAssignment.ts` → Use `aiService.generateAssignment()`
2. `src/agents/analysis/analyzeTags.ts` → Use `aiService.analyzeTags()`
3. `src/agents/analysis/asteroidGenerator.ts` → Use `aiService.breakDownProblems()`
4. `src/agents/rewrite/rewriteAssignment.ts` → Use `aiService.rewriteAssignment()`
5. `src/agents/simulation/simulateStudents.ts` → Use `aiService.generateStudentFeedback()`
6. `src/agents/simulation/simulationEngine.ts` → Use `aiService.simulateStudentInteraction()`

---

## Example: Integrate One File

**Before** (hardcoded mock):
```typescript
export async function analyzeTags(text: string): Promise<Tag[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  // Hardcoded logic here...
  return tags;
}
```

**After** (using aiService):
```typescript
import { aiService } from '@/agents/api/aiService';

export async function analyzeTags(text: string): Promise<Tag[]> {
  return aiService.analyzeTags({ text });
}
```

---

## Browser Console Testing

```javascript
// Check what's running
window.aiService.getImplementation()

// Switch to mock
window.aiService.setImplementation('mock')

// Test a function
window.aiService.generateAssignment({
  prompt: 'Test',
  type: 'essay',
  gradeLevel: '10',
  subject: 'Biology'
})
```

---

## Features

✅ **Always Works** - Mock implementation included  
✅ **Zero Setup** - Works out of the box  
✅ **No Network** - Mocks work offline  
✅ **Easy Switch** - One line to change  
✅ **Type Safe** - Full TypeScript support  
✅ **Consistent** - Same interface for all operations  
✅ **Extensible** - Easy to add new operations  

---

## When to Use Each

| Scenario | Use |
|----------|-----|
| Local development | `mock` (default) |
| Testing offline | `mock` |
| Demos/presentations | `mock` |
| Needs real AI results | `real` (when ready) |
| Production deployment | `real` (with API) |

---

## Common Patterns

### Pattern 1: Generate then Analyze
```typescript
const assignment = await aiService.generateAssignment({...});
const tags = await aiService.analyzeTags({ text: assignment });
const problems = await aiService.breakDownProblems({ text: assignment });
```

### Pattern 2: Simulate and Feedback
```typescript
const metrics = await aiService.simulateStudentInteraction({...});
const feedback = await aiService.generateStudentFeedback({
  simulationResults: metrics,
  // ...
});
```

### Pattern 3: Rewrite Workflow
```typescript
const original = await aiService.generateAssignment({...});
const tags = await aiService.analyzeTags({ text: original });
const rewritten = await aiService.rewriteAssignment({
  originalText: original,
  tags: tags,
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Getting mock data | This is expected! Mocks always work |
| Want real API? | Set env vars + `setImplementation('real')` |
| API timeout? | Increase `REACT_APP_API_TIMEOUT` |
| Type errors? | Import from `@/agents/api/aiService` |
| Tests failing? | Ensure `setImplementation('mock')` before tests |

---

## Ready to Use
The AIService is fully implemented and ready to integrate. No backend needed—mocks handle everything until you're ready to connect real APIs.
