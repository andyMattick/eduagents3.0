import { useState } from 'react';
import './IntentCaptureComponent.css';
import { useUserFlow, GeneratedAssignment, GeneratedSection, GeneratedProblem } from '../../hooks/useUserFlow';
import { selectAppropriateFormat, validateProblemBloomAlignment, formatValidationReport } from '../../agents/analysis/bloomConstraints';

interface BloomDistribution {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface IntentData {
  title: string;
  topic: string;
  gradeLevel: string;
  assignmentType: string;
  bloomDistribution: BloomDistribution;
  numSections: number;
  questionCount: number;
  estimatedDurationMinutes: number;
  preferredQuestionTypes: string[];
  tipsEnabled: boolean;
  difficultyRange: string;
  topics: string;
}

const GRADE_LEVELS = [
  'K-2',
  '3-5',
  '6-8',
  '9-10',
  '11-12',
  'Higher Education',
  'Professional',
];

const ASSIGNMENT_TYPES = [
  'Essay',
  'Quiz',
  'Practice Set',
  'Homework',
  'Test',
  'Exam',
  'Mixed (Multiple choice + Written)',
  'Project',
  'Other',
];

const QUESTION_TYPES = [
  { id: 'multiple-choice', label: 'Multiple Choice' },
  { id: 'true-false', label: 'True/False' },
  { id: 'short-answer', label: 'Short Answer' },
  { id: 'free-response', label: 'Free Response' },
  { id: 'matching', label: 'Matching' },
];

const DIFFICULTY_RANGES = [
  { id: 'low', label: 'Easy' },
  { id: 'mixed-low', label: 'Mostly Easy with some challenging' },
  { id: 'mixed', label: 'Mixed Easy/Medium/Hard' },
  { id: 'mixed-high', label: 'Mostly Challenging with some easy' },
  { id: 'high', label: 'Challenging' },
];

const DEFAULT_BLOOM_DISTRIBUTION: BloomDistribution = {
  remember: 30,
  understand: 30,
  apply: 20,
  analyze: 10,
  evaluate: 5,
  create: 5,
};

/**
 * Generate a comprehensive assignment from teacher intentions
 * Respects Bloom distribution percentages, multiple sections, and question type preferences
 */
function generateAssignmentFromIntent(
  title: string,
  topic: string,
  _gradeLevel: string,
  assignmentType: string,
  bloomDistribution: BloomDistribution,
  numSections: number,
  questionCount: number,
  preferredQuestionTypes: string[],
  tipsEnabled: boolean,
  difficultyRange: string
): GeneratedAssignment {
  // Default question types if none specified
  const useQuestionTypes = preferredQuestionTypes.length > 0 
    ? preferredQuestionTypes 
    : ['multiple-choice', 'true-false', 'short-answer', 'free-response'];

  // Bloom level number mapping
  const bloomLevelMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
    'remember': 1,
    'understand': 2,
    'apply': 3,
    'analyze': 4,
    'evaluate': 5,
    'create': 6,
  };

  // Generate all problems
  const allProblems: GeneratedProblem[] = [];
  const bloomLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const questionFormats = ['multiple-choice', 'true-false', 'short-answer', 'free-response'] as const;
  const problemTypes = ['procedural', 'conceptual', 'application'] as const;

  // Calculate questions per Bloom level
  const questionsPerBloom: Record<string, number> = {};
  let totalAllocated = 0;

  bloomLevels.forEach(level => {
    const percent = bloomDistribution[level as keyof BloomDistribution];
    const count = Math.round((questionCount * percent) / 100);
    questionsPerBloom[level] = count;
    totalAllocated += count;
  });

  // Adjust for rounding to match total
  if (totalAllocated !== questionCount) {
    const diff = questionCount - totalAllocated;
    questionsPerBloom['apply'] = (questionsPerBloom['apply'] || 0) + diff;
  }

  // Generate realistic problem text templates by Bloom level
  const problemTemplates: Record<string, string[]> = {
    remember: [
      `What is the definition of ${topic}?`,
      `Identify the main characteristics of ${topic}.`,
      `List the key facts about ${topic}.`,
      `Name the important elements in ${topic}.`,
      `What is the primary concept of ${topic}?`,
    ],
    understand: [
      `Explain what ${topic} means in your own words.`,
      `Describe how ${topic} relates to common knowledge.`,
      `Summarize the main ideas about ${topic}.`,
      `What is the relationship between the different aspects of ${topic}?`,
      `How would you describe ${topic} to someone unfamiliar with it?`,
    ],
    apply: [
      `How would you apply ${topic} to solve a real-world problem?`,
      `Use the principles of ${topic} to analyze this scenario.`,
      `Demonstrate how ${topic} can be used in practice.`,
      `Apply your understanding of ${topic} to create a solution.`,
      `In what practical situations would ${topic} be applicable?`,
    ],
    analyze: [
      `Compare and contrast different aspects of ${topic}.`,
      `Break down ${topic} into its component parts.`,
      `Analyze the causes and effects of factors in ${topic}.`,
      `What patterns do you notice when examining ${topic}?`,
      `How do the elements of ${topic} relate to each other?`,
    ],
    evaluate: [
      `Evaluate the effectiveness of different approaches to ${topic}.`,
      `Judge the validity of claims about ${topic}.`,
      `Assess the strengths and weaknesses of ${topic}.`,
      `What is your informed opinion about ${topic}?`,
      `Critique the following approach to ${topic}.`,
    ],
    create: [
      `Design a new approach to ${topic}.`,
      `Compose an original solution that addresses ${topic}.`,
      `Create a unique perspective on ${topic}.`,
      `Develop a novel method for understanding ${topic}.`,
      `Synthesize your knowledge to propose new ideas about ${topic}.`,
    ],
  };

  // Create questions distributed by Bloom level
  let qIndex = 0;
  bloomLevels.forEach(bloomLevel => {
    const count = questionsPerBloom[bloomLevel];
    for (let i = 0; i < count; i++) {
      const bloomNum = bloomLevelMap[bloomLevel] as 1 | 2 | 3 | 4 | 5 | 6;
      const difficultyFactors = {
        'low': { min: 0, max: 0.33 },
        'mixed-low': { min: 0, max: 0.55 },
        'mixed': { min: 0.33, max: 0.66 },
        'mixed-high': { min: 0.45, max: 1 },
        'high': { min: 0.67, max: 1 },
      };
      const diffRange = difficultyFactors[difficultyRange as keyof typeof difficultyFactors] || difficultyFactors['mixed'];
      const diffRatio = diffRange.min + (Math.random() * (diffRange.max - diffRange.min));

      const complexity = diffRatio < 0.33 ? 'low' : diffRatio < 0.66 ? 'medium' : 'high';

      // Generate realistic problem text based on Bloom level
      const bloomTemplates = problemTemplates[bloomLevel.toLowerCase()] || problemTemplates.remember;
      const problemText = bloomTemplates[Math.floor(Math.random() * bloomTemplates.length)];

      // Use constraint-aware format selection to ensure Bloom alignment
      const preferredFormat = useQuestionTypes[qIndex % useQuestionTypes.length];
      const approvedFormat = selectAppropriateFormat(bloomLevel as any, preferredFormat);

      const problem: GeneratedProblem = {
        id: `q${qIndex + 1}`,
        sectionId: `section-${Math.floor(qIndex / (questionCount / numSections))}`,
        problemText: problemText,
        problemType: problemTypes[qIndex % problemTypes.length],
        bloomLevel: bloomNum,
        questionFormat: approvedFormat as typeof questionFormats[number],
        complexity: complexity as 'low' | 'medium' | 'high',
        novelty: 'medium',
        estimatedTime: bloomNum <= 2 ? 2 : bloomNum <= 4 ? 3 : 5,
        problemLength: complexity === 'low' ? 15 : complexity === 'medium' ? 25 : 35,
        hasTip: tipsEnabled && bloomNum > 2,
        tipText: tipsEnabled && bloomNum > 2 ? `Think about the ${bloomLevel === 'apply' ? 'steps involved' : bloomLevel === 'analyze' ? 'patterns and connections' : 'key concepts'}.` : undefined,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option B',
      };

      allProblems.push(problem);
      qIndex++;
    }
  });

  // Validate Bloom-format alignment for all problems
  const bloomLevelNames = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const validationReport = validateProblemBloomAlignment(
    allProblems.map((p, idx) => ({
      bloomLevel: bloomLevelNames[p.bloomLevel - 1] as any,
      questionFormat: p.questionFormat,
      problemText: p.problemText,
    }))
  );

  // Log validation results
  if (!validationReport.valid) {
    console.warn('🚨 Bloom Constraint Violations:\n' + formatValidationReport(validationReport));
  } else {
    console.log('✅ ' + formatValidationReport(validationReport));
  }

  // Create sections with problems distributed evenly
  const problemsPerSection = Math.ceil(questionCount / numSections);
  const sections: GeneratedSection[] = [];

  for (let s = 0; s < numSections; s++) {
    const startIdx = s * problemsPerSection;
    const endIdx = Math.min(startIdx + problemsPerSection, allProblems.length);
    const sectionProblems = allProblems.slice(startIdx, endIdx);

    // Update section IDs
    sectionProblems.forEach(p => {
      p.sectionId = `section-${s}`;
    });

    const section: GeneratedSection = {
      sectionId: `section-${s}`,
      sectionName: numSections > 1 ? `Section ${s + 1}: ${topic.substring(0, 30)}` : assignmentType,
      instructions: `This section covers ${topic}. Please answer all questions to the best of your ability.`,
      problemType: 'ai-decide',
      problems: sectionProblems,
      includeTips: tipsEnabled,
    };

    sections.push(section);
  }

  // Calculate estimated time
  const avgTimePerQuestion = 2.5;
  const estimatedMinutes = Math.ceil((questionCount * avgTimePerQuestion) / 60) * 5;

  // Create the GeneratedAssignment
  const assignment: GeneratedAssignment = {
    assignmentId: `assignment-${Date.now()}`,
    assignmentType,
    title,
    topic,
    estimatedTime: estimatedMinutes,
    questionCount,
    assessmentType: 'formative',
    sections,
    bloomDistribution: {
      Remember: bloomDistribution.remember,
      Understand: bloomDistribution.understand,
      Apply: bloomDistribution.apply,
      Analyze: bloomDistribution.analyze,
      Evaluate: bloomDistribution.evaluate,
      Create: bloomDistribution.create,
    },
    organizationMode: 'ai-generated',
    timestamp: new Date().toISOString(),
  };

  return assignment;
}

/**
 * Intent Capture Component - Enhanced Version
 * Collects comprehensive assignment design inputs for AI generation
 */
export function IntentCaptureComponent() {
  const { setIntentData, setGeneratedAssignment } = useUserFlow();
  const [intent, setIntent] = useState<IntentData>({
    title: '',
    topic: '',
    gradeLevel: '6-8',
    assignmentType: 'Quiz',
    bloomDistribution: { ...DEFAULT_BLOOM_DISTRIBUTION },
    numSections: 1,
    questionCount: 10,
    estimatedDurationMinutes: 30,
    preferredQuestionTypes: [],
    tipsEnabled: true,
    difficultyRange: 'mixed',
    topics: '',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [bloomTotal, setBloomTotal] = useState(100);

  // Handle Bloom distribution slider changes
  const handleBloomChange = (level: keyof BloomDistribution, value: number) => {
    const newDistribution = { ...intent.bloomDistribution, [level]: value };
    setIntent({ ...intent, bloomDistribution: newDistribution });

    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    setBloomTotal(total);
  };

  // Handle question type toggle
  const toggleQuestionType = (typeId: string) => {
    setIntent(prev => ({
      ...prev,
      preferredQuestionTypes: prev.preferredQuestionTypes.includes(typeId)
        ? prev.preferredQuestionTypes.filter(id => id !== typeId)
        : [...prev.preferredQuestionTypes, typeId],
    }));
  };

  // Validation and submission
  const handleSubmit = () => {
    const newErrors: string[] = [];

    if (!intent.title.trim()) {
      newErrors.push('Please provide an assignment title');
    }

    if (!intent.topic.trim()) {
      newErrors.push('Please describe the learning objectives or topics');
    }

    if (intent.questionCount < 1 || intent.questionCount > 100) {
      newErrors.push('Question count must be between 1 and 100');
    }

    if (bloomTotal !== 100) {
      newErrors.push(`Bloom distribution must total 100% (currently ${bloomTotal}%)`);
    }

    if (intent.numSections < 1 || intent.numSections > 10) {
      newErrors.push('Number of sections must be between 1 and 10');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    // Save the intent (minimum fields required by StandardIntentData)
    setIntentData({
      topic: intent.topic,
      gradeLevel: intent.gradeLevel,
      assignmentType: intent.assignmentType,
      bloomTargets: Object.entries(intent.bloomDistribution)
        .filter(([_, value]) => value > 0)
        .map(([key, _]) => key),
    });

    // Generate the assignment
    try {
      const generatedAssignment = generateAssignmentFromIntent(
        intent.title,
        intent.topic,
        intent.gradeLevel,
        intent.assignmentType,
        intent.bloomDistribution,
        intent.numSections,
        intent.questionCount,
        intent.preferredQuestionTypes,
        intent.tipsEnabled,
        intent.difficultyRange
      );

      console.log('✅ Generated assignment from intent:', generatedAssignment);
      setGeneratedAssignment(generatedAssignment);
      setIsGenerated(true);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to generate assignment:', error);
      setErrors(['Failed to generate assignment. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="intent-capture-component">
      <div className="intent-capture-container">
        {/* Header */}
        <div className="intent-header">
          <h1>✨ Design Your Assignment</h1>
          <p>Provide details about your assignment, and we'll generate a complete, balanced assignment with your specifications</p>
        </div>

        <div className="intent-form">
          {/* Section 1: Basic Information */}
          <div className="form-section">
            <h2>📋 Assignment Basics</h2>

            {/* Assignment Title */}
            <div className="form-field">
              <label htmlFor="title">
                <span className="label-text">Assignment Title</span>
                <span className="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={intent.title}
                onChange={e => setIntent({ ...intent, title: e.target.value })}
                placeholder="e.g., World War II Analysis & Essay"
                className="text-input"
              />
              <p className="field-hint">A descriptive title for your assignment</p>
            </div>

            {/* Learning Objectives & Topics */}
            <div className="form-field">
              <label htmlFor="topic">
                <span className="label-text">Learning Objectives & Topics</span>
                <span className="required">*</span>
              </label>
              <textarea
                id="topic"
                value={intent.topic}
                onChange={e => setIntent({ ...intent, topic: e.target.value })}
                placeholder="e.g., Students will understand the causes of WWII, analyze key decision points, and evaluate historical perspectives..."
                rows={4}
                className="textarea-input"
              />
              <p className="field-hint">Describe what students should learn and be able to do</p>
            </div>

            {/* Grade Level & Assignment Type */}
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="gradeLevel">
                  <span className="label-text">Grade Level</span>
                  <span className="required">*</span>
                </label>
                <select
                  id="gradeLevel"
                  value={intent.gradeLevel}
                  onChange={e => setIntent({ ...intent, gradeLevel: e.target.value })}
                  className="select-input"
                >
                  {GRADE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="assignmentType">
                  <span className="label-text">Assignment Type</span>
                  <span className="required">*</span>
                </label>
                <select
                  id="assignmentType"
                  value={intent.assignmentType}
                  onChange={e => setIntent({ ...intent, assignmentType: e.target.value })}
                  className="select-input"
                >
                  {ASSIGNMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Assignment Structure */}
          <div className="form-section">
            <h2>🎯 Assignment Structure</h2>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="questionCount">
                  <span className="label-text">Number of Questions</span>
                  <span className="required">*</span>
                </label>
                <div className="input-with-display">
                  <input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="100"
                    value={intent.questionCount}
                    onChange={e => setIntent({ ...intent, questionCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="number-input"
                  />
                  <span className="input-label">{intent.questionCount} questions</span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="numSections">
                  <span className="label-text">Number of Sections</span>
                </label>
                <div className="input-with-display">
                  <input
                    id="numSections"
                    type="number"
                    min="1"
                    max="10"
                    value={intent.numSections}
                    onChange={e => setIntent({ ...intent, numSections: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="number-input"
                  />
                  <span className="input-label">{intent.numSections} section{intent.numSections !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="duration">
                  <span className="label-text">Estimated Duration</span>
                </label>
                <div className="input-with-display">
                  <input
                    id="duration"
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    value={intent.estimatedDurationMinutes}
                    onChange={e => setIntent({ ...intent, estimatedDurationMinutes: Math.max(5, parseInt(e.target.value) || 5) })}
                    className="number-input"
                  />
                  <span className="input-label">{intent.estimatedDurationMinutes} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bloom's Taxonomy Distribution */}
          <div className="form-section">
            <h2>📊 Bloom's Taxonomy Distribution</h2>
            <p className="field-hint">AI will use this distribution to generate a balanced assignment. Adjust sliders to target specific cognitive levels.</p>

            <div className={`bloom-distribution-grid ${bloomTotal !== 100 ? 'warning' : ''}`}>
              {Object.entries(intent.bloomDistribution).map(([level, percent]) => (
                <div key={level} className="bloom-slider-group">
                  <div className="bloom-slider-header">
                    <label>{level.charAt(0).toUpperCase() + level.slice(1)}</label>
                    <span className="bloom-percent">{percent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percent}
                    onChange={e => handleBloomChange(level as keyof BloomDistribution, parseInt(e.target.value))}
                    className="bloom-slider"
                  />
                </div>
              ))}
            </div>

            <div className={`bloom-total ${bloomTotal === 100 ? 'valid' : 'invalid'}`}>
              Total: {bloomTotal}%
              {bloomTotal !== 100 && <span className="bloom-warning"> (Must equal 100%)</span>}
            </div>
          </div>

          {/* Section 4: Question Types & Options */}
          <div className="form-section">
            <h2>⚙️ Optional Preferences</h2>

            <div className="form-field">
              <label>
                <span className="label-text">Preferred Question Types</span>
              </label>
              <p className="field-hint">Leave empty to mix all types. Select to focus on specific formats.</p>
              <div className="checkbox-group">
                {QUESTION_TYPES.map(qtype => (
                  <label key={qtype.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={intent.preferredQuestionTypes.includes(qtype.id)}
                      onChange={() => toggleQuestionType(qtype.id)}
                    />
                    <span>{qtype.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="difficulty">
                  <span className="label-text">Difficulty Range</span>
                </label>
                <select
                  id="difficulty"
                  value={intent.difficultyRange}
                  onChange={e => setIntent({ ...intent, difficultyRange: e.target.value })}
                  className="select-input"
                >
                  {DIFFICULTY_RANGES.map(range => (
                    <option key={range.id} value={range.id}>{range.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="checkbox-label-block">
                  <input
                    type="checkbox"
                    checked={intent.tipsEnabled}
                    onChange={e => setIntent({ ...intent, tipsEnabled: e.target.checked })}
                  />
                  <span>Include helpful tips for students</span>
                </label>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <div className="error-list">
                {errors.map((error, idx) => (
                  <p key={idx}>{error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {isGenerated && (
            <div className="success-container">
              <div className="success-icon">✅</div>
              <div className="success-message">
                <p><strong>Assignment generated successfully!</strong></p>
                <p>Your {intent.assignmentType} is ready for review and customization.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button 
              className="button-secondary" 
              onClick={() => window.history.back()}
              disabled={isSubmitting}
            >
              ← Back
            </button>
            {!isGenerated ? (
              <button 
                className="button-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting || bloomTotal !== 100}
              >
                {isSubmitting ? '⏳ Generating...' : '✨ Generate Assignment →'}
              </button>
            ) : (
              <button 
                className="button-primary" 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ✅ View Preview & Analyze →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
