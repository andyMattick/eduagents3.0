import React from 'react';
import { StudentFeedback } from '../../types/pipeline';
import { Asteroid } from '../../types/simulation';
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
  asteroids?: Asteroid[];
  showProblemMetadata?: boolean;
  onToggleProblemMetadata?: () => void;
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
  completionSimulations,
  asteroids = [],
}: StudentSimulationsProps) {
  const [activeTab, setActiveTab] = React.useState<'feedback' | 'completion' | 'metadata'>('feedback');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 3: Simulated Student Feedback</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Here's how different student personas respond to your assignment:
      </p>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '0',
        flexWrap: 'wrap'
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
        {completionSimulations && (
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
        )}
        {asteroids.length > 0 && (
          <button
            onClick={() => setActiveTab('metadata')}
            style={{
              padding: '12px 16px',
              backgroundColor: activeTab === 'metadata' ? '#0066cc' : 'transparent',
              color: activeTab === 'metadata' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            📋 View Problem Metadata
          </button>
        )}
      </div>

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

      {/* Problem Metadata Tab (Phase 2) */}
      {activeTab === 'metadata' && asteroids.length > 0 && (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', borderLeft: '4px solid #0066cc' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#0066cc' }}>
              <strong>Phase 2: Automated Problem Metadata</strong> — Each problem below was automatically tagged with Bloom's taxonomy level, linguistic complexity, and novelty score.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {asteroids.map((asteroid, index) => (
              <div
                key={asteroid.ProblemId || index}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '15px' }}>
                    Problem {index + 1} 🎯
                  </h4>
                  <p style={{ margin: '8px 0', color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                    {asteroid.ProblemText.substring(0, 150)}
                    {asteroid.ProblemText.length > 150 ? '...' : ''}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {/* Bloom Level */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📚 BLOOM LEVEL</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0066cc' }}>
                      {asteroid.BloomLevel}
                    </div>
                  </div>

                  {/* Linguistic Complexity */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📖 COMPLEXITY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#ff9800' }}>
                        {(asteroid.LinguisticComplexity * 100).toFixed(0)}%
                      </div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#ff9800',
                            width: `${asteroid.LinguisticComplexity * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Novelty Score */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>✨ NOVELTY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#28a745' }}>
                        {(asteroid.NoveltyScore * 100).toFixed(0)}%
                      </div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#28a745',
                            width: `${asteroid.NoveltyScore * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Multi-part */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>🔗 STRUCTURE</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: asteroid.MultiPart ? '#dc3545' : '#28a745' }}>
                      {asteroid.MultiPart ? 'Multi-part' : 'Single part'}
                    </div>
                  </div>

                  {/* Length */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📏 LENGTH</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#666' }}>
                      {asteroid.ProblemLength} words
                    </div>
                  </div>

                  {/* Similarity to Previous */}
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>🔄 SIMILARITY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#9c27b0' }}>
                        {(asteroid.SimilarityToPrevious * 100).toFixed(0)}%
                      </div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#9c27b0',
                            width: `${asteroid.SimilarityToPrevious * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
            <strong>What is this?</strong> This metadata drives Phase 3 (Student Simulation). Each problem's Bloom level and complexity are used to predict how different student personas will perform, predict time-on-task, identify confusion points, and assess engagement.
          </div>
        </div>
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
