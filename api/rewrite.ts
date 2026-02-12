import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * REWRITER API ENDPOINT (Vercel Serverless Function)
 * 
 * Receives RewriteRequest (from frontend)
 * Calls Claude API securely (API key in env, not exposed to client)
 * Returns RewriteResponse
 * 
 * Auth: Checks Authorization header (Supabase JWT) + admin role
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
 * Verify JWT token and check admin role
 */
async function verifyAdminAuth(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    // Verify with Supabase
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.SUPABASE_ANON_KEY || '',
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const user = await response.json();

    // Check if user has admin role in custom claims/metadata
    // Stored in user.user_metadata.role or RLS policies
    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.roles?.includes('admin');

    return isAdmin;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return false;
  }
}

/**
 * Generate rewrite prompt with universal instructions
 */
function generateRewritePrompt(request: RewriteRequest): string {
  const feedbackSummary = request.selectedFeedback
    .map((f) => `- [${f.priority}] ${f.category}: ${f.recommendation}`)
    .join('\n');

  const teacherNotesSummary = request.teacherNotes
    .slice(0, 5)
    .map((n) => `- Problem ${n.problemId}: ${n.note}`)
    .join('\n');

  return `
📝 REWRITER: Content-Only Assessment Improvement

## Mission
Rewrite this assessment to address student confusion and improve clarity.
CRITICAL: Preserve Bloom level, complexity, time estimate, and problem IDs.

## Problems to Rewrite
${request.problems
  .slice(0, 5)
  .map(
    (p) => `
Problem ${p.ProblemId}:
- Bloom: ${p.BloomLevel}
- Complexity: ${p.LinguisticComplexity}
- Time: ${p.EstimatedTimeMinutes}m
- Content: ${p.Content?.substring(0, 150)}...
`
  )
  .join('\n')}

## Teacher's Selected Feedback
${feedbackSummary || 'None selected'}

## Teacher Notes
${teacherNotesSummary || 'None'}

## Simulation Summary
- Avg Time: ${request.simulationSummary?.averageTime || 'N/A'} min
- Confusion: ${request.simulationSummary?.confusionLevel || 'N/A'}
- Success Rate: ${request.simulationSummary?.successRate || 'N/A'}

## Your Task
Return valid JSON matching this schema:
{
  "rewrittenProblems": [
    {
      "problemId": "...",
      "originalText": "...",
      "rewrittenText": "...",
      "rationale": "..."
    }
  ]
}

CONSTRAINTS:
✓ Improve clarity and reduce confusion
✓ Preserve Bloom level (must be exactly same)
✓ Preserve time estimate (±5%)
✓ Preserve problem IDs
✗ Do NOT change metadata
✗ Do NOT add/remove problems
✗ Do NOT change complexity rating
✗ Do NOT lower cognitive demand

Generate only valid JSON. No markdown formatting.
`;
}

/**
 * Call Gemini API for rewriting
 */
async function callGeminiForRewrite(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    throw new Error('No content in Gemini response');
  }

  return text;
}

/**
 * Main handler
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin auth
    const isAdmin = await verifyAdminAuth(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Parse request
    const request: RewriteRequest = req.body;

    // Validate request
    if (!request.documentId || !request.problems || !request.selectedFeedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate prompt
    const prompt = generateRewritePrompt(request);

    // Call Gemini
    const geminiResponse = await callGeminiForRewrite(prompt);

    // Parse response
    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid Gemini response format' });
    }

    const rewriteData = JSON.parse(jsonMatch[0]);

    // Build response
    const response: RewriteResponse = {
      newVersion: request.version + 1,
      rewrittenProblems: rewriteData.rewrittenProblems || [],
      rewriteSummary: {
        totalProblemsRewritten: rewriteData.rewrittenProblems?.length || 0,
        changesByProblem: (rewriteData.rewrittenProblems || []).map(
          (p: any) => ({
            problemId: p.problemId,
            appliedFeedbackIds: request.selectedFeedback
              .filter((f) => f.affectedProblems?.includes(p.problemId))
              .map((f) => f.feedbackId),
            teacherNotesUsed: request.teacherNotes
              .filter((n) => n.problemId === p.problemId)
              .map((n) => n.id),
            simulationSignalsUsed: ['assessment_feedback'],
          })
        ),
        globalChanges: [],
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Rewriter API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
