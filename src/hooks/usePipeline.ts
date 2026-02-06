import { useState, useCallback } from 'react';
import { Tag, PipelineStep, PipelineState } from '../types/pipeline';
import { analyzeTags } from '../agents/analysis/analyzeTags';
import { simulateStudents } from '../agents/simulation/simulateStudents';
import { generateAllAccessibilityFeedback } from '../agents/simulation/accessibilityProfiles';
import { rewriteAssignment } from '../agents/rewrite/rewriteAssignment';
import { analyzeVersions, VersionAnalysis } from '../agents/analytics/analyzeVersions';
import { extractAsteroidsFromText } from '../agents/pipelineIntegration';
import { Asteroid } from '../types/simulation';

const initialState: PipelineState = {
  originalText: '',
  tags: [],
  studentFeedback: [],
  rewrittenText: '',
  rewriteSummary: '',
  tagChanges: [],
  currentStep: PipelineStep.INPUT,
  isLoading: false,
  error: undefined,
  selectedStudentTags: [],
  assignmentMetadata: {
    gradeLevel: '6-8',
    subject: 'General',
    difficulty: 'intermediate',
  },
  asteroids: [],
  showProblemMetadata: false,
};

export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState);
  const [versionAnalysis, setVersionAnalysis] = useState<VersionAnalysis | null>(null);
  const [rewrittenTags, setRewrittenTags] = useState<Tag[]>([]);

  const setLoading = useCallback((isLoading: boolean, error?: string) => {
    setState(prev => ({ ...prev, isLoading, error }));
  }, []);

  const analyzeTextAndTags = useCallback(async (text: string) => {
    if (!text.trim()) {
      setState(prev => ({
        ...prev,
        error: 'Please enter some text to analyze',
      }));
      return;
    }

    setLoading(true);
    try {
      // PHASE 2 (Hidden): Automatically generate problem metadata (asteroids)
      // Extract problems and tag them with Bloom levels, complexity, novelty
      const asteroids = await extractAsteroidsFromText(
        text,
        state.assignmentMetadata?.subject || 'General'
      );

      if (!asteroids || asteroids.length === 0) {
        // No asteroids extracted - continue with empty array
      }

      // For backward compatibility, generate tags from asteroids
      const tags = asteroids.map(ast => ({
        name: `${ast.BloomLevel}: ${ast.ProblemText.substring(0, 50)}...${ast.HasTips ? ' 💡' : ''}`,
        confidenceScore: 0.9,
        description: `Bloom: ${ast.BloomLevel}, Complexity: ${(ast.LinguisticComplexity * 100).toFixed(0)}%${ast.HasTips ? ', Has Tips/Hints' : ''}`,
      }));

      // Move to PROBLEM_ANALYSIS step to show metadata
      setState(prev => ({
        ...prev,
        originalText: text,
        tags,
        asteroids,
        currentStep: PipelineStep.PROBLEM_ANALYSIS,
        error: undefined,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze text';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [setLoading, state.assignmentMetadata?.subject]);

  const getFeedback = useCallback(async (selectedStudentTags?: string[]) => {
    if (!state.originalText) {
      return;
    }

    setLoading(true);
    try {
      // Use structured asteroid data if available (Phase 2 simulation)
      // Otherwise fall back to text analysis (Phase 1)

      // For now, use text-based simulation with metadata
      // TODO: When ready, implement proper Asteroid × Astronaut simulation
      const feedback = await simulateStudents(
        state.originalText,
        [],
        {
          gradeLevel: state.assignmentMetadata?.gradeLevel || '6-8',
          subject: state.assignmentMetadata?.subject || 'General',
          learnerProfiles: selectedStudentTags,
          selectedStudentTags: selectedStudentTags,
          asteroidCount: state.asteroids?.length || 0,  // Pass asteroid count for mock simulation context
        }
      );
      // Add accessibility profiles feedback
      const accessibilityFeedback = generateAllAccessibilityFeedback(state.originalText);
      const allFeedback = [...feedback, ...accessibilityFeedback];
      
      // If student tags provided, filter feedback to focus on those areas
      let filteredFeedback = allFeedback;
      if (selectedStudentTags && selectedStudentTags.length > 0) {
        filteredFeedback = allFeedback.filter((f) => {
          const feedbackLower = f.content.toLowerCase();
          return selectedStudentTags.some((tag) => 
            feedbackLower.includes(tag.toLowerCase()) ||
            f.studentPersona.toLowerCase().includes(tag.toLowerCase())
          );
        });
        // If no matches found, return all feedback (don't filter too strictly)
        if (filteredFeedback.length === 0) {
          filteredFeedback = allFeedback.slice(0, Math.ceil(allFeedback.length / 2));
        }
      }
      
      setState(prev => ({
        ...prev,
        studentFeedback: filteredFeedback,
        selectedStudentTags: selectedStudentTags,
        currentStep: PipelineStep.STUDENT_SIMULATIONS,
        error: undefined,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to simulate feedback';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [state.originalText, state.assignmentMetadata, state.asteroids, setLoading]);

  const rewriteTextAndTags = useCallback(async () => {
    if (!state.originalText || state.tags.length === 0) return;

    setLoading(true);
    try {
      const result = await rewriteAssignment(state.originalText, state.tags);
      setRewrittenTags(result.appliedTags);
      setState(prev => ({
        ...prev,
        rewrittenText: result.rewrittenText,
        rewriteSummary: result.summaryOfChanges,
        currentStep: PipelineStep.REWRITE_RESULTS,
        error: undefined,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rewrite text';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [state.originalText, state.tags, setLoading]);

  const compareVersions = useCallback(async () => {
    if (!state.originalText || state.tags.length === 0) return;

    setLoading(true);
    try {
      const analysis = await analyzeVersions(state.tags, rewrittenTags);
      setVersionAnalysis(analysis);
      setState(prev => ({
        ...prev,
        tagChanges: analysis.tagChanges,
        currentStep: PipelineStep.VERSION_COMPARISON,
        error: undefined,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare versions';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [state.originalText, state.tags, rewrittenTags, setLoading]);

  const reset = useCallback(() => {
    setState(initialState);
    setVersionAnalysis(null);
    setRewrittenTags([]);
  }, []);

  const nextStep = useCallback(async () => {
    switch (state.currentStep) {
      case PipelineStep.INPUT:
        // Input step → Document preview (validate sections/problems)
        setState(prev => ({
          ...prev,
          currentStep: PipelineStep.DOCUMENT_PREVIEW,
        }));
        break;
      case PipelineStep.DOCUMENT_PREVIEW:
        // Preview confirmed → Skip to Problem analysis (Phase 2 with metadata)
        // DOCUMENT_ANALYSIS step removed to avoid duplication
        setState(prev => ({
          ...prev,
          currentStep: PipelineStep.PROBLEM_ANALYSIS,
        }));
        break;
      case PipelineStep.PROBLEM_ANALYSIS:
        // Metadata shown, proceed to class builder
        setState(prev => ({
          ...prev,
          currentStep: PipelineStep.CLASS_BUILDER,
        }));
        break;
      case PipelineStep.CLASS_BUILDER:
        // Class built, proceed to simulations
        await getFeedback();
        break;
      case PipelineStep.STUDENT_SIMULATIONS:
        // Simulations done, generate rewrite before moving to results
        await rewriteTextAndTags();
        setState(prev => ({
          ...prev,
          currentStep: PipelineStep.REWRITE_RESULTS,
        }));
        break;
      case PipelineStep.REWRITE_RESULTS:
        // Rewritten, proceed to export
        setState(prev => ({
          ...prev,
          currentStep: PipelineStep.EXPORT,
        }));
        break;
      case PipelineStep.EXPORT:
        // Export done, reset
        reset();
        break;
      default:
        break;
    }
  }, [state.currentStep, getFeedback, rewriteTextAndTags, reset]);

  const toggleProblemMetadataView = useCallback(() => {
    setState(prev => ({
      ...prev,
      showProblemMetadata: !prev.showProblemMetadata,
    }));
  }, []);

  const retestWithRewrite = useCallback(() => {
    // When user clicks "Edit & Re-test", use rewritten text for next simulation
    // This allows them to verify the rewritten version works better with students
    setState(prev => ({
      ...prev,
      originalText: prev.rewrittenText, // Use the rewritten version as the new baseline
      studentFeedback: [], // Clear feedback for fresh simulation
      currentStep: PipelineStep.CLASS_BUILDER, // Go back to class selection
    }));
  }, []);

  return {
    // State
    step: state.currentStep,
    originalText: state.originalText,
    rewrittenText: state.rewrittenText,
    rewriteSummary: state.rewriteSummary,
    tags: state.tags,
    studentFeedback: state.studentFeedback,
    tagChanges: state.tagChanges,
    isLoading: state.isLoading,
    error: state.error,
    selectedStudentTags: state.selectedStudentTags,
    assignmentMetadata: state.assignmentMetadata,
    versionAnalysis,
    rewrittenTags,
    asteroids: state.asteroids,
    showProblemMetadata: state.showProblemMetadata,

    // Actions
    analyzeTextAndTags,
    getFeedback,
    nextStep,
    reset,
    toggleProblemMetadataView,
    retestWithRewrite,

    // Direct setters for controlled inputs
    setOriginalText: (text: string) => setState(prev => ({ ...prev, originalText: text })),
    setAssignmentMetadata: (metadata: PipelineState['assignmentMetadata']) =>
      setState(prev => ({ ...prev, assignmentMetadata: metadata })),
    setAsteroids: (asteroids: Asteroid[]) =>
      setState(prev => ({ ...prev, asteroids })),
  };
}
