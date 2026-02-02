# System Architecture & Data Flow

## High-Level Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ASSIGNMENT PIPELINE                         │
└─────────────────────────────────────────────────────────────────┘

STEP 1: INPUT
┌────────────────────────────────────────────────────────────┐
│  AssignmentInput Component                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Mode 1: Type Text  │  Mode 2: Upload File  │        │  │
│  │                                              │ Mode 3 │  │
│  │                                              │ AI Gen │  │
│  │  • TextArea        • Drag & Drop           │ Prompt │  │
│  │  • Paste content   • File validation       │ Builder│  │
│  │                    • .txt/.pdf/.docx       │        │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│                 [Analyze Assignment]                        │
│                         ↓                                    │
└────────────────────────────────────────────────────────────┘
                              ↓
STEP 2: TAG ANALYSIS
┌────────────────────────────────────────────────────────────┐
│  TagAnalysis Component                                     │
│  ┌────────────────────────────────────────────────────┐   │
│  │  [Tag Name]           [Confidence Bar]  [Delete]   │   │
│  │  • comprehensive      ████████░░░░ 82%             │   │
│  │  • evidence-based     ██████░░░░░░░ 65%            │   │
│  │  • strong-transitions ███████████░░ 92%            │   │
│  │  • vague-language     ██░░░░░░░░░░░ 15%            │   │
│  │  ... (10+ more tags)                               │   │
│  │                                                     │   │
│  │  [Peer Teacher Analysis Section]                   │   │
│  │  Strengths | Improvements | Metrics | Feedback     │   │
│  └────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│                  [Simulate Feedback]                       │
│                         ↓                                   │
└────────────────────────────────────────────────────────────┘
                              ↓
STEP 3: STUDENT SIMULATIONS
┌────────────────────────────────────────────────────────────┐
│  StudentSimulations Component                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 👁️ Visual  │  │ 🔬 Critical  │  │ ⚙️  Hands-On │    │
│  │  Learner    │  │  Reader     │  │   Learner    │    │
│  │ ✓ Strength  │  │ ✗ Weakness  │  │ → Suggestion │    │
│  │ "Examples   │  │ "Support    │  │ "How would   │    │
│  │  help me    │  │  claims     │  │  I use       │    │
│  │  visualize" │  │  with data" │  │  this?"      │    │
│  │ Engage: 85% │  │ Engage: 72% │  │ Engage: 78%  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  [... 3 more standard personas ...]                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔍 ACCESSIBILITY & LEARNING PROFILES [▶]          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📖 Dyslexic Learner → [suggestion]                  │   │
│  │    "Break into 2-3 sentence paragraphs..."         │   │
│  │ ⚡ ADHD Learner → [suggestion]                      │   │
│  │    "Add engaging hook in opening..."                │   │
│  │ 👁️  Visual Processing → [strength]                  │   │
│  │    "Great consistent formatting!"                   │   │
│  │ 👂 Auditory Processing → [suggestion]              │   │
│  │    "Add explicit summary section..."                │   │
│  │ 🔢 Dyscalculia → [suggestion]                       │   │
│  │    "Add context when using numbers..."              │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│                  [Rewrite Assignment]                      │
│                         ↓                                   │
└────────────────────────────────────────────────────────────┘
                              ↓
STEP 4: REWRITE RESULTS
┌────────────────────────────────────────────────────────────┐
│  RewriteResults Component                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BEFORE:                      AFTER:                  │  │
│  │ Original assignment text  →  Improved version        │  │
│  │ (highlighted)               (highlighted)            │  │
│  │                                                      │  │
│  │ SUMMARY OF CHANGES:                                  │  │
│  │ • Broke long paragraphs into smaller chunks         │  │
│  │ • Replaced vague language with specific terms       │  │
│  │ • Added more evidence to support claims             │  │
│  │ • Improved transitions between sections             │  │
│  │                                                      │  │
│  │ TIME TO READ: 6 min → 5:30 min (-30 sec)           │  │
│  │ ENGAGEMENT SCORE: 72% → 84% (+12%)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│              [Compare Versions]                            │
│                         ↓                                   │
└────────────────────────────────────────────────────────────┘
                              ↓
STEP 5: VERSION COMPARISON
┌────────────────────────────────────────────────────────────┐
│  VersionComparison Component                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TAG CHANGES:                                        │  │
│  │  • comprehensive    +0.15 ↑ (67% → 82%)             │  │
│  │  • evidence-based   +0.22 ↑ (43% → 65%)             │  │
│  │  • vague-language   -0.18 ↓ (33% → 15%)             │  │
│  │  • critical-thinking +0.12 ↑ (61% → 73%)            │  │
│  │                                                       │  │
│  │  QUALITY METRICS:                                    │  │
│  │  Overall Engagement:    72% → 84% (+12%)            │  │
│  │  Readability Score:     6.2 → 5.8 (-0.4 grade)      │  │
│  │  Avg Sentence Length:   18 words → 15 words         │  │
│  │  Evidence Density:      2 per 100 → 4 per 100       │  │
│  │                                                       │  │
│  │  [ RESET PIPELINE ] [ DOWNLOAD RESULTS ]             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENTS LAYER                           │
│                 (Pure functions, no UI)                      │
└─────────────────────────────────────────────────────────────┘

INPUT TEXT
    ↓
    │
    ├──→ analyzeTags()
    │    └─→ Detects 15+ quality markers
    │       Returns: Tag[] { name, confidenceScore, description }
    │
    ├──→ simulateStudents()
    │    └─→ Generates feedback from 6 personas
    │       Returns: StudentFeedback[] { persona, feedbackType, content, ... }
    │
    ├──→ generateAllAccessibilityFeedback()  [NEW]
    │    └─→ Generates feedback from 5 accessibility profiles
    │       Returns: StudentFeedback[] { persona, feedbackType, content, ... }
    │
    ├──→ rewriteAssignment()
    │    └─→ Suggests improvements to text
    │       Returns: { content, summaryOfChanges, appliedTags[], ... }
    │
    └──→ analyzeVersions()
         └─→ Compares two versions
            Returns: VersionAnalysis { tagChanges[], engagement delta, ... }

┌─────────────────────────────────────────────────────────────┐
│                    UTILITY AGENTS                           │
└─────────────────────────────────────────────────────────────┘

METADATA SYSTEM:
  generateTagsFromMetadata() → [tag, tag, tag, ...]
  generateAssignment() → Full assignment from metadata
  getExamplePrompts() → Teacher examples

FILE PARSING:
  parseUploadedFile() → Delegates to specific parser
    ├─→ parseTextFile() → String
    ├─→ parsePdfFile() → String (pdfjs-dist)
    └─→ parseWordFile() → String (mammoth)

DETAILED ANALYSIS:
  analyzeAssignmentPeerTeacher() → DetailedAnalysis {
    strengths[], improvements[], suggestions[], metrics, ...
  }
```

---

## Component Hierarchy

```
┌──────────────────────────────────────────────────────┐
│              PipelineShell                           │
│  (Main orchestrator, step routing, progress bar)     │
└──────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    [Step 0]       [Step 1-4]      [Error State]
    AssignmentInput  (Different    Error message
                     component     & retry
                     per step)
                        ↓
                ┌───────┴────────┬──────────┬──────────┐
                ↓                ↓          ↓          ↓
            TagAnalysis  StudentSimulations  Rewrite  Comparison
            
            + PeerTeacher + Accessibility + Details + Metrics
              Analysis      Feedback

┌──────────────────────────────────────────────────────┐
│         Component Detail: StudentSimulations         │
│  (Shows all feedback + accessibility profiles)       │
└──────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
    Persona Cards              AccessibilityFeedback
    (6 standard)               (5 profiles, collapsible)
    
    Each card shows:           Each card shows:
    • Persona + emoji          • Profile + icon
    • Feedback type badge      • Feedback type badge
    • Content                  • Detailed feedback
    • Engagement score         • Engagement score
    • Related tags             • Color-coded
```

---

## Data Flow: From Input to Feedback

```
USER INPUT
    │
    ├─ Text Pasted
    │   └─→ State: originalText = "..."
    │
    ├─ File Uploaded
    │   └─→ parseUploadedFile()
    │       └─→ parseTextFile() OR parsePdfFile() OR parseWordFile()
    │           └─→ State: originalText = "..."
    │
    └─ AI Generated
        └─→ PromptBuilder form submitted
            └─→ AssignmentMetadata object
                └─→ generateAssignment(metadata)
                    └─→ State: originalText = "..."

    │
    ↓

ANALYSIS PHASE 1: Tags
    originalText
    └─→ analyzeTags(originalText)
        └─→ [Tag, Tag, Tag, ...]
            └─→ State: tags = [...]
                       currentStep = TAG_ANALYSIS

    │
    ↓

ANALYSIS PHASE 2: Student Feedback
    originalText + tags
    ├─→ simulateStudents(originalText)
    │   └─→ [StudentFeedback, StudentFeedback, ...]
    │
    └─→ generateAllAccessibilityFeedback(originalText)
        └─→ [StudentFeedback, StudentFeedback, ...]
            └─→ State: studentFeedback = [... all feedback ...]
                       currentStep = STUDENT_SIMULATIONS

    │
    ↓

IMPROVEMENT PHASE: Rewrite
    originalText
    └─→ rewriteAssignment(originalText)
        └─→ { content: "improved text", summaryOfChanges: "..." }
            └─→ State: rewrittenText = "..."
                       currentStep = REWRITE_RESULTS

    │
    ↓

COMPARISON PHASE: Metrics
    originalText + rewrittenText
    └─→ analyzeVersions(original, rewritten)
        └─→ VersionAnalysis { tagChanges: [...], deltas: {...} }
            └─→ State: versionAnalysis = {...}
                       currentStep = VERSION_COMPARISON
```

---

## State Management Flow

```
usePipeline Hook (Source of Truth)
│
├─ State:
│  ├─ originalText: string
│  ├─ rewrittenText: string
│  ├─ tags: Tag[]
│  ├─ studentFeedback: StudentFeedback[]
│  ├─ rewrittenTags: Tag[]
│  ├─ tagChanges: TagChange[]
│  ├─ versionAnalysis: VersionAnalysis | null
│  ├─ currentStep: PipelineStep
│  ├─ isLoading: boolean
│  └─ error: string | undefined
│
├─ Callbacks:
│  ├─ analyzeTextAndTags(text) → setState + calls analyzeTags
│  ├─ getFeedback() → setState + calls simulateStudents + accessibility
│  ├─ rewriteTextAndTags() → setState + calls rewriteAssignment
│  ├─ compareVersions() → setState + calls analyzeVersions
│  ├─ nextStep() → Router logic between steps
│  └─ reset() → Clear all state
│
└─ Used by:
   └─ PipelineShell (main consumer)
       ├─ Passes state to step components
       ├─ Calls callbacks on user interaction
       └─ Routes to correct component based on currentStep
```

---

## Type System Architecture

```
src/types/pipeline.ts
│
├─ ENUMS:
│  ├─ PipelineStep { INPUT, TAG_ANALYSIS, STUDENT_SIMULATIONS, ... }
│  ├─ GradeLevel { ELEMENTARY, MIDDLE, HIGH_SCHOOL, ... }
│  ├─ AssignmentType { ESSAY, RESEARCH, ANALYSIS, CREATIVE, ... }
│  └─ DifficultyLevel { BEGINNER, INTERMEDIATE, ADVANCED, EXPERT }
│
├─ INTERFACES:
│  ├─ Tag { name, confidenceScore, description? }
│  ├─ StudentFeedback { 
│  │   studentPersona, feedbackType, content, 
│  │   relevantTags?, engagementScore?,
│  │   specificQuestions?, whatWorked?, whatCouldBeImproved?
│  │ }
│  ├─ TagChange { tag, delta, fromConfidence?, toConfidence? }
│  ├─ AssignmentVersion { content, summaryOfChanges, appliedTags, ... }
│  ├─ VersionAnalysis { tagChanges, engagementScoreDelta, ... }
│  ├─ PipelineState { 
│  │   originalText, tags, studentFeedback, rewrittenText,
│  │   currentStep, isLoading, error, ...
│  │ }
│  └─ AssignmentMetadata { 
│      title, topic, gradeLevel, assignmentType, 
│      learningObjectives, assessmentCriteria, ...
│    }
│
└─ Shared Types:
   ├─ DetailedAnalysis (from peerTeacherAnalysis.ts)
   ├─ AccessibilityProfile (from accessibilityProfiles.ts)
   ├─ EnhancedStudentFeedback (from simulateStudents.ts)
   └─ ReadabilityMetrics (from peerTeacherAnalysis.ts)
```

---

## Accessibility Architecture

```
┌────────────────────────────────────────┐
│   Accessibility Profiles System        │
│   (src/agents/simulation/              │
│    accessibilityProfiles.ts)           │
└────────────────────────────────────────┘
    │
    ├─ ACCESSIBILITY_PROFILES (const dictionary)
    │  ├─ 'dyslexia': { id, name, icon, prefs, strengths }
    │  ├─ 'adhd': { ... }
    │  ├─ 'visual_processing': { ... }
    │  ├─ 'auditory_processing': { ... }
    │  └─ 'dyscalculia': { ... }
    │
    ├─ generateAccessibilityFeedback(text, profileId)
    │  └─→ Analyzes text through ONE profile lens
    │      └─→ Returns StudentFeedback
    │
    └─ generateAllAccessibilityFeedback(text, enabledProfiles?)
       └─→ Analyzes text through ALL profiles
           └─→ Returns StudentFeedback[]

┌────────────────────────────────────────┐
│   Display: AccessibilityFeedback       │
│   Component                            │
│   (src/components/Pipeline/            │
│    AccessibilityFeedback.tsx)          │
└────────────────────────────────────────┘
    │
    ├─ Props: feedback[] + isExpanded?
    │
    ├─ Filters feedback for accessibility personas
    │
    └─ Renders:
       ├─ Collapsible header
       ├─ Grid of accessibility feedback cards
       └─ Helpful accessibility design tip

Integration Point:
    StudentSimulations.tsx
    └─→ Imports & includes <AccessibilityFeedback />
        └─→ Shows accessibility profiles at bottom of Step 3
```

---

## Request/Response Cycle Example

```
USER CLICKS "Analyze Assignment"
│
├─ PipelineShell calls: usePipeline.analyzeTextAndTags(text)
│
├─ usePipeline:
│  ├─ Sets isLoading = true
│  ├─ Calls agents/analysis/analyzeTags(text)
│  │  └─→ Returns Promise<Tag[]>
│  │      (analyzes for 15+ quality markers)
│  │
│  ├─ Receives Tag[] with confidence scores
│  ├─ Updates state: { tags, currentStep: TAG_ANALYSIS }
│  └─ Sets isLoading = false
│
├─ PipelineShell detects currentStep changed
│  └─→ Re-renders with <TagAnalysis /> component
│
├─ TagAnalysis component receives tags as props
│  └─→ Renders confidence bars for each tag
│      └─→ User sees: comprehensive 82%, evidence-based 65%, etc.
│
├─ User clicks "Simulate Feedback"
│
├─ PipelineShell calls: usePipeline.getFeedback()
│
├─ usePipeline:
│  ├─ Sets isLoading = true
│  ├─ Calls agents/simulation/simulateStudents(text)
│  │  └─→ Returns Promise<StudentFeedback[]>
│  │      (generates 6 persona feedbacks)
│  │
│  ├─ Calls agents/simulation/generateAllAccessibilityFeedback(text)
│  │  └─→ Returns StudentFeedback[]
│  │      (generates 5 accessibility feedbacks)
│  │
│  ├─ Combines both arrays into studentFeedback[]
│  ├─ Updates state: { studentFeedback, currentStep: STUDENT_SIMULATIONS }
│  └─ Sets isLoading = false
│
├─ PipelineShell detects currentStep changed
│  └─→ Re-renders with <StudentSimulations /> component
│
├─ StudentSimulations receives feedback as props
│  ├─→ Renders 6 persona feedback cards
│  ├─→ Renders <AccessibilityFeedback /> with 5 profiles
│  └─→ User sees complete feedback ecosystem
│
└─ [Continue with Rewrite and Comparison steps...]
```

---

## File Size & Performance

```
Build Output:
├─ main.js (78 KB gzipped)
│  ├─ React core + pipeline logic
│  ├─ All agents bundled
│  └─ All components bundled
│
├─ Chunk 332 (128.8 KB)
│  └─ Larger modules code-split
│
├─ CSS (263 B)
│  └─ Inline styles (no CSS-in-JS overhead)
│
└─ Total: ~210 KB gzipped

Load Time: <2s on typical connection
Runtime: Agents simulate instantly (no API calls)
Memory: ~5-10 MB in use at peak

Optimization:
• No external UI libraries (small bundle)
• Lazy imports for optional dependencies
• Memoized computations
• Efficient string algorithms
```

---

## Summary

- **Pipeline Steps**: 5 sequential stages
- **Agents**: 7 core analysis functions
- **Components**: 10+ React components
- **Data Types**: 15+ TypeScript interfaces
- **Personas**: 6 standard + 5 accessibility = 11 total
- **Build Size**: 78 KB (main) gzipped
- **Type Safety**: 100% strict TypeScript
- **Dependencies**: React 19 + TypeScript 4.9

All modular, extensible, and production-ready.

