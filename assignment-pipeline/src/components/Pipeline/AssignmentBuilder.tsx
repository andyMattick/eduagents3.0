import React, { useState } from 'react';
import { SubjectSelector } from './SubjectSelector';
import { LearningObjectivesInput } from './LearningObjectivesInput';
import { CriteriaBuilder, Criterion } from './CriteriaBuilder';
import { AssignmentPartBuilder, AssignmentPart } from './AssignmentPartBuilder';
import { BloomDistributionSelector } from './BloomDistributionSelector';

interface AssignmentBuilderProps {
  onAssignmentBuilt: (config: AssignmentConfig) => void;
  isLoading?: boolean;
}

interface BloomDistribution {
  Remember: number;
  Understand: number;
  Apply: number;
  Analyze: number;
  Evaluate: number;
  Create: number;
}

export interface AssignmentConfig {
  subject: string;
  title: string;
  description: string;
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
    title: '',
    description: '',
    learningObjectives: [],
    criteria: [],
    totalPoints: 100,
    estimatedTimeMinutes: 120,
    parts: [],
    bloomDistribution: {
      Remember: 15,
      Understand: 25,
      Apply: 25,
      Analyze: 20,
      Evaluate: 10,
      Create: 5,
    },
  });

  const handleSubmit = () => {
    // Validation
    const errors: string[] = [];
    
    if (!config.subject.trim()) errors.push('Subject is required');
    if (!config.title.trim()) errors.push('Title is required');
    if (!config.description.trim()) errors.push('Description is required');
    if (config.learningObjectives.filter(o => o.trim()).length === 0) {
      errors.push('At least one learning objective is required');
    }
    if (config.criteria.length === 0) errors.push('At least one criterion is required');
    if (config.totalPoints <= 0) errors.push('Total points must be greater than 0');

    if (errors.length > 0) {
      alert('Please fix the following issues:\n\n' + errors.join('\n'));
      return;
    }

    onAssignmentBuilt(config);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 0: Build Your Assignment</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Define the structure and expectations for your assignment using this guided builder.
      </p>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
        {/* Subject Selector */}
        <SubjectSelector
          value={config.subject}
          onChange={(subject) => setConfig({ ...config, subject })}
        />

        {/* Title */}
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

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📄 Assignment Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Describe the assignment, what students should do, and what they should deliver..."
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
        </div>

        {/* Learning Objectives */}
        <LearningObjectivesInput
          objectives={config.learningObjectives}
          onChange={(objectives) => setConfig({ ...config, learningObjectives: objectives })}
        />

        {/* Criteria Builder */}
        <CriteriaBuilder
          criteria={config.criteria}
          totalPoints={config.totalPoints}
          onChange={(criteria) => setConfig({ ...config, criteria })}
          onTotalPointsChange={(totalPoints) => setConfig({ ...config, totalPoints })}
        />

        {/* Assignment Parts Builder */}
        <AssignmentPartBuilder
          parts={config.parts || []}
          onChange={(parts) => setConfig({ ...config, parts })}
        />

        {/* Bloom Distribution Selector */}
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
          {isLoading ? 'Building Assignment...' : 'Build Assignment & Analyze'}
        </button>
      </div>
    </div>
  );
}
