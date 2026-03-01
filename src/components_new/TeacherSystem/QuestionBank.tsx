import React, { useState, useEffect } from 'react';
import {
  searchProblemBank,
  saveToProblemBank,
  getProblemBankEntry,
} from '../../services/teacherSystemService';
import { UniversalProblem } from '../../types/universalPayloads';
import './QuestionBank.css';

interface ProblemBankEntry {
  id: string;
  teacher_id: string;
  problem: UniversalProblem;
  is_favorite: boolean;
  usage_count: number;
  used_in_assignment_ids: string[];
  source_assignment_id?: string;
  source_document_id?: string;
  immutable_lock: {
    isLocked: boolean;
    lockedAt?: string;
    lockedReason?: string;
    lockedLayers: {
      cognitive: boolean;
      classification: boolean;
      structure: boolean;
    };
  };
  performance_success_rate: number; // 0-100%
  performance_avg_time_seconds: number;
  performance_attempt_count: number;
  performance_feedback_count: number;
  performance_last_attempted?: string;
  created_at: string;
  updated_at: string;
}

interface QuestionBankProps {
  teacherId: string;
  onSelectQuestion?: (question: ProblemBankEntry) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
const COMMON_SUBJECTS = ['Math', 'Science', 'English', 'History', 'Social Studies', 'Arts', 'PE'];
const COMMON_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

interface QuestionBankFilter {
  bloomLevels?: string[];
  subjects?: string[];
  grades?: string[];
  isFavorite?: boolean;
  searchText?: string;
  mathComplexityRange?: [number, number]; // 1-5
  linguisticComplexityRange?: [number, number]; // 0-100
  estimatedTimeRange?: [number, number]; // minutes
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  teacherId,
  onSelectQuestion,
  onClose,
  isModal = false,
}) => {
  const [questions, setQuestions] = useState<ProblemBankEntry[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<ProblemBankEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ProblemBankEntry | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [collapsedFilterSections, setCollapsedFilterSections] = useState<Set<string>>(new Set());

  // Filter state
  const [filters, setFilters] = useState<QuestionBankFilter>({
    bloomLevels: [],
    subjects: [],
    grades: [],
    isFavorite: false,
    searchText: '',
    mathComplexityRange: [1, 5],
    linguisticComplexityRange: [0, 100],
    estimatedTimeRange: [0, 30],
  });

  useEffect(() => {
    loadQuestions();
  }, [teacherId]);

  useEffect(() => {
    applyFilters();
  }, [questions, filters]);

  async function loadQuestions() {
    try {
      setIsLoading(true);
      const data = await searchProblemBank(teacherId);
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let result = [...questions];

    if (filters.isFavorite) {
      result = result.filter(q => q.is_favorite);
    }

    if (filters.bloomLevels?.length) {
      result = result.filter(q =>
        filters.bloomLevels?.includes(q.problem.cognitive.bloomsLevel)
      );
    }

    if (filters.subjects?.length) {
      result = result.filter(q =>
        filters.subjects?.includes(q.problem.subject)
      );
    }

    if (filters.grades?.length) {
      result = result.filter(q =>
        filters.grades?.includes(String(q.problem.cognitive.estimatedGradeLevel))
      );
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(q =>
        q.problem.content.toLowerCase().includes(searchLower) ||
        (q.problem.classification?.keywords || []).some(k =>
          k.toLowerCase().includes(searchLower)
        )
      );
    }

    // Math Complexity filter
    if (filters.mathComplexityRange) {
      const [min, max] = filters.mathComplexityRange;
      result = result.filter(q => {
        const complexity = q.problem.cognitive.complexityLevel || 3;
        return complexity >= min && complexity <= max;
      });
    }

    // Linguistic Complexity filter (convert 0-1 range to 0-100 for display)
    if (filters.linguisticComplexityRange) {
      const [min, max] = filters.linguisticComplexityRange;
      result = result.filter(q => {
        const complexity = ((q.problem.cognitive.linguisticComplexity || 0.5) * 100);
        return complexity >= min && complexity <= max;
      });
    }

    // Estimated Time filter
    if (filters.estimatedTimeRange) {
      const [min, max] = filters.estimatedTimeRange;
      result = result.filter(q => {
        const time = q.problem.cognitive.timeBreakdown?.estimatedTimeMinutes || 0;
        return time >= min && time <= max;
      });
    }

    setFilteredQuestions(result);
  }

  async function toggleFavorite(entry: ProblemBankEntry) {
    try {
      // Save updated entry with toggled favorite status
      await saveToProblemBank(
        teacherId,
        entry.problem,
        !entry.is_favorite,
        entry.source_assignment_id
      );
      loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite status');
    }
  }

  async function deleteQuestion(entry: ProblemBankEntry) {
    const preview = entry.problem.content.substring(0, 50);
    if (window.confirm(`Delete question: "${preview}..."?`)) {
      try {
        // In a real implementation, this would call a delete function
        // For now, we filter from state and show a message
        setFilteredQuestions(prev => prev.filter(q => q.id !== entry.id));
        if (selectedQuestion?.id === entry.id) {
          setSelectedQuestion(null);
        }
        setError(null);
        // TODO: Implement deleteFromProblemBank in service
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete question');
      }
    }
  }

  function handleSelectBloomLevel(bloomLevel: string) {
    setFilters(prev => ({
      ...prev,
      bloomLevels: prev.bloomLevels?.includes(bloomLevel)
        ? prev.bloomLevels.filter(b => b !== bloomLevel)
        : [...(prev.bloomLevels || []), bloomLevel],
    }));
  }

  function handleSelectSubject(subject: string) {
    setFilters(prev => ({
      ...prev,
      subjects: prev.subjects?.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...(prev.subjects || []), subject],
    }));
  }

  function handleSelectGrade(grade: string) {
    setFilters(prev => ({
      ...prev,
      grades: prev.grades?.includes(grade)
        ? prev.grades.filter(g => g !== grade)
        : [...(prev.grades || []), grade],
    }));
  }

  function groupQuestionsBySection(questions: ProblemBankEntry[]) {
    const grouped = new Map<string, ProblemBankEntry[]>();
    questions.forEach(q => {
      const sectionId = q.problem.sectionId || 'Ungrouped';
      if (!grouped.has(sectionId)) {
        grouped.set(sectionId, []);
      }
      grouped.get(sectionId)!.push(q);
    });
    return grouped;
  }

  function toggleSectionExpanded(sectionId: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function toggleFilterSectionCollapsed(sectionId: string) {
    setCollapsedFilterSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  if (isLoading) {
    return <div className="question-bank loading">Loading questions...</div>;
  }

  return (
    <div className={`question-bank ${isModal ? 'modal' : ''}`}>
      <div className="qb-header">
        <h2>Question Bank</h2>
        {isModal && onClose && (
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="qb-legend">
        <h4>📊 Badge Reference</h4>
        <div className="legend-grid">
          <div className="legend-item">
            <span className="bloom-badge">Skill</span>
            <span className="legend-label">Cognitive skill level (recall → synthesis)</span>
          </div>
          <div className="legend-item">
            <span className="subject-badge">Subject</span>
            <span className="legend-label">Topic area</span>
          </div>
          <div className="legend-item">
            <span className="grade-badge">Grades</span>
            <span className="legend-label">Grade level range</span>
          </div>
          <div className="legend-item">
            <span className="math-complexity-badge">M: 3/5</span>
            <span className="legend-label">Mathematical complexity</span>
          </div>
          <div className="legend-item">
            <span className="complexity-badge">L: 65%</span>
            <span className="legend-label">Linguistic complexity</span>
          </div>
          <div className="legend-item">
            <span className="time-badge">⏱ 2 min</span>
            <span className="legend-label">Estimated time</span>
          </div>
          <div className="legend-item">
            <span>★</span>
            <span className="legend-label">Add to favorites</span>
          </div>
          <div className="legend-item">
            <span>✕</span>
            <span className="legend-label">Delete question</span>
          </div>
        </div>
      </div>

      <div className="qb-content">
        {/* Filters Sidebar */}
        <aside className="qb-filters">
          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('search')}
            >
              {collapsedFilterSections.has('search') ? '▶' : '▼'} Search
            </button>
            {!collapsedFilterSections.has('search') && (
              <div className="filter-section-content">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={filters.searchText || ''}
                  onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  className="search-input"
                />
              </div>
            )}
          </div>

          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('bloom')}
            >
              {collapsedFilterSections.has('bloom') ? '▶' : '▼'} Skill Level
            </button>
            {!collapsedFilterSections.has('bloom') && (
              <div className="filter-section-content">
                <div className="filter-options">
                  {BLOOM_LEVELS.map(level => (
                    <label key={level} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.bloomLevels?.includes(level) || false}
                        onChange={() => handleSelectBloomLevel(level)}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('subject')}
            >
              {collapsedFilterSections.has('subject') ? '▶' : '▼'} Subject
            </button>
            {!collapsedFilterSections.has('subject') && (
              <div className="filter-section-content">
                <div className="filter-options">
                  {COMMON_SUBJECTS.map(subject => (
                    <label key={subject} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.subjects?.includes(subject) || false}
                        onChange={() => handleSelectSubject(subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('grade')}
            >
              {collapsedFilterSections.has('grade') ? '▶' : '▼'} Grade Level
            </button>
            {!collapsedFilterSections.has('grade') && (
              <div className="filter-section-content">
                <div className="filter-options grade-options">
                  {COMMON_GRADES.map(grade => (
                    <label key={grade} className="checkbox-label checkbox-compact">
                      <input
                        type="checkbox"
                        checked={filters.grades?.includes(grade) || false}
                        onChange={() => handleSelectGrade(grade)}
                      />
                      <span>{grade}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('complexity')}
            >
              {collapsedFilterSections.has('complexity') ? '▶' : '▼'} Complexity
            </button>
            {!collapsedFilterSections.has('complexity') && (
              <div className="filter-section-content">
                <label className="filter-label">
                  <span>Math: {filters.mathComplexityRange?.[0]}-{filters.mathComplexityRange?.[1]}</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={filters.mathComplexityRange?.[0] || 1}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      mathComplexityRange: [parseInt(e.target.value), prev.mathComplexityRange?.[1] || 5]
                    }))}
                    className="range-slider"
                  />
                </label>
                <label className="filter-label">
                  <span>Linguistic: {filters.linguisticComplexityRange?.[0]}-{filters.linguisticComplexityRange?.[1]}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filters.linguisticComplexityRange?.[0] || 0}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      linguisticComplexityRange: [parseInt(e.target.value), prev.linguisticComplexityRange?.[1] || 100]
                    }))}
                    className="range-slider"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="filter-section">
            <button
              className="filter-section-toggle"
              onClick={() => toggleFilterSectionCollapsed('time')}
            >
              {collapsedFilterSections.has('time') ? '▶' : '▼'} Estimated Time
            </button>
            {!collapsedFilterSections.has('time') && (
              <div className="filter-section-content">
                <label className="filter-label">
                  <span>0-{filters.estimatedTimeRange?.[1]} minutes</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={filters.estimatedTimeRange?.[1] || 30}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      estimatedTimeRange: [0, parseInt(e.target.value)]
                    }))}
                    className="range-slider"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="filter-section">
            <label className="checkbox-label checkbox-large">
              <input
                type="checkbox"
                checked={filters.isFavorite || false}
                onChange={e =>
                  setFilters(prev => ({ ...prev, isFavorite: e.target.checked }))
                }
              />
              <span>★ Favorites Only</span>
            </label>
          </div>

          <button
            onClick={() =>
              setFilters({
                bloomLevels: [],
                subjects: [],
                grades: [],
                isFavorite: false,
                searchText: '',
                mathComplexityRange: [1, 5],
                linguisticComplexityRange: [0, 100],
                estimatedTimeRange: [0, 30],
              })
            }
            className="btn-reset-filters"
          >
            Reset Filters
          </button>
        </aside>

        {/* Questions List */}
        <main className="qb-main">
          <div className="qb-list-header">
            <p className="result-count">
              {filteredQuestions.length} of {questions.length} questions
            </p>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No questions found</h3>
              <p>Try adjusting your filters or create new questions to get started.</p>
            </div>
          ) : (
            <div className="qb-list">
              {Array.from(groupQuestionsBySection(filteredQuestions).entries()).map(
                ([sectionId, sectionQuestions]) => {
                  const isExpanded = expandedSections.has(sectionId);
                  const bloomLevelsInSection = [...new Set(sectionQuestions.map(q => q.problem.cognitive.bloomLevel))];

                  return (
                    <div key={sectionId} className="section-group">
                      <button
                        className="section-header"
                        onClick={() => toggleSectionExpanded(sectionId)}
                      >
                        <span className="section-toggle">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="section-title">{sectionId}</span>
                        <span className="section-meta">
                          {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''}
                        </span>
                        <div className="section-blooms">
                          {bloomLevelsInSection.map(bloom => (
                            <span key={bloom} className="bloom-mini">{bloom}</span>
                          ))}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="section-content">
                          {sectionQuestions.map(entry => (
                            <div
                              key={entry.id}
                              className={`question-item ${selectedQuestion?.id === entry.id ? 'selected' : ''}`}
                              onClick={() => setSelectedQuestion(entry)}
                            >
                              <div className="question-item-header">
                                <div className="question-title">
                                  <span className="bloom-badge" title="Reasoning Level">
                                    {entry.problem.cognitive.bloomLevel}
                                  </span>
                                  <span className="subject-badge" title="Subject">
                                    {entry.problem.subject}
                                  </span>
                                  <span className="grade-badge" title="Grade Level">
                                    Grade {entry.problem.cognitive.estimatedGradeLevel}
                                  </span>
                                  {entry.problem.cognitive.complexityLevel && (
                                    <span className="math-complexity-badge" title="Mathematical Complexity (1-5)">
                                      M: {entry.problem.cognitive.complexityLevel}/5
                                    </span>
                                  )}
                                  {entry.problem.cognitive.linguisticComplexity !== undefined && (
                                    <span className="complexity-badge" title="Linguistic Complexity (0-100%)">
                                      L: {(entry.problem.cognitive.linguisticComplexity * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  {entry.problem.cognitive.timeBreakdown?.estimatedTimeMinutes && (
                                    <span className="time-badge" title="Estimated Time">
                                      ⏱ {entry.problem.cognitive.timeBreakdown.estimatedTimeMinutes} min
                                    </span>
                                  )}
                                </div>
                                <div className="question-actions">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      toggleFavorite(entry);
                                    }}
                                    className={`favorite-btn ${entry.is_favorite ? 'active' : ''}`}
                                    title={entry.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    ★
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      deleteQuestion(entry);
                                    }}
                                    className="delete-btn"
                                    title="Delete question"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div className="question-preview">
                                {entry.problem.content.substring(0, 150)}
                                {entry.problem.content.length > 150 ? '...' : ''}
                              </div>

                              <div className="question-tags">
                                {(entry.problem.classification?.keywords || []).map(tag => (
                                  <span key={tag} className="tag">
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              <div className="question-meta">
                                <small>Used {entry.usage_count} times</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </main>

        {/* Question Preview */}
        {selectedQuestion && (
          <aside className="qb-preview">
            <div className="preview-header">
              <h3>Question Preview</h3>
              <button onClick={() => setSelectedQuestion(null)} className="close-preview">
                ✕
              </button>
            </div>

            <div className="preview-content">
              <div className="preview-metadata">
                <div className="meta-row">
                  <strong>Bloom Level:</strong>
                  <span>{selectedQuestion.problem.cognitive.bloomLevel}</span>
                </div>
                <div className="meta-row">
                  <strong>Subject:</strong>
                  <span>{selectedQuestion.problem.subject}</span>
                </div>
                <div className="meta-row">
                  <strong>Grade:</strong>
                  <span>{selectedQuestion.problem.cognitive.estimatedGradeLevel}</span>
                </div>
                <div className="meta-row">
                  <strong>Type:</strong>
                  <span>{selectedQuestion.problem.structure?.type || 'unknown'}</span>
                </div>
                {selectedQuestion.problem.cognitive.timeBreakdown?.estimatedTimeMinutes && (
                  <div className="meta-row">
                    <strong>Est. Time:</strong>
                    <span>{selectedQuestion.problem.cognitive.timeBreakdown.estimatedTimeMinutes} min</span>
                  </div>
                )}
                {selectedQuestion.problem.cognitive.linguisticComplexity !== undefined && (
                  <div className="meta-row">
                    <strong>Linguistic Complexity:</strong>
                    <span>{(selectedQuestion.problem.cognitive.linguisticComplexity * 100).toFixed(0)}%</span>
                  </div>
                )}
                {selectedQuestion.problem.cognitive.noveltyScore !== undefined && (
                  <div className="meta-row">
                    <strong>Novelty:</strong>
                    <span>{(selectedQuestion.problem.cognitive.noveltyScore * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="meta-row">
                  <strong>Times Used:</strong>
                  <span>{selectedQuestion.usage_count}</span>
                </div>
                {selectedQuestion.updated_at && (
                  <div className="meta-row">
                    <strong>Last Used:</strong>
                    <span>{new Date(selectedQuestion.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="meta-row">
                  <strong>Created:</strong>
                  <span>{new Date(selectedQuestion.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="preview-metadata">
                <h4>Performance History</h4>
                {selectedQuestion.performance_attempt_count > 0 ? (
                  <div className="performance-stats">
                    <div className="perf-stat">
                      <span className="stat-label">Success Rate</span>
                      <span className="stat-value">{selectedQuestion.performance_success_rate}%</span>
                    </div>
                    <div className="perf-stat">
                      <span className="stat-label">Avg Time</span>
                      <span className="stat-value">{Math.round(selectedQuestion.performance_avg_time_seconds / 60)}m</span>
                    </div>
                    <div className="perf-stat">
                      <span className="stat-label">Attempts</span>
                      <span className="stat-value">{selectedQuestion.performance_attempt_count}</span>
                    </div>
                    <div className="perf-stat">
                      <span className="stat-label">Feedback</span>
                      <span className="stat-value">{selectedQuestion.performance_feedback_count}</span>
                    </div>
                  </div>
                ) : (
                  <p className="no-performance">No performance data yet</p>
                )}
              </div>

              <div className="preview-question">
                <h4>Question:</h4>
                <p>{selectedQuestion.problem.content}</p>
              </div>

              {selectedQuestion.problem.structure?.options && (
                <div className="preview-options">
                  <h4>Options:</h4>
                  <ul>
                    {selectedQuestion.problem.structure.options.map((opt, idx) => (
                      <li
                        key={idx}
                        className={opt === selectedQuestion.problem.structure?.correctAnswer ? 'correct' : ''}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedQuestion.problem.structure?.notes && (
                <div className="preview-notes">
                  <h4>Notes:</h4>
                  <p>{selectedQuestion.problem.structure.notes}</p>
                </div>
              )}

              <div className="preview-actions">
                {onSelectQuestion && (
                  <button
                    onClick={() => onSelectQuestion(selectedQuestion)}
                    className="btn-primary"
                  >
                    Use This Question
                  </button>
                )}
                <button
                  onClick={() => toggleFavorite(selectedQuestion)}
                  className={`btn-secondary ${selectedQuestion.is_favorite ? 'active' : ''}`}
                >
                  {selectedQuestion.is_favorite ? '★ Remove from Favorites' : '☆ Add to Favorites'}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;