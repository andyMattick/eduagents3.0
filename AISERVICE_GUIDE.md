# AIService: Mock/Real API Abstraction Layer

## Overview

The `AIService` is a unified abstraction layer that handles all AI/LLM calls in eduagents3.0. It allows seamless switching between mock (development) and real API implementations without changing application code.

**Location**: [src/agents/api/aiService.ts](src/agents/api/aiService.ts)

---

## Problem Solved

Previously, every AI operation (generating questions, tagging, rewriting, simulating) was hardcoded with mock logic. This meant:
- ❌ No way to use real APIs without refactoring code
- ❌ Difficult to test with different implementations
- ❌ Mock logic scattered across multiple files
- ❌ No standardized interface

Now:
- ✅ Single abstraction point for all AI operations
- ✅ Switch between mock and real with one line: `aiService.setImplementation('real')`
- ✅ Consistent interface across all operations
- ✅ Easy to swap implementations at runtime or via environment variables

---

## Architecture

### Three-Layer Design

```
┌─────────────────────────────────┐
│   Application Code              │
│   (usePipeline, components)     │
└──────────┬──────────────────────┘
           │ imports
           ↓
┌─────────────────────────────────┐
│   AIServiceManager (Singleton)  │
│   - Routes to correct impl      │
│   - Implements IAIService       │
└──────────┬──────────────────────┘
           │
      ┌────┴────┐
      ↓         ↓
┌──────────┐  ┌──────────────┐
│ MockAI   │  │ RealAI       │
│ Service  │  │ Service      │
│ (always) │  │ (if enabled) │
└──────────┘  └──────────────┘
```

### Core Components

1. **IAIService Interface** - Defines all available operations
2. **MockAIService** - Provides fake implementations (always available)
3. **RealAIService** - Calls actual API endpoints (requires config)
4. **AIServiceManager** - Switches between implementations

---

## Quick Start

### Basic Usage

```typescript
import { aiService } from '@/agents/api/aiService';

// Generate assignment
const text = await aiService.generateAssignment({
  prompt: 'Create an essay prompt about climate change',
  type: 'essay',
  gradeLevel: '10',
  subject: 'Science',
});

// Analyze tags
const tags = await aiService.analyzeTags({
  text: 'Your assignment text here...',
});

// Rewrite assignment
const rewritten = await aiService.rewriteAssignment({
  originalText: text,
  tags: tags,
});

// Break down problems
const problems = await aiService.breakDownProblems({
  text: text,
  assignmentType: 'essay',
});

// Simulate student interaction
const interaction = await aiService.simulateStudentInteraction({
  studentProfile: { readingLevel: 0.7, confidence: 0.8 },
  problem: { bloomLevel: 'Analyze', complexity: 0.6 },
});

// Analyze student work
const feedback = await aiService.analyzeStudentWork({
  studentWork: 'Student submission text...',
  assignmentPrompt: text,
});

// Generate student feedback
const studentFeedback = await aiService.generateStudentFeedback({
  studentProfile: 'Visual Learner',
  simulationResults: interaction,
  problems: problems,
});

// Generate accessibility variant
const adhdVariant = await aiService.generateAccessibilityVariant({
  originalText: text,
  overlay: 'adhd',
});
```

### Switching Between Mock and Real

```typescript
// Use mock (default)
aiService.setImplementation('mock');

// Use real API (when configured)
aiService.setImplementation('real', {
  apiKey: 'sk-...',
  apiUrl: 'https://api.example.com',
  timeout: 30000, // optional
});

// Check current implementation
console.log(aiService.getImplementation()); // 'mock' or 'real'
```

---

## Configuration

### Environment Variables

Create or update `.env.local`:

```env
# Use real API (true/false)
REACT_APP_USE_REAL_API=false

# Real API credentials (if using real API)
REACT_APP_API_KEY=sk-your-key-here
REACT_APP_API_URL=https://api.example.com
REACT_APP_API_TIMEOUT=30000
```

The service automatically reads these on startup:
```typescript
const aiService = new AIServiceManager({
  implementation: process.env.REACT_APP_USE_REAL_API === 'true' ? 'real' : 'mock',
  apiKey: process.env.REACT_APP_API_KEY,
  apiUrl: process.env.REACT_APP_API_URL,
});
```

### Runtime Configuration

You can also change configuration at runtime:

```typescript
// Switch to real API after loading config
const config = await fetch('/api/config').then(r => r.json());
aiService.setImplementation('real', {
  apiKey: config.apiKey,
  apiUrl: config.apiUrl,
});
```

---

## Available Operations

### 1. generateAssignmentQuestions()
Generate individual questions for an assignment.

```typescript
const questions = await aiService.generateAssignmentQuestions({
  prompt: 'What is photosynthesis?',
  assignmentType: 'essay',        // optional
  gradeLevel: '9',                // optional
  subject: 'Biology',             // optional
  count: 5,                       // optional (default: 5)
});
// Returns: ['Question 1...', 'Question 2...', ...]
```

### 2. generateAssignment()
Generate a complete assignment from parameters.

```typescript
const assignment = await aiService.generateAssignment({
  prompt: 'Explain photosynthesis',
  type: 'essay',                  // required
  gradeLevel: '10',               // required
  subject: 'Biology',             // required
  wordCount: 2000,                // optional
});
// Returns: Full assignment text
```

### 3. analyzeTags()
Extract and classify tags from assignment text.

```typescript
const tags = await aiService.analyzeTags({
  text: 'Your assignment text...',
  metadata: { gradeLevel: '10', subject: 'Math' }, // optional
});
// Returns: [{ name, confidenceScore, description }, ...]
```

### 4. breakDownProblems()
Break multi-part problems into individual problems.

```typescript
const problems = await aiService.breakDownProblems({
  text: 'Multi-part problem text...',
  assignmentType: 'problem_set',  // optional
});
// Returns: [{ id, text }, { id, text }, ...]
```

### 5. simulateStudentInteraction()
Generate metrics for a student's interaction with a problem.

```typescript
const metrics = await aiService.simulateStudentInteraction({
  studentProfile: {
    readingLevel: 0.7,
    mathFluency: 0.8,
    attentionSpan: 0.6,
    confidence: 0.75,
  },
  problem: {
    bloomLevel: 'Analyze',
    complexity: 0.65,
    novelty: 0.5,
    length: 150,
  },
});
// Returns: { timeOnTask, confusionSignals, engagementScore, perceivedSuccess }
```

### 6. analyzeStudentWork()
Provide feedback on student work.

```typescript
const analysis = await aiService.analyzeStudentWork({
  studentWork: 'Student essay text...',
  assignmentPrompt: 'Write about...',
  rubric: {                       // optional
    clarity: { weight: 0.3 },
    evidence: { weight: 0.4 },
    organization: { weight: 0.3 },
  },
});
// Returns: { feedback, strengths[], improvements[], score }
```

### 7. generateStudentFeedback()
Generate personalized feedback for a student based on simulation.

```typescript
const feedback = await aiService.generateStudentFeedback({
  studentProfile: 'Visual Learner',
  simulationResults: {
    timeOnTask: 45,
    engagementScore: 0.8,
    // ... other metrics
  },
  problems: [
    { id: 'Q1', text: 'Problem 1...' },
    { id: 'Q2', text: 'Problem 2...' },
  ],
});
// Returns: [{ studentPersona, feedbackType, content }, ...]
```

### 8. rewriteAssignment()
Rewrite assignment to improve it.

```typescript
const rewritten = await aiService.rewriteAssignment({
  originalText: 'Original assignment...',
  tags: [
    { name: 'vague-language', description: 'Fix vague modifiers' },
    { name: 'clarity', description: 'Improve clarity' },
  ],
  targetChanges: ['simplify', 'add-examples'], // optional
});
// Returns: { rewrittenText, summaryOfChanges }
```

### 9. generateAccessibilityVariant()
Create variant optimized for specific accessibility needs.

```typescript
const variant = await aiService.generateAccessibilityVariant({
  originalText: 'Assignment text...',
  overlay: 'adhd', // 'adhd', 'dyslexic', 'esl', 'fatigue_sensitive'
});
// Returns: Adjusted text
```

---

## Mock Implementations

All operations have realistic mock implementations that:
- ✅ Return realistic data structures
- ✅ Simulate reasonable delays (600-1200ms)
- ✅ Handle edge cases
- ✅ Work completely offline

### Examples of Mock Behavior

**generateAssignmentQuestions:**
- Returns 5 relevant questions based on assignment type
- Simulates 800ms API delay

**analyzeTags:**
- Analyzes text length, word count, sentence structure
- Returns 2-4 tags based on detected patterns
- Assigns confidence scores (0.7-0.95)

**breakDownProblems:**
- Splits text into paragraphs
- Returns up to 5 problems
- Assigns IDs automatically

**simulateStudentInteraction:**
- Generates random but plausible metrics
- Time on task: 30-150 seconds
- Confusion signals: 0-5
- Engagement: 0.5-1.0
- Perceived success: 0.0-1.0

---

## Real API Implementation

The `RealAIService` class is ready for implementation:

```typescript
class RealAIService implements IAIService {
  private async call<T>(endpoint: string, params: unknown): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  async generateAssignmentQuestions(params: any): Promise<string[]> {
    return this.call('/generate/questions', params);
  }
  // ... other methods
}
```

### Expected API Endpoints

When you build your backend, implement these endpoints:

```
POST /api/generate/questions
POST /api/generate/assignment
POST /api/analyze/tags
POST /api/analyze/breakdown
POST /api/simulate/interaction
POST /api/analyze/student-work
POST /api/generate/feedback
POST /api/rewrite/assignment
POST /api/generate/accessibility
```

Each endpoint receives the parameters object and returns the specified response type.

---

## Integration Points

### Current Implementations (Ready to Replace)

These files currently have hardcoded mock logic that should be updated to use `aiService`:

1. **[src/agents/shared/generateAssignment.ts](src/agents/shared/generateAssignment.ts)**
   - Currently: Direct mock implementation
   - Should use: `aiService.generateAssignment()`

2. **[src/agents/analysis/analyzeTags.ts](src/agents/analysis/analyzeTags.ts)**
   - Currently: Direct mock implementation
   - Should use: `aiService.analyzeTags()`

3. **[src/agents/analysis/asteroidGenerator.ts](src/agents/analysis/asteroidGenerator.ts)**
   - Currently: Extracts and tags problems manually
   - Should use: `aiService.breakDownProblems()`

4. **[src/agents/rewrite/rewriteAssignment.ts](src/agents/rewrite/rewriteAssignment.ts)**
   - Currently: Direct mock implementation
   - Should use: `aiService.rewriteAssignment()`

5. **[src/agents/simulation/simulateStudents.ts](src/agents/simulation/simulateStudents.ts)**
   - Currently: Direct mock implementation
   - Should use: `aiService.generateStudentFeedback()`

6. **[src/agents/simulation/simulationEngine.ts](src/agents/simulation/simulationEngine.ts)**
   - Currently: Direct calculations
   - Should use: `aiService.simulateStudentInteraction()`

### How to Integrate

For each file, follow this pattern:

```typescript
// OLD: Direct import and call
import { analyzeTags } from './analyzeTags';
const result = await analyzeTags(text);

// NEW: Use aiService
import { aiService } from '@/agents/api/aiService';
const result = await aiService.analyzeTags({ text });
```

---

## Testing

### Test with Mock (No API)

```typescript
import { aiService } from '@/agents/api/aiService';

// Ensure mock is active
aiService.setImplementation('mock');

// Test all operations
const questions = await aiService.generateAssignmentQuestions({...});
const tags = await aiService.analyzeTags({...});
// etc.
```

### Test with Real API (When Available)

```typescript
import { aiService } from '@/agents/api/aiService';

// Switch to real
aiService.setImplementation('real', {
  apiKey: 'sk-test-key',
  apiUrl: 'https://api.test.com',
});

// Run tests
const questions = await aiService.generateAssignmentQuestions({...});
```

### Integration Testing

```typescript
describe('AIService', () => {
  it('should generate assignment questions', async () => {
    const questions = await aiService.generateAssignmentQuestions({
      prompt: 'Photosynthesis',
      count: 3,
    });
    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatch(/Photosynthesis|photosynthesis|process/);
  });

  it('should analyze tags with confidence scores', async () => {
    const tags = await aiService.analyzeTags({
      text: 'A comprehensive essay about complex topics.',
    });
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toHaveProperty('confidenceScore');
    expect(tags[0].confidenceScore).toBeGreaterThan(0);
    expect(tags[0].confidenceScore).toBeLessThanOrEqual(1);
  });
});
```

---

## Switching Between Implementations

### Development (Mock)
```
REACT_APP_USE_REAL_API=false
# No API credentials needed
npm run dev
```

### Production (Real API)
```
REACT_APP_USE_REAL_API=true
REACT_APP_API_KEY=sk-prod-key
REACT_APP_API_URL=https://api.production.com
npm run build
```

### Runtime Switch (In Browser Console)
```javascript
// Check current implementation
window.aiService.getImplementation() // 'mock' | 'real'

// Switch to mock (no credentials needed)
window.aiService.setImplementation('mock')

// Switch to real (requires config)
window.aiService.setImplementation('real', {
  apiKey: 'sk-...',
  apiUrl: 'https://api.example.com',
})
```

---

## Error Handling

All operations should handle errors gracefully:

```typescript
try {
  const result = await aiService.generateAssignment({...});
} catch (error) {
  console.error('Failed to generate assignment:', error);
  // Fall back to mock or show error to user
}
```

The `RealAIService` includes timeout handling:
- Default timeout: 30 seconds
- Customizable via config: `timeout: 60000`
- Aborts requests that exceed timeout

---

## Performance Considerations

### Mock Implementation
- Instant (simulated delay only)
- No network latency
- Perfect for offline development
- ~800-1200ms per operation (simulated)

### Real Implementation
- Network latency added
- API rate limits may apply
- Consider caching results
- Use response compression

### Optimization Tips

```typescript
// Cache frequently generated assignments
const generatedAssignments = new Map();

async function getOrGenerateAssignment(prompt: string) {
  if (generatedAssignments.has(prompt)) {
    return generatedAssignments.get(prompt);
  }
  const result = await aiService.generateAssignment({...});
  generatedAssignments.set(prompt, result);
  return result;
}
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **File** | [src/agents/api/aiService.ts](src/agents/api/aiService.ts) |
| **Export** | `aiService` (singleton) |
| **Operations** | 9 core methods (see section above) |
| **Default** | Mock (development-friendly) |
| **Switch** | `aiService.setImplementation('mock' \| 'real')` |
| **Config** | Environment variables or runtime |
| **Status** | ✅ Ready to integrate with existing agents |

---

## Next Steps

1. **Integrate aiService** into existing agent files (listed above)
2. **Implement backend endpoints** when API is ready
3. **Add error handling** and retry logic
4. **Cache results** for frequently used operations
5. **Add unit tests** for mock implementations
6. **Monitor API usage** and add rate limiting as needed

