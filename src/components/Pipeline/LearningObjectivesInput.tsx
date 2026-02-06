import { useState, useEffect } from 'react';
import { SUGGESTED_OBJECTIVES_BY_SUBJECT } from '../../types/assignmentTypes';

interface LearningObjectivesInputProps {
  objectives: string[];
  onChange: (objectives: string[]) => void;
  subject?: string;
}

// High-quality, standards-aligned objectives
const PRELOADED_OBJECTIVES = [
  'Critical Thinking',
  'Clear Communication',
  'Analysis & Synthesis',
  'Problem Solving',
  'Evidence-Based Reasoning',
  'Collaboration',
  'Research Skills',
  'Creativity & Innovation',
];

const COMMON_OBJECTIVES = [
  'Critical Thinking',
  'Evidence-Based Reasoning',
  'Clear Communication',
  'Research Skills',
  'Creativity',
  'Collaboration',
  'Problem Solving',
  'Analysis',
  'Synthesis',
  'Evaluation',
  'Application',
  'Understanding',
];

export function LearningObjectivesInput({ objectives, onChange, subject }: LearningObjectivesInputProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customObjective, setCustomObjective] = useState('');

  // Auto-select objectives based on subject on mount or when subject changes
  useEffect(() => {
    if (objectives.length === 0) {
      // Get subject-specific suggestions if available
      let defaultObjs = PRELOADED_OBJECTIVES.slice(0, 3);
      
      if (subject) {
        const subjectSuggestions = SUGGESTED_OBJECTIVES_BY_SUBJECT[subject] || 
                                   SUGGESTED_OBJECTIVES_BY_SUBJECT.default;
        defaultObjs = subjectSuggestions.slice(0, 3);
      }
      
      onChange(defaultObjs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  const addObjective = (objective: string) => {
    if (!objectives.includes(objective) && objective.trim()) {
      onChange([...objectives, objective]);
      setCustomObjective('');
      setShowCustomInput(false);
    }
  };

  const removeObjective = (index: number) => {
    onChange(objectives.filter((_, i) => i !== index));
  };

  const handleAddCustom = () => {
    if (customObjective.trim()) {
      addObjective(customObjective.trim());
    }
  };

  const availablePreloaded = PRELOADED_OBJECTIVES.filter(obj => !objectives.includes(obj));

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
        🎯 Learning Objectives
      </label>

      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
        Pre-selected standards-aligned objectives. Add or remove as needed.
      </p>

      {objectives.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {objectives.map((obj, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: '#e8f4f8',
                border: '1px solid #b3dfe8',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <span>{obj}</span>
              <button
                onClick={() => removeObjective(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d9534f',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Show quick-add buttons for remaining preloaded objectives */}
      {availablePreloaded.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', fontWeight: '500' }}>
            Quick add:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availablePreloaded.slice(0, 5).map((obj) => (
              <button
                key={obj}
                onClick={() => addObjective(obj)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e8f4f8',
                  border: '1px solid #b3dfe8',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#0066cc',
                  fontWeight: '500',
                }}
              >
                + {obj}
              </button>
            ))}
          </div>
        </div>
      )}

      <select
        onChange={(e) => {
          if (e.target.value) {
            addObjective(e.target.value);
            e.target.value = '';
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          marginBottom: '12px',
          boxSizing: 'border-box',
          color: '#666',
        }}
      >
        <option value="">Select an objective to add...</option>
        {COMMON_OBJECTIVES.filter(obj => !objectives.includes(obj)).map(obj => (
          <option key={obj} value={obj}>
            {obj}
          </option>
        ))}
      </select>

      {!showCustomInput ? (
        <button
          onClick={() => setShowCustomInput(true)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#007bff',
            fontWeight: 'bold',
            marginTop: '8px',
          }}
        >
          + Add Custom Objective
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            type="text"
            value={customObjective}
            onChange={(e) => setCustomObjective(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom();
            }}
            placeholder="Enter custom objective..."
            autoFocus
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #0066cc',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleAddCustom}
            style={{
              padding: '10px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Add
          </button>
          <button
            onClick={() => setShowCustomInput(false)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

