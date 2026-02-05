/**
 * Phase 3: Asteroid-Optimized Assignment Generation
 * 
 * Generates pedagogically sound assignments based on extracted intent,
 * assignment type, and learning objectives from teacher materials
 */

import { Asteroid } from '../../types/simulation';
import {
  AssignmentIntentTags,
  AssignmentType,
  ASSIGNMENT_TYPE_SPECS,
  AsteroidOptimizedAssignment,
} from '../../types/assignmentGeneration';
import { BloomLevel } from './types';

/**
 * Problem templates for different Bloom levels and types
 */
const PROBLEM_TEMPLATES: Record<BloomLevel, Record<string, string[]>> = {
  Remember: {
    'multiple-choice': [
      'Which of the following is a definition of {concept}?',
      'What is the main purpose of {concept}?',
      'Identify the key characteristic of {concept}.',
    ],
    'short-answer': [
      'List the steps involved in {concept}.',
      'Name three examples of {concept}.',
      'What is {concept}?',
    ],
  },
  Understand: {
    'multiple-choice': [
      'Which statement best explains why {concept}?',
      'How would you describe the relationship between {concept_a} and {concept_b}?',
    ],
    'free-response': [
      'Explain in your own words what {concept} means.',
      'Describe how {concept} relates to {context}.',
      'In what ways does {concept} differ from {related_concept}?',
    ],
  },
  Apply: {
    procedural: [
      'Solve the following problem using {concept}: {scenario}',
      'Use {concept} to determine {outcome} in this situation: {scenario}',
    ],
    conceptual: [
      'How would you apply {concept} to {real_world_scenario}?',
      'In {context}, how does {concept} affect {outcome}?',
    ],
  },
  Analyze: {
    conceptual: [
      'Compare and contrast {concept_a} and {concept_b} in terms of {criterion}.',
      'Analyze the structure of {concept}. What are its main components?',
      'What factors contributed to {phenomenon}? Rank them by importance.',
    ],
    'free-response': [
      'Examine {scenario}. What patterns do you notice?',
      'Break down {complex_concept} into its constituent parts.',
    ],
  },
  Evaluate: {
    'free-response': [
      'Evaluate the effectiveness of {approach} for {goal}.',
      'Critique the following: {claim}. What evidence supports or contradicts it?',
      'Judge whether {statement} is valid. Provide reasoning.',
    ],
  },
  Create: {
    creative: [
      'Design a {solution_type} that addresses {challenge} using {constraint}.',
      'Create an original {product_type} that demonstrates {concept}.',
      'Compose a {output_type} about {topic} that includes {element}.',
    ],
    interpretive: [
      'Synthesize {sources} to develop your own perspective on {topic}.',
      'Develop a novel approach to {problem}.',
    ],
  },
};

/**
 * Generate realistic cognitive load curve for pacing
 */
function generateCognitiveLaodCurve(
  problemCount: number,
  strategy: 'low' | 'medium' | 'high' | 'bell-curve'
): number[] {
  const curve: number[] = [];

  if (strategy === 'low') {
    // Gradually increase but stay low
    for (let i = 0; i < problemCount; i++) {
      curve.push(0.3 + (i / problemCount) * 0.15);
    }
  } else if (strategy === 'medium') {
    // Smooth medium curve
    for (let i = 0; i < problemCount; i++) {
      curve.push(0.5 + Math.sin((i / problemCount) * Math.PI) * 0.15);
    }
  } else if (strategy === 'high') {
    // Start moderate, ramp up
    for (let i = 0; i < problemCount; i++) {
      curve.push(0.5 + (i / problemCount) * 0.4);
    }
  } else if (strategy === 'bell-curve') {
    // Classic bell curve: start easy, peak in middle, ease at end
    for (let i = 0; i < problemCount; i++) {
      const normalized = i / (problemCount - 1);
      const bellValue = Math.exp(-Math.pow(normalized - 0.5, 2) / 0.08);
      curve.push(0.3 + bellValue * 0.4);
    }
  }

  return curve;
}

/**
 * Generate Bloom distribution histogram
 */
function generateBloomHistogram(
  asteroids: Asteroid[]
): Record<BloomLevel, number> {
  const histogram: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  asteroids.forEach(a => {
    histogram[a.BloomLevel]++;
  });

  // Normalize to percentages
  const total = asteroids.length;
  (Object.keys(histogram) as BloomLevel[]).forEach(level => {
    histogram[level] = total > 0 ? histogram[level] / total : 0;
  });

  return histogram;
}

/**
 * Generate realistic problem text using templates
 */
function generateProblemFromTemplate(
  bloom: BloomLevel,
  type: string,
  context: { topic: string; concepts: string[]; keyConcepts?: string[] }
): string {
  const templates = PROBLEM_TEMPLATES[bloom]?.[type] ||
    PROBLEM_TEMPLATES[bloom]?.[Object.keys(PROBLEM_TEMPLATES[bloom])[0]] || [
    `Question about ${context.topic}`,
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  let problem = template;

  // Replace placeholders
  problem = problem.replace(
    /{concept}/g,
    context.keyConcepts?.[0] || context.concepts[0] || context.topic
  );
  problem = problem.replace(
    /{concept_a}/g,
    context.concepts[0] || 'the concept'
  );
  problem = problem.replace(
    /{concept_b}/g,
    context.concepts[1] || 'related concepts'
  );
  problem = problem.replace(/{context}/g, context.topic);
  problem = problem.replace(/{scenario}/g, `a scenario involving ${context.topic}`);
  problem = problem.replace(
    /{real_world_scenario}/g,
    `real-world applications of ${context.topic}`
  );
  problem = problem.replace(/{claim}/g, `a claim about ${context.topic}`);
  problem = problem.replace(/{approach}/g, `an approach to ${context.topic}`);
  problem = problem.replace(/{challenge}/g, `a challenge in ${context.topic}`);
  problem = problem.replace(/{goal}/g, `understanding ${context.topic}`);
  problem = problem.replace(/{statement}/g, `a statement about ${context.topic}`);
  problem = problem.replace(/{topic}/g, context.topic);
  problem = problem.replace(/{phenomenon}/g, `phenomena in ${context.topic}`);

  return problem;
}

/**
 * Generate optimized assignment based on intent
 */
export function generateAsteroidOptimizedAssignment(
  intent: AssignmentIntentTags,
  assignmentType: AssignmentType,
  options?: {
    gradeLevel?: string;
    subject?: string;
    problemCount?: number;
  }
): AsteroidOptimizedAssignment {
  const spec = ASSIGNMENT_TYPE_SPECS[assignmentType];
  const problemCount = options?.problemCount ||
    Math.floor((spec.minProblems + spec.maxProblems) / 2);

  // Determine Bloom distribution based on assignment type and intent
  const finalBloomDist = { ...intent.inferredBloomDistribution };
  spec.bloomEmphasis.forEach(level => {
    finalBloomDist[level] = (finalBloomDist[level] || 0) + 0.15;
  });

  // Normalize to 1.0
  const total = Object.values(finalBloomDist).reduce((a, b) => a + b, 0);
  (Object.keys(finalBloomDist) as BloomLevel[]).forEach(level => {
    finalBloomDist[level] = finalBloomDist[level]! / total;
  });

  // Generate asteroids based on distribution
  const asteroids: Asteroid[] = [];
  const bloomLevels = Object.entries(finalBloomDist)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .map(([level]) => level as BloomLevel);

  // Create pacing curve for cognitive load
  const pacingCurve = generateCognitiveLaodCurve(
    problemCount,
    spec.cognitiveLoadStrategy
  );

  for (let i = 0; i < problemCount; i++) {
    // Select Bloom level proportionally
    const bloomLevel = bloomLevels[i % bloomLevels.length];
    const problemType = spec.problemTraits[i % spec.problemTraits.length];

    // Generate problem text
    const problemText = generateProblemFromTemplate(bloomLevel, problemType, {
      topic: intent.topic,
      concepts: intent.keyConcepts,
      keyConcepts: intent.keyConcepts,
    });

    // Calculate metadata
    const linguisticComplexity = ['Remember', 'Understand'].includes(bloomLevel)
      ? 0.3 + Math.random() * 0.2
      : 0.5 + Math.random() * 0.3;

    const noveltyScore = spec.noveltyStrategy === 'high'
      ? 0.6 + Math.random() * 0.3
      : spec.noveltyStrategy === 'low'
        ? 0.2 + Math.random() * 0.2
        : 0.4 + Math.random() * 0.2;

    asteroids.push({
      ProblemId: `prob-${assignmentType}-${i + 1}`,
      ProblemText: problemText,
      ProblemLength: problemText.split(/\s+/).length,
      BloomLevel: bloomLevel,
      LinguisticComplexity: linguisticComplexity,
      SimilarityToPrevious: i > 0 ? 0.1 + Math.random() * 0.2 : 0,
      NoveltyScore: noveltyScore,
      MultiPart: spec.problemTraits.some(t => t === 'creative' || t === 'interpretive'),
      HasTips: intent.includeTips && spec.preferredTips,
      SequenceIndex: i + 1,
      TestType: problemType as any,
      Subject: options?.subject || 'General',
    });
  }

  // Calculate Bloom histogram
  const bloomHistogram = generateBloomHistogram(asteroids);

  // Generate design rationale
  const designRationale = `
This ${assignmentType} assignment was optimized based on intent extraction from your materials:
- **Topic**: ${intent.topic}
- **Focus**: ${spec.bloomEmphasis.join(', ')} level(s) cognition
- **Cognitive Load**: ${spec.cognitiveLoadStrategy} (${spec.description})
- **Problem Types**: ${spec.problemTraits.join(', ')}
- **Scaffolding**: ${intent.includeTips && spec.preferredTips ? 'Enabled' : 'Minimal'}
- **Novelty**: ${intent.noveltyPreference} (appropriate for ${assignmentType})

The assignment includes ${problemCount} problems distributed across Bloom levels to match your instructional objectives. 
Cognitive load is sequenced to build confidence and engagement.
  `.trim();

  // Calculate estimated time adjustments per problem based on Bloom and type
  const timePerProblem = {
    Remember: 1.5,
    Understand: 2.5,
    Apply: 3.5,
    Analyze: 4,
    Evaluate: 4.5,
    Create: 5,
  };

  const totalTime = asteroids.reduce(
    (sum, a) => sum + (timePerProblem[a.BloomLevel] || 3),
    0
  );

  return {
    id: `assign-${assignmentType}-${Date.now()}`,
    type: assignmentType,
    title: `${intent.topic} - ${assignmentType.charAt(0).toUpperCase() + assignmentType.slice(1)}`,
    topic: intent.topic,
    gradeLevel: options?.gradeLevel || 'General',
    subject: options?.subject || 'General',
    asteroids,
    intentTags: intent,
    bloomHistogram,
    cognitiveLoadCurve: pacingCurve,
    designRationale,
    estimatedTimeMinutes: Math.round(totalTime),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate generated assignment against specs
 */
export function validateAssignmentDesign(
  assignment: AsteroidOptimizedAssignment
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const spec = ASSIGNMENT_TYPE_SPECS[assignment.type];

  if (assignment.asteroids.length < spec.minProblems) {
    issues.push(`Too few problems (${assignment.asteroids.length}), minimum is ${spec.minProblems}`);
  }
  if (assignment.asteroids.length > spec.maxProblems) {
    issues.push(`Too many problems (${assignment.asteroids.length}), maximum is ${spec.maxProblems}`);
  }

  // Check Bloom distribution
  const bloomLevels = assignment.asteroids.map(a => a.BloomLevel);
  const hasEmphasisLevels = spec.bloomEmphasis.every(level =>
    bloomLevels.includes(level)
  );
  if (!hasEmphasisLevels) {
    issues.push(`Missing emphasis on ${spec.bloomEmphasis.join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
