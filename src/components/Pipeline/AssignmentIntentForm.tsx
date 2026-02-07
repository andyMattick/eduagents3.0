import { useState } from 'react';
import './AssignmentIntentForm.css';
import { useUserFlow, GeneratedAssignment, GeneratedSection } from '../../hooks/useUserFlow';
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
  topic: string = 'Course Material'
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

  if (sectionStrategy === 'ai-generated') {
    // Generate single section with all questions
    const problems = Array.from({ length: questionCount }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}: [Sample question text - would be generated from source material]`,
      bloomLevel: (['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const)[i % 6],
      questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5],
      tips: i % 3 === 0 ? `Consider the relationship between these concepts.` : undefined,
      problemType: (['procedural', 'conceptual', 'application'] as const)[i % 3] as any,
    }));

    sections = [
      {
        sectionName: 'Assignment Questions',
        topic: topic,
        problemType: 'ai-decide',
        problems,
        includeTips: true,
      },
    ];
  } else {
    // Generate sections from custom sections
    let questionIndex = 0;
    sections = customSections.map((section, sectionIdx) => {
      const sectionProblems = Array.from({ length: section.questionCount }, (_, i) => {
        const bloomLevels: ('Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create')[] = [
          'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
        ];
        return {
          id: `q${questionIndex + i + 1}`,
          text: `Question ${questionIndex + i + 1}: [Sample question text - would be generated from source material]`,
          bloomLevel: bloomLevels[i % 6],
          questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank', 'ai-decide'] as const)[i % 6],
          tips: section.includeTips ? `Here's a helpful tip for this ${section.problemType} question.` : undefined,
          problemType: section.problemType as any,
        };
      });
      questionIndex += section.questionCount;
      return {
        sectionName: section.sectionName,
        topic: section.topic,
        problemType: section.problemType,
        problems: sectionProblems,
        includeTips: section.includeTips,
      };
    });
  }

  return {
    assignmentType,
    title: `${assignmentType}: ${topic}`,
    topic,
    estimatedTime,
    questionCount,
    assessmentType: 'formative',
    sections,
    bloomDistribution,
    organizationMode: sectionStrategy,
    timestamp: new Date().toISOString(),
  };
}

export function AssignmentIntentForm() {
  const { setSourceAwareIntentData, setGeneratedAssignment, sourceFile } = useUserFlow();

  const [formData, setFormData] = useState({
    assignmentType: 'Quiz' as 'Test' | 'Quiz' | 'Warm-up' | 'Exit Ticket' | 'Practice Set' | 'Project' | 'Other',
    otherAssignmentType: '',
    questionCount: 10,
    estimatedTime: 30,
    assessmentType: 'formative' as 'formative' | 'summative',
    sectionStrategy: 'ai-generated' as 'manual' | 'ai-generated',
    customSections: [] as { type: string; count: number }[],
    skillsAndStandards: '',
  });

  const [errors, setErrors] = useState<string[]>([]);

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
    const newErrors: string[] = [];

    if (formData.assignmentType === 'Other' && !formData.otherAssignmentType.trim()) {
      newErrors.push("Please specify what type of assignment this is");
    }

    if (formData.sectionStrategy === 'manual' && formData.customSections.length === 0) {
      newErrors.push("Please add at least one section type");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

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

    setSourceAwareIntentData(intentData);

    // Generate assignment preview
    const generatedAssignment = generateAssignmentPreview(
      formData.assignmentType === 'Other' ? formData.otherAssignmentType : formData.assignmentType,
      formData.questionCount,
      formData.estimatedTime,
      formData.sectionStrategy,
      formData.customSections,
      'Course Material' // In real implementation, would extract from source file
    );

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

          {/* Question Count */}
          <div className="form-field form-field-inline">
            <label htmlFor="questionCount">
              <span className="label-text">How many questions?</span>
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
          </div>

          {/* Time Estimate */}
          <div className="form-field form-field-inline">
            <label htmlFor="estimatedTime">
              <span className="label-text">How long should it take?</span>
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

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="button-secondary" onClick={() => window.history.back()}>
              ← Back
            </button>
            <button className="button-primary" onClick={handleSubmit}>
              Generate Assignment →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
