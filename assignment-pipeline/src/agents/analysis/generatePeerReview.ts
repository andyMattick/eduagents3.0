import { PeerReviewComment, TagFrequencyEntry, BloomLevel } from './types';

/**
 * Generate peer review comments based on assignment analysis
 */
export function generatePeerReviewComments(
  content: string,
  learningObjectives: string[],
  tags: TagFrequencyEntry[],
  hasRubric: boolean,
  bloomDistribution: Record<BloomLevel, number>
): PeerReviewComment[] {
  const comments: PeerReviewComment[] = [];
  let id = 1;

  // Check for clarity issues
  if (!content.includes('example') && !content.toLowerCase().includes('such as')) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['clarity', 'Bloom: Apply'],
      section: 'Instructions',
      comment: 'The assignment instructions lack worked examples or concrete samples.',
      suggestion: 'Consider adding a worked example for at least one task to support student understanding.',
      severity: 'medium',
    });
  }

  // Check for scaffolding
  const hasScaffolding = content.toLowerCase().includes('step') || content.toLowerCase().includes('part');
  if (!hasScaffolding) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['scaffolding', 'structure'],
      section: 'Instructions',
      comment: 'The assignment could benefit from clearer scaffolding or step-by-step breakdown.',
      suggestion: 'Break the assignment into labeled parts or steps to guide students through the process.',
      severity: 'low',
    });
  }

  // Check for rubric
  if (!hasRubric) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['assessment', 'clarity'],
      section: 'Grading',
      comment: 'No grading rubric is provided.',
      suggestion: 'Create or generate a detailed rubric that aligns with learning objectives and assignment parts.',
      severity: 'high',
    });
  }

  // Check for engagement/real-world context
  const hasRealWorld = content.toLowerCase().includes('real') || content.toLowerCase().includes('authentic');
  if (!hasRealWorld && learningObjectives.length > 0) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['engagement', 'application'],
      section: 'Task Design',
      comment: 'The assignment could include more real-world context or authentic scenarios.',
      suggestion: 'Connect the assignment to real-world problems or student interests to increase engagement.',
      severity: 'low',
    });
  }

  // Check for Bloom level distribution
  const rememberUnderstand = (bloomDistribution.Remember || 0) + (bloomDistribution.Understand || 0);
  const total = Object.values(bloomDistribution).reduce((sum, count) => sum + count, 0);
  const lowerOrderPercent = total > 0 ? (rememberUnderstand / total) * 100 : 0;

  if (lowerOrderPercent > 70) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['Bloom: Higher-Order', 'critical thinking'],
      section: 'Learning Objectives',
      comment: 'The assignment focuses heavily on lower-order thinking skills (Remember/Understand).',
      suggestion: 'Consider adding tasks that require Analysis, Evaluation, or Creation to promote deeper learning.',
      severity: 'medium',
    });
  }

  // Check for clear learning objectives
  if (learningObjectives.length === 0) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['learning objectives', 'alignment'],
      section: 'Learning Objectives',
      comment: 'No explicit learning objectives are defined.',
      suggestion: 'Add clear, measurable learning objectives that students can understand.',
      severity: 'high',
    });
  }

  // Check for differentiation hints
  const hasDifferentiation = content.toLowerCase().includes('alternative') || 
                             content.toLowerCase().includes('choice') ||
                             content.toLowerCase().includes('adapt');
  if (!hasDifferentiation && learningObjectives.length > 0) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['differentiation', 'accessibility'],
      section: 'Task Design',
      comment: 'The assignment does not appear to offer alternative approaches or differentiation strategies.',
      suggestion: 'Consider offering choice, alternative formats, or varied difficulty levels to support diverse learners.',
      severity: 'low',
    });
  }

  // Tag-specific feedback
  const hasDataAnalysis = tags.some(t => t.tag.toLowerCase().includes('data'));
  if (hasDataAnalysis && !content.toLowerCase().includes('table') && !content.toLowerCase().includes('dataset')) {
    comments.push({
      id: `comment-${id++}`,
      tags: ['data analysis', 'clarity'],
      section: 'Resources',
      comment: 'The assignment mentions data analysis but does not provide sample data or datasets.',
      suggestion: 'Provide sample data, tables, or links to datasets that students will analyze.',
      severity: 'medium',
    });
  }

  return comments.slice(0, 5); // Return top 5 comments
}

/**
 * Generate a summary comment based on overall quality
 */
export function generateSummaryComment(
  clarityScore: number,
  completenessScore: number,
  alignmentScore: number
): string {
  const avgScore = (clarityScore + completenessScore + alignmentScore) / 3;

  if (avgScore >= 8) {
    return 'This is a well-designed assignment with clear objectives, good scaffolding, and strong alignment. Consider minor refinements based on the peer review suggestions.';
  } else if (avgScore >= 6) {
    return 'This assignment has solid foundations with good learning objectives and structure. Implementing the peer review suggestions will significantly enhance its clarity and effectiveness.';
  } else {
    return 'This assignment would benefit from substantial revision. Focus on clarifying instructions, adding rubric details, and ensuring alignment between objectives and tasks.';
  }
}
