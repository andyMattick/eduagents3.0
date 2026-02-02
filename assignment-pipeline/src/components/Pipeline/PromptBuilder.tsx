import React, { useState } from 'react';
import {
  AssignmentMetadata,
  AssignmentType,
  GradeLevel,
  DifficultyLevel,
  ASSIGNMENT_TYPE_LABELS,
  GRADE_LEVEL_LABELS,
  DIFFICULTY_LABELS,
  TIME_ESTIMATES,
  PROMPT_GUIDANCE,
  getExamplePrompts,
} from '../../agents/shared/assignmentMetadata';
import { generateAssignment } from '../../agents/shared/generateAssignment';

interface PromptBuilderProps {
  onAssignmentGenerated: (content: string, metadata: AssignmentMetadata) => void;
  isLoading?: boolean;
}

export function PromptBuilder({ onAssignmentGenerated, isLoading = false }: PromptBuilderProps) {
  const [showExamples, setShowExamples] = useState(false);

  const [metadata, setMetadata] = useState<AssignmentMetadata>({
    title: '',
    description: '',
    topic: '',
    assignmentType: AssignmentType.ESSAY,
    gradeLevel: GradeLevel.HIGH_SCHOOL,
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    estimatedTimeMinutes: 120,
    learningObjectives: [''],
    requiredElements: [''],
    assessmentCriteria: [''],
  });

  const [generating, setGenerating] = useState(false);

  const handleMetadataChange = (
    field: keyof AssignmentMetadata,
    value: any,
  ) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayFieldChange = (
    field: 'learningObjectives' | 'requiredElements' | 'assessmentCriteria',
    index: number,
    value: string,
  ) => {
    setMetadata(prev => {
      const updated = [...(prev[field] as string[])];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const handleAddArrayItem = (
    field: 'learningObjectives' | 'requiredElements' | 'assessmentCriteria',
  ) => {
    setMetadata(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ''],
    }));
  };

  const handleRemoveArrayItem = (
    field: 'learningObjectives' | 'requiredElements' | 'assessmentCriteria',
    index: number,
  ) => {
    setMetadata(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  const handleGenerateAssignment = async () => {
    // Validation
    if (!metadata.title.trim()) {
      alert('Please enter an assignment title');
      return;
    }
    if (!metadata.topic.trim()) {
      alert('Please enter the main topic');
      return;
    }
    if (!metadata.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (
      metadata.learningObjectives.filter(o => o.trim()).length === 0
    ) {
      alert('Please add at least one learning objective');
      return;
    }
    if (metadata.assessmentCriteria.filter(c => c.trim()).length === 0) {
      alert('Please add at least one assessment criterion');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateAssignment(metadata);
      onAssignmentGenerated(result.content, result.metadata);
    } catch (err) {
      alert('Failed to generate assignment');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
          💡 Create a Smart Assignment Prompt
        </h3>
        <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          Answer the questions below to create a detailed, well-structured assignment that will
          help students learn effectively. The more specific you are, the better the AI feedback
          will be.
        </p>
      </div>

      {/* Basic Information */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #ddd',
        }}
      >
        <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>📋 Basic Information</h4>

        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
            {PROMPT_GUIDANCE.title.label} *
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => handleMetadataChange('title', e.target.value)}
            placeholder={PROMPT_GUIDANCE.title.placeholder}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            {PROMPT_GUIDANCE.title.helperText}
          </div>
        </div>

        {/* Topic */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
            {PROMPT_GUIDANCE.topic.label} *
          </label>
          <input
            type="text"
            value={metadata.topic}
            onChange={(e) => handleMetadataChange('topic', e.target.value)}
            placeholder={PROMPT_GUIDANCE.topic.placeholder}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            {PROMPT_GUIDANCE.topic.helperText}
          </div>
        </div>

        {/* Grade Level & Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
              Grade Level *
            </label>
            <select
              value={metadata.gradeLevel}
              onChange={(e) => handleMetadataChange('gradeLevel', e.target.value as GradeLevel)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {Object.entries(GRADE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
              Assignment Type *
            </label>
            <select
              value={metadata.assignmentType}
              onChange={(e) => handleMetadataChange('assignmentType', e.target.value as AssignmentType)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
              Difficulty Level *
            </label>
            <select
              value={metadata.difficultyLevel}
              onChange={(e) => handleMetadataChange('difficultyLevel', e.target.value as DifficultyLevel)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
              Estimated Time (minutes) *
            </label>
            <select
              value={metadata.estimatedTimeMinutes}
              onChange={(e) => handleMetadataChange('estimatedTimeMinutes', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {TIME_ESTIMATES[metadata.gradeLevel].map(time => (
                <option key={time} value={time}>
                  {time} minutes
                  {time > 60 && ` (${Math.floor(time / 60)}h${time % 60 > 0 ? ` ${time % 60}m` : ''})`}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Students will see this time estimate to plan accordingly.
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
            {PROMPT_GUIDANCE.description.label} *
          </label>
          <textarea
            value={metadata.description}
            onChange={(e) => handleMetadataChange('description', e.target.value)}
            placeholder={PROMPT_GUIDANCE.description.placeholder}
            rows={5}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'system-ui',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            {PROMPT_GUIDANCE.description.helperText}
          </div>
        </div>
      </div>

      {/* Learning & Assessment */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #ddd',
        }}
      >
        <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>🎯 Learning Objectives & Assessment</h4>

        {/* Learning Objectives */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {PROMPT_GUIDANCE.learningObjectives.label} * (Typically 2-5)
          </label>
          {metadata.learningObjectives.map((objective, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={objective}
                onChange={(e) => handleArrayFieldChange('learningObjectives', index, e.target.value)}
                placeholder="e.g., Analyze cause-effect relationships"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              {metadata.learningObjectives.length > 1 && (
                <button
                  onClick={() => handleRemoveArrayItem('learningObjectives', index)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => handleAddArrayItem('learningObjectives')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + Add Objective
          </button>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            {PROMPT_GUIDANCE.learningObjectives.helperText}
          </div>
        </div>

        {/* Assessment Criteria */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {PROMPT_GUIDANCE.assessmentCriteria.label} *
          </label>
          {metadata.assessmentCriteria.map((criterion, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={criterion}
                onChange={(e) => handleArrayFieldChange('assessmentCriteria', index, e.target.value)}
                placeholder="e.g., Clarity of thesis"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              {metadata.assessmentCriteria.length > 1 && (
                <button
                  onClick={() => handleRemoveArrayItem('assessmentCriteria', index)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => handleAddArrayItem('assessmentCriteria')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + Add Criterion
          </button>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            {PROMPT_GUIDANCE.assessmentCriteria.helperText}
          </div>
        </div>
      </div>

      {/* Requirements (Optional) */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #ddd',
        }}
      >
        <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>✓ Required Elements (Optional)</h4>
        {metadata.requiredElements.map((element, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={element}
              onChange={(e) => handleArrayFieldChange('requiredElements', index, e.target.value)}
              placeholder="e.g., Minimum 5 sources, Proper citations"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            {metadata.requiredElements.length > 1 && (
              <button
                onClick={() => handleRemoveArrayItem('requiredElements', index)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => handleAddArrayItem('requiredElements')}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          + Add Requirement
        </button>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          {PROMPT_GUIDANCE.requiredElements.helperText}
        </div>
      </div>

      {/* Examples */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3e5fc',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setShowExamples(!showExamples)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0066cc',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            padding: 0,
            textAlign: 'left',
          }}
        >
          {showExamples ? '▼' : '▶'} View Example Prompts
        </button>
        {showExamples && (
          <div style={{ marginTop: '12px' }}>
            {getExamplePrompts().map((example, index) => (
              <div key={index} style={{ marginBottom: '8px', fontSize: '13px', color: '#333' }}>
                • {example}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleGenerateAssignment}
          disabled={generating || isLoading}
          style={{
            flex: 1,
            padding: '12px 24px',
            backgroundColor: generating || isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: generating || isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {generating ? '✨ Generating...' : '✨ Generate Assignment'}
        </button>
      </div>
    </div>
  );
}
