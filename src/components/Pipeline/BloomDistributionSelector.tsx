import { useState } from 'react';

interface BloomDistribution {
  Remember: number;
  Understand: number;
  Apply: number;
  Analyze: number;
  Evaluate: number;
  Create: number;
}

interface BloomDistributionSelectorProps {
  distribution: BloomDistribution;
  onChange: (distribution: BloomDistribution) => void;
}

const BLOOM_PRESETS = {
  recall: {
    label: '📚 Mostly Recall',
    description: 'Focus on memorization and basic facts',
    distribution: {
      Remember: 60,
      Understand: 30,
      Apply: 10,
      Analyze: 0,
      Evaluate: 0,
      Create: 0,
    },
  },
  balanced: {
    label: '⚖️ Balanced',
    description: 'Mix of lower and higher-order thinking',
    distribution: {
      Remember: 15,
      Understand: 25,
      Apply: 25,
      Analyze: 20,
      Evaluate: 10,
      Create: 5,
    },
  },
  challenge: {
    label: '🚀 Challenge Mode',
    description: 'Emphasis on analysis, evaluation, and creation',
    distribution: {
      Remember: 5,
      Understand: 10,
      Apply: 20,
      Analyze: 25,
      Evaluate: 25,
      Create: 15,
    },
  },
};

type PresetKey = keyof typeof BLOOM_PRESETS;

export function BloomDistributionSelector({
  distribution,
  onChange,
}: BloomDistributionSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);

  const handlePresetChange = (presetKey: PresetKey) => {
    setSelectedPreset(presetKey);
    onChange(BLOOM_PRESETS[presetKey].distribution);
  };

  const handleDistributionChange = (level: keyof BloomDistribution, value: number) => {
    const newDistribution = { ...distribution, [level]: value };
    // Recalculate other values to keep total at 100
    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    if (total > 100) {
      // Reduce largest other value
      const levels = Object.keys(newDistribution) as Array<keyof BloomDistribution>;
      levels.sort(
        (a, b) => newDistribution[b] - newDistribution[a]
      );
      for (let level of levels) {
        if (level !== Object.keys(distribution).find(k => distribution[k as keyof BloomDistribution] === value)) {
          const diff = total - 100;
          newDistribution[level] = Math.max(0, newDistribution[level] - diff);
          break;
        }
      }
    }
    onChange(newDistribution);
    setSelectedPreset(null);
  };

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
        🎯 Question Difficulty Distribution
      </label>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0' }}>
        Choose a preset or customize the distribution across Bloom's Taxonomy levels.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          {Object.entries(BLOOM_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key as PresetKey)}
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
                textAlign: 'left',
              }}
              title={preset.description}
            >
              <div>{preset.label}</div>
              <div style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '4px' }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Distribution Sliders */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '12px',
        borderRadius: '4px',
        border: '1px solid #eee',
      }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
          Custom Distribution:
        </p>
        {Object.entries(distribution).map(([level, percentage]) => (
          <div key={level} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>
                {level}
              </label>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0066cc' }}>
                {percentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => handleDistributionChange(level as keyof BloomDistribution, parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                outline: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, #007bff 0%, #007bff ${percentage}%, #ddd ${percentage}%, #ddd 100%)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Total indicator */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: total === 100 ? '#d4edda' : '#fff3cd',
          border: `1px solid ${total === 100 ? '#c3e6cb' : '#ffc107'}`,
          borderRadius: '4px',
          fontSize: '13px',
          color: total === 100 ? '#155724' : '#856404',
        }}
      >
        {total === 100 ? (
          `✓ Distribution total: ${total}%`
        ) : (
          `⚠ Distribution total: ${total}% (adjust to 100%)`
        )}
      </div>
    </div>
  );
}
