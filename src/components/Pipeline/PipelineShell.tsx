import { useState, useEffect } from 'react';
import { PipelineStep, ClassDefinition } from '../../types/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { Phase3Goal, Phase3Source } from '../../types/assignmentGeneration';
import { getBehaviorSpec } from '../../agents/phase3/phase3BehaviorMatrix';
import { parseDocumentStructure } from '../../agents/analysis/documentStructureParser';
import { previewDocument } from '../../agents/analysis/documentPreview';
import { convertExtractedProblemsToAsteroids } from '../../agents/shared/convertExtractedToAsteroid';
import { extractAsteroidsFromText } from '../../agents/pipelineIntegration';
import { AssignmentInput } from './AssignmentInput';
import { Phase3Selector } from './Phase3Selector';
import { PromptBuilder } from './PromptBuilderSimplified';
import { ReviewMetadataForm, ReviewMetadata } from './ReviewMetadataForm';
import { DocumentPreviewComponent } from '../Analysis/DocumentPreview';
import { DocumentAnalysis } from '../Analysis/DocumentAnalysis';
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
    studentFeedback,
    isLoading,
    error,
    rewrittenTags,
    asteroids,
    analyzeTextAndTags,
    nextStep,
    reset,
    setAssignmentMetadata,
    setAsteroids,
    setOriginalText,
    retestWithRewrite,
  } = usePipeline();

  const [input, setInput] = useState('');
  const [workflowMode, setWorkflowMode] = useState<'choose' | 'input' | 'builder'>('choose');
  const [phase3Goal, setPhase3Goal] = useState<Phase3Goal | null>(null);
  const [phase3Source, setPhase3Source] = useState<Phase3Source | null>(null);
  const [reviewMetadata, setReviewMetadata] = useState<ReviewMetadata | null>(null);
  const [assignmentGradeLevel, setAssignmentGradeLevel] = useState('6-8');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [classDefinition, setClassDefinition] = useState<ClassDefinition | undefined>(undefined);
  const [documentPreview, setDocumentPreview] = useState<any>(null);
  const [documentStructure, setDocumentStructure] = useState<any>(null);

  // Debug: Log step changes
  useEffect(() => {
    // Monitor step changes
  }, [step, workflowMode, asteroids, error, originalText]);

  /**
   * Handle Phase 3 goal + source selection
   * Determines which input mode user should see next
   */
  const handlePhase3Selection = (goal: Phase3Goal, source: Phase3Source) => {
    setPhase3Goal(goal);
    setPhase3Source(source);
    
    // Get behavior spec for this combination
    const spec = getBehaviorSpec(goal, source);
    
    // For now, route to 'input' mode
    // In production, different goals might have different next steps
    setWorkflowMode('input');
  };

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
    
    // Save text for later retrieval
    const textToAnalyze = input;
    window.sessionStorage.setItem('inputText', textToAnalyze);
    
    setInput('');
    setWorkflowMode('choose');
    
    // Generate quick preview FIRST (before full extraction)
    const preview = previewDocument(textToAnalyze);
    setDocumentPreview(preview);
    
    // Move to DOCUMENT_PREVIEW step
    await nextStep();
  };

  const handleNextStep = async () => {
    await nextStep();
  };

  const handleEditAndRetest = async () => {
    retestWithRewrite();
  };

  const handleDocumentAnalysisConfirm = async (structure: any) => {
    setDocumentStructure(structure);
    
    // Convert all extracted problems from DocumentStructure to Asteroids
    // Flatten all problems from all sections
    const allExtractedProblems = structure.sections.flatMap((section: any) => section.problems);
    
    // Convert to Asteroid format
    const generatedAsteroids = convertExtractedProblemsToAsteroids(
      allExtractedProblems,
      assignmentSubject || 'General'
    );
    
    // Store asteroids in pipeline state
    setAsteroids(generatedAsteroids);
    
    // Proceed to next step (PROBLEM_ANALYSIS)
    await nextStep();
  };

  const handleParseAndAnalyze = async (textToAnalyze: string) => {
    try {
      // Parse the document to extract problems with metadata
      const structure = await parseDocumentStructure(textToAnalyze, {
        documentTitle: 'Assignment',
        gradeLevel: assignmentGradeLevel,
        subject: assignmentSubject,
      });
      
      setDocumentStructure(structure);
      // Proceed to DOCUMENT_ANALYSIS step
      await nextStep();
    } catch (error) {
      // Error parsing document
    }
  };

  const handleDocumentPreviewConfirm = async () => {
    // Preview confirmed → Generate asteroids directly and move to PROBLEM_ANALYSIS
    const textToAnalyze = window.sessionStorage.getItem('inputText') || '';
    if (textToAnalyze && asteroids.length === 0) {
      try {
        // Extract asteroids directly from stored text
        const newAsteroids = await extractAsteroidsFromText(
          textToAnalyze,
          assignmentSubject || 'General'
        );
        setAsteroids(newAsteroids);
        // CRITICAL: Store original text in pipeline state for simulation engine
        setOriginalText(textToAnalyze);
        // Move to PROBLEM_ANALYSIS (skipping DOCUMENT_ANALYSIS)
        await nextStep();
      } catch (error) {
        // Error extracting asteroids
      }
    }
  };

  const handleDocumentPreviewEdit = () => {
    // Go back to input to re-upload - must reset step to INPUT
    setDocumentPreview(null);
    setReviewMetadata(null);
    setInput('');
    setDocumentStructure(null);
    setWorkflowMode('input');
    reset(); // Reset pipeline step back to INPUT
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to start over? This will erase your current assignment and all analysis.'
    );
    if (confirmed) {
      setInput('');
      setWorkflowMode('choose');
      setPhase3Goal(null);
      setPhase3Source(null);
      setReviewMetadata(null);
      setClassDefinition(undefined);
      reset();
    }
  };

  // For choosing workflow - show Phase 3 goal + source selector
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
        <Phase3Selector onSelect={handlePhase3Selection} isLoading={isLoading} />
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
          Step {step + 1} of 8
        </p>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
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
            border: '2px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '14px',
          }}
        >
          <strong style={{ fontSize: '16px' }}>❌ Error:</strong> 
          <div style={{ marginTop: '8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error}
          </div>
          <small style={{ display: 'block', marginTop: '8px', opacity: 0.8 }}>
            Check your browser console (F12) for more details. Try uploading a different file or check the file format.
          </small>
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
              <li>Student feedback from varying perspectives</li>
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

      {step === PipelineStep.DOCUMENT_PREVIEW && documentPreview && (
        <DocumentPreviewComponent
          preview={documentPreview}
          isAnalyzing={isLoading}
          onConfirm={handleDocumentPreviewConfirm}
          onEdit={handleDocumentPreviewEdit}
        />
      )}

      {step === PipelineStep.PROBLEM_ANALYSIS && (
        <>
          {asteroids && asteroids.length > 0 ? (
            <ProblemAnalysis
              asteroids={asteroids || []}
              isLoading={isLoading}
              onNext={handleNextStep}
            />
          ) : (
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107', color: '#856404' }}>
              <h3>⚠️ No Problems Extracted</h3>
              <p>We couldn't extract any problems from your assignment. This might happen if:</p>
              <ul>
                <li>The file format wasn't recognized (try .txt, .pdf, or .docx)</li>
                <li>The file is empty or corrupted</li>
                <li>The content doesn't contain recognizable problem statements</li>
              </ul>
              <button onClick={handleReset} style={{ padding: '10px 20px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ← Try Another File
              </button>
            </div>
          )}
        </>
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
          onEditAndRetest={handleEditAndRetest}
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
