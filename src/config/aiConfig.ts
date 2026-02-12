/**
 * AI Service Configuration
 * 
 * Supports both mock and real AI modes for testing and production
 */

import { buildAssignmentGenerationInstruction, AssignmentGenerationContext } from '../agents/shared/assignmentInstructions';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const isDevMode = import.meta.env.DEV;
  const envMode = import.meta.env.VITE_AI_MODE as AIMode | undefined;
  const mode: AIMode = envMode || (isDevMode ? 'real' : 'mock');
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  return {
    mode,
    googleApiKey,
    useRealAI: mode === 'real' && !!googleApiKey,
  };
}

/**
 * Global AI mode (can be overridden at runtime for testing)
 * In dev mode, always defaults to 'real' unless explicitly set in env
 */
let globalAIMode: AIMode = (() => {
  const envMode = import.meta.env.VITE_AI_MODE as AIMode | undefined;
  if (envMode) return envMode;
  return import.meta.env.DEV ? 'real' : 'mock';
})();

/**
 * Set AI mode at runtime (with page reload)
 */
export function setAIMode(mode: AIMode): void {
  globalAIMode = mode;
  localStorage.setItem('aiMode', mode);
  // Force reload to apply new AI mode
  window.location.reload();
}

/**
 * Set AI mode based on user role (for auth flow - no reload)
 * Dev mode: real AI (for development)
 * Admin users: real AI
 * Everything else: mock AI
 */
export function setAIModeByRole(isAdmin: boolean): void {
  const isDevMode = import.meta.env.DEV;
  const mode: AIMode = (isDevMode || isAdmin) ? 'real' : 'mock';
  globalAIMode = mode;
  localStorage.setItem('aiMode', mode);
  const reason = isDevMode ? 'development' : (isAdmin ? 'admin' : 'teacher');
  console.log(`🔐 AI Mode set to '${mode}' for ${reason} user`);
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
 * Log AI configuration status to console
 */
export function logAIConfigStatus(): void {
  const config = getAIConfig();
  if (config.useRealAI) {
    console.log('%c✅ AI MODE: REAL (Google Generative AI)', 'color: green; font-weight: bold; font-size: 14px;');
    console.log('%c→ Using real Google Generative AI with Gemini Pro model', 'color: green');
  } else if (config.mode === 'real' && !config.googleApiKey) {
    console.log('%c⚠️  AI MODE: REAL (configured but no API key)', 'color: orange; font-weight: bold; font-size: 14px;');
    console.log('%c→ Falling back to mock AI because VITE_GOOGLE_API_KEY is not set', 'color: orange');
  } else {
    console.log('%c📝 AI MODE: MOCK (simulated responses)', 'color: blue; font-weight: bold; font-size: 14px;');
    console.log('%c→ Using template-based mock AI for testing/development', 'color: blue');
  }
}

/**
 * Is real AI enabled?
 */
export function useRealAI(): boolean {
  const config = getAIConfig();
  const mode = getCurrentAIMode();
  const result = mode === 'real' && config.useRealAI;
  console.log('🔍 [useRealAI] mode:', mode, 'config.useRealAI:', config.useRealAI, 'result:', result);
  return result;
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
        console.log('📊 [MOCK AI] Analyzing assignment...');
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
        console.log(`📝 [MOCK AI] Generating ${count} problems for topic: "${topic}"`);
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

// Helper to call Google Generative AI using the official client
async function callGoogleGenerativeAI(
  apiKey: string,
  prompt: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<any> {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: modelName });

    console.log(`📡 Calling Google Generative AI with model: ${modelName}`);

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    console.log(`✅ ${modelName} succeeded`);
    
    return {
      text: response.text(),
      candidates: [
        {
          content: {
            parts: [{ text: response.text() }],
          },
        },
      ],
    };
  } catch (error) {
    console.error(`❌ ${modelName} failed:`, error);
    throw error;
  }
}

function getRealAIService(serviceType: 'analyzer' | 'writer') {
  const config = getAIConfig();

  if (!config.googleApiKey) {
    console.warn('⚠️ Google API key not configured, falling back to mock');
    return getMockAIService(serviceType);
  }

  const keyPreview = config.googleApiKey.substring(0, 10) + '...' + config.googleApiKey.substring(config.googleApiKey.length - 4);
  console.log(`✅ [REAL AI] Using Google Generative AI (Gemini) - ${serviceType} service`);
  console.log(`   API Key: ${keyPreview}`);
  console.log(`   Mode: ${config.useRealAI ? 'REAL' : 'MOCK'}`);
  console.log(`📝 Ensure the Google Generative Language API is enabled in your Google Cloud console`);

  if (serviceType === 'analyzer') {
    return {
      analyze: async (assignmentText: string): Promise<AnalyzeAssignmentResponse> => {
        try {
          console.log('🔌 [API CALL] Google Generative AI - Analyzing assignment...');
          
          const prompt = `You are an expert educational assessment analyst. Analyze this assignment and provide:
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
}`;

          const data = await callGoogleGenerativeAI(config.googleApiKey!, prompt, 'gemini-1.5-flash');
          const content = data.candidates[0]?.content?.parts[0]?.text || '{}';

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          console.error('❌ Real AI analyzer failed:', error);
          // Fallback to mock
          const mockService = getMockAIService('analyzer') as { analyze: (text: string) => Promise<AnalyzeAssignmentResponse> };
          return await mockService.analyze(assignmentText);
        }
      },
    };
  } else {
    // Writer service
    return {
      generate: async (topic: string, bloomGoals: any, count: number, sourceMaterial?: string): Promise<GenerateProblemsResponse> => {
        try {
          console.log(`🔌 [API CALL] Google Generative AI - Generating ${count} problems for "${topic}"...`);
          
          const bloomGoalsStr = Object.entries(bloomGoals || {})
            .map(([level, weight]: [string, unknown]) => `${level}: ${((weight as number) * 100).toFixed(0)}%`)
            .join(', ');

          let prompt = `You are an expert curriculum designer. Generate exactly ${count} unique educational problems about "${topic}".

CRITICAL INSTRUCTIONS:

1. BLOOM'S TAXONOMY DISTRIBUTION (MUST follow percentages PRECISELY):
   ${bloomGoalsStr || 'Evenly distributed across all levels'}
   - CRITICAL: All 6 Bloom levels MUST have at least 1 question (NO ZEROS)
   - If asking for 17 questions: aim for approximately 2-3 per level (symmetrical)
   - If asking for 10 questions: aim for 2-2-2-2-1-1 distribution (balanced)
   - Be precise with percentages: 30% of 10 = exactly 3 questions, not 2 or 4
   - Distribute across ALL levels before assigning duplicates to any level
   - Each question should have ONE primary Bloom level (no ambiguous assignments)

2. QUESTION TYPES (distribute evenly across types):
   - Assign types: "multiple-choice", "true-false", "short-answer", "matching", "essay"
   - Group similar types together (e.g., all MC questions in sequence)
   - Return "questionType" field for each problem

3. COMPLEXITY CALCULATION:
   - Complexity = (word count / 150) × (sentence complexity) on a 0-1 scale
   - Simple problem (20 words, 1 sentence): ~0.2
   - Moderate problem (80 words, 3 sentences): ~0.5
   - Complex problem (200+ words, technical terms): ~0.8
   - Return "complexity" as a decimal (0.0 to 1.0)

4. TIPS/HINTS (ONLY if truly helpful):
   - Tips should provide actual guidance: formulas, steps, definitions, memory aids
   - Example good tips: "Use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a" or "Recall: Mitochondria = Powerhouse"
   - DO NOT include generic tips like "Read carefully" or "Remember what you learned"
   - Return "tipText" with specific guidance OR null if no meaningful tip exists
   - Return "hasTips": true only if tipText contains actual useful content

5. NOVELTY SCORING:
   - 0.2-0.4 = Common/routine problem type
   - 0.4-0.7 = Slightly different from typical
   - 0.7-1.0 = Creative/unexpected application

6. OUTPUT FORMAT - Each problem MUST include these exact fields`;

          prompt += `\n\nFor each problem, provide:
- "text": Problem text (clear, engaging, grade-appropriate, self-contained)
- "bloomLevel": Single level (Remember|Understand|Apply|Analyze|Evaluate|Create)
- "questionType": Type (multiple-choice|true-false|short-answer|matching|essay)
- "complexity": Number 0.0-1.0 based on word count and difficulty
- "novelty": Number 0.2-1.0 based on uniqueness
- "tipText": String with actual guidance (formula, steps, definitions) OR null
- "hasTips": Boolean - true only if tipText contains meaningful content`;

          // Add source material context if provided
          if (sourceMaterial) {
            prompt += `\n\nSOURCE MATERIAL (MUST use as foundation for problems):
${sourceMaterial}

Create problems DIRECTLY from this source material. Questions should reference concepts, examples, and information from this material.`;
          }

          prompt += `\n\nIMPORTANT: Return valid JSON with "problems" array and "summary" string ONLY. No other text.`;

          prompt += `\n\n{
  "problems": [
    {
      "text": "Problem text here",
      "bloomLevel": "Apply",
      "questionType": "multiple-choice",
      "complexity": 0.55,
      "novelty": 0.65,
      "tipText": "Use the formula X = Y + Z to solve" OR null,
      "hasTips": true
    }
  ],
  "summary": "Generated X problems with Y% Apply level, Z% Understand level..."
}`;

          const data = await callGoogleGenerativeAI(config.googleApiKey!, prompt, 'gemini-1.5-flash');
          const content = data.candidates[0]?.content?.parts[0]?.text || '{}';

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          const parsed = JSON.parse(jsonMatch[0]);
          
          // Validate the response has the required fields
          if (!parsed.problems || !Array.isArray(parsed.problems)) {
            throw new Error('Response missing problems array');
          }

          return parsed;
        } catch (error) {
          console.error('❌ Real AI writer failed:', error);
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

/**
 * Generate assignment with proper educational context and instructions
 * This ensures high-quality, standards-aligned output
 */
export async function generateAssignmentWithContext(
  context: AssignmentGenerationContext,
  sourceText?: string
): Promise<GenerateProblemsResponse> {
  const writer = getWriterService();
  
  // Build the comprehensive instruction
  const systemInstruction = buildAssignmentGenerationInstruction(context);
  
  // Combine instruction with source material
  const fullPrompt = sourceText
    ? `${systemInstruction}\n\nSOURCE MATERIAL:\n${sourceText}`
    : systemInstruction;

  console.log('📋 Generating assignment with context:', {
    assessmentType: context.assessmentType,
    gradeLevel: context.gradeLevel,
    subject: context.subject,
  });

  return (writer as any).generateWithPrompt?.(fullPrompt) || 
         (writer as any).generate?.(context.subject, {}, 10);
}

// Log AI configuration status on module load
if (typeof window !== 'undefined') {
  // Small delay to ensure console is ready
  setTimeout(() => {
    logAIConfigStatus();
  }, 0);
}
