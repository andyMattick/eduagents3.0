# API Processor Integration: StudentProblemInput Data Flow

## ✅ Current Status: Metadata Ready, No API Call Yet

Your example `StudentProblemInput` object shows all the fields that **are currently being generated** by our simulation engine. However, they are **NOT yet being sent to an external API processor**.

---

## What's Being Generated ✅

Every time the simulation runs, the system creates `StudentProblemInput` objects **exactly like your example**:

```typescript
new StudentProblemInput {
    StudentId = "s-001",
    ProblemId = "Q12",
    TestType = "multiple_choice",
    ProblemLength = 120,
    MultiPart = false,
    BloomLevel = BloomLevel.Analyze,
    LinguisticComplexity = 0.65f,
    SimilarityToPrevious = 0.4f,
    NoveltyScore = 0.7f,
    PerceivedSuccess = 0.5f,
    ActualCorrect = true,
    TimeOnTask = 42,
    TimePressureIndex = 0.9f,
    FatigueIndex = 0.3f,
    ConfusionSignals = 1,
    EngagementScore = 0.8f,
    NarrativeTags = new() { "focused" },
    Overlays = new() { "adhd", "fatigue_sensitive" }
}
```

### Where This Gets Created

**File**: [src/agents/simulation/simulationEngine.ts](src/agents/simulation/simulationEngine.ts#L163-L200)

The function `simulateStudentProblemPair()` generates this for every (Student, Problem) pair:

```typescript
function simulateStudentProblemPair(
  student: Astronaut,
  asteroid: Asteroid,
  cumulativeFatigue: number,
): StudentProblemInput {
  // Calculates all 5 metrics (Success, Time, Confusion, Engagement, Fatigue)
  
  return {
    StudentId: student.StudentId,
    ProblemId: asteroid.ProblemId,
    TestType: asteroid.TestType || 'free_response',
    ProblemLength: asteroid.ProblemLength,
    MultiPart: asteroid.MultiPart,
    BloomLevel: asteroid.BloomLevel,
    LinguisticComplexity: asteroid.LinguisticComplexity,
    SimilarityToPrevious: asteroid.SimilarityToPrevious,
    NoveltyScore: asteroid.NoveltyScore,
    PerceivedSuccess: perceiveSuccess,
    TimeOnTask: timeOnTask,
    TimePressureIndex: timePressureIndex,
    FatigueIndex: fatigueIndex,
    ConfusionSignals: confusionSignals,
    EngagementScore: engagement,
    NarrativeTags: student.NarrativeTags,
    Overlays: student.Overlays,
  };
}
```

---

## How Many Are Generated?

**Per Simulation Run**:

```
StudentProblemInput[] array size = 
  (Number of Students) × (Number of Problems)

Example:
  - 11 student personas
  - 15 problems per assignment
  = 165 StudentProblemInput objects per simulation run
```

All 165 are created and stored in memory, used to generate `StudentFeedback` results.

---

## Where the Data Currently Lives

### During Simulation (Runtime)
```typescript
// src/agents/simulation/simulateStudents.ts

// ✅ Payload is stored for verification (console access):
window.getLastSimulateStudentsPayload()

// Returns: {
//   assignmentText: "...",
//   textMetadata: { wordCount, hasEvidence, etc. },
//   assignmentMetadata: { type, difficulty, gradeLevel, subject, learnerProfiles },
//   processingOptions: { selectedStudentTags, includeAccessibilityProfiles },
//   timestamp: "2026-02-04T..."
// }
```

### After Simulation (Browser)
The simulation results are stored in React state:

```typescript
// src/hooks/usePipeline.ts
{
  studentFeedback: StudentFeedback[],  // Derived from StudentProblemInput
  assignmentMetadata: { ... },
  selectedStudentTags: string[],
  // Full StudentProblemInput array NOT stored in state
}
```

---

## What's NOT Implemented Yet ⚠️

### No API Call to External Processor
Currently, there is **no fetch/POST call** sending `StudentProblemInput[]` to any backend:

```typescript
// ❌ This doesn't exist:
const response = await fetch('https://api.processor.com/simulate', {
  method: 'POST',
  body: JSON.stringify(studentProblemInputs),
});
```

### Why?
1. **Frontend-only simulation**: We calculate all metrics locally (Bloom weights, fatigue, engagement)
2. **No backend defined**: We don't have an API endpoint configured
3. **Focus was on Phase 1-6**: The initial scope was to build the full pipeline UI, not backend integration

---

## How to Add API Processor Integration

If you want to send `StudentProblemInput[]` to an external processor (e.g., ML model, grading service, learning analytics platform), here's the implementation:

### Option 1: Direct API Call (Simple)

**File**: Create [src/agents/api/processorClient.ts](src/agents/api/processorClient.ts)

```typescript
import { StudentProblemInput } from '../../types/simulation';

export interface ProcessorResponse {
  processingId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  results?: {
    studentId: string;
    predictions: {
      likelyToPass: boolean;
      recommendedDifficulty: string;
      suggestedInterventions: string[];
    };
  }[];
  error?: string;
}

/**
 * Send StudentProblemInput array to external API processor
 */
export async function sendToProcessor(
  studentProblemInputs: StudentProblemInput[],
  processorUrl: string = process.env.REACT_APP_PROCESSOR_URL || 'http://localhost:3001/api/process'
): Promise<ProcessorResponse> {
  try {
    const response = await fetch(processorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_PROCESSOR_KEY}`,
      },
      body: JSON.stringify({
        studentProblemInputs,
        timestamp: new Date().toISOString(),
        clientVersion: '3.0.0',
      }),
    });

    if (!response.ok) {
      throw new Error(`Processor API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send to processor:', error);
    throw error;
  }
}

/**
 * Poll for processor results
 */
export async function pollProcessorResults(
  processingId: string,
  processorUrl: string = process.env.REACT_APP_PROCESSOR_URL || 'http://localhost:3001/api/status'
): Promise<ProcessorResponse> {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${processorUrl}/${processingId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_PROCESSOR_KEY}`,
        },
      });

      if (!response.ok) throw new Error(`Status check failed: ${response.status}`);

      const data = await response.json();

      if (data.status === 'complete' || data.status === 'error') {
        return data;
      }

      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Error polling processor:', error);
      throw error;
    }
  }

  throw new Error('Processor timed out after 60 seconds');
}
```

### Option 2: Integrate with usePipeline Hook

**File**: [src/hooks/usePipeline.ts](src/hooks/usePipeline.ts) (existing file)

Add a new pipeline step:

```typescript
import { sendToProcessor, pollProcessorResults } from '../agents/api/processorClient';

// Inside usePipeline state:
type PipelineState = {
  // ... existing fields
  processorResults?: ProcessorResponse;
  processorLoading?: boolean;
};

// Add function:
const sendToProcessorAPI = async () => {
  setPipelineState(s => ({ ...s, processorLoading: true }));
  
  try {
    // Generate StudentProblemInput[] from current simulation
    const studentProblemInputs = generateStudentProblemInputArray(
      pipelineState.studentFeedback,
      pipelineState.asteroids,
      pipelineState.selectedStudentTags
    );

    // Send to processor
    const response = await sendToProcessor(studentProblemInputs);
    
    if (response.status === 'pending' || response.status === 'processing') {
      // Poll for results
      const finalResults = await pollProcessorResults(response.processingId);
      setPipelineState(s => ({
        ...s,
        processorResults: finalResults,
        processorLoading: false,
      }));
    } else {
      setPipelineState(s => ({
        ...s,
        processorResults: response,
        processorLoading: false,
      }));
    }
  } catch (error) {
    console.error('Processor API failed:', error);
    setPipelineState(s => ({ ...s, processorLoading: false }));
  }
};
```

### Option 3: Use Supabase (Already Set Up)

**File**: [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts)

We already have Supabase client initialized. Add a function:

```typescript
import { supabase } from './supabaseClient';

/**
 * Send StudentProblemInput data to Supabase for remote processing
 */
export async function sendToSupabaseProcessor(
  studentProblemInputs: StudentProblemInput[],
  assignmentId: string
): Promise<any> {
  const { data, error } = await supabase
    .from('simulations')
    .insert({
      assignment_id: assignmentId,
      student_problem_inputs: studentProblemInputs,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
  return data;
}
```

---

## Data Format: StudentProblemInput Array

Here's what gets sent to the processor:

```json
{
  "studentProblemInputs": [
    {
      "StudentId": "s-001",
      "ProblemId": "Q1",
      "TestType": "multiple_choice",
      "ProblemLength": 120,
      "MultiPart": false,
      "BloomLevel": "Analyze",
      "LinguisticComplexity": 0.65,
      "SimilarityToPrevious": 0.4,
      "NoveltyScore": 0.7,
      "PerceivedSuccess": 0.5,
      "ActualCorrect": true,
      "TimeOnTask": 42,
      "TimePressureIndex": 0.9,
      "FatigueIndex": 0.3,
      "ConfusionSignals": 1,
      "EngagementScore": 0.8,
      "NarrativeTags": ["focused"],
      "Overlays": ["adhd", "fatigue_sensitive"]
    },
    // ... 164 more pairs (11 students × 15 problems)
  ],
  "timestamp": "2026-02-04T15:30:00Z",
  "clientVersion": "3.0.0"
}
```

---

## Processor Use Cases

Once data is sent, the processor could:

### 1. **Predictive Analytics**
```
Input: StudentProblemInput[]
Output: 
  - Likelihood of passing
  - Recommended interventions
  - Optimal pacing adjustments
```

### 2. **Adaptive Difficulty**
```
Input: StudentProblemInput[]
Output:
  - Difficulty adjustments per student
  - Next problem recommendations
  - Prerequisite checks
```

### 3. **Learning Pattern Detection**
```
Input: StudentProblemInput[]
Output:
  - Cognitive load curves
  - Engagement peaks/valleys
  - Misconception identification
```

### 4. **Accessibility Verification**
```
Input: StudentProblemInput[] (with Overlays)
Output:
  - WCAG compliance score
  - Accessibility recommendations
  - Overlay effectiveness metrics
```

---

## Summary

| Aspect | Status | Details |
|--------|--------|---------|
| **StudentProblemInput generation** | ✅ Complete | All fields calculated in simulationEngine.ts |
| **Data in memory** | ✅ Complete | Array of 165+ objects per simulation |
| **Data accessible in console** | ✅ Complete | Via `window.getLastSimulateStudentsPayload()` |
| **Data in React state** | ⚠️ Partial | Condensed into StudentFeedback, full array not stored |
| **API call to processor** | ❌ Not implemented | No fetch/POST currently |
| **Processor integration** | ❌ Not implemented | But 3 options above show how to add |
| **Backend endpoint** | ❌ Not configured | Need to define processor URL + auth |

---

## Next Steps to Implement

1. **Define processor URL** (environment variable)
2. **Choose integration method** (Direct API, Supabase, or custom)
3. **Create processor client** (see Option 1 above)
4. **Add button/trigger** to send data
5. **Display results** in UI

Would you like me to implement any of these options? 🚀
