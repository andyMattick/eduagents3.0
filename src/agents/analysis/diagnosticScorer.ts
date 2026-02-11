/**
 * Document Diagnostics Engine (REFACTORED)
 * 
 * Subject-agnostic scoring
 * Produces:
 * - Section-level scoring and analysis
 * - Whole-document summary and recommendations
 */

import {
  SectionDiagnostics,
  DocumentDiagnostics,
  BloomLevel,
  ProceduralComplexity,
  FrequencyAnalysis,
  UniversalProblem,
} from './diagnosticTypes';
import {
  calculateTopicBalance,
  calculateBloomDiversity,
  calculateBloomBalance,
} from './frequencyEngine';

/**
 * Score section for quality indicators
 */
export function scoreSectionDiagnostics(
  sectionId: string,
  title: string | undefined,
  problems: UniversalProblem[],
  frequency: FrequencyAnalysis
): SectionDiagnostics {
  if (problems.length === 0) {
    return {
      sectionId,
      title,
      problemCount: 0,
      scores: {
        alignmentConsistency: 0,
        redundancyControl: 0,
        cognitiveBalance: 0,
        timeRealism: 0,
        skillDiversity: 0,
      },
      analysis: {
        bloomDistribution: [],
        topicCoverage: [],
        estimatedTotalTime: 0,
        averageComplexity: 3,
        problemTypes: [],
      },
      issues: [],
      overallScore: 0,
      justification: 'No problems in section',
    };
  }
  
  // Build section-level frequency data
  const sectionTopics = new Set<string>();
  // const sectionBloomMap = new Map<BloomLevel, number>();
  let totalTime = 0;
  let complexitySum = 0;
  const typeSet = new Set();
  
  const bloomCounts: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };
  
  for (const problem of problems) {
    for (const topic of (problem.classification?.topics || [])) {
      sectionTopics.add(topic);
    }
    bloomCounts[problem.cognitive.bloomsLevel]++;
    totalTime += problem.cognitive.estimatedTimeMinutes;
    complexitySum += problem.cognitive.complexityLevel;
    typeSet.add(problem.classification?.problemType || 'unknown');
  }
  
  // Calculate scores (1-10 scale)
  
  // 1. Alignment consistency: Do Bloom levels align with topic complexity?
  const bloomLevelCount = Object.values(bloomCounts).filter(v => v > 0).length;
  const alignmentConsistency = Math.min(
    10,
    (bloomLevelCount / 6) * 7 + 3  // At least 3 points for having any variety
  );
  
  // 2. Redundancy control: Fewer repeated types = higher score
  const uniqueTypes = typeSet.size;
  const redundancyControl = Math.min(10, (uniqueTypes / problems.length) * 10);
  
  // 3. Cognitive balance: Balanced Bloom distribution
  const bloomVariance = Object.values(bloomCounts).reduce((sum, count) => {
    const expected = problems.length / 6;
    return sum + Math.pow(count - expected, 2);
  }, 0) / 6;
  const cognitiveBalance = Math.max(0, 10 - (bloomVariance / problems.length) * 5);
  
  // 4. Time realism: Does time increase with complexity? (Should correlate)
  const avgTime = totalTime / problems.length;
  const avgComplexity = complexitySum / problems.length;
  const expectedTime = avgComplexity * 2;  // Rough mapping: complexity * 2 = minutes
  const timeRealism = Math.min(10, Math.max(0, 10 - Math.abs(avgTime - expectedTime)));
  
  // 5. Skill diversity: How many different problem types?
  const skillDiversity = Math.min(10, (uniqueTypes / 5) * 10);
  
  // Identify issues
  const issues: Array<{
    issue: string;
    severity: 'info' | 'warning' | 'critical';
    justification: string;
    locationProblemIds: string[];
  }> = [];
  
  // Issue: All Remember level
  const rememberCount = bloomCounts.Remember;
  if (rememberCount === problems.length && problems.length > 2) {
    issues.push({
      issue: 'All recall-level problems',
      severity: 'critical',
      justification: `Section contains only "Remember" level Bloom items. No higher-order thinking.`,
      locationProblemIds: problems.filter((p: UniversalProblem) => p.cognitive.bloomsLevel === 'Remember').map((p: UniversalProblem) => p.problemId),
    });
  }
  
  // Issue: Too many of one type
  const typeFreq = new Map();
  for (const p of problems) {
    const ptype = p.classification?.problemType || 'unknown';
    typeFreq.set(ptype, (typeFreq.get(ptype) || 0) + 1);
  }
  for (const [type, count] of typeFreq.entries()) {
    if (count > problems.length * 0.6) {
      issues.push({
        issue: `Over-reliance on "${type}" problems`,
        severity: 'warning',
        justification: `${((count / problems.length) * 100).toFixed(0)}% of section is "${type}" type.`,
        locationProblemIds: problems.filter((a: UniversalProblem) => (a.classification?.problemType || 'unknown') === type).map((a: UniversalProblem) => a.problemId),
      });
    }
  }
  
  // Issue: Time estimation seems off
  if (avgTime > 15 || avgTime < 1) {
    issues.push({
      issue: 'Unusual time estimates',
      severity: 'info',
      justification: `Average problem takes ${avgTime.toFixed(1)} minutes. Consider reviewing time estimates.`,
      locationProblemIds: [],
    });
  }
  
  const overallScore = Math.round(
    (alignmentConsistency + redundancyControl + cognitiveBalance + timeRealism + skillDiversity) / 5
  );
  
  return {
    sectionId,
    title,
    problemCount: problems.length,
    scores: {
      alignmentConsistency: Math.round(alignmentConsistency * 10) / 10,
      redundancyControl: Math.round(redundancyControl * 10) / 10,
      cognitiveBalance: Math.round(cognitiveBalance * 10) / 10,
      timeRealism: Math.round(timeRealism * 10) / 10,
      skillDiversity: Math.round(skillDiversity * 10) / 10,
    },
    analysis: {
      bloomDistribution: frequency.bloomDistribution.map(b => ({
        ...b,
        count: bloomCounts[b.level],
      })),
      topicCoverage: Array.from(sectionTopics),
      estimatedTotalTime: Math.round(totalTime * 10) / 10,
      averageComplexity: Math.round(complexitySum / problems.length) as ProceduralComplexity,
      problemTypes: Array.from(typeSet) as string[],
    },
    issues,
    overallScore: Math.round(overallScore),
    justification: generateSectionJustification(overallScore, issues),
  };
}

function generateSectionJustification(score: number, _issues: any[]): string {
  if (score >= 8) return 'Well-designed section with good cognitive balance and variety.';
  if (score >= 6) return 'Section is acceptable but could benefit from addressing issues listed.';
  if (score >= 4) return 'Section has significant quality concerns. Review redundancy and cognitive load.';
  return 'Section requires substantial revision. Consider restructuring.';
}

/**
 * Generate whole-document diagnostics
 */
export function generateDocumentDiagnostics(
  _problemAnalyses: UniversalProblem[],
  frequency: FrequencyAnalysis,
  sectionDiagnostics: SectionDiagnostics[]
): DocumentDiagnostics {
  // Total time
  const totalTime = (_problemAnalyses || []).reduce((sum: number, a: UniversalProblem) => sum + a.cognitive.estimatedTimeMinutes, 0);
  
  // Highest Bloom level
  const bloomOrder: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  let highestBloom: BloomLevel = 'Remember';
  for (const level of bloomOrder) {
    if (frequency.bloomDistribution.find(b => b.level === level && b.count > 0)) {
      highestBloom = level;
    }
  }
  
  // Procedural vs conceptual
  const procedural = (_problemAnalyses || []).filter((a: UniversalProblem) => a.cognitive.complexityLevel <= 2).length;
  const conceptual = (_problemAnalyses || []).filter((a: UniversalProblem) => a.cognitive.complexityLevel >= 4).length;
  const proceduralPercentage = (procedural / (_problemAnalyses?.length || 1)) * 100;
  const conceptualPercentage = (conceptual / (_problemAnalyses?.length || 1)) * 100;
  
  // Topic coverage
  const mostTestedTopic = frequency.topics[0]?.topic || 'Other';
  const mostTestedCount = frequency.topics[0]?.count || 0;
  const leastTestedTopic = frequency.topics[frequency.topics.length - 1]?.topic || 'Other';
  const leastTestedCount = frequency.topics[frequency.topics.length - 1]?.count || 0;
  
  // Time analysis
  const times = (_problemAnalyses || []).map((a: UniversalProblem) => a.cognitive.estimatedTimeMinutes).sort((a: number, b: number) => a - b);
  const shortestProblem = times[0];
  const longestProblem = times[times.length - 1];
  const avgProblem = totalTime / (_problemAnalyses?.length || 1);
  
  // Time realism: Does time scale with complexity?
  let timeRealismScore = 0;
  const complexities = (_problemAnalyses || []).map((a: UniversalProblem) => a.cognitive.complexityLevel);
  const complexityTimes = (_problemAnalyses || []).map((a: UniversalProblem) => a.cognitive.estimatedTimeMinutes);
  
  // Calculate correlation (higher = more realistic)
  let correlation = 0;
  const meanComplexity = complexities.reduce((a: number, b: number) => a + b, 0) / complexities.length;
  const meanTime = complexityTimes.reduce((a: number, b: number) => a + b, 0) / complexityTimes.length;
  
  let covariance = 0;
  let complexityVar = 0;
  let timeVar = 0;
  
  for (let i = 0; i < complexities.length; i++) {
    covariance += (complexities[i] - meanComplexity) * (complexityTimes[i] - meanTime);
    complexityVar += Math.pow(complexities[i] - meanComplexity, 2);
    timeVar += Math.pow(complexityTimes[i] - meanTime, 2);
  }
  
  if (complexityVar > 0 && timeVar > 0) {
    correlation = covariance / Math.sqrt(complexityVar * timeVar);
    timeRealismScore = Math.min(1, Math.max(0, (correlation + 1) / 2));  // Normalize to 0-1
  }
  
  // Complexity analysis
  const complexityDist = frequency.complexityDistribution;
  const avgComplexity = (_problemAnalyses || []).reduce((sum: number, a: UniversalProblem) => sum + a.cognitive.complexityLevel, 0) / (_problemAnalyses?.length || 1);
  
  // Calculate scores (0-100)
  const alignmentControl = (frequency.bloomDistribution.filter(b => b.count > 0).length / 6) * 100;
  const bloomDiscipline = calculateBloomDiversity(frequency) * 100;
  const topicBalance = calculateTopicBalance(frequency) * 100;
  const timeRealism = timeRealismScore * 100;
  const redundancyControl = Math.max(0, 100 - (frequency.redundancyIndex * 10));
  const coherence = sectionDiagnostics.reduce((sum, s) => sum + s.overallScore, 0) / Math.max(1, sectionDiagnostics.length) * 10;
  
  // Weighted overall score
  const weights = {
    alignmentControl: 0.15,
    bloomDiscipline: 0.15,
    topicBalance: 0.20,
    timeRealism: 0.15,
    redundancyControl: 0.20,
    coherence: 0.15,
  };
  
  const overallScore = Math.round(
    alignmentControl * weights.alignmentControl +
    bloomDiscipline * weights.bloomDiscipline +
    topicBalance * weights.topicBalance +
    timeRealism * weights.timeRealism +
    redundancyControl * weights.redundancyControl +
    coherence * weights.coherence
  );
  
  // Generate findings and recommendations
  const findingsAndRecs = generateFindingsAndRecommendations(
    _problemAnalyses || [],
    frequency,
    sectionDiagnostics,
    overallScore
  );
  
  return {
    totalEstimatedTimeMinutes: Math.round(totalTime * 10) / 10,
    highestBloomLevel: highestBloom,
    proceduralVsConceptual: {
      proceduralPercentage: Math.round(proceduralPercentage * 10) / 10,
      conceptualPercentage: Math.round(conceptualPercentage * 10) / 10,
    },
    topicCoverage: {
      mostTestedTopic,
      mostTestedCount,
      leastTestedTopic,
      leastTestedCount,
      topicBalanceScore: calculateTopicBalance(frequency),
    },
    bloomAnalysis: {
      distribution: frequency.bloomDistribution,
      coverage: calculateBloomDiversity(frequency),
      balance: calculateBloomBalance(frequency),
    },
    timeAnalysis: {
      totalMinutes: Math.round(totalTime * 10) / 10,
      shortestProblem: Math.round(shortestProblem * 10) / 10,
      longestProblem: Math.round(longestProblem * 10) / 10,
      averageProblem: Math.round(avgProblem * 10) / 10,
      realism: timeRealismScore,
    },
    complexityAnalysis: {
      distribution: complexityDist,
      averageLevel: Math.round(avgComplexity) as ProceduralComplexity,
      range: [Math.min(...complexities) as ProceduralComplexity, Math.max(...complexities) as ProceduralComplexity],
    },
    scorecard: {
      alignmentControl: Math.round(alignmentControl),
      bloomDiscipline: Math.round(bloomDiscipline),
      topicBalance: Math.round(topicBalance),
      timeRealism: Math.round(timeRealism),
      redundancyControl: Math.round(redundancyControl),
      coherence: Math.round(coherence),
      overallScore,
    },
    findings: findingsAndRecs.findings,
    recommendations: findingsAndRecs.recommendations,
  };
}

interface FindingsAndRecs {
  findings: string[];
  recommendations: string[];
}

function generateFindingsAndRecommendations(
  _analyses: UniversalProblem[],
  frequency: FrequencyAnalysis,
  _sectionDiags: SectionDiagnostics[],
  score: number
): FindingsAndRecs {
  const findings: string[] = [];
  const recommendations: string[] = [];
  
  // Score-based finding
  if (score >= 80) {
    findings.push(`✅ Assessment is well-designed. Score: ${score}/100`);
  } else if (score >= 60) {
    findings.push(`⚠️ Assessment has room for improvement. Score: ${score}/100`);
  } else {
    findings.push(`❌ Assessment requires significant revision. Score: ${score}/100`);
  }
  
  findings.push(`📊 Total problems: ${(_analyses || []).length}, Estimated time: ${Math.round((_analyses || []).reduce((s: number, a: UniversalProblem) => s + a.cognitive.estimatedTimeMinutes, 0))} minutes`);
  
  findings.push(`🧠 Bloom coverage: ${frequency.bloomDistribution.filter(b => b.count > 0).map(b => `${b.level}(${b.count})`).join(', ')}`);
  
  if (frequency.redundancyIndex > 5) {
    findings.push(`⚠️ High redundancy detected (index: ${frequency.redundancyIndex}/10)`);
  }
  
  // Topic findings
  const topTopics = frequency.topics.slice(0, 3).map(t => `${t.topic} (${t.count})`).join(', ');
  findings.push(`📌 Most tested topics: ${topTopics}`);
  
  // Recommendations
  if (frequency.bloomDistribution.find(b => b.level === 'Remember' && b.count === 0)) {
    recommendations.push(`Include recall-based items to assess foundational knowledge.`);
  }
  
  if (frequency.bloomDistribution.find(b => b.level === 'Create' && b.count === 0)) {
    recommendations.push(`Add at least one high-order thinking item (Evaluate or Create level).`);
  }
  
  if (frequency.redundancyIndex > 5) {
    for (const flag of frequency.redundancyFlags.slice(0, 2)) {
      recommendations.push(flag.recommendation);
    }
  }
  
  if ((_analyses || []).reduce((sum: number, a: UniversalProblem) => sum + a.cognitive.estimatedTimeMinutes, 0) > 120) {
    recommendations.push(`Consider condensing assessment. Estimated time exceeds 2 hours.`);
  }
  
  return { findings, recommendations };
}
