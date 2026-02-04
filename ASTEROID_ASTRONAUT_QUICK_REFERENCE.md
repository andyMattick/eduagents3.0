# Asteroid/Astronaut Quick Reference

## Import Examples

```typescript
// Types
import {
  Asteroid,
  Astronaut,
  StudentProblemInput,
  StudentAssignmentSimulation,
  AssignmentSimulationResults,
} from '@/types/simulation';

// Generators
import { generateAsteroids, recalculateNoveltyScores } from '@/agents/analysis/asteroidGenerator';
import { 
  getAllAstronauts, 
  getAccessibilityProfileAstronauts,
  createCustomAstronaut 
} from '@/agents/simulation/astronautGenerator';

// Engine
import { runAssignmentSimulation } from '@/agents/simulation/simulationEngine';

// Integration
import { runFullSimulationPipeline } from '@/agents/pipelineIntegration';
```

## Common Workflows

### 1. Extract Problems from Text
```typescript
import { generateAsteroids, recalculateNoveltyScores } from '@/agents/analysis/asteroidGenerator';

const asteroids = generateAsteroids(assignmentText, 'Math');
const refined = recalculateNoveltyScores(asteroids);

// Each asteroid has:
// - ProblemId, ProblemText, ProblemLength
// - BloomLevel ('Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create')
// - LinguisticComplexity (0.0-1.0)
// - SimilarityToPrevious, NoveltyScore (0.0-1.0)
// - MultiPart (boolean)
```

### 2. Get Student Profiles
```typescript
import { 
  getAllAstronauts, 
  getAccessibilityProfileAstronauts 
} from '@/agents/simulation/astronautGenerator';

// All predefined personas (11 total)
const allStudents = getAllAstronauts();

// Just accessibility profiles (6: Dyslexic, ADHD, Fatigue, Anxiety, ESL, etc.)
const accessibilityStudents = getAccessibilityProfileAstronauts();

// Each astronaut has:
// - StudentId, PersonaName
// - Overlays: string[] (e.g., ["adhd"])
// - NarrativeTags: string[] (e.g., ["creative"])
// - ProfileTraits: { ReadingLevel, MathFluency, AttentionSpan, Confidence } (all 0.0-1.0)
```

### 3. Run Simulation
```typescript
import { runAssignmentSimulation } from '@/agents/simulation/simulationEngine';

const results = runAssignmentSimulation(asteroids, astronauts, 'assignment_123');

// Results include:
// - asteroids, astronauts (input data)
// - studentResults: StudentAssignmentSimulation[] (one per student)
// - aggregatedAnalytics:
//   - averageTimeMinutes, averageScore, completionRate
//   - bloomCoverage: { Remember: 20%, Understand: 30%, ... }
//   - commonConfusionPoints: string[] (problem IDs)
//   - atRiskStudentCount: number
```

### 4. Full End-to-End Pipeline
```typescript
import { runFullSimulationPipeline } from '@/agents/pipelineIntegration';

const {
  asteroids,
  astronauts,
  simulationResults,
  studentFeedback, // StudentFeedback[] (compatible with existing pipeline)
} = await runFullSimulationPipeline(assignmentText, {
  subject: 'Math',
  gradeLevel: '9-12',
  includeAccessibilityProfiles: true,
  includeStandardLearners: true,
});
```

### 5. Create Custom Astronaut
```typescript
import { createCustomAstronaut } from '@/agents/simulation/astronautGenerator';

const customStudent = createCustomAstronaut(
  'student_123',
  'Advanced Reader',
  {
    readingLevel: 0.9,
    mathFluency: 0.75,
    attentionSpan: 0.85,
    confidence: 0.8,
  },
  {
    overlays: [],
    narrativeTags: ['advanced', 'analytical'],
    gradeLevel: '11-12',
  }
);
```

## Key Metrics

### Bloom Levels & Time Multipliers
```
Remember    → 1.0x (easiest)
Understand  → 1.3x
Apply       → 1.6x
Analyze     → 2.0x
Evaluate    → 2.3x
Create      → 2.8x (hardest)
```

### Confusion Signals (What Triggers Them)
```
High novelty (>0.75)              → +2
High complexity + low reading     → +2
Severe Bloom mismatch (>2 levels) → +3
Mild Bloom mismatch (>1 level)    → +1
ADHD + multipart question         → +1
```

### Engagement Score Factors
```
Novelty (sweet spot 0.4-0.7)   → 30% weight
Success probability             → 30% weight
Fatigue effect                  → 30% weight
Student confidence              → 10% weight
```

### At-Risk Indicators
A student is flagged "at-risk" if:
- Estimated grade is D or F, OR
- >50% of problems trigger confusion

## Student Profiles (Predefined)

### Standard Learners
| Profile | Reading | Math | Attention | Confidence | Tags |
|---------|---------|------|-----------|-----------|------|
| Strong Reader | 0.90 | 0.70 | 0.85 | 0.85 | analytical, detail-oriented |
| Visual Learner | 0.65 | 0.75 | 0.70 | 0.70 | visual, spatial, creative |
| Hands-On | 0.60 | 0.80 | 0.65 | 0.75 | practical, kinesthetic |
| Collaborative | 0.70 | 0.65 | 0.75 | 0.80 | social, communicative |
| Struggling | 0.45 | 0.40 | 0.50 | 0.40 | persistent, effort-based |
| Gifted | 0.95 | 0.90 | 0.95 | 0.90 | advanced, curious |

### Accessibility Profiles
| Profile | Overlay | Reading | Math | Attention | Confidence |
|---------|---------|---------|------|-----------|-----------|
| Dyslexic | dyslexic | 0.45 | 0.70 | 0.65 | 0.55 |
| ADHD | adhd | 0.65 | 0.60 | 0.40 | 0.65 |
| Fatigue-Sensitive | fatigue_sensitive | 0.70 | 0.70 | 0.50 | 0.70 |
| Anxiety-Prone | anxiety_prone | 0.75 | 0.65 | 0.80 | 0.40 |
| ESL Learner | esl | 0.50 | 0.70 | 0.75 | 0.55 |

## Output Interpretation

### StudentAssignmentSimulation
```typescript
{
  studentId: 'astronaut_visual_learner',
  personaName: '🎨 Visual Learner',
  totalTimeMinutes: 45,
  estimatedScore: 78,
  estimatedGrade: 'C',
  
  engagement: {
    initial: 0.7,      // Started engaged
    atMidpoint: 0.65,  // Slight decline
    final: 0.6,        // Ended fatigued
    trend: 'declining' // Getting more tired
  },
  
  fatigue: {
    initial: 0.0,
    peak: 0.75,        // Got tired partway through
    final: 0.68
  },
  
  confusionPoints: ['asteroid_3', 'asteroid_7'], // Hard problems
  atRisk: false,
  riskFactors: [],
}
```

### Aggregated Analytics
```typescript
{
  averageTimeMinutes: 52,
  averageScore: 74,
  completionRate: 85,  // 85% of students finish
  
  bloomCoverage: {
    Remember: 15%,
    Understand: 25%,
    Apply: 30%,
    Analyze: 20%,
    Evaluate: 10%,
    Create: 0%,
  },
  
  commonConfusionPoints: [
    'asteroid_3',  // Most problematic
    'asteroid_7',
    'asteroid_1',
  ],
  
  atRiskStudentCount: 2, // Out of 11 personas
}
```

## Debugging Tips

### Check an Asteroid's Properties
```typescript
const asteroid = asteroids[0];
console.log(`
  Problem: ${asteroid.ProblemId}
  Bloom: ${asteroid.BloomLevel}
  Complexity: ${(asteroid.LinguisticComplexity * 100).toFixed(0)}%
  Novelty: ${(asteroid.NoveltyScore * 100).toFixed(0)}%
  Multipart: ${asteroid.MultiPart}
`);
```

### Check an Astronaut's Traits
```typescript
const astronaut = astronauts[0];
console.log(`
  Student: ${astronaut.PersonaName}
  Reading: ${(astronaut.ProfileTraits.ReadingLevel * 100).toFixed(0)}%
  Math: ${(astronaut.ProfileTraits.MathFluency * 100).toFixed(0)}%
  Attention: ${(astronaut.ProfileTraits.AttentionSpan * 100).toFixed(0)}%
  Confidence: ${(astronaut.ProfileTraits.Confidence * 100).toFixed(0)}%
  Overlays: ${astronaut.Overlays.join(', ') || 'None'}
`);
```

### Interpret Time Pressure
```typescript
const timePressure = input.TimePressureIndex;
if (timePressure > 1.2) console.log('Student feels very rushed');
else if (timePressure > 1.0) console.log('Student feels rushed');
else if (timePressure > 0.5) console.log('Student has adequate time');
else console.log('Student has plenty of time');
```
