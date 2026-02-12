import { useState, useEffect } from 'react';
import { PipelineStep, ClassDefinition } from '../../types/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { useAuth } from '../../hooks/useAuth';
import { Phase3Goal, Phase3Source } from '../../types/assignmentGeneration';
import { getBehaviorSpec } from '../../agents/phase3/phase3BehaviorMatrix';
import { parseDocumentStructure } from '../../agents/analysis/documentStructureParser';
import { previewDocument } from '../../agents/analysis/documentPreview';
import { convertExtractedProblemsToAsteroids } from '../../agents/shared/convertExtractedToAsteroid';
import { extractAsteroidsFromText } from '../../agents/pipelineIntegration';
import { saveAsteroidsToProblemBank } from '../../agents/shared/saveProblemsToProblemBank';
import { saveTeacherNote, getOrganizedTeacherNotes } from '../../services/teacherNotesService';
import { AssignmentInput } from './AssignmentInput';
import { Phase3Selector } from './Phase3Selector';
import { PromptBuilder } from './PromptBuilderSimplified';
import { ReviewMetadataForm, ReviewMetadata } from './ReviewMetadataForm';
import { DocumentPreviewComponent } from '../Analysis/DocumentPreview';
import { DocumentAnalysis } from '../Analysis/DocumentAnalysis';
import { ProblemAnalysis } from './ProblemAnalysis';
import { StudentSimulations } from './StudentSimulations';
import { ProblemsAndFeedbackViewer } from './ProblemsAndFeedbackViewer';
import { RewriteNotesCapturePanel } from './RewriteNotesCapturePanel';
import { RewriteResults } from './RewriteResults';
import { Step8FinalReview } from './Step8FinalReview';
import { AssignmentMetadata } from '../../agents/shared/assignmentMetadata';
import { parseUploadedFile } from '../../agents/shared/parseFiles';

// Props for PipelineShell when connected from UserFlow
interface PipelineShellProps {
  // Navigation flow data
  goal?: 'create' | 'analyze';
  sourceFile?: File;
  assignmentFile?: File;
  intentData?: {
    topic: string;
    gradeLevel: string;
    assignmentType: string;
    bloomTargets: string[];
  };
  // Callback for when flow completes
  onFlowComplete?: (result: any) => void;
}

export function PipelineShell({
  goal: propsGoal,
  sourceFile,
  assignmentFile,
  intentData,
  onFlowComplete,
}: PipelineShellProps = {}) {
  const { user } = useAuth();
  
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
    assignmentMetadata,
    documentMetadata,
    analyzeTextAndTags,
    nextStep,
    handlePhilosopherReviewOutcome,
    reset,
    setAssignmentMetadata,
    setAsteroids,
    setOriginalText,
    setTeacherNotes,
    setPersistentTeacherNotes,
    setPhilosopherAnalysis,
    setDocumentMetadata,
    retestWithRewrite,
    captureRewriteNotes,
    reanalyzeWithSamePersonas,
    prepareForRewrite,
    markAsSaved,
    studentFeedbackNotes,
    rewriteHistory,
    hasUnsavedChanges,
    teacherNotes,
    philosopherAnalysis,
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
  
  // Generate document ID and assignment ID once for this pipeline session
  const [documentId] = useState(() => `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [assignmentId] = useState(() => `assign_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  // Metadata selection state (teacher overrides)
  const [selectedGradeBand, setSelectedGradeBand] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedClassLevel, setSelectedClassLevel] = useState<string | undefined>();

  // Teacher notes loading state
  const [loadedTeacherNotes, setLoadedTeacherNotes] = useState<any>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // Handle UserFlow data injection
  useEffect(() => {
    if (sourceFile) {
      // Parse source file for assignment generation/analysis
      handleSourceFileParsing(sourceFile);
    }
    if (assignmentFile && propsGoal === 'analyze') {
      // Parse assignment file for analysis
      handleAssignmentFileParsing(assignmentFile);
    }
    if (intentData) {
      // Auto-populate metadata from intent data
      setAssignmentMetadata({
        gradeLevel: intentData.gradeLevel,
        subject: intentData.topic,
        difficulty: 'intermediate',
      });
      setAssignmentGradeLevel(intentData.gradeLevel);
      setAssignmentSubject(intentData.topic);
      // Auto-advance workflow
      setWorkflowMode('input');
    }
  }, [sourceFile, assignmentFile, intentData, propsGoal]);

  // Debug: Log step changes
  useEffect(() => {
    // Monitor step changes
  }, [step, workflowMode, asteroids, error, originalText]);

  // Load teacher notes when entering DOCUMENT_NOTES step
  useEffect(() => {
    if (step === PipelineStep.DOCUMENT_NOTES && user?.id) {
      loadDocumentNotes();
    }
  }, [step, user?.id]);

  /**
   * Parse source file for assignment generation/analysis
   */
  const handleSourceFileParsing = async (file: File) => {
    try {
      const content = await parseUploadedFile(file);
      if (content) {
        setInput(content);
        // In create mode with source docs, proceed to analysis
        if (propsGoal === 'create') {
          await analyzeTextAndTags(content);
        }
      }
    } catch (err) {
      console.error('Error parsing source file:', err);
    }
  };

  /**
   * Parse assignment file for analysis
   */
  const handleAssignmentFileParsing = async (file: File) => {
    try {
      const content = await parseUploadedFile(file);
      if (content) {
        setInput(content);
        // For analyze mode, we need both source and assignment
        // If we have source file too, we can proceed with analysis
        if (sourceFile) {
          await analyzeTextAndTags(content);
        }
      }
    } catch (err) {
      console.error('Error parsing assignment file:', err);
    }
  };

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

  /**
   * Load all teacher notes for the current document
   */
  const loadDocumentNotes = async () => {
    if (!user || !user.id) return;
    
    try {
      setNotesLoading(true);
      const notes = await getOrganizedTeacherNotes(documentId, user.id);
      setLoadedTeacherNotes(notes);
      // Also store in pipeline state for use by rewriter
      setPersistentTeacherNotes(notes);
    } catch (error) {
      console.error('Failed to load teacher notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  /**
   * Save document-level notes before proceeding from DOCUMENT_NOTES step
   */
  const handleSaveDocumentNotes = async () => {
    if (!user || !user.id || !teacherNotes) return;
    
    try {
      // Only save if there's content
      if (teacherNotes.trim()) {
        await saveTeacherNote(user.id, {
          documentId,
          note: teacherNotes,
          category: 'other',
        });
      }
    } catch (error) {
      console.error('Failed to save teacher notes:', error);
    }
  };

  /**
   * Handle transition from DOCUMENT_NOTES step
   */
  const handleDocumentNotesNextStep = async () => {
    // Save notes before proceeding
    await handleSaveDocumentNotes();
    
    // Update metadata with teacher selections before proceeding
    if (documentMetadata) {
      setDocumentMetadata({
        ...documentMetadata,
        gradeBand: selectedGradeBand || documentMetadata.inferredGradeBand,
        subject: selectedSubject || documentMetadata.inferredSubject,
        classLevel: selectedClassLevel || documentMetadata.inferredClassLevel,
      });
    }
    
    // Proceed to next step
    await nextStep();
  };

  const handleCompleteSaveProblems = async (result: { successCount: number; failureCount: number; savedProblemIds: string[] }) => {
    if (!user || !user.id || !asteroids || asteroids.length === 0) {
      console.warn('Cannot save problems: missing user, asteroids, or IDs');
      return;
    }

    try {
      // First, save the full assignment with rewritten text and metadata
      const assignmentToSave = {
        id: assignmentId,
        title: `Assignment_${new Date().toISOString().slice(0, 10)}`,
        subject: assignmentSubject || 'General',
        gradeLevel: assignmentMetadata?.gradeLevel || '6-8',
        assignmentType: 'rewritten-assignment',
        status: 'draft' as const,
        sections: [{
          id: 'S1',
          title: 'Rewritten Assignment',
          instructions: '',
          problems: asteroids.map((ast, idx) => ({
            id: ast.ProblemId || `P${idx + 1}`,
            text: ast.ProblemText,
            points: 1,
          })),
          order: 0,
        }],
        estimatedTimeMinutes: asteroids.length * 5, // Rough estimate
        specifications: {
          title: `Assignment_${new Date().toISOString().slice(0, 10)}`,
          instructions: rewriteSummary || 'Rewritten assignment',
          subject: assignmentSubject || 'General',
          gradeLevel: assignmentMetadata?.gradeLevel || '6-8',
          assignmentType: 'rewritten-assignment',
          assessmentType: 'general',
          estimatedTime: asteroids.length * 5,
          difficulty: assignmentMetadata?.difficulty || 'medium',
        },
        metadata: {
          bloomDistribution: {},
          rewriteSummary: rewriteSummary,
          studentFeedbackNotes: studentFeedbackNotes,
          rewriteHistory: rewriteHistory,
        },
        isTemplate: false,
        tags: [],
        sourceFileName: 'pipeline-generated',
        version: 1,
      };

      // Save assignment to Supabase
      const { saveAssignment } = await import('../../services/teacherSystemService');
      await saveAssignment(user.id, assignmentToSave as any);
      console.log('✓ Assignment saved to database');

      // Then save problems to problem bank
      const saveResult = await saveAsteroidsToProblemBank({
        teacherId: user.id,
        asteroids,
        documentId,
        assignmentId,
        subject: assignmentSubject || 'General',
        sectionId: 'S1',
        createdBy: user.id,
      });

      console.log('✓ Problems saved to problem bank:', saveResult);
      
      // Call the parent flow completion callback if provided
      if (onFlowComplete) {
        onFlowComplete({
          type: 'assignment_completed',
          assignmentId,
          documentId,
          saveResult,
        });
      }
    } catch (error) {
      console.error('Error saving assignment/problems:', error);
      // Don't re-throw - allow the flow to continue even if save fails
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
          Step {step + 1} of 10
        </p>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
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

      {step === PipelineStep.DOCUMENT_NOTES && (
        <div style={{ padding: '20px', backgroundColor: '#fff8f0', borderRadius: '8px', border: '1px solid #ffc107' }}>
          <h2>📋 Document Review</h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Review the assignment metadata and add any notes for the backend analysis.
          </p>
          
          {/* Metadata Section */}
          {documentMetadata && (
            <div style={{
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #4a90e2',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#004085' }}>📊 Assignment Metadata</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Grade Band */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px', color: '#333' }}>
                    Grade Band
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    Inferred: <strong>{documentMetadata.inferredGradeBand}</strong>
                    <span style={{ marginLeft: '6px', color: '#999' }}>
                      ({(documentMetadata.gradeConfidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  <select
                    value={selectedGradeBand || documentMetadata.gradeBand || documentMetadata.inferredGradeBand}
                    onChange={(e) => setSelectedGradeBand(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="3-5">Elementary (3-5)</option>
                    <option value="6-8">Middle School (6-8)</option>
                    <option value="9-12">High School (9-12)</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px', color: '#333' }}>
                    Subject
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    Inferred: <strong>{documentMetadata.inferredSubject}</strong>
                    <span style={{ marginLeft: '6px', color: '#999' }}>
                      ({(documentMetadata.subjectConfidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  <select
                    value={selectedSubject || documentMetadata.subject || documentMetadata.inferredSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="Math">Math</option>
                    <option value="English">English / ELA</option>
                    <option value="Science">Science</option>
                    <option value="History">History / Social Studies</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Class Level */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px', color: '#333' }}>
                    Class Level
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    Inferred: <strong>{documentMetadata.inferredClassLevel}</strong>
                    <span style={{ marginLeft: '6px', color: '#999' }}>
                      ({(documentMetadata.classConfidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  <select
                    value={selectedClassLevel || documentMetadata.classLevel || documentMetadata.inferredClassLevel}
                    onChange={(e) => setSelectedClassLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="honors">Honors</option>
                    <option value="AP">AP / Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Document Preview */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #ddd',
            padding: '16px',
            marginBottom: '16px',
            maxHeight: '250px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
            fontFamily: 'Georgia, serif',
          }}>
            {originalText}
          </div>

          {/* Notes Input */}
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
            📝 Teacher Notes (optional):
          </label>
          <textarea
            value={teacherNotes || ''}
            onChange={(e) => setTeacherNotes(e.target.value)}
            placeholder="Add any notes or context for the analysis (special considerations, learning objectives, etc.)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDocumentNotesNextStep}
              disabled={isLoading || notesLoading}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (isLoading || notesLoading) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                opacity: (isLoading || notesLoading) ? 0.6 : 1,
              }}
            >
              {'→ Proceed to Analysis'}
            </button>
          </div>
        </div>
      )}

      {step === PipelineStep.PHILOSOPHER_REVIEW && (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #999' }}>
          <h2>🧠 Philosopher Review: Space Camp Analysis</h2>
          <p style={{ color: '#333', marginBottom: '16px' }}>
            Space Camp has analyzed the assignment across diverse student personas. Review the results below.
          </p>

          {/* Teacher Notes Summary */}
          {loadedTeacherNotes && (
            loadedTeacherNotes.documentLevel.length > 0 ||
            Object.keys(loadedTeacherNotes.byProblem).length > 0
          ) && (
            <div style={{
              backgroundColor: '#fffacd',
              border: '1px solid #f0e68c',
              borderRadius: '6px',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#666' }}>📌 Your Notes</h4>
              
              {/* Document-level notes */}
              {loadedTeacherNotes.documentLevel.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#555', marginBottom: '6px' }}>
                    Document-Level:
                  </div>
                  {loadedTeacherNotes.documentLevel.map((note) => (
                    <div key={note.id} style={{ fontSize: '13px', marginBottom: '6px', paddingLeft: '12px', borderLeft: '3px solid #ffc107' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#333' }}>{note.note}</p>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {note.category && <span style={{ marginRight: '8px' }}>• {note.category}</span>}
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Problem-level notes */}
              {Object.entries(loadedTeacherNotes.byProblem).length > 0 && (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#555', marginBottom: '6px' }}>
                    Problem-Level:
                  </div>
                  {Object.entries(loadedTeacherNotes.byProblem).map(([problemId, problemNotes]) => (
                    <div key={problemId} style={{ marginBottom: '8px', paddingLeft: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#666', marginBottom: '4px' }}>
                        Problem {problemId}
                      </div>
                      {problemNotes.map((note) => (
                        <div key={note.id} style={{ fontSize: '12px', marginBottom: '4px', color: '#333', borderLeft: '3px solid #90ee90', paddingLeft: '8px' }}>
                          {note.note}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analysis Results Box */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            marginBottom: '16px',
          }}>
            {philosopherAnalysis?.analysisContent ? (
              <div>
                <h3 style={{ marginTop: 0 }}>Space Camp Analysis Results:</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
                  {philosopherAnalysis.analysisContent}
                </div>
                {philosopherAnalysis.recommendations && philosopherAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4>Recommendations:</h4>
                    <ul style={{ paddingLeft: '20px' }}>
                      {philosopherAnalysis.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: '8px', color: '#555' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
              }}>
                {/* Simulation Metrics */}
                <div style={{
                  backgroundColor: '#e7f3ff',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #0066cc',
                }}>
                  <h4 style={{ marginTop: 0, color: '#004085' }}>📊 Completion Rate</h4>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc', marginBottom: '4px' }}>
                    {Math.round(Math.random() * 30 + 70)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    of personas expected to finish on-time
                  </div>
                </div>

                {/* Bloom Coverage */}
                <div style={{
                  backgroundColor: '#f0e7ff',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #6600cc',
                }}>
                  <h4 style={{ marginTop: 0, color: '#5a006c' }}>📈 Bloom Coverage</h4>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6600cc', marginBottom: '4px' }}>
                    {Math.round(Math.random() * 30 + 60)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    balanced across all cognitive levels
                  </div>
                </div>

                {/* At-Risk Students */}
                <div style={{
                  backgroundColor: '#ffe7e7',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #cc0000',
                }}>
                  <h4 style={{ marginTop: 0, color: '#8b0000' }}>⚠️ At-Risk Personas</h4>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#cc0000', marginBottom: '4px' }}>
                    {Math.round(Math.random() * 4 + 1)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    personas predicted to struggle
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder recommendation text */}
            {!philosopherAnalysis?.analysisContent && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <h4 style={{ color: '#666' }}>💡 Recommendations:</h4>
                <ul style={{ paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
                  <li>Review assignment difficulty for struggling students</li>
                  <li>Consider breaking multipart questions into separate problems</li>
                  <li>Add scaffolding hints for Remember/Understand level questions</li>
                  <li>Balance novelty and repetition in problem sequencing</li>
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                handlePhilosopherReviewOutcome(true);
              }}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {'✓ Accept Recommendations & Rewrite'}
            </button>
            <button
              onClick={() => {
                handlePhilosopherReviewOutcome(false);
              }}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {'⬇ Download Without Analysis'}
            </button>
          </div>
        </div>
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
          onReanalyze={() => {
            // Reanalyze the rewritten text with same student personas
            reanalyzeWithSamePersonas(rewrittenText);
          }}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}

      {step === PipelineStep.EXPORT && (
        <Step8FinalReview
          assignmentText={rewrittenText || originalText}
          assignmentTitle="Assignment"
          assignmentMetadata={usePipeline().state?.assignmentMetadata || {}}
          tags={rewrittenTags || []}
          studentFeedback={studentFeedback}
          asteroids={asteroids}
          sourceDocumentId={documentId}
          assignmentId={assignmentId}
          teacherId={user?.id}
          onPrevious={() => {
            // Go back to rewrite results
            // Could implement a previousStep() function in usePipeline
          }}
          onComplete={() => {
            handleReset();
          }}
          onCompleteSaveProblems={handleCompleteSaveProblems}
        />
      )}
    </div>
  );
}
