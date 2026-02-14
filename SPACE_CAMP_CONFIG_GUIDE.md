# Space Camp Student Stats Configuration Guide

**Version:** 1.0  
**Date:** February 14, 2026  
**Purpose:** Complete reference for what info Space Camp needs to build student stats correctly

---

## Executive Summary

Space Camp needs **3 inputs** to generate realistic student performance data:

1. **Problems** — Full metadata (Bloom levels, complexity, time)
2. **Document Context** — Grade band, subject, class level
3. **Scoring Rules** — How to calculate student stats (baselines + modifiers)

---

## 1. Problems Payload

Each problem must include:

```json
{
  "ProblemId": "prob_001",
  "Type": "multiple-choice | true-false | short-answer | essay | matching",
  "BloomLevel": "Remember | Understand | Apply | Analyze | Evaluate | Create",
  "Content": "Full problem text here",
  "CorrectAnswer": "The expected answer",
  "LinguisticComplexity": 0.0 - 1.0,
  "EstimatedTimeMinutes": 1.5,
  "Difficulty": 1 - 5,
  "SequenceIndex": 0
}
```

### Problem Fields Explained

| Field | Range | Source | Notes |
|-------|-------|--------|-------|
| **BloomLevel** | Remember, Understand, Apply, Analyze, Evaluate, Create | AI Analyzer | Required for difficulty simulation |
| **LinguisticComplexity** | 0.0-1.0 | Word count + readability index | Impacts reading-dependent students |
| **EstimatedTimeMinutes** | Integer | Formula: `2 + (complexity × 5) + (bloomLevel × 1.5)` | Cumulative fatigue calculation |
| **Difficulty** | 1-5 | Bloom + Complexity map | 1=Easy, 5=Very Hard |
| **Type** | multiple-choice, true-false, etc. | AI Generator | Affects engagement metrics |

---

## 2. Document Metadata

Must be provided before simulation:

```json
{
  "documentMetadata": {
    "gradeBand": "3-5 | 6-8 | 9-12",
    "subject": "math | english | science | history | general",
    "classLevel": "standard | honors | AP",
    "timeTargetMinutes": 45
  }
}
```

### Metadata Impact on Student Stats

**Grade Band** → Sets baseline ranges for abilities:
- **3-5**: readingLevel [0.30, 0.60], mathLevel [0.35, 0.65]
- **6-8**: readingLevel [0.40, 0.70], mathLevel [0.45, 0.75]
- **9-12**: readingLevel [0.55, 0.85], mathLevel [0.55, 0.85]

**Class Level** → Multiplies all derived stats:
- **standard**: ×1.0
- **honors**: ×1.10 (10% boost)
- **AP**: ×1.20 (20% boost)

**Subject** → Emphasizes subject-specific abilities:
- **math**: mathLevel ×1.1, readingLevel ×1.0, reasoning ×1.0
- **english**: readingLevel ×1.1, reasoning ×1.0, mathLevel ×1.0
- **science**: mathLevel ×1.0, reasoning ×1.1, readingLevel ×1.0

---

## 3. Astronaut Scoring Rules (AstronautRubric)

This defines **how student stats are generated**:

```typescript
{
  // Step 1: Grade band baselines
  gradeBandBaselines: {
    "6-8": {
      readingLevel: [0.40, 0.70],
      mathLevel: [0.45, 0.75],
      stamina: [0.45, 0.75],
      reasoning: [0.45, 0.75],
      confusionTolerance: [0.45, 0.75]
    }
  },
  
  // Step 2: Class level boost
  classLevelMultipliers: {
    standard: 1.0,
    honors: 1.10,
    AP: 1.20
  },
  
  // Step 3: Subject emphasis
  subjectModifiers: {
    math: { mathLevel: 1.1, readingLevel: 1.0, reasoning: 1.0 },
    english: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
    science: { mathLevel: 1.0, reasoning: 1.1, readingLevel: 1.0 },
    history: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
    general: { mathLevel: 1.0, readingLevel: 1.0, reasoning: 1.0 }
  },
  
  // Step 4: Accessibility overlays (applied to individual students)
  overlayMultipliers: {
    adhd: { stamina: 0.85, reasoning: 0.90, confusionTolerance: 0.75 },
    dyslexia: { readingLevel: 0.65, confidence: 0.80 },
    fatigue_sensitive: { stamina: 0.75, reasoning: 0.85 },
    esl: { readingLevel: 0.75, confidence: 0.85 },
    anxiety_prone: { confidence: 0.80, confusionTolerance: 0.70 }
  }
}
```

---

## How Space Camp Builds Student Stats

### Example: Generating an ADHD Student in 6th Grade Math (Standard Class)

```
STEP 1: Start with grade 6-8 baseline
  readingLevel = random(0.40, 0.70) = 0.55
  mathLevel = random(0.45, 0.75) = 0.62
  reasoning = random(0.45, 0.75) = 0.58
  stamina = random(0.45, 0.75) = 0.65
  confidence = random(0.45, 0.75) = 0.60

STEP 2: Apply class level (standard = 1.0, no change)
  [all stats remain same]

STEP 3: Apply subject modifier (math: mathLevel ×1.1)
  readingLevel = 0.55  [no change]
  mathLevel = 0.62 × 1.1 = 0.682
  reasoning = 0.58     [no change]
  stamina = 0.65       [no change]
  confidence = 0.60    [no change]

STEP 4: Apply ADHD overlay
  stamina = 0.65 × 0.85 = 0.55 (reduced stamina)
  reasoning = 0.58 × 0.90 = 0.52 (harder to think clearly)
  confusionTolerance = 0.70 × 0.75 = 0.525 (more easily confused)

FINAL STUDENT STATS:
  StudentId: astronaut_001
  PersonaName: "Alex (ADHD, Math-Capable)"
  baseStats: {
    readingLevel: 0.55,
    mathFluency: 0.682,
    reasoningLevel: 0.52,
    attentionSpan: 0.55,
    confidence: 0.60
  }
  overlays: ["adhd"]
```

---

## Student Stats Dimensions

After Space Camp calculates them, each student has:

```typescript
{
  studentId: string;           // e.g., "astronaut_001"
  personaName: string;         // e.g., "Alex (ADHD, Math-Capable)"
  
  baseStats: {
    readingLevel: number;      // 0.0-1.0 (ability to parse text)
    reasoningLevel: number;    // 0.0-1.0 (logical thinking)
    mathFluency: number;       // 0.0-1.0 (math skills)
    attentionSpan: number;     // 0.0-1.0 (can focus, stamina)
    confidence: number;        // 0.0-1.0 (self-efficacy)
  };
  
  overlays: string[];          // ["adhd", "dyslexia", etc.]
  gradeLevel: string;          // "6-8", "9-12"
}
```

---

## What Gets Returned to Philosopher

After simulation, Space Camp returns:

```typescript
{
  problems: UniversalProblem[],
  studentSimulations: {
    studentId: string,
    successRate: number,        // 0-1
    avgTime: number,            // seconds
    confusionIndex: number,     // 0-1 (how confused)
    fatigueIndex: number,       // 0-1 (cumulative tiredness)
    engagementScore: number,    // 0-1 (interest level)
    struggledProblems: string[]
  }[],
  documentMetadata: { ... },
  prediction: {
    predictedCompletionRate: number,  // % who finish
    predictedTotalTime: number        // minutes needed
  }
}
```

---

## Critical Checklist ✅

Before sending to Space Camp, verify:

- [ ] **All problems have BloomLevel** (not null/undefined)
- [ ] **All problems have LinguisticComplexity** (0.0-1.0)
- [ ] **All problems have EstimatedTimeMinutes** (positive integer)
- [ ] **All problems have SequenceIndex** (0, 1, 2, ... in order)
- [ ] **gradeBand is correct** (3-5, 6-8, or 9-12)
- [ ] **subject matches** (math, english, science, history, general)
- [ ] **classLevel matches** (standard, honors, or AP)
- [ ] **AstronautRubric is passed** (from getAstronautScoringRules())
- [ ] **timeTargetMinutes is realistic** (e.g., 45, 60, 90)

---

## If Student Stats Are Wrong ⚠️

| Symptom | Likely Cause |
|---------|--------------|
| All students have same scores | Missing BloomLevel or LinguisticComplexity |
| ADHD students not tired | overlayMultipliers not applied in scoring rules |
| Math students too weak | subjectModifiers not applied |
| AP class same as standard | classLevelMultipliers not working |
| Everyone rushes through | EstimatedTimeMinutes too low |
| No one finishes | EstimatedTimeMinutes too high |

---

## Code Reference

**Source of truth:**
- `src/config/astronautScoringRules.ts` — AstronautRubric interface and `getAstronautScoringRules()`
- `src/agents/analysis/philosopherEngine.ts` — How stats are calculated
- `src/types/pipeline.ts` — SpaceCampPayload interface

**Used by:**
- `src/components/Pipeline/StudentSimulations.tsx` — Triggers Space Camp call
- `src/agents/analysis/philosophers.ts` — Receives results from Space Camp
