import React, { useState, useEffect } from 'react';
import {
  searchQuestionBank,
  updateQuestionBankEntry,
  addToQuestionBank,
} from '../../services/teacherSystemService';
import {
  QuestionBankEntry,
  QuestionBankFilter,
  AssignmentProblem,
} from '../../types/teacherSystem';
import './QuestionBank.css';

interface QuestionBankProps {
  teacherId: string;
  onSelectQuestion?: (question: QuestionBankEntry) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
const COMMON_SUBJECTS = ['Math', 'Science', 'English', 'History', 'Social Studies', 'Arts', 'PE'];
const COMMON_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export const QuestionBank: React.FC<QuestionBankProps> = ({
  teacherId,
  onSelectQuestion,
  onClose,
  isModal = false,
}) => {
  const [questions, setQuestions] = useState<QuestionBankEntry[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionBankEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankEntry | null>(null);

  // Filter state
  const [filters, setFilters] = useState<QuestionBankFilter>({
    bloomLevels: [],
    subjects: [],
    grades: [],
    isFavorite: false,
    searchText: '',
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
      const data = await searchQuestionBank(teacherId);
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
      result = result.filter(q => q.isFavorite);
    }

    if (filters.bloomLevels?.length) {
      result = result.filter(q => filters.bloomLevels?.includes(q.bloomLevel));
    }

    if (filters.subjects?.length) {
      result = result.filter(q => filters.subjects?.includes(q.subject));
    }

    if (filters.grades?.length) {
      result = result.filter(q => filters.grades?.includes(q.grade));
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(
        q =>
          q.problem.text.toLowerCase().includes(searchLower) ||
          q.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    setFilteredQuestions(result);
  }

  async function toggleFavorite(question: QuestionBankEntry) {
    try {
      await updateQuestionBankEntry(question.id, teacherId, {
        isFavorite: !question.isFavorite,
      });
      loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite status');
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

      <div className="qb-content">
        {/* Filters Sidebar */}
        <aside className="qb-filters">
          <div className="filter-section">
            <h3>Search</h3>
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.searchText || ''}
              onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <h3>Bloom Level</h3>
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

          <div className="filter-section">
            <h3>Subject</h3>
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

          <div className="filter-section">
            <h3>Grade Level</h3>
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
              {filteredQuestions.map(question => (
                <div
                  key={question.id}
                  className={`question-item ${selectedQuestion?.id === question.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="question-item-header">
                    <div className="question-title">
                      <span className="bloom-badge">{question.bloomLevel}</span>
                      <span className="subject-badge">{question.subject}</span>
                      <span className="grade-badge">Grade {question.grade}</span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFavorite(question);
                      }}
                      className={`favorite-btn ${question.isFavorite ? 'active' : ''}`}
                      title={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ★
                    </button>
                  </div>

                  <div className="question-preview">
                    {question.problem.text.substring(0, 150)}
                    {question.problem.text.length > 150 ? '...' : ''}
                  </div>

                  <div className="question-tags">
                    {question.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="question-meta">
                    <small>Used {question.usageCount} times</small>
                  </div>
                </div>
              ))}
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
                  <span>{selectedQuestion.bloomLevel}</span>
                </div>
                <div className="meta-row">
                  <strong>Subject:</strong>
                  <span>{selectedQuestion.subject}</span>
                </div>
                <div className="meta-row">
                  <strong>Grade:</strong>
                  <span>{selectedQuestion.grade}</span>
                </div>
                <div className="meta-row">
                  <strong>Times Used:</strong>
                  <span>{selectedQuestion.usageCount}</span>
                </div>
              </div>

              <div className="preview-question">
                <h4>Question:</h4>
                <p>{selectedQuestion.problem.text}</p>
              </div>

              {selectedQuestion.problem.options && (
                <div className="preview-options">
                  <h4>Options:</h4>
                  <ul>
                    {selectedQuestion.problem.options.map((opt, idx) => (
                      <li
                        key={idx}
                        className={opt === selectedQuestion.problem.correctAnswer ? 'correct' : ''}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedQuestion.notes && (
                <div className="preview-notes">
                  <h4>Notes:</h4>
                  <p>{selectedQuestion.notes}</p>
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
                  className={`btn-secondary ${selectedQuestion.isFavorite ? 'active' : ''}`}
                >
                  {selectedQuestion.isFavorite ? '★ Remove from Favorites' : '☆ Add to Favorites'}
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
