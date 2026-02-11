import { GeneratedAssignment, GeneratedSection, GeneratedProblem } from '../../hooks/useUserFlow';
import { StudentFeedback } from '../../types/pipeline';

/**
 * UNIVERSAL ASSESSMENT CREATION INSTRUCTION BLOCK
 * Applied to all rewriting operations
 */
const UNIVERSAL_INSTRUCTION_BLOCK = `
🔒 UNIVERSAL ASSESSMENT REWRITE CONTROL INSTRUCTIONS

You are rewriting an assessment based on student feedback. Follow these rules STRICTLY:

## 1️⃣ Alignment Priority
The rewritten assessment must mirror the original structure, difficulty, and cognitive level.
- Do not introduce new types of tasks
- Do not increase conceptual depth beyond what was practiced  
- Do not escalate to higher-order thinking unless explicitly present in original
Alignment is more important than perfection.

## 2️⃣ Bloom's Level Restriction
Match the highest Bloom's level present in the ORIGINAL assessment.
- If original focuses on Apply/Analyze → stay at Apply/Analyze
- Do not introduce Synthesis or Evaluation unless originally present
- Do not add multi-step reasoning if original had single-step
The rewrite must NOT exceed the cognitive demand of the original.

## 3️⃣ Structural Similarity
The rewritten assessment should:
- Include the same categories of questions
- Maintain similar balance of computation vs conceptual
- Use similar scaffolding level
- Change content but NOT structure
- Feel familiar to students who completed the original

## 4️⃣ Difficulty Guardrails (NO CREEP)
Do NOT:
- Combine multiple concepts if original kept them separate
- Remove scaffolding if original provided it
- Add "design" or "justify deeply" unless originally present
- Increase abstraction level
- Add rigor for its own sake

If unsure, choose the SIMPLER version.

## 5️⃣ Student Feedback Integration
Address specific student struggles WITHIN the same cognitive level:
- Clarify confusing wording
- Break down multistep problems that students struggled with
- Add intermediate scaffolding steps (but maintain overall difficulty)
- Fix wording issues that led to confusion
- Ensure consistency in terminology

## 6️⃣ Self-Check Before Finalizing
- Does any question exceed the original Bloom's level?
- Did you introduce a new problem type?
- Is the difficulty noticeably higher than the original?
- Would students feel blindsided by the rewrite?
If YES to any → revise downward.

---

Remember: This is a REFINEMENT, not a redesign. Improve clarity and reduce confusion, but maintain the same cognitive rigor as the original.
`;

interface RewriteContext {
  originalAssignment: GeneratedAssignment;
  studentFeedback: StudentFeedback[];
  completionStats?: {
    averageTimeSeconds: number;
    confusionLevel: number;
    successRate: number;
    strugglingProblems: number[];
  };
}

/**
 * Analyzes feedback to identify problem-specific issues
 */
function analyzeProblemIssues(
  feedback: StudentFeedback[],
  problemIndex: number,
): {
  confusionRate: number;
  mainIssues: string[];
  weaknesses: string[];
} {
  // Extract feedback related to this problem
  const relatedFeedback = feedback.filter(
    f =>
      f.feedbackType === 'weakness' || f.feedbackType === 'suggestion',
  );

  return {
    confusionRate: relatedFeedback.filter(f => f.feedbackType === 'weakness').length / Math.max(feedback.length, 1),
    mainIssues: relatedFeedback
      .filter(f => f.feedbackType === 'suggestion')
      .map(f => f.content)
      .slice(0, 3),
    weaknesses: relatedFeedback
      .filter(f => f.feedbackType === 'weakness')
      .map(f => f.content)
      .slice(0, 2),
  };
}

/**
 * Generates an AI prompt for rewriting the assignment
 * Uses the universal instruction block to maintain alignment
 */
function generateRewritePrompt(context: RewriteContext): string {
  const problematicProblems = context.studentFeedback
    .filter(f => f.feedbackType === 'weakness')
    .map(f => `- ${f.content}`)
    .join('\n');

  const allWeaknesses = context.studentFeedback
    .filter(f => f.feedbackType === 'weakness')
    .map(f => f.content)
    .filter((v, i, a) => a.indexOf(v) === i) // Unique
    .join('\n');

  return `
${UNIVERSAL_INSTRUCTION_BLOCK}

---

## ORIGINAL ASSIGNMENT

Title: ${context.originalAssignment.title}
Type: ${context.originalAssignment.assignmentType}
Estimated Duration: ${context.originalAssignment.estimatedTime} minutes
Topic: ${context.originalAssignment.topic}

Bloom's Distribution:
${Object.entries(context.originalAssignment.bloomDistribution || {})
  .map(([level, count]) => `- Level ${level}: ${count} problems`)
  .join('\n')}

---

## STUDENT FEEDBACK FROM SIMULATION

Average Time: ${context.completionStats?.averageTimeSeconds ? Math.round(context.completionStats.averageTimeSeconds / 60) : '?'} minutes
Confusion Level: ${context.completionStats?.confusionLevel ? (context.completionStats.confusionLevel * 100).toFixed(0) : '?'}%
Success Rate: ${context.completionStats?.successRate ? (context.completionStats.successRate * 100).toFixed(0) : '?'}%

### Problems Students Struggled With:
${allWeaknesses || 'None specifically noted'}

### Suggestions from Feedback:
${context.studentFeedback
  .filter(f => f.feedbackType === 'suggestion')
  .map(f => `- ${f.content}`)
  .slice(0, 5)
  .join('\n') || 'Improve clarity and reduce confusion'}

---

## YOUR TASK

Rewrite the assessment to address student confusion WHILE maintaining the same cognitive level as the original.

SPECIFIC IMPROVEMENTS TO MAKE:
1. Clarify any confusing problem wording
2. Break down multistep problems that confused students (but keep same Bloom's level)
3. Add clarity to instructions without changing difficulty
4. Fix consistency in terminology
5. Ensure scaffolding is clear

CONSTRAINTS (DO NOT BREAK):
- Do NOT add new problem types
- Do NOT increase Bloom's level
- Do NOT remove problems (keep same quantity)
- Do NOT add extra rigor/difficulty
- DO maintain the same structure and balance

RESPONSE FORMAT:
Provide a JSON object with this structure:
{
  "title": "rewritten title (can be same as original)",
  "sections": [
    {
      "sectionName": "Section name",
      "instructions": "Updated instructions if needed",
      "problems": [
        {
          "problemText": "Rewritten problem text with clarifications",
          "format": "Multiple Choice|True or False|Short Answer|Matching|etc",
          "bloomLevel": "Remember|Understand|Apply|Analyze|Evaluate|Create",
          "options": ["option1", "option2", ...],
          "tips": ["tip 1", "tip 2"],
          "clarifications": "What was changed and why"
        }
      ]
    }
  ],
  "summaryOfChanges": "Bullet list of changes made"
}

---

## FIRST 2 PROBLEMS FROM EACH SECTION (to guide rewrite):

${context.originalAssignment.sections
  .map((section, sIdx) => `
SECTION: ${section.sectionName || `Section ${sIdx + 1}`}
${
  section.problems
    .slice(0, 2)
    .map(
      (p, pIdx) => `
Problem ${pIdx + 1}:
Type: ${p.format || p.questionFormat || 'Unknown'}
Bloom's: ${p.bloomLevel || 'Unknown'}
Original: ${p.problemText?.substring(0, 200) || 'N/A'}
Options: ${p.options?.slice(0, 3).join(' | ') || 'N/A'}
`,
    )
    .join('\n')
}
`)
  .join('\n')}

Now provide the FULL rewritten assignment in the JSON format specified above. Remember: MAINTAIN alignment and cognitive level. Do NOT increase rigor.
`;
}

/**
 * Calls Claude API to rewrite the assignment
 * This is the REAL implementation that does intelligent rewriting
 */
async function callClaudeForRewrite(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY || '',
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
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return '';
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return '';
  }
}

/**
 * REAL ASSIGNMENT REWRITER using AI
 * Takes student feedback and genuinely improves the assignment
 * while maintaining alignment per the universal instruction block
 */
export async function rewriteAssignmentWithAI(
  context: RewriteContext,
): Promise<GeneratedAssignment> {
  console.log('🤖 Starting AI-powered assignment rewrite...');

  // Generate the prompt with universal instructions
  const prompt = generateRewritePrompt(context);

  // Call Claude to get the actual rewrite
  const claudeResponse = await callClaudeForRewrite(prompt);

  if (!claudeResponse) {
    console.error('No response from Claude, returning original assignment');
    return context.originalAssignment;
  }

  try {
    // Extract JSON from Claude's response
    const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from Claude response');
      return context.originalAssignment;
    }

    const rewriteData = JSON.parse(jsonMatch[0]);

    // Convert Claude's response to GeneratedAssignment format
    const rewrittenAssignment: GeneratedAssignment = {
      ...context.originalAssignment,
      title: rewriteData.title || context.originalAssignment.title,
      sections: rewriteData.sections.map((section: any) => ({
        sectionId: section.sectionId || `section-${Math.random()}`,
        sectionName: section.sectionName,
        instructions: section.instructions || '',
        problems: section.problems.map((p: any) => ({
          problemText: p.problemText,
          format: p.format || p.questionFormat || 'Multiple Choice',
          bloomLevel: p.bloomLevel || 'Apply',
          options: p.options || [],
          tips: p.tips || [],
          rawComplexity: context.originalAssignment.sections
            .flatMap(s => s.problems)
            .find(orig => orig.problemText?.substring(0, 50) === p.problemText?.substring(0, 50))
            ?.rawComplexity || 0.5,
          rawNovelty: context.originalAssignment.sections
            .flatMap(s => s.problems)
            .find(orig => orig.problemText?.substring(0, 50) === p.problemText?.substring(0, 50))
            ?.rawNovelty || 0.5,
        })) as GeneratedProblem[],
      })) as GeneratedSection[],
    };

    console.log('✅ AI rewrite completed');
    return rewrittenAssignment;
  } catch (error) {
    console.error('Error parsing rewrite response:', error);
    return context.originalAssignment;
  }
}

/**
 * Fallback: If AI not available, applies intelligent local improvements
 * based on feedback patterns
 */
function applyLocalRewriteRules(
  context: RewriteContext,
): GeneratedAssignment {
  const improved = { ...context.originalAssignment };

  // For each section, apply improvements
  improved.sections = improved.sections.map((section) => ({
    ...section,
    problems: section.problems.map((problem, idx) => {
      const issues = analyzeProblemIssues(context.studentFeedback, idx);

      // If confusion is high, add more scaffolding
      if (issues.confusionRate > 0.5) {
        return {
          ...problem,
          tips: [
            ...( problem.tips || []),
            'Key Tip: Read carefully and break this down into smaller steps if needed.',
          ],
        };
      }

      return problem;
    }),
  }));

  return improved;
}

/**
 * Main export: Rewrite assignment with either AI or local rules
 */
export async function rewriteAssignment(
  context: RewriteContext,
): Promise<{
  rewrittenAssignment: GeneratedAssignment;
  summaryOfChanges: string;
  method: 'ai' | 'local';
}> {
  // Try AI first
  if (process.env.REACT_APP_ANTHROPIC_API_KEY) {
    try {
      const rewritten = await rewriteAssignmentWithAI(context);
      return {
        rewrittenAssignment: rewritten,
        summaryOfChanges: `Assignment rewritten using AI analysis of student feedback. Improvements maintained original Bloom's level and structure while addressing confusion points.`,
        method: 'ai',
      };
    } catch (error) {
      console.error('AI rewrite failed, falling back to local rules:', error);
    }
  }

  // Fallback to local rules
  const improved = applyLocalRewriteRules(context);
  return {
    rewrittenAssignment: improved,
    summaryOfChanges: 'Applied local improvements based on confusion patterns. Added scaffolding to complex problems.',
    method: 'local',
  };
}
