import {
  AssignmentMetadataForAnalysis,
  AssignmentAnalysis,
  PeerReviewComment,
  TagFrequencyEntry,
  BloomLevel,
} from './types';

/**
 * Extract tags from assignment content and learning objectives
 */
export function extractTags(
  content: string,
  learningObjectives: string[],
  customTags?: string[]
): TagFrequencyEntry[] {
  const tagMap = new Map<string, { frequency: number; bloomLevels: Set<BloomLevel> }>();

  // Common academic and instructional tags
  const commonTags = [
    'clarity', 'structure', 'tone', 'engagement', 'scaffolding',
    'differentiation', 'assessment', 'feedback', 'collaboration',
    'critical thinking', 'problem solving', 'creativity', 'analysis',
    'data analysis', 'communication', 'research', 'real-world',
    'application', 'interpretation', 'evaluation', 'synthesis',
  ];

  // Extract from content
  const contentLower = content.toLowerCase();
  commonTags.forEach(tag => {
    if (contentLower.includes(tag)) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { frequency: 0, bloomLevels: new Set() });
      }
      const entry = tagMap.get(tag)!;
      entry.frequency++;
      entry.bloomLevels.add(classifyBloomLevel(tag));
    }
  });

  // Extract from objectives
  learningObjectives.forEach(obj => {
    const objLower = obj.toLowerCase();
    commonTags.forEach(tag => {
      if (objLower.includes(tag)) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { frequency: 0, bloomLevels: new Set() });
        }
        const entry = tagMap.get(tag)!;
        entry.frequency++;
        entry.bloomLevels.add(classifyBloomLevel(tag));
      }
    });
  });

  // Add custom tags
  if (customTags) {
    customTags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (contentLower.includes(tagLower)) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { frequency: 0, bloomLevels: new Set() });
        }
        const entry = tagMap.get(tag)!;
        entry.frequency++;
        entry.bloomLevels.add(classifyBloomLevel(tag));
      }
    });
  }

  return Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      frequency: data.frequency,
      bloomLevels: Array.from(data.bloomLevels),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Classify a tag or text into Bloom's Taxonomy level
 */
export function classifyBloomLevel(text: string): BloomLevel {
  const lower = text.toLowerCase();

  const rememberWords = ['define', 'list', 'recall', 'identify', 'name', 'state', 'remember', 'label', 'match'];
  const understandWords = ['explain', 'describe', 'summarize', 'paraphrase', 'interpret', 'discuss', 'classify', 'understand'];
  const applyWords = ['calculate', 'apply', 'use', 'demonstrate', 'solve', 'illustrate', 'complete', 'application'];
  const analyzeWords = ['compare', 'analyze', 'distinguish', 'examine', 'categorize', 'organize', 'differentiate', 'analysis'];
  const evaluateWords = ['evaluate', 'justify', 'assess', 'critique', 'judge', 'defend', 'argue', 'evaluation'];
  const createWords = ['design', 'create', 'develop', 'propose', 'construct', 'generate', 'plan', 'synthesis'];

  if (rememberWords.some(word => lower.includes(word))) return 'Remember';
  if (understandWords.some(word => lower.includes(word))) return 'Understand';
  if (applyWords.some(word => lower.includes(word))) return 'Apply';
  if (analyzeWords.some(word => lower.includes(word))) return 'Analyze';
  if (evaluateWords.some(word => lower.includes(word))) return 'Evaluate';
  if (createWords.some(word => lower.includes(word))) return 'Create';

  return 'Understand'; // default
}

/**
 * Estimate time to complete based on content and Bloom levels
 */
export function estimateTime(
  content: string,
  learningObjectives: string[],
  providedEstimate?: number,
  bloomDistribution?: Record<BloomLevel, number>
): number {
  // If teacher provided estimate, use it
  if (providedEstimate && providedEstimate > 0) {
    return providedEstimate;
  }

  // Base reading time: 200 words per minute
  const words = content.split(/\s+/).length;
  const readingTime = Math.ceil(words / 200);

  // Task complexity time estimates (in minutes)
  const bloomTimeMap: Record<BloomLevel, number> = {
    Remember: 2,
    Understand: 3,
    Apply: 7,
    Analyze: 10,
    Evaluate: 12,
    Create: 15,
  };

  let taskTime = 0;
  if (bloomDistribution) {
    Object.entries(bloomDistribution).forEach(([level, count]) => {
      taskTime += bloomTimeMap[level as BloomLevel] * (count || 1);
    });
  } else {
    // Default: estimate 3-4 tasks
    taskTime = (bloomTimeMap.Remember + bloomTimeMap.Understand + bloomTimeMap.Apply + bloomTimeMap.Create) / 2;
  }

  // Learning objective complexity
  const objectiveTime = learningObjectives.length * 2;

  return Math.ceil(readingTime + taskTime + objectiveTime);
}

/**
 * Calculate clarity score based on indicators
 */
export function calculateClarityScore(
  content: string,
  bloomDistribution: Record<BloomLevel, number>,
  hasRubric: boolean
): number {
  let score = 5; // baseline

  // Check for clear structure
  if (content.includes('Part') || content.includes('Section') || content.includes('Step')) score += 1;

  // Check for examples
  if (content.toLowerCase().includes('example') || content.toLowerCase().includes('such as')) score += 1;

  // Check for instructions clarity (using specific verbs)
  const clarityVerbs = ['calculate', 'describe', 'explain', 'analyze', 'create', 'evaluate'];
  const verbMatches = clarityVerbs.filter(v => content.toLowerCase().includes(v)).length;
  score += Math.min(verbMatches, 2);

  // Rubric presence
  if (hasRubric) score += 1;

  // Balance of Bloom levels (not all Remember/Understand)
  const higherOrder = (bloomDistribution.Apply || 0) + (bloomDistribution.Analyze || 0) +
                     (bloomDistribution.Evaluate || 0) + (bloomDistribution.Create || 0);
  if (higherOrder > 0) score += 1;

  return Math.min(score, 10);
}

/**
 * Calculate completeness score
 */
export function calculateCompletenessScore(
  hasObjectives: boolean,
  hasRubric: boolean,
  hasTimeEstimate: boolean,
  hasMultipleParts: boolean,
  hasExamples: boolean
): number {
  let score = 0;
  if (hasObjectives) score += 2;
  if (hasRubric) score += 2;
  if (hasTimeEstimate) score += 2;
  if (hasMultipleParts) score += 2;
  if (hasExamples) score += 2;
  return score;
}

/**
 * Calculate alignment score between objectives and content
 */
export function calculateAlignmentScore(
  objectives: string[],
  bloomDistribution: Record<BloomLevel, number>,
  tags: TagFrequencyEntry[]
): number {
  let score = 5;

  // Check if objectives are reflected in tags
  const objectiveKeywords = objectives.map(o => o.split(/\s+/)[0].toLowerCase());
  const tagNames = tags.map(t => t.tag.toLowerCase());
  const matches = objectiveKeywords.filter(kw => tagNames.some(tag => tag.includes(kw))).length;
  score += Math.min(matches, 3);

  // Check for Bloom distribution alignment
  const hasHigherOrder = bloomDistribution.Analyze || bloomDistribution.Evaluate || bloomDistribution.Create;
  if (hasHigherOrder) score += 2;

  return Math.min(score, 10);
}
