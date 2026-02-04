# New Pipeline Architecture - User Guide

## 🎯 Overview

The eduagents3.0 system has been restructured from a 5-step to a 6-step pipeline that clearly separates **data preparation** from **external simulation processing**.

### New Architecture Philosophy
- **This System**: Prepares assignment data and creates student classes
- **External Processor**: Runs detailed simulations and analytics

---

## 📋 The 6-Step Pipeline

### Step 1: Upload/Generate Assignment
**What Happens**: You provide an assignment (upload PDF/Word or paste text)
- Assignment is parsed
- Problems are automatically extracted
- System moves automatically to Step 2

### Step 2: Problem Analysis (NEW)
**What You See**: Complete metadata for every problem
- 📚 **Bloom Level**: Cognitive difficulty (Remember → Create)
- 📖 **Linguistic Complexity**: Reading difficulty (0-100%)
- ✨ **Novelty Score**: How different from previous problems (0-100%)
- 🔄 **Similarity**: Overlap with previous problem (0-100%)
- 📏 **Length**: Word count for each problem
- 🔗 **Structure**: Single-part or multi-part question

**View Options**:
- 📊 **View Metadata**: See all scores and metrics in card layout
- 📄 **View Assignment**: See your assignment as formatted HTML

**Export Options**:
- 📥 **Export JSON**: Download complete metadata structure
- 📥 **Export CSV**: Download tabular data for spreadsheet analysis

**Next**: Click "Continue to Class Builder" when ready

### Step 3: Build Your Class (NEW)
**What You Do**: Define which students this assignment is for

**Options**:
1. **Select Preset Personas** (11 available)
   - Visual Learner, Auditory Learner, Kinesthetic Learner
   - Advanced Student, Struggling Student
   - ADHD Student, Dyslexic Student, ESL Student
   - Fatigue-Sensitive, High-Anxiety, Average Student

2. **Create Custom Students**
   - Enter student name/identifier
   - Select accessibility overlays (optional)
   - Customize 4 traits with sliders:
     - Reading Level
     - Math Fluency
     - Attention Span
     - Confidence

**Class Roster Management**:
- View all selected students
- Adjust trait levels per student with sliders
- Remove students as needed

**Next**: Click "Run Simulation for X Students" when class is ready

### Step 4: Simulated Student Feedback
**What Happens**: System shows how your selected students would respond
- Feedback from each student perspective
- Engagement scores
- Predicted struggle points
- Accessibility insights

**What This Is**: A **preview** of what the external processor will analyze in detail

**Next**: Click "Continue to Rewrite" to improve the assignment

### Step 5: Review & Rewrite Assignment
**What You See**: 
- Original assignment
- AI-suggested improvements
- Summary of changes made

**Rewrite Includes**:
- Simplification of language
- Breaking up complex multi-part questions
- Improving clarity and organization
- Better accessibility formatting

**Next**: Click "Continue to Export" when satisfied

### Step 6: Export for Processing (NEW)
**What You Download**:
1. **JSON Export**: Complete structured data
   - All problem metadata (Asteroids)
   - Class definition with student profiles
   - All trait customizations
   
2. **Text Export**: Human-readable format
   - Problems and metadata
   - Class roster information
   - Ready to share/review

**What Happens Next**:
- You send exported data to external simulation processor
- External processor runs comprehensive simulations
- Results come back to your dashboard
- You get detailed analytics and insights

---

## 📊 Understanding the Metadata

### Bloom's Taxonomy Levels
- **Remember**: Recall facts, definitions, basic concepts
- **Understand**: Explain ideas or concepts
- **Apply**: Use information in new situations
- **Analyze**: Draw connections between ideas
- **Evaluate**: Justify decisions, make judgments
- **Create**: Produce new or original work

### Complexity Score (0-100%)
How difficult is the language/reading?
- **0-30%**: Simple, accessible language
- **30-60%**: Grade-level appropriate
- **60-100%**: Advanced vocabulary, complex syntax

### Novelty Score (0-100%)
How different is this problem from previous ones?
- **0-30%**: Very similar to previous problems
- **30-70%**: Some variation, reinforces concepts
- **70-100%**: Completely new or unique context

### Similarity to Previous (0-100%)
Direct measure of overlap with immediately prior problem
- **0-30%**: Fresh perspective, new skills
- **30-70%**: Mixed novelty and reinforcement
- **70-100%**: Repetitive, similar focus

---

## 💾 Export Data Format

### JSON Structure
```json
{
  "asteroids": [
    {
      "ProblemId": "problem-1",
      "ProblemText": "...",
      "BloomLevel": "Analyze",
      "LinguisticComplexity": 0.65,
      "NoveltyScore": 0.82,
      "SimilarityToPrevious": 0.15,
      "ProblemLength": 245,
      "MultiPart": false
    }
  ],
  "classDefinition": {
    "id": "class-1",
    "name": "Period 1 Biology",
    "gradeLevel": "9",
    "subject": "Biology",
    "studentProfiles": [
      {
        "id": "student-1",
        "name": "Visual Learner",
        "profileType": "standard",
        "basePersona": "visual-learner",
        "overlays": [],
        "traits": {
          "readingLevel": 0.7,
          "mathFluency": 0.5,
          "attentionSpan": 0.8,
          "confidence": 0.65
        }
      }
    ],
    "createdAt": "2024-12-20T10:30:00Z"
  }
}
```

---

## 🚀 Workflow Examples

### Example 1: Quick Assessment Review
1. Upload assessment PDF
2. Check metadata in Step 2 (2 minutes)
3. Export as CSV for review with colleagues
4. Skip simulation, done!

### Example 2: Prepare for New Class
1. Upload assignment
2. Review metadata (Step 2)
3. Build class with your actual students' profiles (Step 3)
4. Preview simulation results (Step 4)
5. Rewrite if needed (Step 5)
6. Export for detailed external analysis (Step 6)

### Example 3: Compare Two Assessments
1. Run first assessment through entire pipeline
2. Export both metadata files
3. Compare Bloom distribution, complexity, novelty
4. Use insights to improve second assessment

---

## ❓ FAQ

**Q: Why two export steps?**
A: You can export in Step 2 (quick metadata review) or Step 6 (complete with rewrite + class). This gives flexibility.

**Q: Can I modify student profiles after Step 3?**
A: Not yet—profiles are locked once you proceed. Future version will allow refinement.

**Q: What happens to my exported data?**
A: Send to your external simulation processor. They run the detailed simulations and return analytics.

**Q: Can I reuse class definitions?**
A: Not yet—each class is created fresh. Future enhancement will include saved templates.

**Q: What if I only want metadata without simulation?**
A: Stop at Step 2 and export! The rest of the pipeline is optional.

---

## 🔄 Comparison: Old vs. New

### Old Pipeline (5 steps)
```
INPUT → TAG_ANALYSIS → STUDENT_SIMULATIONS → REWRITE → VERSION_COMPARISON
```

### New Pipeline (6 steps)
```
INPUT → PROBLEM_ANALYSIS (metadata) → CLASS_BUILDER → STUDENT_SIMULATIONS 
→ REWRITE → EXPORT (to external processor)
```

### Key Differences
| Aspect | Old | New |
|--------|-----|-----|
| Metadata Display | Hidden in tab | Prominent Step 2 |
| Class Definition | Auto-generated | Teacher-built (Step 3) |
| Student Selection | Implicit | Explicit with customization |
| Export | CSV only | JSON + Text in Step 6 |
| External Processing | N/A | Prepared for external use |
| Customization | Limited | Full trait control per student |

---

## 📱 Technical Details

### Built With
- React 19 + TypeScript 5.6
- Vite 5 build system
- Bloom taxonomy classification
- Problem extraction and analysis

### Data Types
- **Asteroid**: Problem with metadata (problem + tags + metrics)
- **Astronaut**: Student profile with traits and overlays
- **ClassDefinition**: Collection of students for an assignment
- **ClassStudentProfile**: Individual student with customized traits

---

## 🎓 For Educators

This new design acknowledges that:
1. **Preparation is separate from analysis**: You prepare the data, external system analyzes it
2. **Students are individuals**: Build your actual class, customize each student
3. **Metadata matters**: All problem characteristics are visible and exportable
4. **Flexibility is key**: Export at any stage, continue as far as you need

The goal: **Give you control over data preparation while delegating complex analysis to specialized processors.**

---

**Ready to use?** Start by uploading an assignment in Step 1. The system will guide you through the 6 steps.
