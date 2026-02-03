# 🚀 Quick Start: Advanced Features API

## Difficulty Analysis

```typescript
import { analyzeDifficulty, DIFFICULTY_LEVELS } from './agents/analysis/difficultyAnalysis';

// Analyze assignment
const result = analyzeDifficulty(text, bloomDistribution, gradeLevel);

console.log(result);
// {
//   difficulty: 'easy' | 'intermediate' | 'hard',
//   bloomLevel: 3.5,
//   readabilityGrade: 7.2,
//   complexityScore: 52,
//   justification: "...",
//   confidence: 0.75
// }

// Check difficulty levels
DIFFICULTY_LEVELS.easy.complexityRange       // [0, 35]
DIFFICULTY_LEVELS.intermediate.complexityRange // [35, 65]
DIFFICULTY_LEVELS.hard.complexityRange       // [65, 100]
```

---

## Learner Profile Weighting

```typescript
import { 
  createClassComposition, 
  estimateCompletionTime,
  estimateQuestionTime,
  LEARNER_PROFILE_CHARACTERISTICS 
} from './agents/analysis/timeEstimation';

// Create class composition
const composition = createClassComposition({
  'struggling-readers': 40,
  'visual-learners': 30,
  'gifted': 30
});

// Get overall time estimate
const timeEst = estimateCompletionTime(wordCount, qCount, bloomLevel, composition);
// {
//   meanTimeMinutes: 18.5,
//   confidenceInterval95: [13.2, 23.8],
//   standardDeviationMinutes: 3.4,
//   baseTimeMinutes: 12.1
// }

// Get per-question estimates
const qEst = estimateQuestionTime(questionIndex, bloomLevel, composition);
// {
//   questionIndex: 0,
//   bloomLevel: 3,
//   estimatedMinutes: 2.8,
//   confidenceInterval95: [2.0, 3.6],
//   affectedProfiles: ['struggling-readers']
// }

// See profile characteristics
LEARNER_PROFILE_CHARACTERISTICS['struggling-readers'].timeMultiplier    // 1.4
LEARNER_PROFILE_CHARACTERISTICS['gifted'].bloomLevelAdjustment         // -0.8
```

---

## Prompt Construction

```typescript
import { 
  constructFullPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  getLastSimulateStudentsPrompt,
  clearSimulateStudentsPrompt
} from './agents/analysis/promptConstruction';

// Build full prompt
const prompt = constructFullPrompt(assignmentText, payload, { 
  bloomLevels: { apply: 20, analyze: 60, evaluate: 20 },
  estimatedTimeMinutes: 15 
});

// Returns:
// {
//   systemPrompt: string,
//   userPrompt: string,
//   metadata: {...},
//   timestamp: "2024-01-15T..."
// }

// In console
window.getLastSimulateStudentsPrompt()       // Get prompt
window.getLastSimulateStudentsPrompt().systemPrompt  // System
window.getLastSimulateStudentsPrompt().userPrompt    // User
window.getLastSimulateStudentsPrompt().metadata       // Metadata
window.clearSimulateStudentsPrompt()         // Clear
```

---

## UI Components

### DifficultyTimingFeedback

```tsx
import { DifficultyTimingFeedback } from './components/Analysis/DifficultyTimingFeedback';

<DifficultyTimingFeedback
  studentFeedback={feedback}
  completionTimeEstimate={{
    meanTimeMinutes: 18.5,
    confidenceInterval95: [13.2, 23.8],
    perQuestion: [{
      index: 0,
      bloomLevel: 3,
      estimatedMinutes: 2.8,
      affectedProfiles: ['struggling-readers']
    }]
  }}
  difficulty="intermediate"
/>
```

### LearnerProfileWeighting

```tsx
import { LearnerProfileWeighting } from './components/Pipeline/LearnerProfileWeighting';

<LearnerProfileWeighting
  selectedProfiles={['struggling-readers', 'visual-learners', 'gifted']}
  onWeightsChange={(weights) => console.log(weights)}
  onProfilesChange={(profiles) => console.log(profiles)}
/>
```

---

## Profile Characteristics Quick Reference

| Profile | Multiplier | Bloom Adj | Variability | Speed |
|---------|-----------|----------|-------------|-------|
| Struggling Readers | 1.40 | +0.5 | 1.30 | Slow |
| ELL | 1.35 | +0.3 | 1.20 | Slow |
| Gifted | 0.70 | -0.8 | 0.60 | Fast |
| ADHD | 1.20 | +0.2 | 1.40 | Moderate |
| Visual Learners | 0.90 | -0.2 | 0.80 | Fast |
| Kinesthetic | 1.10 | +0.1 | 0.90 | Moderate |

---

## Example: Complete Integration

```typescript
import { analyzeDifficulty } from './agents/analysis/difficultyAnalysis';
import { createClassComposition, estimateCompletionTime } from './agents/analysis/timeEstimation';
import { constructFullPrompt } from './agents/analysis/promptConstruction';

// 1. Analyze difficulty
const difficulty = analyzeDifficulty(
  assignmentText,
  bloomDistribution,
  '9-12'
);

// 2. Create class composition
const composition = createClassComposition({
  'struggling-readers': 30,
  'visual-learners': 40,
  'gifted': 30
});

// 3. Estimate time
const timeEst = estimateCompletionTime(
  wordCount,
  questionCount,
  difficulty.bloomLevel,
  composition
);

// 4. Build prompt
const prompt = constructFullPrompt(assignmentText, payload, {
  bloomLevels: bloomDistribution,
  estimatedTimeMinutes: timeEst.meanTimeMinutes
});

// 5. Use in UI
return (
  <>
    <DifficultyTimingFeedback
      studentFeedback={feedback}
      completionTimeEstimate={timeEst}
      difficulty={difficulty.difficulty}
    />
    <LearnerProfileWeighting
      selectedProfiles={Object.keys(composition.profiles)}
      onWeightsChange={handleWeightChange}
    />
  </>
);
```

---

## Confidence Interval Interpretation

For `[13.2, 23.8]` minutes:
- 95% of students will complete between 13.2 and 23.8 minutes
- Mean time is 18.5 minutes (center point)
- ±5.3 minutes margin of error
- Wider range = more variability in class

---

## Bloom's Time Mapping

| Level | Label | Example | Minutes |
|-------|-------|---------|---------|
| 1 | Remember | "Define photosynthesis" | 1.5 |
| 2 | Understand | "Explain photosynthesis" | 1.8 |
| 3 | Apply | "Use photosynthesis to..." | 2.5 |
| 4 | Analyze | "Compare photosynthesis..." | 3.5 |
| 5 | Evaluate | "Critique photosynthesis..." | 4.5 |
| 6 | Create | "Design a process using..." | 5.5 |

---

## Complexity Score Breakdown

```
Complexity = 
  + (bloomLevel/6 × 35)          [0-35 points]
  + (readGrade/12 × 25)          [0-25 points]
  + (wordCount/500 × 15)         [0-15 points]
  + (wordsPerQ/200 × 15)         [0-15 points]
  + (hasEvidence × 5)            [0-5 points]
  + (hasTransitions × 5)         [0-5 points]
  = [0-100 points]
```

Easy = 0-35 | Intermediate = 35-65 | Hard = 65-100

---

## At-Risk Profile Rules

```
Easy → None
Intermediate → None (usually)
Hard → struggling-readers, ELL
Hard + Low Readability → add ADHD
```

---

## Debug Checklist

```javascript
// 1. Verify payload
window.getLastSimulateStudentsPayload().assignmentMetadata.difficulty
// Should match assignment analysis

// 2. Verify prompt
window.getLastSimulateStudentsPrompt().metadata.assignmentDifficulty
// Should match payload

// 3. Check learner profiles
window.getLastSimulateStudentsPrompt().metadata.learnerProfiles
// Should match user selections

// 4. Check time estimate
window.getLastSimulateStudentsPrompt().metadata.estimatedTimeMinutes
// Should be reasonable for word count

// 5. Verify all flows through
const payload = window.getLastSimulateStudentsPayload();
const prompt = window.getLastSimulateStudentsPrompt();
console.assert(
  payload.assignmentMetadata.difficulty === 
  prompt.metadata.assignmentDifficulty,
  'Difficulty mismatch!'
);
```

---

## Performance Notes

- Difficulty analysis: ~1-2ms
- Time estimation: <1ms
- Profile weighting: <1ms
- Prompt construction: ~2-3ms
- **Total**: <10ms overhead per analysis

---

## Common Use Cases

### Use Case 1: Check if assignment is grade-appropriate

```typescript
const analysis = analyzeDifficulty(text, blooms, gradeLevel);
if (analysis.readabilityGrade > parseInt(gradeLevel) + 3) {
  console.warn('Text is too difficult for grade level');
}
```

### Use Case 2: Identify support needs

```typescript
const atRisk = identifyAtRiskProfiles(composition, difficulty);
if (atRisk.length > 0) {
  console.log(`Provide support for: ${atRisk.join(', ')}`);
}
```

### Use Case 3: Plan pacing for class

```typescript
const timeEst = estimateCompletionTime(words, questions, bloom, composition);
console.log(`Plan ${Math.ceil(timeEst.confidenceInterval95[1])} minutes`);
```

---

## API Summary

| Function | Input | Output |
|----------|-------|--------|
| `analyzeDifficulty()` | text, blooms?, grade? | DifficultyAnalysis |
| `estimateCompletionTime()` | words, q, bloom, composition? | TimeEstimate |
| `estimateQuestionTime()` | index, bloom, composition? | QuestionTimeEstimate |
| `createClassComposition()` | { prof: weight } | ClassComposition |
| `constructFullPrompt()` | text, payload, metadata | SimulateStudentsPrompt |
| `buildSystemPrompt()` | metadata | string |
| `buildUserPrompt()` | text, metadata | string |

---

**For detailed docs**: See [ADVANCED_FEATURES_IMPLEMENTATION.md](ADVANCED_FEATURES_IMPLEMENTATION.md)
