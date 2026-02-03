import { StudentFeedback } from '../../types/pipeline';

export interface AccessibilityProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  preferences: string[];
  strengths: string[];
}

export const ACCESSIBILITY_PROFILES: Record<string, AccessibilityProfile> = {
  dyslexia: {
    id: 'dyslexia',
    name: '📖 Dyslexic Learner',
    icon: '📖',
    description: 'Prefers shorter paragraphs, simpler vocabulary, clear structure',
    preferences: [
      'Break text into smaller chunks (2-3 sentences per paragraph)',
      'Use simple, concrete words instead of complex vocabulary',
      'Use active voice (shorter sentence structure)',
      'Avoid dense paragraphs—white space is helpful',
      'Number steps or use bullet points for clarity',
      'Sans-serif fonts and adequate line spacing (in visual presentation)',
    ],
    strengths: ['Big-picture thinking', 'Creative problem-solving', 'Spatial reasoning', 'Verbal communication'],
  },
  adhd: {
    id: 'adhd',
    name: '⚡ ADHD Learner',
    icon: '⚡',
    description: 'Needs clear structure, visual hierarchy, engaging hooks',
    preferences: [
      'Start with an engaging hook or question',
      'Use clear visual hierarchy (headings, bold, spacing)',
      'Include bullet points and numbered lists',
      'Break longer text into short paragraphs (3-4 sentences max)',
      'Include engaging examples early to maintain interest',
      'Clearly state "why this matters" to maintain relevance',
      'Conclusion should restate the key takeaway',
    ],
    strengths: ['Creative problem-solving', 'Hyperfocus on interesting topics', 'Big-picture connections', 'Energy and enthusiasm'],
  },
  visual_processing: {
    id: 'visual_processing',
    name: '👁️ Visual Processing Disorder',
    icon: '👁️',
    description: 'Needs consistent formatting, clear organization, adequate spacing',
    preferences: [
      'Consistent formatting throughout (same font, size, spacing)',
      'Adequate white space between ideas',
      'Clear visual separation of topics (use headings)',
      'Avoid clutter or information overload on screen',
      'Logical, predictable structure',
      'Consistent use of formatting (bold, italics, bullet points)',
      'High contrast between text and background',
    ],
    strengths: ['Sequential processing', 'Careful attention to detail', 'Methodical thinking', 'Organized approach'],
  },
  auditory_processing: {
    id: 'auditory_processing',
    name: '👂 Auditory Processing Disorder',
    icon: '👂',
    description: 'Needs written summaries, step-by-step breakdown, clear sections',
    preferences: [
      'Written summaries of complex ideas (not just spoken)',
      'Step-by-step breakdown of processes',
      'Clear section headings and labels',
      'Explicit transitions between ideas',
      'Main point stated clearly at the start of each section',
      'Avoid colloquial language—be specific and literal',
      'Include a summary or conclusion that ties everything together',
    ],
    strengths: ['Reading comprehension', 'Written communication', 'Visual learning', 'Analytical thinking'],
  },
  dyscalculia: {
    id: 'dyscalculia',
    name: '🔢 Dyscalculia Support',
    icon: '🔢',
    description: 'Needs contextual problems, step-by-step processes, word problems over pure math',
    preferences: [
      'Explain numbers in context (not just raw data)',
      'Use word problems that connect to real-world scenarios',
      'Show work step-by-step',
      'Avoid overwhelming with multiple numbers or complex calculations',
      'Use visual representations (charts, diagrams) alongside numbers',
      'Relate concepts to quantities they can visualize',
      'Emphasize the "why" behind calculations',
    ],
    strengths: ['Pattern recognition', 'Creative thinking', 'Understanding context', 'Practical problem-solving'],
  },
};

/**
 * Generate feedback tailored to a specific accessibility profile
 * Adapts tone, structure, and suggestions to match learning preferences
 */
export function generateAccessibilityFeedback(
  assignmentText: string,
  profileId: string,
  _strengths: string[] = [],
  _weaknesses: string[] = [],
): StudentFeedback | null {
  const profile = ACCESSIBILITY_PROFILES[profileId];
  if (!profile) return null;

  const wordCount = assignmentText.split(/\s+/).length;
  const paragraphs = assignmentText.split(/\n\n+/).filter(p => p.trim().length > 0);
  const avgParagraphLength = wordCount / paragraphs.length;

  let feedbackContent = '';
  let feedbackType: 'strength' | 'weakness' | 'suggestion' = 'suggestion';

  // Profile-specific feedback
  if (profileId === 'dyslexia') {
    feedbackType = avgParagraphLength > 150 ? 'suggestion' : 'strength';
    feedbackContent = avgParagraphLength > 150
      ? `📖 **For Dyslexic Readers:** Your paragraphs average ${Math.round(avgParagraphLength)} words, which can be tiring to read. Try breaking longer paragraphs into 2-3 sentences each. Also, use simpler vocabulary where possible (e.g., "use" instead of "utilize"). Short, direct sentences help a lot! Your strengths: ${profile.strengths.slice(0, 2).join(', ')}.`
      : `📖 **Great structure for Dyslexic Readers!** Your paragraphs are bite-sized (avg ${Math.round(avgParagraphLength)} words), which makes reading much easier. Your clear structure supports people with dyslexia. Keep this up!`;
  } else if (profileId === 'adhd') {
    const hasHook = assignmentText.slice(0, 200).match(/[?!]/) || assignmentText.slice(0, 200).match(/engaging|interesting|surprising/i);
    feedbackType = hasHook ? 'strength' : 'suggestion';
    feedbackContent = hasHook
      ? `⚡ **For ADHD Readers:** Your opening is engaging! The early hook keeps attention. You also use clear structure with headings/lists. This helps people with ADHD stay focused. One tip: Make sure each section explains "why this matters" so readers stay motivated.`
      : `⚡ **For ADHD Readers:** Start stronger! Open with a question or surprising fact instead of background info. Also, break this into clearly labeled sections with bullet points where possible. ADHD readers need to see structure and understand relevance early. "Why does this matter?" should be clear by paragraph 2.`;
  } else if (profileId === 'visual_processing') {
    const hasConsistentFormatting = assignmentText.match(/\n\n/g)?.length || 0 > paragraphs.length - 1;
    feedbackType = hasConsistentFormatting ? 'strength' : 'suggestion';
    feedbackContent = hasConsistentFormatting
      ? `👁️ **For Visual Processing:** Your consistent formatting and good spacing make this easy to navigate visually. The clear sections and white space are excellent for readers who need visual clarity.`
      : `👁️ **For Visual Processing Clarity:** Add consistent spacing between sections. Right now the visual organization could be clearer. Use headings to break up the text. Avoid changing formatting styles mid-document. Visual consistency helps readers with visual processing differences stay focused.`;
  } else if (profileId === 'auditory_processing') {
    const hasExplicitSummary = assignmentText.toLowerCase().includes('summary') || assignmentText.toLowerCase().includes('conclusion');
    feedbackType = hasExplicitSummary ? 'strength' : 'suggestion';
    feedbackContent = hasExplicitSummary
      ? `👂 **For Auditory Processing:** Excellent! You include a clear summary section. Your explicit transitions (however, furthermore, etc.) help readers follow your logic step-by-step. The written breakdown is clear and literal, which is perfect for auditory processing support.`
      : `👂 **For Auditory Processing Support:** Add an explicit summary section at the end that restates your main points. Use clear transitions like "First," "Next," "Finally" to guide readers step-by-step. Instead of implying meaning, state it directly. "The key point is..." helps more than assuming understanding.`;
  } else if (profileId === 'dyscalculia') {
    const hasContext = assignmentText.match(/real-world|example|imagine|scenario|context/i);
    feedbackType = hasContext ? 'strength' : 'suggestion';
    feedbackContent = hasContext
      ? `🔢 **For Dyscalculia Support:** Great! You ground numbers in real-world context and explain the "why" behind concepts. This contextual approach makes information accessible. Your step-by-step breakdown helps readers understand the process, not just the result.`
      : `🔢 **For Dyscalculia Support:** When using numbers or quantities, add context. "10 students" means more than just "10" if you explain "that's half the class." Show the calculation steps. Use analogies and real-world examples. Avoid overwhelming readers with multiple numbers at once. Focus on understanding the "why," not just memorizing the answer.`;
  }

  const relevantTags = profile.preferences.map(p => p.toLowerCase().replace(/\s+/g, '-')).slice(0, 3);

  return {
    studentPersona: profile.name,
    feedbackType,
    content: feedbackContent,
    relevantTags: ['accessibility', ...relevantTags],
    engagementScore: feedbackType === 'strength' ? 0.85 : 0.65,
  };
}

/**
 * Generate all accessibility profile feedbacks for an assignment
 * Returns an array of feedback from each accessibility lens
 */
export function generateAllAccessibilityFeedback(
  assignmentText: string,
  enabledProfiles?: string[],
): StudentFeedback[] {
  const feedbackArray: StudentFeedback[] = [];

  const profilesToCheck = enabledProfiles || Object.keys(ACCESSIBILITY_PROFILES);

  for (const profileId of profilesToCheck) {
    const feedback = generateAccessibilityFeedback(assignmentText, profileId);
    if (feedback) {
      feedbackArray.push(feedback);
    }
  }

  return feedbackArray;
}
