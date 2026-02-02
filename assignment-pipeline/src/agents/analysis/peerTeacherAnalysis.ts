/**
 * Advanced peer teacher analysis
 * Provides detailed, constructive feedback like a knowledgeable peer would give
 */

export interface DetailedAnalysis {
  overallFeedback: string;
  strengths: StrengthArea[];
  areasForImprovement: ImprovementArea[];
  specificSuggestions: Suggestion[];
  readabilityMetrics: ReadabilityMetrics;
  engagementScore: number;
  peerCommentary: string;
}

export interface StrengthArea {
  title: string;
  description: string;
  evidence: string;
  score: number; // 0-1
}

export interface ImprovementArea {
  title: string;
  currentState: string;
  targetState: string;
  impact: 'critical' | 'important' | 'nice-to-have';
  examples?: string;
}

export interface Suggestion {
  category: string;
  problem: string;
  solution: string;
  priority: number; // 1-5, 5 being highest
  effort: 'quick' | 'moderate' | 'significant';
}

export interface ReadabilityMetrics {
  averageSentenceLength: number;
  averageParagraphLength: number;
  uniqueWordCount: number;
  totalWordCount: number;
  estimatedReadingTime: number; // seconds
  readabilityGrade: number; // Flesch-Kincaid
  sentenceVariety: number; // 0-1
  passiveVoicePercentage: number; // 0-1
}

/**
 * Main function: Analyze assignment like a peer teacher would
 */
export async function analyzeAssignmentPeerTeacher(text: string): Promise<DetailedAnalysis> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  const metrics = calculateReadabilityMetrics(text);
  const strengths = identifyStrengths(text, metrics);
  const improvements = identifyImprovements(text, metrics);
  const suggestions = generateActionableSuggestions(text, improvements);
  const overallFeedback = generateOverallFeedback(strengths, improvements, metrics);
  const peerCommentary = generatePeerCommentary(strengths, improvements, text);

  const engagementScore = calculateEngagementScore(strengths, improvements, metrics);

  return {
    overallFeedback,
    strengths,
    areasForImprovement: improvements,
    specificSuggestions: suggestions,
    readabilityMetrics: metrics,
    engagementScore,
    peerCommentary,
  };
}

function calculateReadabilityMetrics(text: string): ReadabilityMetrics {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const averageSentenceLength = words.length / Math.max(sentences.length, 1);
  const averageParagraphLength = words.length / Math.max(paragraphs.length, 1);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));

  // Flesch-Kincaid Grade Level
  const syllables = countSyllables(text);
  const grade = Math.max(
    0,
    (0.39 * (words.length / sentences.length)
      + 11.8 * (syllables / words.length)
      - 15.59) * 100,
  );

  // Sentence variety: how varied sentence lengths are
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0)
    / sentenceLengths.length;
  const sentenceVariety = Math.min(1, Math.sqrt(variance) / avgLength);

  // Passive voice percentage
  const passivePattern = /\b(is|are|was|were|be|been|being)\s+\w+\s+(by|in|with)/gi;
  const passiveMatches = (text.match(passivePattern) || []).length;
  const passiveVoicePercentage = passiveMatches / Math.max(sentences.length, 1);

  // Estimated reading time (200 words per minute average)
  const estimatedReadingTime = Math.ceil((words.length / 200) * 60);

  return {
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    averageParagraphLength: Math.round(averageParagraphLength * 10) / 10,
    uniqueWordCount: uniqueWords.size,
    totalWordCount: words.length,
    estimatedReadingTime,
    readabilityGrade: Math.round(grade * 10) / 10,
    sentenceVariety: Math.round(sentenceVariety * 100) / 100,
    passiveVoicePercentage: Math.round(passiveVoicePercentage * 100) / 100,
  };
}

function countSyllables(text: string): number {
  const words = text.split(/\s+/);
  let totalSyllables = 0;

  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const vowels = (cleanWord.match(/[aeiouy]/g) || []).length;
    const silent_e = cleanWord.endsWith('e') ? 1 : 0;
    const consecutive = (cleanWord.match(/([aeiouy])\1/g) || []).length;
    totalSyllables += Math.max(1, vowels - silent_e - consecutive);
  });

  return totalSyllables;
}

function identifyStrengths(text: string, metrics: ReadabilityMetrics): StrengthArea[] {
  const strengths: StrengthArea[] = [];
  const lowerText = text.toLowerCase();

  // Strong vocabulary
  if (metrics.uniqueWordCount > metrics.totalWordCount * 0.5) {
    strengths.push({
      title: '📚 Diverse Vocabulary',
      description: 'You use a variety of different words, which keeps the writing engaging.',
      evidence: `${metrics.uniqueWordCount} unique words out of ${metrics.totalWordCount} total`,
      score: Math.min(1, metrics.uniqueWordCount / metrics.totalWordCount),
    });
  }

  // Appropriate sentence variety
  if (metrics.sentenceVariety > 0.5) {
    strengths.push({
      title: '✨ Sentence Variety',
      description: 'Your sentences vary in length and structure, making the writing dynamic.',
      evidence: `Sentence variety score: ${(metrics.sentenceVariety * 100).toFixed(0)}%`,
      score: metrics.sentenceVariety,
    });
  }

  // Good readability
  if (metrics.readabilityGrade >= 8 && metrics.readabilityGrade <= 12) {
    strengths.push({
      title: '📖 Appropriate Reading Level',
      description: `Your writing is pitched at a ${Math.round(metrics.readabilityGrade)}-${Math.round(metrics.readabilityGrade) + 1} grade level, which is appropriate for most audiences.`,
      evidence: `Flesch-Kincaid Grade: ${metrics.readabilityGrade.toFixed(1)}`,
      score: 0.85,
    });
  }

  // Evidence and examples
  if (
    lowerText.includes('for example')
    || lowerText.includes('for instance')
    || lowerText.includes('according to')
    || lowerText.includes('research shows')
  ) {
    strengths.push({
      title: '💡 Use of Examples & Evidence',
      description: 'You support your claims with concrete examples and evidence.',
      evidence: 'Found evidence markers throughout the text',
      score: 0.8,
    });
  }

  // Clear organization
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length > 3) {
    strengths.push({
      title: '📋 Clear Organization',
      description: `Your assignment is organized into ${paragraphs.length} distinct sections, making it easy to follow.`,
      evidence: `Well-structured with ${paragraphs.length} paragraphs`,
      score: 0.8,
    });
  }

  // Transitions
  const transitions = [
    'however',
    'moreover',
    'furthermore',
    'therefore',
    'consequently',
    'in addition',
    'meanwhile',
    'as a result',
  ];
  const transitionCount = transitions.filter(t => lowerText.includes(t)).length;
  if (transitionCount > 2) {
    strengths.push({
      title: '🔗 Strong Transitions',
      description: 'You use transitional words to connect ideas smoothly.',
      evidence: `Found ${transitionCount} transition words creating logical flow`,
      score: Math.min(1, 0.5 + transitionCount * 0.15),
    });
  }

  return strengths.sort((a, b) => b.score - a.score);
}

function identifyImprovements(text: string, metrics: ReadabilityMetrics): ImprovementArea[] {
  const improvements: ImprovementArea[] = [];
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Passive voice
  if (metrics.passiveVoicePercentage > 0.3) {
    improvements.push({
      title: 'Reduce Passive Voice',
      currentState: `${(metrics.passiveVoicePercentage * 100).toFixed(0)}% of sentences use passive voice`,
      targetState: 'Use active voice in 80%+ of sentences',
      impact: 'important',
      examples:
        'Instead of "The assignment was completed by the student", say "The student completed the assignment"',
    });
  }

  // Vague language
  const vagueModifiers = text.match(/\b(very|really|quite|somewhat|just|kind of|sort of)\b/gi) || [];
  if (vagueModifiers.length > 2) {
    improvements.push({
      title: 'Replace Vague Modifiers',
      currentState: `${vagueModifiers.length} instances of vague language (very, really, quite, etc)`,
      targetState: 'Use precise, specific language instead',
      impact: 'important',
      examples: `Replace "very good" with "excellent", "very large" with "substantial"`,
    });
  }

  // Sentence length
  if (metrics.averageSentenceLength > 20) {
    improvements.push({
      title: 'Break Up Long Sentences',
      currentState: `Average sentence length: ${metrics.averageSentenceLength.toFixed(1)} words`,
      targetState: 'Keep average between 15-17 words',
      impact: 'important',
      examples: 'Long sentences can be confusing; break them into 2-3 shorter ones for clarity',
    });
  }

  // Readability grade too high
  if (metrics.readabilityGrade > 14) {
    improvements.push({
      title: 'Simplify Complex Sentences',
      currentState: `Reading level is ${metrics.readabilityGrade.toFixed(1)} (college graduate)`,
      targetState: 'Aim for 10-12 grade level for broader accessibility',
      impact: 'nice-to-have',
    });
  }

  // Limited evidence
  const evidenceMarkers = [
    'example',
    'evidence',
    'research',
    'according to',
    'study',
    'data',
    'citation',
  ];
  const evidenceCount = evidenceMarkers.filter(marker => lowerText.includes(marker)).length;
  if (evidenceCount < 2) {
    improvements.push({
      title: 'Add More Evidence & Examples',
      currentState: `Limited use of supporting evidence (${evidenceCount} marker${evidenceCount === 1 ? '' : 's'})`,
      targetState: 'Include 3-5+ concrete examples or citations',
      impact: 'critical',
      examples:
        'Add specific examples, quotes, research findings, or case studies to support your points',
    });
  }

  // No clear conclusion
  if (
    !lowerText.includes('in conclusion')
    && !lowerText.includes('to summarize')
    && !lowerText.includes('in summary')
  ) {
    improvements.push({
      title: 'Strengthen Conclusion',
      currentState: 'No clear concluding statement found',
      targetState: 'Add a summary or conclusion paragraph',
      impact: 'important',
    });
  }

  return improvements.sort((a, b) => {
    const impactOrder = { critical: 0, important: 1, 'nice-to-have': 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}

function generateActionableSuggestions(
  text: string,
  improvements: ImprovementArea[],
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  improvements.forEach(imp => {
    suggestions.push({
      category: imp.title,
      problem: imp.currentState,
      solution: imp.targetState + (imp.examples ? `. Example: ${imp.examples}` : ''),
      priority: imp.impact === 'critical' ? 5 : imp.impact === 'important' ? 3 : 1,
      effort: getEffort(imp.title),
    });
  });

  // Add proactive suggestions
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 300) {
    suggestions.push({
      category: 'Expand Coverage',
      problem: `Assignment is relatively short (${wordCount} words)`,
      solution: 'Consider adding more detail, examples, or analysis to reach 300+ words',
      priority: 2,
      effort: 'moderate',
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function getEffort(title: string): 'quick' | 'moderate' | 'significant' {
  if (
    title.includes('Vague')
    || title.includes('Passive')
  ) {
    return 'quick';
  }
  if (title.includes('Break') || title.includes('Strengthen')) {
    return 'moderate';
  }
  return 'significant';
}

function generateOverallFeedback(
  strengths: StrengthArea[],
  improvements: ImprovementArea[],
  metrics: ReadabilityMetrics,
): string {
  let feedback = `Your assignment shows solid foundational writing. `;

  if (strengths.length > 0) {
    feedback += `Strengths include ${strengths
      .slice(0, 2)
      .map(s => s.title.toLowerCase())
      .join(' and ')}. `;
  }

  const criticalIssues = improvements.filter(i => i.impact === 'critical');
  if (criticalIssues.length > 0) {
    feedback += `Focus on: ${criticalIssues
      .slice(0, 2)
      .map(i => i.title.toLowerCase())
      .join(' and ')}. `;
  }

  feedback += `With revisions, this could be excellent work. Your writing is at a ${metrics.readabilityGrade.toFixed(1)} grade reading level, which is good for academic writing.`;

  return feedback;
}

function generatePeerCommentary(
  strengths: StrengthArea[],
  improvements: ImprovementArea[],
  text: string,
): string {
  const wordCount = text.split(/\s+/).length;

  let commentary = `**Peer Teacher Comments:**\n\n`;

  commentary += `I really appreciated reading this. `;

  if (strengths.length > 0) {
    commentary += `${strengths[0].title.replace(/[📚✨📖💡🔗]/g, '').trim()} is a strong point—${strengths[0].description.toLowerCase()} `;
  }

  commentary += `\n\nTo make this even stronger, I'd suggest prioritizing ${
    improvements[0]?.title.toLowerCase() || 'adding more examples'
  }. ${improvements[0]?.examples || 'This will make your argument more convincing.'}\n\n`;

  commentary += `Overall word count is ${wordCount} words, which ${wordCount < 250 ? 'feels a bit short. Consider expanding.' : wordCount > 2000 ? 'is comprehensive. Make sure every part supports your main point.' : 'is a good length.'}`;

  return commentary;
}

function calculateEngagementScore(
  strengths: StrengthArea[],
  improvements: ImprovementArea[],
  metrics: ReadabilityMetrics,
): number {
  let score = 0.5; // Start at 0.5

  // Add points for strengths
  score += strengths.length * 0.1;
  score += (strengths.reduce((sum, s) => sum + s.score, 0) / Math.max(strengths.length, 1)) * 0.2;

  // Subtract points for critical improvements
  score -= improvements.filter(i => i.impact === 'critical').length * 0.15;

  // Factor in readability
  if (metrics.readabilityGrade >= 8 && metrics.readabilityGrade <= 12) {
    score += 0.15;
  }

  // Factor in sentence variety
  score += metrics.sentenceVariety * 0.1;

  return Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;
}
