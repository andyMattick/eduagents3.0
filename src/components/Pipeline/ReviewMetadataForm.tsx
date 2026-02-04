import React, { useState } from 'react';
import { useNotepad } from '../../hooks/useNotepad';

const COMMON_SUBJECTS = [
  'Mathematics',
  'Science',
  'English Language Arts',
  'History',
  'Social Studies',
  'Physical Education',
  'Art',
  'Music',
  'Foreign Languages',
  'Computer Science',
  'Business',
  'Health',
  'Other',
];

const GRADE_BANDS = {
  'Elementary': [3, 4, 5],
  'Middle School': [6, 7, 8],
  'High School': [9, 10, 11, 12],
};

const GRADE_LEVELS_NUMERIC = [6, 7, 8, 9, 10, 11, 12];

const SUBJECT_LEVELS = ['On-Level', 'Honors', 'AP', 'IB', 'Other'];

export interface ReviewMetadata {
  gradeLevel: number[];
  subject: string;
  subjectLevel: string;
}

interface ReviewMetadataFormProps {
  onSubmit: (metadata: ReviewMetadata) => void;
  isLoading?: boolean;
}

export function ReviewMetadataForm({ onSubmit, isLoading = false }: ReviewMetadataFormProps) {
  const { addEntry } = useNotepad();
  const [gradeLevel, setGradeLevel] = useState<number[]>([9]);
  const [subject, setSubject] = useState('Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [subjectLevel, setSubjectLevel] = useState('On-Level');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (gradeLevel.length === 0) {
      alert('Please select at least one grade level');
      return;
    }

    const finalSubject = subject === 'Other' ? customSubject : subject;
    if (!finalSubject.trim()) {
      alert('Please enter a subject');
      return;
    }

    // Add to notepad when submitting
    addEntry(
      `Metadata set: ${finalSubject} (${subjectLevel}) - Grades ${gradeLevel.map((g) => `${g}th`).join(', ')}`,
      'suggestion'
    );

    onSubmit({
      gradeLevel,
      subject: finalSubject,
      subjectLevel,
    });
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginBottom: '16px',
  };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '0 auto',
        border: '2px solid #28a745',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '20px' }}>✓</span>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '4px', color: '#333' }}>Assignment Uploaded Successfully</h2>
          <p style={{ marginTop: 0, color: '#2e7d32', fontSize: '13px', fontWeight: '500' }}>
            Now tell us about this assignment so we can provide relevant feedback:
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Subject Selection */}
        <div>
          <label style={labelStyle}>Subject *</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={inputStyle}
          >
            {COMMON_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {subject === 'Other' && (
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Enter subject name"
              style={inputStyle}
            />
          )}
        </div>

        {/* Subject Level */}
        <div>
          <label style={labelStyle}>Subject Level *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
            {SUBJECT_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSubjectLevel(level)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: subjectLevel === level ? '#007bff' : '#e0e0e0',
                  color: subjectLevel === level ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Grade Levels - Multi-select */}
        <div>
          <label style={labelStyle}>Grade Level(s) *</label>

          {/* Grade Band Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {Object.entries(GRADE_BANDS).map(([band, grades]) => (
              <button
                key={band}
                type="button"
                onClick={() => {
                  const allSelected = grades.every((g) => gradeLevel.includes(g));
                  if (allSelected) {
                    setGradeLevel(gradeLevel.filter((g) => !grades.includes(g)));
                  } else {
                    setGradeLevel(Array.from(new Set([...gradeLevel, ...grades])).sort((a, b) => a - b));
                  }
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: grades.every((g) => gradeLevel.includes(g)) ? '#007bff' : '#e0e0e0',
                  color: grades.every((g) => gradeLevel.includes(g)) ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
              >
                {band}
              </button>
            ))}
          </div>

          {/* Individual Grade Level Checkboxes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '16px',
            }}
          >
            {GRADE_LEVELS_NUMERIC.map((g) => (
              <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={gradeLevel.includes(g)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setGradeLevel(Array.from(new Set([...gradeLevel, g])).sort((a, b) => a - b));
                    } else {
                      setGradeLevel(gradeLevel.filter((gl) => gl !== g));
                    }
                  }}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px' }}>{g}th</span>
              </label>
            ))}
          </div>
        </div>

        {/* Selected Info */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1565c0',
          }}
        >
          <strong>Selected:</strong> {gradeLevel.map((g) => `${g}th`).join(', ')} grade{gradeLevel.length > 1 ? 's' : ''} •{' '}
          {subject === 'Other' ? customSubject : subject} • {subjectLevel}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || gradeLevel.length === 0}
          style={{
            padding: '14px 32px',
            backgroundColor: isLoading || gradeLevel.length === 0 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading || gradeLevel.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '16px',
            width: '100%',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && gradeLevel.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#218838';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && gradeLevel.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#28a745';
            }
          }}
        >
          {isLoading ? '⏳ Processing...' : '✓ Analyze This Assignment'}
        </button>
      </form>
    </div>
  );
}
