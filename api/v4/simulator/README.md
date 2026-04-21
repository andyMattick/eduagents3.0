# Option D Simulation 2.1 — System Specification

**Last updated:** April 2026  
**Owner:** Simulation & Instructional Intelligence

---

## Overview

Option D Simulation 2.1 is the unified, deterministic simulation engine used
across TeacherStudio. It replaces all Gemini-based measurables and all legacy
cognitive/reading/vocab metrics with a single, transparent, teacher-friendly
metric:

### Linguistic Load (0–1)

A composite score combining:

- Vocabulary difficulty (syllable-based)
- Average word length

This metric is used to compute:

- **Cumulative linguistic load** — effort accumulation across the worksheet
- **Confusion score**
- **Steps** (normalized)
- **Time** (normalized)
- **Vocabulary heatmap** (level 1 / 2 / 3 word counts per item)

All metrics are normalized to **0–1** for consistent charting.

---

## Pipeline

```
PDF upload
    ↓
Azure OCR (paragraphs, text blocks, reading order)
    ↓
Hybrid segmentation (paragraph + whitespace + numbering + layout cues)
    ↓
Local measurables (per segment — no Gemini)
    ↓
Shortcircuit simulation
    ↓
Unified chart + vocab heatmap
```

### 1. PDF Upload

Only PDFs are accepted. DOCX and other formats are rejected at the ingestion
boundary (`api/v4-ingest.ts` and `analyzeRegisteredDocument.ts`).

### 2. Azure OCR Extraction

Azure Document Intelligence returns structured layout: paragraphs, pages, and
reading order. Output is normalized in `azureNormalizer.ts` and mapped to the
canonical schema in `structureMapper.ts`.

### 3. Hybrid Segmentation

`hybridSegmenter.ts` segments the worksheet into items using:

- Azure paragraph boundaries
- Blank-line soft boundaries
- Numbered item patterns (`/^\d{1,3}[.)]\s/`, `/^Question\s+\d+/i`)
- Deduplication (80-char prefix match)

Gemini is only called as a fallback when hybrid returns ≤ 1 item (rare).

### 4. Local Measurables

For each segment, `vectorToMeasurables()` in `shared.ts` computes:

| Field | Description |
|---|---|
| `linguisticLoad` | Primary metric — 0.6×vocab + 0.4×wordLength |
| `avgVocabLevel` | Average syllable-based vocab level (1–3) |
| `avgWordLength` | Average word character length |
| `vocabCounts` | `{ level1, level2, level3 }` word counts |
| `misconceptionRisk` | Max misconception trigger score (0–1) |
| `distractorDensity` | Distractor density from semantic vector (0–1) |
| `steps` | Estimated reasoning steps (integer) |
| `timeToProcessSeconds` | Estimated processing time in seconds |
| `wordCount` | Word count of the segment |
| `confusionScore` | Weighted composite confusion score (0–1) |

### 5. Simulation

`POST /api/v4/simulator/shortcircuit` — the only simulation route.

Runs synchronously:
1. Fetch session documents from Supabase
2. Build azure extract via `buildAzureExtractFromRow`
3. Hybrid segment
4. Run semantic pipeline per segment
5. Compute measurables
6. Return `{ rawItems, items: ShortCircuitItem[] }`

### 6. Visualization

`ShortCircuitGraph.tsx` — single unified chart with selectable series:

- Toggle buttons for each series
- Per-item description shown when exactly one series is selected
- Stacked bar vocab heatmap below

---

## Metric Definitions

### Linguistic Load (0–1)

```
linguisticLoad =
  0.6 × normalizeVocab(avgVocabLevel)
+ 0.4 × normalizeAvgWordLength(avgWordLength)

normalizeVocab(level)    = (level - 1) / 2     // 1–3 → 0–1
normalizeWordLength(len) = min(len / 10, 1)    // 10+ chars = max
```

### Vocabulary Level (syllable-based)

| Syllables | Level | Label |
|---|---|---|
| 1 | 1 | Easy |
| 2 | 2 | Moderate |
| 3+ | 3 | Difficult |

Computed by `computeVocabStats(text)` in `shared.ts`.

### Cumulative Linguistic Load

Running sum of `linguisticLoad` across items. Visualizes how linguistic burden
builds across the worksheet — a rising slope means increasing student effort.

### Confusion Score (0–1)

```
confusionScore =
  0.40 × linguisticLoad
+ 0.20 × distractorDensity
+ 0.15 × stepsNorm        // min(steps / 5, 1)
+ 0.15 × misconceptionRisk
+ 0.10 × timeNorm         // min(timeToProcessSeconds / 30, 1)
```

### Steps (normalized 0–1)

| Raw steps | Normalized |
|---|---|
| 1 | 0.1 |
| 2–3 | 0.3 |
| 4–5 | 0.6 |
| > 5 | 1.0 |

### Time (normalized 0–1)

| Processing time | Normalized |
|---|---|
| ≤ 1 min | 0.2 |
| ≤ 2 min | 0.4 |
| ≤ 3 min | 0.6 |
| ≤ 4 min | 0.8 |
| > 4 min | 1.0 |

---

## Removed Metrics

These no longer exist anywhere in the codebase (backend, types, or UI):

| Removed | Replaced by |
|---|---|
| `cognitiveLoad` | `linguisticLoad` |
| `readingLoad` | `linguisticLoad` |
| `vocabularyDifficulty` | `avgVocabLevel` + `vocabCounts` |

---

## Active Routes

| Route | Purpose |
|---|---|
| `POST /api/v4/simulator/shortcircuit` | Run simulation, return measurables |
| `POST /api/v4/simulator/debug/segmentation` | Inspect raw vs hybrid segments |

### Removed Routes

- `/simulate-experience`
- `/compare-profiles`
- `/preparedness`

---

## Key Files

| File | Purpose |
|---|---|
| `shared.ts` | `vectorToMeasurables`, `computeVocabStats`, `computeConfusionScore`, `hybridSegment`, `segmentText`, `buildAzureExtractFromRow` |
| `shortcircuit.ts` | Route handler + `ShortCircuitItem` type |
| `../../src/components_new/v4/ShortCircuitGraph.tsx` | Unified chart (line + vocab heatmap) |
| `../../src/components_new/v4/ShortCircuitPage.tsx` | Page wrapper |
| `../../src/prism-v4/semantic/segment/hybridSegmenter.ts` | Deterministic Azure-layout segmenter |
| `../../lib/supabase.ts` | Supabase REST client |
