/**
 * Assignment type definitions with default instructions and Bloom's taxonomy distributions
 */

export interface BloomDistribution {
  Remember: number;
  Understand: number;
  Apply: number;
  Analyze: number;
  Evaluate: number;
  Create: number;
}

export interface AssignmentTypeTemplate {
  id: string;
  label: string;
  emoji: string;
  defaultInstructions: string;
  bloomDistribution: BloomDistribution;
  suggestedQuestionCount: number;
  suggestedRubricCategories: string[];
  estimatedTimeMinutes: number;
}

// Comprehensive assignment types with defaults
export const ASSIGNMENT_TYPES: Record<string, AssignmentTypeTemplate> = {
  essay: {
    id: 'essay',
    label: 'Essay',
    emoji: '📝',
    defaultInstructions:
      'Write a detailed essay explaining or analyzing the following topic. Include an introduction, well-developed body paragraphs, and a conclusion.',
    bloomDistribution: {
      Remember: 5,
      Understand: 20,
      Apply: 20,
      Analyze: 30,
      Evaluate: 15,
      Create: 10,
    },
    suggestedQuestionCount: 1,
    suggestedRubricCategories: ['Clarity', 'Analysis & Critical Thinking', 'Evidence & Support', 'Organization', 'Grammar & Style'],
    estimatedTimeMinutes: 60,
  },
  comprehensionCheck: {
    id: 'comprehensionCheck',
    label: 'Comprehension Check',
    emoji: '❓',
    defaultInstructions:
      'Answer the following questions to demonstrate your understanding of the material. Be concise and accurate.',
    bloomDistribution: {
      Remember: 60,
      Understand: 30,
      Apply: 10,
      Analyze: 0,
      Evaluate: 0,
      Create: 0,
    },
    suggestedQuestionCount: 10,
    suggestedRubricCategories: ['Accuracy', 'Completeness', 'Clarity'],
    estimatedTimeMinutes: 15,
  },
  quiz: {
    id: 'quiz',
    label: 'Quiz',
    emoji: '📋',
    defaultInstructions:
      'Choose the best answer or complete each item below. This quick assessment checks your understanding of key concepts.',
    bloomDistribution: {
      Remember: 40,
      Understand: 30,
      Apply: 20,
      Analyze: 10,
      Evaluate: 0,
      Create: 0,
    },
    suggestedQuestionCount: 15,
    suggestedRubricCategories: ['Accuracy', 'Completeness'],
    estimatedTimeMinutes: 20,
  },
  test: {
    id: 'test',
    label: 'Test',
    emoji: '🧪',
    defaultInstructions:
      'Complete the following test. Show all work where applicable. This assessment covers all major concepts and skills.',
    bloomDistribution: {
      Remember: 30,
      Understand: 30,
      Apply: 20,
      Analyze: 20,
      Evaluate: 0,
      Create: 0,
    },
    suggestedQuestionCount: 20,
    suggestedRubricCategories: ['Accuracy', 'Problem Solving', 'Completeness', 'Organization'],
    estimatedTimeMinutes: 60,
  },
  project: {
    id: 'project',
    label: 'Project',
    emoji: '🚀',
    defaultInstructions:
      'Create a product or presentation that demonstrates your understanding and application of the following concepts. Be creative and thorough.',
    bloomDistribution: {
      Remember: 5,
      Understand: 20,
      Apply: 30,
      Analyze: 20,
      Evaluate: 10,
      Create: 15,
    },
    suggestedQuestionCount: 1,
    suggestedRubricCategories: ['Creativity & Originality', 'Technical Quality', 'Evidence & Support', 'Organization', 'Presentation'],
    estimatedTimeMinutes: 180,
  },
  game: {
    id: 'game',
    label: 'Game',
    emoji: '🎮',
    defaultInstructions:
      'Play or design a game that reinforces the following concepts. Reflect on what you learned and how you applied the skills.',
    bloomDistribution: {
      Remember: 10,
      Understand: 20,
      Apply: 30,
      Analyze: 30,
      Evaluate: 10,
      Create: 0,
    },
    suggestedQuestionCount: 5,
    suggestedRubricCategories: ['Engagement', 'Problem Solving', 'Reflection', 'Creativity'],
    estimatedTimeMinutes: 45,
  },
  notes: {
    id: 'notes',
    label: 'Notes',
    emoji: '📓',
    defaultInstructions:
      'Take structured notes on the following material. Use headings, bullet points, and your own words to organize key concepts.',
    bloomDistribution: {
      Remember: 40,
      Understand: 50,
      Apply: 10,
      Analyze: 0,
      Evaluate: 0,
      Create: 0,
    },
    suggestedQuestionCount: 3,
    suggestedRubricCategories: ['Clarity', 'Organization', 'Completeness', 'Accuracy'],
    estimatedTimeMinutes: 30,
  },
  labReport: {
    id: 'labReport',
    label: 'Lab Report',
    emoji: '🔬',
    defaultInstructions:
      'Conduct the experiment and write a report including hypothesis, methods, results, and conclusions. Include data analysis and interpretation.',
    bloomDistribution: {
      Remember: 10,
      Understand: 20,
      Apply: 40,
      Analyze: 20,
      Evaluate: 10,
      Create: 0,
    },
    suggestedQuestionCount: 1,
    suggestedRubricCategories: ['Methodology', 'Data Analysis', 'Conclusions', 'Scientific Writing', 'Accuracy'],
    estimatedTimeMinutes: 120,
  },
  debate: {
    id: 'debate',
    label: 'Debate',
    emoji: '⚖️',
    defaultInstructions:
      'Prepare arguments for and against the following topic. Be ready to defend your stance using evidence and logical reasoning.',
    bloomDistribution: {
      Remember: 10,
      Understand: 20,
      Apply: 20,
      Analyze: 30,
      Evaluate: 20,
      Create: 0,
    },
    suggestedQuestionCount: 2,
    suggestedRubricCategories: ['Argument Strength', 'Evidence & Support', 'Clarity', 'Respectfulness', 'Responsiveness'],
    estimatedTimeMinutes: 45,
  },
  presentation: {
    id: 'presentation',
    label: 'Presentation',
    emoji: '🎤',
    defaultInstructions:
      'Create a visual and oral presentation on the following topic. Include key concepts, examples, and insights to engage your audience.',
    bloomDistribution: {
      Remember: 10,
      Understand: 20,
      Apply: 30,
      Analyze: 20,
      Evaluate: 10,
      Create: 10,
    },
    suggestedQuestionCount: 1,
    suggestedRubricCategories: ['Content Accuracy', 'Visual Design', 'Delivery & Presentation', 'Engagement', 'Organization'],
    estimatedTimeMinutes: 90,
  },
  reflection: {
    id: 'reflection',
    label: 'Reflection',
    emoji: '💭',
    defaultInstructions:
      'Write a personal reflection on your learning experience. Consider what you learned, how you grew, and what you would do differently.',
    bloomDistribution: {
      Remember: 20,
      Understand: 40,
      Apply: 10,
      Analyze: 20,
      Evaluate: 10,
      Create: 0,
    },
    suggestedQuestionCount: 3,
    suggestedRubricCategories: ['Thoughtfulness', 'Self-Awareness', 'Growth Mindset', 'Clarity', 'Honesty'],
    estimatedTimeMinutes: 30,
  },
};

// Commonly suggested learning objectives by subject
export const SUGGESTED_OBJECTIVES_BY_SUBJECT: Record<string, string[]> = {
  'English Language Arts': [
    'Critical Reading & Analysis',
    'Clear Communication',
    'Literary Interpretation',
    'Research & Evidence',
    'Creative Writing',
  ],
  Mathematics: [
    'Problem Solving',
    'Mathematical Reasoning',
    'Computational Fluency',
    'Application to Real-World',
    'Mathematical Communication',
  ],
  Science: [
    'Scientific Inquiry',
    'Data Analysis',
    'Hypothesis Formation',
    'Evidence-Based Reasoning',
    'Critical Thinking',
  ],
  'Social Studies': [
    'Historical Analysis',
    'Civic Understanding',
    'Evidence-Based Reasoning',
    'Perspective Taking',
    'Critical Thinking',
  ],
  'Art & Design': [
    'Creative Expression',
    'Technical Skill',
    'Artistic Analysis',
    'Original Thinking',
    'Aesthetic Appreciation',
  ],
  'Physical Education': [
    'Physical Fitness',
    'Motor Skills',
    'Teamwork & Collaboration',
    'Health Awareness',
    'Self-Management',
  ],
  default: [
    'Critical Thinking',
    'Clear Communication',
    'Problem Solving',
    'Collaboration',
    'Creativity & Innovation',
  ],
};

// Grade level considerations for question counts
export const QUESTION_COUNT_BY_GRADE = {
  'K-2': { base: 3, max: 5 },
  '3-5': { base: 5, max: 10 },
  '6-8': { base: 8, max: 15 },
  '9-10': { base: 10, max: 20 },
  '11-12': { base: 12, max: 25 },
  College: { base: 15, max: 30 },
};
