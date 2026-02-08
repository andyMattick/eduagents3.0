import { StudentFeedback } from '../../types/pipeline';
import { StudentProfile } from '../../types/classroomProfiles';
import { GeneratedAssignment } from '../../hooks/useUserFlow';

/**
 * Generates mock student feedback for testing the rewriter pipeline
 * Uses enriched assignment metadata (complexity, novelty, rubrics) to generate realistic feedback
 */
export function generateMockFeedback(
  students: StudentProfile[],
  assignment: GeneratedAssignment | string = 'Assignment'
): StudentFeedback[] {
  const mockResponses: StudentFeedback[] = [];
  
  // Handle both string (legacy) and GeneratedAssignment (new enriched data)
  const allProblems = typeof assignment !== 'string' 
    ? assignment.sections.flatMap(s => s.problems) 
    : [];

  for (const student of students) {
    // Base time estimate (in minutes) with variation based on reading level
    let baseTime = 45;
    if (typeof assignment !== 'string') {
      // Use actual assignment estimated time if available
      baseTime = assignment.estimatedTime || 45;
    }
    const readingAdjustment = (1 - (student.Traits?.ReadingLevel || 0.5));
    const estimatedTime = baseTime * (1 + readingAdjustment * 0.5);

    // Identify problematic problems based on enriched metadata
    const problematicProblems = allProblems.filter(
      p => p.complexity === 'high' && p.novelty === 'high'
    );
    const easyProblems = allProblems.filter(
      p => p.complexity === 'low'
    );

    // Generate strengths feedback
    mockResponses.push({
      studentPersona: student.NarrativeTags?.[0] || student.StudentId,
      feedbackType: 'strength',
      content: `This student handles ${easyProblems.length > 0 ? 'foundational and ' : ''}conceptual problems well and can articulate reasoning clearly.`,
      whatWorked: 'The assignment structure with examples helps scaffold learning. Clear instructions and hints in problems guide thinking.',
      engagementScore: 0.75,
      timeToCompleteMinutes: estimatedTime,
      understoodConcepts: ['Main idea', 'Supporting details', 'Analysis applications'],
      estimatedGrade: 'A-',
      difficultySummary: 'Below average difficulty for this student profile.',
    });

    // Generate weakness feedback based on overlays and problem complexity
    const overlays = student.Overlays || [];
    let weaknessFeedback = '';
    let struggledAreas: string[] = [];

    if (overlays.includes('adhd')) {
      weaknessFeedback = `This ADHD learner struggles with ${problematicProblems.length > 0 ? 'complex, multi-step problems and ' : ''}unstructured text blocks, needing frequent checkpoint breaks to maintain focus.`;
      struggledAreas = ['Reading long paragraphs', 'Multi-step problems without checkpoints', 'Loss of engagement after 15-20 minutes'];
    } else if (overlays.includes('dyslexic')) {
      weaknessFeedback = 'Dense vocabulary and complex sentence structures make comprehension slower. Breaking text into smaller chunks would help.';
      struggledAreas = ['Complex vocabulary', 'Dense paragraphs', 'Distinguishing key vs. supporting information'];
    } else if (overlays.includes('fatigue_sensitive')) {
      weaknessFeedback = 'This learner fatigues easily. Multiple cognitive load peaks in the assignment cause checkout around 30 minutes in.';
      struggledAreas = ['Cumulative fatigue from complex problems', 'Sustained attention on dense material'];
    } else if (problematicProblems.length > 0) {
      weaknessFeedback = `${problematicProblems.length} highly complex and novel problems may be challenging without additional scaffolding.`;
      struggledAreas = ['Multi-part problem sequencing', 'Jumping from example to application without guided practice'];
    } else {
      weaknessFeedback = 'Some questions could benefit from more detailed scaffolding.';
      struggledAreas = ['Multi-part problem sequencing', 'Jumping from example to application without guided practice'];
    }

    mockResponses.push({
      studentPersona: student.NarrativeTags?.[0] || student.StudentId,
      feedbackType: 'weakness',
      content: weaknessFeedback,
      whatCouldBeImproved: 'Break questions into smaller, discrete parts with intermediate checks.',
      engagementScore: 0.55,
      timeToCompleteMinutes: estimatedTime * 1.3, // Takes longer due to struggles
      struggledWith: struggledAreas,
      estimatedGrade: overlays.includes('adhd') || overlays.includes('dyslexic') ? 'C+' : 'B-',
      atRiskProfile: true,
      atRiskFactors: [
        overlays.includes('adhd') ? 'Attention maintenance' : overlays.includes('dyslexic') ? 'Reading comprehension' : 'Cognitive fatigue',
        'Incomplete assignment submission likely',
      ],
    });

    // Generate suggestion feedback
    mockResponses.push({
      studentPersona: student.NarrativeTags?.[0] || student.StudentId,
      feedbackType: 'suggestion',
      content: `Consider adding skill-building checkpoints and varied problem types to accommodate different learning paces.`,
      specificQuestions: [
        'Can you break down multi-part problems into labeled sub-questions?',
        'Would visual diagrams or concept maps help organize information?',
        'Can key vocabulary be highlighted or defined on first use?',
      ],
      engagementScore: 0.65,
      timeToCompleteMinutes: estimatedTime * 0.85, // With improvements
      difficultySummary: 'Medium difficulty; addressable with structural improvements.',
    });
  }

  return mockResponses;
}

/**
 * Generates mock completion simulation data
 */
export function generateMockCompletionSimulation(
  studentCount: number,
  estimatedAssignmentTime: number = 45
) {
  const completionMetrics = {
    averageTimeMinutes: estimatedAssignmentTime * 1.2,
    predictedCompletionRate: 0.78, // 78% of students finish
    estimatedAtRiskCount: Math.ceil(studentCount * 0.22), // 22% at risk
    studentSimulations: Array.from({ length: studentCount }, (_, i) => ({
      studentId: `student-${i}`,
      completedAt: Math.random() > 0.22 ? estimatedAssignmentTime * (0.9 + Math.random() * 0.3) : null,
      checkedOutAt: Math.random() > 0.22 ? null : estimatedAssignmentTime * Math.random() * 0.8,
      struggleAreas: ['Reading comprehension', 'Multi-part problem coordination'],
      strengths: ['Conceptual thinking', 'Working with examples'],
    })),
    classSummary: {
      totalStudents: studentCount,
      completedCount: Math.floor(studentCount * 0.78),
      atRiskCount: Math.ceil(studentCount * 0.22),
      averageDifficulty: 'medium',
      recommendedImprovements: [
        'Break multi-part problems into smaller discrete questions',
        'Add visual scaffolding (diagrams, concept maps)',
        'Include skill-building checkpoints',
        'Simplify vocabulary or add glossary',
      ],
    },
  };

  return completionMetrics;
}
