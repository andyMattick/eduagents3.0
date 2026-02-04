import { useState } from 'react';
import { PipelineStep, ClassDefinition } from '../../types/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { rewriteAssignment } from '../../agents/rewrite/rewriteAssignment';
import { simulateStudents } from '../../agents/simulation/simulateStudents';
import { AssignmentInput } from './AssignmentInput';
import { PromptBuilder } from './PromptBuilderSimplified';
import { ReviewMetadataForm, ReviewMetadata } from './ReviewMetadataForm';
import { ProblemAnalysis } from './ProblemAnalysis';
import { ClassBuilder } from './ClassBuilder';
import { StudentSimulations } from './StudentSimulations';
import { RewriteResults } from './RewriteResults';
import { AssignmentMetadata } from '../../agents/shared/assignmentMetadata';

export function PipelineShell() {
  const {
    step,
    originalText,
    rewrittenText,
    rewriteSummary,
    tags,
    studentFeedback,
    tagChanges,
    isLoading,
    error,
    versionAnalysis,
    rewrittenTags,
    asteroids,
    showProblemMetadata,
    analyzeTextAndTags,
    getFeedback,
    nextStep,
    reset,
    toggleProblemMetadataView,
    setAssignmentMetadata,
  } = usePipeline();

  const [input, setInput] = useState('');
  const [workflowMode, setWorkflowMode] = useState<'choose' | 'input' | 'builder'>('choose');
  const [reviewMetadata, setReviewMetadata] = useState<ReviewMetadata | null>(null);
  const [assignmentGradeLevel, setAssignmentGradeLevel] = useState('6-8');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [classDefinition, setClassDefinition] = useState<ClassDefinition | undefined>(undefined);

  const handleAssignmentGenerated = async (content: string, _metadata: AssignmentMetadata) => {
    // Feed the generated assignment into the analysis pipeline
    setInput('');
    setWorkflowMode('choose');
    await analyzeTextAndTags(content);
  };

  const handleDirectUpload = async (content: string) => {
    // Handle direct file upload - skip metadata form and go straight to analysis
    setInput('');
    setWorkflowMode('choose');
    
    // Use default metadata for direct uploads
    setAssignmentMetadata({
      gradeLevel: '6-8',
      subject: 'General',
      difficulty: 'intermediate',
    });
    
    await analyzeTextAndTags(content);
  };

  const handleMetadataSubmit = async (metadata: ReviewMetadata) => {
    setReviewMetadata(metadata);
    
    // Store metadata for student tag breakdown
    setAssignmentGradeLevel(Array.isArray(metadata.gradeLevel) ? metadata.gradeLevel[0].toString() : '6-8');
    setAssignmentSubject(metadata.subject || '');
    
    // Update pipeline state with metadata
    setAssignmentMetadata({
      gradeLevel: Array.isArray(metadata.gradeLevel) ? metadata.gradeLevel[0].toString() : '6-8',
      subject: metadata.subject || '',
      difficulty: 'intermediate',
    });
    
    // Clear input state (UI will automatically hide via step change when analysis completes)
    const textToAnalyze = input;
    setInput('');
    setWorkflowMode('choose');
    
    // Proceed with analysis - this will trigger step transition to PROBLEM_ANALYSIS
    await analyzeTextAndTags(textToAnalyze);
  };

  const handleNextStep = async () => {
    await nextStep();
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to start over? This will erase your current assignment and all analysis.'
    );
    if (confirmed) {
      setInput('');
      setWorkflowMode('choose');
      setReviewMetadata(null);
      setClassDefinition(undefined);
      reset();
    }
  };

  const handleRewriteWithSuggestions = async (suggestions: string) => {
    if (!suggestions.trim()) {
      alert('Please enter suggestions for rewriting the assignment.');
      return;
    }

    try {
      // Rewrite the assignment with the suggestions
      const result = await rewriteAssignment(originalText, tags);
      
      alert('✓ Assignment rewritten with your suggestions!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rewrite assignment';
      alert(`Error rewriting assignment: ${errorMessage}`);
    }
  };

  const handleReanalyzeStudents = async () => {
    try {
      // Re-simulate students with the current assignment
      const textToAnalyze = rewrittenText || originalText;
      const updatedFeedback = await simulateStudents(
        textToAnalyze,
        assignmentGradeLevel,
        assignmentSubject
      );

      alert('✓ Student analysis updated with latest assignment!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to re-analyze students';
      alert(`Error re-analyzing students: ${errorMessage}`);
    }
  };

  // For choosing workflow
  if (workflowMode === 'choose' && step === PipelineStep.INPUT) {
    return (
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>
            📝 Teacher's Assignment Studio
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Craft excellent assignments with AI assistance—your expertise, elevated
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            marginTop: '40px',
            maxWidth: '500px',
          }}
        >
          {/* Option: Build or Upload an Assignment */}
          <div
            onClick={() => setWorkflowMode('input')}
            style={{
              padding: '32px',
              backgroundColor: '#f0f7ff',
              border: '2px solid #007bff',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0, 123, 255, 0.2)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#007bff', fontSize: '24px' }}>
              📝 Build or Upload an Assignment
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#555', lineHeight: '1.6' }}>
              Create a new assignment or upload an existing one to get comprehensive feedback and analysis.
            </p>
            <ul style={{ margin: '16px 0', paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
              <li>Upload files or generate with AI</li>
              <li>Student feedback from 11 perspectives</li>
              <li>Accessibility insights</li>
              <li>AI-suggested improvements</li>
            </ul>
            <button
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main pipeline shell
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>
          📝 Assignment Pipeline
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Step {step + 1} of 6
        </p>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: step >= s ? '#007bff' : '#e0e0e0',
                  borderRadius: '2px',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
        {step > PipelineStep.INPUT && (
          <button
            onClick={handleReset}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ← Start Over
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* INPUT STEP: Choose between input or builder */}
      {step === PipelineStep.INPUT && workflowMode !== 'choose' && (
        <>
          {workflowMode === 'builder' && (
            <PromptBuilder onAssignmentGenerated={handleAssignmentGenerated} isLoading={isLoading} />
          )}

          {workflowMode === 'input' && (
            <>
              {/* Show metadata form if assignment is loaded but metadata not filled */}
              {input.trim() && !reviewMetadata && (
                <ReviewMetadataForm onSubmit={handleMetadataSubmit} isLoading={isLoading} />
              )}

              {/* Show assignment input only if no metadata is being collected */}
              {!reviewMetadata && (
                <>
                  <AssignmentInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleDirectUpload}
                    isLoading={isLoading}
                  />
                  <button
                    onClick={() => setWorkflowMode('choose')}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    ← Back to Options
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* When at INPUT step with choose mode, show workflow options */}
      {step === PipelineStep.INPUT && workflowMode === 'choose' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            marginTop: '40px',
            maxWidth: '500px',
          }}
        >
          {/* Option: Build or Upload an Assignment */}
          <div
            onClick={() => setWorkflowMode('input')}
            style={{
              padding: '32px',
              backgroundColor: '#f0f7ff',
              border: '2px solid #007bff',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0, 123, 255, 0.2)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#007bff', fontSize: '24px' }}>
              📝 Build or Upload an Assignment
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#555', lineHeight: '1.6' }}>
              Create a new assignment or upload an existing one to get comprehensive feedback and analysis.
            </p>
            <ul style={{ margin: '16px 0', paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
              <li>Upload files or generate with AI</li>
              <li>Student feedback from 11 perspectives</li>
              <li>Accessibility insights</li>
              <li>AI-suggested improvements</li>
            </ul>
            <button
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Get Started →
            </button>
          </div>
        </div>
      )}

      {step === PipelineStep.PROBLEM_ANALYSIS && (
        <ProblemAnalysis
          asteroids={asteroids}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.CLASS_BUILDER && (
        <ClassBuilder
          gradeLevel={assignmentGradeLevel}
          subject={assignmentSubject}
          classDefinition={classDefinition}
          onClassDefinitionChange={setClassDefinition}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.STUDENT_SIMULATIONS && (
        <StudentSimulations
          feedback={studentFeedback}
          isLoading={isLoading}
          onNext={handleNextStep}
          asteroids={asteroids}
        />
      )}

      {step === PipelineStep.REWRITE_RESULTS && (
        <RewriteResults
          originalText={originalText}
          rewrittenText={rewrittenText}
          summaryOfChanges={rewriteSummary}
          appliedTags={rewrittenTags}
          isLoading={isLoading}
          onNext={handleNextStep}
          asteroids={asteroids}
        />
      )}

      {step === PipelineStep.EXPORT && (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0 }}>Step 6: Export for Processing</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            Your assignment metadata and class definition are ready to be exported. Download them as JSON or CSV to send to your external processor.
          </p>
          <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '6px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Export Options</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const data = { asteroids, classDefinition };
                  const json = JSON.stringify(data, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `assignment-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
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
                📥 Export JSON
              </button>
              <button
                onClick={() => {
                  const lines = [
                    'Assignment Metadata + Class Definition',
                    new Date().toISOString(),
                    '',
                    'ASTEROIDS (Problems):',
                    JSON.stringify(asteroids, null, 2),
                    '',
                    'CLASS DEFINITION:',
                    JSON.stringify(classDefinition, null, 2),
                  ];
                  const text = lines.join('\n');
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `assignment-export-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                📄 Export Text
              </button>
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', borderLeft: '4px solid #28a745' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#2e7d32' }}>
              <strong>✓ Export Complete!</strong> Your assignment is ready for processing. The external processor will now run detailed simulations using this metadata and class definition.
            </p>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              ← Start New Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
