import { useState } from 'react';
import { SubjectSelector } from './SubjectSelector';
import { LearningObjectivesInput } from './LearningObjectivesInput';
import { CriteriaBuilder, Criterion } from './CriteriaBuilder';
import { AssignmentPartBuilder, AssignmentPart } from './AssignmentPartBuilder';
import { BloomDistributionSelector } from './BloomDistributionSelector';
import { AssignmentTypeSelector } from './AssignmentTypeSelector';
import { ASSIGNMENT_TYPES, BloomDistribution, AssignmentTypeTemplate } from '../../types/assignmentTypes';

interface AssignmentBuilderProps {
  onAssignmentBuilt: (config: AssignmentConfig) => void;
  isLoading?: boolean;
}

export interface AssignmentConfig {
  subject: string;
  gradeLevel: string;
  title: string;
  description: string;
  assignmentType?: string;
  assignmentTypeTemplate?: AssignmentTypeTemplate;
  numberOfQuestions?: number;
  learningObjectives: string[];
  criteria: Criterion[];
  totalPoints: number;
  estimatedTimeMinutes: number;
  parts?: AssignmentPart[];
  bloomDistribution?: BloomDistribution;
}

export function AssignmentBuilder({ onAssignmentBuilt, isLoading = false }: AssignmentBuilderProps) {
  const [config, setConfig] = useState<AssignmentConfig>({
    subject: '',
    gradeLevel: '',
    title: '',
    description: '',
    assignmentType: '',
    learningObjectives: [],
    criteria: [],
    totalPoints: 100,
    estimatedTimeMinutes: 120,
    parts: [],
    numberOfQuestions: 10,
    bloomDistribution: {
      Remember: 15,
      Understand: 25,
      Apply: 25,
      Analyze: 20,
      Evaluate: 10,
      Create: 5,
    },
  });

  const handleSelectAssignmentType = (template: AssignmentTypeTemplate) => {
    setConfig((prev) => ({
      ...prev,
      assignmentType: template.id,
      assignmentTypeTemplate: template,
      description: template.defaultInstructions,
      numberOfQuestions: template.suggestedQuestionCount,
      estimatedTimeMinutes: template.estimatedTimeMinutes,
      bloomDistribution: template.bloomDistribution,
      // Update criteria to match suggested categories
      criteria: template.suggestedRubricCategories.map((name) => ({
        name,
        points: Math.floor(prev.totalPoints / template.suggestedRubricCategories.length),
        isCustom: false,
      })),
    }));
  };

  const handleSubmit = () => {
    // Validation
    const errors: string[] = [];
    
    if (!config.subject.trim()) errors.push('Subject is required');
    if (!config.gradeLevel.trim()) errors.push('Grade level is required');
    if (!config.title.trim()) errors.push('Title is required');
    if (!config.description.trim()) errors.push('Instructions/Description is required');
    if (config.learningObjectives.filter(o => o.trim()).length === 0) {
      errors.push('At least one learning objective is required');
    }
    if (config.criteria.length === 0) errors.push('At least one criterion is required');
    if (config.totalPoints <= 0) errors.push('Total points must be greater than 0');
    if (!config.assignmentType) errors.push('Please select an assignment type');

    if (errors.length > 0) {
      alert('Please fix the following issues:\n\n' + errors.join('\n'));
      return;
    }

    onAssignmentBuilt(config);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>📚 Build Your Assignment</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Define the structure and expectations for your assignment using this guided builder.
      </p>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
        {/* Subject Selector (Step 1) */}
        <SubjectSelector
          value={config.subject}
          onChange={(subject) => setConfig({ ...config, subject })}
        />

        {/* Grade Level (Step 1.5) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📊 Grade Level
          </label>
          <select
            value={config.gradeLevel}
            onChange={(e) => setConfig({ ...config, gradeLevel: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select grade level...</option>
            <option value="K-2">K-2</option>
            <option value="3-5">3-5</option>
            <option value="6-8">6-8</option>
            <option value="9-10">9-10</option>
            <option value="11-12">11-12</option>
            <option value="College">College</option>
          </select>
        </div>

        {/* Assignment Type (Step 2) */}
        <AssignmentTypeSelector
          selectedType={config.assignmentType}
          onSelectType={handleSelectAssignmentType}
          onBloomDistributionChange={(dist) => setConfig({ ...config, bloomDistribution: dist })}
        />

        {/* Title (Step 3) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📝 Assignment Title
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="e.g., Critical Analysis Essay on Climate Change"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Instructions/Description (Step 4) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📄 Instructions
          </label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Instructions for students..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0' }}>
            (Auto-populated from assignment type, edit as needed)
          </p>
        </div>

        {/* Number of Questions (Step 5) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            ❓ Number of Questions
          </label>
          <input
            type="number"
            value={config.numberOfQuestions || 10}
            onChange={(e) => setConfig({ ...config, numberOfQuestions: parseInt(e.target.value) || 10 })}
            min="1"
            max="100"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0' }}>
            Questions will be distributed across Bloom levels according to your selected distribution
          </p>
        </div>

        {/* Learning Objectives (Step 6) */}
        <LearningObjectivesInput
          objectives={config.learningObjectives}
          onChange={(objectives) => setConfig({ ...config, learningObjectives: objectives })}
          subject={config.subject}
        />

        {/* Criteria Builder (Step 7) */}
        <CriteriaBuilder
          criteria={config.criteria}
          totalPoints={config.totalPoints}
          onChange={(criteria) => setConfig({ ...config, criteria })}
          onTotalPointsChange={(totalPoints) => setConfig({ ...config, totalPoints })}
        />

        {/* Assignment Parts Builder (Optional) */}
        <AssignmentPartBuilder
          parts={config.parts || []}
          onChange={(parts) => setConfig({ ...config, parts })}
        />

        {/* Bloom Distribution Selector (Already pre-filled) */}
        {config.bloomDistribution && (
          <BloomDistributionSelector
            distribution={config.bloomDistribution}
            onChange={(bloomDistribution) => setConfig({ ...config, bloomDistribution })}
          />
        )}

        {/* Time Estimate */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            ⏱️ Estimated Time (minutes)
          </label>
          <input
            type="number"
            value={config.estimatedTimeMinutes}
            onChange={(e) => setConfig({ ...config, estimatedTimeMinutes: parseInt(e.target.value) || 0 })}
            min="0"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '16px',
          }}
        >
          {isLoading ? 'Generating Assignment...' : '🚀 Generate Assignment'}
        </button>
      </div>
    </div>
  );
}
