import React, { useState, useMemo } from 'react';
import { StudentFeedback } from '../../types/pipeline';
import { GeneratedAssignment, GeneratedSection, GeneratedProblem } from '../../hooks/useUserFlow';
import './QuestionFeedbackAnalysis.css';

interface QuestionFeedbackAnalysisProps {
  assignment: GeneratedAssignment;
  feedback: StudentFeedback[];
  isLoading?: boolean;
}

interface ProblemFeedback {
  problemIndex: number;
  sectionIndex: number;
  problem: GeneratedProblem;
  sectionName: string;
  studentFeedback: Array<{
    studentPersona: string;
    content: string;
    feedbackType: string;
    studentTags?: string[];
    timeTakenSeconds?: number;
    confusionLevel?: number;
    engagementScore?: number;
  }>;
  metrics: {
    avgTimeSeconds: number;
    avgConfusionLevel: number;
    avgEngagementScore: number;
    successRateByType: { [key: string]: number };
    strugglingStudents: string[];
  };
}

export function QuestionFeedbackAnalysis({
  assignment,
  feedback,
  isLoading = false,
}: QuestionFeedbackAnalysisProps) {
  const [groupBy, setGroupBy] = useState<'section' | 'difficulty' | 'student-tag'>('section');
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Organize feedback by problem
  const problemFeedback = useMemo(() => {
    const result: ProblemFeedback[] = [];

    assignment.sections.forEach((section, sectionIdx) => {
      section.problems.forEach((problem, problemIdx) => {
        const globalProblemIdx = assignment.sections
          .slice(0, sectionIdx)
          .reduce((sum, s) => sum + s.problems.length, 0) + problemIdx;

        // Find all feedback related to this problem
        const relatedFeedback = feedback.filter(f => {
          // Simple heuristic: feedback about this problem mentions the problem text
          return (
            f.content.toLowerCase().includes(problem.problemText?.slice(0, 20).toLowerCase() || '') ||
            f.content.toLowerCase().includes('question') ||
            f.content.toLowerCase().includes('problem')
          );
        }).map(f => ({
          studentPersona: f.studentPersona,
          content: f.content,
          feedbackType: f.feedbackType,
          studentTags: f.studentTags || [],
          timeTakenSeconds: (f.timeToCompleteMinutes || 0) * 60,
          confusionLevel: 0.5, // Placeholder
          engagementScore: 0.7, // Placeholder
        }));

        // Calculate metrics
        const avgTime = relatedFeedback.length > 0
          ? relatedFeedback.reduce((sum, f) => sum + (f.timeTakenSeconds || 0), 0) / relatedFeedback.length
          : 0;

        const strugglingStudents = feedback
          .filter(f => f.feedbackType === 'weakness')
          .map(f => f.studentPersona);

        result.push({
          problemIndex: globalProblemIdx,
          sectionIndex: sectionIdx,
          problem,
          sectionName: section.sectionName || `Section ${sectionIdx + 1}`,
          studentFeedback: relatedFeedback,
          metrics: {
            avgTimeSeconds: avgTime,
            avgConfusionLevel: 0.5,
            avgEngagementScore: 0.7,
            successRateByType: {},
            strugglingStudents,
          },
        });
      });
    });

    return result;
  }, [assignment, feedback]);

  // Extract all unique student tags
  const allStudentTags = useMemo(() => {
    const tags = new Set<string>();
    feedback.forEach(f => {
      f.studentTags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [feedback]);

  // Group problems based on selection
  const groupedProblems = useMemo(() => {
    let filtered = problemFeedback;

    // Filter by selected tag
    if (selectedTag) {
      filtered = filtered.filter(pf =>
        pf.studentFeedback.some(sf => sf.studentTags?.includes(selectedTag))
      );
    }

    if (groupBy === 'section') {
      const grouped: { [key: string]: ProblemFeedback[] } = {};
      filtered.forEach(pf => {
        if (!grouped[pf.sectionName]) {
          grouped[pf.sectionName] = [];
        }
        grouped[pf.sectionName].push(pf);
      });
      return grouped;
    } else if (groupBy === 'difficulty') {
      const grouped: { [key: string]: ProblemFeedback[] } = {
        'High Complexity': [],
        'Medium Complexity': [],
        'Low Complexity': [],
      };
      filtered.forEach(pf => {
        const complexity = pf.problem.rawComplexity || 0.5;
        if (complexity > 0.66) {
          grouped['High Complexity'].push(pf);
        } else if (complexity > 0.33) {
          grouped['Medium Complexity'].push(pf);
        } else {
          grouped['Low Complexity'].push(pf);
        }
      });
      return Object.fromEntries(
        Object.entries(grouped).filter(([, probs]) => probs.length > 0)
      );
    } else {
      // Group by student tag
      const grouped: { [key: string]: ProblemFeedback[] } = {};
      filtered.forEach(pf => {
        pf.studentFeedback.forEach(sf => {
          sf.studentTags?.forEach(tag => {
            if (!grouped[tag]) {
              grouped[tag] = [];
            }
            if (!grouped[tag].includes(pf)) {
              grouped[tag].push(pf);
            }
          });
        });
      });
      return grouped;
    }
  }, [problemFeedback, groupBy, selectedTag]);

  const toggleProblemExpand = (problemId: string) => {
    const newSet = new Set(expandedProblems);
    if (newSet.has(problemId)) {
      newSet.delete(problemId);
    } else {
      newSet.add(problemId);
    }
    setExpandedProblems(newSet);
  };

  if (isLoading) {
    return <div className="question-feedback-loading">Loading question feedback...</div>;
  }

  return (
    <div className="question-feedback-analysis">
      <h3>📋 Question-by-Question Feedback Analysis</h3>

      {/* Controls */}
      <div className="feedback-controls">
        <div className="control-group">
          <label>Group By:</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
            <option value="section">📂 Section</option>
            <option value="difficulty">⚙️ Difficulty</option>
            <option value="student-tag">🏷️ Student Tag</option>
          </select>
        </div>

        {allStudentTags.length > 0 && (
          <div className="control-group">
            <label>Filter by Tag:</label>
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
            >
              <option value="">All Tags</option>
              {allStudentTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Student Tags */}
      {allStudentTags.length > 0 && (
        <div className="student-tags-display">
          <strong>Available Student Tags:</strong>
          <div className="tags-list">
            {allStudentTags.map(tag => (
              <button
                key={tag}
                className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Problems */}
      {Object.entries(groupedProblems).map(([groupName, problems]) => (
        <div key={groupName} className="problem-group">
          <h4 className="group-header">{groupName}</h4>

          {problems.map(pf => {
            const problemId = `problem-${pf.sectionIndex}-${pf.problemIndex}`;
            const isExpanded = expandedProblems.has(problemId);

            return (
              <div key={problemId} className="problem-feedback-card">
                <div
                  className="problem-header"
                  onClick={() => toggleProblemExpand(problemId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="header-left">
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span className="problem-num">Q{pf.problemIndex + 1}</span>
                    <span className="problem-preview">{pf.problem.problemText?.substring(0, 60)}...</span>
                  </div>
                  <div className="header-right">
                    <span className="metric-badge">
                      ⏱️ {Math.round(pf.metrics.avgTimeSeconds)}s
                    </span>
                    <span className={`difficulty-indicator difficulty-${
                      (pf.problem.rawComplexity || 0.5) > 0.66 ? 'high' :
                      (pf.problem.rawComplexity || 0.5) > 0.33 ? 'medium' : 'low'
                    }`}>
                      {(pf.problem.rawComplexity || 0.5).toFixed(2)}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="problem-details">
                    {/* Problem Info */}
                    <div className="problem-info-section">
                      <h5>Problem Details</h5>
                      <div className="problem-text">{pf.problem.problemText}</div>
                      <div className="problem-tags">
                        {pf.problem.bloomLevel && <span className="tag bloom">{pf.problem.bloomLevel}</span>}
                        {pf.problem.format && <span className="tag format">{pf.problem.format}</span>}
                        {pf.problem.multiPart && <span className="tag multipart">Multi-part</span>}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="metrics-section">
                      <h5>Student Response Metrics</h5>
                      <div className="metrics-grid">
                        <div className="metric">
                          <span className="metric-label">Avg Time:</span>
                          <span className="metric-value">{Math.round(pf.metrics.avgTimeSeconds)}s</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Struggling:</span>
                          <span className="metric-value">{pf.metrics.strugglingStudents.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Feedback */}
                    {pf.studentFeedback.length > 0 && (
                      <div className="feedback-items-section">
                        <h5>Student Feedback ({pf.studentFeedback.length})</h5>
                        {pf.studentFeedback.map((sf, idx) => (
                          <div key={idx} className={`feedback-item feedback-${sf.feedbackType}`}>
                            <div className="feedback-header">
                              <span className="student-persona">{sf.studentPersona}</span>
                              <span className={`feedback-type ${sf.feedbackType}`}>
                                {sf.feedbackType}
                              </span>
                            </div>
                            <p className="feedback-content">{sf.content}</p>
                            {sf.studentTags && sf.studentTags.length > 0 && (
                              <div className="feedback-tags">
                                {sf.studentTags.map(tag => (
                                  <span key={tag} className="tag student-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Empty State */}
      {Object.values(groupedProblems).flat().length === 0 && (
        <div className="empty-state">
          <p>No problems match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
