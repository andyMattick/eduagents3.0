# 📋 Assignment Generation Instructions - Implementation Guide

## Overview

The assignment generation system now uses **professional, standards-aligned instructions** that ensure high-quality output aligned with educational best practices.

## Key Components

### 1. **AssignmentGenerationContext** Interface
Provides structured context for all assignment operations:

```typescript
interface AssignmentGenerationContext {
  assessmentType: 'formative' | 'summative';
  gradeLevel: string;
  subject: string;
  timeConstraint?: string;        // e.g., "30 minutes"
  cognitiveRigor?: string;        // e.g., "Analyze (Bloom's Level 4)"
  assignmentFormat?: string;      // e.g., "project-based"
  sourceDocuments?: string[];
  notes?: string[];               // Teacher notes to incorporate
  previousFeedback?: string[];    // Feedback from prior iterations
}
```

### 2. **System Instruction Functions**

#### `buildAssignmentGenerationInstruction(context)`
Creates a comprehensive system prompt that:
- Forces the AI to review source materials
- Incorporates teacher NOTES and feedback
- Aligns with assessment type and cognitive rigor
- Specifies professional output format

**Example Usage:**
```typescript
const instruction = buildAssignmentGenerationInstruction({
  assessmentType: 'summative',
  gradeLevel: '9-10',
  subject: 'Biology',
  cognitiveRigor: 'Analyze (Bloom\'s Level 4)',
  notes: [
    'Focus on photosynthesis',
    'Include real-world applications',
    'Avoid overly technical vocabulary'
  ]
});
```

#### `buildAssignmentAnalysisInstruction(context)`
Creates a prompt for analyzing existing assignments against standards.

#### `buildAssignmentRevisionInstruction(context, feedback)`
Creates a prompt for revising assignments based on feedback.

### 3. **Context-Aware Generation**

```typescript
// In your component
import { generateAssignmentWithContext } from '../../config/aiConfig';

const assignment = await generateAssignmentWithContext({
  assessmentType: 'formative',
  gradeLevel: '6-8',
  subject: 'Mathematics',
  timeConstraint: '45 minutes',
  cognitiveRigor: 'Apply (Bloom\'s Level 3)',
  assignmentFormat: 'mixed (multiple choice + short answer)',
  notes: [
    'Include at least one real-world problem',
    'Target students struggling with fraction operations'
  ]
}, sourceDocumentText);
```

## 📝 Where to Integrate

### 1. **Assignment Intent Form**
Update `AssignmentIntentForm.tsx` to pass context:

```typescript
const context: AssignmentGenerationContext = {
  assessmentType: formData.assessmentType,
  gradeLevel: extractGradeLevel(sourceFile), // Extract from metadata
  subject: formData.subject || 'General',
  timeConstraint: `${formData.estimatedTime} minutes`,
  cognitiveRigor: formData.bloomGoals?.targetLevel,
  sourceDocuments: sourceFile ? [sourceFile.name] : [],
  notes: formData.skillsAndStandards || [],
};

const assignment = await generateAssignmentWithContext(context, sourceFileContent);
```

### 2. **Assignment Analysis Component**
When analyzing assignments:

```typescript
const analysisPrompt = buildAssignmentAnalysisInstruction({
  assessmentType: assignment.assessmentType,
  gradeLevel: assignment.gradeLevel,
  subject: assignment.subject,
  cognitiveRigor: assignment.metadata?.targetBloomLevel,
});
```

### 3. **Revision/Feedback Loop**
When incorporating feedback:

```typescript
const revisionPrompt = buildAssignmentRevisionInstruction(context, [
  'Add more diverse question types',
  'Simplify instructions for ELL students',
  'Include extension for advanced learners'
]);
```

## 🎯 Key Features

✅ **Standards-Aligned** - Always considers cognitive rigor and assessment type

✅ **Feedback-Driven** - Explicitly incorporates notes and prior revisions

✅ **Actionable Output** - Generates professional, classroom-ready assignments

✅ **Professional Format** - Uses headings, bullet points, rubrics, and clear structure

✅ **Graded Appropriately** - Maintains age-appropriate language throughout

✅ **Verifiable Quality** - Output includes success criteria and measurable outcomes

## 🚀 Next Steps

1. **Update AssignmentIntentForm.tsx** to capture and pass context
2. **Update AI generation calls** to use `generateAssignmentWithContext()`
3. **Add notes/feedback fields** to the UI for teacher input
4. **Test end-to-end** with real source materials and feedback

## 📚 References

- Bloom's Taxonomy: https://www.adb.org/documents/blooms-taxonomy-learning-outcomes
- Standards Alignment: Review your specific state/national standards (CCSS, NGSS, etc.)
- Assessment Design: Wiggins & McTighe (Understanding by Design)

