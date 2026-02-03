/**
 * Assignment Metadata - Structured data that flows through the entire pipeline
 * Ensures consistency across generation, analysis, student feedback, and rewrites
 */

export enum GradeLevel {
  ELEMENTARY = 'elementary',
  MIDDLE_SCHOOL = 'middle-school',
  HIGH_SCHOOL = 'high-school',
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
}

export enum AssignmentType {
  ESSAY = 'essay',
  RESEARCH_PAPER = 'research-paper',
  ANALYSIS = 'analysis',
  PROJECT = 'project',
  CREATIVE_WRITING = 'creative-writing',
  CASE_STUDY = 'case-study',
  PROBLEM_SET = 'problem-set',
  PRESENTATION = 'presentation',
  REFLECTION = 'reflection',
  DEBATE = 'debate',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export interface AssignmentMetadata {
  // Core Details
  title: string;
  description: string;
  topic: string;
  assignmentType: AssignmentType;
  gradeLevel: GradeLevel;
  difficultyLevel: DifficultyLevel;

  // Time & Scope
  estimatedTimeMinutes: number;
  totalWordCount?: number;
  numPages?: number;

  // Learning Objectives
  learningObjectives: string[]; // e.g., "Analyze cause and effect", "Evaluate sources"

  // Requirements
  requiredElements: string[]; // e.g., "Minimum 5 sources", "Include citations", "Supporting evidence"
  assessmentCriteria: string[]; // e.g., "Clarity", "Organization", "Evidence", "Critical thinking"

  // Context
  subject?: string;
  unit?: string;
  prerequisites?: string[];

  // Additional notes
  additionalNotes?: string;
}

export interface PromptGuidanceEntry {
  field: keyof AssignmentMetadata;
  label: string;
  description: string;
  placeholder: string;
  examples: string[];
  required: boolean;
  helperText?: string;
}

export const PROMPT_GUIDANCE: Record<string, PromptGuidanceEntry> = {
  title: {
    field: 'title',
    label: 'Assignment Title',
    description: 'Short, descriptive title for the assignment',
    placeholder: 'e.g., Climate Change Impact Analysis',
    examples: [
      'Historical Figure Biography Research',
      'Persuasive Essay on Social Justice',
      'Data Analysis Project',
    ],
    required: true,
    helperText: 'This should be clear and capture the essence of the task.',
  },
  topic: {
    field: 'topic',
    label: 'Main Topic/Subject',
    description: 'The core topic students will focus on',
    placeholder: 'e.g., Environmental science, American history, Microeconomics',
    examples: [
      'Climate change and agriculture',
      'The Renaissance period in European history',
      'Probability and statistics in real-world applications',
    ],
    required: true,
    helperText: 'Be specific enough to guide students but broad enough to allow exploration.',
  },
  description: {
    field: 'description',
    label: 'Assignment Description',
    description: 'Detailed explanation of what students need to do',
    placeholder: 'Describe the task, context, and expectations...',
    examples: [
      'Students will analyze 3+ academic sources to understand how climate change affects farming practices.',
      'Create a multimedia presentation comparing two revolutionary movements.',
      'Design an experiment to test a hypothesis about human behavior.',
    ],
    required: true,
    helperText:
      'Include the main task, any specific constraints, and what students should deliver.',
  },
  learningObjectives: {
    field: 'learningObjectives',
    label: 'Learning Objectives',
    description: 'What should students be able to do after completing this assignment?',
    placeholder: 'e.g., Analyze cause-effect relationships, Evaluate source credibility',
    examples: [
      'Identify and explain key concepts',
      'Synthesize information from multiple sources',
      'Apply theoretical frameworks to real-world problems',
      'Evaluate evidence and construct arguments',
    ],
    required: true,
    helperText:
      'Use action verbs (analyze, evaluate, synthesize, create). Typically 2-5 objectives.',
  },
  requiredElements: {
    field: 'requiredElements',
    label: 'Required Elements/Components',
    description: 'Specific requirements students must include',
    placeholder: 'e.g., Minimum 5 sources, Include citations, 2-3 page length',
    examples: [
      'Minimum 5 peer-reviewed academic sources',
      'Proper MLA or APA citations',
      '1500-2000 words',
      'At least 3 counterarguments',
      'Visual aids or diagrams',
      'Executive summary',
    ],
    required: false,
    helperText:
      'Be specific about formats, length, sources, citations, and any deliverables.',
  },
  assessmentCriteria: {
    field: 'assessmentCriteria',
    label: 'Assessment Criteria (How it will be graded)',
    description: 'What will you evaluate?',
    placeholder: 'e.g., Clarity of thesis, Quality of evidence, Organization',
    examples: [
      'Clarity and thesis strength',
      'Quality and relevance of evidence',
      'Critical thinking and analysis',
      'Organization and structure',
      'Writing mechanics and style',
      'Proper citations and source evaluation',
    ],
    required: true,
    helperText: 'These become the basis for feedback and grading rubrics.',
  },
};

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  [GradeLevel.ELEMENTARY]: '📚 Elementary School (K-5)',
  [GradeLevel.MIDDLE_SCHOOL]: '📖 Middle School (6-8)',
  [GradeLevel.HIGH_SCHOOL]: '✏️ High School (9-12)',
  [GradeLevel.UNDERGRADUATE]: '🎓 Undergraduate',
  [GradeLevel.GRADUATE]: '🏆 Graduate/Professional',
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  [AssignmentType.ESSAY]: '📝 Essay (Opinion, Persuasive, Analytical)',
  [AssignmentType.RESEARCH_PAPER]: '🔬 Research Paper (Formal, Academic)',
  [AssignmentType.ANALYSIS]: '🔍 Analysis (Breakdown, Examination)',
  [AssignmentType.PROJECT]: '🛠️ Project (Creative, Applied)',
  [AssignmentType.CREATIVE_WRITING]: '✨ Creative Writing (Fiction, Poetry, Narrative)',
  [AssignmentType.CASE_STUDY]: '📋 Case Study (Real-world Application)',
  [AssignmentType.PROBLEM_SET]: '➕ Problem Set (Math, Science, Logic)',
  [AssignmentType.PRESENTATION]: '🎤 Presentation (Oral, Visual)',
  [AssignmentType.REFLECTION]: '💭 Reflection (Self-assessment, Learning Journal)',
  [AssignmentType.DEBATE]: '🎭 Debate (Argumentation, Discussion)',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  [DifficultyLevel.BEGINNER]:
    '⭐ Beginner (Foundational concepts, simple tasks)',
  [DifficultyLevel.INTERMEDIATE]:
    '⭐⭐ Intermediate (Build on basics, some synthesis)',
  [DifficultyLevel.ADVANCED]:
    '⭐⭐⭐ Advanced (Complex analysis, original thinking)',
  [DifficultyLevel.EXPERT]:
    '⭐⭐⭐⭐ Expert (Cutting-edge, novel insights)',
};

export const TIME_ESTIMATES: Record<GradeLevel, number[]> = {
  [GradeLevel.ELEMENTARY]: [15, 30, 45],
  [GradeLevel.MIDDLE_SCHOOL]: [30, 60, 120],
  [GradeLevel.HIGH_SCHOOL]: [45, 120, 240],
  [GradeLevel.UNDERGRADUATE]: [120, 240, 480],
  [GradeLevel.GRADUATE]: [240, 480, 960],
};

/**
 * Generate tags based on assignment metadata
 * These tags will be used consistently in analysis, student feedback, and rewriting
 */
export function generateTagsFromMetadata(metadata: AssignmentMetadata): string[] {
  const tags: string[] = [];

  // Grade level tag
  tags.push(`grade:${metadata.gradeLevel}`);

  // Assignment type tags
  tags.push(`type:${metadata.assignmentType}`);

  // Difficulty tag
  tags.push(`difficulty:${metadata.difficultyLevel}`);

  // Learning objective tags
  metadata.learningObjectives.forEach(objective => {
    const lowerObj = objective.toLowerCase();
    if (lowerObj.includes('analyze') || lowerObj.includes('analysis')) {
      tags.push('skill:analysis');
    }
    if (lowerObj.includes('evaluate') || lowerObj.includes('critical')) {
      tags.push('skill:critical-thinking');
    }
    if (lowerObj.includes('synthesize') || lowerObj.includes('combine')) {
      tags.push('skill:synthesis');
    }
    if (lowerObj.includes('create') || lowerObj.includes('design')) {
      tags.push('skill:creativity');
    }
    if (lowerObj.includes('apply') || lowerObj.includes('practical')) {
      tags.push('skill:application');
    }
  });

  // Time-based tags
  if (metadata.estimatedTimeMinutes <= 30) {
    tags.push('duration:short');
  } else if (metadata.estimatedTimeMinutes <= 120) {
    tags.push('duration:medium');
  } else {
    tags.push('duration:long');
  }

  // Scope tags
  if (metadata.requiredElements.length > 0) {
    tags.push('has:requirements');
  }
  if (metadata.learningObjectives.length > 2) {
    tags.push('complexity:high');
  }

  // Research-related tags
  const allText = (
    metadata.description
    + metadata.topic
    + metadata.requiredElements.join(' ')
  ).toLowerCase();
  if (
    allText.includes('research')
    || allText.includes('source')
    || allText.includes('evidence')
  ) {
    tags.push('research-based');
  }
  if (allText.includes('collaborate') || allText.includes('group')) {
    tags.push('collaborative');
  }
  if (
    allText.includes('creative')
    || allText.includes('original')
    || allText.includes('design')
  ) {
    tags.push('creative');
  }

  return Array.from(new Set(tags)); // Remove duplicates
}

/**
 * Generate helpful prompt examples based on metadata
 */
export function getExamplePrompts(): string[] {
  return [
    'Create an analytical essay for high school students examining the causes and effects of the American Revolution',
    'Design a research paper assignment for undergraduates analyzing climate change impacts on coastal ecosystems',
    'Write a creative writing prompt for middle schoolers to develop a short story with fantasy elements',
    'Develop a case study assignment for business students analyzing company strategy and market positioning',
    'Create a problem set for calculus students focusing on derivatives and applications',
    'Design a presentation project for elementary students showcasing their favorite inventor',
  ];
}
