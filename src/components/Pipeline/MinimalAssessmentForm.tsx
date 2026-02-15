/**
 * MinimalAssessmentForm.tsx
 * 
 * Clean-break minimal assessment form
 * 4 core decisions + optional advanced settings
 */

import { useState } from 'react';
import './MinimalAssessmentForm.css';

export type StudentLevel = 'Remedial' | 'Standard' | 'Honors' | 'AP';
export type AssessmentType = 'Quiz' | 'Test' | 'Practice';
export type Emphasis = 'Conceptual' | 'Procedural' | 'ExamStyle';
export type DifficultyProfile = 'Scaffolded' | 'Balanced' | 'Challenging';

export interface AssessmentIntent {
  sourceFile?: File;
  sourceTopic?: string;
  studentLevel: StudentLevel;
  assessmentType: AssessmentType;
  timeMinutes: number;
  focusAreas?: string[];
  emphasis?: Emphasis;
  difficultyProfile?: DifficultyProfile;
  classroomContext?: string;
}

interface MinimalAssessmentFormProps {
  onSubmit: (intent: AssessmentIntent) => void;
  isLoading?: boolean;
}

export function MinimalAssessmentForm({ onSubmit, isLoading = false }: MinimalAssessmentFormProps) {
  // Core state
  const [sourceMode, setSourceMode] = useState<'upload' | 'topic' | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceTopic, setSourceTopic] = useState('');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('Standard');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('Quiz');
  const [timeMinutes, setTimeMinutes] = useState(30);

  // Advanced state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusAreas, setFocusAreas] = useState('');
  const [emphasis, setEmphasis] = useState<Emphasis>('Conceptual');
  const [difficultyProfile, setDifficultyProfile] = useState<DifficultyProfile>('Balanced');
  const [classroomContext, setClassroomContext] = useState('');

  // Validation
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const newErrors: string[] = [];

    // Validate source
    if (!sourceMode) {
      newErrors.push('Please select a source type');
    } else if (sourceMode === 'upload' && !sourceFile) {
      newErrors.push('Please upload a document');
    } else if (sourceMode === 'topic' && !sourceTopic.trim()) {
      newErrors.push('Please enter a topic');
    }

    // Validate required fields
    if (!studentLevel) newErrors.push('Please select a student level');
    if (!assessmentType) newErrors.push('Please select an assessment type');
    if (!timeMinutes || timeMinutes < 5 || timeMinutes > 480) {
      newErrors.push('Time must be between 5 and 480 minutes');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build intent
    const intent: AssessmentIntent = {
      sourceFile: sourceMode === 'upload' ? sourceFile || undefined : undefined,
      sourceTopic: sourceMode === 'topic' ? sourceTopic : undefined,
      studentLevel,
      assessmentType,
      timeMinutes,
      focusAreas: focusAreas.trim() ? focusAreas.split('\n').filter(s => s.trim()) : undefined,
      emphasis: showAdvanced ? emphasis : undefined,
      difficultyProfile: showAdvanced ? difficultyProfile : undefined,
      classroomContext: showAdvanced && classroomContext.trim() ? classroomContext : undefined,
    };

    console.log('📋 Form submitted:', intent);
    onSubmit(intent);
  };

  if (isLoading) {
    return (
      <div className="minimal-form-container loading-state">
        <div className="loading-content">
          <div className="loading-icon">🧠</div>
          <h2>Generating Assessment</h2>
          <ul className="loading-steps">
            <li>Designing structure</li>
            <li>Simulating student performance</li>
            <li>Refining difficulty</li>
            <li>Finalizing document</li>
          </ul>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="minimal-form-container">
      <div className="form-header">
        <h1>✨ Create Assessment</h1>
        <p>Tell us your needs. We'll handle the rest.</p>
      </div>

      <div className="form-body">
        {/* 1. Source */}
        <div className="form-section">
          <div className="section-label">
            <span className="section-number">1️⃣</span>
            <span className="section-title">Source</span>
          </div>
          <div className="source-buttons">
            <button
              className={`source-btn ${sourceMode === 'upload' ? 'active' : ''}`}
              onClick={() => {
                setSourceMode('upload');
                setSourceTopic('');
              }}
            >
              📄 Upload Document
            </button>
            <button
              className={`source-btn ${sourceMode === 'topic' ? 'active' : ''}`}
              onClick={() => {
                setSourceMode('topic');
                setSourceFile(null);
              }}
            >
              ✏️ Enter Topic
            </button>
          </div>

          {sourceMode === 'upload' && (
            <div className="source-upload">
              <input
                type="file"
                id="file-input"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                <div className="upload-icon">📤</div>
                <p>Drag & drop or click to upload</p>
                {sourceFile && <p className="file-name">✓ {sourceFile.name}</p>}
              </label>
            </div>
          )}

          {sourceMode === 'topic' && (
            <input
              type="text"
              placeholder="e.g., 'Chapter 7: Sampling Distributions'"
              value={sourceTopic}
              onChange={(e) => setSourceTopic(e.target.value)}
              className="topic-input"
            />
          )}
        </div>

        {/* 2. Student Level */}
        <div className="form-section">
          <div className="section-label">
            <span className="section-number">2️⃣</span>
            <span className="section-title">Student Level</span>
          </div>
          <select
            value={studentLevel}
            onChange={(e) => setStudentLevel(e.target.value as StudentLevel)}
            className="form-select"
          >
            <option value="Remedial">Remedial</option>
            <option value="Standard">Standard</option>
            <option value="Honors">Honors</option>
            <option value="AP">AP / College</option>
          </select>
        </div>

        {/* 3. Assessment Type */}
        <div className="form-section">
          <div className="section-label">
            <span className="section-number">3️⃣</span>
            <span className="section-title">Assessment Type</span>
          </div>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
            className="form-select"
          >
            <option value="Quiz">Quiz</option>
            <option value="Test">Test</option>
            <option value="Practice">Practice</option>
          </select>
        </div>

        {/* 4. Time */}
        <div className="form-section">
          <div className="section-label">
            <span className="section-number">4️⃣</span>
            <span className="section-title">Estimated Time</span>
          </div>
          <div className="time-group">
            <input
              type="number"
              min="5"
              max="480"
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 30)}
              className="time-input"
            />
            <span className="time-unit">minutes</span>
          </div>
        </div>

        {/* Advanced Section */}
        <div className="advanced-section">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="advanced-content">
              <div className="form-section">
                <label className="field-label">Focus Areas</label>
                <textarea
                  placeholder="Enter focus areas (one per line)"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div className="form-section">
                <label className="field-label">Emphasis</label>
                <select
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value as Emphasis)}
                  className="form-select"
                >
                  <option value="Conceptual">Conceptual Understanding</option>
                  <option value="Procedural">Procedural Fluency</option>
                  <option value="ExamStyle">Exam Style</option>
                </select>
              </div>

              <div className="form-section">
                <label className="field-label">Difficulty Profile</label>
                <select
                  value={difficultyProfile}
                  onChange={(e) => setDifficultyProfile(e.target.value as DifficultyProfile)}
                  className="form-select"
                >
                  <option value="Scaffolded">Scaffolded (easier start)</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Challenging">Challenging (harder start)</option>
                </select>
              </div>

              <div className="form-section">
                <label className="field-label">Classroom Context</label>
                <textarea
                  placeholder="e.g., 'Mixed ability class with ELL students'"
                  value={classroomContext}
                  onChange={(e) => setClassroomContext(e.target.value)}
                  className="form-textarea"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="error-section">
            {errors.map((error, i) => (
              <div key={i} className="error-item">
                ⚠️ {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="form-footer">
        <button onClick={handleSubmit} disabled={isLoading} className="submit-btn">
          🚀 Generate Assessment
        </button>
      </div>
    </div>
  );
}
