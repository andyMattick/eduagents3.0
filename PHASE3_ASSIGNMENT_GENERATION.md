# Phase 3: Assignment Generation from Teacher Materials

## Overview

Phase 3 transforms static teacher materials (lesson plans, notes, slides) into **pedagogically optimized assignments** through intelligent intent extraction and Asteroid generation.

### Core Philosophy

Rather than just extracting existing problems, Phase 3 **interprets instructional intent** and **generates new problems** that match the teacher's needs while maintaining pedagogical soundness.

---

## Architecture

### Three-Stage Pipeline

```
Upload File
    ↓
[1] INTENT EXTRACTION
    ├─ Extract Bloom levels and keywords
    ├─ Detect instructional tone
    ├─ Identify key concepts
    ├─ Extract learning objectives
    └─ Output: AssignmentIntentTags
    ↓
[2] INTENT REFINEMENT
    ├─ Validate extracted intent
    ├─ Allow teacher overrides
    └─ Output: Refined AssignmentIntentTags
    ↓
[3] ASSIGNMENT GENERATION
    ├─ Select problem generation templates
    ├─ Distribute across Bloom levels
    ├─ Build cognitive load curve
    ├─ Add scaffolding/tips based on intent
    └─ Output: AsteroidOptimizedAssignment
```

---

## Data Types

### AssignmentIntentTags

Output of intent extraction. Describes what the teacher's lesson was about and how to teach it.

```typescript
interface AssignmentIntentTags {
  topic: string;
  inferredBloomDistribution: Partial<Record<BloomLevel, number>>;
  preferredProblemTypes: ProblemType[];
  cognitiveLoadTarget: CognitiveLoadTarget;
  noveltyPreference: NoveltyPreference;
  includeTips: boolean;
  estimatedTime: number;
  keyConcepts: string[];
  learningObjectives: string[];
  instructionalTone: 'exploratory' | 'evaluative' | 'scaffolded' | 'challenge';
  extractionConfidence: number;
}
```

### Assignment Type Specifications

Each assignment type has different characteristics:

| Type | Bloom Focus | Problems | Tips | Load Strategy | Use Case |
|------|-------------|----------|------|---------------|----------|
| **quiz** | Apply, Analyze | 5–10 | None | Medium | Formal assessment |
| **warm-up** | Remember, Understand | 2–4 | Many | Low | Confidence builder |
| **exit-ticket** | Understand, Apply | 1–3 | Many | Low | Reflection/feedback |
| **practice-set** | Apply, Analyze, Evaluate | 6–12 | Some | Bell-curve | Skill iteration |
| **project** | Create, Evaluate | 1–2 | None | High | Synthesis task |

### AsteroidOptimizedAssignment

Complete, ready-to-use assignment with teaching notes.

```typescript
interface AsteroidOptimizedAssignment {
  id: string;
  type: AssignmentType;
  title: string;
  topic: string;
  asteroids: Asteroid[];
  
  // Teaching support
  bloomHistogram: Record<BloomLevel, number>;
  cognitiveLoadCurve: number[];
  designRationale: string;
  estimatedTimeMinutes: number;
  
  // Source context
  sourceContext?: {
    fileName?: string;
    uploadDate?: string;
    contentType?: 'pdf' | 'docx' | 'text';
  };
}
```

---

## API Reference

### Main Function: uploadAndGenerateAssignment()

**Orchestrates entire workflow** from file upload to optimized assignment.

```typescript
async function uploadAndGenerateAssignment(options: {
  file: File | { name: string; content: string };
  assignmentType: AssignmentType;
  topic?: string;
  gradeLevel?: string;
  subject?: string;
  problemCount?: number;
  intentOverrides?: Partial<AssignmentIntentTags>;
  onProgress?: (step: string, data?: any) => void;
}): Promise<{
  session: AssignmentGenerationSession;
  assignment: AsteroidOptimizedAssignment;
}>;
```

**Usage:**
```typescript
const { assignment } = await uploadAndGenerateAssignment({
  file: lessonPlanFile,
  assignmentType: 'practice-set',
  topic: 'Photosynthesis',
  gradeLevel: 'Grade 9',
  subject: 'Biology',
  onProgress: (step, data) => {
    console.log(`${step}:`, data);
  },
});
```

**Workflow:**
1. Extract text from file (PDF, DOCX, TXT)
2. Extract pedagogical intent from text
3. Apply any intent overrides from teacher
4. Generate optimized assignment
5. Validate and return

---

### Intent Extraction: extractIntentFromMaterials()

**Analyzes text to extract pedagogical intent.**

```typescript
function extractIntentFromMaterials(
  uploadedText: string,
  topic?: string,
  gradeLevel?: string
): AssignmentIntentTags;
```

**What it extracts:**
- **Bloom levels** from action verbs (analyze, evaluate, create, etc.)
- **Key concepts** from capitalized phrases and quoted terms
- **Learning objectives** from "students will" and "by the end" patterns
- **Instructional tone** (exploratory, evaluative, scaffolded, challenge)
- **Time hints** from explicit mentions in materials
- **Problem type preferences** based on Bloom distribution

**Example:**
```typescript
const intent = extractIntentFromMaterials(`
  Learning Objectives:
  - Students will understand the water cycle
  - Students will analyze how climate affects weather patterns
  - Students will create weather prediction models
  
  This unit explores precipitation, evaporation, and condensation.
  Students investigate the role of ocean currents in climate.
`);

// Result:
// {
//   topic: "water cycle/weather",
//   inferredBloomDistribution: {
//     Understand: 0.4,
//     Analyze: 0.3,
//     Create: 0.3
//   },
//   instructionalTone: "exploratory",
//   keyConcepts: ["water cycle", "precipitation", "ocean currents"],
//   learningObjectives: [
//     "understand the water cycle",
//     "analyze how climate affects weather patterns",
//     "create weather prediction models"
//   ],
//   ...
// }
```

---

### Assignment Generation: generateAsteroidOptimizedAssignment()

**Creates problems based on intent and assignment type.**

```typescript
function generateAsteroidOptimizedAssignment(
  intent: AssignmentIntentTags,
  assignmentType: AssignmentType,
  options?: {
    gradeLevel?: string;
    subject?: string;
    problemCount?: number;
  }
): AsteroidOptimizedAssignment;
```

**What it does:**
1. Determines Bloom distribution based on type specs + intent
2. Generates problems using intent-specific templates
3. Sequences problems by cognitive load (bell-curve, low, medium, high)
4. Includes scaffolding/tips based on assignment type
5. Calculates time estimates per problem

**Example:**
```typescript
const assignment = generateAsteroidOptimizedAssignment(
  intent,
  'practice-set',
  {
    gradeLevel: 'Grade 9',
    subject: 'Biology',
    problemCount: 8,
  }
);

// Returns: 8 problems sequenced as:
// [Easy] → [Build] → [Build] → [Peak] → [Challenge] → 
// [Challenge] → [Ease] → [Recap]
```

---

### Quick Functions

**quickGenerateAssignment()** - One-line generation with defaults:
```typescript
const assignment = await quickGenerateAssignment(
  file,
  'practice-set'
);
```

**regenerateAssignmentFromIntent()** - Reuse extraction, different type:
```typescript
const quizVersion = regenerateAssignmentFromIntent(
  intent,
  'quiz',
  { problemCount: 6 }
);
```

**generateAssignmentVariations()** - Create multiple types at once:
```typescript
const [quiz, practice, project] = generateAssignmentVariations(
  intent,
  'practice-set',
  ['quiz', 'practice-set', 'project']
);
```

---

## Integration with Pipeline

### Current Architecture

```
INPUT
  ↓
DOCUMENT_PREVIEW
  ↓
PROBLEM_ANALYSIS (Phase 1: MVP parser)
  ↓
CLASS_BUILDER
  ↓
STUDENT_SIMULATIONS
  ↓
REWRITE_RESULTS
  ↓
EXPORT
```

### Phase 3 Integration Points

**Option A: Replace INPUT workflow**
- Add "Upload Lesson Plan" tab in INPUT step
- Call `uploadAndGenerateAssignment()` when teacher uploads
- Write generated asteroids to state
- Skip PROBLEM_ANALYSIS (already have structured asteroids)
- Proceed to CLASS_BUILDER

**Option B: Parallel workflow**
- Keep current FILE UPLOAD path
- Add new "FROM LESSON PLAN" path using uploadAndGenerateAssignment()
- Let teacher choose at INPUT step:
  - Upload assignment file (current workflow)
  - Upload lesson plan (Phase 3 workflow)
  - Create assignment manually

**Option C: Preprocessing**
- Add Phase 3 workflow BEFORE current pipeline
- Teacher uploads lesson → Phase 3 generates → Stores as "template"
- Teacher can then review, edit, apply multiple times
- Integrate with template library

---

## Intent Extraction Details

### Bloom Level Detection

Uses **action verb matching** from materials:

```
Remember: define, list, name, identify, label, recall, state, write
Understand: explain, describe, discuss, interpret, summarize, paraphrase
Apply: use, demonstrate, solve, execute, implement, practice, calculate
Analyze: examine, compare, contrast, distinguish, differentiate, break down
Evaluate: judge, justify, critique, assess, defend, appraise, conclude
Create: design, invent, create, compose, generate, synthesize, develop
```

**Example:**
```
"Students will analyze the causes of climate change and design 
sustainable solutions."

Detected Verbs:
- analyze → Analyze level (+1)
- design → Create level (+1)

Distribution: Analyze 50%, Create 50%
→ Mixed assignment emphasizing higher-order thinking
```

### Instructional Tone Detection

**Four tones** inform scaffolding and novelty:

| Tone | Indicators | Tips | Novelty |
|------|------------|------|---------|
| **exploratory** | discover, investigate, inquiry, wonder, question | Many | High |
| **evaluative** | assess, measure, test, quiz, exam, grade | Few | Low |
| **scaffolded** | step-by-step, hints, support, guide, scaffold | Many | Low |
| **challenge** | challenge, extend, advanced, difficult, complex | None | High |

---

## Problem Generation Templates

Problems are generated from **templates matched to Bloom level and problem type**.

### Template Structure

```typescript
PROBLEM_TEMPLATES[BloomLevel][ProblemType] = [
  "Template 1 with {placeholders}",
  "Template 2 with {parameters}",
  ...
]
```

### Placeholder Substitution

```
{concept} → First key concept
{concept_a}, {concept_b} → Multiple concepts
{topic} → Primary topic
{context} → Grade level, subject context
{scenario} → Real-world application
{real_world_scenario} → Authentic application
{claim} → Topic-related statement
```

### Example Generation

**Input:**
```
Bloom: Evaluate
Type: free-response
Topic: "Impact of Social Media"
Concepts: ["echo chambers", "misinformation", "mental health"]
```

**Template Selected:**
```
"Evaluate the effectiveness of {approach} for {goal}."
```

**After Substitution:**
```
"Evaluate the effectiveness of platform regulation for 
addressing misinformation and echo chambers on social media."
```

---

## Cognitive Load Sequencing

### Four Strategies

**1. Low Load (warm-ups, exit tickets)**
```
Problem Difficulty
      |
 35%  |     /
      |    /
 30%  |   /
      |__/___________
      1   2   3   4
```
Gradual increase but stay accessible.

**2. Medium Load (quizzes)**
```
Problem Difficulty
      |    /\
 55%  |   /  \
      |  /    \___
 50%  | /
      |/___________
      1   2   3   4
```
Smooth curve with slight peak.

**3. High Load (projects)**
```
Problem Difficulty
      |        /
      |       /
      |      /
      |_____/____
      1   2  3  4
```
Ramp up, building toward challenge.

**4. Bell Curve (practice sets)**
```
Problem Difficulty
      |      /\
 70%  |     /  \
      |    /    \
 40%  |___/      \___
      1   2  3  4  5
```
Easy start, peak challenge in middle, ease at end.

**Why Bell Curve?**
- Start with confidence: recall/remember items
- Build gradually: understand and apply
- Peak challenge: analyze and evaluate  
- Ease end: reflect and synthesize
- Prevents cognitive overload, maintains engagement

---

## Validation & Quality Assurance

### validateAssignmentDesign()

**Checks generated assignment against specs:**

```typescript
const validation = validateAssignmentDesign(assignment);
// {
//   valid: boolean,
//   issues: string[]
// }
```

**Validation checks:**
- ✅ Problem count within min/max for type
- ✅ Bloom levels match type emphasis
- ✅ Time estimate reasonable
- ✅ Cognitive load curve valid
- ✅ Novelty spacing appropriate

---

## Usage Examples

### Example 1: Generate Practice Set from Lesson Plan

```typescript
const lesson = `
Biology Lesson: Cell Division

Learning Objectives:
- Students will understand the stages of mitosis
- Students will analyze the role of chromosomes
- Students will evaluate cancer as mitosis gone wrong

Key Concepts:
- Prophase, Metaphase, Anaphase, Telophase
- Centromeres and spindle fibers
- Genetic material and DNA replication

Lesson includes demonstrations, microscope observations, and 
step-by-step diagrams to scaffold understanding.
`;

const { assignment } = await uploadAndGenerateAssignment({
  file: { name: 'cell-division.txt', content: lesson },
  assignmentType: 'practice-set',
  topic: 'Cell Division',
  gradeLevel: '7-8',
  subject: 'Biology',
});

// Result: 8 scaffolded problems about mitosis
// - Problems 1-2: Recall/Understand stage names
// - Problems 3-4: Apply understanding to diagrams
// - Problems 5-6: Analyze relationships between stages
// - Problems 7-8: Evaluate cancer implications
```

### Example 2: Generate Multiple Assignment Types

```typescript
const intent = await extractIntentFromMaterials(lessonText);

const assignments = generateAssignmentVariations(intent, 'practice-set', [
  'warm-up',     // Start class
  'practice-set', // Main learning
  'exit-ticket',  // Check understanding
]);

// Use warm-up at lesson start
// Use practice-set during guided practice
// Use exit-ticket at lesson end
```

### Example 3: Regenerate with Different Constraints

```typescript
// First generation
const { assignment, session } = await uploadAndGenerateAssignment({
  file: lessonPlanFile,
  assignmentType: 'practice-set',
  problemCount: 8,
});

// Teacher wants a longer version for homework
const longerVersion = regenerateAssignmentFromIntent(
  session.intentTags!,
  'practice-set',
  { problemCount: 12 }
);

// Teacher wants quiz version for assessment
const quizVersion = regenerateAssignmentFromIntent(
  session.intentTags!,
  'quiz',
  { problemCount: 6 }
);
```

---

## Error Handling

### Common Issues

**Low Extraction Confidence**
```
If extractionConfidence < 0.5:
- Lesson plan may lack clear objectives
- Consider manual topic/concept specification
- Use intentOverrides to refine
```

**Validation Failures**
```
Issues: ["Too many problems (15), maximum is 12"]
→ Reduce problemCount or change assignment type
```

**File Parsing Errors**
```
For complex PDFs, text extraction may be imperfect
→ Recommend copying text into text field instead
```

---

## Future Enhancements

### Phase 3.5: AI Polishing
- Use Claude API to refine generated problems
- Natural language enhancement
- Contextual improvements
- Accessibility optimization

### Phase 4: Teacher Customization UI
- Visual intent editor
- Problem bank templates
- Real-time preview
- Drag-drop reordering

### Phase 5: Analytics Integration
- Track which assignments work best
- Student performance correlation
- Automatic difficulty tuning
- Adaptive generation based on outcomes

---

## File References

**Core Implementation:**
- [src/types/assignmentGeneration.ts](#phase-3-type-definitions)
- [src/agents/analysis/intentExtraction.ts](#intent-extraction-engine)
- [src/agents/analysis/optimizedAssignmentGeneration.ts](#assignment-generation-engine)
- [src/agents/analysis/uploadAndGenerate.ts](#orchestration-api)

**Integration:**
- [src/components/Pipeline/PipelineShell.tsx](#pipeline-component)
- [src/hooks/usePipeline.ts](#pipeline-hook)

---

## Testing Phase 3

### Manual Test Workflow

1. **Create test lesson plan:**
```
High school AP Biology lesson on photosynthesis
Should detect: Understand, Apply, Analyze Bloom levels
Should extract ~3-4 key concepts
Should infer "exploratory" tone
```

2. **Call uploadAndGenerateAssignment:**
```typescript
const result = await uploadAndGenerateAssignment({
  file: { name: 'ap-bio.txt', content: lessonText },
  assignmentType: 'practice-set',
  gradeLevel: '10-12',
  subject: 'Biology',
});
```

3. **Verify output:**
- ✅ 6-12 problems generated
- ✅ Mix of Bloom levels (Understand > Apply > Analyze)
- ✅ Bell-curve cognitive load
- ✅ Scaffolding hints included
- ✅ Realistic problem text
- ✅ Estimated time reasonable

---

## Summary

**Phase 3** enables teachers to upload their own materials and generate **pedagogically sound, automatically sequenced assignments** in seconds.

Key capabilities:
- 📚 **Intent Extraction**: Understand what the teacher is teaching
- 🎯 **Smart Generation**: Create problems that match instructional goals
- 📊 **Cogn Load Pacing**: Sequence problems for optimal learning
- 🔄 **Variations**: Generate quiz/practice/project from one lesson plan
- ⚡ **Rapid Iteration**: Regenerate with different constraints instantly

**End result:** Teachers get classroom-ready assignments that **align with their teaching intent** and provide **optimal cognitive sequencing** for student success.
