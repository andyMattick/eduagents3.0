import { useUserFlow } from '../../hooks/useUserFlow';
import { GoalSelector } from './GoalSelector';
import { SourceSelector } from './SourceSelector';
import { FileUploadComponent } from './FileUploadComponent';
import { IntentCaptureComponent } from './IntentCaptureComponent';
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
  const { goal, hasSourceDocs, sourceFile, assignmentFile, intentData, setSourceFile, setAssignmentFile } =
    useUserFlow();

  const currentRoute = useUserFlow().getCurrentRoute();

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

  // Step 3: Intent Capture Route
  if (currentRoute === '/intent-capture') {
    return <IntentCaptureComponent />;
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
  // These would be connected to your existing PipelineShell components
  if (currentRoute === '/generate-assignment') {
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>✨ Generating Your Assignment</h1>
          <p>
            {hasSourceDocs
              ? 'Extracting problems from your source materials...'
              : 'Creating assignment from your learning objectives...'}
          </p>
        </div>
        <div className="placeholder-message">
          <p>🔄 Connect PipelineShell here for assignment generation</p>
          <p className="subtle">Goal: {goal}</p>
          <p className="subtle">Has Source Docs: {hasSourceDocs ? 'Yes' : 'No'}</p>
          {intentData && (
            <>
              <p className="subtle">Topic: {intentData.topic}</p>
              <p className="subtle">Grade Level: {intentData.gradeLevel}</p>
              <p className="subtle">Type: {intentData.assignmentType}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (currentRoute === '/analyze-assignment') {
    return (
      <div className="pipeline-router-container">
        <div className="step-header">
          <h1>🔍 Analyzing Your Assignment</h1>
          <p>Testing against student personas and optimizing for clarity and engagement...</p>
        </div>
        <div className="placeholder-message">
          <p>🔄 Connect PipelineShell here for assignment analysis</p>
          <p className="subtle">Goal: {goal}</p>
          <p className="subtle">Has Source Docs: {hasSourceDocs ? 'Yes' : 'No'}</p>
        </div>
      </div>
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
