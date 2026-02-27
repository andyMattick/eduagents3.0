# Space Camp Payloads: Problems & Students

## Overview
Space Camp receives a **request payload** with problems, metadata, and scoring rules, then returns a **response payload** with generated student stats and simulation results.

**Important:** There are **two problem formats** in the system:
1. **Internal Problem Format** — detailed structure used throughout the pipeline
2. **Space Camp Problem Payload** — simplified subset sent to Space Camp backend

---

## 1. INTERNAL PROBLEM FORMAT (Used Throughout Pipeline)

The system uses this rich structure internally:

```typescript
interface GeneratedProblem {
  id: string;
  sectionId?: string;
  problemText: string;
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed';
  bloomLevel: number;                                    // 1-6 (numeric)
  questionFormat: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response' | 'fill-blank';
  complexity: 'low' | 'medium' | 'high';                // categorical
  novelty: 'low' | 'medium' | 'high';                   // categorical
  estimatedTime: number;                                // minutes
  problemLength: number;                                // word count
  hasTip: boolean;
  tipText?: string;
  options?: string[];                                   // for multiple choice
  correctAnswer?: string | string[];                    // answer key
  sourceReference?: string;
  rubric?: {
    criteria: string[];
    expectations: string;
  };
}
```

### Example Internal Problem (Your Format)
```json
{
  "id": "q3",
  "sectionId": "section-0",
  "problemText": "Match the following terms related to sampling distributions...",
  "bloomLevel": 2,
  "questionFormat": "fill-blank",
  "tipText": "Review the precise definitions of each term before making your matches.",
  "hasTip": true,
  "problemType": "medium",
  "complexity": "low",
  "novelty": "high",
  "estimatedTime": 3,
  "problemLength": 105,
  "rawComplexity": 0.65,
  "rawNovelty": 0.35,
  "tags": ["Understand", "medium", "fill blank"],
  "sourceReference": "Section 1, Problem 1",
  "rubric": {
    "criteria": ["Explains concepts in own words", "Interprets information correctly", "Summarizes main ideas"],
    "expectations": "Student demonstrates clear understanding by explaining or summarizing the concept."
  }
}
```

### Key Differences from Space Camp Format:
- **bloomLevel**: numeric (1-6) vs. string ("Understand")
- **complexity/novelty**: categorical ("low"/"medium"/"high") vs. continuous (0.0–1.0)
- **Includes rubric**, tips, tags, source reference (teacher-facing)
- **More granular problemType**: "procedural", "conceptual", "application"
- **Separate raw scores**: rawComplexity, rawNovelty

---

## 2. SPACE CAMP PROBLEM PAYLOAD (Simplified Format)

When sending to Space Camp, the internal problem is **simplified** for backend consumption:

```typescript
interface SpaceCampProblem {
  ProblemId: string;                           // unique identifier (e.g., "prob_001")
  Type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';
  BloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  Content: string;                             // full problem text
  CorrectAnswer: string;                       // expected/reference answer
  LinguisticComplexity: number;                // 0.0–1.0 (readability index)
  EstimatedTimeMinutes: number;                // how long student should take
  Difficulty: 1 | 2 | 3 | 4 | 5;              // 1=easiest, 5=hardest
  SequenceIndex: number;                       // position in assessment (0-indexed)
}
```

### Example Problem
```json
{
  "ProblemId": "prob_003",
  "Type": "short-answer",
  "BloomLevel": "Apply",
  "Content": "Sarah has 24 apples. She gives away 1/3 of them. How many does she have left? Show your work.",
  "CorrectAnswer": "16 apples",
  "LinguisticComplexity": 0.45,
  "EstimatedTimeMinutes": 3.5,
  "Difficulty": 3,
  "SequenceIndex": 2
}
```

### Key Notes on Problems:
- **BloomLevel** determines cognitive difficulty (Remember < Understand < Apply < Analyze < Evaluate < Create)
- **LinguisticComplexity** affects reading load: 0.2 = simple, 0.8 = complex vocabulary/long sentences
- **EstimatedTimeMinutes** is used to predict whether students will complete the assessment
- **Difficulty** (1-5) is separate from Bloom; used by Space Camp for stat calculations
- Problems are sent in **sequence order** (SequenceIndex determines fatigue accumulation)

### Key Notes on Problems:
- **BloomLevel** determines cognitive difficulty (Remember < Understand < Apply < Analyze < Evaluate < Create)
- **LinguisticComplexity** affects reading load: 0.2 = simple, 0.8 = complex vocabulary/long sentences
- **EstimatedTimeMinutes** is used to predict whether students will complete the assessment
- **Difficulty** (1-5) is separate from Bloom; used by Space Camp for stat calculations
- Problems are sent in **sequence order** (SequenceIndex determines fatigue accumulation)

---

## 3. FORMAT TRANSFORMATION: Internal → Space Camp

The pipeline converts the internal format to the Space Camp format:

```
GeneratedProblem (Internal)
├─ id → ProblemId
├─ problemText → Content
├─ bloomLevel (numeric 1-6) → BloomLevel (string "Remember"–"Create")
├─ complexity (categorical) → Difficulty (1-5 scale)
├─ novelty (0.0-1.0) → (not sent to Space Camp directly)
├─ estimatedTime (minutes) → EstimatedTimeMinutes
├─ problemLength (word count) → (used to calculate LinguisticComplexity)
├─ rawComplexity (0.0-1.0) → LinguisticComplexity
├─ questionFormat → Type (multiple-choice, true-false, short-answer, essay, matching)
└─ correctAnswer → CorrectAnswer
```

**Dropped (not sent to Space Camp)**:
- `sectionId` — internal organization only
- `tipText`, `hasTip` — teacher-facing scaffolding
- `rubric` — teacher rubric (not needed by Space Camp)
- `tags` — internal classification
- `sourceReference` — just for reference
- `problemType` (procedural/conceptual) — simplified to BloomLevel
- `options` — for multiple-choice construction only

---

## 4. DOCUMENT METADATA (What We Send)

```typescript
interface DocumentMetadata {
  gradeBand: '3-5' | '6-8' | '9-12';          // target grade level
  subject: 'math' | 'english' | 'science' | 'history' | 'general';
  classLevel: 'standard' | 'honors' | 'AP';    // course tier (affects difficulty expectations)
  timeTargetMinutes: number;                   // total time student should have
}
```

Example:
```json
{
  "gradeBand": "6-8",
  "subject": "math",
  "classLevel": "standard",
  "timeTargetMinutes": 45
}
```

---

## 5. SCORING RULES / ASTRONAUT RUBRIC (What We Send)

This is **THE critical input** that tells Space Camp how to generate realistic student stats:

```typescript
interface AstronautRubric {
  gradeBandBaselines: {
    '3-5': BaselineStats;       // ability ranges for grades 3-5
    '6-8': BaselineStats;       // ability ranges for grades 6-8
    '9-12': BaselineStats;      // ability ranges for grades 9-12
  };
  
  classLevelMultipliers: {
    standard: 1.0;              // baseline difficulty
    honors: 1.10;               // +10% harder → higher stats needed
    AP: 1.20;                   // +20% harder → highest stats needed
  };
  
  subjectModifiers: {
    math: { mathLevel: 1.1, readingLevel: 1.0, ... };
    english: { readingLevel: 1.1, mathLevel: 1.0, ... };
    science: { reasoning: 1.1, ... };
    history: { readingLevel: 1.1, ... };
    general: { ... };
  };
  
  overlayMultipliers: {
    adhd: { stamina: 0.85, reasoning: 0.90, confusionTolerance: 0.75 };
    dyslexia: { readingLevel: 0.65, confidence: 0.80 };
    fatigue_sensitive: { stamina: 0.75, reasoning: 0.85 };
    esl: { readingLevel: 0.75, confidence: 0.85 };
    anxiety_prone: { confidence: 0.80, confusionTolerance: 0.70 };
  };
}

interface BaselineStats {
  readingLevel: [number, number];          // [min, max] range for grade band
  mathLevel: [number, number];             
  stamina: [number, number];               // ability to stay focused over time
  reasoning: [number, number];             
  confusionTolerance: [number, number];    // ability to handle difficult material
}
```

### How Scoring Rules Work

1. **Baseline**: Pick the range for the target gradeBand (e.g., "6-8")
   ```
   readingLevel: [0.40, 0.70]
   mathLevel: [0.45, 0.75]
   stamina: [0.45, 0.75]
   reasoning: [0.45, 0.75]
   confusionTolerance: [0.45, 0.75]
   ```

2. **Class Level Multiplier**: Scale up for honors/AP
   ```
   If classLevel="honors" → multiply all stats × 1.10
   If classLevel="AP" → multiply all stats × 1.20
   ```

3. **Subject Modifier**: Boost subject-specific skills
   ```
   If subject="math" → mathLevel × 1.1
   If subject="english" → readingLevel × 1.1
   ```

4. **Overlay Multipliers**: Reduce for accessibility needs
   ```
   If overlay="adhd" → stamina × 0.85, reasoning × 0.90, confusionTolerance × 0.75
   If overlay="dyslexia" → readingLevel × 0.65, confidence × 0.80
   ```

---

## 6. SPACE CAMP REQUEST (Complete Structure)

```typescript
interface SpaceCampRequest {
  documentId: string;                    // unique assessment ID
  problems: SpaceCampProblem[];          // all problems as above
  scoring_rules: AstronautRubric;        // all multipliers & baselines
  document_metadata: DocumentMetadata;   // grade, subject, classLevel, time target
}
```

---

## 7. STUDENT PAYLOAD (What Space Camp Generates & Returns)

### 5a. Generated Student / Astronaut

```typescript
interface GeneratedStudent {
  studentId: string;                     // unique ID (e.g., "astronaut_001")
  personaName: string;                   // readable name (e.g., "Alex (High Math Ability)")
  baseStats: StudentBaseStats;           // derived from scoring rules
  overlays: string[];                    // accessibility needs (["adhd"], ["dyslexia"], etc.)
  gradeBand: GradeBand;                  // matching assignment grade band
}

interface StudentBaseStats {
  readingLevel: number;                  // 0.0–1.0 (how well they read)
  reasoningLevel: number;                // 0.0–1.0 (logical thinking)
  mathFluency: number;                   // 0.0–1.0 (math comfort)
  attentionSpan: number;                 // 0.0–1.0 (how long they can focus)
  confidence: number;                    // 0.0–1.0 (belief in success)
}
```

### Example Generated Student
```json
{
  "studentId": "astronaut_002",
  "personaName": "Jordan (ADHD, Struggling Reader)",
  "baseStats": {
    "readingLevel": 0.42,
    "reasoningLevel": 0.50,
    "mathFluency": 0.48,
    "attentionSpan": 0.51,
    "confidence": 0.45
  },
  "overlays": ["adhd"],
  "gradeBand": "6-8"
}
```

### 5b. Simulation Results per Student

```typescript
interface StudentSimulationResult {
  studentId: string;
  personaName: string;
  overlays: string[];
  
  // Overall performance
  successRate: number;                   // 0.0–1.0 (% of problems correct)
  averageTimePerProblem: number;         // seconds (average across all problems)
  cumulativeFatigue: number;             // 0.0–1.0 (fatigue at end of assessment)
  
  // Problem-specific
  problemResults: ProblemSimulationResult[];
  struggledProblemIds: string[];         // problems where student confused
  
  // Engagement metrics
  averageEngagement: number;             // 0.0–1.0 (novelty × success × inverse fatigue)
  flaggedAsAtRisk: boolean;              // true if likely to not complete
}

interface ProblemSimulationResult {
  problemId: string;
  studentId: string;
  
  // What happened on this specific problem
  success: boolean;                      // did they get it right?
  timeSeconds: number;                   // how long they took
  confusionIndex: number;                // 0.0–1.0 (were they confused?)
  engagementScore: number;               // 0.0–1.0 (were they engaged?)
  
  // Cumulative fatigue effects
  cumulativeFatigue: number;             // 0.0–1.0 (fatigue level at this point)
  fatigueMultiplier: number;             // 0.0–1.0 (how much fatigue hurt this problem)
}
```

### Example Student Simulation
```json
{
  "studentId": "astronaut_002",
  "personaName": "Jordan (ADHD, Struggling Reader)",
  "overlays": ["adhd"],
  "successRate": 0.62,
  "averageTimePerProblem": 12.5,
  "cumulativeFatigue": 0.72,
  "problemResults": [
    {
      "problemId": "prob_001",
      "studentId": "astronaut_002",
      "success": true,
      "timeSeconds": 78,
      "confusionIndex": 0.1,
      "engagementScore": 0.75,
      "cumulativeFatigue": 0.08,
      "fatigueMultiplier": 0.92
    }
  ],
  "struggledProblemIds": ["prob_004", "prob_005"],
  "averageEngagement": 0.65,
  "flaggedAsAtRisk": true
}
```

---

## 8. SPACE CAMP RESPONSE (Complete Structure)

```typescript
interface SpaceCampResponse {
  documentId: string;                    // echo of request
  problems: SpaceCampProblem[];          // echo of request
  students: GeneratedStudent[];          // N synthetic student personas + stats
  simulations: StudentSimulationResult[]; // how each student performed
  
  // Aggregated predictions
  metadata: {
    predictedCompletionRate: number;     // % of students expected to finish
    predictedAverageTime: number;        // average minutes across all students
    estimatedTotalTime: number;          // recommended time limit (minutes)
    riskLevel: 'low' | 'medium' | 'high'; // is assessment too hard/long?
    averageSuccessRate: number;          // avg % correct across all students
  };
}
```

---

## 9. Key Payload Locations in Code

| Format | Location | Purpose |
|--------|----------|---------|
| **Internal GeneratedProblem** | `src/hooks/useUserFlow.tsx` | Rich problem format with tips, rubric, tags |
| **Internal ExtractedProblem** | `src/agents/analysis/documentStructureParser.ts` | Parsed problem with detailed metadata |
| **Space Camp SpaceCampProblem** | `src/types/spaceCampSchema.ts` | Simplified format sent to backend |
| **Space Camp Request** | `src/types/spaceCampSchema.ts` | problems + metadata + scoring rules |
| **Space Camp Response** | `src/types/spaceCampSchema.ts` | students + simulations + metadata |
| **Payload Builder** | `src/services/assessmentSummarizerService.ts` | Builds Space Camp payload from AssessmentIntent |
| **Examples** | `SPACE_CAMP_PAYLOAD_EXAMPLE.json` | Complete working example of Space Camp payloads |
| **Reference** | `SPACE_CAMP_CONFIG_GUIDE.md` | Detailed Space Camp requirements |

---

## 10. How Payloads Flow Through the System

```
Teacher Creates Assignment
    ↓
AI Generates Problems (GeneratedProblem[])
├─ Rich internal format with tipText, rubric, tags, etc.
├─ bloomLevel as numeric, complexity/novelty as categorical strings
├─ Organized by sectionId with full scaffolding
    ↓
assessmentSummarizerService.summarizeAssessmentIntent()
├─ Derives Bloom targets, complexity ranges, question count
├─ Builds Space Camp metadata (grade band, subject, class level, time target)
    ↓
Transform to Space Camp Format (SpaceCampProblem[])
├─ Converts bloomLevel: numeric → string ("Understand")
├─ Converts complexity: categorical → Difficulty (1-5)
├─ Converts complexity: categorical → LinguisticComplexity (0.0-1.0)
├─ Drops tipText, rubric, tags, sectionId
    ↓
[Space Camp Backend]
    ↓
Receives: SpaceCampRequest (simplified problems + metadata + scoring rules)
Generates: Student persona stats using rubric multipliers
Simulates: Each (student, problem) pair with fatigue & confusion
    ↓
Returns: SpaceCampResponse (students + simulations + aggregated metrics)
    ↓
UI displays student feedback + risk warnings
Rewriter uses simulation data + internal format to adjust difficulty

**Note**: The UI still uses the internal GeneratedProblem format (with tips, rubrics, tags)
for teacher display. Space Camp response is merged with internal format for rewriting.
```

---

## 11. Critical Fields for Success

### In Internal Problem Format (GeneratedProblem):
- ✅ **id** — unique identifier (e.g., "q3")
- ✅ **problemText** — full problem text with all wording
- ✅ **bloomLevel** — numeric (1-6)
- ✅ **complexity** — categorical: "low", "medium", "high"
- ✅ **novelty** — categorical: "low", "medium", "high"
- ✅ **estimatedTime** — minutes needed (for time pressure estimates)
- ✅ **hasTip** / **tipText** — teacher-facing scaffolding
- ✅ **rubric** — grading criteria and expectations

### In Space Camp Problem Payload (SpaceCampProblem):
- ✅ **ProblemId** — must be unique
- ✅ **BloomLevel** — must be valid string (Remember–Create)
- ✅ **LinguisticComplexity** — must be 0.0–1.0
- ✅ **EstimatedTimeMinutes** — must be positive
- ✅ **Difficulty** — must be 1–5

### In Metadata:
- ✅ **gradeBand** — one of "3-5", "6-8", "9-12"
- ✅ **subject** — one of "math", "english", "science", "history", "general"
- ✅ **classLevel** — one of "standard", "honors", "AP"
- ✅ **timeTargetMinutes** — total time student has

### In Scoring Rules:
- ✅ **gradeBandBaselines** — defines ability ranges for the target grade band
- ✅ **classLevelMultipliers** — scales difficulty expectations
- ✅ **subjectModifiers** — boosts subject-specific skills
- ✅ **overlayMultipliers** — reduces stats for accessibility needs

