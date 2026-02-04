import React from 'react';
import { ClassDefinition } from '../../types/pipeline';
import { StudentProfile, ProblemProfile, ClassroomSimulationPayload } from '../../types/classroomProfiles';
import { generateStudentProfile, generateClassroom, generateCustomClassroom } from '../../agents/simulation/generateStudentProfiles';
import { StudentProfileCard } from './StudentProfileCard';

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
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<Set<string>>(new Set());

  // Generate classroom using standard distribution
  const handleGenerateStandard = () => {
    const students = generateClassroom();
    setSelectedStudents(students);
    setSelectedStudentIds(new Set(students.map(s => s.StudentId)));
    setGenerationMode('auto');
  };

  // Generate classroom with custom count
  const handleGenerateCustom = () => {
    const students = generateCustomClassroom(studentCount);
    setSelectedStudents(students);
    setSelectedStudentIds(new Set(students.map(s => s.StudentId)));
    setGenerationMode('custom');
  };

  // Toggle student selection
  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
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
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student');
      return;
    }

    const studentsToSimulate = selectedStudents.filter(s => selectedStudentIds.has(s.StudentId));

    const payload: ClassroomSimulationPayload = {
      problems: problems,
      students: studentsToSimulate,
    };

    // Update class definition and proceed
    const updatedClass: ClassDefinition = {
      name: className,
      studentProfiles: studentsToSimulate,
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
            
            {generationMode === 'custom' && (
              <div>Custom distribution: {studentCount} students evenly distributed across Bloom levels</div>
            )}
            
          </div>
        </div>
      )}

      {/* Student Profile Cards Grid */}
      {selectedStudents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: '0', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#666' }}>
            👥 Student Profiles ({selectedStudentIds.size} selected)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              maxHeight: '600px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {selectedStudents.map((student) => (
              <StudentProfileCard
                key={student.StudentId}
                student={student}
                isSelected={selectedStudentIds.has(student.StudentId)}
                onToggle={handleToggleStudent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview & Launch */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handlePreviewPayload}
          disabled={selectedStudentIds.size === 0 || isLoading}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: selectedStudentIds.size > 0 ? '#6c757d' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStudentIds.size > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          📋 Preview Payload
        </button>
        <button
          onClick={handleLaunchSimulation}
          disabled={selectedStudentIds.size === 0 || isLoading}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: selectedStudentIds.size > 0 ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStudentIds.size > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedStudentIds.size > 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#218838';
          }}
          onMouseLeave={(e) => {
            if (selectedStudentIds.size > 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#28a745';
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
