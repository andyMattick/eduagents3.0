import { useState, useEffect } from 'react';

export interface StudentTagSelection {
  tags: string[];
  focusGradeLevel?: string;
  focusSubject?: string;
}

interface StudentTagBreakdownProps {
  onConfirm: (selection: StudentTagSelection) => void;
  gradeLevel?: string;
  subject?: string;
  isLoading?: boolean;
}

// Predefined student struggle tags by grade/subject
const STUDENT_TAGS_BY_LEVEL = {
  'K-2': [
    'Struggles with vocabulary',
    'Needs scaffolding',
    'Misinterprets instructions',
    'Short attention span',
  ],
  '3-5': [
    'Struggles with vocabulary',
    'Needs scaffolding',
    'Misinterprets instructions',
    'Low prior knowledge',
    'Reluctant writer',
  ],
  '6-8': [
    'Struggles with vocabulary',
    'Needs scaffolding',
    'Misinterprets instructions',
    'Low prior knowledge',
    'High-performing but disengaged',
    'Finishes quickly',
  ],
  '9-10': [
    'Struggles with vocabulary',
    'Needs scaffolding',
    'Low prior knowledge',
    'High-performing but disengaged',
    'Finishes quickly',
    'Overthinks problems',
  ],
  '11-12': [
    'Struggles with technical vocabulary',
    'Low prior knowledge',
    'High-performing but disengaged',
    'Finishes quickly',
    'Overthinks problems',
    'Difficulty with abstract concepts',
  ],
  College: [
    'Struggles with technical vocabulary',
    'Low prior knowledge',
    'High-performing but disengaged',
    'Finishes quickly',
    'Difficulty with abstract concepts',
    'Needs deeper contextual understanding',
  ],
};

const ALL_STUDENT_TAGS = [
  'Struggles with vocabulary',
  'Needs scaffolding',
  'Finishes quickly',
  'Misinterprets instructions',
  'Low prior knowledge',
  'High-performing but disengaged',
  'Reluctant writer',
  'Overthinks problems',
  'Struggles with technical vocabulary',
  'Difficulty with abstract concepts',
  'Needs deeper contextual understanding',
];

export function StudentTagBreakdown({
  onConfirm,
  gradeLevel = '6-8',
  subject,
  isLoading = false,
}: StudentTagBreakdownProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Set suggested tags on mount or when grade level changes
  useEffect(() => {
    const suggested = STUDENT_TAGS_BY_LEVEL[gradeLevel as keyof typeof STUDENT_TAGS_BY_LEVEL] || 
                     STUDENT_TAGS_BY_LEVEL['6-8'];
    setSuggestedTags(suggested);
    // Auto-select first 2-3 suggestions
    setSelectedTags(suggested.slice(0, 3));
  }, [gradeLevel]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleConfirm = () => {
    if (selectedTags.length === 0) {
      alert('Please select at least one student focus area');
      return;
    }
    onConfirm({
      tags: selectedTags,
      focusGradeLevel: gradeLevel,
      focusSubject: subject,
    });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0, color: '#333' }}>🎯 Select Student Focus Areas</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
        Choose which student challenges to prioritize in the analysis. This will customize the feedback
        to highlight how your assignment addresses these specific needs.
      </p>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📚 Suggested for Grade {gradeLevel}:
          </label>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0' }}>
            Start with these common focus areas, or customize below.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: selectedTags.includes(tag) ? '2px solid #007bff' : '2px solid #ddd',
                  backgroundColor: selectedTags.includes(tag) ? '#e7f0ff' : '#f9f9f9',
                  color: selectedTags.includes(tag) ? '#007bff' : '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: selectedTags.includes(tag) ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                {selectedTags.includes(tag) ? '✓ ' : ''}
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            🔧 All Available Focus Areas:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {ALL_STUDENT_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: selectedTags.includes(tag) ? '2px solid #28a745' : '1px solid #ddd',
                  backgroundColor: selectedTags.includes(tag) ? '#d4edda' : '#fff',
                  color: selectedTags.includes(tag) ? '#155724' : '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: selectedTags.includes(tag) ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => {}}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#e8f4f8', borderRadius: '6px' }}>
          <strong style={{ color: '#0066cc' }}>Selected: {selectedTags.length} focus area{selectedTags.length !== 1 ? 's' : ''}</strong>
          {selectedTags.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#0066cc' }}>
              {selectedTags.map((tag, idx) => (
                <div key={tag}>
                  {idx + 1}. {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={isLoading || selectedTags.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '16px',
            backgroundColor: selectedTags.length > 0 && !isLoading ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedTags.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Analyzing...' : '→ Continue to Student Analysis & Tag Breakdown'}
        </button>
      </div>
    </div>
  );
}
