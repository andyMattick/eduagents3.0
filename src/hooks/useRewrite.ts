import { useCallback, useState } from 'react';
import { GeneratedAssignment } from './useUserFlow';
import { StudentFeedback } from '../types/pipeline';
import { rewriteAssignment } from '../agents/rewrite/rewriteAssignmentWithFeedback';

interface RewriteState {
  isRewriting: boolean;
  rewriteError: string | null;
  previousVersions: Array<{
    version: number;
    assignment: GeneratedAssignment;
    timestamp: Date;
    feedback: StudentFeedback[];
  }>;
  currentVersion: number;
}

export interface UseRewriteReturn {
  isRewriting: boolean;
  rewriteError: string | null;
  currentVersionNumber: number;
  previousVersions: RewriteState['previousVersions'];
  performRewrite: (
    originalAssignment: GeneratedAssignment,
    feedback: StudentFeedback[],
  ) => Promise<{ rewrittenAssignment: GeneratedAssignment; summary: string } | null>;
  getVersionHistory: () => Array<{
    version: number;
    assignment: GeneratedAssignment;
    timestamp: Date;
    feedbackCount: number;
  }>;
}

/**
 * Hook to manage the rewrite-test-improve loop
 * Integrates AI-powered rewriting with feedback collection
 */
export function useRewrite(): UseRewriteReturn {
  const [state, setState] = useState<RewriteState>({
    isRewriting: false,
    rewriteError: null,
    previousVersions: [],
    currentVersion: 1,
  });

  const performRewrite = useCallback(
    async (
      originalAssignment: GeneratedAssignment,
      feedback: StudentFeedback[],
    ): Promise<{ rewrittenAssignment: GeneratedAssignment; summary: string } | null> => {
      setState(prev => ({ ...prev, isRewriting: true, rewriteError: null }));

      try {
        console.log('🔄 Starting rewrite process with feedback integration...');

        // Calculate completion stats from feedback
        const allProblems = originalAssignment.sections.flatMap(s => s.problems);
        const avgComplexity = allProblems.reduce((sum, p) => sum + (p.rawComplexity || 0.5), 0) / allProblems.length;
        
        const weaknessFeedback = feedback.filter(f => f.feedbackType === 'weakness');
        const confusionLevel = weaknessFeedback.length > 0 ? 0.7 : 0.3;

        // Estimate success rate (inverse of confusion)
        const successRate = 1 - confusionLevel;

        // Call the AI rewriter
        const result = await rewriteAssignment({
          originalAssignment,
          studentFeedback: feedback,
          completionStats: {
            averageTimeSeconds: (originalAssignment.estimatedTime || 60) * 60 * 0.8, // Estimate
            confusionLevel,
            successRate,
            strugglingProblems: [],
          },
        });

        // Store version history
        setState(prev => ({
          ...prev,
          previousVersions: [
            ...prev.previousVersions,
            {
              version: prev.currentVersion,
              assignment: originalAssignment,
              timestamp: new Date(),
              feedback,
            },
          ],
          currentVersion: prev.currentVersion + 1,
          isRewriting: false,
        }));

        console.log(`✅ Rewrite completed (${result.method})`);
        return {
          rewrittenAssignment: result.rewrittenAssignment,
          summary: result.summaryOfChanges,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error during rewrite';
        console.error('❌ Rewrite failed:', error);
        setState(prev => ({
          ...prev,
          isRewriting: false,
          rewriteError: errorMsg,
        }));
        return null;
      }
    },
    [],
  );

  const getVersionHistory = useCallback(() => {
    return state.previousVersions.map(v => ({
      version: v.version,
      assignment: v.assignment,
      timestamp: v.timestamp,
      feedbackCount: v.feedback.length,
    }));
  }, [state.previousVersions]);

  return {
    isRewriting: state.isRewriting,
    rewriteError: state.rewriteError,
    currentVersionNumber: state.currentVersion,
    previousVersions: state.previousVersions,
    performRewrite,
    getVersionHistory,
  };
}
