/**
 * Assignment Generation System Instructions
 * 
 * Provides structured prompts for high-quality assignment generation
 * that aligns with educational standards and incorporates feedback
 */

export interface AssignmentGenerationContext {
  assessmentType: 'formative' | 'summative';
  gradeLevel: string;
  subject: string;
  timeConstraint?: string; // e.g., "30 minutes", "1 hour"
  cognitiveRigor?: string; // e.g., "Analyze (Bloom's Level 4)"
  assignmentFormat?: string; // e.g., "short essay", "project-based"
  sourceDocuments?: string[];
  notes?: string[];
  previousFeedback?: string[];
}

/**
 * Build a comprehensive system instruction for assignment generation
 */
export function buildAssignmentGenerationInstruction(context: AssignmentGenerationContext): string {
  const notesBlock = context.notes && context.notes.length > 0 
    ? `\n\n📝 IMPORTANT NOTES TO INCORPORATE:\n${context.notes.map((note, i) => `${i + 1}. ${note}`).join('\n')}`
    : '';

  const feedbackBlock = context.previousFeedback && context.previousFeedback.length > 0
    ? `\n\n💬 FEEDBACK FROM PREVIOUS ITERATION:\n${context.previousFeedback.map((fb, i) => `${i + 1}. ${fb}`).join('\n')}`
    : '';

  const sourceBlock = context.sourceDocuments && context.sourceDocuments.length > 0
    ? `\n\n📚 SOURCE MATERIALS PROVIDED:\n${context.sourceDocuments.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}`
    : '';

  return `You are an expert educator and instructional designer specializing in creating high-quality, standards-aligned assignments.

CONTEXT:
- Assessment Type: ${context.assessmentType}
- Grade Level: ${context.gradeLevel}
- Subject: ${context.subject}
${context.timeConstraint ? `- Time Constraint: ${context.timeConstraint}` : ''}
${context.cognitiveRigor ? `- Cognitive Rigor: ${context.cognitiveRigor}` : ''}
${context.assignmentFormat ? `- Assignment Format: ${context.assignmentFormat}` : ''}

BEFORE GENERATING THE ASSIGNMENT, YOU MUST:
✓ Carefully review all source documents and materials provided
✓ Read and fully apply ANY NOTES provided (these may include teacher preferences, student needs, instructional constraints, or curriculum alignment requirements)
✓ Incorporate any feedback from previous iterations
✓ Align with the specified assessment type, time constraint, cognitive rigor level, and format

YOUR OUTPUT MUST INCLUDE:
1. **Assignment Title** - Clear, descriptive, and engaging
2. **Student-Facing Instructions** - Clear, concise, age-appropriate language; no jargon
3. **Task Description** - What students must do, broken into clear steps or components
4. **Success Criteria or Rubric** - Explicit criteria for what successful completion looks like
5. **Optional Extensions or Differentiation** - Adaptations for advanced learners or students needing support

DESIGN REQUIREMENTS:
✓ Use professional formatting: clear headings, bullet points, numbered steps, consistent structure
✓ Maintain age-appropriate tone and vocabulary for ${context.gradeLevel}
✓ Avoid generic or vague tasks — be SPECIFIC and ACTIONABLE
✓ Ground all tasks in the provided source material
✓ Ensure the assignment is ready for direct classroom or LMS use
✓ Include clear timing expectations if applicable

${sourceBlock || ''}${notesBlock || ''}${feedbackBlock || ''}

Now generate the assignment:`;
}

/**
 * Build a prompt for assignment analysis that incorporates context
 */
export function buildAssignmentAnalysisInstruction(context: AssignmentGenerationContext): string {
  return `You are an expert educational assessment analyst with deep knowledge of Bloom's Taxonomy, Depth of Knowledge frameworks, and standards-aligned design.

CONTEXT:
- Assessment Type: ${context.assessmentType}
- Grade Level: ${context.gradeLevel}
- Subject: ${context.subject}
${context.cognitiveRigor ? `- Target Cognitive Rigor: ${context.cognitiveRigor}` : ''}

ANALYZE THE PROVIDED ASSIGNMENT FOR:
1. **Bloom's Taxonomy Distribution** - What percentage of questions target each level (Remember, Understand, Apply, Analyze, Evaluate, Create)?
2. **Clarity and Age-Appropriateness** - Is the language and task structure suitable for ${context.gradeLevel}?
3. **Alignment with Source Material** - Do all tasks connect clearly to the provided source materials?
4. **Cognitive Load and Time Feasibility** - Can students reasonably complete this ${context.timeConstraint ? `in ${context.timeConstraint}` : 'in a typical class period'}?
5. **Assessment Quality** - Are success criteria clear? Do they measure the intended learning outcomes?
6. **Accessibility and Differentiation** - Are there provisions for diverse learners?

Provide both quantitative ratings (0-100%) and qualitative feedback with specific, actionable recommendations.`;
}

/**
 * Build a prompt for assignment revision based on feedback
 */
export function buildAssignmentRevisionInstruction(
  context: AssignmentGenerationContext,
  feedback: string[]
): string {
  const feedbackBlock = feedback.map((fb, i) => `${i + 1}. ${fb}`).join('\n');
  
  return `You are an expert educator revising an assignment to incorporate critical feedback.

ORIGINAL CONTEXT:
- Assessment Type: ${context.assessmentType}
- Grade Level: ${context.gradeLevel}
- Subject: ${context.subject}
${context.cognitiveRigor ? `- Cognitive Rigor: ${context.cognitiveRigor}` : ''}

FEEDBACK TO ADDRESS:
${feedbackBlock}

REVISION REQUIREMENTS:
1. Address each piece of feedback explicitly
2. Maintain the original assessment type and cognitive rigor level
3. Keep the assignment age-appropriate for ${context.gradeLevel}
4. Ensure ALL changes are grounded in the source material
5. Preserve what was working well in the original

Provide a revised assignment that incorporates this feedback while maintaining professional quality and clarity.`;
}
