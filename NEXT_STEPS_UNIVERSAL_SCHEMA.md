# Next Steps: Completing Universal Schema Refactoring

## Current Status
- ✅ **4 of 6 core files refactored and compiling**
- ✅ **Core architecture universal and subject-agnostic**
- ⏳ **3 files with minor errors need cleanup**
- ⏳ **Subject profile system ready to be implemented**

## Phase 2: Quick Cleanup (2-3 hours)

### Priority 1: Fix diagnosticScorer.ts (7 errors)
**File**: `/workspaces/eduagents3.0/src/agents/analysis/diagnosticScorer.ts`

**Changes needed**:
```typescript
// 1. Remove dead imports
- import { ProblemAnalysis, TopicTag } from './diagnosticTypes';

// 2. Update function signature
- export function scoreSectionDiagnostics(
-   sectionId: string,
-   title: string | undefined,
-   problemAnalyses: ProblemAnalysis[],
+ export function scoreSectionDiagnostics(
+   sectionId: string,
+   title: string | undefined,
+   problems: UniversalProblem[],

// 3. Update internal loops
- for (const analysis of problemAnalyses) {
+ for (const problem of problems) {
-   bloomCounts[analysis.bloom.level]++;
+   bloomCounts[problem.cognitive.bloomsLevel]++;

// 4. Fix type errors
- const typeSet = new Set<ProblemType>(
+ const typeSet = new Set<string>(
-   problemAnalyses.map(a => a.type)
+   problems.map(p => p.classification.problemType).filter(Boolean)

// 5. Fix field name mismatches  
- mostTestedTopicCount → mostTestedCount
- leastTestedTopicCount → leastTestedCount
```

**Effort**: ~2 hours

### Priority 2: Fix structureParser.ts (3 warnings)
**File**: `/workspaces/eduagents3.0/src/agents/analysis/structureParser.ts`

**Changes needed**:
```typescript
// 1. Remove unused import
- import { SubPart } from './diagnosticTypes';  // Remove this line

// 2. Remove unused parameter
- function isSectionHeader(line: TextLine, nextLine: TextLine | null, baselineSpacing: number)
+ function isSectionHeader(line: TextLine, nextLine: TextLine | null)

// 3. Remove non-existent property from Problem objects (appears 2x)
  const problem: Problem = {
    // ... other fields ...
-   hasNestedStructure: false,
  };

// 4. Remove non-existent property from detection metadata
  return {
    sections: structure,
    totalProblems,
    totalSubparts,
    numberingStyles,
    detectionMetadata: {
      usesFormatting,
      usesNumbering,
      usesSpacing,
      confidence,
-     usesImperativeVerbs: inferredProblems > 0,  // Remove this
    },
  };
```

**Effort**: ~30 minutes

### Priority 3: Update Examples & Tests
**File**: `/workspaces/eduagents3.0/src/agents/analysis/diagnosticsEngineExamples.ts`

**Changes needed**:
```typescript
// 1. Fix import
- import { getProblemAnalysis } from './assessmentDiagnosticsEngine';
+ import { getProblem } from './assessmentDiagnosticsEngine';

// 2. Remove Statistics-specific profile properties
- title: 'Probability & Sampling Distributions Test'  // Remove
+ // Use default or add as separate metadata

// 3. Update property access patterns
- problem.bloom.level → problem.cognitive.bloomsLevel
- problem.proceduralComplexity → problem.cognitive.complexityLevel
- problem.estimatedTimeMinutes → problem.cognitive.estimatedTimeMinutes
- problem.topics → problem.classification.topics

// 4. Add type annotations for arrow functions
- analysis.sectionDiagnostics.map(s => ({
+ analysis.sectionDiagnostics.map((s: SectionDiagnostics) => ({
```

**Effort**: ~1-2 hours

## Phase 3: Create Subject Profiles (1-2 hours)

### Create Profile Directory & Files
```bash
mkdir -p src/agents/analysis/profiles
```

### 1. AP_Statistics.json (Reference implementation)
```json
{
  "subject": "AP_Statistics",
  "displayName": "AP Statistics",
  "version": "1.0",
  "topics": [
    "Mean sampling distribution",
    "Proportion sampling distribution",
    "Standard error",
    "Normal approximation",
    "Success-failure condition",
    "Central limit theorem",
    "Parameter vs statistic",
    "Sampling variability",
    "Sampling bias"
  ],
  "problemTypes": [
    "Vocabulary",
    "Identification",
    "Formula recall",
    "Standard error computation",
    "Probability (mean)",
    "Probability (proportion)",
    "Conceptual explanation",
    "Word problem (procedural)",
    "Multi-step analysis",
    "Essay"
  ],
  "redundancyConfig": {
    "topicFrequencyThresholdPercent": 25,
    "problemTypeRepeatThreshold": 3,
    "allowedBloomLevels": ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
  }
}
```

### 2. EnglishEssay.json (Different domain)
```json
{
  "subject": "English_Essay",
  "displayName": "English Essay Writing",
  "version": "1.0",
  "topics": [
    "Thesis development",
    "Supporting evidence",
    "Counterargument",
    "Grammar & mechanics",
    "Tone & voice",
    "Organization",
    "Rhetorical analysis",
    "Literary analysis",
    "Argument structure"
  ],
  "problemTypes": [
    "Brainstorming",
    "Outline",
    "Draft",
    "Revision",
    "Peer review",
    "Literary analysis prompt",
    "Persuasive prompt",
    "Narrative prompt",
    "Reflective prompt"
  ],
  "redundancyConfig": {
    "topicFrequencyThresholdPercent": 30,
    "problemTypeRepeatThreshold": 2,
    "allowedBloomLevels": ["Understand", "Apply", "Analyze", "Evaluate", "Create"]
  }
}
```

### 3. PythonCS.json (Coding domain)
```json
{
  "subject": "Python_Intro",
  "displayName": "Introduction to Python",
  "version": "1.0",
  "topics": [
    "Variables & data types",
    "Control flow (if/else)",
    "Loops (for/while)",
    "Functions",
    "Lists & dictionaries",
    "String manipulation",
    "File I/O",
    "Error handling",
    "Object-oriented programming"
  ],
  "problemTypes": [
    "Code completion",
    "Bug fixing",
    "Trace execution",
    "Write function",
    "Write program",
    "Multiple choice",
    "Short answer",
    "Debugging lab",
    "Project"
  ],
  "redundancyConfig": {
    "topicFrequencyThresholdPercent": 20,
    "problemTypeRepeatThreshold": 2,
    "allowedBloomLevels": ["Understand", "Apply", "Analyze", "Evaluate", "Create"]
  }
}
```

## Phase 4: Profile Loader System (1 hour)

**Create**: `/workspaces/eduagents3.0/src/agents/analysis/profileLoader.ts`

```typescript
import { SubjectProfile } from './diagnosticTypes';

export async function loadProfile(subjectCode: string): Promise<SubjectProfile | null> {
  try {
    const response = await import(`./profiles/${subjectCode}.json`);
    return response.default;
  } catch (error) {
    console.warn(`Profile not found: ${subjectCode}`);
    return null;
  }
}

export function getAvailableProfiles(): string[] {
  // Return list of available profiles
  return [
    'AP_Statistics',
    'English_Essay',
    'Python_Intro',
    // Add more as created
  ];
}
```

## Phase 5: Integration Testing (1-2 hours)

### Test 1: Statistics Assessment
```typescript
const statsProfile = await loadProfile('AP_Statistics');
const analysis = await analyzeAssessment(statisticsDocument, statsProfile);
// Verify: topics from profile appear in analysis
// Verify: problem types from profile appear in analysis
// Verify: redundancy thresholds applied correctly
```

### Test 2: English Assessment
```typescript
const englishProfile = await loadProfile('English_Essay');
const analysis = await analyzeAssessment(essayDocument, englishProfile);
// Verify: different topic/type sets than Statistics
// Verify: different thresholds applied
```

### Test 3: No Profile (Fallback)
```typescript
const analysis = await analyzeAssessment(document);  // No profile
// Verify: returns cognitive analysis only
// Verify: classification topics/types empty
// Verify: no errors
```

## Code Checklist Before Completion

- [ ] All 6 analysis files compile without errors
- [ ] No TypeScript strict mode warnings
- [ ] No hardcoded subject references in core code
- [ ] No hardcoded topic/type keywords in core code
- [ ] All cognitive functions work for any subject
- [ ] Profile system loads correctly
- [ ] Fallback behavior (no profile) works
- [ ] Examples updated and running
- [ ] Types exported properly
- [ ] None deleted or exported
- [ ] Database schema defined for vector storage
- [ ] Documentation updated

## Tests to Create

### Unit Tests
```
tests/
├── analyzeAssessment.test.ts
├── cognitiveAnalyzer.test.ts
├── frequencyEngine.test.ts
└── profileLoader.test.ts
```

### Integration Tests
```
tests/integration/
├── with_ap_statistics.test.ts
├── with_english_essay.test.ts
├── without_profile.test.ts
└── subject_switching.test.ts
```

## Deployment Checklist

Before merging to main:
1. ✅ All TypeScript compilation with zero errors
2. ✅ All tests passing
3. ✅ No console errors or warnings in examples
4. ✅ Profile system working
5. ✅ Documentation complete
6. ✅ Code review approved
7. ✅ Performance tested (should be same or faster)

## Estimated Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Core refactoring | 4h | ✅ Complete |
| 2 | Fix 3 remaining files | 3-4h | ⏳ Ready |
| 3 | Create 3-5 subject profiles | 1-2h | ⏳ Ready |
| 4 | Profile loader + tests | 1-2h | ⏳ Ready |
| 5 | Integration & validation | 1-2h | ⏳ Ready |
| **Total** | | **10-14h** | **60% Complete** |

## Architecture Validation Summary

After Phase 5, the system will have:
- ✅ Universal cognitive analysis (Bloom, complexity, time)
- ✅ Pluggable subject profiles (topics, types, thresholds)
- ✅ Subject-agnostic core (no hardcoding)
- ✅ Vector-ready storage design
- ✅ Optional profile fallback
- ✅ End-to-end test coverage
- ✅ Production-ready deployment

---

**Next Agent**: Start with Priority 1 (diagnosticScorer.ts fixes), then proceed through phases 2-5 sequentially.
