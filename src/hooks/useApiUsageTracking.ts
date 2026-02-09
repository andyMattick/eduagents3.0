/**
 * useApiUsageTracking Hook
 * 
 * Integrates API usage tracking throughout the application.
 * Automatically logs and updates quota when AI services are called.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  logApiCall,
  getResourceLimitStatus,
} from '../services/teacherSystemService';
import { ResourceLimitStatus, ApiLimitError } from '../types/teacherSystem';

export interface ApiUsageTrackingState {
  limits: ResourceLimitStatus | null;
  isLoading: boolean;
  error: string | null;
  canCallApi: boolean;
  apiCallsRemaining: number;
}

export interface ApiTrackingOptions {
  teacherId: string;
  onLimitExceeded?: () => void;
  onWarning?: (percentageUsed: number) => void;
}

/**
 * Hook to manage API usage tracking and quotas
 */
export function useApiUsageTracking(options: ApiTrackingOptions): ApiUsageTrackingState & {
  logApiAction: (action: string, assignmentId?: string, cost?: number) => Promise<void>;
  refreshLimits: () => Promise<void>;
} {
  const { teacherId, onLimitExceeded, onWarning } = options;
  const [limits, setLimits] = useState<ResourceLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load limits on mount and periodically
  const refreshLimits = useCallback(async () => {
    try {
      setIsLoading(true);
      const newLimits = await getResourceLimitStatus(teacherId);
      setLimits(newLimits);
      setError(null);

      // Trigger warning if approaching limit
      if (onWarning && newLimits.apiCallLimit.percentageUsed > 70) {
        onWarning(newLimits.apiCallLimit.percentageUsed);
      }

      // Trigger limit exceeded if quota exhausted
      if (onLimitExceeded && !newLimits.apiCallLimit.canCall) {
        onLimitExceeded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage limits');
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, onLimitExceeded, onWarning]);

  useEffect(() => {
    refreshLimits();

    // Refresh limits every 5 minutes
    const interval = setInterval(refreshLimits, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshLimits]);

  // Log an API action
  const logApiAction = useCallback(
    async (action: string, assignmentId?: string, cost: number = 1) => {
      if (!limits?.apiCallLimit.canCall) {
        throw new Error(
          'API quota exceeded. Please upgrade your subscription or wait for your monthly reset.'
        ) as any as ApiLimitError;
      }

      try {
        await logApiCall(teacherId, action, cost, assignmentId, 'success');
        // Refresh limits after logging
        await refreshLimits();
      } catch (err) {
        console.error('Failed to log API action:', err);
        // Still refresh limits to get current state
        await refreshLimits();
      }
    },
    [teacherId, limits?.apiCallLimit.canCall, refreshLimits]
  );

  return {
    limits,
    isLoading,
    error,
    canCallApi: limits?.apiCallLimit.canCall ?? false,
    apiCallsRemaining: limits?.apiCallLimit.max
      ? limits.apiCallLimit.max - limits.apiCallLimit.current
      : 0,
    logApiAction,
    refreshLimits,
  };
}

/**
 * Hook to wrap async AI operations with usage tracking
 */
export function useTrackedAsyncOperation(teacherId: string) {
  const { logApiAction } = useApiUsageTracking({ teacherId });

  const executeWithTracking = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      action: string,
      assignmentId?: string,
      cost: number = 1
    ): Promise<T> => {
      try {
        const result = await operation();
        await logApiAction(action, assignmentId, cost);
        return result;
      } catch (err) {
        // Log as failure
        await logApiCall(teacherId, action, 0, assignmentId, 'failure', err instanceof Error ? err.message : 'Unknown error');
        throw err;
      }
    },
    [teacherId, logApiAction]
  );

  return { executeWithTracking };
}

// Import logApiCall function here if needed
async function logApiCall(
  teacherId: string,
  action: string,
  cost: number,
  assignmentId: string | undefined,
  status: string,
  errorMessage: string
) {
  const { logApiCall } = await import('../services/teacherSystemService');
  return logApiCall(teacherId, action, cost, assignmentId, status, errorMessage);
}

export default useApiUsageTracking;
