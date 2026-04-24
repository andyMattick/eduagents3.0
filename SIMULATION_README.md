Absolutely — and now that we’ve aligned on the Simulator as the **single intelligence engine**, I can rewrite the README so it reflects the *real* architecture, the *real* future of the platform, and the *real* story you want to tell.

Below is a **clean, authoritative, repo‑ready README** for:

- Simulation v4  
- Prep/Test alignment  
- Rewrite integration  
- Teacher feedback  
- Compare deprecation  
- Azure OpenAI usage  
- Deterministic intelligence  

It’s written the way a senior engineer expects a top‑tier architecture doc to read — crisp, structured, and operational.

You can drop this directly into:

```
/simulation/README.md
```

---

# 📘 **SIMULATION v4 — INSTRUCTIONAL INTELLIGENCE ENGINE**  
**Deterministic Profiles • Prep/Test Alignment • Narratives • Rewrites • Teacher Feedback**

_Last updated: April 2026_

---

# 1. Purpose

Simulation v4 is the **single intelligence engine** for the entire platform.  
It replaces all legacy analysis systems (including Compare’s intelligence pipeline) with a unified, deterministic, teacher‑centric architecture.

Simulation v4 provides:

- **Document Profiles**  
  Deterministic concept extraction, difficulty, cognitive load, misconceptions.

- **Prep/Test Alignment**  
  PREP Profile vs TEST Profile → coverage, gaps, difficulty mismatch.

- **Narratives**  
  Deterministic narrative JSON + optional Azure OpenAI polish.

- **Rewrites**  
  Azure OpenAI rewrites for offenders, student‑facing versions, and Compare UI.

- **Teacher Feedback Loop**  
  Teacher disagreement logs + outcomes → heuristic/template refinement.

Compare is now a **thin UI wrapper** over Simulation outputs.

---

# 2. High‑Level Architecture

```
PDF → Ingestion → Segmentation → Simulation Engine → (optional) Azure Rewrites
```

Simulation Engine supports three modes:

### 1. Single‑Doc Simulation  
Produces a **Doc Profile** for any assessment, worksheet, or prep document.

### 2. Prep/Test Alignment  
PREP Profile + TEST Profile → **Alignment Profile**.

### 3. Student Journey Simulation  
Ordered test items → journey shape + narratives.

Azure OpenAI is used **only** for rewrites and narrative polish.

---

# 3. Folder Structure

```
simulation/
  core/
  profiles/
  alignment/
  narrative/
  rewrite/
  teacherLog/
  outcomes/
  feedback/
  ui/
  api/
```

Each folder is described below.

---

# 4. Core Pipeline

## 4.1 Ingestion (`core/ingest.ts`)
- Uses Azure Document Intelligence (Layout).  
- Extracts pages, lines, tables, math, and structural metadata.

## 4.2 Segmentation (`core/segment.ts`)
- Deterministic rules to group blocks into segments (questions, stems, parts).  
- Output: `Segment[]` with `id`, `order`, `text`, `type`, etc.

## 4.3 Metrics (`core/metrics.ts`)
Per segment:
- token count  
- numeric density  
- symbol density  
- sentence count  
- step indicators (“then”, “next”, etc.)

---

# 5. Doc Profiles (Single‑Doc Simulation)

## 5.1 Concept Extraction (`profiles/conceptExtractor.ts`)
Deterministic, subject‑agnostic extraction:
- noun phrases  
- operation verbs  
- math/stat keywords  
- numeric concepts  
- normalization + clustering  

## 5.2 Concept Graph (`profiles/conceptGraph.ts`)
- Clusters related concepts  
- Builds prerequisite graph (heuristic)

## 5.3 Difficulty Engine (`profiles/difficultyEngine.ts`)
Difficulty 1–5:
- 1: recall  
- 2: simple computation  
- 3: multi‑step  
- 4: abstraction  
- 5: multi‑concept integration  

Uses metrics + concept count.

## 5.4 Cognitive Load Engine (`profiles/cognitiveLoadEngine.ts`)
Classifies intrinsic, extraneous, and germane load.

## 5.5 Misconception Engine (`profiles/misconceptionEngine.ts`)
Pattern‑based detection using `misconceptionLibrary.ts`.

## 5.6 Doc Profile Builder (`profiles/docProfile.ts`)
Combines all above into:

```ts
interface DocProfile {
  docId: string;
  segments: SegmentProfile[];
  conceptGraph: ConceptGraph;
}
```

Schema: `docProfile.schema.json`.

---

# 6. Prep/Test Alignment

## 6.1 Alignment Engine (`alignment/alignmentEngine.ts`)
Input:
- `prepProfile: DocProfile`
- `testProfile: DocProfile`

Steps:
1. **Concept coverage**  
2. **Difficulty comparison**  
3. **Concept gap extraction**  
4. **Aggregate stats**

## 6.2 Alignment Profile (`alignment/alignmentProfile.ts`)
Output:

```ts
interface AlignmentProfile {
  prepDocId: string;
  testDocId: string;
  items: AlignmentItem[];
  summary: AlignmentSummary;
}
```

Schema: `alignmentProfile.schema.json`.

Compare UI now consumes this profile.

---

# 7. Narrative Engine (Deterministic)

Modules:
- `offenderRanking.ts`  
- `difficultyCliffs.ts`  
- `conceptBottlenecks.ts`  
- `journeyShape.ts`  
- `variation.ts`  
- `buildAssessmentNarrative.ts`  
- `buildMicroNarrative.ts`  
- `generateNarrative.ts`  

Output schema: `narrativeOutput.schema.json`.

Azure OpenAI is used **only** to polish the deterministic narrative.

---

# 8. Rewrite Integration (Azure OpenAI Only)

## 8.1 Azure Client (`rewrite/azureClient.ts`)
Wraps Azure OpenAI Chat Completions.

## 8.2 Rewrite Types (`rewrite/rewriteTypes.ts`)
Defines input/output contracts.

## 8.3 Rewrite Flows
- `rewriteAllOffenders.ts`  
- `rewriteSingleProblem.ts`  
- `rewriteWithAzure.ts`  

Used by:
- Simulation  
- Compare (rewrite only)

---

# 9. Teacher Log

Stores teacher disagreements and insights.

- `teacherLogModel.ts`  
- `teacherLogRoutes.ts`  
- `teacherLogController.ts`

---

# 10. Teacher Outcomes

Stores real classroom results.

- `outcomeModel.ts`  
- `outcomeRoutes.ts`  
- `outcomeController.ts`

---

# 11. Feedback Loop

Offline refinement engine:

- `feedbackEngine.ts`  
- `weightAdjustments.ts`  
- `templateAdjustments.ts`  
- `misconceptionLibrary.ts`

Uses teacher logs + outcomes to improve heuristics.

---

# 12. UI

## 12.1 SimulationShell
Tabs:
- Profile  
- Narrative  
- Alignment (when PREP + TEST provided)  
- Rewrite  
- Teacher Log  

## 12.2 Compare UI
Now a thin wrapper:
- Calls `/api/simulation/prep-test`  
- Displays `AlignmentProfile`  
- Uses rewrite flows  

No independent intelligence.

---

# 13. API Routes

```
POST /api/simulation/doc
POST /api/simulation/prep-test
POST /api/simulation/narrative
POST /api/simulation/rewrite-offenders
POST /api/simulation/save-assessment
POST /api/simulation/save-rewritten-assessment
POST /api/simulation/save-outcomes
POST /api/simulation/teacher-log
```

---

# 14. Migration Plan

## Phase 0 — Disable Compare Intelligence
- Remove legacy Compare backend logic  
- Keep UI, point it to Simulation  

## Phase 1 — Doc Profiles  
## Phase 2 — Prep/Test Alignment  
## Phase 3 — Narrative Integration  
## Phase 4 — Azure Rewrites  
## Phase 5 — Teacher Log  
## Phase 6 — Outcomes  
## Phase 7 — Feedback Loop  
## Phase 8 — Cleanup (remove Gemini, legacy Compare code)

---

# 15. Guarantees

- Ingestion + segmentation unchanged  
- All analysis deterministic  
- Azure OpenAI used only for rewrites + narrative polish  
- Simulator is the **single intelligence engine**  
- Compare is a **view + rewrite layer**  

