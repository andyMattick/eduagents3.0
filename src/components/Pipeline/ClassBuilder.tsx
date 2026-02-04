import React from 'react';
import { ClassStudentProfile, ClassDefinition } from '../../types/pipeline';

interface ClassBuilderProps {
  gradeLevel?: string;
  subject?: string;
  classDefinition?: ClassDefinition;
  onClassDefinitionChange: (classDefinition: ClassDefinition) => void;
  onNext: () => void;
  isLoading?: boolean;
}

const PRESET_PERSONAS = [
  { id: 'visual-learner', name: '👁️ Visual Learner', basePersona: 'visual-learner', overlays: [] },
  { id: 'auditory-learner', name: '👂 Auditory Learner', basePersona: 'auditory-learner', overlays: [] },
  { id: 'kinesthetic-learner', name: '🤚 Kinesthetic Learner', basePersona: 'kinesthetic-learner', overlays: [] },
  { id: 'advanced-student', name: '⚡ Advanced Student', basePersona: 'advanced-student', overlays: [] },
  { id: 'struggling-student', name: '📖 Struggling Student', basePersona: 'struggling-student', overlays: [] },
  { id: 'adhd-student', name: '🎯 ADHD Student', basePersona: 'average-student', overlays: ['adhd'] },
  { id: 'dyslexic-student', name: '📝 Dyslexic Student', basePersona: 'average-student', overlays: ['dyslexic'] },
  { id: 'esl-student', name: '🌍 ESL Student', basePersona: 'average-student', overlays: ['esl'] },
  { id: 'fatigue-sensitive', name: '😴 Fatigue Sensitive', basePersona: 'average-student', overlays: ['fatigue_sensitive'] },
  { id: 'high-anxiety', name: '😰 High Anxiety', basePersona: 'average-student', overlays: ['anxiety'] },
  { id: 'average-student', name: '👤 Average Student', basePersona: 'average-student', overlays: [] },
];

export function ClassBuilder({
  gradeLevel = 'Grade 9',
  subject = 'General',
  classDefinition,
  onClassDefinitionChange,
  onNext,
  isLoading = false,
}: ClassBuilderProps) {
  const [className, setClassName] = React.useState(classDefinition?.name || 'My Class');
  const [selectedProfiles, setSelectedProfiles] = React.useState<ClassStudentProfile[]>(
    classDefinition?.studentProfiles || []
  );
  const [customName, setCustomName] = React.useState('');
  const [customOverlays, setCustomOverlays] = React.useState<string[]>([]);

  // Add preset student
  const addStudent = (preset: (typeof PRESET_PERSONAS)[0]) => {
    const newStudent: ClassStudentProfile = {
      id: `student-${Date.now()}`,
      name: preset.name,
      profileType: 'standard',
      basePersona: preset.basePersona,
      overlays: preset.overlays,
      traits: {
        readingLevel: 0.5,
        mathFluency: 0.5,
        attentionSpan: 0.5,
        confidence: 0.5,
      },
    };
    setSelectedProfiles([...selectedProfiles, newStudent]);
  };

  // Add custom student
  const addCustomStudent = () => {
    if (!customName.trim()) return;
    const newStudent: ClassStudentProfile = {
      id: `student-${Date.now()}`,
      name: customName,
      profileType: 'custom',
      basePersona: 'average-student',
      overlays: customOverlays,
      traits: {
        readingLevel: 0.5,
        mathFluency: 0.5,
        attentionSpan: 0.5,
        confidence: 0.5,
      },
    };
    setSelectedProfiles([...selectedProfiles, newStudent]);
    setCustomName('');
    setCustomOverlays([]);
  };

  // Remove student
  const removeStudent = (id: string) => {
    setSelectedProfiles(selectedProfiles.filter((s) => s.id !== id));
  };

  // Update student trait
  const updateStudentTrait = (id: string, trait: keyof ClassStudentProfile['traits'], value: number) => {
    setSelectedProfiles(
      selectedProfiles.map((s) =>
        s.id === id ? { ...s, traits: { ...s.traits, [trait]: value } } : s
      )
    );
  };

  // Build class definition
  const buildClass = () => {
    const classDefinition: ClassDefinition = {
      id: `class-${Date.now()}`,
      name: className,
      gradeLevel,
      subject,
      studentProfiles: selectedProfiles,
      createdAt: new Date().toISOString(),
    };
    onClassDefinitionChange(classDefinition);
    onNext();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 3: Build Your Class</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
        Define the student profiles for this assignment. You can select preset personas or create custom students.
      </p>

      {/* Class Name */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'white', borderRadius: '6px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
          Class Name
        </label>
        <input
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
          placeholder="e.g., Period 1 Biology"
        />
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
          Grade: {gradeLevel} | Subject: {subject}
        </p>
      </div>

      {/* Preset Personas */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>📋 Select Preset Personas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
          {PRESET_PERSONAS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => addStudent(preset)}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066cc';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 102, 204, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Student */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'white', borderRadius: '6px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>➕ Create Custom Student</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              Student Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Alex, Creative Thinker"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              Add Overlays (optional)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['adhd', 'dyslexic', 'esl', 'fatigue_sensitive', 'anxiety'].map((overlay) => (
                <label key={overlay} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={customOverlays.includes(overlay)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCustomOverlays([...customOverlays, overlay]);
                      } else {
                        setCustomOverlays(customOverlays.filter((o) => o !== overlay));
                      }
                    }}
                  />
                  {overlay.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={addCustomStudent}
            disabled={!customName.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: customName.trim() ? '#0066cc' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: customName.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              width: 'fit-content',
            }}
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Selected Students */}
      {selectedProfiles.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>👥 Class Roster ({selectedProfiles.length} students)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {selectedProfiles.map((student) => (
              <div
                key={student.id}
                style={{
                  padding: '14px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '12px',
                  alignItems: 'start',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {student.name}
                  </h4>
                  {student.overlays.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      {student.overlays.map((overlay) => (
                        <span
                          key={overlay}
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            backgroundColor: '#f0f0f0',
                            color: '#666',
                            fontSize: '11px',
                            borderRadius: '3px',
                          }}
                        >
                          {overlay.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#666' }}>
                        Reading Level: {(student.traits.readingLevel * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={student.traits.readingLevel}
                        onChange={(e) =>
                          updateStudentTrait(student.id, 'readingLevel', parseFloat(e.target.value))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#666' }}>
                        Math Fluency: {(student.traits.mathFluency * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={student.traits.mathFluency}
                        onChange={(e) =>
                          updateStudentTrait(student.id, 'mathFluency', parseFloat(e.target.value))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#666' }}>
                        Attention Span: {(student.traits.attentionSpan * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={student.traits.attentionSpan}
                        onChange={(e) =>
                          updateStudentTrait(student.id, 'attentionSpan', parseFloat(e.target.value))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#666' }}>
                        Confidence: {(student.traits.confidence * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={student.traits.confidence}
                        onChange={(e) =>
                          updateStudentTrait(student.id, 'confidence', parseFloat(e.target.value))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeStudent(student.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', borderLeft: '4px solid #28a745', marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#2e7d32' }}>
          <strong>ℹ️ How It Works:</strong> You've selected {selectedProfiles.length} student{' '}
          {selectedProfiles.length === 1 ? 'persona' : 'personas'} for simulation. Your assignment will be tested against each profile to predict how different students will perform.
        </p>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={buildClass}
          disabled={isLoading || selectedProfiles.length === 0}
          style={{
            padding: '10px 24px',
            backgroundColor: selectedProfiles.length > 0 && !isLoading ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedProfiles.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Loading...' : `Run Simulation for ${selectedProfiles.length} Student${selectedProfiles.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
