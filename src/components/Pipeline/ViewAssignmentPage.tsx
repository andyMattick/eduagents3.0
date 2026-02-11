import { GeneratedAssignment, GeneratedProblem } from '../../hooks/useUserFlow';
import { exportDocumentPreviewPDF } from '../../utils/exportUtils';
import { BloomsDistributionGuide } from './BloomsDistributionGuide';
import { useState } from 'react';
import './ViewAssignmentPage.css';
import './BloomsDistributionGuide.css';

interface ViewAssignmentPageProps {
  assignment: GeneratedAssignment;
  onBack: () => void;
}

export function ViewAssignmentPage({ assignment, onBack }: ViewAssignmentPageProps) {
  const [showDocumentStats, setShowDocumentStats] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(assignment.sections.map((_, i) => `section-${i}`)));

  if (!assignment || !assignment.sections) {
    return (
      <div className="view-assignment-container error-state">
        <h2>⚠️ Error</h2>
        <p>Assignment data incomplete or corrupted</p>
        <button onClick={onBack} className="btn-primary">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate statistics
  const allProblems = assignment.sections.flatMap(s => s.problems || []);
  const totalQuestions = allProblems.length;
  const totalWords = allProblems.reduce((sum, p) => sum + (p.problemText?.split(/\s+/).length || 0), 0);
  const avgWordsPerQuestion = totalQuestions > 0 ? Math.round(totalWords / totalQuestions) : 0;
  
  // Helper to convert complexity/novelty from string enum to numeric scale
  const scoreToNumeric = (score: 'low' | 'medium' | 'high') => {
    switch(score) {
      case 'low': return 0.33;
      case 'medium': return 0.66;
      case 'high': return 0.99;
      default: return 0.5;
    }
  };

  // Complexity and novelty calculations
  const complexityScores = allProblems.map(p => scoreToNumeric(p.complexity || 'medium'));
  const noveltyScores = allProblems.map(p => scoreToNumeric(p.novelty || 'medium'));
  const avgComplexity = complexityScores.length > 0 ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length : 0.5;
  const avgNovelty = noveltyScores.length > 0 ? noveltyScores.reduce((a, b) => a + b, 0) / noveltyScores.length : 0.5;

  // Type distribution
  const typeDistribution: { [key: string]: number } = {};
  allProblems.forEach(p => {
    const type = p.questionFormat || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });

  // Bloom distribution
  const bloomDist = assignment.bloomDistribution || {};

  // Problems with tips
  const problemsWithTips = allProblems.filter(p => p.hasTip).length;
  const tipCoverage = totalQuestions > 0 ? Math.round((problemsWithTips / totalQuestions) * 100) : 0;

  const handleExportPDF = async () => {
    try {
      const success = await exportDocumentPreviewPDF('view-document-content', assignment.title || 'assignment');
      if (success) {
        const link = document.createElement('a');
        link.download = `${assignment.title || 'assignment'}.pdf`;
        link.click();
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonData = JSON.stringify(assignment, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${assignment.title || 'assignment'}.json`;
      link.click();
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Failed to export data');
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderProblem = (problem: GeneratedProblem, index: number) => {
    // Handle matching questions specially (2 columns)
    // Note: matching format not currently in type, skip for now
    if (false) {
      return renderMatchingProblem(problem, index);
    }

    return (
      <div key={index} className="problem-card">
        <div className="problem-header">
          <div className="problem-number">Q{index + 1}</div>
          <div className="problem-tags">
            {problem.bloomLevel && <span className="tag bloom-tag">{problem.bloomLevel}</span>}
            {problem.questionFormat && <span className="tag format-tag">{problem.questionFormat}</span>}
          </div>
        </div>
        
        <div className="problem-content">
          <p className="problem-text">{problem.problemText}</p>
          
          {problem.options && problem.options.length > 0 && (
            <div className="options-list">
              {problem.options.map((opt, i) => (
                <div key={i} className="option">
                  <span className="option-letter">{String.fromCharCode(65 + i)}.</span>
                  <span className="option-text">{opt}</span>
                </div>
              ))}
            </div>
          )}

          {problem.hasTip && problem.tipText && (
            <div className="tips">
              <strong>Tips:</strong>
              <p>{problem.tipText}</p>
            </div>
          )}
        </div>

        <div className="problem-metadata">
          <div className="metadata-item">
            <span className="label">Complexity:</span>
            <div className="complexity-bar">
              <div className="complexity-fill" style={{ width: `${(scoreToNumeric(problem.complexity || 'medium') || 0.5) * 100}%` }}></div>
            </div>
            <span className="value">{scoreToNumeric(problem.complexity || 'medium').toFixed(2)}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Novelty:</span>
            <div className="novelty-bar">
              <div className="novelty-fill" style={{ width: `${scoreToNumeric(problem.novelty || 'medium') * 100}%` }}></div>
            </div>
            <span className="value">{scoreToNumeric(problem.novelty || 'medium').toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchingProblem = (problem: GeneratedProblem, index: number) => {
    const options = problem.options || [];
    
    return (
      <div key={index} className="problem-card matching-problem">
        <div className="problem-header">
          <div className="problem-number">Q{index + 1}</div>
          <div className="problem-tags">
            {problem.bloomLevel && <span className="tag bloom-tag">{problem.bloomLevel}</span>}
            <span className="tag format-tag">Matching</span>
          </div>
        </div>

        <p className="problem-text">{problem.problemText}</p>

        <div className="matching-layout">
          <div className="matching-column">
            <div className="column-header">Prompts</div>
            {(problem.prompts || []).map((prompt: string, i: number) => (
              <div key={i} className="matching-item">
                <span className="matching-label">{i + 1}.</span>
                <span className="matching-text">{prompt}</span>
              </div>
            ))}
          </div>
          <div className="matching-column">
            <div className="column-header">Answers</div>
            {options.map((opt, i) => (
              <div key={i} className="matching-item">
                <span className="matching-label">{String.fromCharCode(65 + i)}.</span>
                <span className="matching-text">{opt}</span>
              </div>
            ))}
          </div>
        </div>

        {problem.tipText && (
          <div className="problem-tips">
            <strong>💡 Teacher Tips:</strong>
            <p>{problem.tipText}</p>
          </div>
        )}

        <div className="problem-metadata">
          <div className="metadata-item">
            <span className="label">Complexity:</span>
            <div className="complexity-bar">
              <div className="complexity-fill" style={{ width: `${(scoreToNumeric(problem.complexity || 'medium') || 0.5) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view-assignment-container">
      {/* Header */}
      <div className="view-header">
        <div className="header-content">
          <h1>{assignment.title}</h1>
          <p className="assignment-meta">
            {assignment.sections.length} sections • {totalQuestions} questions • ~{assignment.estimatedTime || 60} min
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowDocumentStats(!showDocumentStats)} className="btn-secondary">
            📊 {showDocumentStats ? 'Hide' : 'Show'} Stats
          </button>
          <button onClick={handleExportPDF} className="btn-secondary">
            📄 Export PDF
          </button>
          <button onClick={handleExportJSON} className="btn-secondary">
            💾 Export Data
          </button>
          <button onClick={onBack} className="btn-primary">
            ← Back
          </button>
        </div>
      </div>

      {/* Document Statistics Panel */}
      {showDocumentStats && (
        <div className="document-stats-panel">
          <h3>📈 Document Statistics</h3>
          
          <div className="stats-grid">
            {/* Overview */}
            <div className="stats-section">
              <h4>📋 Overview</h4>
              <div className="stat-row">
                <span className="label">Total Questions:</span>
                <strong>{totalQuestions}</strong>
              </div>
              <div className="stat-row">
                <span className="label">Sections:</span>
                <strong>{assignment.sections.length}</strong>
              </div>
              <div className="stat-row">
                <span className="label">Est. Duration:</span>
                <strong>{assignment.estimatedTime || 60} minutes</strong>
              </div>
              <div className="stat-row">
                <span className="label">Assessment Type:</span>
                <strong>{assignment.assignmentType || 'General'}</strong>
              </div>
            </div>

            {/* Complexity */}
            <div className="stats-section">
              <h4>⚙️ Complexity</h4>
              <div className="stat-row">
                <span className="label">Average:</span>
                <strong>{avgComplexity.toFixed(2)}</strong>
              </div>
              <div className="complexity-bar-full">
                <div className="complexity-fill" style={{ width: `${avgComplexity * 100}%` }}></div>
              </div>
              <p className="stat-description">Scale: 0.0 (Simple) to 1.0 (Complex)</p>
            </div>

            {/* Novelty */}
            <div className="stats-section">
              <h4>✨ Novelty & Variety</h4>
              <div className="stat-row">
                <span className="label">Average:</span>
                <strong>{avgNovelty.toFixed(2)}</strong>
              </div>
              <div className="novelty-bar-full">
                <div className="novelty-fill" style={{ width: `${avgNovelty * 100}%` }}></div>
              </div>
              <p className="stat-description">Scale: 0.0 (Repetitive) to 1.0 (Novel)</p>
            </div>

            {/* Length */}
            <div className="stats-section">
              <h4>📝 Content Length</h4>
              <div className="stat-row">
                <span className="label">Total Words:</span>
                <strong>{totalWords.toLocaleString()}</strong>
              </div>
              <div className="stat-row">
                <span className="label">Avg Words/Question:</span>
                <strong>{avgWordsPerQuestion}</strong>
              </div>
            </div>

            {/* Question Types */}
            <div className="stats-section">
              <h4>🎯 Question Types</h4>
              <div className="type-list">
                {Object.entries(typeDistribution).map(([type, count]) => (
                  <div key={type} className="type-item">
                    <span className="type-name">{type}:</span>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloom's Distribution */}
            <div className="stats-section">
              <h4>🎓 Bloom's Distribution</h4>
              {Object.entries(bloomDist).length > 0 ? (
                <div className="bloom-items">
                  {Object.entries(bloomDist).map(([level, count]) => (
                    <div key={level} className="bloom-item">
                      <span className="level">{level}:</span>
                      <span className="count">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="stat-description">No Bloom distribution data</p>
              )}
            </div>

            {/* Support Resources */}
            <div className="stats-section">
              <h4>💡 Support Resources</h4>
              <div className="stat-row">
                <span className="label">Problems with Tips:</span>
                <strong>{problemsWithTips}</strong>
              </div>
              <div className="stat-row">
                <span className="label">Coverage:</span>
                <strong>{tipCoverage}%</strong>
              </div>
            </div>
          </div>
          
          {/* Bloom's Distribution Guide */}
          <BloomsDistributionGuide
            currentDistribution={bloomDist}
            showGuidance={true}
            compact={true}
          />

          <button onClick={() => setShowDocumentStats(false)} className="close-stats">
            Hide Statistics
          </button>
        </div>
      )}

      {/* Document Content */}
      <div id="view-document-content" className="document-content">
        {assignment.sections.map((section, sectionIdx) => {
          const sectionId = section.sectionId || `section-${sectionIdx}`;
          const isExpanded = expandedSections.has(sectionId);

          return (
            <div key={sectionId} className="section-container">
              <div
                className="section-header"
                onClick={() => toggleSection(sectionId)}
                style={{ cursor: 'pointer' }}
              >
                <h2 className="section-title">
                  {isExpanded ? '▼' : '▶'} {section.sectionName || `Section ${sectionIdx + 1}`}
                </h2>
                <span className="section-count">
                  {section.problems?.length || 0} questions
                </span>
              </div>

              {section.instructions && (
                <div className="section-instructions">
                  {section.instructions}
                </div>
              )}

              {isExpanded && (
                <div className="problems-list">
                  {section.problems?.map((problem, problemIdx) =>
                    renderProblem(problem, problemIdx + 1)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="view-footer">
        <button onClick={onBack} className="btn-primary">
          ← Back to Dashboard
        </button>
        <button onClick={handleExportPDF} className="btn-secondary">
          📄 Export as PDF
        </button>
      </div>
    </div>
  );
}
