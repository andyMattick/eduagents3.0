import React, { useState } from 'react';

interface SubjectSelectorProps {
  value: string;
  onChange: (subject: string) => void;
}

const COMMON_SUBJECTS = [
  'English Language Arts',
  'History',
  'Science',
  'Social Studies',
  'Math',
  'Art',
  'Computer Science',
  'Foreign Language',
  'Physical Education',
  'Music',
];

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  const [showCustom, setShowCustom] = useState(!COMMON_SUBJECTS.includes(value) && value !== '');
  const [customSubject, setCustomSubject] = useState(value && !COMMON_SUBJECTS.includes(value) ? value : '');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'other') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSubject(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
        📚 Subject
      </label>
      <select
        value={showCustom ? 'other' : value}
        onChange={handleSelectChange}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      >
        <option value="">Select a subject...</option>
        {COMMON_SUBJECTS.map(subject => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
        <option value="other">Other (Add Custom Subject)</option>
      </select>

      {showCustom && (
        <input
          type="text"
          value={customSubject}
          onChange={handleCustomChange}
          placeholder="Enter custom subject..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #0066cc',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />
      )}
    </div>
  );
}
