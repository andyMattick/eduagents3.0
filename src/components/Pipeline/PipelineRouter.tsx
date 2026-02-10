import { useState, useEffect } from 'react';
import { useUserFlow } from '../../hooks/useUserFlow';
import { useAuth } from '../../hooks/useAuth';
import { getAssignment } from '../../services/teacherSystemService';
import { GoalSelector } from './GoalSelector';
import { SourceSelector } from './SourceSelector';
import { FileUploadComponent } from './FileUploadComponent';
import { IntentCaptureComponent } from './IntentCaptureComponent';
import { AssignmentAnalysisComponent } from './AssignmentAnalysisComponent';
import { AssignmentIntentForm } from './AssignmentIntentForm';
import { AssignmentPreview } from './AssignmentPreview';
import { ClassBuilder } from './ClassBuilder';
import { StudentSimulations } from './StudentSimulations';
import { AssignmentEditor } from './AssignmentEditor';
import { PipelineShell } from './PipelineShell';
import { SaveAssignmentStep } from './SaveAssignmentStep';
import './PipelineRouter.css';

interface AssignmentContext {
  assignmentId: string;
  action: 'view' | 'edit' | 'clone';
}

interface PipelineRouterProps {
  onAssignmentSaved?: () => void;
  assignmentContext?: AssignmentContext | null;
}

/**
 * PipelineRouter Component
 * Manages the complete user journey based on selections
 * Routes through:
 * 1. Goal Selection (Create vs Analyze)
 * 2. Source Selection (With docs vs Without)
 * 3. Document Upload or Intent Capture
 * 4. Generation/Analysis
 */
export function PipelineRouter({ onAssignmentSaved, assignmentContext }: PipelineRouterProps = {}) {
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
    setReadyForClassroomAnalysis,
  } =
    useUserFlow();

  const { user } = useAuth();
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentRoute = useUserFlow().getCurrentRoute();

  // Load assignment if assignmentContext is provided
  useEffect(() => {
    if (assignmentContext && user?.id) {
      loadAssignmentForEditing();
    }
  }, [assignmentContext?.assignmentId]);

  async function loadAssignmentForEditing() {
    if (!assignmentContext || !user?.id) return;

    try {
      setIsLoadingAssignment(true);
      setLoadError(null);
      
      // Load the assignment from database
      const assignment = await getAssignment(assignmentContext.assignmentId, user.id);
      
      if (!assignment) {
        setLoadError('Assignment not found');
        return;
      }

      // Convert database format to GeneratedAssignment format
      const generatedAssignment = assignment.content || assignment;
      
      if (assignmentContext.action === 'clone') {
        // For clone: load it but set as new (no ID)
        setGeneratedAssignment({
          ...generatedAssignment,
          id: undefined,
          title: `${generatedAssignment.title} (Copy)`,
        });
        setReadyForEditing(true);
      } else if (assignmentContext.action === 'edit') {
        // For edit: load it as-is
        setGeneratedAssignment(generatedAssignment);
        setReadyForEditing(true);
      } else {
        // For view: load it read-only
        setGeneratedAssignment(generatedAssignment);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load assignment');
      console.error('Error loading assignment:', err);
    } finally {
      setIsLoadingAssignment(false);
    }
  }

  // If loading assignment, show loading state
  if (isLoadingAssignment) {
    return (
      <div className="pipeline-router-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  // If assignment context exists and loaded, show the appropriate view
  if (assignmentContext && generatedAssignment && !isLoadingAssignment) {
    if (assignmentContext.action === 'view') {
      // View mode: show assignment preview
      return (
        <div className="pipeline-router-container">
          <div className="step-header">
            <h1>📖 View Assignment</h1>
            <p>{generatedAssignment.title}</p>
          </div>
          <AssignmentPreview />
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={onAssignmentSaved} className="btn-primary">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      );
    } else if (assignmentContext.action === 'edit' || assignmentContext.action === 'clone') {
      // Edit mode: show editor
      return (
        <div className="pipeline-router-container">
          <div className="step-header">
            <h1>✏️ {assignmentContext.action === 'clone' ? 'Clone' : 'Edit'} Assignment</h1>
            <p>{generatedAssignment.title}</p>
          </div>
          <AssignmentEditor
            assignment={generatedAssignment}
            studentFeedback={studentFeedback}
            onSave={(updatedAssignment) => {
              setGeneratedAssignment(updatedAssignment);
              console.log('💾 Assignment updated:', updatedAssignment);
            }}
            onNext={() => {
              // After editing, offer to save
              console.log('Moving to save step');
              setReadyForRewrite(true);
            }}
            onBack={() => {
              // Clear context and go back to dashboard
              onAssignmentSaved?.();
            }}
          />
        </div>
      );
    }
  }

  // If there's a load error, show it
  if (loadError) {
    return (
      <div className="pipeline-router-container error-state">
        <h2>⚠️ Error</h2>
        <p>{loadError}</p>
        <button onClick={onAssignmentSaved} className="btn-primary">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

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

  // Step 4: Assignment Analysis (analyze mode - both with or without source docs)
  if (currentRoute === '/assignment-analysis') {
    return <AssignmentAnalysisComponent />;
  }

  // Step 5+: Generation/Analysis Routes
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
    const { setReadyForRewrite } = useUserFlow();
    
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
            setReadyForRewrite(true);
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
          console.log('Moving to next step');
          setReadyForEditing(false);
          
          // If no student feedback yet, go to classroom analysis
          if (studentFeedback.length === 0) {
            setReadyForClassroomAnalysis(true);
          } else {
            // If they already have feedback, go to rewrite
            setReadyForRewrite(true);
          }
        }}
        onBack={() => {
          setReadyForEditing(false);
          // This will route back to either preview or results depending on context
        }}
      />
    );
  }

  // Final Save Step - Save assignment to database
  if (currentRoute === '/ai-rewrite-placeholder') {
    const { reset, setReadyForRewrite } = useUserFlow();

    if (!generatedAssignment) {
      return (
        <div className="pipeline-router-container error-state">
          <h2>No assignment to save</h2>
          <button onClick={() => reset()}>Start Over</button>
        </div>
      );
    }

    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>Page 7 of 8: Save Assignment</h1>
          <p>Save your finalized assignment to your teacher dashboard</p>
        </div>
        <SaveAssignmentStep
          assignment={generatedAssignment}
          onSaveComplete={() => {
            reset();
            // Call callback to notify parent that save is complete
            if (onAssignmentSaved) {
              onAssignmentSaved();
            } else {
              // Fallback: full page redirect if no callback provided
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            }
          }}
          onCancel={() => setReadyForRewrite(false)}
        />
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

  // This route is removed - analyze now uses the new /assignment-analysis component

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
