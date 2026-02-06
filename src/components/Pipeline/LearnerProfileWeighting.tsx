import { useState, useMemo, useEffect } from 'react';
import './LearnerProfileWeighting.css';
import { WeightedLearnerProfile, LEARNER_PROFILE_CHARACTERISTICS } from '../../agents/analysis/timeEstimation';

interface LearnerProfileWeightingProps {
  selectedProfiles: string[];
  onWeightsChange?: (weights: Record<string, number>) => void;
  onProfilesChange?: (profiles: WeightedLearnerProfile[]) => void;
}

export function LearnerProfileWeighting({
  selectedProfiles,
  onWeightsChange,
  onProfilesChange,
}: LearnerProfileWeightingProps) {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    // Equal distribution among selected profiles
    const initial: Record<string, number> = {};
    const equalWeight = selectedProfiles.length > 0 ? 100 / selectedProfiles.length : 0;
    selectedProfiles.forEach(profile => {
      initial[profile] = equalWeight;
    });
    return initial;
  });

  // Automatically update when selected profiles change
  useEffect(() => {
    if (selectedProfiles.length === 0) {
      setWeights({});
      return;
    }

    const newWeights: Record<string, number> = {};
    const newProfiles = selectedProfiles.filter(p => weights[p] === undefined);
    
    if (newProfiles.length > 0) {
      // Redistribute weight among all selected profiles
      const totalWeight = 100;
      const newWeight = totalWeight / selectedProfiles.length;
      
      selectedProfiles.forEach(profile => {
        newWeights[profile] = newWeight;
      });
      
      setWeights(newWeights);
    }
  }, [selectedProfiles.length]); // Only trigger on length change, not on selectedProfiles change

  const handleWeightChange = (profileId: string, newWeight: number) => {
    const clampedWeight = Math.max(0, Math.min(100, newWeight));
    setWeights(prev => ({
      ...prev,
      [profileId]: clampedWeight,
    }));

    onWeightsChange?.({
      ...weights,
      [profileId]: clampedWeight,
    });
  };

  // Auto-normalize weights when they exceed 100
  const handleWeightBlur = () => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total !== 100 && total > 0) {
      const normalizedWeights: Record<string, number> = {};
      Object.entries(weights).forEach(([profile, weight]) => {
        normalizedWeights[profile] = (weight / total) * 100;
      });
      setWeights(normalizedWeights);
      onWeightsChange?.(normalizedWeights);
    }
  };

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + w, 0);
  }, [weights]);

  const weightedProfiles: WeightedLearnerProfile[] = useMemo(() => {
    return selectedProfiles.map(profileId => ({
      profileId,
      label: profileId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      weight: weights[profileId] || 0,
      characteristics: LEARNER_PROFILE_CHARACTERISTICS[profileId]?.strengths || [],
    }));
  }, [selectedProfiles, weights]);

  // Notify parent of profile changes
  useEffect(() => {
    onProfilesChange?.(weightedProfiles);
  }, [weightedProfiles]);

  return (
    <div className="learner-profile-weighting">
      <div className="weighting-header">
        <h3>📊 Class Composition: Learner Profile Distribution</h3>
        <p className="subtitle">Assign weights to model your class composition</p>
      </div>

      {selectedProfiles.length === 0 ? (
        <div className="no-profiles">
          <p>Select at least one learner profile to begin weighting</p>
        </div>
      ) : (
        <>
          <div className="profiles-container">
            {weightedProfiles.map(profile => (
              <div key={profile.profileId} className="profile-weight-item">
                <div className="profile-info">
                  <div className="profile-name">{profile.label}</div>
                  <div className="profile-description">
                    {LEARNER_PROFILE_CHARACTERISTICS[profile.profileId]?.struggles.slice(0, 2).join(', ')}
                  </div>
                </div>

                <div className="weight-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={profile.weight}
                    onChange={e => handleWeightChange(profile.profileId, parseFloat(e.target.value))}
                    onBlur={handleWeightBlur}
                    className="weight-slider"
                  />
                  <div className="weight-display">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(profile.weight)}
                      onChange={e => handleWeightChange(profile.profileId, parseFloat(e.target.value))}
                      onBlur={handleWeightBlur}
                      className="weight-input"
                    />
                    <span className="weight-unit">%</span>
                  </div>
                </div>

                <div className={`weight-bar ${getTotalWarning(totalWeight)}`}>
                  <div
                    className="weight-fill"
                    style={{ width: `${(profile.weight / Math.max(totalWeight, 100)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={`total-weight ${getTotalWarning(totalWeight)}`}>
            <span className="label">Total Weight:</span>
            <span className={`value ${totalWeight === 100 ? 'valid' : 'invalid'}`}>
              {totalWeight.toFixed(1)}%
            </span>
            {totalWeight !== 100 && (
              <span className="hint">
                {totalWeight < 100 ? `${(100 - totalWeight).toFixed(1)}% unassigned` : `${(totalWeight - 100).toFixed(1)}% overweight`}
              </span>
            )}
          </div>

          {/* Visualization */}
          <div className="composition-visualization">
            <div className="pie-chart">
              {weightedProfiles.map((profile, idx) => (
                <div key={profile.profileId} className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: getProfileColor(idx) }}
                  />
                  <div className="legend-text">
                    <span className="profile-name">{profile.label}</span>
                    <span className="profile-weight">{profile.weight.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Summary */}
          <div className="impact-summary">
            <h4>📈 Impact Summary</h4>
            <div className="impact-items">
              <div className="impact-item">
                <span className="label">Avg. Time Multiplier:</span>
                <span className="value">{calculateAvgMultiplier(weightedProfiles).toFixed(2)}x</span>
              </div>
              <div className="impact-item">
                <span className="label">Avg. Variability:</span>
                <span className="value">{calculateAvgVariability(weightedProfiles).toFixed(2)}</span>
              </div>
              <div className="impact-item">
                <span className="label">Class Complexity:</span>
                <span className="value">{getComplexityLabel(calculateAvgMultiplier(weightedProfiles))}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getTotalWarning(total: number): string {
  if (total === 100) return 'valid';
  if (total < 100) return 'warning-under';
  return 'warning-over';
}

function getProfileColor(index: number): string {
  const colors = [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#45B7D1', // blue
    '#FFA07A', // salmon
    '#98D8C8', // mint
    '#F7DC6F', // yellow
  ];
  return colors[index % colors.length];
}

function calculateAvgMultiplier(profiles: WeightedLearnerProfile[]): number {
  let total = 0;
  let weightSum = 0;

  for (const profile of profiles) {
    const char = LEARNER_PROFILE_CHARACTERISTICS[profile.profileId];
    if (char) {
      const weight = profile.weight / 100;
      total += char.timeMultiplier * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0 ? total / weightSum : 1;
}

function calculateAvgVariability(profiles: WeightedLearnerProfile[]): number {
  let total = 0;
  let weightSum = 0;

  for (const profile of profiles) {
    const char = LEARNER_PROFILE_CHARACTERISTICS[profile.profileId];
    if (char) {
      const weight = profile.weight / 100;
      total += char.variabilityFactor * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0 ? total / weightSum : 1;
}

function getComplexityLabel(multiplier: number): string {
  if (multiplier < 1) return '🟢 Fast';
  if (multiplier < 1.1) return '🟡 Moderate';
  return '🔴 Slow';
}
