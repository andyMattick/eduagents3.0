# Phase 1 Parser: MVP Limitations & Phase 2 Roadmap

## Overview

The current document parsing in **Phase 1** is a **temporary MVP implementation**. It extracts problems, metadata, and structure for pipeline validation, but has intentional limitations that will be addressed by Claude AI in Phase 2.

---

## ✅ What MVP Parser Does Well

- Detects simple section headers (`Part A:`, `Part B:`, `Chapter 1:`, etc.)
- Estimates problem count from line breaks and question markers (`?`, numbered lists)
- Extracts basic Bloom's taxonomy classifications
- Calculates linguistic complexity (word count, sentence length)
- Computes novelty scores (basic cosine similarity)
- Generates Asteroid metadata compatible with downstream pipeline

---

## ⚠️ Known MVP Limitations

### 1. **Multipart Questions**
- **Current**: Treats `1a` and `1b` as separate problems
- **Should be**: One problem with 2 subparts
- **Impact**: Inflates problem count, breaks coherence
- **AI improvement**: Semantic understanding of question dependencies

### 2. **Complex Document Structures**
- **Current**: Works with markdown and simple text headers only
- **Missing**: Tables, matrices, structured diagrams, formatted lists
- **Impact**: Loses content from formatted documents (PDFs with tables)
- **AI improvement**: Vision + text understanding of layouts

### 3. **Question Type Detection**
- **Current**: Simple regex patterns (multiple choice indicators, essay keywords)
- **Reliability**: ~70%
- **AI improvement**: ~95%+ accuracy with semantic understanding

### 4. **Novelty Scoring**
- **Current**: Cosine similarity across all document problems only
- **Limitation**: Doesn't compare to historical problem databases
- **AI improvement**: Compare against corpus of educational materials

### 5. **Context Awareness**
- **Current**: Processes each problem in isolation
- **Limitation**: Misses hints, examples, or instructions appearing earlier in document
- **AI improvement**: Full document context for each problem

### 6. **Linguistic Complexity**
- **Current**: Flesch-Kincaid (word + sentence length)
- **Limitation**: Doesn't account for domain-specific vocabulary, pedagogical intent
- **AI improvement**: Contextual language complexity scoring

---

## 🎯 Current Expected Performance

| Document Type | Success Rate | Notes |
|---|---|---|
| Well-formatted plain text | 90% | Clear sections, numbered problems |
| Educational PDFs (simple) | 70% | May miss tables, diagrams |
| Microsoft Word documents | 75% | Extracted as text, layout lost |
| Complex/formatted materials | 40% | Tables, matrices, diagrams lost |

---

## 📝 Testing Guidelines for MVP

To get the best results from the Phase 1 parser:

1. **Use well-formatted documents** with clear section headers
2. **Keep multipart questions structured clearly** (or split into separate problems for now)
3. **Avoid tables** — convert to text if possible
4. **Number problems explicitly** (Question 1:, Question 2:, etc.)
5. **Include markdown headers** if possible (`# Part A`, `## Problem 1`)

---

## 🤖 Phase 2: Claude API Replacement

When AI-powered parsing is integrated, the following will improve:

```
Current MVP Flow:
  Raw Text → Regex/Heuristics → DocumentStructure → Asteroids

Phase 2 Flow:
  Raw Text → Claude Vision API → DocumentStructure → Asteroids
                    ↓
              (same data types)
```

### API Swap Details
- **Input types stay the same**: `parseDocumentStructure(text, options)`
- **Output types stay the same**: `DocumentStructure` interface
- **No pipeline changes needed**: Swap parser implementation only
- **Expected improvements**:
  - Multipart question handling: 95%+ vs 60%
  - Novelty across document sets: 98%+ vs 70%
  - Context awareness: Full vs local

---

## 🔧 How to Replace MVP Parser

When Claude API is ready:

1. Keep the `parseDocumentStructure()` signature unchanged
2. Add Claude API call inside (same input/output contract)
3. Ensure `DocumentStructure` objects still have:
   - `sections[]` with problems
   - `problems[]` with metadata (Bloom, complexity, novelty)
   - `bloomDistribution` and metrics
4. Run full pipeline tests — no other code should need changes

---

## 📊 Related Files

| File | Purpose |
|---|---|
| `documentStructureParser.ts` | Main MVP parser (to be replaced) |
| `documentPreview.ts` | Quick preview (can also use AI) |
| `types.ts` | `DocumentStructure` interface (keep as-is) |
| `ProblemAnalysis.tsx` | Displays parsed results (unchanged) |

---

## 💡 Notes for Development

- This is **intentionally temporary** — not technical debt
- Team knows AI will replace this layer
- Focus now is on **pipeline validation** with whatever data parsing provides
- Can test full workflow end-to-end with mvp results
- Real improvements come once Claude API is integrated

---

**Last Updated**: February 2026  
**Status**: MVP Active / Phase 2 Planned
