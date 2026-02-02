import { AssignmentMetadata, generateTagsFromMetadata } from './assignmentMetadata';

// Mock content templates for different assignment types
const mockExamples: Record<string, string[]> = {
  ESSAY: [
    'Write a comprehensive essay that explores the interconnections between theory and practice. Consider multiple perspectives and provide evidence-based arguments.',
    'Analyze the key themes and provide a critical evaluation. Your essay should demonstrate critical thinking and original analysis of the source materials.',
    'Develop a well-structured argument that addresses the prompt. Include an introduction with a clear thesis, body paragraphs with supporting evidence, and a thoughtful conclusion.',
    'Examine the topic through a specific lens (historical, cultural, scientific, etc.). Support your analysis with concrete examples and scholarly sources.',
    'Synthesize information from multiple perspectives to develop your argument. Consider counterarguments and address them thoughtfully in your response.',
  ],
  RESEARCH_PAPER: [
    'Conduct a thorough research investigation using peer-reviewed sources. Your paper should present original analysis and contribute meaningful insights to the field.',
    'Synthesize existing research to answer the research question. Include a literature review, methodology, findings, and discussion of implications.',
    'Explore the topic through multiple academic sources. Your paper should demonstrate research skills, critical analysis, and proper scholarly communication.',
    'Develop a research proposal that identifies a gap in current knowledge. Support your proposal with evidence from existing literature and outline your research methodology.',
    'Analyze a specific problem or phenomenon using empirical research. Present your findings and discuss their significance for the field.',
  ],
  PROJECT: [
    'Create a comprehensive project that demonstrates your understanding through practical application. Document your process, decisions, and outcomes.',
    'Develop a tangible deliverable that shows mastery of the concepts. Include planning, implementation, and reflection on results.',
    'Design and execute a project that applies classroom learning to real-world scenarios. Present your work with supporting documentation.',
    'Build a project that solves a real problem or addresses an authentic need. Include documentation of your design process and evaluation of effectiveness.',
    'Create an interdisciplinary project that integrates multiple concepts from the course. Include a written reflection on how concepts connect.',
  ],
  PROBLEM_SET: [
    'Solve each problem showing all steps and reasoning. Demonstrate your understanding of the underlying concepts and methods.',
    'Work through the problems systematically. Each solution should clearly show your approach and justification for your answer.',
    'Complete all problems with detailed explanations. Explain your reasoning and connect your solutions to the course concepts.',
    'Solve the problems and create a study guide that explains each solution method. Include tips for others learning this material.',
    'Work through the problems, then select 2-3 to present in depth. Explain not just the solution but why this approach is optimal.',
  ],
  PRESENTATION: [
    'Prepare a presentation that clearly communicates your understanding of the topic. Use visuals effectively and engage your audience with your ideas.',
    'Create a dynamic presentation with well-designed slides. Your delivery should be polished and your content should be well-organized.',
    'Develop a presentation that tells a compelling story about your topic. Include evidence, examples, and thoughtful analysis.',
    'Create an interactive presentation that engages your audience. Include multimedia elements, discussion prompts, or activities.',
    'Prepare a presentation that synthesizes key ideas for a general audience. Make complex concepts accessible without losing accuracy.',
  ],
};

/**
 * Generates a comprehensive assignment based on structured metadata
 * Returns detailed mock content that simulates AI-generated assignments
 */
export async function generateAssignment(metadata: AssignmentMetadata): Promise<{
  content: string;
  metadata: AssignmentMetadata;
  tags: string[];
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Generate tags from metadata
  const tags = generateTagsFromMetadata(metadata);

  let content = `# ${metadata.title}\n\n`;

  // Course/Subject Information
  content += `**Subject:** ${metadata.subject}\n`;
  content += `**Grade Level:** ${metadata.gradeLevel}\n`;
  content += `**Assignment Type:** ${metadata.assignmentType}\n`;
  content += `**Difficulty Level:** ${metadata.difficultyLevel}\n\n`;

  // Main Description
  content += `## Overview\n\n${metadata.description}\n\n`;

  // Learning Objectives
  if (metadata.learningObjectives && metadata.learningObjectives.length > 0) {
    content += `## Learning Objectives\n\nAfter completing this assignment, you will be able to:\n\n`;
    metadata.learningObjectives.forEach(obj => {
      if (obj.trim()) {
        content += `- ${obj}\n`;
      }
    });
    content += `\n`;
  }

  // Time Expectation
  content += `## Time Expectation\n\n`;
  content += `**Estimated Time:** ${metadata.estimatedTimeMinutes} minutes`;
  if (metadata.estimatedTimeMinutes > 60) {
    const hours = Math.floor(metadata.estimatedTimeMinutes / 60);
    const minutes = metadata.estimatedTimeMinutes % 60;
    content += ` (${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''})`;
  }
  content += `\n\n`;

  // Assessment Criteria
  if (metadata.assessmentCriteria && metadata.assessmentCriteria.length > 0) {
    content += `## Grading Criteria\n\nYour work will be evaluated on the following criteria:\n\n`;
    metadata.assessmentCriteria.forEach((criterion, index) => {
      content += `${index + 1}. **${criterion}**\n`;
    });
    content += `\n`;
  }

  // Assignment Details based on type
  const assignmentTypeKey = metadata.assignmentType.toUpperCase().replace(/ /g, '_');
  const examples = mockExamples[assignmentTypeKey] || mockExamples.ESSAY;
  const randomExample = examples[Math.floor(Math.random() * examples.length)];
  
  content += `## Assignment Details\n\n`;
  content += `${randomExample}\n\n`;

  // Required Elements
  if (metadata.requiredElements && metadata.requiredElements.length > 0) {
    content += `## Requirements\n\nYour submission must include:\n\n`;
    metadata.requiredElements.forEach(req => {
      content += `- ${req}\n`;
    });
    content += `\n`;
  }

  // Assessment Criteria (moved to earlier in document as Grading Criteria)

  // Prerequisites/Context
  if (metadata.prerequisites && metadata.prerequisites.length > 0) {
    content += `## Prerequisites\n\nBefore starting, make sure you understand:\n\n`;
    metadata.prerequisites.forEach(prereq => {
      content += `- ${prereq}\n`;
    });
    content += `\n`;
  }

  // Tips for Success
  content += `## Tips for Success\n\n`;
  
  if (metadata.assignmentType.includes('ESSAY') || metadata.assignmentType.includes('RESEARCH')) {
    content += `- **Outline First:** Develop a clear outline with your thesis and main points before writing.\n`;
    content += `- **Use Evidence:** Support all claims with specific examples, quotes, or data from credible sources.\n`;
    content += `- **Cite Your Sources:** Use proper citation format (APA, MLA, or Chicago) throughout.\n`;
  }
  
  if (metadata.assignmentType.includes('PROJECT')) {
    content += `- **Plan Your Timeline:** Break the project into smaller milestones with individual deadlines.\n`;
    content += `- **Test & Iterate:** Build incrementally and test components as you go.\n`;
    content += `- **Document Everything:** Keep records of your process for the reflection component.\n`;
  }
  
  if (metadata.assignmentType.includes('PROBLEM')) {
    content += `- **Work Systematically:** Organize solutions clearly with step-by-step work shown.\n`;
    content += `- **Check Your Work:** Verify answers using different methods when possible.\n`;
    content += `- **Show Reasoning:** Explain why you chose each approach or method.\n`;
  }
  
  if (metadata.assignmentType.includes('PRESENTATION')) {
    content += `- **Tell a Story:** Structure your presentation with a clear narrative arc.\n`;
    content += `- **Practice Out Loud:** Rehearse multiple times to improve delivery and timing.\n`;
    content += `- **Engage Your Audience:** Ask questions and invite participation when appropriate.\n`;
  }
  
  content += `- **Start Early:** Begin this assignment well before the deadline to allow time for revision and feedback.\n`;
  content += `- **Seek Clarity:** If any part of the assignment is unclear, ask your instructor for clarification.\n`;
  content += `- **Review Rubric:** Check the assessment criteria frequently as you work to ensure you're meeting expectations.\n`;
  content += `- **Peer Review:** Exchange work with classmates for feedback before final submission.\n`;
  content += `- **Use Resources:** Take advantage of office hours, tutoring, and library resources.\n\n`;

  // Additional Notes
  if (metadata.additionalNotes) {
    content += `## Additional Notes\n\n${metadata.additionalNotes}\n\n`;
  }

  content += `---\n\n**Good luck!** Remember to start early, ask questions if you're stuck, and review the learning objectives before submitting.\n`;

  return {
    content,
    metadata,
    tags,
  };
}
