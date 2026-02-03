import { Tag } from '../../types/pipeline';

/**
 * Analyzes a piece of text and returns detected tags with confidence scores
 * Tags are consistent with assignment metadata and student feedback expectations
 */
export async function analyzeTags(text: string, assignmentMetadataTags?: string[]): Promise<Tag[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!text || text.trim().length === 0) {
    return [];
  }

  const tags: Tag[] = [];

  // Start with metadata-provided tags if available
  if (assignmentMetadataTags && assignmentMetadataTags.length > 0) {
    assignmentMetadataTags.forEach(tag => {
      const [prefix, value] = tag.split(':');
      if (prefix === 'skill' || prefix === 'type' || prefix === 'difficulty') {
        tags.push({
          name: value,
          confidenceScore: 0.85,
          description: `Student work addresses ${value}`,
        });
      }
    });
  }

  // Analyze text for quality indicators
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Check for clarity indicators
  if (textLength > 500) {
    tags.push({
      name: 'comprehensive',
      confidenceScore: 0.85,
      description: 'The assignment covers substantial content',
    });
  }

  // Check for organization
  if (paragraphs.length > 3) {
    tags.push({
      name: 'well-organized',
      confidenceScore: 0.78,
      description: 'Clear structure with multiple sections',
    });
  }

  // Check for sentence complexity and clarity
  if (avgSentenceLength > 15) {
    tags.push({
      name: 'complex-sentences',
      confidenceScore: 0.7,
      description: 'Uses longer, more complex sentence structures',
    });
  }

  const lowerText = text.toLowerCase();

  // Transitions and flow
  const transitionWords = [
    'however',
    'moreover',
    'furthermore',
    'therefore',
    'thus',
    'in addition',
    'consequently',
    'meanwhile',
  ];
  const transitionCount = transitionWords.filter(word =>
    lowerText.includes(word),
  ).length;

  if (transitionCount > 2) {
    tags.push({
      name: 'strong-transitions',
      confidenceScore: Math.min(0.95, 0.70 + transitionCount * 0.1),
      description: 'Good use of transitional phrases and logical flow',
    });
  }

  // Evidence and examples
  const evidenceMarkers = ['example', 'evidence', 'according to', 'study', 'research', 'data'];
  const evidenceCount = evidenceMarkers.filter(word =>
    lowerText.includes(word),
  ).length;

  if (evidenceCount > 1) {
    tags.push({
      name: 'evidence-based',
      confidenceScore: Math.min(0.95, 0.60 + evidenceCount * 0.15),
      description: 'Includes examples and supporting evidence',
    });
  }

  // Check for critical thinking indicators
  const criticalThinkingMarkers = [
    'analyze',
    'evaluate',
    'compare',
    'argue',
    'assess',
    'criticize',
    'significant',
    'implication',
  ];
  const criticalCount = criticalThinkingMarkers.filter(word =>
    lowerText.includes(word),
  ).length;

  if (criticalCount > 2) {
    tags.push({
      name: 'critical-thinking',
      confidenceScore: Math.min(0.95, 0.65 + criticalCount * 0.1),
      description: 'Demonstrates analytical and evaluative thinking',
    });
  }

  // Check for vague modifiers (areas for improvement)
  const vagueModifiers = text.match(/\b(very|really|quite|somewhat|just|kind of|sort of)\b/gi) || [];
  if (vagueModifiers.length > 2) {
    tags.push({
      name: 'vague-language',
      confidenceScore: Math.min(0.9, 0.5 + vagueModifiers.length * 0.15),
      description: 'Contains vague or non-specific modifiers that could be more precise',
    });
  }

  // Creativity indicators
  const creativityMarkers = ['unique', 'novel', 'creative', 'innovative', 'original', 'imagine'];
  const creativityCount = creativityMarkers.filter(word =>
    lowerText.includes(word),
  ).length;

  if (creativityCount > 0) {
    tags.push({
      name: 'creativity',
      confidenceScore: Math.min(0.85, 0.60 + creativityCount * 0.15),
      description: 'Shows creative or original thinking',
    });
  }

  // Collaboration indicators
  if (lowerText.includes('collaborat') || lowerText.includes('together') || lowerText.includes('team')) {
    tags.push({
      name: 'collaborative-elements',
      confidenceScore: 0.75,
      description: 'Includes collaborative or group work components',
    });
  }

  // Default quality tags if no specific patterns
  if (tags.length === 0) {
    tags.push({
      name: 'basic-structure',
      confidenceScore: 0.65,
      description: 'Basic structure present; could be enhanced',
    });
  }

  // Add overall quality score
  const overallConfidence = Math.min(
    0.95,
    0.5 + (wordCount / 500) * 0.2 + (paragraphs.length / 5) * 0.2,
  );
  if (overallConfidence > 0.7) {
    tags.push({
      name: 'solid-foundation',
      confidenceScore: overallConfidence,
      description: 'Good foundational work with room for refinement',
    });
  }

  return tags;
}
