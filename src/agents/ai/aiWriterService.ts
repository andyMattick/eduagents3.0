/**
 * AI Writer Service
 * 
 * Use this in components to generate problems with either mock or real AI
 */

import { getWriterService, GenerateProblemsResponse, useRealAI } from '../config/aiConfig';

/**
 * Example: Generate problems using either mock or real AI
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
  console.log(`🎯 Using ${useRealAI() ? 'Gemini API' : 'Mock AI'}`);

  return generateProblemsExample(topic, bloomGoals || {}, count);
}
