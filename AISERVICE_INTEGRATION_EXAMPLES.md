# Integration Examples: Using AIService in Agents

This file shows **before/after** examples of how to integrate `aiService` into existing agent files.

---

## 1. generateAssignment.ts

### BEFORE (Hardcoded Mock)

```typescript
// src/agents/shared/generateAssignment.ts

const mockExamples: Record<string, string[]> = {
  ESSAY: [
    'Write a comprehensive essay...',
    'Analyze the key themes...',
    // ...
  ],
};

export async function generateAssignment(
  type: string,
  gradeLevel: string,
  subject: string,
  prompt?: string,
): Promise<GeneratedAssignment> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  const examples = mockExamples[type] || [];
  const content = examples[Math.floor(Math.random() * examples.length)];

  return {
    content,
    metadata: { type, gradeLevel, subject },
    tags: ['essay', 'comprehensive'],
  };
}
```

### AFTER (Using AIService)

```typescript
// src/agents/shared/generateAssignment.ts

import { aiService } from '../api/aiService';

export async function generateAssignment(
  type: string,
  gradeLevel: string,
  subject: string,
  prompt?: string,
): Promise<GeneratedAssignment> {
  // Now delegates to aiService (mock or real)
  const content = await aiService.generateAssignment({
    prompt: prompt || `Create a ${type} for ${subject}`,
    type,
    gradeLevel,
    subject,
  });

  // Extract tags using aiService too
  const tags = await aiService.analyzeTags({ text: content });

  return {
    content,
    metadata: { type, gradeLevel, subject },
    tags: tags.map(t => t.name),
  };
}
```

---

## 2. analyzeTags.ts

### BEFORE (Hardcoded Mock)

```typescript
// src/agents/analysis/analyzeTags.ts

export async function analyzeTags(text: string, assignmentMetadataTags?: string[]): Promise<Tag[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!text || text.trim().length === 0) {
    return [];
  }

  const tags: Tag[] = [];
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;

  // Analyze text for quality indicators
  if (textLength > 500) {
    tags.push({
      name: 'comprehensive',
      confidenceScore: 0.85,
      description: 'The assignment covers substantial content',
    });
  }

  // ... more hardcoded logic

  return tags;
}
```

### AFTER (Using AIService)

```typescript
// src/agents/analysis/analyzeTags.ts

import { aiService } from '../api/aiService';
import { Tag } from '../../types/pipeline';

export async function analyzeTags(text: string, assignmentMetadataTags?: string[]): Promise<Tag[]> {
  const aiTags = await aiService.analyzeTags({
    text,
    metadata: { metadataTags: assignmentMetadataTags },
  });

  // Convert to Tag type if needed
  return aiTags.map(tag => ({
    name: tag.name,
    confidenceScore: tag.confidenceScore,
    description: tag.description,
  }));
}
```

---

## 3. asteroidGenerator.ts

### BEFORE (Manual Problem Extraction)

```typescript
// src/agents/analysis/asteroidGenerator.ts

export async function generateAsteroids(
  text: string,
  metadata: AssignmentMetadata,
): Promise<Asteroid[]> {
  // Manually split by lines/paragraphs
  const problems = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const asteroids: Asteroid[] = problems.map((problem, i) => ({
    ProblemId: `Q${i + 1}`,
    ProblemText: problem,
    ProblemLength: problem.split(/\s+/).length,
    MultiPart: problem.includes('a)') || problem.includes('1.'),
    BloomLevel: 'Understand',
    LinguisticComplexity: 0.5,
    SimilarityToPrevious: 0,
    NoveltyScore: 0.8,
  }));

  return asteroids;
}
```

### AFTER (Using AIService)

```typescript
// src/agents/analysis/asteroidGenerator.ts

import { aiService } from '../api/aiService';

export async function generateAsteroids(
  text: string,
  metadata: AssignmentMetadata,
): Promise<Asteroid[]> {
  // Use aiService to break down problems
  const problems = await aiService.breakDownProblems({
    text,
    assignmentType: metadata.type,
  });

  // Analyze each problem's metadata
  const asteroids: Asteroid[] = [];
  
  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    const tags = await aiService.analyzeTags({
      text: problem.text,
      metadata: { assignmentType: metadata.type },
    });

    asteroids.push({
      ProblemId: problem.id,
      ProblemText: problem.text,
      ProblemLength: problem.text.split(/\s+/).length,
      MultiPart: problem.text.match(/a\)|1\.|i\)/g) !== null,
      BloomLevel: 'Understand', // Could extract from tags
      LinguisticComplexity: 0.5, // Could extract from tags
      SimilarityToPrevious: i > 0 ? 0.3 : 0,
      NoveltyScore: 0.7,
    });
  }

  return asteroids;
}
```

---

## 4. rewriteAssignment.ts

### BEFORE (Hardcoded Mock)

```typescript
// src/agents/rewrite/rewriteAssignment.ts

export async function rewriteAssignment(
  originalText: string,
  tags: Tag[],
): Promise<RewriteResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  let rewrittenText = originalText;
  const changes: string[] = [];

  // Apply hardcoded transformations
  if (tags.some(t => t.name === 'vague-modifiers')) {
    rewrittenText = rewrittenText
      .replace(/\bvery\b/gi, 'extremely')
      .replace(/\breally\b/gi, 'notably');
    changes.push('Replaced vague modifiers');
  }

  // ... more hardcoded logic

  return {
    rewrittenText,
    summaryOfChanges: changes.join(' | '),
    appliedTags: tags,
  };
}
```

### AFTER (Using AIService)

```typescript
// src/agents/rewrite/rewriteAssignment.ts

import { aiService } from '../api/aiService';
import { Tag } from '../../types/pipeline';

export interface RewriteResult {
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
}

export async function rewriteAssignment(
  originalText: string,
  tags: Tag[],
): Promise<RewriteResult> {
  const result = await aiService.rewriteAssignment({
    originalText,
    tags: tags.map(t => ({
      name: t.name,
      description: t.description || '',
    })),
  });

  return {
    rewrittenText: result.rewrittenText,
    summaryOfChanges: result.summaryOfChanges,
    appliedTags: tags,
  };
}
```

---

## 5. simulateStudents.ts

### BEFORE (Hardcoded Mock)

```typescript
// src/agents/simulation/simulateStudents.ts

export async function simulateStudents(
  assignmentText: string,
  assignmentMetadataTags?: string[],
  options?: {
    gradeLevel?: string;
    subject?: string;
    learnerProfiles?: string[];
  },
): Promise<StudentFeedback[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  const feedbacks: StudentFeedback[] = [];

  // Hardcoded persona-specific feedback
  const personas = ['Visual Learner', 'Advanced Student', 'Struggling Student'];
  
  personas.forEach(persona => {
    feedbacks.push({
      studentPersona: persona,
      feedbackType: 'suggestion',
      content: `This assignment would be good for ${persona}...`,
    });
  });

  return feedbacks;
}
```

### AFTER (Using AIService)

```typescript
// src/agents/simulation/simulateStudents.ts

import { aiService } from '../api/aiService';

export async function simulateStudents(
  assignmentText: string,
  assignmentMetadataTags?: string[],
  options?: {
    gradeLevel?: string;
    subject?: string;
    learnerProfiles?: string[];
  },
): Promise<StudentFeedback[]> {
  // Get student feedback from aiService
  const feedbacks = await aiService.generateStudentFeedback({
    studentProfile: options?.learnerProfiles?.[0] || 'Average Student',
    simulationResults: {
      assignmentText,
      gradeLevel: options?.gradeLevel,
      subject: options?.subject,
    },
    problems: [], // Would pass actual problems if available
  });

  // Convert to StudentFeedback format
  return feedbacks.map(f => ({
    studentPersona: f.studentPersona,
    feedbackType: f.feedbackType,
    content: f.content,
  }));
}
```

---

## 6. simulationEngine.ts

### BEFORE (Manual Calculations)

```typescript
// src/agents/simulation/simulationEngine.ts

function simulateStudentProblemPair(
  student: Astronaut,
  asteroid: Asteroid,
  cumulativeFatigue: number,
): StudentProblemInput {
  // Manually calculate all metrics
  const perceiveSuccess = calculatePerceivedSuccess(student, asteroid);
  const timeOnTask = calculateTimeOnTask(student, asteroid);
  const confusionSignals = calculateConfusionSignals(student, asteroid);
  const engagement = calculateEngagementScore(student, asteroid, cumulativeFatigue);

  return {
    StudentId: student.StudentId,
    ProblemId: asteroid.ProblemId,
    PerceivedSuccess: perceiveSuccess,
    TimeOnTask: timeOnTask,
    ConfusionSignals: confusionSignals,
    EngagementScore: engagement,
    // ... other fields
  };
}
```

### AFTER (Using AIService)

```typescript
// src/agents/simulation/simulationEngine.ts

import { aiService } from '../api/aiService';

async function simulateStudentProblemPair(
  student: Astronaut,
  asteroid: Asteroid,
  cumulativeFatigue: number,
): Promise<StudentProblemInput> {
  // Delegate to aiService
  const metrics = await aiService.simulateStudentInteraction({
    studentProfile: {
      StudentId: student.StudentId,
      readingLevel: student.ProfileTraits?.readingLevel || 0.5,
      mathFluency: student.ProfileTraits?.mathFluency || 0.5,
      attentionSpan: student.ProfileTraits?.attentionSpan || 0.5,
      confidence: student.ProfileTraits?.confidence || 0.5,
      overlays: student.Overlays,
    },
    problem: {
      ProblemId: asteroid.ProblemId,
      bloomLevel: asteroid.BloomLevel,
      complexity: asteroid.LinguisticComplexity,
      novelty: asteroid.NoveltyScore,
      length: asteroid.ProblemLength,
    },
  });

  return {
    StudentId: student.StudentId,
    ProblemId: asteroid.ProblemId,
    PerceivedSuccess: metrics.perceivedSuccess,
    TimeOnTask: metrics.timeOnTask,
    ConfusionSignals: metrics.confusionSignals,
    EngagementScore: metrics.engagementScore,
    // ... other fields
  };
}
```

---

## Pattern: The Conversion is Simple

### Generic Template

**BEFORE:**
```typescript
export async function myFunction(input: InputType): Promise<OutputType> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Hardcoded mock logic
  // ... transform input to output

  return output;
}
```

**AFTER:**
```typescript
import { aiService } from '../api/aiService';

export async function myFunction(input: InputType): Promise<OutputType> {
  // Delegate to aiService
  const result = await aiService.someOperation({
    // convert input to aiService params
  });

  // convert aiService result back to OutputType if needed
  return result;
}
```

---

## Benefits of Integration

| Aspect | Before | After |
|--------|--------|-------|
| **Where's the logic?** | Scattered in 6 files | Centralized in aiService |
| **Add real API** | Refactor 6 files | Update aiService only |
| **Testing** | Test each file | Test aiService once |
| **Consistency** | Each file different | All use same interface |
| **Maintenance** | High (duplicate code) | Low (single source) |

---

## Quick Integration Checklist

For each file you want to integrate:

- [ ] Import aiService: `import { aiService } from '../api/aiService';`
- [ ] Identify the operation (generate, analyze, simulate, etc.)
- [ ] Find corresponding aiService method
- [ ] Convert input parameters
- [ ] Convert output if needed
- [ ] Remove hardcoded mock logic
- [ ] Test with mock (default)
- [ ] Test with real API (when available)

---

## Testing After Integration

```typescript
import { aiService } from '@/agents/api/aiService';
import { analyzeTags } from '@/agents/analysis/analyzeTags';

describe('analyzeTags with aiService', () => {
  beforeEach(() => {
    // Ensure mock is active
    aiService.setImplementation('mock');
  });

  it('should extract tags from text', async () => {
    const tags = await analyzeTags('A comprehensive essay about climate change.');
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toHaveProperty('confidenceScore');
  });

  it('should work with metadata', async () => {
    const tags = await analyzeTags(
      'Some text',
      ['type:essay', 'subject:science']
    );
    expect(tags).toBeDefined();
  });
});
```

---

## Conclusion

Once integrated, all agents use a **single, unified interface** (`aiService`) that:
- ✅ Works offline with mocks (today)
- ✅ Connects to real APIs (when ready)
- ✅ Requires zero code changes to switch

No backend needed to get started. Mocks are complete and realistic.

