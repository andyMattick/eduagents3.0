import { useState } from 'react';
import { Material, PredefinedTag } from '../../types/materials';

interface MaterialTaggerProps {
  material: Material;
  onSave: (tags: PredefinedTag[], customTags: string[]) => void;
  onCancel: () => void;
}

const predefinedTags: PredefinedTag[] = [
  // Grade Levels
  { name: 'Elementary', category: 'grade_level', value: 'Elementary' },
  { name: 'Middle School', category: 'grade_level', value: 'Middle School' },
  { name: 'High School', category: 'grade_level', value: 'High School' },
  { name: 'College', category: 'grade_level', value: 'College' },
  // Subjects
  { name: 'Mathematics', category: 'subject', value: 'Mathematics' },
  { name: 'Science', category: 'subject', value: 'Science' },
  { name: 'English/Language Arts', category: 'subject', value: 'English/Language Arts' },
  { name: 'Social Studies', category: 'subject', value: 'Social Studies' },
  { name: 'History', category: 'subject', value: 'History' },
  { name: 'Art', category: 'subject', value: 'Art' },
  { name: 'Physical Education', category: 'subject', value: 'Physical Education' },
  // Bloom Levels
  { name: 'Remember', category: 'bloom_level', value: 'Remember' },
  { name: 'Understand', category: 'bloom_level', value: 'Understand' },
  { name: 'Apply', category: 'bloom_level', value: 'Apply' },
  { name: 'Analyze', category: 'bloom_level', value: 'Analyze' },
  { name: 'Evaluate', category: 'bloom_level', value: 'Evaluate' },
  { name: 'Create', category: 'bloom_level', value: 'Create' },
  // Topics (sample)
  { name: 'Problem Solving', category: 'topic', value: 'Problem Solving' },
  { name: 'Critical Thinking', category: 'topic', value: 'Critical Thinking' },
  { name: 'Collaboration', category: 'topic', value: 'Collaboration' },
  { name: 'Creativity', category: 'topic', value: 'Creativity' },
];

const categoryLabels: Record<string, string> = {
  grade_level: '📚 Grade Level',
  subject: '🎯 Subject',
  bloom_level: '🧠 Bloom Level',
  topic: '🏷️ Topic',
};

export function MaterialTagger({ material, onSave, onCancel }: MaterialTaggerProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(material.predefinedTags.map(t => t.name))
  );
  const [customTags, setCustomTags] = useState<string[]>(material.customTags);
  const [newCustomTag, setNewCustomTag] = useState('');

  const handleToggleTag = (tag: PredefinedTag) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag.name)) {
      newSelected.delete(tag.name);
    } else {
      newSelected.add(tag.name);
    }
    setSelectedTags(newSelected);
  };

  const handleAddCustomTag = () => {
    if (newCustomTag.trim() && !customTags.includes(newCustomTag.trim())) {
      setCustomTags([...customTags, newCustomTag.trim()]);
      setNewCustomTag('');
    }
  };

  const handleRemoveCustomTag = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    const selectedPredefinedTags = predefinedTags.filter(t =>
      selectedTags.has(t.name)
    );
    onSave(selectedPredefinedTags, customTags);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 12px 0', color: '#333' }}>
          🏷️ Tag Material: {material.filename}
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px' }}>
          Select predefined tags and add custom ones to categorize this material.
        </p>

        {/* Predefined Tags by Category */}
        {['grade_level', 'subject', 'bloom_level', 'topic'].map(category => {
          const categoryTags = predefinedTags.filter(t => t.category === category);
          return (
            <div key={category} style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>
                {categoryLabels[category]}
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categoryTags.map(tag => (
                  <button
                    key={tag.name}
                    onClick={() => handleToggleTag(tag)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: selectedTags.has(tag.name)
                        ? '#007bff'
                        : '#f0f0f0',
                      color: selectedTags.has(tag.name) ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedTags.has(tag.name)) {
                        e.currentTarget.style.backgroundColor = '#e0e0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedTags.has(tag.name)) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                  >
                    {selectedTags.has(tag.name) ? '✓ ' : ''}{tag.value}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Custom Tags */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>
            ✨ Custom Tags
          </h4>
          {customTags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {customTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleRemoveCustomTag(tag)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {tag} ✕
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newCustomTag}
              onChange={(e) => setNewCustomTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomTag();
                }
              }}
              placeholder="Add custom tag..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleAddCustomTag}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Save Tags
          </button>
        </div>
      </div>
    </div>
  );
}
