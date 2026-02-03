import React from 'react';
import { StudentFeedback } from '../../types/pipeline';
import AccessibilityFeedback from './AccessibilityFeedback';
import { TeacherNotesPanel } from './TeacherNotesPanel';
import CompletionPerformance from '../Analysis/CompletionPerformance';
import ClassCompletionSummary from '../Analysis/ClassCompletionSummary';

interface StudentSimulationsProps {
  feedback: StudentFeedback[];
  isLoading?: boolean;
  onNext: () => void;
  completionSimulations?: {
    studentSimulations: any[];
    classSummary: any;
  };
}

const feedbackTypeColors: Record<string, string> = {
  strength: '#28a745',
  weakness: '#dc3545',
  suggestion: '#ffc107',
};

export function StudentSimulations({
  feedback,
  isLoading = false,
  onNext,
  completionSimulations
}: StudentSimulationsProps) {
  const [activeTab, setActiveTab] = React.useState<'feedback' | 'completion'>('feedback');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 3: Simulated Student Feedback</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Here's how different student personas respond to your assignment:
      </p>

      {/* Tab Navigation */}
      {completionSimulations && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '0'
        }}>
          <button
            onClick={() => setActiveTab('feedback')}
            style={{
              padding: '12px 16px',
              backgroundColor: activeTab === 'feedback' ? '#28a745' : 'transparent',
              color: activeTab === 'feedback' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            Student Feedback
          </button>
          <button
            onClick={() => setActiveTab('completion')}
            style={{
              padding: '12px 16px',
              backgroundColor: activeTab === 'completion' ? '#28a745' : 'transparent',
              color: activeTab === 'completion' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            Completion & Performance
          </button>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <>
          {feedback.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              No feedback generated.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
              {feedback.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: `3px solid ${feedbackTypeColors[item.feedbackType] || '#ccc'}`,
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#333' }}>
                      {item.studentPersona.startsWith('📖') || item.studentPersona.startsWith('⚡') || item.studentPersona.startsWith('👁️') || item.studentPersona.startsWith('👂') || item.studentPersona.startsWith('🔢')
                        ? item.studentPersona
                        : `👤 ${item.studentPersona}`}
                    </h4>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: feedbackTypeColors[item.feedbackType] || '#ccc',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.feedbackType}
                    </span>
                  </div>
                  <p style={{ margin: '12px 0', color: '#555', lineHeight: '1.5' }}>
                    {item.content}
                  </p>
                  {item.whatWorked && (
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f0fdf4', borderLeft: '3px solid #28a745', borderRadius: '4px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#28a745' }}>✓ What Worked:</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{item.whatWorked}</p>
                    </div>
                  )}
                  {item.whatCouldBeImproved && (
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fef2f2', borderLeft: '3px solid #dc3545', borderRadius: '4px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#dc3545' }}>→ Could Be Improved:</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{item.whatCouldBeImproved}</p>
                    </div>
                  )}
                  {item.engagementScore !== undefined && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Engagement: {(item.engagementScore * 100).toFixed(0)}%
                      </div>
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginTop: '4px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#007bff',
                            width: `${(item.engagementScore || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {item.relevantTags && item.relevantTags.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Related tags:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {item.relevantTags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: '#e7f3ff',
                              color: '#0066cc',
                              borderRadius: '12px',
                              fontSize: '11px',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Completion Tab */}
      {activeTab === 'completion' && completionSimulations && (
        <>
          {completionSimulations.studentSimulations.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              No completion data available.
            </p>
          ) : (
            <>
              <CompletionPerformance
                studentSimulations={completionSimulations.studentSimulations}
                showDetailed={true}
              />
              <ClassCompletionSummary
                classSummary={completionSimulations.classSummary}
                totalStudents={completionSimulations.studentSimulations.length}
              />
            </>
          )}
        </>
      )}

      <AccessibilityFeedback feedback={feedback} />

      {activeTab === 'feedback' && (
        <TeacherNotesPanel studentFeedback={feedback} isLoading={isLoading} />
      )}

      <div style={{ marginTop: '24px' }}>
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
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Loading...' : 'Continue to Rewrite'}
        </button>
      </div>
    </div>
  );
}
