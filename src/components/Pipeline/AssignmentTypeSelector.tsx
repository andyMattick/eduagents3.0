import { useState } from 'react';
import { ASSIGNMENT_TYPES, AssignmentTypeTemplate, BloomDistribution } from '../../types/assignmentTypes';

interface AssignmentTypeSelectorProps {
  onSelectType: (type: AssignmentTypeTemplate) => void;
  onBloomDistributionChange?: (distribution: BloomDistribution) => void;
  selectedType?: string;
}

export function AssignmentTypeSelector({
  onSelectType,
  onBloomDistributionChange,
  selectedType,
}: AssignmentTypeSelectorProps) {
  const [showDistributionEditor, setShowDistributionEditor] = useState(false);
  const [bloomDistribution, setBloomDistribution] = useState<BloomDistribution | null>(
    selectedType ? ASSIGNMENT_TYPES[selectedType]?.bloomDistribution : null
  );

  const types = Object.values(ASSIGNMENT_TYPES);

  const handleSelectType = (type: AssignmentTypeTemplate) => {
    onSelectType(type);
    setBloomDistribution(type.bloomDistribution);
    onBloomDistributionChange?.(type.bloomDistribution);
    setShowDistributionEditor(false);
  };

  const handleBloomChange = (key: keyof BloomDistribution, value: number) => {
    if (!bloomDistribution) return;
    const updated = { ...bloomDistribution, [key]: Math.max(0, Math.min(100, value)) };
    
    // Recalculate to maintain 100% total
    const total = Object.values(updated).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      // Normalize proportionally
      const factor = 100 / total;
      Object.keys(updated).forEach((k) => {
        updated[k as keyof BloomDistribution] = Math.round(updated[k as keyof BloomDistribution] * factor);
      });
    }
    
    setBloomDistribution(updated);
    onBloomDistributionChange?.(updated);
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: '#333' }}>
        ✏️ Step 3: Select Assignment Type
      </label>

      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0' }}>
        Choose an assignment type to auto-populate instructions, question count, and Bloom's distribution.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => handleSelectType(type)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: selectedType === type.id ? '2px solid #007bff' : '1px solid #ddd',
              backgroundColor: selectedType === type.id ? '#e7f0ff' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: selectedType === type.id ? 'bold' : 'normal',
              color: '#333',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedType !== type.id) {
                (e.currentTarget as HTMLElement).style.borderColor = '#007bff';
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f7ff';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedType !== type.id) {
                (e.currentTarget as HTMLElement).style.borderColor = '#ddd';
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
              }
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.emoji}</div>
            {type.label}
          </button>
        ))}
      </div>

      {selectedType && bloomDistribution && (
        <div
          style={{
            backgroundColor: '#f9f9f9',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <label style={{ fontWeight: 'bold', color: '#333', margin: 0 }}>
              📊 Bloom's Taxonomy Distribution
            </label>
            <button
              onClick={() => setShowDistributionEditor(!showDistributionEditor)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showDistributionEditor ? 'Done' : 'Customize'}
            </button>
          </div>

          {showDistributionEditor ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(bloomDistribution).map(([key, value]) => (
                <div key={key}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: '#555',
                    }}
                  >
                    {key}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) =>
                        handleBloomChange(key as keyof BloomDistribution, parseInt(e.target.value, 10))
                      }
                      style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        minWidth: '35px',
                        textAlign: 'right',
                        color: '#333',
                      }}
                    >
                      {value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {Object.entries(bloomDistribution).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '8px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{key}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>{value}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
