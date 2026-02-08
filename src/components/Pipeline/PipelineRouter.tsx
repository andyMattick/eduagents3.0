import { useUserFlow } from '../../hooks/useUserFlow';
import { GoalSelector } from './GoalSelector';
import { SourceSelector } from './SourceSelector';
import { FileUploadComponent } from './FileUploadComponent';
import { IntentCaptureComponent } from './IntentCaptureComponent';
import { AssignmentIntentForm } from './AssignmentIntentForm';
import { AssignmentPreview } from './AssignmentPreview';
import { ClassBuilder } from './ClassBuilder';
import { StudentSimulations } from './StudentSimulations';
import { AssignmentEditor } from './AssignmentEditor';
import { PipelineShell } from './PipelineShell';
import './PipelineRouter.css';

/**
 * PipelineRouter Component
 * Manages the complete user journey based on selections
 * Routes through:
 * 1. Goal Selection (Create vs Analyze)
 * 2. Source Selection (With docs vs Without)
 * 3. Document Upload or Intent Capture
 * 4. Generation/Analysis
 */
export function PipelineRouter() {
  const { 
    goal, 
    sourceFile, 
    assignmentFile, 
    intentData, 
    setSourceFile, 
    setAssignmentFile,
    sourceAwareIntentData,
    generatedAssignment,
    studentFeedback,
    setReadyForEditing,
    setGeneratedAssignment,
    setReadyForRewrite,
  } =
    useUserFlow();

  const currentRoute = useUserFlow().getCurrentRoute();

  // Log route changes for debugging
  console.log('PipelineRouter: currentRoute =', currentRoute, {
    sourceAwareIntentData: !!sourceAwareIntentData,
    generatedAssignment: !!generatedAssignment,
  });

  // Step 1: Goal Selection
  if (currentRoute === '/goal-selection') {
    return <GoalSelector />;
  }

  // Step 2: Source Selection
  if (currentRoute === '/source-selection') {
    return <SourceSelector />;
  }

  // Step 3: File Upload Routes
  if (currentRoute === '/source-upload') {
    if (goal === 'create') {
      return (
        <div className="pipeline-router-container">
          <div className="step-header">
            <h1>📤 Upload Source Materials</h1>
            <p>Upload textbooks, PDFs, or documents to extract assignment content from</p>
          </div>
          <FileUploadComponent
            title="Source Document"
            description="Upload PDF, Word, or text files containing the material for your assignment"
            onFileSelected={setSourceFile}
            selectedFileName={sourceFile?.name}
          />
          <div className="navigation-buttons">
            <button onClick={() => window.history.back()}>← Back</button>
          </div>
        </div>
      );
    } else {
      // analyze mode with source docs
      return (
        <div className="pipeline-router-container">
          <div className="step-header">
            <h1>📤 Upload Source & Assignment Materials</h1>
            <p>Upload both the source material and the assignment to analyze</p>
          </div>
          <FileUploadComponent
            title="Source Material"
            description="Upload the textbook, article, or reference material"
            onFileSelected={setSourceFile}
            selectedFileName={sourceFile?.name}
          />
          <FileUploadComponent
            title="Assignment File"
            description="Upload the assignment to be analyzed"
            onFileSelected={setAssignmentFile}
            selectedFileName={assignmentFile?.name}
          />
          <div className="navigation-buttons">
            <button onClick={() => window.history.back()}>← Back</button>
          </div>
        </div>
      );
    }
  }

  // Step 3: Intent Capture Route (no source docs)
  if (currentRoute === '/intent-capture') {
    return <IntentCaptureComponent />;
  }

  // Step 3: Source-Aware Intent Form (with source docs, create mode)
  if (currentRoute === '/source-aware-intent') {
    return <AssignmentIntentForm />;
  }

  // Step 3: Assignment Upload (analyze mode, no source docs)
  if (currentRoute === '/assignment-upload') {
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>📤 Upload Your Assignment</h1>
          <p>Upload the assignment file you want to analyze and optimize</p>
        </div>
        <FileUploadComponent
          title="Assignment File"
          description="Upload PDF, Word, or text file containing your assignment"
          onFileSelected={setAssignmentFile}
          selectedFileName={assignmentFile?.name}
        />
        <div className="navigation-buttons">
          <button onClick={() => window.history.back()}>← Back</button>
        </div>
      </div>
    );
  }

  // Step 4+: Generation/Analysis Routes
  // Show assignment preview after generation (source-aware create flow)
  if (currentRoute === '/assignment-preview') {
    return <AssignmentPreview />;
  }

  // Navigate to ClassBuilder (page 5 of 8: Classroom Setup)
  if (currentRoute === '/class-builder') {
    if (!generatedAssignment) {
      return (
        <div className="pipeline-router-container">
          <div className="error-state">
            <h2>⚠️ No Assignment</h2>
            <p>Please generate an assignment first</p>
            <button onClick={() => window.history.back()}>← Back</button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>🛰️ Page 5 of 8: Classroom Setup</h1>
          <p>Configure your classroom and select student personas to analyze</p>
        </div>
        <ClassBuilder
          subject={generatedAssignment.topic}
          onClassDefinitionChange={(classDefinition) => {
            console.log('Class defined:', classDefinition);
          }}
          onNext={() => {
            console.log('Moving to simulation/rewrite step');
          }}
        />
      </div>
    );
  }

  // Classroom Simulation Results - Show feedback from mock simulation
  if (currentRoute === '/rewrite-assignment') {
    const { setReadyForClassroomAnalysis } = useUserFlow();
    
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>Page 6 of 8: Student Simulation Results</h1>
          <p>Review simulated student feedback and prepare assignment improvements</p>
        </div>
        <StudentSimulations
          feedback={studentFeedback}
          completionSimulations={{
            studentSimulations: [],
            classSummary: {},
          }}
          onNext={() => {
            console.log('Proceeding to rewriter');
            setReadyForClassroomAnalysis(false); // Reset for next flow
          }}
        />
        <div className="simulation-actions" style={{ marginTop: '2rem', maxWidth: '900px', margin: '2rem auto 0' }}>
          <button
            className="button-secondary"
            onClick={() => setReadyForEditing(true)}
            style={{ marginRight: '1rem' }}
          >
            ✏️ Edit Assignment
          </button>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Review and modify specific problems or sections based on student feedback
          </p>
        </div>
      </div>
    );
  }

  // Assignment Editing - Modify sections and problems based on feedback
  if (currentRoute === '/edit-assignment') {
    if (!generatedAssignment) {
      return (
        <div className="pipeline-router-container">
          <div className="error-state">
            <h2>⚠️ No Assignment</h2>
            <p>Please generate an assignment first</p>
            <button onClick={() => window.history.back()}>← Back</button>
          </div>
        </div>
      );
    }

    return (
      <AssignmentEditor
        assignment={generatedAssignment}
        studentFeedback={studentFeedback}
        onSave={(updatedAssignment) => {
          setGeneratedAssignment(updatedAssignment);
          console.log('💾 Assignment updated:', updatedAssignment);
          setReadyForEditing(false);
        }}
        onNext={() => {
          console.log('Moving to rewriter');
          setReadyForEditing(false);
          setReadyForRewrite(true);
        }}
      />
    );
  }

  // AI Rewrite Placeholder - Will be replaced with actual rewriter when AI service is ready
  if (currentRoute === '/ai-rewrite-placeholder') {
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>⏳ Page 7 of 8: AI Rewrite (Coming Soon)</h1>
          <p>When AI service is integrated, the assignment will be automatically rewritten here</p>
        </div>
        <div style={{
          maxWidth: '900px',
          margin: '2rem auto',
          padding: '2rem',
          background: 'var(--color-bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <h2>🤖 AI Rewrite Engine</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            The AI rewriter will process the assignment and student feedback to:
          </p>
          <ul style={{
            textAlign: 'left',
            display: 'inline-block',
            fontSize: '1rem',
          }}>
            <li>✨ Simplify complex language</li>
            <li>🎯 Break down multi-part problems</li>
            <li>📊 Balance difficulty distribution</li>
            <li>♿ Generate accessible variants</li>
            <li>💡 Add targeted scaffolding</li>
          </ul>
          <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
            <strong>Status:</strong> Awaiting AI service integration
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="button-secondary"
              onClick={() => setReadyForEditing(true)}
            >
              ← Edit Assignment Again
            </button>
            <button
              className="button-primary"
              onClick={() => console.log('Ready for AI rewrite when service is available')}
            >
              Continue (AI Service Ready Soon)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Student creation/profile selection screen
  if (currentRoute === '/student-creation') {
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>👥 Create Student Profiles</h1>
          <p>Create or select student profiles to analyze how they interact with this assignment</p>
        </div>
        {/* TODO: Integrate StudentProfileCreation component here */}
        {/* This will receive generatedAssignment via useUserFlow */}
        <div className="placeholder-message">
          <p>🚧 Student profile creation component coming soon</p>
          <p>Assignment is ready to be analyzed with student personas</p>
          <button onClick={() => window.history.back()}>← Back</button>
        </div>
      </div>
    );
  }
  if (currentRoute === '/generate-assignment') {
    return (
      <PipelineShell
        goal={goal === 'create' ? 'create' : undefined}
        sourceFile={sourceFile || undefined}
        intentData={intentData || undefined}
        onFlowComplete={(result) => {
          // Optional: Handle completion
          // e.g., navigate to final review, show success message
          console.log('Assignment generated:', result);
        }}
      />
    );
  }

  if (currentRoute === '/analyze-assignment') {
    return (
      <PipelineShell
        goal={'analyze'}
        sourceFile={sourceFile || undefined}
        assignmentFile={assignmentFile || undefined}
        onFlowComplete={(result) => {
          console.log('Assignment analyzed:', result);
        }}
      />
    );
  }

  // Fallback
  return (
    <div className="pipeline-router-container">
      <div className="error-state">
        <h2>⚠️ Unknown Route</h2>
        <p>Current route: {currentRoute}</p>
      </div>
    </div>
  );
}
