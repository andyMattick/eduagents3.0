# 🏗️ Rewriter Architecture: Developer Reference

## System Overview

The AI rewriter is a **feedback-aware, Bloom's-constrained improvement engine** that uses Claude 3.5 Sonnet to intelligently revise assignments while maintaining pedagogical alignment.

---

## 🔄 Data Flow

```
User clicks "Rewrite Again"
         ↓
RewriteComparisonStep.tsx → handleRewriteAgain()
         ↓
useRewrite.ts → performRewrite()
         ↓
rewriteAssignmentWithFeedback.ts → rewriteAssignment()
         ↓
generateRewritePrompt() → Create detailed context
         ↓
callClaudeForRewrite() → POST to Anthropic API
         ↓
Parse JSON response
         ↓
Store version in history
         ↓
Return GeneratedAssignment to UI
         ↓
RewriteComparisonStep displays new version
         ↓
User can test again or rewrite again (loop)
```

---

## 📁 Key Files

### 1. **rewriteAssignmentWithFeedback.ts** (NEW)
**Location:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts`
**Purpose:** Core rewriter logic with AI integration

**Key Exports:**
```typescript
interface RewriteContext {
  originalAssignment: GeneratedAssignment;
  studentFeedback: StudentFeedback[];
  assignmentMetadata?: { subject?, gradeLevel?, assignmentType? };
  options?: { maxAttempts?: number };
}

interface RewriteResult {
  rewrittenAssignment: GeneratedAssignment;
  summaryOfChanges: string;
  method: 'ai' | 'local';
}

// Main export
export async function rewriteAssignment(
  context: RewriteContext
): Promise<RewriteResult>
```

**Functions:**
- `generateRewritePrompt(context: RewriteContext): string` - Creates Claude prompt with full context
- `callClaudeForRewrite(prompt: string): Promise<string>` - Makes API call
- `rewriteAssignmentWithAI()` - Orchestrates AI rewrite with error handling
- `applyLocalRewriteRules()` - Fallback if API unavailable
- `rewriteAssignment()` - Main export, tries AI then fallback

### 2. **useRewrite.ts** (NEW)
**Location:** `src/hooks/useRewrite.ts`
**Purpose:** State management for rewrite operations

**Main Hook:**
```typescript
export function useRewrite() {
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(1);
  const [previousVersions, setPreviousVersions] = useState<RewriteVersion[]>([]);
  
  return {
    isRewriting,
    rewriteError,
    currentVersionNumber,
    previousVersions,
    performRewrite(),      // Main method
    getVersionHistory()    // Query method
  };
}
```

### 3. **RewriteComparisonStep.tsx** (UPDATED)
**Location:** `src/components/Pipeline/RewriteComparisonStep.tsx`
**Changes:**
- ✅ Imports `useRewrite` hook
- ✅ Calls `performRewrite()` on "Rewrite Again" button
- ✅ Shows "🔄 Rewriting..." loading state
- ✅ Displays error if API fails

**Integration Point:**
```typescript
const { performRewrite, isRewriting, rewriteError } = useRewrite();

const handleRewriteAgain = async () => {
  const result = await performRewrite(
    rewrittenAssignment,
    rewrittenFeedback || originalFeedback
  );
  if (result) onRewrite();
};
```

---

## 🧠 How Bloom's Levels Are Controlled

### The Universal Instruction Block

**File:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts` (lines ~10-50)

```typescript
const UNIVERSAL_INSTRUCTION_BLOCK = `
Alignment Priority:
- Do not introduce new types of tasks
- Do not increase conceptual depth beyond source material
- Alignment is more important than rigor

Bloom's Level Restriction:
- Match the highest Bloom's level present in the source material
- Do NOT introduce synthesis, evaluation, experimental design beyond practice
- The test must NOT exceed the cognitive demand students were trained for

Structural Similarity:
- Include similar categories of questions
- Maintain similar balance
- Feel familiar to students who completed the review

Difficulty Guardrails (NO CREEP):
- No concept combinations unless practiced
- No scaffolding removal
- No added rigor for its own sake

When Rewriting Based on Feedback:
- Address struggles WITHIN the same cognitive level
- Clarify confusing wording
- Add intermediate steps without increasing rigor
- Fix terminology inconsistencies
- Do NOT change Bloom's levels
`
```

### Where It's Applied

**In the Prompt to Claude:**
```typescript
function generateRewritePrompt(context: RewriteContext): string {
  return `
${UNIVERSAL_INSTRUCTION_BLOCK}

ORIGINAL ASSIGNMENT:
${context.originalAssignment.title}

ORIGINAL BLOOM'S DISTRIBUTION:
${calculateBloomDistribution(context.originalAssignment)}

[... rest of context ...]

Your task: Rewrite addressing feedback while respecting the constraints above.
  `
}
```

### How It Restricts Claude

1. **Prevents Escalation:**
   - "Match the highest Bloom's level" → Claude knows cap
   - Won't generate "Analyze" if original is "Remember"

2. **Prevents Rigor Creep:**
   - "No scaffolding removal" → Claude adds clarity, not difficulty
   - "No concept combinations" → Claude keeps structure

3. **Prevents Scope Creep:**
   - "No new types of tasks" → Problems stay recognizable
   - "Familiar to students" → Context constraint

4. **Focuses on Clarity:**
   - "Clarify confusing wording" → Rewrite is targeted
   - "Address struggles" → Each change is justified by feedback

---

## 🎯 Prompt Engineering: What Claude Receives

### Example Prompt Structure:

```
[UNIVERSAL_INSTRUCTION_BLOCK]

ORIGINAL ASSIGNMENT:
Title: "Photosynthesis Fundamentals"
Subject: Biology
Grade Level: 9
Problems count: 8

ORIGINAL BLOOM'S DISTRIBUTION:
- Remember: 3 problems (37.5%)
- Understand: 4 problems (50%)
- Apply: 1 problem (12.5%)
Total estimated time: 25 minutes

ORIGINAL PROBLEMS (First 2 from each section):
Section 1: Terminology
  Problem 1: "Define photosynthesis."
  Problem 2: "List the inputs of photosynthesis."

Section 2: Process Understanding
  Problem 3: "Where does the light-dependent reaction occur?"
  Problem 4: "Why is photosynthesis essential for life?"

STUDENT FEEDBACK:
Struggling with:
  - Problem 3 (Confusion level: 75%) - Confused about location (thylakoid vs stroma)
  - Problem 4 (Confusion level: 60%) - Multi-part, unclear what "essential" means

Suggestions:
  - "Confused by the two-part structure"
  - "Needs scaffolding"
  - "Too vague on 'essential'"

COMPLETION STATS:
- Average time on task: 28 minutes (vs. 25 estimated)
- Overall success rate: 58%
- Problems with highest confusion: [3, 4]

YOUR TASK:
Rewrite addressing the confusion points above while:
1. Maintaining the Bloom's distribution (Remember: 37.5%, Understand: 50%, Apply: 12.5%)
2. Keeping both problems at "Understand" and "Apply" levels (no escalation)
3. Adding scaffolding without reducing cognitive demand
4. Keeping all 8 problems (no additions/removals)
5. Using similar language/structure to originals

FORMAT OUTPUT:
Return a JSON object with rewritten problems. Maintain structure.
Include "summaryOfChanges" explaining what changed and why.
```

---

## 🔍 How Bloom's Is Detected & Compared

### Detection (analyzeTags.ts)

```typescript
function classifyBloomLevel(problemText: string): BloomLevel {
  const rememberKeywords = ['define', 'list', 'identify', 'recall'];
  const understandKeywords = ['explain', 'describe', 'summarize', 'classify'];
  const applyKeywords = ['use', 'solve', 'calculate', 'apply'];
  const analyzeKeywords = ['analyze', 'compare', 'distinguish', 'examine'];
  const evaluateKeywords = ['evaluate', 'critique', 'judge', 'defend'];
  const createKeywords = ['create', 'design', 'invent', 'compose'];
  
  // Match keywords and return highest level found
  if (createKeywords.some(k => problemText.toLowerCase().includes(k))) 
    return 'Create';
  if (evaluateKeywords.some(k => problemText.toLowerCase().includes(k))) 
    return 'Evaluate';
  // ... etc
}
```

### Comparison (in rewriteAssignmentWithFeedback.ts)

```typescript
function validateBloomsPreserved(
  original: GeneratedAssignment,
  rewritten: GeneratedAssignment
): boolean {
  const originalBlooms = calculateBloomDistribution(original);
  const rewrittenBlooms = calculateBloomDistribution(rewritten);
  
  // Check: No problem escalated more than 1 level
  original.problems.forEach((origProblem, i) => {
    const rewritteProblem = rewritten.problems[i];
    const origLevel = classifyBloomLevel(origProblem.text);
    const rewrittenLevel = classifyBloomLevel(rewritteProblem.text);
    
    if (BLOOM_ORDER.indexOf(rewrittenLevel) > 
        BLOOM_ORDER.indexOf(origLevel) + 1) {
      console.warn(`Problem ${i} escalated more than expected`);
      return false;
    }
  });
  
  return true;
}
```

---

## 🚀 API Integration Details

### Anthropic API Call

**File:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts`

```typescript
async function callClaudeForRewrite(prompt: string): Promise<string> {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('No Anthropic API key found, using local rewrite rules');
    return '';
  }

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error.message}`);
    }

    const data = await response.json();
    return data.content[0].text; // Claude's response
  } catch (error) {
    console.error('Failed to call Claude API:', error);
    return '';
  }
}
```

### Environment Setup

**File:** `.env.local` (not in repo, must be set locally)

```bash
REACT_APP_ANTHROPIC_API_KEY=sk-ant-v1-your-actual-key-here
```

**Verification:**
```bash
echo $REACT_APP_ANTHROPIC_API_KEY  # Should show your key
```

---

## ⚙️ Fallback Logic

If Claude API fails or is unavailable:

```typescript
// In rewriteAssignment()
async function rewriteAssignment(context: RewriteContext) {
  try {
    // Try AI first
    return await rewriteAssignmentWithAI(context);
  } catch (error) {
    console.warn('AI rewrite failed, using local rules:', error);
    // Fall back to local rules
    return {
      rewrittenAssignment: applyLocalRewriteRules(context),
      summaryOfChanges: "Applied local enhancement rules",
      method: 'local'
    };
  }
}
```

**What applyLocalRewriteRules Does:**
- Analyzes confusion scores per problem
- Adds scaffolding tips for high-confusion problems (>50%)
- Clarifies terminology based on feedback
- Adds intermediate steps
- **Still respects Bloom's level** (no escalation)

---

## 📊 Version History Schema

**How Versions Are Tracked:**

```typescript
interface RewriteVersion {
  version: number;                    // 1, 2, 3, ...
  assignment: GeneratedAssignment;    // Full assignment
  timestamp: Date;                    // When rewritten
  feedback: StudentFeedback[];        // Feedback that prompted this version
  summaryOfChanges?: string;          // What changed
}

// In hook:
const [previousVersions, setPreviousVersions] = useState<RewriteVersion[]>([]);
```

**Example Version History for 3-Iteration Loop:**

```
Version 1 (Original)
├─ Generated at 2:45 PM
├─ Student feedback: 6 problems with confusion >50%
└─ 8 problems total

Version 2 (First Rewrite)
├─ Generated at 2:52 PM
├─ Changes: Added scaffolding to problems 3,4,7
├─ Feedback prompted: Confusion in problem 3
├─ 8 problems total (same)
└─ Bloom's: Same distribution

Version 3 (Second Rewrite)
├─ Generated at 3:01 PM
├─ Changes: Rewrote problem 4 for clarity
├─ Feedback prompted: Problem 4 still confusing
├─ 8 problems total (same)
└─ Bloom's: Same distribution
```

---

## 🧪 Testing The Rewriter

### Unit Test Template

```typescript
// File: src/agents/rewrite/__tests__/rewriteAssignmentWithFeedback.test.ts

import { rewriteAssignment } from '../rewriteAssignmentWithFeedback';

describe('rewriteAssignmentWithFeedback', () => {
  it('should preserve Bloom levels', async () => {
    const context = {
      originalAssignment: createMockAssignment(),  // 50% Remember, 50% Understand
      studentFeedback: createMockFeedback()
    };
    
    const result = await rewriteAssignment(context);
    
    const rewrittenBlooms = calculateBloomDistribution(result.rewrittenAssignment);
    expect(rewrittenBlooms).toEqual({
      Remember: 0.5,
      Understand: 0.5
    });
  });
  
  it('should address student confusion', async () => {
    const context = {
      originalAssignment: createMockAssignment(),
      studentFeedback: [
        { problemId: 3, confusionLevel: 0.85 }
      ]
    };
    
    const result = await rewriteAssignment(context);
    
    // Problem 3 should have changed
    expect(
      result.rewrittenAssignment.problems[3].text
    ).not.toEqual(
      context.originalAssignment.problems[3].text
    );
  });
  
  it('should add scaffolding without changing Bloom level', async () => {
    const context = {
      originalAssignment: { 
        problems: [{ text: "Solve 5x + 3 = 18", bloomLevel: "Apply" }] 
      },
      studentFeedback: [{ problemId: 0, confusionLevel: 0.70 }]
    };
    
    const result = await rewriteAssignment(context);
    
    const rewritten = result.rewrittenAssignment.problems[0];
    expect(rewritten.bloomLevel).toBe("Apply");  // Same level
    expect(rewritten.text.length).toBeGreaterThan(
      context.originalAssignment.problems[0].text.length
    );  // Longer = more scaffolding
  });
});
```

### Integration Test (Manual)

1. Generate assignment with known Bloom's distribution
2. Simulate to get feedback
3. Rewrite
4. Compare:
   - ✅ Bloom's level unchanged
   - ✅ Structure preserved
   - ✅ Confusion addressed
   - ✅ No rigor creep

---

## 📈 Metrics & Monitoring

### What To Track

```typescript
// Track rewrite effectiveness
const metrics = {
  confusionReduction: (before - after) / before,  // % improvement
  timeChange: afterTime - beforeTime,              // seconds (should be ±10%)
  successRateImprovement: afterSuccess - beforeSuccess,
  bloomsPreserved: afterBlooms === beforeBlooms,
  structurePreserved: afterProblems.length === beforeProblems.length
};
```

### Success Criteria

- ✅ Confusion reduced by 15-30%
- ✅ Time ±10% (can go up if more scaffolding, down if clearer)
- ✅ Success rate improved by 10-20%
- ✅ Blooms distribution identical (within 1%)
- ✅ Same number of problems
- ✅ Same problem types

---

## 🔧 Common Extensions

### Add a Custom Rewrite Rule

**File:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts`

```typescript
function applyLocalRewriteRules(context: RewriteContext): GeneratedAssignment {
  const rewritten = JSON.parse(JSON.stringify(context.originalAssignment));
  
  // NEW: Add custom rule for multistep problems
  rewritten.problems = rewritten.problems.map((problem, idx) => {
    const feedback = context.studentFeedback.find(f => f.problemId === idx);
    
    if (feedback && feedback.confusionLevel > 0.70) {
      // Check if multistep
      if (problem.text.includes('then') || problem.text.includes('next')) {
        problem.text = problem.text.replace(
          /then/g, 
          '\nStep [N]: Then'
        );
      }
    }
    
    return problem;
  });
  
  return rewritten;
}
```

### Add Claude with Custom Instructions

**File:** `src/agents/rewrite/rewriteAssignmentWithFeedback.ts`

```typescript
function generateRewritePrompt(context: RewriteContext): string {
  let prompt = UNIVERSAL_INSTRUCTION_BLOCK;
  
  // Add subject-specific instructions
  if (context.assignmentMetadata?.subject === 'Mathematics') {
    prompt += `\n
MATHEMATICS-SPECIFIC GUIDELINES:
- Show work/steps for all solutions
- Use mathematical notation correctly
- Include units in final answers
- Avoid ambiguous phrasing like "find x"
    `;
  }
  
  // ... rest of prompt
  return prompt;
}
```

---

## 🚀 Deployment Checklist

- [ ] API key configured in production environment
- [ ] Bloom's level validation passing all test cases
- [ ] Version history tracking verified
- [ ] Fallback to local rules tested
- [ ] Error handling covers all edge cases
- [ ] Prompt engineering stable (Claude responses predictable)
- [ ] Performance acceptable (rewrite completes <20 sec)
- [ ] UI shows loading states properly
- [ ] Comparison metrics accurate
- [ ] Build has 0 TypeScript errors

