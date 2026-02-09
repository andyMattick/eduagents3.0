# AI Assignment Analysis Framework

## Overview

The **AI Assignment Analysis** feature enables teachers to upload existing assignments (with or without source materials) and have the system intelligently structure them into a comprehensive assessment. The AI analysis generates a `GeneratedAssignment` object with rich metadata for student simulation and adaptive learning.

---

## Architecture

### Data Flow

```
Teacher uploads assignment → AI Analyzes content → Generates structured problems → 
Routes to AssignmentPreview → Student simulation → Adaptive rewriting
```

### Core Components

1. **AssignmentAnalysisComponent** (`src/components/Pipeline/AssignmentAnalysisComponent.tsx`)
   - User interface for analysis preferences
   - Coordinates file parsing and AI analysis
   - Routes to AssignmentPreview on success

2. **Analysis Helper Functions**
   - `calculateNoveltyScore()` - Compares problem with source material
   - `requiresPriorKnowledge()` - Determines if problem needs external knowledge

3. **Routing Integration** (`src/hooks/useUserFlow.tsx`)
   - Both analyze paths (with/without source) route through `/assignment-analysis`
   - After generation, routes to `/assignment-preview`

---

## Generated Assignment Structure

### GeneratedAssignment Object

Each analyzed assignment produces:

```typescript
{
  assignmentId: string;           // Unique identifier
  assignmentType: string;         // "Quiz", "Exam", "Problem Set", etc.
  title: string;                  // Assignment title
  topic: string;                  // Subject/topic
  estimatedTime: number;          // Total minutes
  questionCount: number;          // Count of problems
  assessmentType: 'formative' | 'summative';
  sourceFile?: { name; type };    // Reference if provided
  sections: GeneratedSection[];   // Grouped problems
  bloomDistribution: Record<string, number>;  // % per level
  organizationMode: 'ai-generated' | 'manual';
  timestamp: string;              // ISO timestamp
}
```

### GeneratedProblem Schema

Each problem contains:

```typescript
{
  id: string;                              // Unique problem ID
  sectionId?: string;                     // Parent section
  
  // Content
  problemText: string;                    // Full problem statement
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed';
  questionFormat: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response' | 'fill-blank';
  
  // Pedagogical Classification
  bloomLevel: 1 | 2 | 3 | 4 | 5 | 6;     // 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create
  complexity: 'low' | 'medium' | 'high';  // Cognitive load
  problemLength: number;                  // Word count
  
  // Analysis Metrics
  novelty: 'low' | 'medium' | 'high';          // ← NEW: How different from source
  estimatedTime: number;                        // Minutes to solve
  sourceReference?: string;                     // ← NEW: Link to source material
  
  // Student Support
  hasTip: boolean;
  tipText?: string;
  
  // Assessment Data
  options?: string[];             // For multiple-choice (A, B, C, D)
  correctAnswer?: string | string[];
  rubric?: {
    criteria: string[];
    expectations: string;
  };
}
```

---

## Novelty Score Calculation

### Purpose
Identifies whether a problem represents:
- **Exact/paraphrased** content from source (low novelty)
- **Related application** of source concepts (medium novelty)
- **Completely novel** extension beyond source (high novelty)

### Algorithm

```typescript
function calculateNoveltyScore(problemText, sourceText): 'low' | 'medium' | 'high' {
  // 1. Extract significant keywords (>3 chars) from both texts
  // 2. Calculate overlap ratio (% of problem words found in source)
  // 3. Score based on thresholds:
  //    - >80% overlap → 'low' (mostly from source)
  //    - 40-80% overlap → 'medium' (related to source)
  //    - <40% overlap → 'high' (novel application)
}
```

### Example

**Source Material:**
> "Photosynthesis is the process by which plants convert light energy into chemical energy."

**Problem 1 (Low Novelty):**
> "Describe the process by which plants convert light energy to chemical energy"
> - Result: `novelty: 'low'` (direct paraphrase)

**Problem 2 (Medium Novelty):**
> "Explain how photosynthesis rate changes with light intensity"
> - Result: `novelty: 'medium'` (applies source concept in new context)

**Problem 3 (High Novelty):**
> "Design an experiment to measure photosynthetic efficiency in different wavelengths"
> - Result: `novelty: 'high'` (extends beyond source scope)

---

## Prior Knowledge Requirements

### Purpose
Flags problems that require knowledge **not introduced** in the source material, alerting teachers to:
- Scaffolding needs
- Background knowledge assumptions
- Prerequisite gaps

### Algorithm

```typescript
function requiresPriorKnowledge(problemText, sourceText, bloomLevel): boolean {
  // No source provided?
  if (!sourceText) {
    return bloomLevel >= 4;  // Analyze+ requires outside knowledge
  }

  // Calculate % of "new" words in problem not in source
  const newWordsRatio = countNewWords(problemText, sourceText) / totalWords;

  // Flag as requiring prior knowledge if:
  // - >20% of significant vocabulary is new, OR
  // - High Bloom level (Analyze+) with any new terms
  return newWordsRatio > 0.2 || (bloomLevel >= 4 && newWords.length > 0);
}
```

### Example

**Source Material:**
> "The hydrologic cycle consists of evaporation, condensation, and precipitation."

**Problem (Requires Prior Knowledge):**
> "How does the hydrologic cycle affect atmospheric pressure patterns?"
> - Result: `requiresPriorKnowledge: true` (requires knowledge of atmospheric dynamics)
> - Bloom Level: 4 (Analyze) with term "atmospheric pressure" not in source
> - Recommendation: Add scaffolding or prerequisite lesson

---

## Analysis Preferences

Teachers can customize how the AI structures assignments:

### 1. **Break into Multiple Sections**
- Organizes problems into logical topic areas
- Enables section-level timing and difficulty tracking
- Example: "Part A: Comprehension", "Part B: Application"

### 2. **Identify Bloom Levels**
- AI classifies each problem by cognitive demand
- Enables Bloom distribution visualization
- Supports differentiated instruction planning

### 3. **Add Tips for Higher-Order Thinking**
- For Understand level and above
- Include study hints, concept connections
- Scaffold metacognitive skills

### 4. **Estimated Duration**
- Total time budget for the assignment
- AI distributes across problems proportionally
- Used for student scheduling and fatigue modeling

### 5. **Refinement Notes**
- Optional teacher guidance for AI
- Examples: "Focus on conceptual understanding, not computation"
- Future: Used to fine-tune problem generation

---

## Integration with Student Simulation

### Novelty & Engagement

The novelty score directly impacts student simulation:

```
High Novelty → Higher engagement + potential confusion
Medium Novelty → Balanced challenge
Low Novelty → Confidence building, mastery practice
```

### Prior Knowledge Scaffolding

The `sourceReference` flag triggers:

```
If sourceReference exists:
  → Student persona has access to reference material
  → Time allowed increased by 15-20%
  → Confidence boost for reference-aware students
  
If requiresPriorKnowledge = true:
  → Flag as "prerequisite risk" in simulation
  → Lower success probability for under-prepared students
  → Recommendation for additional scaffolding
```

---

## Mock AI Implementation

The current `analyzeAssignmentText()` function uses pattern-matching AI that:

1. **Extracts problems** using regex patterns (numbered lists, "Q:", "Question:")
2. **Estimates Bloom distribution** from problem structure:
   - Direct recall questions → Remember
   - Definition/explanation → Understand
   - Problem-solving → Apply, Analyze, Evaluate
   - Synthesis/design → Create

3. **Calculates metrics**:
   - Novelty via keyword overlap analysis
   - Prior knowledge via vocabulary comparison
   - Estimated time based on Bloom level and complexity

### Production AI Service

To use a real AI service, replace the mock function:

```typescript
async function analyzeAssignmentText(
  assignmentText: string,
  sourceText: string | null,
  preferences: AnalysisPreferences
): Promise<GeneratedAssignment> {
  const aiService = getRealAIService('analyzer');
  
  const payload = {
    assignmentText: assignmentText.substring(0, 5000),
    sourceText: sourceText?.substring(0, 10000) || null,
    preferences,
  };
  
  const structured = await aiService.analyzeAssignment(payload);
  return structured;
}
```

See `src/config/aiConfig.ts` for service configuration.

---

## Bloom Distribution Reference

The AI infers Bloom levels from problem structure:

| Bloom Level | Verbs | Question Types | Examples |
|---|---|---|---|
| **1. Remember** | Define, recall, list | Fill-in-blank, matching | "What is photosynthesis?" |
| **2. Understand** | Explain, describe, summarize | Multiple-choice, true-false | "Explain why photosynthesis requires light." |
| **3. Apply** | Use, demonstrate, solve | Problem-solving, scenarios | "Calculate photosynthetic rate given..." |
| **4. Analyze** | Compare, contrast, diagram | Case analysis, essay | "How does photosynthetic rate vary with conditions?" |
| **5. Evaluate** | Justify, defend, critique | Argument writing, rubric | "Evaluate the efficiency of photosynthesis." |
| **6. Create** | Design, compose, synthesize | Project, experiment design | "Design an experiment to maximize photosynthesis." |

---

## End-to-End Example

### Teacher's Workflow

1. **Goal Selection**: "I want to Analyze an existing assignment"
2. **Source Selection**: "I have reference materials" → Uploads textbook excerpt
3. **Files Upload**: Uploads student assignment PDF
4. **Analysis Preferences**: 
   - Break into 2 sections (Part A: Remember/Understand, Part B: Apply+)
   - Identify Bloom levels ✓
   - Add tips ✓
   - Estimated duration: 45 minutes
5. **AI Processes Assignment**:
   - Extracts 15 problems from PDF
   - Calculates novelty: 8 low, 5 medium, 2 high
   - Marks 3 problems requiring prior knowledge (atmospheric terms)
   - Distributes into sections based on Bloom
6. **Routes to Preview**: Shows structured assignment with:
   - Problem cards with Bloom badges
   - Novelty indicators (low=🟢, medium=🟡, high=🔴)
   - Prior knowledge warnings
   - Section breakdowns
7. **Student Simulation**: Runs Astronaut profiles against structured data
8. **Rewriting**: Offers to:
   - Decrease word count for high-novelty problems
   - Add scaffolding for prior knowledge requirements
   - Redistribute Bloom levels for balanced difficulty

---

## API Reference

### Key Functions

#### `calculateNoveltyScore(problemText, sourceText): string`
- **Parameters**: 
  - `problemText`: Full problem statement
  - `sourceText`: Reference material (null if no source)
- **Returns**: `'low' | 'medium' | 'high'`
- **Used**: During problem extraction in analysis

#### `requiresPriorKnowledge(problemText, sourceText, bloomLevel): boolean`
- **Parameters**:
  - `problemText`: Full problem statement
  - `sourceText`: Reference material (null if no source)
  - `bloomLevel`: 1-6 (Remember through Create)
- **Returns**: boolean flag
- **Used**: To flag scaffolding needs

#### `analyzeAssignmentText(assignmentText, sourceText, preferences): Promise<GeneratedAssignment>`
- **Parameters**:
  - `assignmentText`: Uploaded assignment content
  - `sourceText`: Optional reference material
  - `preferences`: `AnalysisPreferences` object
- **Returns**: Fully structured assignment with all metadata
- **Used**: Main analysis orchestration

---

## Future Enhancements

### Phase 2: Advanced Analysis
- Real LLM integration for semantic problem classification
- Misconception detection from problem wording
- Learning outcome alignment mapping
- Evidence-based difficulty prediction

### Phase 3: Interactive Refinement
- "Refine this section" with specific modifications
- Problem-level regeneration from AssignmentPreview
- Bloom distribution adjustment UI
- Prior knowledge scaffolding suggestions

### Phase 4: Continuous Learning
- Track which problems students struggle with
- Feedback loop: simulation results → improved tagging
- Personalized teacher recommendations

---

## Troubleshooting

### Analysis Not Running
- **Issue**: File upload completes but no analysis starts
- **Solution**: Check browser console for parse errors; ensure file is valid PDF/DOCX/TXT

### All Problems Marked as "High Novelty"
- **Issue**: No source material provided
- **Solution**: Upload reference material for novelty comparison

### Bloom Levels Seem Incorrect
- **Issue**: AI misclassifies problem difficulty
- **Solution**: Mock AI uses regex patterns; provide explicit problem structure (numbered list, clear questions)

### Prior Knowledge Flags Too Aggressive
- **Issue**: Too many problems flagged as requiring external knowledge
- **Solution**: Ensure source material comprehensively covers topic; check vocabulary matches

---

## See Also

- [Assessment Template System](ASSESSMENT_TEMPLATE_SYSTEM_GUIDE.md)
- [Page Break Prevention](PAGE_BREAK_PREVENTION_IMPLEMENTATION.md)
- [Student Simulation Engine](src/agents/simulation/simulateStudents.ts)
- [Bloom's Taxonomy Reference](src/agents/analysis/types.ts)
