/**
 * Rewriter Service
 * Calls backend API (/api/rewrite) which securely accesses Claude
 */

interface RewriteRequest {
  documentId: string;
  version: number;
  problems: any[];
  teacherNotes: any[];
  selectedFeedback: any[];
  clusterReport: any;
  simulationSummary: any;
  generationContext: {
    gradeBand: string;
    classLevel: string;
    subject: string;
    timeTargetMinutes: number;
  };
}

interface RewriteResponse {
  newVersion: number;
  rewrittenProblems: any[];
  rewriteSummary: any;
}

/**
 * Get JWT token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // For dev mode, check localStorage (if using Supabase SPA)
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      return JSON.parse(token).access_token;
    }

    // Try to get from current user (depends on your auth setup)
    // This is a fallback; adjust based on your auth library
    return null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Call Rewriter API
 * In dev: calls localhost:3000/api/rewrite
 * In prod: calls /api/rewrite (same origin)
 */
export async function callRewriterAPI(
  request: RewriteRequest
): Promise<RewriteResponse> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error(
      'Authentication required. Please login as admin to use Rewriter.'
    );
  }

  const apiUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api/rewrite'
      : '/api/rewrite';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Admin access required to use Rewriter');
    }
    if (response.status === 401) {
      throw new Error('Please login to use Rewriter');
    }
    const error = await response.json();
    throw new Error(error.error || 'Rewriter API error');
  }

  return response.json();
}

/**
 * Fallback: Mock rewriter for development without API key
 */
export async function mockRewriter(
  request: RewriteRequest
): Promise<RewriteResponse> {
  console.warn('Using mock rewriter (no API key configured)');

  return {
    newVersion: request.version + 1,
    rewrittenProblems: request.problems.map((p) => ({
      problemId: p.ProblemId,
      originalText: p.Content,
      rewrittenText: `[MOCK REWRITE] ${p.Content}`,
      rationale: 'Mock rewriter: configure ANTHROPIC_API_KEY to use real Claude',
    })),
    rewriteSummary: {
      totalProblemsRewritten: request.problems.length,
      changesByProblem: request.problems.map((p) => ({
        problemId: p.ProblemId,
        appliedFeedbackIds: [],
        teacherNotesUsed: [],
        simulationSignalsUsed: ['mock_mode'],
      })),
      globalChanges: ['Running in mock mode'],
    },
  };
}

/**
 * Main export: Smart switch between real and mock
 */
export async function rewriteAssignment(
  request: RewriteRequest
): Promise<RewriteResponse> {
  // In dev mode without API key, use mock
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.VITE_REWRITER_ENABLED
  ) {
    return mockRewriter(request);
  }

  // Otherwise try real API
  try {
    return await callRewriterAPI(request);
  } catch (error) {
    // If API fails in dev, fall back to mock
    if (process.env.NODE_ENV === 'development') {
      console.warn('API failed, falling back to mock:', error);
      return mockRewriter(request);
    }
    // In production, always fail if API unavailable
    throw error;
  }
}
