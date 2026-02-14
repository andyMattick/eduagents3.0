/**
 * Bloom's Taxonomy Distribution Guide
 * Shows the ideal distribution for well-designed assessments
 */

interface BloomsDistributionGuideProps {
  currentDistribution?: { [key: string]: number };
  showGuidance?: boolean;
  compact?: boolean;
}

export function BloomsDistributionGuide({ currentDistribution, showGuidance = true, compact = false }: BloomsDistributionGuideProps) {
  // Ideal distribution for a balanced assessment
  // Most questions should be at Apply/Analyze level (3-4)
  // Fewer at Understand/Evaluate (2, 5)
  // Least at Remember and Create (1, 6)
  const idealDistribution = [
    { level: '1', name: 'Remember', percentage: '5-10%', emoji: '🔍', description: 'Recall facts and terms' },
    { level: '2', name: 'Understand', percentage: '15-20%', emoji: '📖', description: 'Explain concepts' },
    { level: '3', name: 'Apply', percentage: '25-35%', emoji: '⚙️', description: 'Use information in new situations' },
    { level: '4', name: 'Analyze', percentage: '20-30%', emoji: '🔬', description: 'Draw connections among ideas' },
    { level: '5', name: 'Evaluate', percentage: '10-15%', emoji: '⚖️', description: 'Justify decisions & choices' },
    { level: '6', name: 'Create', percentage: '5-10%', emoji: '🎨', description: 'Produce new or original work' },
  ];

  if (compact) {
    return (
      <div className="blooms-guide-compact">
        <div className="blooms-header">
          <h4>🎓 Bloom's Distribution Target</h4>
          {showGuidance && <span className="guide-toggle">Most questions should be in Apply/Analyze (3-4)</span>}
        </div>
        <div className="blooms-bars">
          {idealDistribution.map(({ level, name, percentage, emoji }) => (
            <div key={level} className="bloom-bar">
              <div className="bar-label">{emoji} {name}</div>
              <div className="bar-display">
                <div className="bar-fill" style={{ width: percentage }} title={percentage}></div>
                <span className="bar-text">{percentage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="blooms-distribution-guide">
      <div className="guide-header">
        <h3>🎓 Bloom's Taxonomy Distribution Guide</h3>
        <p className="guide-intro">
          A well-designed assessment distributes questions across Bloom's levels. Most should focus on Apply & Analyze (middle levels).
        </p>
      </div>

      {showGuidance && (
        <div className="guidance-callout">
          <strong>✨ Best Practice:</strong> Structure your assessment with the majority of questions at Apply (3) and Analyze (4) levels. These require deeper thinking. Use Remember (1) and Create (6) sparingly.
        </div>
      )}

      <div className="blooms-grid">
        {idealDistribution.map(({ level, name, percentage, emoji, description }) => (
          <div key={level} className="bloom-card">
            <div className="bloom-header">
              <span className="emoji">{emoji}</span>
              <div className="bloom-meta">
                <div className="bloom-name">{name}</div>
                <div className="bloom-level">Level {level}</div>
              </div>
            </div>
            <div className="bloom-percentage">{percentage}</div>
            <p className="bloom-description">{description}</p>
            
            {currentDistribution && currentDistribution[name] && (
              <div className="current-status">
                <span className="status-label">Current:</span>
                <span className="status-count">{currentDistribution[name]}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="guide-tips">
        <h4>💡 Tips for Achieving Good Distribution:</h4>
        <ul>
          <li><strong>Remember (1):</strong> Use sparingly. Mostly for vocabulary or definitions. 5-10% of assessment.</li>
          <li><strong>Understand (2):</strong> Ask students to explain concepts in their own words. 15-20% of assessment.</li>
          <li><strong>Apply (3):</strong> Have students use knowledge to solve new problems. 25-35% of assessment. ← FOCUS HERE</li>
          <li><strong>Analyze (4):</strong> Ask students to break down information, find patterns, and draw conclusions. 20-30% of assessment. ← FOCUS HERE</li>
          <li><strong>Evaluate (5):</strong> Ask for reasoned judgments with criteria. 10-15% of assessment.</li>
          <li><strong>Create (6):</strong> Ask students to generate new work. Most challenging. 5-10% of assessment.</li>
        </ul>
      </div>
    </div>
  );
}
