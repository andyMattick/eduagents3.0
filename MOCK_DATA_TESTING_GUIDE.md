# Mock Data Testing Guide

## Quick Start

The mock data system lets you **see exactly what data flows through the Asteroid/Astronaut simulation** without relying on real AI.

### Open Browser Console (F12) and Run:

```javascript
// OPTION 1: See full demo with detailed console output
window.demonstrateMockData()

// OPTION 2: Quick summary of all mock data
window.showMockDataOnly()

// OPTION 3: Get just the mock problems (Asteroids)
const asteroids = window.generateMockAsteroids()
console.log(asteroids)

// OPTION 4: Get complete simulation results
const results = window.generateMockSimulationResults()
console.log(results)
```

---

## What Each Function Shows

### 1. `demonstrateMockData()` - Full Demo Output

Shows the complete flow:
- 📚 **Phase 1**: 5 mock problems (asteroids) with Bloom levels, complexity, novelty
- 👥 **Phase 2**: Student personas selected for testing
- 🧠 **Phase 3**: Simulation metrics (success, time, fatigue, engagement)
- 📊 **Phase 4**: Aggregated analytics (avg score, completion rate, at-risk count)

**What you'll see in console:**
```
📚 PHASE 1: Asteroids (Problems Decomposed)
   Found 5 problems:

   • asteroid_1: "Analyze the use of symbolism in Chapter 5..."
     Bloom: Analyze, Complexity: 65%, Novelty: 100%
   • asteroid_2: "Compare and contrast Gatsby and Tom..."
     Bloom: Analyze, Complexity: 45%, Novelty: 38%
   ...

👨‍🚀 PHASE 2: Astronauts (Student Personas)
   Using 5 personas:

   • 📚 Strong Reader
     Reading: 90%, Math: 70%, Attention: 85%
   • 🎨 Visual Learner
     Reading: 65%, Math: 75%, Attention: 70%
   ...

🧠 PHASE 3: Simulation Results
   Simulated 5 students × 5 problems = 25 interactions

   📚 Strong Reader:
     Grade: A (85%)
     Time: 45 minutes
     Engagement: 0.80 → 0.62 → 0.52 (declining)
     At Risk: No
   ...

📊 AGGREGATED ANALYTICS:
   Average Score: 76%
   Average Time: 52 minutes
   Completion Rate: 85%
   At-Risk Students: 1
   Common Confusion Points: asteroid_3, asteroid_5
   Bloom Coverage: { Understand: 20%, Analyze: 40%, ... }
```

---

### 2. `showMockDataOnly()` - Quick Data Summary

Shows just the generated mock data without explanations:
- Asteroids with full details
- Student simulation results
- Analytics summary

Faster and cleaner if you already understand the system.

---

### 3. `generateMockAsteroids()` - Just the Problems

Returns an array of 5 sample problems:

```javascript
[
  {
    ProblemId: "asteroid_1",
    ProblemText: "Analyze the use of symbolism...",
    ProblemLength: 26,
    MultiPart: false,
    BloomLevel: "Analyze",
    LinguisticComplexity: 0.65,
    SimilarityToPrevious: 0,
    NoveltyScore: 1.0,
    SequenceIndex: 1,
    Subject: "English",
    TestType: "free_response"
  },
  // ... 4 more problems
]
```

Each problem shows:
- **BloomLevel**: Remember | Understand | Apply | Analyze | Evaluate | Create
- **LinguisticComplexity**: 0.0-1.0 (how hard to read/understand)
- **NoveltyScore**: 0.0-1.0 (how unique compared to other problems)
- **MultiPart**: Whether it has sub-questions

---

### 4. `generateMockSimulationResults()` - Complete Simulation

Returns:
```javascript
{
  assignmentId: "assignment_1707xxx",
  timestamp: "2026-02-04T...",
  asteroids: [...],        // All problems
  astronauts: [...],       // All student personas
  studentResults: [
    {
      studentId: "astronaut_strong_reader",
      personaName: "📚 Strong Reader",
      totalTimeMinutes: 45,
      estimatedScore: 85,
      estimatedGrade: "A",
      problemResults: [
        {
          studentId: "...",
          problemId: "asteroid_1",
          timeToCompleteSeconds: 180,
          percentageSuccessful: 92,
          confusionLevel: "low",
          engagementLevel: "high",
          feedback: "Student found this problem manageable."
        },
        // ... one per problem
      ],
      engagement: {
        initial: 0.80,
        atMidpoint: 0.68,
        final: 0.52,
        trend: "declining"    // Student got tired
      },
      fatigue: {
        initial: 0,
        peak: 0.65,
        final: 0.58
      },
      confusionPoints: ["asteroid_5"],  // Hard problems
      atRisk: false,
      riskFactors: []
    },
    // ... one per student
  ],
  aggregatedAnalytics: {
    averageTimeMinutes: 52,
    averageScore: 76,
    completionRate: 85,     // % of students finishing
    bloomCoverage: {
      Remember: 0,
      Understand: 20,
      Apply: 0,
      Analyze: 40,
      Evaluate: 20,
      Create: 20
    },
    commonConfusionPoints: ["asteroid_3", "asteroid_5"],
    atRiskStudentCount: 1
  }
}
```

---

## Understanding the Mock Data

### Asteroids (Problems)

Each asteroid represents a single question with:

| Field | Range | Meaning |
|-------|-------|---------|
| **BloomLevel** | Remember → Create | Cognitive complexity |
| **LinguisticComplexity** | 0.0-1.0 | How hard to read |
| **NoveltyScore** | 0.0-1.0 | How unique (1.0 = very unique) |
| **MultiPart** | true/false | Has sub-questions |
| **ProblemLength** | word count | Longer = takes more time |

### Student Results

For each student-problem pair:

| Metric | Range | Meaning |
|--------|-------|---------|
| **timeToCompleteSeconds** | 0-∞ | Predicted time to finish |
| **percentageSuccessful** | 0-100 | Likelihood of getting it right |
| **confusionLevel** | low/medium/high | How confused student is |
| **engagementLevel** | low/medium/high | How engaged student is |

### Student Trajectories

**Engagement Arc**: Shows how engaged student remains
- Start high (fresh), decline over time (fatigue)
- Trend: declining | improving | stable

**Fatigue**: Cumulative mental exhaustion
- Starts at 0
- Peaks midway through
- Final indicates how tired they are

### At-Risk Indicators

A student is "at-risk" if:
- Estimated grade is D or F, OR
- Confusion on >50% of problems

---

## Example: Interpret Results

```javascript
const results = window.generateMockSimulationResults()

// Look at a specific student
const student = results.studentResults[0]
console.log(`
  Student: ${student.personaName}
  
  Performance:
    Grade: ${student.estimatedGrade} (${student.estimatedScore}%)
    Time: ${student.totalTimeMinutes} minutes
  
  Engagement:
    Started at: ${(student.engagement.initial * 100).toFixed(0)}%
    Ended at: ${(student.engagement.final * 100).toFixed(0)}%
    Trend: ${student.engagement.trend} (getting ${student.engagement.trend === 'declining' ? 'tired' : 'more engaged'})
  
  Fatigue:
    Peak: ${(student.fatigue.peak * 100).toFixed(0)}%
    Final: ${(student.fatigue.final * 100).toFixed(0)}%
  
  Trouble Areas: ${student.confusionPoints.length > 0 ? student.confusionPoints.join(', ') : 'None'}
  At Risk: ${student.atRisk ? '⚠️ YES' : '✅ No'}
`)
```

Output example:
```
  Student: 📚 Strong Reader
  
  Performance:
    Grade: A (85%)
    Time: 45 minutes
  
  Engagement:
    Started at: 80%
    Ended at: 52%
    Trend: declining (getting tired)
  
  Fatigue:
    Peak: 65%
    Final: 58%
  
  Trouble Areas: asteroid_5
  At Risk: No
```

---

## Class-Level Analytics

```javascript
const results = window.generateMockSimulationResults()
const analytics = results.aggregatedAnalytics

console.log(`
  📊 CLASS SUMMARY:
  
  Overall Performance:
    Average Score: ${analytics.averageScore}%
    Average Time: ${analytics.averageTimeMinutes} minutes
  
  Completion:
    Expected to Finish: ${analytics.completionRate}%
    At-Risk: ${analytics.atRiskStudentCount} students
  
  Content Coverage (Bloom's Taxonomy):
    Remember: ${analytics.bloomCoverage.Remember}%
    Understand: ${analytics.bloomCoverage.Understand}%
    Apply: ${analytics.bloomCoverage.Apply}%
    Analyze: ${analytics.bloomCoverage.Analyze}%
    Evaluate: ${analytics.bloomCoverage.Evaluate}%
    Create: ${analytics.bloomCoverage.Create}%
  
  Problem Trouble Spots:
    ${analytics.commonConfusionPoints.join(', ')}
`)
```

---

## Real Data Paths

When you use real data (not mock), the system will:

1. **Take assignment text** → Send through Phase 1 (asteroid generation)
2. **Extract problems** → Tag with Bloom, complexity, novelty
3. **Select students** → Choose which personas to test
4. **Run simulation** → Calculate metrics for each student-problem pair
5. **Aggregate results** → Create analytics

The mock data shows exactly what those results look like.

---

## Troubleshooting

### "Function not found" error?
Make sure you're in the browser console (F12) after the app loads.

### Want to see raw JSON?
```javascript
const results = window.generateMockSimulationResults()
console.log(JSON.stringify(results, null, 2))
```

### Want to test with different data?
The mock generation is in `src/agents/simulation/mockData.ts` — modify the data and rebuild:
```bash
npm run dev
```

---

## Summary

**You now have 5 ways to see the mock data:**

| Function | Use Case |
|----------|----------|
| `demonstrateMockData()` | Full demo with detailed explanations |
| `showMockDataOnly()` | Quick overview of all mock data |
| `generateMockAsteroids()` | Just the problems/asteroids |
| `generateMockSimulationResults()` | Full simulation output (asteroids + results) |
| `testMockData()` | Run quick test to verify system works |

**Next steps:**
1. Run `window.demonstrateMockData()` in browser console to see full flow
2. Examine the `results` object to understand data structure
3. Inspect individual student results to see engagement/fatigue metrics
4. Look at analytics to understand class-level insights
5. Connect real UI components to display this data!
