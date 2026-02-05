# Phase 3: Quick Reference Guide

## At a Glance

**Phase 3** turns teacher lesson plans into optimized assignments in 3 steps:

```
Lesson Plan → Extract Intent → Generate Problems
```

---

## One-Minute Overview

### What It Does
- 📤 Accepts teacher-uploaded lesson plans/notes/slides
- 🧠 Understands pedagogical intent (topics, Bloom levels, tone)
- 🎲 Generates new problems optimized for classroom use
- 📊 Sequences problems for optimal cognitive load
- 🔄 Creates variations (quiz, practice set, project, etc.)

### Why It Matters
Instead of extracting problems from existing materials, Phase 3 creates **new problems** that match the teacher's instructional intent while maintaining pedagogical soundness.

---

## API Cheat Sheet

### Main Function
```typescript
// Upload lesson → Generate assignment
const { assignment } = await uploadAndGenerateAssignment({
  file: lessonFile,
  assignmentType: 'practice-set',  // quiz | practice-set | warm-up | exit-ticket | project
  topic: 'Photosynthesis',
  gradeLevel: 'Grade 9',
});
```

### Quick Start
```typescript
// One-liner with defaults
const assignment = await quickGenerateAssignment(file, 'practice-set');
```

### Advanced
```typescript
// Extract intent from materials
const intent = extractIntentFromMaterials(lessonText);

// Generate multiple assignment types
const variations = generateAssignmentVariations(intent, 'practice-set', 
  ['quiz', 'practice-set', 'warm-up']);

// Regenerate with different parameters
const longerAssignment = regenerateAssignmentFromIntent(intent, 'practice-set', 
  { problemCount: 12 });
```

---

## Assignment Types at a Glance

| Type | Bloom Focus | Size | Tips | Best For |
|------|-------------|------|------|----------|
| **warm-up** | ← Remember, Understand → | 2-4 | ✅ Many | Lesson start |
| **exit-ticket** | ← Understand, Apply → | 1-3 | ✅ Heavy | Check understanding |
| **quiz** | ← Apply, Analyze → | 5-10 | ❌ Few | Assessment |
| **practice-set** | Apply → Analyze → Evaluate | 6-12 | ✅ Some | Main learning |
| **project** | ← Create, Evaluate → | 1-2 | ❌ None | Synthesis |

---

## Intent Extraction

### What Gets Extracted

```typescript
{
  topic: "Photosynthesis",
  inferredBloomDistribution: {
    Understand: 0.4,
    Apply: 0.35,
    Analyze: 0.25
  },
  keyConcepts: ["photosynthesis", "chloroplasts", "ATP", "glucose"],
  learningObjectives: ["understand stages", "apply in ecosystems", "analyze light reactions"],
  instructionalTone: "exploratory",  // or evaluative | scaffolded | challenge
  includeTips: true,
  estimatedTime: 45,
  extractionConfidence: 0.88
}
```

### Bloom Keywords Detected

```
Remember: define, list, name, identify, label, recall, state, write
Understand: explain, describe, discuss, interpret, summarize, paraphrase
Apply: use, demonstrate, solve, execute, implement, practice, calculate
Analyze: examine, compare, contrast, distinguish, differentiate, break down
Evaluate: judge, justify, critique, assess, defend, appraise, conclude
Create: design, invent, create, compose, generate, synthesize, develop
```

---

## Cognitive Load Curve

Problems are sequenced using one of 4 strategies:

**Low** (warm-ups)
```
Easy → Gradually Harder
```

**Bell Curve** (practice sets)  
```
Easy → Build → Peak → Ease → Recap
```

**Medium** (quizzes)
```
Moderate with slight variation
```

**High** (projects)
```
Build → Harder → Hardest
```

---

## Generated Problem Structure

Each generated problem is an **Asteroid** with:

```typescript
{
  ProblemId: "prob-practice-set-1",
  ProblemText: "Explain the role of light energy in photosynthesis...",
  BloomLevel: "Understand",
  LinguisticComplexity: 0.45,
  NoveltyScore: 0.62,
  HasTips: true,
  MultiPart: false,
  TestType: "free-response",
  SequenceIndex: 1,
  Subject: "Biology"
}
```

---

## File Handling

### Supported Formats
- 📄 PDF (via pdfjs-dist)
- 📝 DOCX (via mammoth)
- 📋 TXT (plain text)

### File Object
```typescript
// Option 1: File input
const file = new File([content], 'lesson.txt', { type: 'text/plain' });

// Option 2: Object
const file = { name: 'lesson.txt', content: lessonText };
```

---

## Progress Tracking

### onProgress Callback

```typescript
await uploadAndGenerateAssignment({
  file,
  assignmentType: 'practice-set',
  onProgress: (step, data) => {
    // Step 1: "Uploading file..."
    // Step 2: "Analyzing instructional intent..."
    // Step 3: "Generating optimized assignment..."
    console.log(`${step}:`, data);
  }
});
```

### Session Tracking

```typescript
{
  id: "gen-1234567890",
  status: 'complete',  // uploading | extracting | generating | complete | error
  uploadedFile: {
    name: "lesson.txt",
    type: "text",
    size: 4521
  },
  intentTags: { ... },
  generatedAssignment: { ... },
  errorMessage?: undefined
}
```

---

## Common Workflows

### Workflow 1: Generate Practice Set
```typescript
const { assignment } = await uploadAndGenerateAssignment({
  file: lessonPlan,
  assignmentType: 'practice-set',
  topic: 'Photosynthesis'
});
// → 6-12 problems with bell-curve difficulty
```

### Workflow 2: Create Assessment Version
```typescript
// Reuse the extracted intent
const quiz = regenerateAssignmentFromIntent(
  session.intentTags!,
  'quiz',
  { problemCount: 8 }
);
// → 5-10 faster, tighter problems
```

### Workflow 3: Generate Multiple Versions
```typescript
const [warm, practice, assessment] = generateAssignmentVariations(intent,
  'practice-set',
  ['warm-up', 'practice-set', 'quiz']
);

// warm → lesson start (2-4 confidence builders)
// practice → guided practice (6-12 mixed difficulty)
// assessment → check understanding (5-10 tight focus)
```

### Workflow 4: Customize Intent
```typescript
const customized = await uploadAndGenerateAssignment({
  file: lessonPlan,
  assignmentType: 'practice-set',
  intentOverrides: {
    noveltyPreference: 'high',  // Make it more challenging
    includeTips: false,          // Remove scaffolding
    topicOverride: 'Cellular Respiration',  // Override detected topic
  }
});
```

---

## Validation

### Check Assignment Design

```typescript
const validation = validateAssignmentDesign(assignment);
if (validation.valid) {
  console.log('✅ Assignment is pedagogically sound');
} else {
  console.warn('⚠️ Issues:', validation.issues);
  // Issues might include:
  // - Too few/many problems
  // - Missing Bloom levels
  // - Unrealistic time estimate
}
```

---

## Export Options

### JSON Export
```typescript
const json = exportAssignmentData(assignment, 'json');
// Full structured data for processing
```

### CSV Export
```typescript
const csv = exportAssignmentData(assignment, 'csv');
// Problems in spreadsheet format
// Columns: Problem ID | Bloom | Text | Complexity | Novelty | Tips | Multi-Part
```

---

## Error Handling

### Low Extraction Confidence
```typescript
if (intent.extractionConfidence < 0.5) {
  // Provide fallback or ask teacher for clarification
  const refined = await teacherConfirmIntentDialog(intent);
}
```

### Validation Issues
```typescript
const { valid, issues } = validateAssignmentDesign(assignment);
if (!valid) {
  // Regenerate with different parameters
  const fixed = regenerateAssignmentFromIntent(intent, type, {
    problemCount: Math.min(8, desiredCount)
  });
}
```

### File Upload Errors
```typescript
try {
  const result = await uploadAndGenerateAssignment(options);
} catch (error) {
  if (error instanceof FileTooLargeError) {
    // File > 10MB
  } else if (error instanceof UnsupportedFormatError) {
    // Not PDF/DOCX/TXT
  } else if (error instanceof ExtractionError) {
    // Failed to parse content
  }
}
```

---

## Performance Notes

### Typical Times
- File upload: < 1 sec
- Intent extraction: 1-2 sec
- Assignment generation: 1-2 sec
- **Total: 3-5 seconds**

### Scaling
- Supports materials up to 100KB (≈20,000 words)
- Generation is O(n) in problem count
- Generates 1 problem per ~200ms

---

## Integration with Pipeline

### Current: Phase 1 workflow
```
Upload File → Parse → Analyze → Simulate → Rewrite → Export
```

### With Phase 3
```
Option A: Replace INPUT
Upload Lesson Plan → Extract Intent → Generate → Simulate → Rewrite → Export

Option B: Parallel workflow  
INPUT: Choose "Upload Lesson" or "Upload Assignment"
```

---

## Examples in Code

### Full Example
```typescript
// 1. Teacher uploads lesson plan
const file = await selectFileFromDialog();

// 2. Generate assignment
const { assignment, session } = await uploadAndGenerateAssignment({
  file,
  assignmentType: 'practice-set',
  gradeLevel: 'Grade 9',
  subject: 'Biology',
  onProgress: (step) => updateUI(`${step}...`),
});

// 3. Teacher previews
displayAssignment(assignment);

// 4. Teacher adjusts or creates variations
const quizVersion = regenerateAssignmentFromIntent(
  session.intentTags!,
  'quiz',
  { problemCount: 5 }
);

// 5. Export for use
downloadAssignment(assignment, 'json');
```

---

## Type Definitions Location

```
src/types/assignmentGeneration.ts
├─ AssignmentIntentTags
├─ AssignmentType
├─ ProblemType
├─ AsteroidOptimizedAssignment
└─ AssignmentGenerationSession
```

## Implementation Files

```
src/agents/analysis/
├─ intentExtraction.ts (extract pedagogy from text)
├─ optimizedAssignmentGeneration.ts (create problems)
└─ uploadAndGenerate.ts (orchestration API)
```

---

## Next Steps

1. **Display Phase 3 UI in INPUT step** (file upload tab)
2. **Call uploadAndGenerateAssignment()** on file selection
3. **Populate pipeline state** with generated asteroids
4. **Skip PROBLEM_ANALYSIS** (already structured)
5. **Proceed to CLASS_BUILDER** for simulation
6. **Test end-to-end**

---

## Questions?

- **What if extraction confidence is low?**
  - Use `intentOverrides` to specify intent manually

- **Can I mix Phase 1 and Phase 3 assignments?**
  - Yes, asteroids are identical format

- **How do I regenerate after teacher feedback?**
  - Save `session.intentTags`, call `regenerateAssignmentFromIntent`

- **Can I modify generated problems?**
  - Yes, they're just Asteroids in state; edit and resimulate

- **What's the time estimate based on?**
  - ~3-5 min per problem based on Bloom level (higher Bloom = longer)
