import React from 'react';
import { ClassDefinition } from '../../types/pipeline';
import { StudentProfile, ProblemProfile, ClassroomSimulationPayload } from '../../types/classroomProfiles';
import { generateStudentProfile, generateClassroom, generateCustomClassroom } from '../../agents/simulation/generateStudentProfiles';

interface ClassBuilderProps {
  gradeLevel?: string;
  subject?: string;
  classDefinition?: ClassDefinition;
  onClassDefinitionChange: (classDefinition: ClassDefinition) => void;
  onNext: () => void;
  isLoading?: boolean;
  problems?: ProblemProfile[];
}

type GenerationMode = 'preset' | 'custom' | 'auto';

export function ClassBuilder({
  gradeLevel = 'Grade 9',
  subject = 'General',
  classDefinition,
  onClassDefinitionChange,
  onNext,
  isLoading = false,
  problems = [],
}: ClassBuilderProps) {
  const [className, setClassName] = React.useState(classDefinition?.name || 'My Class');
  const [generationMode, setGenerationMode] = React.useState<GenerationMode>('auto');
  const [studentCount, setStudentCount] = React.useState(20);
  const [selectedStudents, setSelectedStudents] = React.useState<StudentProfile[]>([]);
  const [previewPayload, setPreviewPayload] = React.useState<ClassroomSimulationPayload | null>(null);

  // Generate classroom using standard distribution
  const handleGenerateStandard = () => {
    const students = generateClassroom();
    setSelectedStudents(students);
    setGenerationMode('auto');
  };

  // Generate classroom with custom count
  const handleGenerateCustom = () => {
    const students = generateCustomClassroom(studentCount);
    setSelectedStudents(students);
    setGenerationMode('custom');
  };

  // Generate and preview payload
  const handlePreviewPayload = () => {
    if (selectedStudents.length === 0) {
      alert('Please generate students first');
      return;
    }

    const payload: ClassroomSimulationPayload = {
      problems: problems,
      students: selectedStudents,
    };

    setPreviewPayload(payload);
    console.log('📦 Simulation Payload:', payload);
  };

  // Launch simulation
  const handleLaunchSimulation = () => {
    if (selectedStudents.length === 0) {
      alert('Please generate students first');
      return;
    }

    const payload: ClassroomSimulationPayload = {
      problems: problems,
      students: selectedStudents,
    };

    // Update class definition and proceed
    const updatedClass: ClassDefinition = {
      name: className,
      studentProfiles: selectedStudents,
    };

    onClassDefinitionChange(updatedClass);
    onNext();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>🛰️ Classroom Setup</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Generate a classroom of student personas for simulation
      </p>

      {/* Class Name Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Class Name
        </label>
        <input
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
          placeholder="e.g., Biology 101"
        />
      </div>

      {/* Generation Options */}
      <div style={{ marginBottom: '20px', display: 'grid', gap: '12px' }}>
        <button
          onClick={handleGenerateStandard}
          disabled={isLoading}
          style={{
            padding: '12px',
            backgroundColor: generationMode === 'auto' ? '#5b7cfa' : '#e0e0e0',
            color: generationMode === 'auto' ? 'white' : '#666',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4c6ef5';
          }}
          onMouseLeave={(e) => {
            if (generationMode === 'auto') (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5b7cfa';
          }}
        >
          🤖 Auto-Generate Standard Class (20 students)
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            min="1"
            max="100"
            value={studentCount}
            onChange={(e) => setStudentCount(Math.max(1, parseInt(e.target.value) || 20))}
            style={{
              width: '100px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
            placeholder="Count"
          />
          <button
            onClick={handleGenerateCustom}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: generationMode === 'custom' ? '#ff922b' : '#e0e0e0',
              color: generationMode === 'custom' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5731b';
            }}
            onMouseLeave={(e) => {
              if (generationMode === 'custom') (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff922b';
            }}
          >
            Generate {studentCount} Custom Students
          </button>
        </div>
      </div>

      {/* Student Summary */}
      {selectedStudents.length > 0 && (
        <div
          style={{
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#e8f5e9',
            border: '1px solid #28a745',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <strong>✓ {selectedStudents.length} students generated</strong>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#333' }}>
            {generationMode === 'auto' && (
              <div>Standard distribution: Remember (2), Understand (4), Apply (6), Analyze (5), Evaluate (2), Create (1)</div>
            )}
            {generationMode === 'custom' && (
              <div>Custom distribution: {studentCount} students evenly distributed across Bloom levels</div>
            )}
          </div>
        </div>
      )}

      {/* Preview & Launch */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handlePreviewPayload}
          disabled={selectedStudents.length === 0 || isLoading}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: selectedStudents.length > 0 ? '#6c757d' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStudents.length > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          📋 Preview Payload
        </button>
        <button
          onClick={handleLaunchSimulation}
          disabled={selectedStudents.length === 0 || isLoading}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: selectedStudents.length > 0 ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStudents.length > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedStudents.length > 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#218838';
          }}
          onMouseLeave={(e) => {
            if (selectedStudents.length > 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#28a745';
          }}
        >
          {isLoading ? '🔄 Processing...' : '🚀 Launch Simulation'}
        </button>
      </div>

      {/* Payload Preview */}
      {previewPayload && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          <strong>Simulation Payload Preview:</strong>
          <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(previewPayload, null, 2).substring(0, 2000)}...
          </pre>
        </div>
      )}
    </div>
  );
}
