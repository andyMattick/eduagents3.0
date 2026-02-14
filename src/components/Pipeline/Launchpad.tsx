import { useState } from 'react';
import { useUserFlow } from '../../hooks/useUserFlow';
import './Launchpad.css';

/**
 * Launchpad — Unified Mission Setup Screen
 * 
 * Consolidates all Phase 1 entry point selections into a single, cohesive screen:
 * - Goal selection (Create vs Analyze)
 * - Source selection (With docs vs Without)
 * - Metadata capture (Grade, Subject, Class Level)
 * - Time target
 * - Document upload
 */
export function Launchpad() {
  const {
    goal,
    setGoal,
    hasSourceDocs,
    setHasSourceDocs,
    sourceFile,
    setSourceFile,
    intentData,
    setIntentData,
  } = useUserFlow();

  const [step, setStep] = useState<'goal' | 'source' | 'metadata' | 'upload' | 'review'>('goal');
  const [gradeBand, setGradeBand] = useState(intentData?.gradeLevel || '6-8');
  const [subject, setSubject] = useState(intentData?.topic || '');
  const [classLevel, setClassLevel] = useState<'Standard' | 'Honors' | 'AP'>('Standard');
  const [timeTarget, setTimeTarget] = useState(intentData?.bloomTargets?.[0] || 'Mathematics');
  const [uploadedFile, setUploadedFile] = useState<File | null>(sourceFile || null);
  const [errors, setErrors] = useState<string[]>([]);

  const gradeBands = ['K-2', '3-5', '6-8', '9-12', 'College'];
  const subjects = [
    'Mathematics',
    'English Language Arts',
    'Science',
    'Social Studies',
    'History',
    'Arts',
    'Physical Education',
    'Other',
  ];

  const handleStartMission = async () => {
    const newErrors: string[] = [];

    // Validate
    if (!goal) newErrors.push('Please select a goal (Create or Analyze)');
    if (hasSourceDocs === null) newErrors.push('Please select source document option');
    if (!gradeBand) newErrors.push('Please select a grade band');
    if (!subject) newErrors.push('Please select a subject');
    if (!timeTarget) newErrors.push('Please enter a time target');
    if (hasSourceDocs && !uploadedFile) newErrors.push('Please upload a document');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save to pipeline state
    setSourceFile(uploadedFile);
    setIntentData({
      topic: subject,
      gradeLevel: gradeBand,
      assignmentType: classLevel === 'AP' ? 'AP Assessment' : classLevel === 'Honors' ? 'Honors Quiz' : 'Standard Quiz',
      bloomTargets: [timeTarget],
    });

    console.log('🚀 Mission launched:', {
      goal,
      hasSourceDocs,
      gradeBand,
      subject,
      classLevel,
      timeTarget,
      sourceFile: uploadedFile?.name,
    });
  };

  return (
    <div className="launchpad">
      <div className="launchpad-container">
        {/* Rocket Header */}
        <div className="launchpad-header">
          <div className="rocket-icon">🚀</div>
          <h1>Mission Control: Classroom Assessment Setup</h1>
          <p>Configure your assignment mission parameters. Then launch.</p>
        </div>

        {/* Step Progress */}
        <div className="launchpad-progress">
          <div className={`step ${step === 'goal' ? 'active' : 'complete'}`}>
            <span className="step-number">1</span>
            <span className="step-label">Goal</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'source' ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Source</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'metadata' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Metadata</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'upload' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Upload</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'review' ? 'active' : ''}`}>
            <span className="step-number">5</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        {/* Step 1: Goal Selection */}
        {step === 'goal' && (
          <div className="launchpad-step">
            <h2>Step 1: What's Your Mission?</h2>
            <p className="step-description">Choose whether you want to create a new assignment or analyze an existing one</p>

            <div className="launchpad-choice-grid">
              <button
                className={`launchpad-choice ${goal === 'create' ? 'selected' : ''}`}
                onClick={() => {
                  setGoal('create');
                  setStep('source');
                }}
              >
                <div className="choice-icon">📝</div>
                <div className="choice-title">Create Assignment</div>
                <div className="choice-description">Build a new assessment from scratch</div>
              </button>

              <button
                className={`launchpad-choice ${goal === 'analyze' ? 'selected' : ''}`}
                onClick={() => {
                  setGoal('analyze');
                  setStep('source');
                }}
              >
                <div className="choice-icon">🔍</div>
                <div className="choice-title">Analyze Assignment</div>
                <div className="choice-description">Improve an existing assignment</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Source Selection */}
        {step === 'source' && (
          <div className="launchpad-step">
            <h2>Step 2: Do You Have Source Materials?</h2>
            <p className="step-description">Source materials help AI generate more relevant questions</p>

            <div className="launchpad-choice-grid">
              <button
                className={`launchpad-choice ${hasSourceDocs === true ? 'selected' : ''}`}
                onClick={() => {
                  setHasSourceDocs(true);
                  setStep('metadata');
                }}
              >
                <div className="choice-icon">📎</div>
                <div className="choice-title">Yes, I Have Materials</div>
                <div className="choice-description">Upload textbooks, PDFs, articles</div>
              </button>

              <button
                className={`launchpad-choice ${hasSourceDocs === false ? 'selected' : ''}`}
                onClick={() => {
                  setHasSourceDocs(false);
                  setStep('metadata');
                }}
              >
                <div className="choice-icon">✨</div>
                <div className="choice-title">No, Generate from Scratch</div>
                <div className="choice-description">I'll describe what I need</div>
              </button>
            </div>

            <button className="launchpad-back" onClick={() => setStep('goal')}>
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Metadata */}
        {step === 'metadata' && (
          <div className="launchpad-step">
            <h2>Step 3: Classroom Context</h2>
            <p className="step-description">Tell us about your class so we can customize the assignment</p>

            <div className="launchpad-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Grade Band</label>
                  <select value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
                    {gradeBands.map((band) => (
                      <option key={band} value={band}>
                        {band}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="">Select a subject...</option>
                    {subjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Class Level</label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value as 'Standard' | 'Honors' | 'AP')}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Honors">Honors</option>
                    <option value="AP">AP</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Estimated Time on Task (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={timeTarget}
                    onChange={(e) => setTimeTarget(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            <div className="launchpad-buttons">
              <button className="launchpad-back" onClick={() => setStep('source')}>
                ← Back
              </button>
              <button
                className="launchpad-next"
                onClick={() => setStep(hasSourceDocs ? 'upload' : 'review')}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Upload (conditional) */}
        {step === 'upload' && hasSourceDocs && (
          <div className="launchpad-step">
            <h2>Step 4: Upload Source Material</h2>
            <p className="step-description">
              Upload a PDF, Word document, or text file that will be used to generate questions
            </p>

            <div className="launchpad-upload">
              <label className="upload-box">
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.docx,.txt,.doc"
                />
                <div className="upload-content">
                  <div className="upload-icon">📤</div>
                  <div className="upload-text">
                    {uploadedFile ? (
                      <>
                        <strong>✓ {uploadedFile.name}</strong>
                        <p>Click to change file</p>
                      </>
                    ) : (
                      <>
                        <strong>Click to upload or drag and drop</strong>
                        <p>PDF, Word, or TXT files up to 50MB</p>
                      </>
                    )}
                  </div>
                </div>
              </label>
            </div>

            <div className="launchpad-buttons">
              <button className="launchpad-back" onClick={() => setStep('metadata')}>
                ← Back
              </button>
              <button className="launchpad-next" onClick={() => setStep('review')}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 'review' && (
          <div className="launchpad-step">
            <h2>Step 5: Mission Parameters Ready</h2>
            <p className="step-description">Review your settings before launching</p>

            <div className="launchpad-summary">
              <div className="summary-item">
                <span className="summary-label">Goal:</span>
                <span className="summary-value">
                  {goal === 'create' ? '📝 Create Assignment' : '🔍 Analyze Assignment'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Grade Band:</span>
                <span className="summary-value">{gradeBand}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Subject:</span>
                <span className="summary-value">{subject}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Class Level:</span>
                <span className="summary-value">{classLevel}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Time Target:</span>
                <span className="summary-value">{timeTarget} minutes</span>
              </div>
              {uploadedFile && (
                <div className="summary-item">
                  <span className="summary-label">Source Material:</span>
                  <span className="summary-value">{uploadedFile.name}</span>
                </div>
              )}
            </div>

            {errors.length > 0 && (
              <div className="launchpad-errors">
                {errors.map((err, i) => (
                  <div key={i} className="error-item">
                    ⚠️ {err}
                  </div>
                ))}
              </div>
            )}

            <div className="launchpad-buttons">
              <button
                className="launchpad-back"
                onClick={() => setStep(hasSourceDocs ? 'upload' : 'metadata')}
              >
                ← Back
              </button>
              <button className="launchpad-launch" onClick={handleStartMission}>
                🚀 Launch Mission
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
