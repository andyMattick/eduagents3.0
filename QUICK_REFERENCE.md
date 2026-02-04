# Quick Reference: 6-Step Pipeline

## 🎯 Pipeline Steps at a Glance

### Step 1: Upload/Generate
```
📥 Input your assignment
   └─ PDF, Word, or text paste
   └─ Auto-tags problems
   └─ Next: Problem Analysis
```

### Step 2: Problem Analysis ⭐ NEW
```
📊 View problem metadata
   ├─ Bloom Level (Remember → Create)
   ├─ Complexity (0-100%)
   ├─ Novelty (0-100%)
   ├─ Similarity (0-100%)
   ├─ Length (words)
   └─ Structure (single/multi-part)
   
📥 Export Options:
   ├─ JSON: Full structured data
   └─ CSV: Spreadsheet format
   
Next: Class Builder
```

### Step 3: Build Your Class ⭐ NEW
```
👥 Select students for assignment
   ├─ 11 preset personas OR
   └─ Create custom students
   
🎛️ Customize per student:
   ├─ Reading Level (0-100%)
   ├─ Math Fluency (0-100%)
   ├─ Attention Span (0-100%)
   └─ Confidence (0-100%)
   
Optional overlays:
   ├─ ADHD
   ├─ Dyslexic
   ├─ ESL
   ├─ Fatigue-Sensitive
   └─ High-Anxiety
   
Next: Simulations
```

### Step 4: Simulated Feedback
```
📋 Preview: How would your students respond?
   ├─ Per-student feedback
   ├─ Engagement scores
   ├─ Struggle predictions
   └─ Accessibility insights
   
(This is a PREVIEW of what external processor analyzes)

Next: Rewrite
```

### Step 5: Review & Rewrite
```
✏️ AI-improved assignment
   ├─ Original text
   ├─ Rewritten text
   ├─ Summary of changes
   └─ Applied tags
   
(Optional - can skip if satisfied with original)

Next: Export
```

### Step 6: Export ⭐ NEW
```
📥 Download for external processor
   
Options:
   ├─ JSON: {asteroids, classDefinition}
   └─ Text: Human-readable format
   
What's included:
   ├─ All problem metadata (asteroids)
   └─ Your class definition + student traits
   
Send this to your simulation processor!
```

---

## 📊 Quick Key Concepts

### Asteroids = Problems with Metadata
```typescript
{
  id: "problem-1"
  text: "Question text..."
  bloomLevel: "Analyze"      // cognitive level
  complexity: 0.65           // reading difficulty
  novelty: 0.82              // how different from prev
  similarity: 0.15           // overlap with prev
  length: 245                // word count
  multiPart: false           // structure type
}
```

### ClassDefinition = Your Students
```typescript
{
  id: "class-1"
  name: "Period 1 Bio"
  gradeLevel: "9"
  subject: "Biology"
  students: [               // teacher-defined roster
    {
      name: "Visual Learner"
      traits: {
        readingLevel: 0.7,
        mathFluency: 0.5,
        attentionSpan: 0.8,
        confidence: 0.65
      }
    }
  ]
}
```

---

## 🔄 State Management

```
PipelineState
├── originalText: string          // Assignment content
├── asteroids: Asteroid[]         // Extracted problems
├── classDefinition: ClassDefinition // Teacher's class
├── studentFeedback: Feedback[]   // Simulation results
├── rewrittenText: string         // Improved assignment
├── currentStep: PipelineStep     // 0-5 (which step)
└── isLoading: boolean            // Loading state
```

---

## 🎯 File Structure

```
src/components/Pipeline/
├── PipelineShell.tsx          (main container, routing)
├── ProblemAnalysis.tsx        ⭐ NEW (Step 2)
├── ClassBuilder.tsx           ⭐ NEW (Step 3)
├── StudentSimulations.tsx     (Step 4)
├── RewriteResults.tsx         (Step 5)
└── AssignmentInput.tsx        (Step 1)

src/types/
├── pipeline.ts               (all type definitions)
└── simulation.ts             (Asteroid, Astronaut types)

src/hooks/
└── usePipeline.ts            (state + orchestration)
```

---

## 📈 Metrics Reference

### Bloom's Levels (6)
| Level | Definition | Example |
|-------|-----------|---------|
| **Remember** | Recall facts | List, define, name |
| **Understand** | Explain concepts | Explain, classify |
| **Apply** | Use in new situations | Apply, solve |
| **Analyze** | Draw connections | Analyze, compare |
| **Evaluate** | Make judgments | Justify, critique |
| **Create** | Produce original work | Create, design |

### Complexity Ranges
| Score | Meaning |
|-------|---------|
| **0-30%** | Simple, accessible |
| **30-60%** | Grade-appropriate |
| **60-100%** | Advanced, difficult |

### Novelty Ranges
| Score | Meaning |
|-------|---------|
| **0-30%** | Similar to previous |
| **30-70%** | Mixed novelty |
| **70-100%** | Unique/new |

---

## ⚡ Common Tasks

### Export Problem Metadata
1. Go to Step 2 (Problem Analysis)
2. Click "📥 Export JSON" or "Export CSV"
3. Share CSV with colleagues, use JSON for processing

### Test Assignment with Real Class
1. Upload assignment
2. Skip to Step 3 (Class Builder)
3. Add your actual students
4. Proceed through simulation

### Just Get Metadata (Quick Check)
1. Upload assignment
2. Review Step 2 metadata
3. Click "📥 Export CSV"
4. Done! (No need to continue pipeline)

### Send to External Processor
1. Complete all 6 steps
2. At Step 6, download JSON export
3. Send to your simulation processor
4. Import results to dashboard

---

## 🔑 Important Notes

✅ **Metadata is automatically extracted** - No manual tagging
✅ **Teachers define the class** - Not AI-generated
✅ **Export is standard format** - JSON for processing
✅ **Steps are optional** - Can stop at any point
✅ **No data is lost** - Everything stays until reset

⚠️ **Each assignment is independent** - No saving between uploads
⚠️ **Class is lost on reset** - Build fresh each time
⚠️ **External processor needed** - For detailed analysis
⚠️ **Feedback is preview only** - Not the final analysis

---

## 🎓 Typical Workflows

### Workflow A: Quick Review (5 min)
```
Upload → Review Metadata (Step 2) → Export CSV → Done
```

### Workflow B: Full Analysis (20 min)
```
Upload → Review Metadata → Build Class → Run Simulation → Review Feedback → Done
```

### Workflow C: Complete Processing (45 min)
```
Upload → Review Metadata → Build Class → Run Simulation → 
Rewrite → Review Changes → Export JSON → Send to Processor
```

---

## 🚀 Getting Started

1. **Open** http://localhost:3000
2. **Click** "Build or Upload Assignment"
3. **Paste** your assignment text (or upload file)
4. **Follow** the 6 steps
5. **Export** when ready

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Step 2 not showing | Make sure assignment was uploaded |
| Can't add students | Click "Add Student" after entering name |
| Export button missing | Should be visible at Step 2 and Step 6 |
| Page not loading | Check http://localhost:3000 is running |

---

**Status**: ✅ Ready to Use
**Build**: 877 modules, 0 errors
**Version**: 6-step pipeline
