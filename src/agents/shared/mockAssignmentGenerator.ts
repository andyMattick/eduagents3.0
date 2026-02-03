/**
 * Mock assignment generator for demo/test purposes
 * Generates realistic assignment content based on input parameters
 */

import { BloomDistribution } from '../types/assignmentTypes';

export interface MockAssignmentInput {
  assignmentType: string;
  gradeLevel: string;
  subject: string;
  title: string;
  instructions: string;
  learningObjectives: string[];
  bloomDistribution: BloomDistribution;
  numberOfQuestions: number;
  rubricCategories: Array<{ name: string; weight: number }>;
  estimatedTimeMinutes: number;
}

export interface GeneratedAssignment {
  title: string;
  type: string;
  gradeLevel: string;
  subject: string;
  instructions: string;
  learningObjectives: string[];
  estimatedTime: number;
  questions: Question[];
  rubric: RubricItem[];
  htmlContent: string;
}

interface Question {
  number: number;
  bloomLevel: string;
  content: string;
  points: number;
}

interface RubricItem {
  category: string;
  weight: number;
  description: string;
  levels: { score: string; descriptor: string }[];
}

const BLOOM_QUESTION_TEMPLATES = {
  Remember: [
    'Define the term "{term}".',
    'List the main {concepts} of {topic}.',
    'What is {factual_question}?',
    'Recall {specific_information} from {topic}.',
    'Identify the key facts about {topic}.',
  ],
  Understand: [
    'Explain why {concept} is important in {context}.',
    'Summarize the main ideas of {topic}.',
    'Describe how {process} works.',
    'What is the relationship between {concept1} and {concept2}?',
    'Classify the following examples into {categories}.',
  ],
  Apply: [
    'Use {skill} to solve the following problem: {problem}.',
    'Apply the concept of {concept} to a new situation.',
    'Demonstrate how to {process} using {materials}.',
    'Show how {principle} applies to {realWorldExample}.',
    'Calculate {math_problem} and explain your work.',
  ],
  Analyze: [
    'Compare and contrast {item1} and {item2}.',
    'Analyze the causes of {event}.',
    'What are the strengths and weaknesses of {argument}?',
    'Break down {complex_concept} into its components.',
    'Examine the evidence for and against {claim}.',
  ],
  Evaluate: [
    'Evaluate the effectiveness of {strategy} in {context}.',
    'Critique the following argument: {argument}.',
    'Justify your position on {controversial_topic}.',
    'Which approach is better: {option1} or {option2}? Defend your answer.',
    'Assess the impact of {change} on {outcome}.',
  ],
  Create: [
    'Design a {project} that demonstrates {concept}.',
    'Create an original {artifact} that shows {understanding}.',
    'Develop a plan to {goal} using {resources}.',
    'Compose a {creative_work} about {topic}.',
    'Invent a solution to {problem}.',
  ],
};

const SUBJECT_CONTEXT: Record<string, { concepts: string; examples: string }> = {
  'English Language Arts': {
    concepts: 'themes, characters, literary devices',
    examples: 'novel, poem, short story, play',
  },
  Mathematics: {
    concepts: 'equations, functions, theorems',
    examples: 'quadratic equation, exponential function, geometric proof',
  },
  Science: {
    concepts: 'concepts, laws, processes',
    examples: 'photosynthesis, chemical reaction, cell division',
  },
  'Social Studies': {
    concepts: 'events, cultures, systems',
    examples: 'revolution, civilization, government',
  },
  default: {
    concepts: 'key ideas and principles',
    examples: 'real-world application',
  },
};

export function generateMockAssignment(input: MockAssignmentInput): GeneratedAssignment {
  const context = SUBJECT_CONTEXT[input.subject] || SUBJECT_CONTEXT.default;
  
  // Generate questions based on Bloom distribution
  const questions = generateQuestions(
    input.bloomDistribution,
    input.numberOfQuestions,
    input.title,
    context
  );

  // Generate rubric items
  const rubric = generateRubric(input.rubricCategories);

  // Create HTML content
  const htmlContent = generateHTML(
    input.title,
    input.instructions,
    input.learningObjectives,
    input.estimatedTimeMinutes,
    questions,
    rubric
  );

  return {
    title: input.title,
    type: input.assignmentType,
    gradeLevel: input.gradeLevel,
    subject: input.subject,
    instructions: input.instructions,
    learningObjectives: input.learningObjectives,
    estimatedTime: input.estimatedTimeMinutes,
    questions,
    rubric,
    htmlContent,
  };
}

function generateQuestions(
  bloomDist: BloomDistribution,
  total: number,
  title: string,
  context: { concepts: string; examples: string }
): Question[] {
  const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const;
  const questions: Question[] = [];
  let questionNum = 1;
  const pointsPerQuestion = Math.round(100 / total);

  for (const level of bloomLevels) {
    const percentage = bloomDist[level as keyof BloomDistribution];
    const count = Math.round((percentage / 100) * total);

    for (let i = 0; i < count; i++) {
      const templates = BLOOM_QUESTION_TEMPLATES[level as keyof typeof BLOOM_QUESTION_TEMPLATES] || [];
      const template = templates[i % templates.length] || `Question about ${level} thinking`;
      
      // Simple placeholder substitution
      const content = template
        .replace('{term}', 'the main concept')
        .replace('{concepts}', context.concepts)
        .replace('{topic}', title.split(' ').slice(0, 3).join(' '))
        .replace('{process}', 'the process')
        .replace('{problem}', 'the given problem')
        .replace('{item1}', 'option A')
        .replace(/{item2}/g, 'option B')
        .replace('{argument}', 'the proposed argument')
        .replace('{event}', 'the event')
        .replace(/{.*?}/g, 'the concept'); // Fallback for any remaining placeholders

      questions.push({
        number: questionNum++,
        bloomLevel: level,
        content,
        points: pointsPerQuestion,
      });
    }
  }

  return questions.slice(0, total); // Ensure we have exactly 'total' questions
}

function generateRubric(
  categories: Array<{ name: string; weight: number }>
): RubricItem[] {
  const scoreDescriptors = [
    { score: 'Exceeds Expectations', descriptor: 'Demonstrates excellent understanding with clear, detailed, and original thinking.' },
    { score: 'Meets Expectations', descriptor: 'Demonstrates solid understanding with clear and accurate work.' },
    { score: 'Approaches Expectations', descriptor: 'Demonstrates developing understanding with some clarity and effort.' },
    { score: 'Below Expectations', descriptor: 'Does not yet demonstrate adequate understanding.' },
  ];

  return categories.map((cat) => ({
    category: cat.name,
    weight: cat.weight,
    description: `Evaluate the quality of ${cat.name.toLowerCase()} in the assignment.`,
    levels: scoreDescriptors,
  }));
}

function generateHTML(
  title: string,
  instructions: string,
  objectives: string[],
  estimatedTime: number,
  questions: Question[],
  rubric: RubricItem[]
): string {
  const objectivesList = objectives.map((obj) => `<li>${obj}</li>`).join('');
  const questionsList = questions
    .map(
      (q) =>
        `<div style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #007bff;">
          <strong>${q.number}. [${q.bloomLevel}]</strong> ${q.content} (${q.points} points)
        </div>`
    )
    .join('');

  const rubricTable = rubric
    .map(
      (r) =>
        `<tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>${r.category}</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.weight}%</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 12px;">${r.description}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1 style="color: #007bff; border-bottom: 3px solid #007bff; padding-bottom: 8px;">${title}</h1>
      
      <div style="background: #f0f7ff; padding: 16px; border-radius: 4px; margin: 16px 0;">
        <p><strong>Estimated Time:</strong> ${estimatedTime} minutes</p>
        <p><strong>Instructions:</strong> ${instructions}</p>
      </div>

      <h2>Learning Objectives</h2>
      <ul>${objectivesList}</ul>

      <h2>Questions</h2>
      ${questionsList}

      <h2>Grading Rubric</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px;">Category</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Weight</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
          </tr>
        </thead>
        <tbody>${rubricTable}</tbody>
      </table>
    </div>
  `;
}
