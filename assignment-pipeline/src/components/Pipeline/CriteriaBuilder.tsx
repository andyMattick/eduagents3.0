import React, { useState, useEffect } from 'react';

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

const COMMON_CRITERIA = [
  'Clarity',
  'Grammar & Syntax',
  'Structure & Organization',
  'Creativity & Originality',
  'Evidence & Support',
  'Analysis & Critical Thinking',
  'Proper Citation',
  'Completeness',
  'Accuracy',
  'Technical Quality',
];

export function CriteriaBuilder({
  criteria,
  totalPoints,
  onChange,
  onTotalPointsChange,
}: CriteriaBuilderProps) {
  const [numCriteria, setNumCriteria] = useState(criteria.length || 3);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  // Initialize criteria if empty
  useEffect(() => {
    if (criteria.length === 0 && numCriteria > 0) {
      const defaultCriteria: Criterion[] = Array(numCriteria).fill(null).map((_, i) => ({
        name: COMMON_CRITERIA[i] || `Criterion ${i + 1}`,
        points: Math.floor(totalPoints / numCriteria),
        isCustom: false,
      }));
      onChange(defaultCriteria);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointsPerCriteriaChange = (numCriteria: number) => {
    setNumCriteria(numCriteria);
    const pointsPerCriterion = Math.floor(totalPoints / numCriteria);
    const newCriteria: Criterion[] = Array(numCriteria).fill(null).map((_, i) => ({
      name: criteria[i]?.name || COMMON_CRITERIA[i] || `Criterion ${i + 1}`,
      points: pointsPerCriterion,
      isCustom: criteria[i]?.isCustom || false,
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
      const newCriteria = [...criteria, { name: customName.trim(), points: 0, isCustom: true }];
      onChange(newCriteria);
      setCustomName('');
      setShowCustom(false);
      setNumCriteria(newCriteria.length);
    }
  };

  const removeCriterion = (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    onChange(newCriteria);
    setNumCriteria(newCriteria.length);
  };

  const totalAssignedPoints = criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <div style={{ marginBottom: '16px' }}>
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

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📋 Number of Criteria
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={numCriteria}
            onChange={(e) => handlePointsPerCriteriaChange(parseInt(e.target.value) || 1)}
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
