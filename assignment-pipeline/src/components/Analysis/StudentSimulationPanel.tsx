import React, { useState } from 'react';
import { StudentSimulation } from '../../agents/analysis/types';

interface StudentSimulationPanelProps {
  simulations: StudentSimulation[];
}

export function StudentSimulationPanel({ simulations }: StudentSimulationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  };

  const personaNameStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  };

  const gradeStyle = (grade: string): React.CSSProperties => {
    const gradeColors: Record<string, string> = {
      'A': '#4caf50',
      'B+': '#8bc34a',
      'B': '#cddc39',
      'C+': '#ff9800',
      'C': '#ff7043',
      'D': '#f4511e',
      'F': '#d32f2f',
    };

    return {
      backgroundColor: gradeColors[grade] || '#999',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: 'bold',
    };
  };

  const metricsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  };

  const metricStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
  };

  const metricLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
  };

  const metricValueStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0',
  };

  const listItemStyle: React.CSSProperties = {
    padding: '6px 0',
    fontSize: '13px',
    color: '#555',
    borderBottom: '1px solid #f0f0f0',
  };

  const confusionStyle: React.CSSProperties = {
    ...listItemStyle,
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: '6px 8px',
    borderRadius: '3px',
    marginBottom: '4px',
  };

  const expandedContentStyle: React.CSSProperties = {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e0e0e0',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    margin: '12px 0 8px 0',
  };

  return (
    <div style={panelStyle}>
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>👥 Student Simulation & Performance Analysis</h2>

      <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
        How different student personas are predicted to perform on this assignment, including time to complete, tasks they'll understand or struggle with, and estimated grades.
      </p>

      {simulations.length === 0 ? (
        <p style={{ color: '#999' }}>No student simulations available</p>
      ) : (
        <div>
          {simulations.map(sim => (
            <div
              key={sim.id}
              style={cardStyle}
              onClick={() => setExpandedId(expandedId === sim.id ? null : sim.id)}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={headerStyle}>
                <p style={personaNameStyle}>{sim.persona}</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={gradeStyle(sim.estimatedGrade)}>{sim.estimatedGrade}</span>
                  <span style={{ fontSize: '18px' }}>{expandedId === sim.id ? '▼' : '▶'}</span>
                </div>
              </div>

              <div style={metricsStyle}>
                <div style={metricStyle}>
                  <p style={metricLabelStyle}>Time to Complete</p>
                  <p style={metricValueStyle}>{sim.timeToCompleteMinutes}min</p>
                </div>
                <div style={metricStyle}>
                  <p style={metricLabelStyle}>Understood</p>
                  <p style={metricValueStyle}>{sim.understood.length}</p>
                </div>
                <div style={metricStyle}>
                  <p style={metricLabelStyle}>Struggled</p>
                  <p style={metricValueStyle}>{sim.struggledWith.length}</p>
                </div>
                <div style={metricStyle}>
                  <p style={metricLabelStyle}>Estimated Score</p>
                  <p style={metricValueStyle}>{sim.estimatedScore}%</p>
                </div>
              </div>

              {expandedId === sim.id && (
                <div style={expandedContentStyle}>
                  {/* Understood Tasks */}
                  {sim.understood.length > 0 && (
                    <div>
                      <h4 style={sectionTitleStyle}>✓ Tasks Understood ({sim.understood.length})</h4>
                      <ul style={listStyle}>
                        {sim.understood.slice(0, 5).map((task, idx) => (
                          <li key={idx} style={listItemStyle}>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Struggled Tasks */}
                  {sim.struggledWith.length > 0 && (
                    <div>
                      <h4 style={sectionTitleStyle}>⚠ Tasks Struggled With ({sim.struggledWith.length})</h4>
                      <ul style={listStyle}>
                        {sim.struggledWith.slice(0, 5).map((task, idx) => (
                          <li key={idx} style={listItemStyle}>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confusion Points */}
                  {sim.confusionPoints.length > 0 && (
                    <div>
                      <h4 style={sectionTitleStyle}>🔴 Confusion Points</h4>
                      <ul style={listStyle}>
                        {sim.confusionPoints.slice(0, 3).map((point, idx) => (
                          <li key={idx} style={confusionStyle}>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Completion Status */}
                  <div style={{ marginTop: '12px' }}>
                    <h4 style={sectionTitleStyle}>📍 Completion Status</h4>
                    <p style={{ ...listItemStyle, borderBottom: 'none' }}>
                      <strong>Expected completion:</strong> {sim.completedAt || 'Incomplete'}
                    </p>
                    {sim.dropoffReason && (
                      <p style={{ ...listItemStyle, borderBottom: 'none', color: '#d32f2f' }}>
                        <strong>Potential drop-off:</strong> {sim.dropoffReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {simulations.length > 0 && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <h4 style={{ marginTop: 0 }}>Summary Insights</h4>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px', color: '#555' }}>
            <li>Average time to complete: {Math.ceil(simulations.reduce((sum, s) => sum + s.timeToCompleteMinutes, 0) / simulations.length)} minutes</li>
            <li>Average estimated score: {Math.ceil(simulations.reduce((sum, s) => sum + s.estimatedScore, 0) / simulations.length)}%</li>
            <li>Most commonly struggled with: {simulations.length > 0 ? 'Higher-order thinking tasks' : 'N/A'}</li>
            <li>
              Dropout risk: {simulations.filter(s => s.dropoffReason).length > 0 ? 'High for struggling learners' : 'Low'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
