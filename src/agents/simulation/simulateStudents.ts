import { StudentFeedback } from '../../types/pipeline';

export interface EnhancedStudentFeedback extends StudentFeedback {
  specificQuestions?: string[];
  detailedComments?: string;
  whatWorked?: string;
  whatCouldBeImproved?: string;
}

/**
 * Full payload sent to simulateStudents for verification and debugging
 */
export interface SimulateStudentsPayload {
  assignmentText: string;
  textMetadata: {
    textLength: number;
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    hasEvidence: boolean;
    hasTransitions: boolean;
  };
  assignmentMetadata: {
    type: string;
    difficulty: string;
    gradeLevel?: string;
    subject?: string;
    learnerProfiles?: string[];
  };
  processingOptions: {
    selectedStudentTags?: string[];
    includeAccessibilityProfiles?: boolean;
  };
  timestamp: string;
}

// Global payload store for debugging/verification
let lastSimulateStudentsPayload: SimulateStudentsPayload | null = null;

/**
 * Get the last payload sent to simulateStudents
 * Useful for verification and debugging
 */
export function getLastSimulateStudentsPayload(): SimulateStudentsPayload | null {
  return lastSimulateStudentsPayload;
}

/**
 * Clear the stored payload
 */
export function clearSimulateStudentsPayload(): void {
  lastSimulateStudentsPayload = null;
}

/**
 * Simulates detailed feedback from different student personas
 * More in-depth and constructive, like real peer feedback would be
 * 
 * TODO: Phase 2 - Replace with real Asteroid × Astronaut simulation
 * Currently: Text-based analysis with mock results
 * Phase 2: Will use actual student profiles × problem metadata for realistic simulation
 */
export async function simulateStudents(
  assignmentText: string,
  assignmentMetadataTags?: string[],
  options?: {
    gradeLevel?: string;
    subject?: string;
    learnerProfiles?: string[];
    selectedStudentTags?: string[];
    asteroidCount?: number;  // Number of problems in assignment
  }
): Promise<StudentFeedback[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  if (!assignmentText || assignmentText.trim().length === 0) {
    return [];
  }

  const textLength = assignmentText.length;
  const wordCount = assignmentText.split(/\s+/).length;
  const sentences = assignmentText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = assignmentText.split(/\n\n+/).filter(p => p.trim().length > 0);
  const hasEvidence = assignmentText.toLowerCase().includes('example')
    || assignmentText.toLowerCase().includes('evidence')
    || assignmentText.toLowerCase().includes('research');
  const hasTransitions = assignmentText.toLowerCase().includes('however')
    || assignmentText.toLowerCase().includes('therefore')
    || assignmentText.toLowerCase().includes('moreover')
    || assignmentText.toLowerCase().includes('additionally');

  const assignmentType = assignmentMetadataTags?.find(t => t.startsWith('type:'))?.split(':')[1] || 'essay';
  const difficulty = assignmentMetadataTags?.find(t => t.startsWith('difficulty:'))?.split(':')[1] || 'intermediate';

  // **CONSTRUCT FULL PAYLOAD FOR VERIFICATION**
  const payload: SimulateStudentsPayload = {
    assignmentText: assignmentText.substring(0, 500), // First 500 chars for verification
    textMetadata: {
      textLength,
      wordCount,
      sentenceCount: sentences,
      paragraphCount: paragraphs.length,
      hasEvidence,
      hasTransitions,
    },
    assignmentMetadata: {
      type: assignmentType,
      difficulty,
      gradeLevel: options?.gradeLevel,
      subject: options?.subject,
      learnerProfiles: options?.learnerProfiles,
      problemCount: options?.asteroidCount,  // Number of structured problems (asteroids)
    },
    processingOptions: {
      selectedStudentTags: options?.selectedStudentTags,
      includeAccessibilityProfiles: true,
    },
    timestamp: new Date().toISOString(),
  };

  // Store payload globally for debugging/verification
  lastSimulateStudentsPayload = payload;

  // Log payload to console for verification
  console.log('📊 SIMULATE STUDENTS PAYLOAD', {
    ...payload,
    textLength: `${payload.textMetadata.textLength} chars`,
    wordCount: `${payload.textMetadata.wordCount} words`,
    problemCount: payload.assignmentMetadata.problemCount || 'unknown',
    subject: payload.assignmentMetadata.subject,
    gradeLevel: payload.assignmentMetadata.gradeLevel,
  });

  // Initialize feedback array
  const feedback: StudentFeedback[] = [];

  // 1. Visual Learner
  feedback.push({
    studentPersona: '👁️ Visual Learner',
    feedbackType: hasEvidence ? 'strength' : 'suggestion',
    content: hasEvidence
      ? `Excellent use of concrete examples! I can really picture what you're talking about. The examples help me understand the abstract concepts much better. Could you consider adding diagrams, charts, or a visual summary to make it even more memorable?`
      : `I'm having trouble visualizing some of the concepts. For example, when you discuss [topic], could you add a real-world example or scenario? Visual learners like me benefit from seeing the "story" behind the ideas. Try: "For instance..." or "Imagine..." to help us see what you mean.`,
    relevantTags: ['evidence-based', 'concrete-examples', 'clarity'],
    engagementScore: Math.min(0.95, 0.5 + textLength / 1000),
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.4 + (hasEvidence ? -5 : 10)),
    understoodConcepts: hasEvidence ? ['concrete examples', 'visual patterns', 'structured information'] : ['simple concepts'],
    struggledWith: hasEvidence ? ['abstract theory'] : ['visualization', 'mental models'],
    estimatedGrade: hasEvidence ? 'B+' : 'C',
  });

  // 2. Critical/Analytical Reader
  feedback.push({
    studentPersona: '🔬 Critical Reader',
    feedbackType: hasEvidence && wordCount > 300 ? 'strength' : 'weakness',
    content: hasEvidence && wordCount > 300
      ? `Strong argumentation! I appreciate that you back up your claims with evidence throughout. The way you build your argument from point to point is logical. One question though: did you consider any counterarguments? What would someone who disagrees with you say?`
      : `I want to understand your reasoning better. You make several claims (${Math.ceil(sentences / 3)} major points that I counted), but not all of them have strong support. Which are your most important claims? Can you strengthen those with research, statistics, or expert quotes? Right now it feels like you're telling me what to think rather than showing me why to think it.`,
    relevantTags: ['critical-thinking', 'evidence-based', 'argumentation'],
    engagementScore: Math.min(0.95, 0.4 + wordCount / 500),
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.5 + (hasEvidence ? 10 : 20)),
    understoodConcepts: hasEvidence ? ['argumentation', 'evidence use', 'logical structure'] : [],
    struggledWith: hasEvidence ? ['counterarguments'] : ['evidence synthesis', 'critical analysis'],
    estimatedGrade: hasEvidence ? 'A-' : 'C+',
  });

  // 3. Pragmatic/Applied Learner
  feedback.push({
    studentPersona: '⚙️ Hands-On Learner',
    feedbackType: paragraphs.length > 2 ? 'strength' : 'suggestion',
    content:
      paragraphs.length > 2
        ? `I like how this is organized! It's easy to follow the logic. What really helped me was [specific section]. But here's my question: How would I actually USE this information? What's the practical next step? If this is policy, how does it affect my community? If it's a concept, what's a real-world application?`
        : `I'm struggling to see how this connects to the real world. Break this into clear sections with headings like "What It Is," "Why It Matters," "How It Works," and "What We Do About It." Then give specific examples for each part. Help me understand not just the "what" but the "so what?"`,
    relevantTags: ['practical-application', 'structure', 'real-world-relevance'],
    engagementScore: Math.min(0.9, 0.6 + paragraphs.length / 5),
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.45),
    understoodConcepts: ['practical applications', 'step-by-step processes'],
    struggledWith: ['abstract theory', 'context-free information'],
    estimatedGrade: paragraphs.length > 2 ? 'B' : 'C',
  });

  // 4. Detailed/Perfectionist Peer
  feedback.push({
    studentPersona: '✏️ Detail-Oriented Peer',
    feedbackType: hasTransitions ? 'strength' : 'suggestion',
    content: hasTransitions
      ? `I noticed you use transition phrases smoothly—that's great! The flow is logical. A few tiny suggestions: [Section 2] could be clearer with a topic sentence. Also, your conclusion is strong, but consider opening it with a brief restatement of your main idea. These small touches would elevate this to A+ work.`
      : `A few things stood out to me: 1) Some transitions between paragraphs feel abrupt. Try "In addition," "However," or "This reveals that..." 2) Your opening is good, but what's your main argument in one sentence? Make sure that thesis is crystal clear in your intro. 3) The ending could be stronger—don't just stop, actually conclude!`,
    relevantTags: ['structure', 'clarity', 'transitions'],
    engagementScore: hasTransitions ? 0.82 : 0.68,
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.6 + 15), // Takes extra time for polish
    understoodConcepts: ['structure', 'flow', 'polish', 'detail'],
    struggledWith: hasTransitions ? ['polish'] : ['transitions', 'organization'],
    estimatedGrade: hasTransitions ? 'A' : 'B-',
  });

  // 5. Creative/Big-Picture Thinker
  feedback.push({
    studentPersona: '💭 Creative Thinker',
    feedbackType: assignmentText.includes('"') || assignmentText.includes("'") ? 'strength' : 'suggestion',
    content: assignmentText.includes('"') || assignmentText.includes("'")
      ? `I love the voice in this! Your examples feel authentic, and you're not just regurgitating facts. You're actually thinking about this material. My challenge to you: Can you go deeper? What's the counterintuitive insight? What would surprise someone reading this? What did YOU learn that changed your mind?`
      : `This feels a bit surface-level. Don't just tell me facts—tell me what YOU think about these facts. Use direct quotes, tell a story, ask provocative questions. Make me care! What's surprising about this topic? What assumptions does everyone make that might be wrong?`,
    relevantTags: ['voice', 'originality', 'critical-thinking'],
    engagementScore: 0.72,
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.35), // Creative types work faster
    understoodConcepts: ['big picture', 'connections', 'relevance'],
    struggledWith: assignmentText.includes('"') ? [] : ['depth', 'originality'],
    estimatedGrade: assignmentText.includes('"') ? 'A-' : 'B+',
  });

  // 6. Supportive Cheerleader
  feedback.push({
    studentPersona: '🌟 Supportive Peer',
    feedbackType: 'strength',
    content: `Hey, I think you put real effort into this, and it shows! The best part is [strongest section]—that's genuinely insightful. You clearly understand this material. Don't get discouraged by feedback on small details; those are easy fixes. The bones of your work are solid. With one more revision focusing on evidence and clarity, this will be really strong!`,
    relevantTags: ['encouragement', 'engagement'],
    engagementScore: 0.85,
    // Persona metrics
    timeToCompleteMinutes: Math.ceil(wordCount * 0.4),
    understoodConcepts: ['main concepts', 'effort recognition'],
    struggledWith: [],
    estimatedGrade: 'A-',
  });

  // Add difficulty-specific feedback
  if (difficulty === 'advanced' || difficulty === 'expert') {
    feedback.push({
      studentPersona: '🎓 Advanced Peer',
      feedbackType: hasEvidence && hasTransitions ? 'strength' : 'suggestion',
      content: hasEvidence && hasTransitions
        ? `This is sophisticated thinking. I like how you nuance your position and acknowledge complexity. Here's what would take it to the next level: Have you consulted primary sources? Are there recent developments that challenge or support your argument? What would scholars in this field critique about your position?`
        : `For advanced work, I'd expect engagement with primary sources or cutting-edge research. Your synthesis is good, but are you extending the conversation or summarizing it? Show me something new you've figured out, not just what others have said.`,
      relevantTags: ['critical-thinking', 'original-research'],
      engagementScore: 0.75,
      // Persona metrics
      timeToCompleteMinutes: Math.ceil(wordCount * 0.55),
      understoodConcepts: ['advanced concepts', 'nuance', 'primary research'],
      struggledWith: hasEvidence ? ['complexity'] : ['depth', 'originality'],
      estimatedGrade: 'A',
    });
  }

  // Add assignment-type-specific detailed feedback
  if (assignmentType === 'research-paper') {
    feedback.push({
      studentPersona: '📚 Research Advisor',
      feedbackType: wordCount > 1000 ? 'strength' : 'suggestion',
      content: wordCount > 1000
        ? `Good research depth. I can see you've investigated the topic thoroughly. Quick question for you: Are your sources recent? Do they represent different perspectives, or mostly one viewpoint? For a strong research paper, we want to show intellectual honesty by including credible sources that might disagree with your thesis.`
        : `For a research paper, we typically want 1000+ words and 5+ sources. Right now you're at ${wordCount} words. This is a chance to really dig in. What specific sources would strengthen each of your main points? Consider adding: academic journals, books, interviews with experts, and current case studies.`,
      relevantTags: ['research-depth', 'source-variety'],
      engagementScore: Math.min(0.9, 0.5 + wordCount / 1500),
      // Persona metrics
      timeToCompleteMinutes: Math.ceil(wordCount * 0.6 + 30), // Research takes longer
      understoodConcepts: ['research methodology', 'source evaluation'],
      struggledWith: wordCount > 1000 ? ['source diversity'] : ['depth', 'research breadth'],
      estimatedGrade: wordCount > 1000 ? 'B+' : 'C+',
    });
  } else if (assignmentType === 'creative-writing') {
    feedback.push({
      studentPersona: '✍️ Writing Coach',
      feedbackType: assignmentText.includes('"') || assignmentText.length > 500 ? 'strength' : 'suggestion',
      content: assignmentText.includes('"') || assignmentText.length > 500
        ? `There's real voice here! Your dialogue/narrative feels natural. The descriptive parts let me imagine the scene. Keep this momentum! One revision tip: Read it aloud and notice where you stumble—that's where your reader might stumble too. Polish those sentences.`
        : `Creative writing needs sensory details and voice. Instead of: "The day was hot," try: "The sun beat down mercilessly, and sweat pooled at the base of my neck." Show us, don't tell us. Also, vary your sentence length for rhythm—short. Punchy. Sentences. Mix with longer, flowing descriptive passages.`,
      relevantTags: ['voice', 'description', 'dialogue'],
      engagementScore: 0.75,
    });
  }

  return feedback;
}
