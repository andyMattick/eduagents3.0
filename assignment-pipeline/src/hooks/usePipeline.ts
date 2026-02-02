import { useState, useCallback } from 'react';
import { Tag, PipelineStep, PipelineState } from '../types/pipeline';
import { analyzeTags } from '../agents/analysis/analyzeTags';
import { simulateStudents } from '../agents/simulation/simulateStudents';
import { generateAllAccessibilityFeedback } from '../agents/simulation/accessibilityProfiles';
import { rewriteAssignment } from '../agents/rewrite/rewriteAssignment';
import { analyzeVersions, VersionAnalysis } from '../agents/analytics/analyzeVersions';

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
      const tags = await analyzeTags(text);
      setState(prev => ({
        ...prev,
        originalText: text,
        tags,
        currentStep: PipelineStep.TAG_ANALYSIS,
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
  }, [setLoading]);

  const getFeedback = useCallback(async () => {
    if (!state.originalText) return;

    setLoading(true);
    try {
      const feedback = await simulateStudents(state.originalText);
      // Add accessibility profiles feedback
      const accessibilityFeedback = generateAllAccessibilityFeedback(state.originalText);
      const allFeedback = [...feedback, ...accessibilityFeedback];
      
      setState(prev => ({
        ...prev,
        studentFeedback: allFeedback,
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
  }, [state.originalText, setLoading]);

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
        break;
      case PipelineStep.TAG_ANALYSIS:
        await getFeedback();
        break;
      case PipelineStep.STUDENT_SIMULATIONS:
        await rewriteTextAndTags();
        break;
      case PipelineStep.REWRITE_RESULTS:
        await compareVersions();
        break;
      case PipelineStep.VERSION_COMPARISON:
        reset();
        break;
      default:
        break;
    }
  }, [state.currentStep, getFeedback, rewriteTextAndTags, compareVersions, reset]);

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
    versionAnalysis,
    rewrittenTags,

    // Actions
    analyzeTextAndTags,
    nextStep,
    reset,

    // Direct setters for controlled inputs
    setOriginalText: (text: string) => setState(prev => ({ ...prev, originalText: text })),
  };
}
