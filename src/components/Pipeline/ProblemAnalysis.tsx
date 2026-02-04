import React from 'react';
import { Asteroid } from '../../types/simulation';
import { useNotepad } from '../../hooks/useNotepad';

interface ProblemAnalysisProps {
  asteroids: Asteroid[];
  onNext: () => void;
  isLoading?: boolean;
}

export function ProblemAnalysis({ asteroids, onNext, isLoading = false }: ProblemAnalysisProps) {
  const { addEntry } = useNotepad();
  const [viewMode, setViewMode] = React.useState<'metadata' | 'html'>('metadata');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [editedAsteroids, setEditedAsteroids] = React.useState<Map<string, Asteroid>>(new Map());

  // Start editing a problem
  const startEdit = (asteroid: Asteroid) => {
    setEditingId(asteroid.ProblemId);
    setEditText(asteroid.ProblemText);
  };

  // Save edited problem
  const saveEdit = (asteroid: Asteroid) => {
    if (!editText.trim()) return;

    const updated = { ...asteroid, ProblemText: editText };
    editedAsteroids.set(asteroid.ProblemId, updated);
    setEditedAsteroids(new Map(editedAsteroids));
    addEntry(`Edited problem "${editText.substring(0, 50)}..." - Text updated`, 'fix');
    setEditingId(null);
    setEditText('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Get display problem (edited or original)
  const getDisplayProblem = (asteroid: Asteroid): Asteroid => {
    return editedAsteroids.get(asteroid.ProblemId) || asteroid;
  };

  // Export to JSON
  const handleExportJSON = () => {
    const json = JSON.stringify(asteroids, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-metadata-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Problem #', 'Text', 'Bloom Level', 'Complexity', 'Novelty', 'Similarity', 'Length (words)', 'Multi-Part'];
    const rows = asteroids.map((a, i) => [
      i + 1,
      a.ProblemText.replace(/"/g, '""').substring(0, 100),
      a.BloomLevel,
      (a.LinguisticComplexity * 100).toFixed(0),
      (a.NoveltyScore * 100).toFixed(0),
      (a.SimilarityToPrevious * 100).toFixed(0),
      a.ProblemLength,
      a.MultiPart ? 'Yes' : 'No',
    ]);

    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-metadata-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (asteroids.length === 0) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Step 2: Problem Analysis</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          No problems to analyze yet. Upload or generate an assignment first.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 2: Problem Analysis & Metadata</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
        Every problem in your assignment has been automatically analyzed and tagged with Bloom's taxonomy level, linguistic complexity, novelty score, and more.
      </p>

      {/* View Mode Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setViewMode('metadata')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'metadata' ? '#0066cc' : '#e0e0e0',
            color: viewMode === 'metadata' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          📊 View Metadata
        </button>
        <button
          onClick={() => setViewMode('html')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'html' ? '#0066cc' : '#e0e0e0',
            color: viewMode === 'html' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          📄 View Assignment
        </button>
        <button
          onClick={handleExportJSON}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ⬇️ Export JSON
        </button>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Metadata View */}
      {viewMode === 'metadata' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '20px' }}>
          {asteroids.map((asteroid, index) => {
            const displayProblem = getDisplayProblem(asteroid);
            const isEditing = editingId === asteroid.ProblemId;
            return (
              <div key={asteroid.ProblemId || index} style={{ padding: '16px', backgroundColor: isEditing ? '#f0f7ff' : 'white', border: isEditing ? '2px solid #0066cc' : '1px solid #ddd', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '15px' }}>Problem {index + 1} 🎯</h4>
                {isEditing ? (
                  <div>
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '8px', fontSize: '14px', fontFamily: 'inherit', border: '1px solid #0066cc', borderRadius: '4px', marginBottom: '8px', fontWeight: 500 }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => saveEdit(asteroid)} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>✓ Save</button>
                      <button onClick={cancelEdit} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>✕ Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p onClick={() => startEdit(asteroid)} style={{ margin: '0 0 12px 0', color: '#555', fontSize: '14px', lineHeight: '1.5', cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: '#fafafa', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0'; (e.currentTarget as HTMLElement).style.borderColor = '#ddd'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
                    {displayProblem.ProblemText.substring(0, 200)}{displayProblem.ProblemText.length > 200 ? '...' : ''}{editedAsteroids.has(asteroid.ProblemId) && <span style={{ marginLeft: '8px', color: '#ff922b', fontWeight: 600 }}>✎ EDITED</span>}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📚 BLOOM LEVEL</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0066cc' }}>{displayProblem.BloomLevel}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📖 COMPLEXITY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#ff9800' }}>{(displayProblem.LinguisticComplexity * 100).toFixed(0)}%</div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#ff9800', width: `${displayProblem.LinguisticComplexity * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>✨ NOVELTY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#28a745' }}>{(displayProblem.NoveltyScore * 100).toFixed(0)}%</div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#28a745', width: `${displayProblem.NoveltyScore * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>🔗 STRUCTURE</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: displayProblem.MultiPart ? '#dc3545' : '#28a745' }}>{displayProblem.MultiPart ? 'Multi-part' : 'Single part'}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>📏 LENGTH</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#666' }}>{displayProblem.ProblemLength} words</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>🔄 SIMILARITY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#9c27b0' }}>{(displayProblem.SimilarityToPrevious * 100).toFixed(0)}%</div>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#9c27b0', width: `${displayProblem.SimilarityToPrevious * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HTML View */}
      {viewMode === 'html' && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #ddd',
            lineHeight: '1.6',
            fontSize: '14px',
          }}
        >
          {asteroids.map((asteroid, index) => (
            <div key={asteroid.ProblemId || index} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: index < asteroids.length - 1 ? '1px solid #eee' : 'none' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#333' }}>Problem {index + 1}</h3>
              <div
                dangerouslySetInnerHTML={{ __html: asteroid.ProblemText }}
                style={{ color: '#555' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', borderLeft: '4px solid #0066cc', marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#0066cc' }}>
          <strong>ℹ️ About Problem Metadata:</strong> Each problem has been analyzed for cognitive difficulty (Bloom level), language complexity, how different it is from previous problems (novelty), and structural properties. This metadata will help tailor instruction to your students.
        </p>
      </div>

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
          {isLoading ? 'Loading...' : 'Continue to Class Builder'}
        </button>
      </div>
    </div>
  );
}
