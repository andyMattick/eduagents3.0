import React from 'react';
import { AssignmentAnalysis, BloomLevel } from '../../agents/analysis/types';

interface AnalysisDashboardProps {
  analysis: AssignmentAnalysis;
}

export function AnalysisDashboard({ analysis }: AnalysisDashboardProps) {
  const dashboardStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '20px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const scoreIndicatorStyle = (score: number): React.CSSProperties => {
    let color = '#4caf50'; // green
    if (score < 5) color = '#ef5350'; // red
    else if (score < 7) color = '#ff9800'; // orange
    
    return {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: color,
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      marginLeft: '8px',
    };
  };

  const bloomChartStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    height: '150px',
    marginTop: '12px',
  };

  const bloomBarStyle = (height: number, level: BloomLevel): React.CSSProperties => {
    const colors: Record<BloomLevel, string> = {
      Remember: '#e3f2fd',
      Understand: '#bbdefb',
      Apply: '#90caf9',
      Analyze: '#42a5f5',
      Evaluate: '#2196f3',
      Create: '#1565c0',
    };

    return {
      flex: 1,
      height: `${height}%`,
      backgroundColor: colors[level],
      borderRadius: '4px 4px 0 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: '4px',
      color: '#333',
      fontSize: '12px',
      fontWeight: '600',
      border: `2px solid ${colors[level]}`,
    };
  };

  const tagCloudStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
  };

  const tagStyle = (frequency: number): React.CSSProperties => {
    const maxFreq = Math.max(...analysis.tagFrequency.map(t => t.frequency));
    const size = 12 + (frequency / maxFreq) * 8;
    const opacity = 0.6 + (frequency / maxFreq) * 0.4;

    return {
      backgroundColor: '#e0e0e0',
      color: '#333',
      padding: '6px 12px',
      borderRadius: '16px',
      fontSize: `${size}px`,
      opacity,
      whiteSpace: 'nowrap',
    };
  };

  const bloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

  return (
    <div style={dashboardStyle}>
      <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Assignment Analysis Dashboard</h2>

      {/* Quality Score Cards */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <p style={titleStyle}>Estimated Time</p>
          <p style={valueStyle}>{analysis.estimatedTimeMinutes}<span style={{ fontSize: '18px', color: '#999' }}>min</span></p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}>Clarity Score</p>
          <p style={valueStyle}>
            {analysis.clarityScore}/10
            <span style={scoreIndicatorStyle(analysis.clarityScore)}>
              {analysis.clarityScore >= 7 ? 'Good' : analysis.clarityScore >= 5 ? 'Fair' : 'Needs Work'}
            </span>
          </p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}>Completeness Score</p>
          <p style={valueStyle}>
            {analysis.completenessScore}/10
            <span style={scoreIndicatorStyle(analysis.completenessScore)}>
              {analysis.completenessScore >= 7 ? 'Good' : analysis.completenessScore >= 5 ? 'Fair' : 'Needs Work'}
            </span>
          </p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}>Alignment Score</p>
          <p style={valueStyle}>
            {analysis.alignmentScore}/10
            <span style={scoreIndicatorStyle(analysis.alignmentScore)}>
              {analysis.alignmentScore >= 7 ? 'Good' : analysis.alignmentScore >= 5 ? 'Fair' : 'Needs Work'}
            </span>
          </p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}>Overall Quality</p>
          <p style={valueStyle}>
            {analysis.overallScore}/10
            <span style={scoreIndicatorStyle(analysis.overallScore)}>
              {analysis.overallScore >= 8 ? 'Excellent' : analysis.overallScore >= 6 ? 'Good' : 'Fair'}
            </span>
          </p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}>Peer Reviews</p>
          <p style={valueStyle}>{analysis.peerReviewComments.length}</p>
          <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>suggestions</p>
        </div>
      </div>

      {/* Bloom's Taxonomy Distribution */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', marginTop: 0 }}>📚 Bloom's Taxonomy Distribution</h3>
        <div style={bloomChartStyle}>
          {bloomLevels.map(level => {
            const count = analysis.bloomDistribution[level] || 0;
            const maxCount = Math.max(...Object.values(analysis.bloomDistribution));
            const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 10;

            return (
              <div key={level} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={bloomBarStyle(Math.max(20, heightPercent), level)}>
                  {count > 0 && count}
                </div>
                <label style={{ fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>{level}</label>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '12px', margin: 0 }}>
          ✓ Good balance: 50-60% Remember/Understand, 30-40% Apply/Analyze, 10% Evaluate/Create
        </p>
      </div>

      {/* Tag Frequency Cloud */}
      <div>
        <h3 style={{ marginBottom: '12px', marginTop: 0 }}>🏷️ Key Topics & Concepts</h3>
        {analysis.tagFrequency.length > 0 ? (
          <div style={tagCloudStyle}>
            {analysis.tagFrequency.slice(0, 12).map((tag, idx) => (
              <div key={idx} style={tagStyle(tag.frequency)} title={`Appears ${tag.frequency} times`}>
                {tag.tag}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', margin: 0 }}>No significant topics extracted</p>
        )}
      </div>
    </div>
  );
}
