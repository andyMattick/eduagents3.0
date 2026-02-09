import { useState, useEffect } from 'react';
import './AssignmentIntentForm.css';
import { useUserFlow, GeneratedAssignment, GeneratedSection } from '../../hooks/useUserFlow';
import { enrichAssignmentMetadata } from '../../agents/analysis/enrichAssignmentMetadata';
import { SectionBuilder, CustomSection } from './SectionBuilder';

/**
 * Assignment Intent Form
 * Collects assignment specifications when creating from source documents
 * (Used when goal === "create" AND hasSourceDocs === true)
 */

// Helper function to generate mock assignment data based on form inputs
function generateAssignmentPreview(
  assignmentType: string,
  questionCount: number,
  estimatedTime: number,
  sectionStrategy: 'manual' | 'ai-generated',
  customSections: CustomSection[],
  topic: string = 'Course Material',
  sourceFile?: { name?: string; type?: string }
): GeneratedAssignment {
  // Generate mock Bloom distribution
  const bloomDistribution: Record<string, number> = {
    'Remember': Math.ceil(questionCount * 0.20),
    'Understand': Math.ceil(questionCount * 0.25),
    'Apply': Math.ceil(questionCount * 0.25),
    'Analyze': Math.ceil(questionCount * 0.20),
    'Evaluate': Math.ceil(questionCount * 0.07),
    'Create': Math.floor(questionCount * 0.03),
  };

  let sections: GeneratedSection[] = [];

  // Helper function to map Bloom string to numeric level
  const bloomStringToNumber = (bloomStr: string): 1 | 2 | 3 | 4 | 5 | 6 => {
    const bloomMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
      'Remember': 1,
      'Understand': 2,
      'Apply': 3,
      'Analyze': 4,
      'Evaluate': 5,
      'Create': 6,
    };
    return bloomMap[bloomStr] || 3;
  };

  if (sectionStrategy === 'ai-generated') {
    // Generate single section with all questions
    const problems = Array.from({ length: questionCount }, (_, i) => {
      const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      const problemText = `Question ${i + 1}: [Sample question text - would be generated from source material]`;
      return {
        id: `q${i + 1}`,
        sectionId: 'section-0',
        problemText,
        bloomLevel: bloomStringToNumber(bloomLevels[i % 6]),
        questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5],
        tipText: i % 3 === 0 ? `Consider the relationship between these concepts.` : undefined,
        hasTip: i % 3 === 0,
        problemType: (['procedural', 'conceptual', 'application'] as const)[i % 3] as any,
        complexity: 'medium' as const,
        novelty: 'medium' as const,
        estimatedTime: 5,
        problemLength: problemText.trim().split(/\s+/).length,
      };
    });

    sections = [
      {
        sectionId: 'section-0',
        sectionName: 'Assignment Questions',
        instructions: topic,
        problemType: 'ai-decide',
        problems,
        includeTips: true,
      },
    ];
  } else {
    // Generate sections from custom sections
    let questionIndex = 0;
    sections = customSections.map((section, sectionIdx) => {
      const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      const sectionProblems = Array.from({ length: section.questionCount }, (_, i) => {
        const hasTip = section.includeTips;
        const problemText = `Question ${questionIndex + i + 1}: [Sample question text - would be generated from source material]`;
        return {
          id: `q${questionIndex + i + 1}`,
          sectionId: `section-${sectionIdx}`,
          problemText,
          bloomLevel: bloomStringToNumber(bloomLevels[i % 6]),
          questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5],
          tipText: hasTip ? `Here's a helpful tip for this ${section.problemType} question.` : undefined,
          hasTip,
          problemType: section.problemType as any,
          complexity: 'medium' as const,
          novelty: 'medium' as const,
          estimatedTime: 5,
          problemLength: problemText.trim().split(/\s+/).length,
        };
      });
      questionIndex += section.questionCount;
      return {
        sectionId: `section-${sectionIdx}`,
        sectionName: section.sectionName,
        instructions: section.topic,
        problemType: section.problemType,
        problems: sectionProblems,
        includeTips: section.includeTips,
      };
    });
  }

  const rawAssignment: GeneratedAssignment = {
    assignmentId: `assignment-${Date.now()}`,
    assignmentType,
    title: `${assignmentType}: ${topic}`,
    topic,
    estimatedTime,
    questionCount,
    assessmentType: 'formative',
    sourceFile: sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
    sections,
    bloomDistribution,
    organizationMode: sectionStrategy,
    timestamp: new Date().toISOString(),
  };

  // Enrich the assignment with detailed metadata (complexity, novelty, rubrics, etc.)
  return enrichAssignmentMetadata(rawAssignment);
}

export function AssignmentIntentForm() {
  const { setSourceAwareIntentData, setGeneratedAssignment, sourceFile, generatedAssignment } = useUserFlow();
  
  console.log('🟢 AssignmentIntentForm rendered', {
    hasSourceFile: !!sourceFile,
    hasGeneratedAssignment: !!generatedAssignment,
  });

  const [formData, setFormData] = useState({
    assignmentType: 'Quiz' as 'Test' | 'Quiz' | 'Warm-up' | 'Exit Ticket' | 'Practice Set' | 'Project' | 'Other',
    otherAssignmentType: '',
    questionCount: 10,
    estimatedTime: 30,
    assessmentType: 'formative' as 'formative' | 'summative',
    sectionStrategy: 'ai-generated' as 'manual' | 'ai-generated',
    customSections: [] as CustomSection[],
    skillsAndStandards: '',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Watch for assignment generation and show success state
  useEffect(() => {
    console.log('AssignmentIntentForm: useEffect triggered', {
      generatedAssignment: !!generatedAssignment,
      isSubmitting,
    });
    if (generatedAssignment && isSubmitting) {
      console.log('✅ Assignment generated! Setting isGenerated to true');
      setIsSubmitting(false);
      setIsGenerated(true);
    }
  }, [generatedAssignment, isSubmitting]);

  const assignmentTypes = ['Test', 'Quiz', 'Warm-up', 'Exit Ticket', 'Practice Set', 'Project', 'Other'] as const;

  const handleAssignmentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      assignmentType: e.target.value as typeof formData.assignmentType,
    });
  };

  const handleOtherTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      otherAssignmentType: e.target.value,
    });
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFormData({ ...formData, questionCount: Math.max(1, Math.min(100, value)) });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFormData({ ...formData, estimatedTime: Math.max(5, Math.min(480, value)) });
  };

  const handleAssessmentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      assessmentType: e.target.value as 'formative' | 'summative',
    });
  };

  const handleSectionStrategyChange = (strategy: 'manual' | 'ai-generated') => {
    setFormData({
      ...formData,
      sectionStrategy: strategy,
    });
  };

  const handleCustomSectionsChange = (sections: CustomSection[]) => {
    setFormData({
      ...formData,
      customSections: sections,
    });
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, skillsAndStandards: e.target.value });
  };

  const handleSubmit = () => {
    console.log('🔵 handleSubmit called');
    const newErrors: string[] = [];

    if (formData.assignmentType === 'Other' && !formData.otherAssignmentType.trim()) {
      newErrors.push("Please specify what type of assignment this is");
    }

    if (formData.sectionStrategy === 'manual' && formData.customSections.length === 0) {
      newErrors.push("Please add at least one section type");
    }

    if (newErrors.length > 0) {
      console.log('❌ Form errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);
    console.log('⏳ isSubmitting set to true');

    // Build the intent data object
    const intentData = {
      assignmentType: formData.assignmentType,
      ...(formData.otherAssignmentType && { otherAssignmentType: formData.otherAssignmentType }),
      questionCount: formData.questionCount,
      estimatedTime: formData.estimatedTime,
      assessmentType: formData.assessmentType,
      sectionStrategy: formData.sectionStrategy,
      ...(formData.sectionStrategy === 'manual' && formData.customSections.length > 0 && {
        customSections: formData.customSections,
      }),
      ...(formData.skillsAndStandards && {
        skillsAndStandards: formData.skillsAndStandards
          .split('\n')
          .map(s => s.trim())
          .filter(s => s),
      }),
    };

    console.log('📝 Setting sourceAwareIntentData:', intentData);
    setSourceAwareIntentData(intentData);

    // Generate assignment preview
    const generatedAssignment = generateAssignmentPreview(
      formData.assignmentType === 'Other' ? formData.otherAssignmentType : formData.assignmentType,
      formData.questionCount,
      formData.estimatedTime,
      formData.sectionStrategy,
      formData.customSections,
      'Course Material', // In real implementation, would extract from source file
      sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined
    );

    console.log('📋 Generated assignment:', generatedAssignment);
    console.log('🚀 Calling setGeneratedAssignment');
    setGeneratedAssignment(generatedAssignment);
  };

  return (
    <div className="assignment-intent-form">
      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <h1>📋 What Kind of Assignment?</h1>
          <p>Thanks for sharing your materials. Based on your notes, what kind of assignment would you like to create?</p>
          {sourceFile && <p className="source-hint">Using: <strong>{sourceFile.name}</strong></p>}
        </div>

        <div className="form-content">
          {/* Assignment Type */}
          <div className="form-field">
            <label htmlFor="assignmentType">
              <span className="label-text">Assignment Type</span>
              <span className="required">*</span>
            </label>
            <select
              id="assignmentType"
              value={formData.assignmentType}
              onChange={handleAssignmentTypeChange}
              className="select-input"
            >
              {assignmentTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {formData.assignmentType === 'Other' && (
              <input
                type="text"
                value={formData.otherAssignmentType}
                onChange={handleOtherTypeChange}
                placeholder="What kind of assignment are you envisioning?"
                className="text-input"
              />
            )}
          </div>

          {/* Question Count & Time Estimate - Horizontal Group */}
          <div className="input-group">
            <div className="input-block">
              <label htmlFor="questionCount">
                <span className="label-text">Number of Questions</span>
              </label>
              <div className="input-with-unit">
                <input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.questionCount}
                  onChange={handleQuestionCountChange}
                  className="number-input"
                />
                <span className="unit-label">questions</span>
              </div>
              <p className="helper-text">Start with 10–15 for a typical quiz</p>
            </div>

            <div className="input-block">
              <label htmlFor="estimatedTime">
                <span className="label-text">Estimated Time</span>
              </label>
              <div className="input-with-unit">
                <input
                  id="estimatedTime"
                  type="number"
                  min="5"
                  max="480"
                  value={formData.estimatedTime}
                  onChange={handleTimeChange}
                  className="number-input"
                />
                <span className="unit-label">minutes</span>
              </div>
              <p className="helper-text">Most questions take 1–3 minutes each</p>
            </div>
          </div>

          {/* Assessment Type */}
          <div className="form-field">
            <label htmlFor="assessmentType">
              <span className="label-text">Assessment Type</span>
            </label>
            <select
              id="assessmentType"
              value={formData.assessmentType}
              onChange={handleAssessmentTypeChange}
              className="select-input"
            >
              <option value="formative">Formative (checking for understanding)</option>
              <option value="summative">Summative (assessing mastery)</option>
            </select>
          </div>

          {/* Section Strategy */}
          <div className="form-field">
            <label>
              <span className="label-text">How would you like to organize the problems?</span>
            </label>
            <div className="section-strategy-options">
              <button
                type="button"
                className={`strategy-option ${formData.sectionStrategy === 'ai-generated' ? 'selected' : ''}`}
                onClick={() => handleSectionStrategyChange('ai-generated')}
              >
                <div className="strategy-icon">🤖</div>
                <div className="strategy-content">
                  <strong>AI Organizes Sections</strong>
                  <p>I'll let AI decide problem types and distribution</p>
                </div>
              </button>
              <button
                type="button"
                className={`strategy-option ${formData.sectionStrategy === 'manual' ? 'selected' : ''}`}
                onClick={() => handleSectionStrategyChange('manual')}
              >
                <div className="strategy-icon">✏️</div>
                <div className="strategy-content">
                  <strong>I'll Organize Sections</strong>
                  <p>I want to specify problem types and how many of each</p>
                </div>
              </button>
            </div>
            {formData.sectionStrategy === 'ai-generated' && (
              <div className="bloom-spread-note">
                Most questions will focus on core skills like explaining, applying, and analyzing. A few will challenge students to justify, design, or critique — and will include support if needed.
              </div>
            )}
          </div>

          {/* Section Builder - Shows when "I'll Organize Sections" is selected */}
          {formData.sectionStrategy === 'manual' && (
            <SectionBuilder
              onSectionsChange={handleCustomSectionsChange}
              availableTopics={[]}
            />
          )}

          {/* Skills and Standards */}
          <div className="form-field">
            <label htmlFor="skillsAndStandards">
              <span className="label-text">Any specific skills or standards to emphasize?</span>
            </label>
            <textarea
              id="skillsAndStandards"
              value={formData.skillsAndStandards}
              onChange={handleSkillsChange}
              placeholder="Optional: List skills, standards, or competencies (one per line)"
              rows={3}
              className="textarea-input"
            />
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
                <p>Your {formData.assignmentType} is ready with {formData.questionCount} questions.</p>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Generating...' : 'Generate Assignment →'}
              </button>
            ) : (
              <button 
                className="button-primary" 
                onClick={() => {
                  // State has been updated, router will automatically show preview on next render
                  // Trigger a small visual feedback by scrolling to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                View Preview & Analyze →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
