import { useState, useEffect } from 'react';

export interface Criterion {
  name: string;
  points: number;
  isCustom?: boolean;
}

interface CriteriaBuilderProps {
  criteria: Criterion[];
  totalPoints: number;
  onChange: (criteria: Criterion[]) => void;
  onTotalPointsChange: (points: number) => void;
}

// Preset criteria templates
const CRITERIA_PRESETS = {
  balanced: {
    label: 'Balanced (5 criteria at 20% each)',
    criteria: ['Clarity', 'Accuracy', 'Depth', 'Organization', 'Effort'],
  },
  standard: {
    label: 'Standard (3 criteria)',
    criteria: ['Clarity', 'Accuracy', 'Completeness'],
  },
  detailed: {
    label: 'Detailed (5 criteria)',
    criteria: ['Clarity', 'Accuracy', 'Structure & Organization', 'Evidence & Support', 'Completeness'],
  },
  creative: {
    label: 'Creative Work (4 criteria)',
    criteria: ['Creativity & Originality', 'Clarity', 'Technical Quality', 'Evidence & Support'],
  },
  academic: {
    label: 'Academic Essay (5 criteria)',
    criteria: ['Clarity', 'Evidence & Support', 'Analysis & Critical Thinking', 'Structure & Organization', 'Grammar & Syntax'],
  },
};

export function CriteriaBuilder({
  criteria,
  totalPoints,
  onChange,
  onTotalPointsChange,
}: CriteriaBuilderProps) {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof CRITERIA_PRESETS | null>(
    criteria.length === 0 ? 'balanced' : null
  );
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  // Initialize criteria with preset if empty
  useEffect(() => {
    if (criteria.length === 0 && selectedPreset) {
      const presetCriteria = CRITERIA_PRESETS[selectedPreset].criteria;
      const pointsPerCriterion = Math.floor(totalPoints / presetCriteria.length);
      const defaultCriteria: Criterion[] = presetCriteria.map((name) => ({
        name,
        points: pointsPerCriterion,
        isCustom: false,
      }));
      onChange(defaultCriteria);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  const handlePresetChange = (presetKey: keyof typeof CRITERIA_PRESETS) => {
    setSelectedPreset(presetKey);
    const presetCriteria = CRITERIA_PRESETS[presetKey].criteria;
    const pointsPerCriterion = Math.floor(totalPoints / presetCriteria.length);
    const newCriteria: Criterion[] = presetCriteria.map((name) => ({
      name,
      points: pointsPerCriterion,
      isCustom: false,
    }));
    onChange(newCriteria);
  };

  const handleCriterionNameChange = (index: number, name: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], name };
    onChange(newCriteria);
  };

  const handleCriterionPointsChange = (index: number, points: number) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], points };
    onChange(newCriteria);
  };

  const addCustomCriterion = () => {
    if (customName.trim()) {
      const newCriteria = [...criteria, { name: customName.trim(), points: Math.floor(totalPoints / (criteria.length + 1)), isCustom: true }];
      onChange(newCriteria);
      setCustomName('');
      setShowCustom(false);
    }
  };

  const removeCriterion = (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    onChange(newCriteria);
  };

  const totalAssignedPoints = criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Preset Selection */}
      {criteria.length === 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📊 Select a Grading Template (or customize below)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {Object.entries(CRITERIA_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetChange(key as keyof typeof CRITERIA_PRESETS)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: selectedPreset === key ? '#007bff' : '#f5f5f5',
                  color: selectedPreset === key ? 'white' : '#333',
                  border: `2px solid ${selectedPreset === key ? '#0056b3' : '#ddd'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📊 Total Points
          </label>
          <input
            type="number"
            value={totalPoints}
            onChange={(e) => {
              const newTotal = parseInt(e.target.value) || 0;
              onTotalPointsChange(newTotal);
              // Redistribute points evenly
              const newCriteria = criteria.map(c => ({
                ...c,
                points: Math.floor(newTotal / criteria.length),
              }));
              onChange(newCriteria);
            }}
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
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>Grading Criteria</h4>
        {criteria.map((criterion, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px',
              alignItems: 'flex-start',
            }}
          >
            <input
              type="text"
              value={criterion.name}
              onChange={(e) => handleCriterionNameChange(idx, e.target.value)}
              placeholder="Criterion name..."
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="number"
              value={criterion.points}
              onChange={(e) => handleCriterionPointsChange(idx, parseInt(e.target.value) || 0)}
              placeholder="Points"
              style={{
                width: '80px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box',
              }}
            />
            {criterion.isCustom && (
              <button
                onClick={() => removeCriterion(idx)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#d9534f',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '8px 12px',
          backgroundColor: totalAssignedPoints === totalPoints ? '#d4edda' : '#fff3cd',
          border: `1px solid ${totalAssignedPoints === totalPoints ? '#c3e6cb' : '#ffc107'}`,
          borderRadius: '4px',
          fontSize: '13px',
          marginBottom: '12px',
          color: totalAssignedPoints === totalPoints ? '#155724' : '#856404',
        }}
      >
        {totalAssignedPoints === totalPoints ? (
          `✓ Total points assigned: ${totalAssignedPoints}/${totalPoints}`
        ) : (
          `⚠ Total points: ${totalAssignedPoints}/${totalPoints} (difference: ${totalPoints - totalAssignedPoints})`
        )}
      </div>

      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
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
          }}
        >
          + Add Custom Criterion
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomCriterion();
            }}
            placeholder="Enter criterion name..."
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
            onClick={addCustomCriterion}
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
            onClick={() => setShowCustom(false)}
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
