import { useState } from 'react';
import { Material } from '../../types/materials';

interface AIWriterDialogProps {
  material: Material;
  onSend: (
    actionType: 'enhance' | 'generate_assignment',
    options: GenerationOptions
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface GenerationOptions {
  actionType: 'enhance' | 'generate_assignment';
  instructions?: string;
  // For generate_assignment
  subject?: string;
  gradeLevel?: string;
  topic?: string;
  problemTypes: string[];
  numberOfProblems: number;
  bloomLevels: string[];
  includeAnswerKey: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  timeLimit?: number;
  includeHints: boolean;
}

const problemTypes = [
  'Multiple Choice',
  'Short Answer',
  'Essay',
  'Fill in the Blank',
  'True/False',
  'Matching',
  'Problem Solving',
  'Diagram/Label',
];

const bloomLevels = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
];

const grades = [
  'Elementary (K-5)',
  'Middle School (6-8)',
  'High School (9-12)',
  'College (13+)',
];

export function AIWriterDialog({
  material,
  onSend,
  onCancel,
  isLoading,
}: AIWriterDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'enhance' | 'generate_assignment'>(
    'generate_assignment'
  );
  const [formData, setFormData] = useState<GenerationOptions>({
    actionType: 'generate_assignment',
    subject: material.predefinedTags.find(t => t.category === 'subject')?.value || '',
    gradeLevel: material.predefinedTags.find(t => t.category === 'grade_level')?.value || '',
    topic: '',
    problemTypes: ['Multiple Choice', 'Short Answer'],
    numberOfProblems: 5,
    bloomLevels: ['Understand', 'Apply', 'Analyze'],
    includeAnswerKey: true,
    difficulty: 'medium',
    timeLimit: undefined,
    includeHints: false,
    instructions: '',
  });

  const handleSend = () => {
    const options = { ...formData, actionType: selectedAction };
    onSend(selectedAction, options);
  };

  const handleProblemTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      problemTypes: prev.problemTypes.includes(type)
        ? prev.problemTypes.filter(t => t !== type)
        : [...prev.problemTypes, type],
    }));
  };

  const handleBloomToggle = (level: string) => {
    setFormData(prev => ({
      ...prev,
      bloomLevels: prev.bloomLevels.includes(level)
        ? prev.bloomLevels.filter(l => l !== level)
        : [...prev.bloomLevels, level],
    }));
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
        overflowY: 'auto',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 12px 0', color: '#333' }}>
          🤖 Send to AI Writer
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px' }}>
          Configure options for AI processing of your {material.materialType.replace(/_/g, ' ')}.
        </p>

        {/* Action Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '12px', fontSize: '14px' }}>
            What would you like the AI to do?
          </label>
          <button
            onClick={() => setSelectedAction('enhance')}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: selectedAction === 'enhance' ? '#e3f2fd' : '#f5f5f5',
              border: `2px solid ${selectedAction === 'enhance' ? '#007bff' : '#ddd'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '600', color: selectedAction === 'enhance' ? '#007bff' : '#333', marginBottom: '4px' }}>
              ✨ Enhance & Refine
            </div>
            <div style={{ fontSize: '13px', color: selectedAction === 'enhance' ? '#0056b3' : '#666' }}>
              Improve clarity, grammar, pedagogy, and overall quality
            </div>
          </button>

          <button
            onClick={() => setSelectedAction('generate_assignment')}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: selectedAction === 'generate_assignment' ? '#e8f5e9' : '#f5f5f5',
              border: `2px solid ${selectedAction === 'generate_assignment' ? '#28a745' : '#ddd'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '600', color: selectedAction === 'generate_assignment' ? '#28a745' : '#333', marginBottom: '4px' }}>
              📝 Generate Assignment
            </div>
            <div style={{ fontSize: '13px', color: selectedAction === 'generate_assignment' ? '#1b5e20' : '#666' }}>
              Create assignment questions and activities from this material
            </div>
          </button>
        </div>

        {/* Conditional options based on action */}
        {selectedAction === 'generate_assignment' && (
          <>
            {/* Course Info */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>
                📚 Course Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Grade Level
                  </label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">Select grade level</option>
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Statistics, Biology"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Topic/Unit
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Sampling Distributions, Photosynthesis"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Problem Configuration */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>
                ❓ Problem Configuration
              </h3>

              {/* Problem Types */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Problem Types (select all that apply)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {problemTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => handleProblemTypeToggle(type)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: formData.problemTypes.includes(type)
                          ? '#007bff'
                          : '#f0f0f0',
                        color: formData.problemTypes.includes(type) ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {formData.problemTypes.includes(type) ? '✓ ' : ''}{type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Problems */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Number of Problems: <strong>{formData.numberOfProblems}</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={formData.numberOfProblems}
                  onChange={(e) =>
                    setFormData({ ...formData, numberOfProblems: parseInt(e.target.value) })
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Bloom's Levels */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Bloom's Levels (select all that apply)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {bloomLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => handleBloomToggle(level)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: formData.bloomLevels.includes(level)
                          ? '#28a745'
                          : '#f0f0f0',
                        color: formData.bloomLevels.includes(level) ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {formData.bloomLevels.includes(level) ? '✓ ' : ''}{level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>
                ⚙️ Additional Options
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as 'easy' | 'medium' | 'hard' | 'mixed',
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Time Limit (minutes, optional)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimit || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 45"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#333', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.includeAnswerKey}
                    onChange={(e) =>
                      setFormData({ ...formData, includeAnswerKey: e.target.checked })
                    }
                    style={{ marginRight: '6px' }}
                  />
                  Include Answer Key
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#333', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.includeHints}
                    onChange={(e) => setFormData({ ...formData, includeHints: e.target.checked })}
                    style={{ marginRight: '6px' }}
                  />
                  Include Hints/Scaffolding
                </label>
              </div>
            </div>

            {/* Custom Instructions */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                Additional Instructions (optional)
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="E.g., 'Focus on real-world applications' or 'Include data tables' or 'Make it visually engaging'"
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </>
        )}

        {/* Enhance-only instructions */}
        {selectedAction === 'enhance' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              What should AI focus on? (optional)
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="E.g., 'Improve clarity for 7th graders' or 'Add more examples' or 'Make it more engaging'"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Summary of Tags */}
        {(material.predefinedTags.length > 0 || material.customTags.length > 0) && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#666',
            }}
          >
            <strong>📋 Tags on this material:</strong>
            <div style={{ marginTop: '6px' }}>
              {material.predefinedTags.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    marginRight: '6px',
                    marginBottom: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#e3f2fd',
                    color: '#0056b3',
                    borderRadius: '3px',
                  }}
                >
                  {t.value}
                </span>
              ))}
              {material.customTags.map((t, idx) => (
                <span
                  key={`custom_${idx}`}
                  style={{
                    display: 'inline-block',
                    marginRight: '6px',
                    marginBottom: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    borderRadius: '3px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={
              isLoading ||
              (selectedAction === 'generate_assignment' && formData.problemTypes.length === 0)
            }
            style={{
              padding: '10px 20px',
              backgroundColor:
                selectedAction === 'enhance' ? '#007bff' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor:
                isLoading ||
                (selectedAction === 'generate_assignment' &&
                  formData.problemTypes.length === 0)
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity:
                isLoading ||
                (selectedAction === 'generate_assignment' &&
                  formData.problemTypes.length === 0)
                  ? 0.6
                  : 1,
            }}
          >
            {isLoading ? '⏳ Processing...' : `🚀 Send to AI Writer`}
          </button>
        </div>
      </div>
    </div>
  );
}
