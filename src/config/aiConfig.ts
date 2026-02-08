/**
 * AI Service Configuration
 * 
 * Supports both mock and real AI modes for testing and production
 */

export type AIMode = 'mock' | 'real';

export interface AIConfig {
  mode: AIMode;
  googleApiKey?: string;
  useRealAI: boolean;
}

/**
 * Get AI configuration from environment variables
 */
export function getAIConfig(): AIConfig {
  const mode: AIMode = (import.meta.env.VITE_AI_MODE || 'mock') as AIMode;
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  return {
    mode,
    googleApiKey,
    useRealAI: mode === 'real' && !!googleApiKey,
  };
}

/**
 * Global AI mode (can be overridden at runtime for testing)
 */
let globalAIMode: AIMode = (import.meta.env.VITE_AI_MODE || 'mock') as AIMode;

/**
 * Set AI mode at runtime
 */
export function setAIMode(mode: AIMode): void {
  globalAIMode = mode;
  localStorage.setItem('aiMode', mode);
  // Force reload to apply new AI mode
  window.location.reload();
}

/**
 * Get current AI mode (including any runtime overrides)
 */
export function getCurrentAIMode(): AIMode {
  // Check localStorage for runtime override
  const saved = localStorage.getItem('aiMode');
  if (saved === 'mock' || saved === 'real') {
    return saved as AIMode;
  }
  return globalAIMode;
}

/**
 * Check if user has selected Real AI but the API key is missing
 * Returns true if there's a mismatch (warning needed)
 */
export function hasAPIKeyMismatch(): boolean {
  const mode = getCurrentAIMode();
  const config = getAIConfig();
  return mode === 'real' && !config.googleApiKey;
}

/**
 * Is real AI enabled?
 */
export function useRealAI(): boolean {
  const config = getAIConfig();
  const mode = getCurrentAIMode();
  return mode === 'real' && config.useRealAI;
}

/**
 * Get the appropriate AI service (mock or real)
 */
export function getAIService(serviceType: 'analyzer' | 'writer') {
  if (useRealAI()) {
    return getRealAIService(serviceType);
  } else {
    return getMockAIService(serviceType);
  }
}

// ============================================================================
// MOCK AI SERVICES (for testing without API calls)
// ============================================================================

export interface AnalyzeAssignmentResponse {
  bloomDistribution: Record<string, number>;
  averageComplexity: number;
  paceingIssues: string[];
  accessibility: string[];
  overallScore: number;
  recommendations: string[];
}

export interface GenerateProblemsResponse {
  problems: Array<{
    text: string;
    bloomLevel: string;
    complexity: number;
    novelty: number;
    hasTips: boolean;
  }>;
  summary: string;
}

function getMockAIService(serviceType: 'analyzer' | 'writer') {
  if (serviceType === 'analyzer') {
    return {
      analyze: async (assignmentText: string): Promise<AnalyzeAssignmentResponse> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const wordCount = assignmentText.split(/\s+/).length;
        const questionCount = assignmentText.split('?').length - 1;

        return {
          bloomDistribution: {
            Remember: 0.2,
            Understand: 0.3,
            Apply: 0.25,
            Analyze: 0.15,
            Evaluate: 0.07,
            Create: 0.03,
          },
          averageComplexity: 0.55 + Math.random() * 0.2,
          paceingIssues: [
            wordCount > 500 ? '⚠️ Assignment may be too long (500+ words)' : null,
            questionCount > 10 ? '⚠️ Many questions - consider chunking into sections' : null,
          ].filter(Boolean) as string[],
          accessibility: [
            '✅ Good contrast and readability',
            '⚠️ Some questions use complex vocabulary',
            '💡 Consider adding structure headers',
          ],
          overallScore: 0.72 + Math.random() * 0.15,
          recommendations: [
            'Balance Bloom levels - currently skewed toward Remember/Understand',
            'Add more Apply-level questions for deeper learning',
            'Break longer sections into smaller chunks',
            'Consider visual aids or diagrams',
          ],
        };
      },
    };
  } else {
    // Writer service (mock)
    return {
      generate: async (topic: string, _bloomGoals: any, count: number): Promise<GenerateProblemsResponse> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1200));

        const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        const problems = Array.from({ length: count }, (_, i) => ({
          text: `[MOCK] Problem ${i + 1} about ${topic}: Examine the relationship between ${topic} and real-world applications.`,
          bloomLevel: bloomLevels[i % bloomLevels.length],
          complexity: 0.3 + Math.random() * 0.4,
          novelty: 0.4 + Math.random() * 0.4,
          hasTips: Math.random() > 0.5,
        }));

        return {
          problems,
          summary: `Generated ${count} mock problems spanning Bloom levels from Remember to Create. (Using mock AI for testing)`,
        };
      },
    };
  }
}

// ============================================================================
// REAL AI SERVICES (using Google Generative AI)
// ============================================================================

function getRealAIService(serviceType: 'analyzer' | 'writer') {
  const config = getAIConfig();

  if (!config.googleApiKey) {
    console.warn('Google API key not configured, falling back to mock');
    return getMockAIService(serviceType);
  }

  if (serviceType === 'analyzer') {
    return {
      analyze: async (assignmentText: string): Promise<AnalyzeAssignmentResponse> => {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are an expert educational assessment analyst. Analyze this assignment and provide:
1. Bloom's taxonomy distribution (Remember, Understand, Apply, Analyze, Evaluate, Create) as percentages
2. Average linguistic complexity (0-1)
3. Pacing issues (is it too long, too many questions, good rhythm?)
4. Accessibility concerns
5. Overall quality score (0-1)
6. Top 3 recommendations

Assignment text:
${assignmentText}

Respond in JSON format only:
{
  "bloomDistribution": { "Remember": 0.2, ... },
  "averageComplexity": 0.55,
  "pacingIssues": ["issue1", "issue2"],
  "accessibility": ["concern1", "concern2"],
  "overallScore": 0.72,
  "recommendations": ["rec1", "rec2", "rec3"]
}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const data = await response.json();
          const content = data.candidates[0]?.content?.parts[0]?.text || '{}';

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          console.error('Real AI analyzer failed:', error);
          // Fallback to mock
          const mockService = getMockAIService('analyzer') as { analyze: (text: string) => Promise<AnalyzeAssignmentResponse> };
          return await mockService.analyze(assignmentText);
        }
      },
    };
  } else {
    // Writer service
    return {
      generate: async (topic: string, bloomGoals: any, count: number): Promise<GenerateProblemsResponse> => {
        try {
          const bloomGoalsStr = Object.entries(bloomGoals || {})
            .map(([level, weight]) => `${level}: ${weight}`)
            .join(', ');

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are an expert curriculum designer. Generate ${count} educational problems about "${topic}".

Bloom levels to emphasize: ${bloomGoalsStr || 'Mixed'}

For each problem, provide:
1. Problem text (clear, engaging, grade-appropriate)
2. Bloom level (Remember, Understand, Apply, Analyze, Evaluate, Create)
3. Complexity score (0-1)
4. Novelty score (0-1, how unique compared to typical problems)
5. Whether it includes tips/hints

Respond in JSON format only:
{
  "problems": [
    {
      "text": "problem 1",
      "bloomLevel": "Apply",
      "complexity": 0.6,
      "novelty": 0.7,
      "hasTips": true
    }
  ],
  "summary": "Generated problems spanning..."
}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const data = await response.json();
          const content = data.candidates[0]?.content?.parts[0]?.text || '{}';

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          console.error('Real AI writer failed:', error);
          // Fallback to mock
          const mockService = getMockAIService('writer') as { generate: (topic: string, goals: any, count: number) => Promise<GenerateProblemsResponse> };
          return await mockService.generate(topic, bloomGoals, count);
        }
      },
    };
  }
}

/**
 * Convenience function to get either service
 */
export function getAnalyzerService() {
  return getAIService('analyzer');
}

export function getWriterService() {
  return getAIService('writer');
}
