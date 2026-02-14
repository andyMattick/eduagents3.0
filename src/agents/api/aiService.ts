/**
 * AIService: Unified abstraction for all AI/API calls
 * 
 * This service provides a single interface for all operations that require
 * external AI/API calls using Google Generative AI (Gemini).
 * 
 * REAL AI ONLY - No mock implementations
 * 
 * USAGE:
 * - Import: import { aiService } from '@/agents/api/aiService'
 * - Call: const result = await aiService.generateAssignment(...)
 */

import { callAI } from '../../config/aiConfig';

export interface AIServiceConfig {
  implementation: 'real';
  apiKey?: string;
  apiUrl?: string;
  timeout?: number;
}

/**
 * Core interface for all AI operations
 */
export interface IAIService {
  // ===== GENERATION =====
  /**
   * Generate assignment questions from a prompt
   */
  generateAssignmentQuestions(params: {
    prompt: string;
    assignmentType?: string;
    gradeLevel?: string;
    subject?: string;
    count?: number;
  }): Promise<string[]>;

  /**
   * Generate a complete assignment from parameters
   */
  generateAssignment(params: {
    prompt: string;
    type: string;
    gradeLevel: string;
    subject: string;
    wordCount?: number;
  }): Promise<string>;

  // ===== TAGGING & ANALYSIS =====
  /**
   * Analyze text and extract tags (complexity, Bloom level, etc.)
   */
  analyzeTags(params: {
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<Array<{
    name: string;
    confidenceScore: number;
    description: string;
  }>>;

  /**
   * Break multi-part problems into individual problems
   */
  breakDownProblems(params: {
    text: string;
    assignmentType?: string;
  }): Promise<Array<{
    id: string;
    text: string;
  }>>;

  // ===== SIMULATION & INTERACTION =====
  /**
   * Generate student problem interaction simulation
   * (Time on task, confusion signals, engagement, etc.)
   */
  simulateStudentInteraction(params: {
    studentProfile: Record<string, unknown>;
    problem: Record<string, unknown>;
  }): Promise<{
    timeOnTask: number;
    confusionSignals: number;
    engagementScore: number;
    perceivedSuccess: number;
  }>;

  // ===== ANALYSIS & FEEDBACK =====
  /**
   * Analyze student assignment and provide feedback
   */
  analyzeStudentWork(params: {
    studentWork: string;
    assignmentPrompt: string;
    rubric?: Record<string, unknown>;
  }): Promise<{
    feedback: string;
    strengths: string[];
    improvements: string[];
    score?: number;
  }>;

  /**
   * Generate detailed student feedback from simulation
   */
  generateStudentFeedback(params: {
    studentProfile: string;
    simulationResults: Record<string, unknown>;
    problems: Array<{ id: string; text: string }>;
  }): Promise<Array<{
    studentPersona: string;
    feedbackType: 'strength' | 'weakness' | 'suggestion';
    content: string;
  }>>;

  // ===== REWRITING & IMPROVEMENT =====
  /**
   * Rewrite assignment to improve difficulty, clarity, etc.
   */
  rewriteAssignment(params: {
    originalText: string;
    tags: Array<{ name: string; description: string }>;
    targetChanges?: string[];
  }): Promise<{
    rewrittenText: string;
    summaryOfChanges: string;
  }>;

  /**
   * Suggest accessibility improvements
   */
  generateAccessibilityVariant(params: {
    originalText: string;
    overlay: string; // 'adhd', 'dyslexic', 'esl', etc.
  }): Promise<string>;
}

/**
 * Gemini AI Service for Writer/Generator
 * Calls Google Generative AI (Gemini) for real assignment generation
 * 
 * REAL AI ONLY - No mock implementation
 */
class GeminiAIService implements IAIService {
  private apiKey: string;
  private timeout: number;

  constructor(config: { apiKey: string; timeout?: number }) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  async generateAssignment(params: {
    prompt: string;
    type: string;
    gradeLevel: string;
    subject: string;
    wordCount?: number;
  }): Promise<string> {
    const systemPrompt = `You are an expert educational assessment designer. Create a ${params.type} assignment for ${params.subject} at grade level ${params.gradeLevel}.`;
    
    const userPrompt = `Create an assignment based on this prompt: "${params.prompt}"
    
    Format: ${params.type}
    Subject: ${params.subject}
    Grade Level: ${params.gradeLevel}
    ${params.wordCount ? `Target word count: ${params.wordCount}` : ''}
    
    Provide a complete, well-structured assignment with clear instructions.`;

    try {
      // Use central AI wrapper instead of direct API call
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const data = await callAI(combinedPrompt, { modelName: 'gemini-1.5-pro', maxTokens: 2000 });
      const text = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text || text.trim().length === 0) {
        throw new Error('AI generateAssignment returned empty response');
      }
      return text;
    } catch (error) {
      console.error('Error calling Gemini for generateAssignment:', error);
      throw error;
    }
  }

  async generateAssignmentQuestions(params: {
    prompt: string;
    assignmentType?: string;
    gradeLevel?: string;
    subject?: string;
    count?: number;
  }): Promise<string[]> {
    const userPrompt = `Generate ${params.count || 5} ${params.assignmentType || 'essay'} questions for a ${params.subject || 'general'} assignment at ${params.gradeLevel || 'high school'} level.
    
    Based on this topic: "${params.prompt}"
    
    Return ONLY the questions, one per line, with no numbering or formatting.`;

    try {
      // Use central AI wrapper instead of direct API call
      const data = await callAI(userPrompt, { modelName: 'gemini-1.5-pro', maxTokens: 1000 });
      const text = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text || text.trim().length === 0) {
        throw new Error('AI generateAssignmentQuestions returned empty response');
      }
      return text
        .split('\n')
        .filter(q => q.trim().length > 0)
        .slice(0, params.count || 5);
    } catch (error) {
      console.error('Error calling Gemini for generateAssignmentQuestions:', error);
      throw error;
    }
  }

  // These methods are not implemented for real API
  async analyzeTags(params: {
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<Array<{ name: string; confidenceScore: number; description: string }>> {
    throw new Error('analyzeTags is not implemented for real AI service');
  }

  async breakDownProblems(params: {
    text: string;
    assignmentType?: string;
  }): Promise<Array<{ id: string; text: string }>> {
    throw new Error('breakDownProblems is not implemented for real AI service');
  }

  async simulateStudentInteraction(params: {
    studentProfile: Record<string, unknown>;
    problem: Record<string, unknown>;
  }): Promise<{
    timeOnTask: number;
    confusionSignals: number;
    engagementScore: number;
    perceivedSuccess: number;
  }> {
    throw new Error('simulateStudentInteraction is not implemented for real AI service');
  }

  async analyzeStudentWork(params: {
    studentWork: string;
    assignmentPrompt: string;
    rubric?: Record<string, unknown>;
  }): Promise<{
    feedback: string;
    strengths: string[];
    improvements: string[];
    score?: number;
  }> {
    throw new Error('analyzeStudentWork is not implemented for real AI service');
  }

  async generateStudentFeedback(params: {
    studentProfile: string;
    simulationResults: Record<string, unknown>;
    problems: Array<{ id: string; text: string }>;
  }): Promise<Array<{
    studentPersona: string;
    feedbackType: 'strength' | 'weakness' | 'suggestion';
    content: string;
  }>> {
    throw new Error('generateStudentFeedback is not implemented for real AI service');
  }

  async rewriteAssignment(params: {
    originalText: string;
    tags: Array<{ name: string; description: string }>;
    targetChanges?: string[];
  }): Promise<{
    rewrittenText: string;
    summaryOfChanges: string;
  }> {
    throw new Error('rewriteAssignment is not implemented for real AI service');
  }

  async generateAccessibilityVariant(params: {
    originalText: string;
    overlay: string;
  }): Promise<string> {
    throw new Error('generateAccessibilityVariant is not implemented for real AI service');
  }
}

/**
 * Real API implementation (placeholder)
 * To be implemented when backend is available
 */
class RealAIService implements IAIService {
  private apiKey: string;
  private apiUrl: string;
  private timeout: number;

  constructor(config: { apiKey: string; apiUrl: string; timeout?: number }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.timeout = config.timeout || 30000;
  }

  private async call<T>(endpoint: string, params: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateAssignmentQuestions(params: Parameters<IAIService['generateAssignmentQuestions']>[0]): Promise<string[]> {
    return this.call('/generate/questions', params);
  }

  async generateAssignment(params: Parameters<IAIService['generateAssignment']>[0]): Promise<string> {
    return this.call('/generate/assignment', params);
  }

  async analyzeTags(params: Parameters<IAIService['analyzeTags']>[0]): Promise<ReturnType<IAIService['analyzeTags']>> {
    return this.call('/analyze/tags', params);
  }

  async breakDownProblems(params: Parameters<IAIService['breakDownProblems']>[0]): Promise<ReturnType<IAIService['breakDownProblems']>> {
    return this.call('/analyze/breakdown', params);
  }

  async simulateStudentInteraction(params: Parameters<IAIService['simulateStudentInteraction']>[0]): Promise<ReturnType<IAIService['simulateStudentInteraction']>> {
    return this.call('/simulate/interaction', params);
  }

  async analyzeStudentWork(params: Parameters<IAIService['analyzeStudentWork']>[0]): Promise<ReturnType<IAIService['analyzeStudentWork']>> {
    return this.call('/analyze/student-work', params);
  }

  async generateStudentFeedback(params: Parameters<IAIService['generateStudentFeedback']>[0]): Promise<ReturnType<IAIService['generateStudentFeedback']>> {
    return this.call('/generate/feedback', params);
  }

  async rewriteAssignment(params: Parameters<IAIService['rewriteAssignment']>[0]): Promise<ReturnType<IAIService['rewriteAssignment']>> {
    return this.call('/rewrite/assignment', params);
  }

  async generateAccessibilityVariant(params: Parameters<IAIService['generateAccessibilityVariant']>[0]): Promise<string> {
    return this.call('/generate/accessibility', params);
  }
}

/**
 * Service manager: handles switching between mock and real implementations
 */
class AIServiceManager implements IAIService {
  private implementation: IAIService;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig = { implementation: 'real' }) {
    this.config = config;
    this.implementation = this.createImplementation(config);
  }

  private createImplementation(config: AIServiceConfig): IAIService {
    // Real Gemini API only - no mock, no fallbacks
    if (!config.apiKey) {
      throw new Error('Real AI (Gemini API) requires VITE_GOOGLE_API_KEY environment variable');
    }

    // Prefer Gemini if apiKey looks like Google API key
    if (config.apiKey.startsWith('AIza')) {
      console.log('🔌 Initializing Gemini API for Writer/Generator');
      return new GeminiAIService({
        apiKey: config.apiKey,
        timeout: config.timeout,
      });
    }

    // Fall back to generic RealAIService for custom backends
    if (config.apiUrl) {
      console.log('🔌 Initializing real AI service with custom backend');
      return new RealAIService({
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
        timeout: config.timeout,
      });
    }

    throw new Error('No valid AI service configuration. Provide VITE_GOOGLE_API_KEY (Gemini) or apiUrl (custom backend)');
  }

  setImplementation(_type: 'real', config?: { apiKey: string; apiUrl?: string; timeout?: number }): void {
    // Always use real Gemini API - no switching allowed
    if (config) {
      if (config.apiKey) {
        this.config.apiKey = config.apiKey;
      }
      if (config.apiUrl) {
        this.config.apiUrl = config.apiUrl;
      }
      if (config.timeout) {
        this.config.timeout = config.timeout;
      }
    }
    this.implementation = this.createImplementation(this.config);
  }

  getImplementation(): string {
    return this.config.implementation;
  }

  // Delegate all methods to current implementation
  async generateAssignmentQuestions(params: Parameters<IAIService['generateAssignmentQuestions']>[0]): Promise<string[]> {
    return this.implementation.generateAssignmentQuestions(params);
  }

  async generateAssignment(params: Parameters<IAIService['generateAssignment']>[0]): Promise<string> {
    return this.implementation.generateAssignment(params);
  }

  async analyzeTags(params: Parameters<IAIService['analyzeTags']>[0]): Promise<ReturnType<IAIService['analyzeTags']>> {
    return this.implementation.analyzeTags(params);
  }

  async breakDownProblems(params: Parameters<IAIService['breakDownProblems']>[0]): Promise<ReturnType<IAIService['breakDownProblems']>> {
    return this.implementation.breakDownProblems(params);
  }

  async simulateStudentInteraction(params: Parameters<IAIService['simulateStudentInteraction']>[0]): Promise<ReturnType<IAIService['simulateStudentInteraction']>> {
    return this.implementation.simulateStudentInteraction(params);
  }

  async analyzeStudentWork(params: Parameters<IAIService['analyzeStudentWork']>[0]): Promise<ReturnType<IAIService['analyzeStudentWork']>> {
    return this.implementation.analyzeStudentWork(params);
  }

  async generateStudentFeedback(params: Parameters<IAIService['generateStudentFeedback']>[0]): Promise<ReturnType<IAIService['generateStudentFeedback']>> {
    return this.implementation.generateStudentFeedback(params);
  }

  async rewriteAssignment(params: Parameters<IAIService['rewriteAssignment']>[0]): Promise<ReturnType<IAIService['rewriteAssignment']>> {
    return this.implementation.rewriteAssignment(params);
  }

  async generateAccessibilityVariant(params: Parameters<IAIService['generateAccessibilityVariant']>[0]): Promise<string> {
    return this.implementation.generateAccessibilityVariant(params);
  }
}

// Default export: singleton instance
// Real AI only - Gemini API required
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

export const aiService = new AIServiceManager({
  implementation: 'real',
  apiKey: googleApiKey,
  apiUrl: import.meta.env.VITE_REACT_APP_API_URL,
});

export default aiService;
