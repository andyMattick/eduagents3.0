# eduagents3.0

**Transform static educational assessments into dynamic, multidimensional simulations.**

eduagents3.0 is an intelligent assessment platform that helps teachers author better assignments by analyzing them through the lens of diverse student personas. Using deterministic simulation and math-driven diagnostics, it produces actionable insights and intelligent rewrites.

## 🎯 Core Philosophy

- **Problem-centric tagging**: Every problem is decomposed with Bloom's taxonomy, linguistic complexity, and novelty scores
- **Learner profiling**: Students represented as personas with accessibility overlays and trait profiles  
- **Simulation-driven feedback**: Rich interactions model realistic student performance
- **Iterative refinement**: Intelligent rewriting based on simulation output

---

## 🏗️ Architecture: Five-Phase Pipeline

### Phase 1: Document Ingestion → Asteroids
Parse PDF, Word, or text files into discrete problems with pedagogical metadata:
- **Bloom Level**: Remember | Understand | Apply | Analyze | Evaluate | Create
- **Linguistic Complexity**: 0.0–1.0 (Flesch-Kincaid based)
- **Novelty Score**: 0.0–1.0 (cosine similarity to previous problems)
- **Multipart Detection**: Whether problem has subparts
- **Estimated Time**: Seconds to complete

**Files**: `src/agents/shared/parseFiles.ts`, `src/agents/analysis/analyzeTags.ts`

### Phase 2: Student Creation → Astronauts  
Define diverse learner personas with accessibility needs:
- **ProfileTraits**: ReadingLevel, MathFluency, AttentionSpan, Confidence (0.0–1.0 each)
- **Overlays**: ADHD, dyslexia, fatigue_sensitivity, visual-learner, etc.
- **NarrativeTags**: Learning characteristics (focused, creative, analytical, etc.)

**Files**: `src/agents/simulation/accessibilityProfiles.ts`, `src/types/simulation.ts`

### Phase 3: Simulation Engine → StudentFeedback
Simulate each (Student, Problem) pair and generate realistic performance metrics:
- **PerceivedSuccess**: 0.0–1.0 based on student traits vs. problem difficulty
- **TimeOnTask**: Seconds estimated from problem attributes and student speed
- **ConfusionSignals**: Integer count of struggle points
- **FatigueIndex**: 0.0–1.0 cumulative from prior problems
- **EngagementScore**: 0.0–1.0 inferred from novelty and success

**Files**: `src/agents/simulation/simulateStudents.ts`, `src/types/simulation.ts`

### Phase 4: Philosopher Diagnostic Engine → Ranked Feedback
The **Philosopher v13** engine (newly integrated) analyzes assignments across 20 synthetic student personas:

1. **Generate Synthetic Students**: 20 personas with diverse profiles and overlays
2. **Simulate Performance**: Run each student through all problems
3. **Aggregate Metrics**: Compute mean (μ) and standard deviation (σ) for each problem
4. **Derive Thresholds**: μ ± σ defines "elevated" and "severe" performance gaps
5. **Detect Clusters**: Find adjacent problems that trigger the same issues (confusion, fatigue, failure, timing, complexity mismatch)
6. **Compute Severity**: Score 0–1 using formula: `magnitude × cluster_weight × impact_weight`
7. **Generate Ranked Feedback**: Sort issues by severity; highest first
8. **Render Visualizations**: 6 SVG charts (pacing, confusion, engagement, bloom, fatigue, success)

**Features**:
- ✅ Fully deterministic (same input = same output)
- ✅ Zero external dependencies
- ✅ Math-driven thresholds (not hardcoded)
- ✅ Identifies problem clusters (not just individual issues)
- ✅ Severity scoring for prioritization
- ✅ Evidence-based recommendations
- ✅ 6 production-grade visualizations

**Files**: `src/agents/analysis/philosopherEngine.ts`, `src/agents/analysis/philosophers.ts`

### Phase 5: Rewriter → Adaptive Assignment
Generate improved version based on Philosopher feedback:
- Adjust Bloom levels (e.g., "Remember" → "Understand")
- Reduce linguistic complexity
- Break up multipart questions
- Improve novelty balance
- Generate accessibility variants

**Files**: `src/agents/rewrite/rewriteAssignment.ts`

---

## 🚀 Key Features

### Teacher Workflow
1. **Upload Assignment**: PDF, Word, or paste text
2. **Analyze Problems**: System extracts 5–30 discrete problems with Bloom tagging
3. **Review Metadata**: Edit grade level, subject, and problem details
4. **Simulate Students**: Run 20 personas through all problems
5. **Get Philosopher Feedback**: Ranked recommendations + 6 visualizations
6. **Accept or Reject**: AI rewrites based on feedback, or export as-is

### Intelligent Analytics
- **Completion Rate**: % of student personas expected to finish on-time
- **Bloom Coverage**: Distribution across cognitive levels
- **At-Risk Detection**: Which personas will struggle
- **Novelty Balance**: Problem repetition analysis
- **Fatigue Prediction**: Cumulative cognitive load by problem

### Accessibility Support
- **ADHD-Friendly**: Shorter tasks, frequent checkpoints
- **Dyslexia-Optimized**: Sans-serif fonts, high contrast
- **Fatigue Sensitivity**: Tracked cumulative load
- **Visual Learner**: Recommended diagrams/charts
- **Custom Overlays**: Define your own accessibility needs

---

## 💻 Tech Stack

**Frontend**:
- React 19 with TypeScript 5.6
- Vite 5 (build tool)
- Recharts (visualizations)
- Supabase Auth (user management)

**Document Processing**:
- pdfjs-dist (PDF parsing)
- mammoth (Word parsing)
- jsPDF (PDF generation)

**Storage**:
- Supabase (PostgreSQL backend)

**Testing**:
- Vitest (unit tests)
- @testing-library/react (component tests)

---

## 🔒 AI API Enforcement & Production Safety

This application implements **strict real AI enforcement** with ZERO mock or fallback modes. Google Generative AI (Gemini) is required for all functionality.

### 5-Step Enforcement Architecture

**Step 1: Remove Silent Fallbacks**
- All mock response defaults eliminated
- Empty AI responses throw explicit errors
- No graceful degradation to templates

**Step 2: Enforce Real AI at Initialization**
- `VITE_GOOGLE_API_KEY` required before app boots
- Application prevents rendering without valid API key
- Explicit error message on startup

**Step 3: Force Failure On Empty Responses**
- All AI calls validate non-empty response text
- Empty responses throw detailed error explaining failure
- No template/default fallbacks

**Step 4: Central AI Wrapper Function**
- Single `callAI()` export from `src/config/aiConfig.ts`
- All API calls pass through this wrapper
- Unified validation and error handling
- No direct Gemini API calls allowed

**Step 5: Real AI Only - No Mock Mode**
- Removed all mock AI implementations
- `getMockAIService()` function eliminated
- `VITE_ENABLE_MOCK_AI` flag deprecated and removed
- Same behavior in development and production

### Environment Variables

**Required (All Environments)**:
```bash
VITE_GOOGLE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
Obtained from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Production vs Development

| Scenario | Behavior |
|----------|----------|
| Any build without `VITE_GOOGLE_API_KEY` | ❌ Error - API key required |
| Development with `VITE_GOOGLE_API_KEY` | ✅ Uses Gemini API (Google Generative AI) |
| Production with `VITE_GOOGLE_API_KEY` | ✅ Uses Gemini API (Google Generative AI) |

### Safety Guarantees

- ✅ **No mock mode**: Real AI only in all builds
- ✅ **No bypasses**: All AI calls routed through `callAI()` wrapper
- ✅ **No fallbacks**: Every AI failure throws explicit error
- ✅ **Type-safe**: Full TypeScript validation end-to-end
- ✅ **Unified behavior**: Development and production are identical

### File References

- **Central wrapper**: [src/config/aiConfig.ts](src/config/aiConfig.ts) – `callAI()` function (line ~120)
- **Service manager**: [src/agents/api/aiService.ts](src/agents/api/aiService.ts) – `AIServiceManager` singleton
- **App initialization**: [src/index.tsx](src/index.tsx) – API key check (line 12)
- **Configuration**: [src/config/aiConfig.ts](src/config/aiConfig.ts) – `getAIConfig()`, `useRealAI()`, `getAIService()`

---

## 🎯 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- **Google API Key** (REQUIRED - Gemini API)

### Installation

```bash
# Clone the repository
git clone https://github.com/andyMattick/eduagents3.0.git
cd eduagents3.0

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# ⚠️  IMPORTANT: Add your Google API key (required for all functionality)
# Edit .env.local and add:
#   VITE_GOOGLE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Get key from: https://aistudio.google.com/app/apikey

# Optional: For development-only mock AI testing
#   VITE_ENABLE_MOCK_AI=true

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

**Note**: Without `VITE_GOOGLE_API_KEY`, the app will not load. A clear error message will appear explaining the requirement.

### Build for Production

```bash
npm run build        # Compile TypeScript and bundle
npm run preview      # Preview production build locally
npm test             # Run test suite
```

**Production Deployment Requirements**:
- ✅ `VITE_GOOGLE_API_KEY` environment variable must be set
- ✅ Application will fail to initialize without valid API key
- ✅ No fallback or mock AI in production builds

---

## 📂 Project Structure

```
src/
├── agents/
│   ├── analysis/              # Bloom classification, tag extraction, Philosopher
│   │   ├── analyzeTags.ts     # Extract pedagogical tags
│   │   └── philosopherEngine.ts  # v13 diagnostic engine (820 lines)
│   ├── simulation/            # Student personas and feedback generation
│   │   ├── simulateStudents.ts
│   │   └── accessibilityProfiles.ts
│   ├── rewrite/              # Assignment rewriting with AI
│   ├── shared/               # Document parsing, metadata inference
│   └── pipelineIntegration.ts # Orchestration
├── components/
│   ├── Pipeline/             # Main 5-step UI workflow
│   │   ├── PipelineShell.tsx  # Router and state management
│   │   ├── PhilosopherReview.tsx  # Feedback display (v13)
│   │   └── PhilosophersVisualsPanel.tsx  # 6 charts
│   ├── Auth/                 # Login/signup
│   └── Admin/                # Teacher dashboard
├── hooks/
│   └── usePipeline.ts        # State management for workflow
├── types/
│   ├── pipeline.ts           # State types
│   ├── simulation.ts         # Asteroid/Astronaut types
│   └── universalPayloads.ts  # UniversalProblem types
├── services/
│   ├── authService.ts        # Supabase Auth
│   ├── teacherSystemService.ts  # Database operations
│   └── teacherNotesService.ts
└── lib/
    └── supabaseClient.ts     # Supabase client initialization
```

---

## 📊 Data Models

### Asteroid (Problem)
```typescript
{
  ProblemId: string,
  ProblemText: string,
  BloomLevel: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  LinguisticComplexity: 0.0–1.0,
  NoveltyScore: 0.0–1.0,
  MultiPart: boolean,
  EstimatedTimeSeconds: number,
  // ... other metadata
}
```

### Astronaut (Student Persona)
```typescript
{
  StudentId: string,
  PersonaName: string,
  Overlays: string[],  // e.g., ["adhd", "dyslexic"]
  ProfileTraits: {
    ReadingLevel: 0.0–1.0,
    MathFluency: 0.0–1.0,
    AttentionSpan: 0.0–1.0,
    Confidence: 0.0–1.0
  }
}
```

### Teacher Feedback (from Philosopher)
```typescript
{
  rankedFeedback: {
    title: string,
    description: string,
    priority: "high" | "medium" | "low",
    affectedProblems: string[],
    recommendation: string,
    estimatedImpact: "high" | "medium" | "low",
    category: string,
    severity: 0.0–1.0
  }[],
  visualizations: {
    pacingChart: string,     // SVG
    confusionHeatmap: string,
    engagementTrend: string,
    bloomMismatch: string,
    fatigueCurve: string,
    successDistribution: string
  }
}
```

---

## 🧙 Philosopher v13 Deep Dive

The Philosopher engine is the heart of the analysis system. It produces deterministic, math-driven feedback:

### The 8-Step Process

1. **generateSyntheticStudents(20)** – Create personas covering a spectrum of learning profiles
2. **simulatePerformance()** – Run each student through all problems
3. **aggregateMetrics()** – Compute success rate, time, confusion for each problem
4. **deriveThresholds()** – Calculate μ ± σ for each metric dynamically
5. **detectClusters()** – Find adjacent problems with elevated metrics (5 cluster types)
6. **computeSeverity()** – Score 0–1: `magnitude × cluster_weight × impact_weight`
7. **generateRankedFeedback()** – Sort by severity; produce evidence + actions
8. **generateVisualizations()** – Render 6 SVG charts

### Key Guarantees

- **Determinism**: Same input → same output, no randomness
- **Type Safety**: Full TypeScript, no `any` types
- **Performance**: <2 seconds for typical assignments (5–30 problems)
- **Fallbacks**: Graceful error handling; never crashes UI
- **Immutability**: No mutations of input problems

### 6 Visualizations

1. **Pacing Chart**: Time distribution across problems
2. **Confusion Heatmap**: Problem × persona struggle map
3. **Engagement Trend**: How engagement evolves through assignment
4. **Bloom Mismatch**: Cognitive load vs. actual Bloom levels
5. **Fatigue Curve**: Cumulative student fatigue buildup
6. **Success Distribution**: Persona success rates across problems

---

## 🔄 Integration Status

### ✅ Completed
- Phase 1: Document ingestion (PDF, Word, text)
- Phase 2: Astronaut creation with overlays
- Phase 3: Simulation engine with StudentFeedback
- **Phase 4: Philosopher v13 diagnostic engine** ← NEW (Feb 13, 2026)
- Phase 5: Rewriter for adaptive assignments
- Authentication (Supabase)
- Problem banking and persistence
- Teacher notes and annotations

### ⏳ In Development
- Advanced analytics dashboard
- Custom learner profile creation UI
- Export formats (PDF, Word, SCORM)
- LMS integrations

---

## 🧪 Testing

### Run Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --ui        # UI for Vitest
```

### Manual Testing Checklist
1. Upload a 5-problem assignment
2. Verify Philosopher runs and generates feedback
3. Check that 6 visualizations render
4. Test Accept → Rewrite flow
5. Test Reject → Export flow

---

## 📋 API Contracts

### Phase 3: Simulation
**Input** (SimulateStudentsPayload):
- `assignmentText`: Raw assignment content
- `asteroids?`: Structured problems (optional)
- `assignmentMetadata`: Grade level, subject
- `selectedStudentTags?`: Filter personas

**Output** (StudentFeedback[]):
```typescript
{
  studentPersona: string,
  timeToCompleteMinutes: number,
  understoodConcepts: string[],
  struggledWith: string[],
  atRiskProfile?: boolean
}
```

### Phase 4: Philosopher Diagnostic
**Input** (PhilosopherPayload):
```typescript
{
  problems: UniversalProblem[],
  generationContext: {
    subject: string,
    gradeBand: string,
    timeTargetMinutes: number
  }
}
```

**Output** (TeacherFeedbackOptions):
```typescript
{
  rankedFeedback: FeedbackItem[],
  visualizations: {
    [key: string]: string  // SVG strings
  },
  metadata: {
    clusterCount: number,
    predictedTotalTime: number,
    overallRiskLevel: "low" | "medium" | "high"
  }
}
```

---

## 🚀 Deployment

### Development
```bash
npm run dev        # Hot-reload dev server on port 5173
```

### Production

```bash
# Build the application
npm run build      # TypeScript compilation + Vite bundling

# Set environment variables in your deployment platform
VITE_GOOGLE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Serve the built app
npm run preview    # Local preview
# OR deploy to your hosting platform (Vercel, Netlify, etc.)
```

**Required Steps**:
1. Generate Google API key from [AI Studio](https://aistudio.google.com/app/apikey)
2. Add `VITE_GOOGLE_API_KEY` to production environment variables
3. Ensure `NODE_ENV=production` is set
4. Deploy to hosting platform
5. Verify app loads without API key errors

**Staging Flow**:
1. Deploy to `staging` branch with valid API key
2. Test for 24 hours
3. Verify no AI failures or timeout issues
4. Promote to `main` branch for production

**Troubleshooting**:
- If app won't load: Check browser console for API key error message
- If AI calls fail: Verify API key is valid and has proper permissions
- If preview fails: Ensure `VITE_GOOGLE_API_KEY` is set in local `.env.local`

---

## 📚 Documentation

- **[PHILOSOPHER_V13_QUICKSTART.md](./PHILOSOPHER_V13_QUICKSTART.md)** – 30-second quick reference
- **[DEPLOYMENT_CHECKLIST_PHILOSOPHER_V13.md](./DEPLOYMENT_CHECKLIST_PHILOSOPHER_V13.md)** – Pre/post deployment steps
- **[INTEGRATION_DEPLOYMENT_SUMMARY.md](./INTEGRATION_DEPLOYMENT_SUMMARY.md)** – Integration summary
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** – Full architecture guide

---

## 🤝 Contributing

1. **Create a branch** from `dev`
2. **Make changes** with TypeScript type safety
3. **Test locally** with `npm test` and `npm run build`
4. **Submit PR** to `dev` for review
5. **Merge to `main`** for production deployment

---

## 📞 Support & Troubleshooting

### Common Issues

**"VITE_GOOGLE_API_KEY missing. Real AI is required..."**
- **Cause**: API key not set in environment
- **Solution**: Add `VITE_GOOGLE_API_KEY` to `.env.local` (development) or deployment settings (production)
- **Where to get key**: https://aistudio.google.com/app/apikey

**"Real AI is not available. VITE_GOOGLE_API_KEY must be set."**
- **Cause**: App initialized without API key
- **Solution**: Set `VITE_GOOGLE_API_KEY` before starting the server

**"No valid AI service configuration. Provide VITE_GOOGLE_API_KEY..."**
- **Cause**: API key not configured
- **Solution**: Add your Google Gemini API key to VITE_GOOGLE_API_KEY environment variable

### General Support

For questions or issues:
1. Check this README for environment setup
2. Review [.github/copilot-instructions.md](./.github/copilot-instructions.md) for architecture
3. Check [PHILOSOPHER_V13_QUICKSTART.md](./PHILOSOPHER_V13_QUICKSTART.md) for feature specifics
4. Verify build with `npm run build`
5. Check browser console (F12) for detailed error messages

---

## 📄 License

Private proprietary software. All rights reserved.

---

**Last Updated**: February 14, 2025  
**Current Version**: 1.0.0-real-ai-only (Philosopher v13 + Real AI Enforced)  
**Status**: Production-ready ✅  

### Recent Changes (Feb 14, 2025)
- ✅ **Removed all mock AI implementations** – `getMockAIService()` and `MockAIService` class eliminated
- ✅ **Eliminated mock environment variables** – `VITE_ENABLE_MOCK_AI` and `VITE_AI_MODE` removed
- ✅ **Simplified AISettings UI** – Removed mock/real toggle, now shows Gemini API status only
- ✅ **Updated all console logs** – No more references to "Mock AI", always shows "Gemini API"
- ✅ **Updated architecture documentation** – Explains real-only enforcement pattern
- ✅ **Updated .env.example** – Only `VITE_GOOGLE_API_KEY` documented as required
```