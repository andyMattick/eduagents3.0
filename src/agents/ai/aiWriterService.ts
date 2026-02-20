/**
 * AI Writer Service
 * 
 * Generates problems using real Gemini AI
 */

import { getWriterService, GenerateProblemsResponse } from '../config/aiConfig';

/**
 * Example: Generate problems using Gemini API
 */
export async function generateProblemsExample(
  topic: string,
  bloomGoals: Record<string, number>,
  count: number
): Promise<GenerateProblemsResponse> {
  const writer = getWriterService();

  try {
    const result = await writer.generate(topic, bloomGoals, count);
    console.log('Generation complete:', result);
    return result;
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
}

/**
 * Example: Generate with Phase 3 context
 */
export async function generateWithPhase3Context(
  goal: 'create' | 'analyze' | 'refine',
  topic: string,
  bloomGoals?: Record<string, number>,
  count: number = 5
): Promise<GenerateProblemsResponse> {
  console.log(`📝 Generating problems for: ${goal}`);
  console.log(`📚 Topic: ${topic}`);
  console.log(`✨ Using Gemini API (Real AI only)`);

  return generateProblemsExample(topic, bloomGoals || {}, count);
}
