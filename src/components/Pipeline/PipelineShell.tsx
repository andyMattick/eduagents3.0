import { useState } from 'react';
import { PipelineStep } from '../../types/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { AssignmentInput } from './AssignmentInput';
import { PromptBuilder } from './PromptBuilderSimplified';
import { ReviewMetadataForm, ReviewMetadata } from './ReviewMetadataForm';
import { TagAnalysis } from './TagAnalysis';
import { StudentTagBreakdown, StudentTagSelection } from './StudentTagBreakdown';
import { StudentSimulations } from './StudentSimulations';
import { RewriteResults } from './RewriteResults';
import { VersionComparison } from './VersionComparison';
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
    analyzeTextAndTags,
    getFeedback,
    nextStep,
    reset,
  } = usePipeline();

  const [input, setInput] = useState('');
  const [workflowMode, setWorkflowMode] = useState<'choose' | 'input' | 'builder'>('choose');
  const [reviewMetadata, setReviewMetadata] = useState<ReviewMetadata | null>(null);
  const [showStudentTagBreakdown, setShowStudentTagBreakdown] = useState(false);
  const [assignmentGradeLevel, setAssignmentGradeLevel] = useState('6-8');
  const [assignmentSubject, setAssignmentSubject] = useState('');

  const handleAssignmentGenerated = async (content: string, _metadata: AssignmentMetadata) => {
    // Feed the generated assignment into the analysis pipeline
    setInput(content);
    await analyzeTextAndTags(content);
  };
  const handleMetadataSubmit = async (metadata: ReviewMetadata) => {
    setReviewMetadata(metadata);
    // Store metadata for student tag breakdown
    setAssignmentGradeLevel(metadata.gradeLevel || '6-8');
    setAssignmentSubject(metadata.subject || '');
    // Update pipeline state with metadata
    // Now proceed with analysis
    await analyzeTextAndTags(input);
  };

  const handleNextStep = async () => {
    // If we're at TAG_ANALYSIS step, show student tag breakdown before continuing
    if (step === PipelineStep.TAG_ANALYSIS && !showStudentTagBreakdown) {
      setShowStudentTagBreakdown(true);
      return;
    }
    await nextStep();
  };

  const handleStudentTagSelection = async (selection: StudentTagSelection) => {
    setShowStudentTagBreakdown(false);
    // Call getFeedback with selected tags
    await getFeedback(selection.tags);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to start over? This will erase your current assignment and all analysis.'
    );
    if (confirmed) {
      setInput('');
      setWorkflowMode('choose');
      setShowStudentTagBreakdown(false);
      reset();
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
          Step {step + 1} of 5
        </p>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2, 3, 4].map((s) => (
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
      {step === PipelineStep.INPUT && (
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
                    onSubmit={(text) => {
                      setInput(text);
                      handleMetadataSubmit(reviewMetadata || { gradeLevel: [], subject: '', subjectLevel: '' });
                    }}
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

      {step === PipelineStep.TAG_ANALYSIS && !showStudentTagBreakdown && (
        <TagAnalysis
          tags={tags}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.TAG_ANALYSIS && showStudentTagBreakdown && (
        <StudentTagBreakdown
          gradeLevel={assignmentGradeLevel}
          subject={assignmentSubject}
          isLoading={isLoading}
          onConfirm={handleStudentTagSelection}
        />
      )}

      {step === PipelineStep.STUDENT_SIMULATIONS && (
        <StudentSimulations
          feedback={studentFeedback}
          isLoading={isLoading}
          onNext={handleNextStep}
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
        />
      )}

      {step === PipelineStep.VERSION_COMPARISON && (
        <VersionComparison
          original={originalText}
          rewritten={rewrittenText}
          summary={rewriteSummary}
          tagChanges={tagChanges}
          versionAnalysis={versionAnalysis}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
