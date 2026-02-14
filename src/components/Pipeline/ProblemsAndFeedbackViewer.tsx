import React from 'react';
import { Asteroid } from '../../types/simulation';
import { StudentFeedback } from '../../types/pipeline';
import './ProblemsAndFeedbackViewer.css';

interface ProblemsAndFeedbackViewerProps {
  asteroids: Asteroid[];
  studentFeedback: StudentFeedback[];
  isLoading?: boolean;
  onNext: () => void;
}

/**
 * Problems and Feedback Viewer
 * Displays each problem with all grouped student feedback below it
 * Full-width format for clear readability
 */
export function ProblemsAndFeedbackViewer({
  asteroids,
  studentFeedback,
  isLoading = false,
  onNext,
}: ProblemsAndFeedbackViewerProps) {
  React.useEffect(() => {
    console.log('🎯 ProblemsAndFeedbackViewer rendered with:');
    console.log('   - Asteroids:', asteroids.length, asteroids);
    console.log('   - StudentFeedback:', studentFeedback.length, studentFeedback);
  }, [asteroids, studentFeedback]);

  if (asteroids.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3 style={{ color: '#856404', marginTop: 0 }}>⚠️ No Problems Extracted</h3>
        <p style={{ color: '#856404' }}>We couldn't extract any problems from your assignment. Please review and try again.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '24px' }}>📋 Problems & Student Feedback</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Review each problem and see how students will respond
          </p>
        </div>

        {/* Problems List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {asteroids.map((asteroid, idx) => {
            // Collect all feedback for this problem and aggregate by theme
            const allFeedbackForProblem = studentFeedback.filter(() => true);
            
            // Count unique feedback themes instead of listing each student
            const strengthThemes = new Map<string, number>();
            const weaknessThemes = new Map<string, number>();
            const improvementThemes = new Map<string, number>();
            
            allFeedbackForProblem.forEach(f => {
              if (f.feedbackType === 'strength') {
                const content = f.content?.toLowerCase() || '';
                strengthThemes.set(content || 'general approval', (strengthThemes.get(content || 'general approval') || 0) + 1);
              }
              if (f.feedbackType === 'weakness') {
                const content = f.content?.toLowerCase() || '';
                weaknessThemes.set(content || 'general difficulty', (weaknessThemes.get(content || 'general difficulty') || 0) + 1);
              }
              if (f.feedbackType === 'suggestion') {
                const content = (f.whatCouldBeImproved || f.content || '').toLowerCase();
                improvementThemes.set(content || 'could be improved', (improvementThemes.get(content || 'could be improved') || 0) + 1);
              }
            });
            
            const atRiskStudents = allFeedbackForProblem
              .filter(f => f.atRiskProfile)
              .map(f => f.studentPersona);
            const uniqueAtRisk = [...new Set(atRiskStudents)];
            const totalStudents = new Set(allFeedbackForProblem.map(f => f.studentPersona)).size || 1;

            return (
              <div key={idx} style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {/* Problem Header */}
                <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderBottom: '2px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>
                      Question {idx + 1}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#e3f2fd', color: '#0066cc', fontSize: '12px', fontWeight: '600' }}>
                        {asteroid.BloomLevel}
                      </span>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#fff3e0', color: '#e65100', fontSize: '12px', fontWeight: '600' }}>
                        Complexity: {(asteroid.LinguisticComplexity * 100).toFixed(0)}%
                      </span>
                      {uniqueAtRisk.length > 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#ffebee', color: '#dc3545', fontSize: '12px', fontWeight: '600' }}>
                          ⚠️ {uniqueAtRisk.length}/{totalStudents} at-risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Problem Text */}
                <div style={{ padding: '16px', backgroundColor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
                  <p style={{ margin: 0, color: '#555', lineHeight: '1.6', fontSize: '14px', borderLeft: '4px solid #0066cc', paddingLeft: '12px' }}>
                    {asteroid.ProblemText}
                  </p>
                </div>

                {/* Feedback Section */}
                <div style={{ padding: '16px' }}>
                  {/* Strengths - Aggregated */}
                  {strengthThemes.size > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f1f8f5', borderLeft: '4px solid #28a745', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#28a745', fontSize: '14px', fontWeight: '600' }}>✅ What Works Well ({strengthThemes.size} themes)</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
                        {Array.from(strengthThemes.entries()).map(([theme, count], i) => (
                          <li key={i} style={{ color: '#555', fontSize: '13px', marginBottom: '4px' }}>
                            {theme} <span style={{ color: '#999', fontSize: '12px' }}>({count}/{totalStudents} students)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses - Aggregated */}
                  {weaknessThemes.size > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fdf5f5', borderLeft: '4px solid #dc3545', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#dc3545', fontSize: '14px', fontWeight: '600' }}>❌ Challenges ({weaknessThemes.size} themes)</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
                        {Array.from(weaknessThemes.entries()).map(([theme, count], i) => (
                          <li key={i} style={{ color: '#555', fontSize: '13px', marginBottom: '4px' }}>
                            {theme} <span style={{ color: '#999', fontSize: '12px' }}>({count}/{totalStudents} students)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions - Aggregated */}
                  {improvementThemes.size > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fffef5', borderLeft: '4px solid #ffc107', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '14px', fontWeight: '600' }}>💡 Suggestions ({improvementThemes.size} themes)</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
                        {Array.from(improvementThemes.entries()).map(([theme, count], i) => (
                          <li key={i} style={{ color: '#555', fontSize: '13px', marginBottom: '4px' }}>
                            {theme} <span style={{ color: '#999', fontSize: '12px' }}>({count}/{totalStudents} students)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* At-Risk Students Summary */}
                  {uniqueAtRisk.length > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff5f5', borderLeft: '4px solid #ff6b6b', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#dc3545', fontSize: '14px', fontWeight: '600' }}>⚠️ At-Risk Summary</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#555' }}>
                        <strong>{uniqueAtRisk.length} of {totalStudents} students</strong> ({Math.round(uniqueAtRisk.length / totalStudents * 100)}%) may struggle with this problem.
                      </p>
                      <p style={{ margin: '0', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                        This includes students like: {uniqueAtRisk.slice(0, 3).join(', ')}{uniqueAtRisk.length > 3 ? ` and ${uniqueAtRisk.length - 3} others` : ''}
                      </p>
                    </div>
                  )}

                  {/* No Feedback */}
                  {strengthThemes.size === 0 && weaknessThemes.size === 0 && improvementThemes.size === 0 && uniqueAtRisk.length === 0 && (
                    <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                      No specific feedback yet. Run simulation to generate feedback.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '30px', padding: '16px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {asteroids.length} problems reviewed
          </div>
          <button
            onClick={onNext}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              backgroundColor: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {isLoading ? 'Loading...' : 'Continue to Rewrite'}
          </button>
        </div>
      </div>
    </div>
  );
}
