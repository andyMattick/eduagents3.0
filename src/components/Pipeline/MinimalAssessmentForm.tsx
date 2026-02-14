/**
 * MinimalAssessmentForm Component
 * 
 * A 2-step form for teachers to quickly create assessments with minimal input complexity.
 * 
 * Features:
 * - Step 1: Choose source (upload file OR enter topic)
 * - Step 2: Core inputs (Student Level, Assessment Type, Time)
 * - Step 3: Optional Advanced (collapsed until clicked)
 * - Real-time validation with error messages
 * - Intuitive, feels intelligent, not configurable
 * 
 * Pipeline Integrity:
 * - StudentLevel correctly maps to gradeBand
 * - AssessmentType is valid
 * - Time is validated (5–240 minutes)
 * - Either sourceFile OR sourceTopic required
 * - useUserFlow() hook untouched
 */

import React, { useState, useCallback, useMemo } from 'react';
import './MinimalAssessmentForm.css';
import {
  AssessmentIntent,
  StudentLevel,
  AssessmentType,
  AssessmentEmphasis,
  DifficultyProfile,
  ValidationResult,
  STUDENT_LEVEL_TO_GRADE_BAND,
} from '../../types/assessmentIntent';

interface MinimalAssessmentFormProps {
  onGenerate: (intent: AssessmentIntent) => void | Promise<void>;
  isLoading?: boolean;
}

const STUDENT_LEVELS: StudentLevel[] = ['Remedial', 'Standard', 'Honors', 'AP'];
const ASSESSMENT_TYPES: AssessmentType[] = ['Quiz', 'Test', 'Practice'];
const EMPHASIS_OPTIONS: AssessmentEmphasis[] = ['Balanced', 'Procedural', 'Conceptual', 'Application', 'ExamStyle'];
const DIFFICULTY_PROFILES: DifficultyProfile[] = ['Balanced', 'Foundational', 'Challenging', 'Stretch'];

const ASSESSMENT_TYPE_DESCRIPTIONS: Record<AssessmentType, string> = {
  Quiz: '10-15 min check for understanding',
  Test: 'Formal, summative assessment',
  Practice: 'Skill-building & reinforcement',
};

/**
 * Validate AssessmentIntent
 */
function validateAssessmentIntent(formData: Partial<AssessmentIntent>): ValidationResult {
  const errors: string[] = [];

  // Source validation: exactly one of sourceFile or sourceTopic required
  const hasFile = !!formData.sourceFile;
  const hasTopic = !!(formData.sourceTopic && formData.sourceTopic.trim());

  if (hasFile && hasTopic) {
    errors.push('Please choose either a file OR a topic, not both.');
  } else if (!hasFile && !hasTopic) {
    errors.push('Please either upload a file or enter a topic.');
  }

  // Student level validation
  if (!formData.studentLevel) {
    errors.push('Please select a student level.');
  }

  // Assessment type validation
  if (!formData.assessmentType) {
    errors.push('Please select an assessment type.');
  }

  // Time validation: must be 5-240 minutes
  if (!formData.timeMinutes || formData.timeMinutes < 5 || formData.timeMinutes > 240) {
    errors.push('Time must be between 5 and 240 minutes.');
  }

  // Optional advanced validations
  if (formData.focusAreas && formData.focusAreas.length > 5) {
    errors.push('Maximum 5 focus areas allowed.');
  }

  if (formData.classroomContext && formData.classroomContext.length > 500) {
    errors.push('Classroom context must be 500 characters or less.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get description for a student level
 */
function getStudentLevelDescription(level: StudentLevel): string {
  const descriptions: Record<StudentLevel, string> = {
    Remedial: 'Grades 3-5, foundational skills',
    Standard: 'Grades 6-8, core grade level',
    Honors: 'Grades 9-12, advanced learners',
    AP: 'Grades 9-12, AP/college level',
  };
  return descriptions[level];
}

const STEPS = {
  SOURCE: 'source',
  CORE: 'core',
  ADVANCED: 'advanced',
} as const;

export function MinimalAssessmentForm({ onGenerate, isLoading = false }: MinimalAssessmentFormProps) {
  // Form data
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceTopic, setSourceTopic] = useState<string>('');
  const [studentLevel, setStudentLevel] = useState<StudentLevel | ''>('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType | ''>('');
  const [timeMinutes, setTimeMinutes] = useState<number | ''>('');

  // Advanced options (collapsed by default)
  const [focusAreas, setFocusAreas] = useState<string>('');
  const [emphasis, setEmphasis] = useState<AssessmentEmphasis>('Balanced');
  const [difficultyProfile, setDifficultyProfile] = useState<DifficultyProfile>('Balanced');
  const [classroomContext, setClassroomContext] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // UI state
  const [currentStep, setCurrentStep] = useState<keyof typeof STEPS>('SOURCE');
  const [errors, setErrors] = useState<string[]>([]);

  /**
   * Parse focus areas from textarea
   */
  const focusAreasArray = useMemo(() => {
    return focusAreas
      .split('\n')
      .map(area => area.trim())
      .filter(area => area.length > 0);
  }, [focusAreas]);

  /**
   * Build AssessmentIntent from form data
   */
  const buildIntent = useCallback((): AssessmentIntent => {
    return {
      sourceFile: sourceFile || undefined,
      sourceTopic: sourceTopic.trim() || undefined,
      studentLevel: studentLevel as StudentLevel,
      assessmentType: assessmentType as AssessmentType,
      timeMinutes: typeof timeMinutes === 'number' ? timeMinutes : parseInt(String(timeMinutes), 10),
      focusAreas: focusAreasArray.length > 0 ? focusAreasArray : undefined,
      emphasis: showAdvanced ? emphasis : undefined,
      difficultyProfile: showAdvanced ? difficultyProfile : undefined,
      classroomContext: classroomContext.trim() || undefined,
    };
  }, [
    sourceFile,
    sourceTopic,
    studentLevel,
    assessmentType,
    timeMinutes,
    focusAreasArray,
    showAdvanced,
    emphasis,
    difficultyProfile,
    classroomContext,
  ]);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSourceFile(file);
      setSourceTopic(''); // Clear topic when file is selected
      setErrors([]);
    }
  }, []);

  /**
   * Clear file and allow topic entry
   */
  const handleClearFile = useCallback(() => {
    setSourceFile(null);
    setErrors([]);
  }, []);

  /**
   * Handle source topic input
   */
  const handleTopicChange = useCallback((value: string) => {
    setSourceTopic(value);
    setSourceFile(null); // Clear file when topic is entered
    setErrors([]);
  }, []);

  /**
   * Move to next step (with validation)
   */
  const handleNextStep = useCallback(() => {
    const formData: Partial<AssessmentIntent> = {
      sourceFile,
      sourceTopic,
      studentLevel,
      assessmentType,
      timeMinutes: typeof timeMinutes === 'number' ? timeMinutes : undefined,
    };

    const validation = validateAssessmentIntent(formData);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);

    // Progress through steps
    if (currentStep === 'SOURCE') {
      setCurrentStep('CORE');
    } else if (currentStep === 'CORE') {
      // Valid, ready to submit (but allow showing advanced if desired)
      if (showAdvanced) {
        setCurrentStep('ADVANCED');
      } else {
        handleSubmit();
      }
    }
  }, [sourceFile, sourceTopic, studentLevel, assessmentType, timeMinutes, currentStep, showAdvanced]);

  /**
   * Go back to previous step
   */
  const handlePrevStep = useCallback(() => {
    if (currentStep === 'CORE') {
      setCurrentStep('SOURCE');
    } else if (currentStep === 'ADVANCED') {
      setCurrentStep('CORE');
    }
    setErrors([]);
  }, [currentStep]);

  /**
   * Submit the form
   */
  const handleSubmit = useCallback(async () => {
    const intent = buildIntent();
    const validation = validateAssessmentIntent(intent);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);

    try {
      // Call parent callback
      await onGenerate(intent);
    } catch (error) {
      setErrors(['Failed to generate assessment. Please try again.']);
      console.error('Error generating assessment:', error);
    }
  }, [buildIntent, onGenerate]);

  /**
   * Render SOURCE step
   */
  const renderSourceStep = () => (
    <div className="maf-step">
      <h3 className="maf-step-title">📋 Choose Your Source</h3>

      <div className="maf-source-options">
        {/* UPLOAD OPTION */}
        <div className="maf-source-card">
          <div className="maf-upload-area">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
              className="maf-file-input"
              disabled={isLoading}
            />
            <label htmlFor="file-upload" className="maf-upload-label">
              <div className="maf-upload-icon">📁</div>
              <div className="maf-upload-text">
                <span className="maf-upload-primary">Click to upload</span>
                <span className="maf-upload-secondary">or drag and drop</span>
                <span className="maf-upload-formats">PDF, Word, or text</span>
              </div>
            </label>
          </div>

          {sourceFile && (
            <div className="maf-file-selected">
              <span>✓ {sourceFile.name}</span>
              <button
                type="button"
                onClick={handleClearFile}
                className="maf-clear-button"
                disabled={isLoading}
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="maf-divider">
          <span>OR</span>
        </div>

        {/* TOPIC OPTION */}
        <div className="maf-source-card">
          <label className="maf-label">Generate Without Source</label>
          <input
            type="text"
            placeholder="e.g., Sampling Distributions, Photosynthesis"
            value={sourceTopic}
            onChange={e => handleTopicChange(e.target.value)}
            className="maf-input"
            disabled={isLoading}
          />
          {sourceTopic && (
            <div className="maf-help-text">✓ Topic: {sourceTopic}</div>
          )}
        </div>
      </div>

      {/* ERROR MESSAGES */}
      {errors.length > 0 && (
        <div className="maf-errors">
          {errors.map((error, idx) => (
            <div key={idx} className="maf-error-item">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* NEXT BUTTON */}
      <div className="maf-actions">
        <button
          onClick={handleNextStep}
          disabled={isLoading}
          className="maf-button maf-button-primary"
        >
          {isLoading ? '⏳ Processing...' : 'Next: Configure Assessment'}
        </button>
      </div>
    </div>
  );

  /**
   * Render CORE step (Student Level, Type, Time)
   */
  const renderCoreStep = () => (
    <div className="maf-step">
      <h3 className="maf-step-title">🎓 Assessment Configuration</h3>

      <div className="maf-form-group">
        <label className="maf-label">
          Student Level
          <span className="maf-required">*</span>
        </label>
        <div className="maf-select-group">
          <select
            value={studentLevel}
            onChange={e => setStudentLevel(e.target.value as StudentLevel)}
            className="maf-select"
            disabled={isLoading}
          >
            <option value="">Select a level...</option>
            {STUDENT_LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        {studentLevel && (
          <div className="maf-help-text">
            ✓ {getStudentLevelDescription(studentLevel)} — Maps to grade band {STUDENT_LEVEL_TO_GRADE_BAND[studentLevel]}
          </div>
        )}
      </div>

      <div className="maf-form-group">
        <label className="maf-label">
          Assessment Type
          <span className="maf-required">*</span>
        </label>
        <div className="maf-radio-group">
          {ASSESSMENT_TYPES.map(type => (
            <label key={type} className="maf-radio-label">
              <input
                type="radio"
                name="assessmentType"
                value={type}
                checked={assessmentType === type}
                onChange={e => setAssessmentType(e.target.value as AssessmentType)}
                disabled={isLoading}
              />
              <span className="maf-radio-text">
                <span className="maf-radio-title">{type}</span>
                <span className="maf-radio-desc">{ASSESSMENT_TYPE_DESCRIPTIONS[type]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="maf-form-group">
        <label className="maf-label">
          Estimated Time
          <span className="maf-required">*</span>
        </label>
        <div className="maf-time-input-group">
          <input
            type="number"
            min="5"
            max="240"
            value={timeMinutes}
            onChange={e => setTimeMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            className="maf-input maf-time-input"
            placeholder="e.g., 30"
            disabled={isLoading}
          />
          <span className="maf-input-suffix">minutes</span>
        </div>
        {typeof timeMinutes === 'number' && (
          <div className="maf-help-text">
            ✓ Range: {timeMinutes < 5 ? '⚠️ Too short' : timeMinutes > 240 ? '⚠️ Too long' : '✓ Valid'} (5-240 min)
          </div>
        )}
      </div>

      {/* ERROR MESSAGES */}
      {errors.length > 0 && (
        <div className="maf-errors">
          {errors.map((error, idx) => (
            <div key={idx} className="maf-error-item">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* ACTIONS */}
      <div className="maf-actions">
        <button
          onClick={handlePrevStep}
          disabled={isLoading}
          className="maf-button maf-button-secondary"
        >
          ← Back
        </button>
        <button
          onClick={() => {
            if (validateAssessmentIntent(buildIntent()).valid) {
              setCurrentStep('ADVANCED');
              setShowAdvanced(true);
              setErrors([]);
            }
          }}
          disabled={isLoading || !validateAssessmentIntent(buildIntent()).valid}
          className="maf-button maf-button-tertiary"
        >
          ⚙️ Advanced (Optional)
        </button>
        <button
          onClick={handleNextStep}
          disabled={isLoading}
          className="maf-button maf-button-primary"
        >
          {isLoading ? '⏳ Generating...' : '🚀 Generate Assessment'}
        </button>
      </div>
    </div>
  );

  /**
   * Render ADVANCED step (Focus Areas, Emphasis, Difficulty, Context)
   */
  const renderAdvancedStep = () => (
    <div className="maf-step">
      <h3 className="maf-step-title">⚙️ Advanced Options</h3>

      <div className="maf-form-group">
        <label className="maf-label">
          Focus Areas <span className="maf-optional">(optional)</span>
        </label>
        <textarea
          placeholder="One per line. E.g.:&#10;Sampling distributions&#10;Central Limit Theorem&#10;Success-failure conditions"
          value={focusAreas}
          onChange={e => setFocusAreas(e.target.value)}
          className="maf-textarea"
          rows={4}
          disabled={isLoading}
        />
        <div className="maf-help-text">
          {focusAreasArray.length} of 5 areas
        </div>
      </div>

      <div className="maf-form-group">
        <label className="maf-label">
          Assessment Emphasis <span className="maf-optional">(optional)</span>
        </label>
        <div className="maf-emphasis-group">
          {EMPHASIS_OPTIONS.map(opt => (
            <label key={opt} className="maf-emphasis-label">
              <input
                type="radio"
                name="emphasis"
                value={opt}
                checked={emphasis === opt}
                onChange={e => setEmphasis(e.target.value as AssessmentEmphasis)}
                disabled={isLoading}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="maf-form-group">
        <label className="maf-label">
          Difficulty Profile <span className="maf-optional">(optional)</span>
        </label>
        <div className="maf-emphasis-group">
          {DIFFICULTY_PROFILES.map(prof => (
            <label key={prof} className="maf-emphasis-label">
              <input
                type="radio"
                name="difficultyProfile"
                value={prof}
                checked={difficultyProfile === prof}
                onChange={e => setDifficultyProfile(e.target.value as DifficultyProfile)}
                disabled={isLoading}
              />
              <span>{prof}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="maf-form-group">
        <label className="maf-label">
          Classroom Context <span className="maf-optional">(optional)</span>
        </label>
        <textarea
          placeholder="Anything the AI should know? E.g., 'Students struggle with probability notation'"
          value={classroomContext}
          onChange={e => setClassroomContext(e.target.value)}
          className="maf-textarea"
          rows={3}
          maxLength={500}
          disabled={isLoading}
        />
        <div className="maf-help-text">
          {classroomContext.length} / 500 characters
        </div>
      </div>

      {/* ERROR MESSAGES */}
      {errors.length > 0 && (
        <div className="maf-errors">
          {errors.map((error, idx) => (
            <div key={idx} className="maf-error-item">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* ACTIONS */}
      <div className="maf-actions">
        <button
          onClick={handlePrevStep}
          disabled={isLoading}
          className="maf-button maf-button-secondary"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="maf-button maf-button-primary"
        >
          {isLoading ? '⏳ Generating...' : '✨ Generate with Advanced Options'}
        </button>
      </div>
    </div>
  );

  // Render based on current step
  return (
    <div className="minimal-assessment-form">
      <div className="maf-container">
        <div className="maf-header">
          <h2>📚 Create Assessment</h2>
          <p className="maf-subtitle">2-minute workflow for intelligent assessments</p>
        </div>

        {currentStep === 'SOURCE' && renderSourceStep()}
        {currentStep === 'CORE' && renderCoreStep()}
        {currentStep === 'ADVANCED' && renderAdvancedStep()}
      </div>
    </div>
  );
}
