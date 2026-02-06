/**
 * AI Analyzer Service
 * 
 * Use this in components to analyze assignments with either mock or real AI
 */

import { getAnalyzerService, AnalyzeAssignmentResponse, useRealAI } from '../config/aiConfig';

/**
 * Example: Use in a component to analyze an assignment
 */
export async function analyzeAssignmentExample(assignmentText: string): Promise<AnalyzeAssignmentResponse> {
  const analyzer = getAnalyzerService();
  
  try {
    const result = await analyzer.analyze(assignmentText);
    console.log('Analysis complete:', result);
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Check if real AI is being used
 */
export function checkAIMode() {
  const isReal = useRealAI();
  console.log(`Currently using: ${isReal ? 'Real AI (Gemini)' : 'Mock AI'}`);
  return isReal;
}
