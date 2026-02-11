/**
 * Frequency + Redundancy Engine (REFACTORED)
 * 
 * Subject-agnostic frequency analysis
 * 
 * After analyzing all problems:
 * - Track topic frequency (from any subject's taxonomy)
 * - Detect redundancy patterns
 * - Flag suspicious distributions
 * - Calculate redundancy index
 */

import {
  UniversalProblem,
  FrequencyAnalysis,
  TopicFrequency,
  BloomFrequency,
  ComplexityFrequency,
  ProblemTypeFrequency,
  RedundancyFlag,
  BloomLevel,
  ProceduralComplexity,
  DocumentLocation,
  SubjectProfile,
} from './diagnosticTypes';

/**
 * Build frequency tables from all problems
 * 
 * Now subject-agnostic: topics come from UniversalProblem.classification.topics
 * which are populated from the subject profile, not hardcoded
 */
export function buildFrequencyAnalysis(
  problems: UniversalProblem[],
  profile?: SubjectProfile
): FrequencyAnalysis {
  if (problems.length === 0) {
    return {
      topics: [],
      bloomDistribution: [],
      complexityDistribution: [],
      problemTypeDistribution: [],
      redundancyFlags: [],
      redundancyIndex: 0,
    };
  }

  // Topic frequency (from classification, no hardcoding)
  const topicMap = new Map<string, { count: number; locations: DocumentLocation[]; bloomLevels: Set<BloomLevel> }>();
  
  for (const problem of problems) {
    for (const topic of problem.classification.topics) {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { count: 0, locations: [], bloomLevels: new Set() });
      }
      const entry = topicMap.get(topic)!;
      entry.count++;
      entry.locations.push({
        line: problem.structure.sourceLineStart,
        problemId: problem.problemId,
        subpartId: problem.parentProblemId ? problem.problemId : undefined,
      });
      entry.bloomLevels.add(problem.cognitive.bloomsLevel);
    }
  }
  
  const topics: TopicFrequency[] = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      percentage: (data.count / problems.length) * 100,
      locations: data.locations,
      bloomLevels: Array.from(data.bloomLevels),
    }))
    .sort((a, b) => b.count - a.count);
  
  // Bloom frequency
  const bloomMap = new Map<BloomLevel, { count: number; locations: DocumentLocation[] }>();
  
  for (const problem of problems) {
    const level = problem.cognitive.bloomsLevel;
    if (!bloomMap.has(level)) {
      bloomMap.set(level, { count: 0, locations: [] });
    }
    const entry = bloomMap.get(level)!;
    entry.count++;
    entry.locations.push({
      line: problem.structure.sourceLineStart,
      problemId: problem.problemId,
      subpartId: problem.parentProblemId ? problem.problemId : undefined,
    });
  }
  
  const bloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const bloomDistribution: BloomFrequency[] = bloomLevels.map(level => ({
    level,
    count: bloomMap.get(level)?.count || 0,
    percentage: ((bloomMap.get(level)?.count || 0) / problems.length) * 100,
    locations: bloomMap.get(level)?.locations || [],
  }));
  
  // Complexity frequency
  const complexityMap = new Map<ProceduralComplexity, number>();
  for (const problem of problems) {
    complexityMap.set(
      problem.cognitive.complexityLevel,
      (complexityMap.get(problem.cognitive.complexityLevel) || 0) + 1
    );
  }
  
  const complexityDistribution: ComplexityFrequency[] = ([1, 2, 3, 4, 5] as ProceduralComplexity[]).map(level => ({
    level,
    count: complexityMap.get(level) || 0,
    percentage: ((complexityMap.get(level) || 0) / problems.length) * 100,
  }));
  
  // Problem type distribution (now subject-agnostic)
  const typeMap = new Map<string, { count: number; locations: DocumentLocation[] }>();
  for (const problem of problems) {
    const type = problem.classification.problemType || 'Unclassified';
    if (!typeMap.has(type)) {
      typeMap.set(type, { count: 0, locations: [] });
    }
    const entry = typeMap.get(type)!;
    entry.count++;
    entry.locations.push({
      line: problem.structure.sourceLineStart,
      problemId: problem.problemId,
      subpartId: problem.parentProblemId ? problem.problemId : undefined,
    });
  }
  
  const problemTypeDistribution: ProblemTypeFrequency[] = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      percentage: (data.count / problems.length) * 100,
      locations: data.locations,
    }))
    .sort((a, b) => b.count - a.count);
  
  // Redundancy detection (now accepts optional profile for rules)
  const flags = detectRedundancy(problems, topicMap, bloomMap, typeMap, profile);
  
  // Calculate redundancy index (0-10)
  const redundancyIndex = calculateRedundancyIndex(flags);
  
  return {
    topics,
    bloomDistribution,
    complexityDistribution,
    problemTypeDistribution,
    redundancyFlags: flags,
    redundancyIndex,
  };
}

/**
 * Detect redundancy patterns and flag issues (REFACTORED)
 * 
 * Now subject-agnostic: uses profile thresholds if provided
 */
function detectRedundancy(
  problems: UniversalProblem[],
  topicMap: Map<string, any>,
  bloomMap: Map<BloomLevel, any>,
  typeMap: Map<string, any>,
  profile?: SubjectProfile
): RedundancyFlag[] {
  const flags: RedundancyFlag[] = [];
  const totalProblems = problems.length;
  
  // Get thresholds from profile or use defaults
  const topicThreshold = profile?.redundancyConfig?.topicFrequencyThresholdPercent ?? 25;
  const typeRepeatThreshold = profile?.redundancyConfig?.problemTypeRepeatThreshold ?? 3;
  
  // Flag 1: High topic frequency (configurable per subject)
  for (const [topic, data] of Array.from(topicMap.entries())) {
    const percentage = (data.count / totalProblems) * 100;
    if (percentage > topicThreshold) {
      flags.push({
        type: 'high-topic-frequency',
        severity: percentage > topicThreshold * 1.5 ? 'critical' : 'warning',
        description: `Topic "${topic}" appears in ${data.count} problems (${percentage.toFixed(1)}% of assessment)`,
        locations: data.locations,
        recommendation: `Consider spreading ${topic} across fewer items or testing different subtopics.`,
      });
    }
  }
  
  // Flag 2: Repeated problem types
  for (const [type, data] of Array.from(typeMap.entries())) {
    if (data.count >= typeRepeatThreshold) {
      flags.push({
        type: 'repeated-type',
        severity: data.count >= typeRepeatThreshold * 1.67 ? 'critical' : 'warning',
        description: `Problem type "${type}" repeated ${data.count} times (${((data.count / totalProblems) * 100).toFixed(1)}% of assessment)`,
        locations: data.locations,
        recommendation: `Vary problem types to assess different cognitive skills.`,
      });
    }
  }
  
  // Flag 3: Bloom level gaps
  const bloomLevelOrder: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const allowedLevels = profile?.redundancyConfig?.allowedBloomLevels ?? bloomLevelOrder;
  const rememberCount = bloomMap.get('Remember')?.count || 0;
  const createCount = bloomMap.get('Create')?.count || 0;
  
  if (rememberCount === 0 && totalProblems > 3 && allowedLevels.includes('Remember')) {
    flags.push({
      type: 'bloom-gap',
      severity: 'warning',
      description: `No "Remember" level problems found. Assessment may be too cognitively demanding.`,
      locations: [],
      recommendation: `Include some foundational recall questions to assess knowledge base.`,
    });
  }
  
  if (createCount === 0 && totalProblems > 5 && allowedLevels.includes('Create')) {
    flags.push({
      type: 'bloom-skipped',
      severity: 'warning',
      description: `No "Create" level problems. Assessment focuses on lower-order thinking.`,
      locations: [],
      recommendation: `Consider adding at least one synthesis/design problem for higher-order assessment.`,
    });
  }
  
  // Flag 4: Limited Bloom coverage
  const presentLevels = bloomLevelOrder.filter(l => (bloomMap.get(l)?.count || 0) > 0);
  const expectedLevels = allowedLevels.filter(l => bloomLevelOrder.includes(l));
  if (presentLevels.length < Math.min(3, expectedLevels.length)) {
    flags.push({
      type: 'bloom-skipped',
      severity: 'warning',
      description: `Assessment only covers ${presentLevels.length} Bloom levels: ${presentLevels.join(', ')}`,
      locations: [],
      recommendation: `Ensure broader cognitive coverage across available Bloom levels.`,
    });
  }
  
  return flags;
}

/**
 * Calculate overall redundancy index (0-10)
 */
function calculateRedundancyIndex(flags: RedundancyFlag[]): number {
  if (flags.length === 0) return 0;
  
  let index = 0;
  
  // Count critical flags (weight 3)
  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  index += criticalCount * 3;
  
  // Count warning flags (weight 1)
  const warningCount = flags.filter(f => f.severity === 'warning').length;
  index += warningCount * 1;
  
  // Normalize to 0-10
  // Assume max 10 flags across a whole test
  index = Math.min((index / 10) * 10, 10);
  
  return Math.round(index * 10) / 10;
}

/**
 * Identify most frequently tested topic
 * Now returns string (or null) instead of TopicTag
 */
export function getMostTestedTopic(frequency: FrequencyAnalysis): string | null {
  return frequency.topics.length > 0 ? frequency.topics[0].topic : null;
}

/**
 * Identify least frequently tested topic (if multiple topics)
 * Now returns string (or null) instead of TopicTag
 */
export function getLeastTestedTopic(frequency: FrequencyAnalysis): string | null {
  if (frequency.topics.length === 0) return null;
  
  // Find topic with lowest count (but exists at least once)
  const leastTested = frequency.topics
    .filter(t => t.count < frequency.topics[0].count)
    .pop();
  
  return leastTested?.topic || frequency.topics[frequency.topics.length - 1].topic;
}

/**
 * Calculate topic balance score (0-1)
 * 1 = perfectly even distribution
 * 0 = highly skewed distribution
 */
export function calculateTopicBalance(frequency: FrequencyAnalysis): number {
  if (frequency.topics.length <= 1) return 1;
  
  // Calculate standard deviation of topic percentages
  const percentages = frequency.topics.map(t => t.percentage);
  const mean = percentages.reduce((a, b) => a + b) / percentages.length;
  const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize: perfect balance = 0 stddev, max skew = mean stddev
  const maxStdDev = Math.sqrt(
    frequency.topics.map(t => Math.pow(t.percentage - mean, 2)).reduce((a, b) => a + b) / frequency.topics.length
  );
  
  if (maxStdDev === 0) return 1;
  
  return Math.max(0, 1 - (stdDev / (mean * 0.5)));
}

/**
 * Calculate Bloom diversity score (0-1)
 * 1 = all 6 levels represented
 * 0 = only one level
 */
export function calculateBloomDiversity(frequency: FrequencyAnalysis): number {
  const levelsRepresented = frequency.bloomDistribution.filter(b => b.count > 0).length;
  return levelsRepresented / 6;
}

/**
 * Calculate Bloom balance (0-1)
 * 1 = perfectly even, 0 = all clustered at one level
 */
export function calculateBloomBalance(frequency: FrequencyAnalysis): number {
  const percentages = frequency.bloomDistribution.map(b => b.percentage);
  const mean = percentages.reduce((a, b) => a + b) / percentages.length;
  
  // Calculate coefficient of variation
  const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  
  if (mean === 0) return 1;
  const cv = stdDev / mean;
  
  // Higher CV = more unbalanced
  return Math.max(0, 1 - (cv / 2));
}
