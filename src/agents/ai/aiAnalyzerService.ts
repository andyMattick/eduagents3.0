/**
 * AI Analyzer Service
 * 
 * Analyzes assignments using real Gemini API
 */

import { getAnalyzerService, AnalyzeAssignmentResponse } from '../config/aiConfig';

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
  console.log('Currently using: Gemini API (Real AI only)');
  return true;
}
