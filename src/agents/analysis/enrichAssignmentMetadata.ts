import { GeneratedAssignment, GeneratedProblem } from '../../hooks/useUserFlow';

/**
 * Enriches a generated assignment with detailed problem metadata
 * Adds complexity, novelty scores, time estimates, rubrics, etc.
 */
export function enrichAssignmentMetadata(assignment: GeneratedAssignment): GeneratedAssignment {
  const enrichedSections = assignment.sections.map((section, sectionIdx) => ({
    ...section,
    problems: section.problems.map((problem, problemIdx) => 
      enrichProblem(problem, sectionIdx, problemIdx, assignment)
    ),
  }));

  return {
    ...assignment,
    sections: enrichedSections,
  };
}

/**
 * Enriches a single problem with complexity, novelty, time estimate, and rubric
 */
function enrichProblem(
  problem: GeneratedProblem,
  sectionIdx: number,
  problemIdx: number,
  assignment: GeneratedAssignment
): GeneratedProblem {
  // Determine complexity based on Bloom level (1=low, 6=high)
  const complexity: 'low' | 'medium' | 'high' = 
    problem.bloomLevel <= 2 ? 'low' :
    problem.bloomLevel <= 4 ? 'medium' :
    'high';
  
  // Determine novelty based on problem type variety
  // If this problem type appears early and infrequently, it's more novel
  const typeFrequency = countProblemTypeFrequency(assignment, problem.problemType);
  const novelty: 'low' | 'medium' | 'high' = 
    problemIdx < 2 ? 'high' : // First few problems are more novel
    typeFrequency > 0.4 ? 'low' : // Repeated types are less novel
    'medium';
  
  // Estimate time based on complexity and question format
  const baseTime = estimateBaseTime(problem.problemType || 'multiple-choice');
  const complexityMultiplier = complexity === 'low' ? 1 : complexity === 'medium' ? 1.5 : 2;
  const estimatedTime = baseTime * complexityMultiplier;
  
  // Determine if problem has a tip
  const hasTip = !!problem.tipText;
  
  // Convert numeric Bloom level to string for rubric generation
  const bloomLevelToString = (level: number): string => {
    const map: Record<number, string> = {
      1: 'Remember',
      2: 'Understand',
      3: 'Apply',
      4: 'Analyze',
      5: 'Evaluate',
      6: 'Create',
    };
    return map[level] || 'Understand';
  };
  
  // Generate rubric based on Bloom level and problem type
  const rubric = generateRubric(bloomLevelToString(problem.bloomLevel), problem.problemType || 'mixed');
  
  // Generate source reference (would come from actual source doc in real impl)
  const sourceReference = `Section ${sectionIdx + 1}, Problem ${problemIdx + 1}`;

  return {
    ...problem,
    sectionId: `section-${sectionIdx}`,
    complexity,
    novelty,
    estimatedTime,
    hasTip,
    sourceReference,
    rubric,
  };
}

/**
 * Estimates base time for different question formats (in minutes)
 */
function estimateBaseTime(format: string): number {
  const timeMap: Record<string, number> = {
    'multiple-choice': 2,
    'true-false': 1,
    'short-answer': 4,
    'free-response': 8,
    'fill-blank': 2,
  };
  return timeMap[format] || 3;
}

/**
 * Counts how frequently a problem type appears in the assignment
 */
function countProblemTypeFrequency(assignment: GeneratedAssignment, problemType?: string): number {
  if (!problemType) return 0.5;
  
  const allProblems = assignment.sections.flatMap(s => s.problems);
  const matchingCount = allProblems.filter(p => p.problemType === problemType).length;
  return allProblems.length > 0 ? matchingCount / allProblems.length : 0;
}

/**
 * Generates a rubric based on Bloom level and problem type
 */
function generateRubric(bloomLevel: string, _problemType: string) {
  // Basic rubric templates for different Bloom levels
  const rubricsByBloom: Record<string, { criteria: string[]; expectations: string }> = {
    'Remember': {
      criteria: [
        'Accurately recalls facts or definitions',
        'Identifies key terms or concepts',
      ],
      expectations: 'Student should be able to recall and state the information correctly.',
    },
    'Understand': {
      criteria: [
        'Explains concepts in own words',
        'Interprets information correctly',
        'Summarizes main ideas',
      ],
      expectations: 'Student demonstrates clear understanding by explaining or summarizing the concept.',
    },
    'Apply': {
      criteria: [
        'Uses knowledge in a new situation',
        'Applies rules or procedures correctly',
        'Adapts learning to different contexts',
      ],
      expectations: 'Student applies learning to a realistic or new scenario with accuracy.',
    },
    'Analyze': {
      criteria: [
        'Breaks down problems into components',
        'Identifies relationships between parts',
        'Distinguishes fact from opinion',
      ],
      expectations: 'Student systematically examines components and explains their relationships.',
    },
    'Evaluate': {
      criteria: [
        'Makes judgments based on criteria',
        'Defends conclusions with evidence',
        'Critiques approaches or solutions',
      ],
      expectations: 'Student makes well-supported judgments using clear reasoning and evidence.',
    },
    'Create': {
      criteria: [
        'Develops original ideas or products',
        'Combines elements in new ways',
        'Justifies creative choices',
      ],
      expectations: 'Student produces original work that demonstrates synthesis of learning.',
    },
  };

  return rubricsByBloom[bloomLevel] || rubricsByBloom['Understand'];
}
