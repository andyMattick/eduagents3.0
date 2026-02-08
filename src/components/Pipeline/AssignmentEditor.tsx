import { useState } from 'react';
import { GeneratedAssignment, GeneratedProblem, GeneratedSection } from '../../hooks/useUserFlow';
import { StudentFeedback } from '../../types/pipeline';
import './AssignmentEditor.css';

interface AssignmentEditorProps {
  assignment: GeneratedAssignment;
  studentFeedback: StudentFeedback[];
  onSave: (updatedAssignment: GeneratedAssignment) => void;
  onNext: () => void;
}

export function AssignmentEditor({
  assignment,
  studentFeedback,
  onSave,
  onNext,
}: AssignmentEditorProps) {
  const [sections, setSections] = useState(assignment.sections);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);

  // Get feedback summary for a problem
  const getFeedbackForProblem = (problemId: string): StudentFeedback[] => {
    return studentFeedback.filter(f => 
      f.whatCouldBeImproved?.includes(problemId) || 
      f.struggledWith?.some(s => s.includes(problemId))
    );
  };

  // Count problems with feedback
  const problemsWithFeedback = new Set(
    studentFeedback.flatMap(f => f.struggledWith || [])
  ).size;

  const handleSectionChange = (sectionIdx: number, field: keyof GeneratedSection, value: any) => {
    const newSections = [...sections];
    (newSections[sectionIdx] as any)[field] = value;
    setSections(newSections);
    setHasChanges(true);
  };

  const handleProblemChange = (
    sectionIdx: number,
    problemIdx: number,
    field: keyof GeneratedProblem,
    value: any
  ) => {
    const newSections = [...sections];
    const problem = newSections[sectionIdx].problems[problemIdx];
    (problem as any)[field] = value;
    setSections(newSections);
    setHasChanges(true);
  };

  const handleAddProblem = (sectionIdx: number) => {
    const newSections = [...sections];
    const problemContent = 'New question - edit to add content';
    const newProblem: GeneratedProblem = {
      id: `q${Date.now()}`,
      sectionId: `section-${sectionIdx}`,
      problemText: problemContent,
      bloomLevel: 2,
      questionFormat: 'short-answer',
      problemType: 'mixed',
      complexity: 'medium',
      novelty: 'medium',
      estimatedTime: 5,
      problemLength: problemContent.trim().split(/\s+/).length,
      hasTip: false,
    };
    newSections[sectionIdx].problems.push(newProblem);
    setSections(newSections);
    setHasChanges(true);
  };

  const handleRemoveProblem = (sectionIdx: number, problemIdx: number) => {
    const newSections = [...sections];
    newSections[sectionIdx].problems.splice(problemIdx, 1);
    setSections(newSections);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    const updatedAssignment: GeneratedAssignment = {
      ...assignment,
      sections,
      timestamp: new Date().toISOString(),
    };
    onSave(updatedAssignment);
    setHasChanges(false);
  };

  return (
    <div className="assignment-editor">
      <div className="editor-header">
        <div className="header-content">
          <h2>📝 Edit Assignment Based on Feedback</h2>
          <p>Use student feedback to refine sections and problems</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Total Problems</span>
            <span className="stat-value">{assignment.questionCount}</span>
          </div>
          <div className="stat-item alert">
            <span className="stat-label">Need Review</span>
            <span className="stat-value">{problemsWithFeedback}</span>
          </div>
        </div>
      </div>

      <div className="editor-content">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="section-editor">
            <div 
              className="section-header-editor"
              onClick={() => setExpandedSectionId(
                expandedSectionId === `section-${sectionIdx}` ? null : `section-${sectionIdx}`
              )}
            >
              <div className="collapse-icon">
                {expandedSectionId === `section-${sectionIdx}` ? '▼' : '▶'}
              </div>
              <div className="section-info">
                <input
                  type="text"
                  value={section.sectionName}
                  onChange={(e) =>
                    handleSectionChange(sectionIdx, 'sectionName', e.target.value)
                  }
                  className="section-name-input"
                />
                <input
                  type="text"
                  value={section.instructions}
                  onChange={(e) => handleSectionChange(sectionIdx, 'instructions', e.target.value)}
                  className="section-topic-input"
                  placeholder="Instructions"
                />
              </div>
              <div className="section-meta">
                <span className="problem-count">
                  {section.problems.length} problem{section.problems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {expandedSectionId === `section-${sectionIdx}` && (
              <div className="problems-editor">
                {section.problems.map((problem, problemIdx) => {
                  const feedback = getFeedbackForProblem(problem.id);
                  const hasFeedback = feedback.length > 0;

                  return (
                    <div
                      key={problemIdx}
                      className={`problem-editor ${hasFeedback ? 'has-feedback' : ''}`}
                      onClick={() => setEditingProblemId(
                        editingProblemId === problem.id ? null : problem.id
                      )}
                    >
                      <div className="problem-header">
                        <span className="problem-number">Q{problemIdx + 1}</span>
                        {hasFeedback && <span className="feedback-badge">⚠️ Feedback</span>}
                        <span className="bloom-pill" data-bloom={String(problem.bloomLevel)}>
                          📚 Level {problem.bloomLevel}
                        </span>
                        <span className="complexity-pill">
                          {problem.complexity.charAt(0).toUpperCase() + problem.complexity.slice(1)}
                        </span>
                      </div>

                      {editingProblemId === problem.id && (
                        <div className="problem-editor-panel">
                          <div className="editor-field">
                            <label>Question Text</label>
                            <textarea
                              value={problem.problemText}
                              onChange={(e) =>
                                handleProblemChange(sectionIdx, problemIdx, 'problemText', e.target.value)
                              }
                              className="text-editor"
                            />
                          </div>

                          <div className="editor-row">
                            <div className="editor-field">
                              <label>Bloom Level</label>
                              <select
                                value={problem.bloomLevel}
                                onChange={(e) =>
                                  handleProblemChange(
                                    sectionIdx,
                                    problemIdx,
                                    'bloomLevel',
                                    e.target.value
                                  )
                                }
                              >
                                <option>Remember</option>
                                <option>Understand</option>
                                <option>Apply</option>
                                <option>Analyze</option>
                                <option>Evaluate</option>
                                <option>Create</option>
                              </select>
                            </div>

                            <div className="editor-field">
                              <label>Question Format</label>
                              <select
                                value={problem.questionFormat}
                                onChange={(e) =>
                                  handleProblemChange(
                                    sectionIdx,
                                    problemIdx,
                                    'questionFormat',
                                    e.target.value
                                  )
                                }
                              >
                                <option value="multiple-choice">Multiple Choice</option>
                                <option value="true-false">True/False</option>
                                <option value="short-answer">Short Answer</option>
                                <option value="free-response">Free Response</option>
                                <option value="fill-blank">Fill in the Blank</option>
                              </select>
                            </div>

                            <div className="editor-field">
                              <label>Complexity</label>
                              <select
                                value={problem.complexity}
                                onChange={(e) =>
                                  handleProblemChange(
                                    sectionIdx,
                                    problemIdx,
                                    'complexity',
                                    e.target.value as 'low' | 'medium' | 'high'
                                  )
                                }
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>

                            <div className="editor-field">
                              <label>Novelty</label>
                              <select
                                value={problem.novelty}
                                onChange={(e) =>
                                  handleProblemChange(
                                    sectionIdx,
                                    problemIdx,
                                    'novelty',
                                    e.target.value as 'low' | 'medium' | 'high'
                                  )
                                }
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>

                            <div className="editor-field">
                              <label>Est. Time (min)</label>
                              <input
                                type="number"
                                value={problem.estimatedTime}
                                onChange={(e) =>
                                  handleProblemChange(
                                    sectionIdx,
                                    problemIdx,
                                    'estimatedTime',
                                    parseInt(e.target.value)
                                  )
                                }
                                className="number-input"
                              />
                            </div>
                          </div>

                          <div className="editor-field">
                            <label>Tip/Hint</label>
                            <textarea
                              value={problem.tipText || ''}
                              onChange={(e) =>
                                handleProblemChange(sectionIdx, problemIdx, 'tipText', e.target.value)
                              }
                              placeholder="Optional hint or guidance for students"
                              className="text-editor small"
                            />
                          </div>

                          {hasFeedback && (
                            <div className="feedback-summary">
                              <h4>📊 Student Feedback</h4>
                              {feedback.map((f, i) => (
                                <div key={i} className="feedback-item">
                                  <strong>{f.feedbackType}</strong>: {f.content}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="problem-actions">
                            <button
                              className="button-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProblem(sectionIdx, problemIdx);
                              }}
                            >
                              Delete Problem
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  className="add-problem-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddProblem(sectionIdx);
                  }}
                >
                  + Add Problem
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="editor-footer">
        <div className="action-buttons">
          <button className="button-secondary" onClick={() => window.history.back()}>
            ← Back to Results
          </button>
          <button
            className={`button-primary ${hasChanges ? 'has-changes' : ''}`}
            onClick={() => {
              handleSaveChanges();
              onNext();
            }}
            disabled={!hasChanges}
          >
            {hasChanges ? '💾 Save & Continue' : 'Continue to Rewrite'}
          </button>
        </div>
        {hasChanges && <p className="unsaved-notice">⚠️ You have unsaved changes</p>}
      </div>
    </div>
  );
}
