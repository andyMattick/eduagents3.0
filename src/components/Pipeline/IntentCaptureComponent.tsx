import { useState } from 'react';
import './IntentCaptureComponent.css';
import { useUserFlow } from '../../hooks/useUserFlow';
import { hasAPIKeyMismatch } from '../../config/aiConfig';

interface IntentData {
  topic: string;
  gradeLevel: string;
  assignmentType: string;
  bloomTargets: string[];
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
  'Multiple Choice Quiz',
  'Short Answer',
  'Essay',
  'Problem Set',
  'Project',
  'Mixed (Multiple choice + Written)',
  'Other',
];

const BLOOM_LEVELS = [
  { id: 'remember', label: 'Remember', description: 'Recall facts and basic concepts' },
  { id: 'understand', label: 'Understand', description: 'Explain ideas or concepts' },
  { id: 'apply', label: 'Apply', description: 'Use information in a new situation' },
  { id: 'analyze', label: 'Analyze', description: 'Draw connections among ideas' },
  { id: 'evaluate', label: 'Evaluate', description: 'Justify a stand or decision' },
  { id: 'create', label: 'Create', description: 'Produce new or original work' },
];

/**
 * Intent Capture Component
 * Collects learning objectives when user doesn't have source documents
 */
export function IntentCaptureComponent() {
  const { setIntentData } = useUserFlow();
  const [intent, setIntent] = useState<IntentData>({
    topic: '',
    gradeLevel: '6-8',
    assignmentType: 'Mixed (Multiple choice + Written)',
    bloomTargets: [],
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIntent({ ...intent, topic: e.target.value });
  };

  const handleGradeLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIntent({ ...intent, gradeLevel: e.target.value });
  };

  const handleAssignmentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIntent({ ...intent, assignmentType: e.target.value });
  };

  const toggleBloomTarget = (bloomId: string) => {
    setIntent(prev => ({
      ...prev,
      bloomTargets: prev.bloomTargets.includes(bloomId)
        ? prev.bloomTargets.filter(id => id !== bloomId)
        : [...prev.bloomTargets, bloomId],
    }));
  };

  const handleSubmit = () => {
    const newErrors: string[] = [];

    if (!intent.topic.trim()) {
      newErrors.push('Please describe your learning objectives or assignment topic');
    }

    if (intent.bloomTargets.length === 0) {
      newErrors.push('Please select at least one Bloom level target');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setIntentData(intent);
    // Navigation will be handled by the parent component based on useUserFlow().getCurrentRoute()
  };

  return (
    <div className="intent-capture-component">
      <div className="intent-capture-container">
        {/* Header */}
        <div className="intent-header">
          <h1>📋 Describe Your Assignment</h1>
          <p>Tell us about the learning objectives and structure of your assignment</p>
        </div>

        {/* API Key Warning Banner */}
        {hasAPIKeyMismatch() && (
          <div className="api-key-warning-banner">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Real AI is selected but API key not configured.</strong>
              <p>Using <strong>Mock AI</strong> instead. To use real AI, add your Google API key in settings.</p>
            </div>
            <button 
              className="warning-dismiss"
              onClick={() => {/* can navigate to settings */}}
              title="Go to AI Settings"
            >
              ⚙️
            </button>
          </div>
        )}

        <div className="intent-form">
          {/* Learning Objectives / Topic */}
          <div className="form-field">
            <label htmlFor="topic">
              <span className="label-text">Learning Objectives & Topic</span>
              <span className="required">*</span>
            </label>
            <textarea
              id="topic"
              value={intent.topic}
              onChange={handleTopicChange}
              placeholder="e.g., Students will understand the causes of World War II and analyze the impact of key events. They should be able to write persuasive essays about historical perspectives."
              rows={4}
              className="textarea-input"
            />
            <p className="field-hint">Describe what students should learn and be able to do</p>
          </div>

          {/* Grade Level */}
          <div className="form-field">
            <label htmlFor="gradeLevel">
              <span className="label-text">Grade Level / Audience</span>
              <span className="required">*</span>
            </label>
            <select
              id="gradeLevel"
              value={intent.gradeLevel}
              onChange={handleGradeLevelChange}
              className="select-input"
            >
              {GRADE_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Type */}
          <div className="form-field">
            <label htmlFor="assignmentType">
              <span className="label-text">Assignment Type</span>
              <span className="required">*</span>
            </label>
            <select
              id="assignmentType"
              value={intent.assignmentType}
              onChange={handleAssignmentTypeChange}
              className="select-input"
            >
              {ASSIGNMENT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Bloom Taxonomy Targets */}
          <div className="form-field">
            <label>
              <span className="label-text">Bloom Taxonomy Targets</span>
              <span className="required">*</span>
            </label>
            <p className="field-hint">
              Select the cognitive levels your assignment should target (select at least one)
            </p>
            <div className="bloom-targets-grid">
              {BLOOM_LEVELS.map(bloom => (
                <button
                  key={bloom.id}
                  type="button"
                  className={`bloom-target-button ${intent.bloomTargets.includes(bloom.id) ? 'selected' : ''}`}
                  onClick={() => toggleBloomTarget(bloom.id)}
                  title={bloom.description}
                >
                  <div className="bloom-checkbox">
                    {intent.bloomTargets.includes(bloom.id) && <span>✓</span>}
                  </div>
                  <div className="bloom-label">
                    <strong>{bloom.label}</strong>
                    <div className="bloom-description">{bloom.description}</div>
                  </div>
                </button>
              ))}
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

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="button-secondary" onClick={() => window.history.back()}>
              ← Back
            </button>
            <button className="button-primary" onClick={handleSubmit}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
