# Current Problem & Student Payloads

## 1. PROBLEM PAYLOAD: UniversalProblem

### Schema
```typescript
interface UniversalProblem {
  // Identity
  problemId: string;              // e.g., "S1_P3_a"
  documentId: string;             // e.g., "doc_1707609600000"
  subject: string;                // e.g., "AP_Statistics"
  sectionId: string;              // e.g., "S1"
  parentProblemId?: string;       // If subpart, e.g., "S1_P3"
  
  // Content
  content: string;                // The actual problem text
  
  // Immutable cognitive layer
  cognitive: CognitiveMetadata {
    bloomsLevel: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
    bloomsConfidence: number;     // 0-1, e.g., 0.92
    bloomsReasoning: string;      // e.g., "Uses contextual clues to identify"
    bloomsContextDependent: boolean;
    
    complexityLevel: 1 | 2 | 3 | 4 | 5;
    
    estimatedTimeMinutes: number; // e.g., 2.5
    timeBreakdown: {
      readingMinutes: number;     // 0.3
      comprehensionMinutes: number; // 0.4
      computationMinutes: number; // 1.2
      reasoningMinutes: number;   // 0.5
      writingMinutes: number;     // 0.1
    }
    
    linguisticComplexity: number; // 0-1, e.g., 0.64
    reasoningStepsRequired: number; // e.g., 3
    proceduralWeight: number;     // 0-1, e.g., 0.7
  }
  
  // Subject-specific, from profile
  classification: ClassificationMetadata {
    problemType: string | null;   // e.g., "hypothesis_test"
    topics: string[];             // e.g., ["sampling_distributions", "central_limit_theorem"]
    requiresCalculator: boolean;
    requiresInterpretation: boolean;
  }
  
  // Structure
  structure: {
    isSubpart: boolean;
    numberingStyle: "1." | "a." | "roman" | "parenthetical" | "inferred"
    multiPartCount: number;
    sourceLineStart: number;
    sourceLineEnd: number;
  }
  
  // Meta
  analysis: {
    confidenceScore: number;      // 0-1, overall confidence
    processedAt: string;          // ISO timestamp
  }
}
```

### Example Problem Payload
```json
{
  "problemId": "S1_P2_a",
  "documentId": "doc_1707609600000",
  "subject": "AP_Statistics",
  "sectionId": "S1",
  "parentProblemId": "S1_P2",
  "content": "A researcher randomly selects 40 college students and measures their heights. What is the approximate shape of the sampling distribution of the sample mean?",
  "cognitive": {
    "bloomsLevel": "Understand",
    "bloomsConfidence": 0.88,
    "bloomsReasoning": "Question asks students to identify and describe (not compute) based on the Central Limit Theorem. Pure conceptual understanding, not application.",
    "bloomsContextDependent": true,
    "complexityLevel": 2,
    "estimatedTimeMinutes": 1.8,
    "timeBreakdown": {
      "readingMinutes": 0.3,
      "comprehensionMinutes": 0.6,
      "computationMinutes": 0,
      "reasoningMinutes": 0.7,
      "writingMinutes": 0.2
    },
    "linguisticComplexity": 0.52,
    "reasoningStepsRequired": 2,
    "proceduralWeight": 0.2
  },
  "classification": {
    "problemType": "conceptual_identification",
    "topics": ["sampling_distributions", "central_limit_theorem"],
    "requiresCalculator": false,
    "requiresInterpretation": true
  },
  "structure": {
    "isSubpart": true,
    "numberingStyle": "a.",
    "multiPartCount": 0,
    "sourceLineStart": 8,
    "sourceLineEnd": 8
  },
  "analysis": {
    "confidenceScore": 0.82,
    "processedAt": "2026-02-11T14:32:00Z"
  }
}
```

---

## 2. STUDENT PAYLOAD: Astronaut

### Schema
```typescript
interface Astronaut {
  studentId: string;              // e.g., "student_adhd_001"
  personaName: string;            // e.g., "Alex (ADHD Profile)"
  
  overlays: string[];             // e.g., ["adhd", "fatigue_sensitive"]
  narrativeTags: string[];        // e.g., ["focused", "curious", "visual-learner"]
  
  profileTraits: {
    readingLevel: number;         // 0-1, e.g., 0.65
    mathFluency: number;          // 0-1, e.g., 0.72
    attentionSpan: number;        // 0-1, e.g., 0.55
    confidence: number;           // 0-1, e.g., 0.68
  }
  
  gradeLevel?: string;            // e.g., "11-12"
  isAccessibilityProfile?: boolean;
}
```

### Example Student Payloads

**Example 1: ADHD Profile**
```json
{
  "studentId": "student_adhd_prototypical",
  "personaName": "Chris - ADHD Profile",
  "overlays": ["adhd", "fatigue_sensitive"],
  "narrativeTags": ["energetic", "gets_bored", "visual-learner", "difficulty_sustaining"],
  "profileTraits": {
    "readingLevel": 0.68,
    "mathFluency": 0.71,
    "attentionSpan": 0.45,
    "confidence": 0.65
  },
  "gradeLevel": "11-12",
  "isAccessibilityProfile": true
}
```

**Example 2: Strong Analytical Learner**
```json
{
  "studentId": "student_strong_analytical",
  "personaName": "Sam - Strong Analytical",
  "overlays": [],
  "narrativeTags": ["focused", "detail-oriented", "enjoys_challenge", "systematic"],
  "profileTraits": {
    "readingLevel": 0.85,
    "mathFluency": 0.89,
    "attentionSpan": 0.88,
    "confidence": 0.82
  },
  "gradeLevel": "11-12",
  "isAccessibilityProfile": false
}
```

**Example 3: Dyslexic Profile**
```json
{
  "studentId": "student_dyslexic_prototypical",
  "personaName": "Jordan - Dyslexic Profile",
  "overlays": ["dyslexic"],
  "narrativeTags": ["visual-thinker", "conceptual", "strong_oral", "struggles_reading"],
  "profileTraits": {
    "readingLevel": 0.42,
    "mathFluency": 0.68,
    "attentionSpan": 0.72,
    "confidence": 0.55
  },
  "gradeLevel": "11-12",
  "isAccessibilityProfile": true
}
```

---

## 3. INTERACTION PAYLOAD: StudentProblemInput

Models a single student's interaction with a single problem.

### Schema
```typescript
interface StudentProblemInput {
  studentId: string;
  problemId: string;
  testType: "multiple_choice" | "short_answer" | "free_response" | "essay" | "calculation";
  
  // Problem characteristics (from Asteroid/UniversalProblem)
  problemLength: number;
  multiPart: boolean;
  bloomLevel: string;
  linguisticComplexity: number;
  similarityToPrevious: number;
  noveltyScore: number;
  
  // Student characteristics (from Astronaut)
  narrativeTags: string[];
  overlays: string[];
  
  // Simulation metrics
  perceivedSuccess: number;       // 0-1, likelihood of success
  actualCorrect?: boolean;        // If answered
  timeOnTask: number;             // seconds
  timePressureIndex: number;      // >1 = rushed, <1 = relaxed
  fatigueIndex: number;           // 0-1, cumulative fatigue
  confusionSignals: number;       // count of confusion triggers
  engagementScore: number;        // 0-1
}
```

### Example Interaction Payload
```json
{
  "studentId": "student_adhd_prototypical",
  "problemId": "S1_P2_a",
  "testType": "short_answer",
  "problemLength": 42,
  "multiPart": false,
  "bloomLevel": "Understand",
  "linguisticComplexity": 0.52,
  "similarityToPrevious": 0.35,
  "noveltyScore": 0.65,
  "narrativeTags": ["energetic", "gets_bored", "visual-learner", "difficulty_sustaining"],
  "overlays": ["adhd", "fatigue_sensitive"],
  "perceivedSuccess": 0.72,
  "actualCorrect": true,
  "timeOnTask": 145,
  "timePressureIndex": 0.95,
  "fatigueIndex": 0.18,
  "confusionSignals": 1,
  "engagementScore": 0.78
}
```

---

## 4. SIMULATION OUTPUT: StudentProblemOutput

```typescript
interface StudentProblemOutput {
  studentId: string;
  problemId: string;
  
  timeToCompleteSeconds: number;
  percentageSuccessful: number;    // 0-100
  confusionLevel: "low" | "medium" | "high";
  engagementLevel: "low" | "medium" | "high";
  
  feedback: string;
  suggestions?: string[];
  
  bloomMismatch?: {
    studentCapability: BloomLevel;
    problemDemands: BloomLevel;
    mismatchSeverity: "none" | "mild" | "severe";
  }
}
```

### Example Output
```json
{
  "studentId": "student_adhd_prototypical",
  "problemId": "S1_P2_a",
  "timeToCompleteSeconds": 145,
  "percentageSuccessful": 88,
  "confusionLevel": "low",
  "engagementLevel": "high",
  "feedback": "Chris handled this conceptual question well, demonstrating solid understanding of CLT. The visual approach helped engagement.",
  "suggestions": [
    "Consider diagrams in future conceptual problems for this student",
    "Pacing is good - not rushed"
  ],
  "bloomMismatch": {
    "studentCapability": "Understand",
    "problemDemands": "Understand",
    "mismatchSeverity": "none"
  }
}
```

---

## 5. AGGREGATED OUTPUT: StudentAssignmentSimulation

```json
{
  "studentId": "student_adhd_prototypical",
  "personaName": "Chris - ADHD Profile",
  "totalTimeMinutes": 47.3,
  "estimatedScore": 76,
  "estimatedGrade": "C",
  "problemResults": [
    { "studentId": "...", "problemId": "S1_P1", ... },
    { "studentId": "...", "problemId": "S1_P2_a", ... },
    { "studentId": "...", "problemId": "S1_P2_b", ... }
  ],
  "engagement": {
    "initial": 0.72,
    "atMidpoint": 0.68,
    "final": 0.55,
    "trend": "declining"
  },
  "fatigue": {
    "initial": 0.0,
    "peak": 0.42,
    "final": 0.38
  },
  "confusionPoints": ["S1_P5", "S2_P3"],
  "atRisk": false,
  "riskFactors": []
}
```

---

## 6. KEY DIFFERENCES FROM ORIGINAL

| Aspect | Original (Asteroid) | New (UniversalProblem) |
|--------|---|---|
| **ID Format** | `ProblemId` (string) | `problemId: "S1_P2_a"` (hierarchical) |
| **Content** | `ProblemText` | `content` (standardized field name) |
| **Bloom** | `BloomLevel` (string) | `cognitive.bloomsLevel` + `bloomsConfidence` + `bloomsReasoning` |
| **Time** | `EstimatedTimeSeconds` | `cognitive.estimatedTimeMinutes` + full `timeBreakdown` |
| **Complexity** | Not present | `cognitive.complexityLevel: 1-5` |
| **Cognitive Data** | Scattered | Unified in `cognitive` object |
| **Classification** | Scattered | Unified in `classification` object (subject-specific) |
| **Procedural Weight** | Not present | `cognitive.proceduralWeight: 0-1` |
| **Linguistic Complexity** | Not present | `cognitive.linguisticComplexity: 0-1` |
| **Reasoning Steps** | Not present | `cognitive.reasoningStepsRequired: number` |

---

## 7. FLOW EXAMPLE

### Step 1: Raw Assessment Uploaded
```
"A researcher randomly selects 40 college students..."
```

### Step 2: Parsed into UniversalProblems
```json
[
  {
    "problemId": "S1_P2_a",
    "cognitive": { "bloomsLevel": "Understand", ... },
    "classification": { "topics": ["sampling_distributions"], ... }
  }
]
```

### Step 3: Student Profiles (Astronauts)
```json
[
  { "studentId": "student_adhd", "overlays": ["adhd"], ... },
  { "studentId": "student_strong", "overlays": [], ... }
]
```

### Step 4: Simulate Interactions
For each (Student, Problem) pair:
```json
{
  "studentId": "student_adhd",
  "problemId": "S1_P2_a",
  "perceivedSuccess": 0.72,
  "timeOnTask": 145,
  "fatigueIndex": 0.18
}
```

### Step 5: Aggregated Results
```json
{
  "studentId": "student_adhd",
  "estimatedScore": 76,
  "engagement": { "trend": "declining" },
  "atRisk": false
}
```

---

## 8. INVARIANT ENFORCEMENT

**These cannot change:**
- `problemId` format (S1_P2_a)
- `cognitive.*` fields (locked after analyzer)
- `classification.*` fields (locked after analyzer)

**Only these can change:**
- `content` (rewriter can improve text)
- Version number (1.0 → 1.1)
