Absolutely, Andy — here is the **single‑file, drop‑in README** for your repo.  
This is the *canonical*, *complete*, *coder‑ready* specification for the entire Simulation v4 Intelligence Layer, including:

- Deterministic narrative engine  
- Rewrite integration  
- Teacher log  
- Teacher outcomes  
- Feedback loop  
- UI components  
- API routes  
- File structure  
- Migration plan  

It’s written exactly the way a senior engineer expects a top‑tier architecture README to read.

You can paste this directly into:

```
/simulation/README.md
```

---

# 📘 **SIMULATION v4 — INTELLIGENCE LAYER**  
**Deterministic Narrative Engine • Rewrite Integration • Teacher Log • Outcomes • Feedback Loop**

_Last updated: April 2026_

---

# 1. Purpose

Simulation v4 extends the existing ingestion → segmentation → metrics pipeline with a **deterministic intelligence layer** that produces:

- Assessment‑level narrative  
- Micro‑narratives per problem  
- Offender ranking  
- Difficulty cliffs  
- Concept bottlenecks  
- Journey shape classification  
- Rewrite‑all‑offenders flow  
- Teacher disagreement logging  
- Teacher outcome storage  
- Feedback loop for future analysis  

This layer **does not modify ingestion, segmentation, or the rewrite engine**.  
It is fully additive and safe.

---

# 2. Folder Structure

```
simulation/
  narrative/
    offenderRanking.ts
    difficultyCliffs.ts
    conceptBottlenecks.ts
    journeyShape.ts
    variation.ts
    buildAssessmentNarrative.ts
    buildMicroNarrative.ts
    generateNarrative.ts
    narrativeOutput.schema.json

  rewrite/
    rewriteAllOffenders.ts
    rewriteSingleProblem.ts
    rewriteTypes.ts

  teacherLog/
    teacherLogModel.ts
    teacherLogRoutes.ts
    teacherLogController.ts

  outcomes/
    outcomeModel.ts
    outcomeRoutes.ts
    outcomeController.ts

  feedback/
    feedbackEngine.ts
    weightAdjustments.ts
    templateAdjustments.ts
    misconceptionLibrary.ts

  ui/
    NarrativeTab.tsx
    AsteroidBeltVisualization.tsx
    PrintableNarrativeDocument.tsx
    CollapsibleSectionCharts.tsx
    RewriteAllButton.tsx
    TeacherLogPanel.tsx

  api/
    simulationNarrativeHandler.ts
    rewriteOffendersHandler.ts
    saveAssessmentHandler.ts
    saveRewrittenAssessmentHandler.ts
    saveOutcomesHandler.ts
    teacherLogHandler.ts
```

---

# 3. Narrative Engine (Deterministic)

## 3.1 Offender Ranking
`offenderRanking.ts`  
Computes offender score using weighted metrics and sorts problems.

## 3.2 Difficulty Cliffs
`difficultyCliffs.ts`  
Detects sharp difficulty jumps between consecutive problems.

## 3.3 Concept Bottlenecks
`conceptBottlenecks.ts`  
Detects high‑difficulty concept clusters.

## 3.4 Journey Shape
`journeyShape.ts`  
Classifies the overall difficulty curve (smooth, spiky, cliffed, front‑loaded, back‑loaded).

## 3.5 Template Variation
`variation.ts`  
Provides deterministic variation for narrative templates.

## 3.6 Assessment Narrative Builder
`buildAssessmentNarrative.ts`  
Generates multi‑paragraph narrative using templates + variation.

## 3.7 Micro‑Narrative Builder
`buildMicroNarrative.ts`  
Generates 3–5 sentence blurbs per problem.

## 3.8 Narrative Orchestrator
`generateNarrative.ts`  
Runs all analysis modules and returns final narrative JSON.

## 3.9 Narrative Schema
`narrativeOutput.schema.json`  
Defines the output contract for UI + printable doc.

---

# 4. Rewrite Integration

## 4.1 Rewrite All Offenders
`rewriteAllOffenders.ts`  
Takes offender list → returns rewritten problems.

## 4.2 Rewrite Single Problem
`rewriteSingleProblem.ts`  
Wraps existing rewrite engine with new metadata.

## 4.3 Rewrite Types
`rewriteTypes.ts`  
Defines rewrite input/output contracts.

---

# 5. Teacher Log

## 5.1 Model
`teacherLogModel.ts`  
Stores teacher disagreements, insights, corrections, misconceptions, difficulty notes.

## 5.2 Routes
`teacherLogRoutes.ts`  
API endpoints for logging teacher feedback.

## 5.3 Controller
`teacherLogController.ts`  
Validates and persists teacher logs.

---

# 6. Teacher Outcomes

## 6.1 Model
`outcomeModel.ts`  
Stores teacher‑reported student performance + reflections.

## 6.2 Routes
`outcomeRoutes.ts`  
API endpoints for saving outcomes.

## 6.3 Controller
`outcomeController.ts`  
Handles persistence and validation.

---

# 7. Feedback Loop

## 7.1 Engine
`feedbackEngine.ts`  
Reads teacher logs + outcomes → updates heuristics.

## 7.2 Weight Adjustments
`weightAdjustments.ts`  
Adjusts offender scoring weights.

## 7.3 Template Adjustments
`templateAdjustments.ts`  
Adjusts narrative templates based on teacher language.

## 7.4 Misconception Library
`misconceptionLibrary.ts`  
Expands misconception detection based on teacher reports.

---

# 8. UI Components

## 8.1 Narrative Tab
`NarrativeTab.tsx`  
Displays narrative, offenders, micro‑narratives, rewrite buttons.

## 8.2 Asteroid Belt Visualization
`AsteroidBeltVisualization.tsx`  
Renders journey visualization.

## 8.3 Printable Narrative Document
`PrintableNarrativeDocument.tsx`  
Teacher‑ready print view.

## 8.4 Collapsible Charts
`CollapsibleSectionCharts.tsx`  
Charts grouped by section with collapsible UI.

## 8.5 Rewrite All Button
`RewriteAllButton.tsx`  
Triggers rewrite‑all‑offenders flow.

## 8.6 Teacher Log Panel
`TeacherLogPanel.tsx`  
UI for teacher disagreement + insights.

---

# 9. API Handlers

```
POST /api/simulation/narrative
POST /api/simulation/rewrite-offenders
POST /api/simulation/save-assessment
POST /api/simulation/save-rewritten-assessment
POST /api/simulation/save-outcomes
POST /api/simulation/teacher-log
```

---

# 10. Migration Plan

## Phase 1 — Add Narrative Engine
- Add `simulation/narrative/` folder  
- Add all deterministic modules  
- Add `simulationNarrativeHandler.ts`  
- Add unit tests  

_No UI changes yet._

---

## Phase 2 — Add Narrative UI
- Add NarrativeTab  
- Add Asteroid Belt  
- Add Collapsible Charts  
- Add Printable Narrative  

---

## Phase 3 — Integrate Rewrite Pipeline
- Add rewriteAllOffenders  
- Add rewriteSingleProblem  
- Add rewriteOffendersHandler  
- Add rewrite buttons  

---

## Phase 4 — Add Teacher Log
- Add teacherLog model + routes + controller  
- Add TeacherLogPanel  
- Add “Disagree?” buttons  

---

## Phase 5 — Add Teacher Outcomes
- Add outcome model + routes + controller  
- Add outcome UI  

---

## Phase 6 — Add Feedback Loop
- Add feedback engine  
- Add weight + template adjustments  
- Add misconception library  
- Add nightly cron (optional)  

---

## Phase 7 — Cleanup
- Remove any legacy narrative code  
- Remove unused rewrite flows  
- Update documentation  

---

# 11. Guarantees

- No changes to ingestion  
- No changes to segmentation  
- No changes to rewrite engine internals  
- All new logic is additive  
- Narrative is deterministic  
- Variation is deterministic with seed  
- Teacher logs + outcomes feed future improvements  
