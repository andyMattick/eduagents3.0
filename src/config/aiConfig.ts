/**
 * AI Service Configuration
 * 
 * REAL AI ONLY - Gemini API required
 * No mock or fallback modes
 */

import { buildAssignmentGenerationInstruction, AssignmentGenerationContext } from '../agents/shared/assignmentInstructions';
import { GoogleGenAI } from '@google/genai';

export interface AIConfig {
  googleApiKey: string;
  useRealAI: boolean;
}

/**
 * Get AI configuration from environment variables
 * Requires VITE_GOOGLE_API_KEY - no fallbacks
 */
export function getAIConfig(): AIConfig {
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  if (!googleApiKey) {
    throw new Error('VITE_GOOGLE_API_KEY required. Real AI (Gemini API) is mandatory.');
  }

  return {
    googleApiKey,
    useRealAI: true,
  };
}

/**
 * Set AI mode - always real, no-op function for compatibility
 */
export function setAIMode(_mode?: 'real'): void {
  // Real AI only - this is a no-op
  console.log('✨ Real Gemini API enforced');
}

/**
 * Set AI mode based on user role - always real
 */
export function setAIModeByRole(isAdmin: boolean): void {
  getAIConfig(); // Will throw if no API key
  const reason = isAdmin ? 'admin' : 'teacher';
  console.log(`🔐 Gemini API enforced for ${reason} user`);
}

/**
 * Get current AI mode - always real
 */
export function getCurrentAIMode(): 'real' {
  return 'real';
}

/**
 * Log AI configuration status to console
 */
export function logAIConfigStatus(): void {
  getAIConfig();
  console.log('%c✅ AI MODE: REAL (Google Generative AI / Gemini)', 'color: green; font-weight: bold; font-size: 14px;');
  console.log('%c→ Using real Google Generative AI with Gemini models', 'color: green');
}

/**
 * Is real AI enabled? - Always true
 */
export function useRealAI(): boolean {
  try {
    getAIConfig(); // Will throw if no API key
    return true;
  } catch (e) {
    return false;
  }
}

export function getAIService(serviceType: 'analyzer' | 'writer') {
  getAIConfig(); // Will throw if no API key
  return getRealAIService(serviceType);
}

// ============================================================================
// AI RESPONSE TYPES
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

// ============================================================================
// STRICT CENTRAL AI WRAPPER - ONLY PLACE THAT CALLS GEMINI API
// ============================================================================

/**
 * Central AI wrapper - strict validation, no fallbacks
 * This is the ONLY place that should call the Gemini API
 */
export async function callAI(prompt: string, options?: { modelName?: string; maxTokens?: number }): Promise<any> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const modelName = options?.modelName || 'gemini-1.5-pro';
  const maxTokens = options?.maxTokens || 2000;

  if (!apiKey) {
    throw new Error('AI disabled: VITE_GOOGLE_API_KEY missing. Real AI required.');
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('AI wrapper: prompt cannot be empty');
  }

  try {
    console.log(`📡 [AI WRAPPER] Calling Gemini ${modelName}...`);

    const ai = new GoogleGenAI({ 
      apiKey,
      apiVersion: "v1",
    });
    
    const response = await (ai.models as any).generateContent({
      model: modelName,
      contents: prompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    });

    // Extract text from the new SDK response
    let text: string = '';
    if (typeof (response as any).text === 'function') {
      text = (response as any).text();
    } else if (typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (response as any).candidates[0].content.parts[0].text;
    }

    if (!text || text.trim().length === 0) {
      throw new Error('AI wrapper: API returned empty response');
    }

    console.log(`✅ [AI WRAPPER] Gemini ${modelName} succeeded`);

    // Normalize response to match internal expectations
    return {
      text: text,
      candidates: [
        {
          content: {
            parts: [{ text: text }],
          },
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI request failed: ${message}`);
  }
}

function getRealAIService(serviceType: 'analyzer' | 'writer') {
  const config = getAIConfig();

  if (!config.googleApiKey) {
    throw new Error('Google API key not configured. Real AI service cannot proceed.');
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

          const data = await callAI(prompt, { modelName: 'gemini-1.5-pro' });
          const content = data.candidates[0]?.content?.parts[0]?.text;
          
          if (!content || content.trim().length === 0) {
            throw new Error('AI analyzer returned empty response');
          }

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in response');
          }

          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error('Real AI analyzer failed: ' + message);
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

          const data = await callAI(prompt, { modelName: 'gemini-1.5-pro' });
          const content = data.candidates[0]?.content?.parts[0]?.text;
          
          if (!content || content.trim().length === 0) {
            throw new Error('AI writer returned empty response');
          }

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
          const message = error instanceof Error ? error.message : String(error);
          throw new Error('Real AI writer failed: ' + message);
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

/**
 * TEMPORARY: Test available models
 * Run this to see which Gemini models your API key can access
 */
export async function testAvailableModels(): Promise<void> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('❌ No API key configured');
      return;
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    const models = await (ai.models as any).list?.();
    
    console.log('📋 Available Models:');
    console.log(models.page.map((m: any) => m.name));
  } catch (error) {
    console.error('❌ Error listing models:', error);
  }
}

// Log AI configuration status on module load
if (typeof window !== 'undefined') {
  // Expose testAvailableModels immediately to window
  (window as any).testAvailableModels = testAvailableModels;
  
  // Small delay to ensure console is ready for logging
  setTimeout(() => {
    logAIConfigStatus();
    console.log('✅ testAvailableModels available in console');
  }, 0);
}
