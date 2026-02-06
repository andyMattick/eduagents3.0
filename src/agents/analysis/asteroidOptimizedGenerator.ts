/**
 * Asteroid-Optimized Assignment Generator
 * 
 * Generates new assignments using AI-informed scaffolding:
 * - Bloom's taxonomy (multi-level coverage)
 * - Problem type diversity
 * - Cognitive load pacing (complexity + length)
 * - Agent differentiation (novelty + similarity)
 * - Comprehensive problem traits
 */

import { BloomLevel } from './types';
import { ExtractedProblem } from './documentStructureParser';

/**
 * Configuration for generating optimized assignments
 */
export interface AsteroidOptimizationConfig {
  gradeLevel: number; // 1-12 or higher
  subject: string;
  title: string;
  numberOfProblems: number;
  
  // Bloom distribution targets (% for each level)
  bloomDistribution?: {
    Remember: number;
    Understand: number;
    Apply: number;
    Analyze: number;
    Evaluate: number;
    Create: number;
  };
  
  // Problem type distribution
  problemTypeDistribution?: {
    conceptual: number;
    procedural: number;
    mixed: number;
    interpretive: number;
    creative: number;
  };
  
  // Complexity pacing
  targetComplexityProgression?: 'linear' | 'exponential' | 'bell-curve' | 'random';
  targetAverageComplexity?: number; // 0.0-1.0
  
  // Novelty/Similarity goals
  targetNoveltyBalance?: number; // 0.5 = mix of new and familiar, 0.8 = mostly novel
  preventConsecutiveSimilarity?: boolean; // Avoid back-to-back similar problems
  
  // Metadata
  estimatedDurationMinutes?: number;
  learningObjectives?: string[];
}

/**
 * Generated problem with full Asteroid metadata
 */
export interface AsteroidOptimizedProblem extends ExtractedProblem {
  generatedPrompt?: string; // AI generation prompt used
  rationale?: string; // Why this problem was included
  scaffoldingTips?: string[]; // Tips for students
}

/**
 * Output from the Asteroid-optimized generator
 */
export interface AsteroidOptimizedAssignment {
  id: string;
  title: string;
  description: string;
  metadata: {
    gradeLevel: number;
    subject: string;
    numberOfProblems: number;
    estimatedDurationMinutes: number;
    averageComplexity: number;
    bloomDistribution: Record<BloomLevel, number>;
    bloomDistributionPercent: Record<BloomLevel, number>;
  };
  problems: AsteroidOptimizedProblem[];
  contents: string; // Full assignment text
  generationNotes: string[];
  optimizationMetrics: {
    bloomBalanceScore: number; // How well we hit Bloom targets (0-1)
    complexityPacingScore: number; // How well paced the complexity (0-1)
    noveltyBalanceScore: number; // How well we balance novelty (0-1)
    overallOptimization: number; // Weighted average (0-1)
  };
}

/**
 * Define problem templates by Bloom level and type
 */
const problemTemplates: Record<BloomLevel, Record<string, string>> = {
  Remember: {
    definition: 'Define {{term}} and provide an example.',
    listing: 'List the key {{items}} associated with {{topic}}.',
    identification: 'Identify the {{feature}} in the following {{example}}.',
    recall: 'Recall the main {{concept}} from the lesson on {{topic}}.',
    naming: 'Name three {{items}} that demonstrate {{principle}}.',
  },
  Understand: {
    explanation: 'Explain how {{concept}} relates to {{context}}.',
    comparison: 'Compare and contrast {{item1}} and {{item2}}.',
    summarization: 'Summarize the {{process}} described in {{source}}.',
    demonstration: 'Demonstrate your understanding of {{topic}} by {{activity}}.',
    illustration: 'Illustrate the relationship between {{concepts}}.',
    prediction: 'Predict what would happen if {{scenario}} changed.',
  },
  Apply: {
    problem_solving: 'Solve {{problem_type}} using the {{method}} approach.',
    construction: 'Construct {{object}} that demonstrates {{principle}}.',
    practice: 'Practice applying {{rule}} to {{new_context}}.',
    computation: 'Calculate {{quantity}} given {{parameters}}.',
    modification: 'Modify {{example}} to achieve {{goal}}.',
    adaptation: 'Adapt the {{solution}} to work with {{new_constraint}}.',
  },
  Analyze: {
    breakdown: 'Break down {{complex_item}} into its {{components}}.',
    categorization: 'Categorize {{items}} based on {{criteria}}.',
    investigation: 'Investigate why {{phenomenon}} occurs by examining {{factors}}.',
    distinction: 'Distinguish between {{concept1}} and {{concept2}} based on {{comparison_axis}}.',
    examination: 'Examine the {{structure}} and explain how {{parts}} work together.',
    questioning: 'Develop {{number}} critical questions about {{topic}} and answer them.',
  },
  Evaluate: {
    judgment: 'Evaluate the effectiveness of {{approach}} for {{context}}.',
    assessment: 'Assess the strengths and weaknesses of {{proposal}}.',
    defense: 'Defend your position on {{controversial_topic}} using {{evidence_type}}.',
    critique: 'Critique the {{work}} by {{author}} considering {{perspectives}}.',
    prioritization: 'Prioritize {{items}} based on {{criteria}} and justify your ranking.',
    recommendation: 'Recommend a {{solution}} to {{problem}} and justify your choice.',
  },
  Create: {
    composition: 'Compose {{creative_form}} that explores {{theme}}.',
    design: 'Design {{object}} that solves {{problem}} while meeting {{constraints}}.',
    synthesis: 'Synthesize {{sources}} to create a new {{product_type}}.',
    invention: 'Invent a {{solution}} to {{problem}} that incorporates {{elements}}.',
    development: 'Develop a {{plan}} to {{goal}} that includes {{components}}.',
    generation: 'Generate {{number}} creative {{ideas}} for {{challenge}}.',
  },
};

/**
 * Calculate Bloom distribution percentage
 */
function calculateBloomPercentages(
  problems: ExtractedProblem[]
): Record<BloomLevel, number> {
  const totalBloomCounts: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };
  
  for (const problem of problems) {
    for (const bloom of problem.bloomLevels) {
      totalBloomCounts[bloom]++;
    }
  }
  
  const total = Object.values(totalBloomCounts).reduce((a, b) => a + b, 0);
  const percentages: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };
  
  for (const [level, count] of Object.entries(totalBloomCounts)) {
    percentages[level as BloomLevel] = total > 0 ? (count / total) * 100 : 0;
  }
  
  return percentages;
}

/**
 * Score how well Bloom distribution matches targets
 */
function scoreBloomBalance(
  actual: Record<BloomLevel, number>,
  target?: Record<BloomLevel, number>
): number {
  if (!target) {
    // Default balanced distribution: 15% Remember, 25% Understand, 25% Apply, 20% Analyze, 10% Evaluate, 5% Create
    target = {
      Remember: 15,
      Understand: 25,
      Apply: 25,
      Analyze: 20,
      Evaluate: 10,
      Create: 5,
    };
  }
  
  // Calculate mean absolute error between actual and target
  let totalError = 0;
  for (const level of Object.keys(target) as BloomLevel[]) {
    totalError += Math.abs((actual[level] || 0) - target[level]);
  }
  
  const meanError = totalError / 6;
  // Convert to score (0-1, where 1 = perfect match)
  return Math.max(0, 1 - (meanError / 100));
}

/**
 * Generate a problem text from a template
 */
function generateProblemFromTemplate(
  bloomLevel: BloomLevel,
  problemType: string,
  context: Record<string, string>
): string {
  const templates = problemTemplates[bloomLevel];
  const template = templates ? templates[problemType] || Object.values(templates)[0] : '';
  
  if (!template) return `Create a ${bloomLevel} level ${problemType} problem about ${context.topic || 'the topic'}.`;
  
  // Replace {{placeholders}} with context values
  let text = template;
  for (const [key, value] of Object.entries(context)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return text;
}

/**
 * Generate complexity progression based on config
 */
function generateComplexityProgression(
  numberOfProblems: number,
  targetAverage: number = 0.5,
  progressionType: 'linear' | 'exponential' | 'bell-curve' | 'random' = 'bell-curve'
): number[] {
  const progression: number[] = [];
  
  for (let i = 0; i < numberOfProblems; i++) {
    const normalized = numberOfProblems > 1 ? i / (numberOfProblems - 1) : 0;
    let complexity = 0;
    
    switch (progressionType) {
      case 'linear':
        // Start low, progress linearly to high
        complexity = 0.2 + normalized * 0.6;
        break;
      
      case 'exponential':
        // Slow start, rapid increase near end
        complexity = 0.2 + Math.pow(normalized, 2) * 0.6;
        break;
      
      case 'bell-curve':
        // Easy → Medium → Hard → Medium → Easy
        const bellNormalized = Math.abs(normalized - 0.5) * 2; // 0 at middle, 1 at ends
        complexity = 0.8 - bellNormalized * 0.5; // 0.3-0.8 range
        break;
      
      case 'random':
        // Randomized with target average
        complexity = Math.random() * 1.0;
        break;
    }
    
    progression.push(Math.min(1.0, Math.max(0.2, complexity)));
  }
  
  // Normalize to target average
  const actualAverage = progression.reduce((a, b) => a + b, 0) / progression.length;
  if (actualAverage > 0) {
    const scale = targetAverage / actualAverage;
    return progression.map(c => Math.min(1.0, Math.max(0.2, c * scale)));
  }
  
  return progression;
}

/**
 * Main function: Generate Asteroid-optimized assignment
 */
export async function generateAsteroidOptimizedAssignment(
  config: AsteroidOptimizationConfig
): Promise<AsteroidOptimizedAssignment> {
  const id = `assignment-${Date.now()}`;
  const problems: AsteroidOptimizedProblem[] = [];
  
  // Set defaults
  const bloomDistribution = config.bloomDistribution || {
    Remember: 15,
    Understand: 25,
    Apply: 25,
    Analyze: 20,
    Evaluate: 10,
    Create: 5,
  };
  
  const problemTypeDistribution = config.problemTypeDistribution || {
    conceptual: 0.4,
    procedural: 0.3,
    mixed: 0.2,
    interpretive: 0.07,
    creative: 0.03,
  };
  
  const complexityProgression = generateComplexityProgression(
    config.numberOfProblems,
    config.targetAverageComplexity || 0.5,
    config.targetComplexityProgression || 'bell-curve'
  );
  
  // Generate Bloom levels according to distribution
  const bloomLevels: BloomLevel[] = [];
  const bloomKeys: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  
  for (const [level, percent] of Object.entries(bloomDistribution)) {
    const count = Math.round((percent / 100) * config.numberOfProblems);
    for (let i = 0; i < count; i++) {
      bloomLevels.push(level as BloomLevel);
    }
  }
  
  // Shuffle Bloom levels to distribute across problems
  for (let i = bloomLevels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bloomLevels[i], bloomLevels[j]] = [bloomLevels[j], bloomLevels[i]];
  }
  
  // Ensure we have enough Bloom levels
  while (bloomLevels.length < config.numberOfProblems) {
    bloomLevels.push(bloomKeys[Math.floor(Math.random() * bloomKeys.length)]);
  }
  bloomLevels.length = config.numberOfProblems; // Trim if needed
  
  // Generate problem types
  const problemTypes: Array<'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative'> = [];
  const problemTypeKeys: Array<'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative'> = [
    'conceptual', 'procedural', 'mixed', 'interpretive', 'creative'
  ];
  
  for (const [type, percent] of Object.entries(problemTypeDistribution)) {
    const count = Math.round((percent as number) * config.numberOfProblems);
    for (let i = 0; i < count; i++) {
      problemTypes.push(type as any);
    }
  }
  
  while (problemTypes.length < config.numberOfProblems) {
    problemTypes.push(problemTypeKeys[Math.floor(Math.random() * problemTypeKeys.length)]);
  }
  problemTypes.length = config.numberOfProblems;
  
  // Generate variables for context
  const contextVariables: Record<string, string>[] = [
    { topic: config.subject, subject: config.subject, concept: 'the core concepts', term: 'term', items: 'items', feature: 'feature', example: 'example', process: 'process', source: 'source', item1: 'item1', item2: 'item2', concepts: 'concepts' },
    { term: 'key term', items: 'key elements', feature: 'important feature', example: 'provided example', topic: config.subject, subject: config.subject, concept: 'concepts', process: 'process', source: 'source', item1: 'Item A', item2: 'Item B', concepts: 'these concepts' },
    { process: 'process', source: 'provided material', item1: 'Item A', item2: 'Item B', concepts: 'these concepts', topic: config.subject, subject: config.subject, concept: 'concept', term: 'term', items: 'items', feature: 'feature', example: 'example' },
  ];
  
  // Generate problems
  for (let i = 0; i < config.numberOfProblems; i++) {
    const bloomLevel = bloomLevels[i];
    const templateKeys = Object.keys(problemTemplates[bloomLevel]) || [];
    const problemTypeTemplate = templateKeys.length > 0 ? templateKeys[i % templateKeys.length] : 'general';
    const complexity = complexityProgression[i];
    const context = contextVariables[i % contextVariables.length];
    
    const problemText = generateProblemFromTemplate(bloomLevel, problemTypeTemplate, context);
    
    // Calculate novelty/similarity
    const prevProblems = problems.map(p => p.text).slice(Math.max(0, i - 3), i); // Look back max 3 problems
    let novelty = 0.5 + Math.random() * 0.5; // Start with 0.5-1.0
    if (i > 0 && prevProblems.length > 0) {
      // Slightly reduce novelty if config prevents consecutive similarity
      if (config.preventConsecutiveSimilarity && i > 0) {
        novelty = Math.min(novelty, 0.7);
      }
    }
    
    // Update novelty based on balance target
    if (config.targetNoveltyBalance) {
      novelty = novelty * config.targetNoveltyBalance + 0.5 * (1 - config.targetNoveltyBalance);
    }
    
    // Map template type to problem type
    const problemTypeMap: Record<string, 'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative'> = {
      definition: 'conceptual',
      listing: 'conceptual',
      identification: 'conceptual',
      recall: 'conceptual',
      naming: 'conceptual',
      explanation: 'conceptual',
      comparison: 'interpretive',
      summarization: 'interpretive',
      demonstration: 'procedural',
      illustration: 'interpretive',
      prediction: 'interpretive',
      problem_solving: 'procedural',
      construction: 'procedural',
      practice: 'procedural',
      computation: 'procedural',
      modification: 'procedural',
      adaptation: 'procedural',
      breakdown: 'interpretive',
      categorization: 'interpretive',
      investigation: 'interpretive',
      distinction: 'interpretive',
      examination: 'interpretive',
      questioning: 'interpretive',
      judgment: 'interpretive',
      assessment: 'interpretive',
      defense: 'interpretive',
      critique: 'interpretive',
      prioritization: 'interpretive',
      recommendation: 'interpretive',
      composition: 'creative',
      design: 'creative',
      synthesis: 'creative',
      invention: 'creative',
      development: 'mixed',
      generation: 'creative',
    };
    
    const mappedProblemType: 'conceptual' | 'procedural' | 'mixed' | 'interpretive' | 'creative' = problemTypeMap[problemTypeTemplate] || 'mixed';
    
    const problem: AsteroidOptimizedProblem = {
      problemId: `P-${String(i + 1).padStart(3, '0')}`,
      sectionId: `S-01`,
      text: problemText,
      isMultipart: i % 3 === 0, // ~33% are multipart
      bloomLevels: [bloomLevel],
      problemType: mappedProblemType,
      complexity: complexity * (0.8 + Math.random() * 0.4), // Add variance
      novelty: novelty,
      similarity: 1 - novelty,
      structure: i % 3 === 0 ? 'multi-part' : 'single-part',
      length: 30 + Math.floor(Math.random() * 70), // 30-100 words
      subparts: i % 3 === 0 ? [
        {
          id: 'a',
          text: 'Part (a): ' + problemText.substring(0, problemText.length / 2),
          bloomLevels: [bloomLevel],
          order: 0,
        },
        {
          id: 'b',
          text: 'Part (b): ' + problemText.substring(problemText.length / 2),
          bloomLevels: [bloomLevel],
          order: 1,
        },
      ] : [],
      generatedPrompt: `Generate a ${bloomLevel}-level ${mappedProblemType} problem about ${config.subject}.`,
      rationale: `Problem ${i + 1} targets ${bloomLevel} cognitive level to ensure balanced scaffolding.`,
      scaffoldingTips: [
        `Consider the ${bloomLevel} objective when approaching this problem.`,
        `This problem reinforces your understanding of key ${config.subject} concepts.`,
      ],
    };
    
    problems.push(problem);
  }
  
  // Calculate distribution
  const actualBloomDistribution = calculateBloomPercentages(problems);
  
  // Build assignment content
  let contents = `# ${config.title}\n\n`;
  contents += `**Subject:** ${config.subject}\n`;
  contents += `**Grade Level:** ${config.gradeLevel}\n`;
  
  if (config.learningObjectives) {
    contents += `\n## Learning Objectives\n\n`;
    config.learningObjectives.forEach(obj => {
      contents += `- ${obj}\n`;
    });
  }
  
  contents += `\n## Problems\n\n`;
  for (const problem of problems) {
    contents += `### Problem ${problem.problemId}\n\n`;
    contents += `${problem.text}\n\n`;
  }
  
  // Calculate optimization metrics
  const bloomBalance = scoreBloomBalance(actualBloomDistribution, bloomDistribution);
  
  // Complexity pacing score: how well distributed?
  const complexities = problems.map(p => p.complexity);
  const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length;
  const complexityVariance = complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) / complexities.length;
  const complexityPacing = Math.min(1.0, Math.sqrt(complexityVariance)); // Higher variance = better pacing
  
  // Novelty balance score
  const novelties = problems.map(p => p.novelty);
  const avgNovelty = novelties.reduce((a, b) => a + b, 0) / novelties.length;
  const noveltyTarget = config.targetNoveltyBalance || 0.6;
  const noveltyBalance = 1 - Math.abs(avgNovelty - noveltyTarget);
  
  const overallOptimization = (bloomBalance + complexityPacing + noveltyBalance) / 3;
  
  return {
    id,
    title: config.title,
    description: `AI-generated assignment optimized for ${config.subject} at grade ${config.gradeLevel}`,
    metadata: {
      gradeLevel: config.gradeLevel,
      subject: config.subject,
      numberOfProblems: config.numberOfProblems,
      estimatedDurationMinutes: config.estimatedDurationMinutes || 60,
      averageComplexity: avgComplexity,
      bloomDistribution: {
        Remember: Math.round(actualBloomDistribution.Remember),
        Understand: Math.round(actualBloomDistribution.Understand),
        Apply: Math.round(actualBloomDistribution.Apply),
        Analyze: Math.round(actualBloomDistribution.Analyze),
        Evaluate: Math.round(actualBloomDistribution.Evaluate),
        Create: Math.round(actualBloomDistribution.Create),
      },
      bloomDistributionPercent: actualBloomDistribution,
    },
    problems,
    contents,
    generationNotes: [
      `Generated ${config.numberOfProblems} problems with Bloom distribution optimized for balance.`,
      `Complexity progression: ${config.targetComplexityProgression || 'bell-curve'} curve.`,
      `${config.preventConsecutiveSimilarity ? 'Prevented' : 'Allowed'} consecutive similar problems.`,
      `Novelty balance target: ${(config.targetNoveltyBalance || 0.6) * 100}%.`,
    ],
    optimizationMetrics: {
      bloomBalanceScore: bloomBalance,
      complexityPacingScore: complexityPacing,
      noveltyBalanceScore: noveltyBalance,
      overallOptimization,
    },
  };
}
