/**
 * Assessment Summarizer Service (Phase 2)
 *
 * Converts teacher-friendly AssessmentIntent inputs into:
 * 1. Natural language summary (for teacher + AI context)
 * 2. Internal Space Camp payload (hidden from teacher)
 *
 * Pipeline Integrity:
 * - SpaceCampPayload structure unchanged
 * - Bloom distributions sum to ~1.0 (within 0.02 tolerance)
 * - All constraints enforced (gradeBand, classLevel, subject, etc.)
 * - Optional fields handled gracefully
 */

import {
  AssessmentIntent,
  StudentLevel,
  AssessmentType,
  AssessmentEmphasis,
  DifficultyProfile,
  BloomDistribution,
  GradeBand,
  ClassLevel,
  Subject,
  SummarizedAssessmentIntent,
  DerivedMetadata,
  STUDENT_LEVEL_TO_GRADE_BAND,
  STUDENT_LEVEL_TO_CLASS_LEVEL,
  BLOOM_DISTRIBUTIONS_BY_LEVEL,
  EMPHASIS_MODIFIERS,
  COMPLEXITY_RANGES,
  FATIGUE_MULTIPLIERS,
  ESTIMATED_QUESTIONS_BY_TIME,
} from '../types/assessmentIntent';

/**
 * Estimate Bloom distribution based on student level, assessment type, and emphasis
 *
 * Algorithm:
 * 1. Get base distribution for StudentLevel
 * 2. Apply emphasis modifiers (add/subtract percentages)
 * 3. Normalize to sum to 1.0
 * 4. Validate within bounds
 */
export function estimateBloomDistribution(
  studentLevel: StudentLevel,
  assessmentType: AssessmentType,
  emphasis?: AssessmentEmphasis
): BloomDistribution {
  // Step 1: Get base distribution for level
  const baseDistribution = { ...BLOOM_DISTRIBUTIONS_BY_LEVEL[studentLevel] };

  // Step 2: Apply emphasis modifier if provided
  if (emphasis && emphasis !== 'Balanced') {
    const modifier = EMPHASIS_MODIFIERS[emphasis];

    // Add modifiers to base distribution
    const modifiedDist = {
      Remember: baseDistribution.Remember + modifier.Remember,
      Understand: baseDistribution.Understand + modifier.Understand,
      Apply: baseDistribution.Apply + modifier.Apply,
      Analyze: baseDistribution.Analyze + modifier.Analyze,
      Evaluate: baseDistribution.Evaluate + modifier.Evaluate,
      Create: baseDistribution.Create + modifier.Create,
    };

    // Step 3: Clamp negative values to 0 (can't have negative percentages)
    const clampedDist = {
      Remember: Math.max(0, modifiedDist.Remember),
      Understand: Math.max(0, modifiedDist.Understand),
      Apply: Math.max(0, modifiedDist.Apply),
      Analyze: Math.max(0, modifiedDist.Analyze),
      Evaluate: Math.max(0, modifiedDist.Evaluate),
      Create: Math.max(0, modifiedDist.Create),
    };

    // Step 4: Normalize to sum to 1.0
    const sum =
      clampedDist.Remember +
      clampedDist.Understand +
      clampedDist.Apply +
      clampedDist.Analyze +
      clampedDist.Evaluate +
      clampedDist.Create;

    if (sum > 0) {
      return {
        Remember: clampedDist.Remember / sum,
        Understand: clampedDist.Understand / sum,
        Apply: clampedDist.Apply / sum,
        Analyze: clampedDist.Analyze / sum,
        Evaluate: clampedDist.Evaluate / sum,
        Create: clampedDist.Create / sum,
      };
    }
  }

  // Step 5: Apply special rules for ExamStyle emphasis
  if (emphasis === 'ExamStyle') {
    // Ensure minimum 20% Analyze + Evaluate
    let analyze = baseDistribution.Analyze;
    let evaluate = baseDistribution.Evaluate;

    if (analyze + evaluate < 0.2) {
      const deficit = 0.2 - (analyze + evaluate);
      analyze += deficit * 0.5;
      evaluate += deficit * 0.5;

      // Adjust other levels proportionally
      const adjustmentFactor = (1 - 0.2) / (1 - (baseDistribution.Analyze + baseDistribution.Evaluate));

      return {
        Remember: baseDistribution.Remember * adjustmentFactor,
        Understand: baseDistribution.Understand * adjustmentFactor,
        Apply: baseDistribution.Apply * adjustmentFactor,
        Analyze: analyze,
        Evaluate: evaluate,
        Create: baseDistribution.Create * (studentLevel === 'AP' || studentLevel === 'Honors' ? 1 : 0),
      };
    }

    // Ensure minimum 5% Create for Honors/AP
    if ((studentLevel === 'Honors' || studentLevel === 'AP') && baseDistribution.Create < 0.05) {
      const deficit = 0.05 - baseDistribution.Create;
      const adjustmentFactor = (1 - 0.05) / (1 - baseDistribution.Create);

      return {
        Remember: baseDistribution.Remember * adjustmentFactor,
        Understand: baseDistribution.Understand * adjustmentFactor,
        Apply: baseDistribution.Apply * adjustmentFactor,
        Analyze: baseDistribution.Analyze * adjustmentFactor,
        Evaluate: baseDistribution.Evaluate * adjustmentFactor,
        Create: 0.05,
      };
    }
  }

  return baseDistribution;
}

/**
 * Validate that Bloom distribution sums to ~1.0 (within tolerance)
 */
function validateBloomDistribution(
  dist: BloomDistribution,
  tolerance: number = 0.02
): { valid: boolean; sum: number; error?: string } {
  const sum =
    dist.Remember +
    dist.Understand +
    dist.Apply +
    dist.Analyze +
    dist.Evaluate +
    dist.Create;

  const valid = Math.abs(sum - 1.0) <= tolerance;

  return {
    valid,
    sum,
    error: valid ? undefined : `Bloom distribution sum is ${sum.toFixed(3)}, expected ~1.0 (±${tolerance})`,
  };
}

/**
 * Infer subject from assessment context
 * Used when subject not explicitly provided
 */
function inferSubject(context: Partial<AssessmentIntent>): Subject {
  const topic = context.sourceTopic?.toLowerCase() || '';
  const contextStr = context.classroomContext?.toLowerCase() || '';

  // Simple heuristics based on keywords
  if (/math|algebra|geometry|calculus|statistics|numbers|equations/i.test(topic + contextStr)) {
    return 'math';
  }
  if (/english|reading|writing|literature|grammar|vocabulary/i.test(topic + contextStr)) {
    return 'english';
  }
  if (/science|biology|chemistry|physics|energy|atoms|cells/i.test(topic + contextStr)) {
    return 'science';
  }
  if (/history|government|civics|social|events|dates/i.test(topic + contextStr)) {
    return 'history';
  }

  return 'general';
}

/**
 * Estimate total time and question count
 */
function estimateQuestionCount(
  timeMinutes: number,
  assessmentType: AssessmentType
): { questionCount: number; estimatedTimePerQuestion: number } {
  const questionsPerMinute = ESTIMATED_QUESTIONS_BY_TIME[assessmentType];
  const questionCount = Math.round(timeMinutes * questionsPerMinute);

  return {
    questionCount: Math.max(1, questionCount), // At least 1 question
    estimatedTimePerQuestion: 1 / questionsPerMinute,
  };
}

/**
 * Derive Space Camp metadata from AssessmentIntent
 */
export function deriveSpaceCampMetadata(intent: AssessmentIntent): {
  documentMetadata: { gradeBand: GradeBand; subject: Subject; classLevel: ClassLevel; timeTargetMinutes: number };
  estimatedBloomTargets: BloomDistribution;
  complexityRange: [number, number];
  estimatedQuestionCount: number;
  bloomCognitiveWeights?: Record<string, Record<string, number>>;
  fatigueImpactMultiplier?: number;
  emphasizeConceptual?: boolean;
  emphasizeProcedural?: boolean;
  emphasizeApplication?: boolean;
  emphasizeExamStyle?: boolean;
  scaffoldingNeeded?: string;
  focusAreas?: string[];
} {
  // Map student level to internal types
  const gradeBand = STUDENT_LEVEL_TO_GRADE_BAND[intent.studentLevel];
  const classLevel = STUDENT_LEVEL_TO_CLASS_LEVEL[intent.studentLevel];

  // Infer subject
  const subject = inferSubject(intent);

  // Estimate Bloom distribution
  const bloomTargets = estimateBloomDistribution(intent.studentLevel, intent.assessmentType, intent.emphasis);

  // Validate Bloom distribution
  const validation = validateBloomDistribution(bloomTargets);
  if (!validation.valid) {
    console.warn(`⚠️ Bloom distribution validation: ${validation.error}`);
  }

  // Get complexity range for this level
  const [minComplexity, maxComplexity] = COMPLEXITY_RANGES[intent.studentLevel];

  // Estimate question count
  const { questionCount } = estimateQuestionCount(intent.timeMinutes, intent.assessmentType);

  // Get fatigue multiplier
  const fatigueMultiplier = FATIGUE_MULTIPLIERS[intent.studentLevel];

  return {
    documentMetadata: {
      gradeBand,
      subject,
      classLevel,
      timeTargetMinutes: intent.timeMinutes,
    },
    estimatedBloomTargets: bloomTargets,
    complexityRange: [minComplexity, maxComplexity],
    estimatedQuestionCount: questionCount,
    fatigueImpactMultiplier: fatigueMultiplier,
    emphasizeConceptual: intent.emphasis === 'Conceptual',
    emphasizeProcedural: intent.emphasis === 'Procedural',
    emphasizeApplication: intent.emphasis === 'Application',
    emphasizeExamStyle: intent.emphasis === 'ExamStyle',
    scaffoldingNeeded: intent.classroomContext,
    focusAreas: intent.focusAreas,
  };
}

/**
 * Build teacher-friendly natural language summary
 */
export function buildNaturalLanguageSummary(intent: AssessmentIntent): string {
  // Parts of summary
  const parts: string[] = [];

  // Level + Type + Time
  const levelName = {
    Remedial: 'Remedial-level',
    Standard: 'Standard-level',
    Honors: 'Honors-level',
    AP: 'AP/College-level',
  }[intent.studentLevel];

  const typeName = {
    Quiz: 'quiz',
    Test: 'test',
    Practice: 'practice set',
  }[intent.assessmentType];

  const source = intent.sourceFile ? intent.sourceFile.name : `topic: "${intent.sourceTopic}"`;

  parts.push(
    `Create a ${levelName} ${typeName} (${intent.timeMinutes} min) from ${source}.`
  );

  // Focus areas
  if (intent.focusAreas && intent.focusAreas.length > 0) {
    const focusStr = intent.focusAreas.join(', ');
    parts.push(`Focus on: ${focusStr}.`);
  }

  // Emphasis
  if (intent.emphasis && intent.emphasis !== 'Balanced') {
    const emphasisMap = {
      Procedural: 'procedural fluency and skill execution',
      Conceptual: 'conceptual understanding and deep reasoning',
      Application: 'application and real-world problem-solving',
      ExamStyle: 'exam-style questions with balanced rigor',
      Balanced: 'balanced difficulty',
    };
    parts.push(`Emphasize ${emphasisMap[intent.emphasis]}.`);
  }

  // Difficulty profile
  if (intent.difficultyProfile && intent.difficultyProfile !== 'Balanced') {
    const diffMap = {
      Foundational: 'foundational concepts with lighter difficulty',
      Challenging: 'higher-difficulty, challenging problems',
      Stretch: 'mix including 1-2 stretch problems for top students',
      Balanced: 'balanced difficulty',
    };
    parts.push(`Use ${diffMap[intent.difficultyProfile]}.`);
  }

  // Classroom context
  if (intent.classroomContext) {
    parts.push(`Note: ${intent.classroomContext}`);
  }

  // Closing
  parts.push(`Include answer key and rubric. Target ~${estimateQuestionCount(intent.timeMinutes, intent.assessmentType).questionCount} questions.`);

  return parts.join(' ');
}

/**
 * Main orchestrator: Convert AssessmentIntent → SummarizedAssessmentIntent
 */
export async function summarizeAssessmentIntent(
  intent: AssessmentIntent
): Promise<SummarizedAssessmentIntent> {
  // Validate required fields
  if (!intent.studentLevel || !intent.assessmentType || !intent.timeMinutes) {
    throw new Error('Invalid AssessmentIntent: missing required fields');
  }

  if ((!intent.sourceFile && !intent.sourceTopic) || (intent.sourceFile && intent.sourceTopic)) {
    throw new Error('Invalid AssessmentIntent: must provide exactly one of sourceFile or sourceTopic');
  }

  // Build components
  const summary = buildNaturalLanguageSummary(intent);
  const metadata = deriveSpaceCampMetadata(intent);

  // Build Space Camp payload
  const spaceCampPayload = {
    documentMetadata: metadata.documentMetadata,
    estimatedBloomTargets: metadata.estimatedBloomTargets,
    complexityRange: metadata.complexityRange,
    estimatedQuestionCount: metadata.estimatedQuestionCount,
    fatigueImpactMultiplier: metadata.fatigueImpactMultiplier,
    emphasizeConceptual: metadata.emphasizeConceptual,
    emphasizeProcedural: metadata.emphasizeProcedural,
    emphasizeApplication: metadata.emphasizeApplication,
    emphasizeExamStyle: metadata.emphasizeExamStyle,
    scaffoldingNeeded: metadata.scaffoldingNeeded,
    focusAreas: metadata.focusAreas,
  };

  // Build derived metadata for tracking
  const derivedMetadata: DerivedMetadata = {
    gradeBand: metadata.documentMetadata.gradeBand,
    classLevel: metadata.documentMetadata.classLevel,
    subject: metadata.documentMetadata.subject,
    estimatedBloomDistribution: metadata.estimatedBloomTargets,
    estimatedComplexityRange: metadata.complexityRange,
    estimatedQuestionCount: metadata.estimatedQuestionCount,
    estimatedTotalTimeMinutes: intent.timeMinutes,
    fatigueMultiplier: metadata.fatigueImpactMultiplier || 0,
  };

  // Build rich prompt for AI Writer (includes summary + context)
  const prompt = buildAIWriterPrompt(intent, summary, metadata);

  return {
    summary,
    prompt,
    spaceCampPayload: spaceCampPayload as any, // Type matching handled by Space Camp
    derivedMetadata,
  };
}

/**
 * Build rich prompt for AI Writer
 * Includes summary + technical requirements + context
 */
function buildAIWriterPrompt(
  intent: AssessmentIntent,
  summary: string,
  metadata: ReturnType<typeof deriveSpaceCampMetadata>
): string {
  const sections: string[] = [];

  // Header
  sections.push('# Assessment Generation Instructions\n');

  // Teacher's request
  sections.push(`## Teacher Intent\n${summary}\n`);

  // Technical requirements
  sections.push('## Technical Requirements');
  sections.push(`- Total estimated time: ${intent.timeMinutes} minutes`);
  sections.push(`- Target question count: ~${metadata.estimatedQuestionCount} questions`);
  sections.push(`- Bloom level distribution targets:`);

  const bloomTargets = metadata.estimatedBloomTargets;
  sections.push(
    `  - Remember: ${(bloomTargets.Remember * 100).toFixed(0)}%`
  );
  sections.push(
    `  - Understand: ${(bloomTargets.Understand * 100).toFixed(0)}%`
  );
  sections.push(
    `  - Apply: ${(bloomTargets.Apply * 100).toFixed(0)}%`
  );
  sections.push(
    `  - Analyze: ${(bloomTargets.Analyze * 100).toFixed(0)}%`
  );
  sections.push(
    `  - Evaluate: ${(bloomTargets.Evaluate * 100).toFixed(0)}%`
  );
  sections.push(
    `  - Create: ${(bloomTargets.Create * 100).toFixed(0)}%`
  );

  sections.push(
    `- Linguistic complexity range: ${(metadata.complexityRange[0] * 100).toFixed(0)}–${(metadata.complexityRange[1] * 100).toFixed(0)}%`
  );
  sections.push(`- Grade band: ${metadata.documentMetadata.gradeBand}`);
  sections.push(`- Class level: ${metadata.documentMetadata.classLevel}`);

  // Special requirements
  if (intent.classroomContext) {
    sections.push(`\n## Classroom Context\n${intent.classroomContext}`);
  }

  if (intent.focusAreas && intent.focusAreas.length > 0) {
    sections.push(`\n## Focus Areas\n${intent.focusAreas.map(a => `- ${a}`).join('\n')}`);
  }

  // Formatting
  sections.push(`\n## Output Format
Each problem MUST include:
- BloomLevel (one of: Remember, Understand, Apply, Analyze, Evaluate, Create)
- LinguisticComplexity (0.0-1.0)
- EstimatedTimeMinutes (positive integer)
- Difficulty (1-5 scale)
- Type (multiple-choice, true-false, short-answer, essay, matching)
- Content (clear, unambiguous problem statement)
- CorrectAnswer or scoring rubric`);

  return sections.join('\n');
}

/**
 * Export utility functions for external use
 */

export const mapStudentLevelToGradeBand = (level: StudentLevel): GradeBand => {
  return STUDENT_LEVEL_TO_GRADE_BAND[level];
};

export const mapStudentLevelToClassLevel = (level: StudentLevel): ClassLevel => {
  return STUDENT_LEVEL_TO_CLASS_LEVEL[level];
};

/**
 * Get all metadata for a given assessment intent (for debugging/logging)
 */
export function getAssessmentMetadata(intent: AssessmentIntent) {
  return {
    gradeBand: STUDENT_LEVEL_TO_GRADE_BAND[intent.studentLevel],
    classLevel: STUDENT_LEVEL_TO_CLASS_LEVEL[intent.studentLevel],
    subject: inferSubject(intent),
    bloomDistribution: estimateBloomDistribution(
      intent.studentLevel,
      intent.assessmentType,
      intent.emphasis
    ),
    complexityRange: COMPLEXITY_RANGES[intent.studentLevel],
    fatigueMultiplier: FATIGUE_MULTIPLIERS[intent.studentLevel],
    estimatedQuestions: estimateQuestionCount(intent.timeMinutes, intent.assessmentType),
  };
}
