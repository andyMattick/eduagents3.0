/**
 * AIService: Unified abstraction for all AI/API calls
 * 
 * This service provides a single interface for all operations that require
 * external AI/API calls. It supports:
 * - Mocking (for development/testing)
 * - Real API calls (when configured)
 * - Easy switching between mock and real implementations
 * 
 * USAGE:
 * - Import: import { aiService } from '@/agents/api/aiService'
 * - Call: const result = await aiService.generateAssignment(...)
 * - Configure: aiService.setImplementation('real') or aiService.setImplementation('mock')
 */

import { callAI } from '../../config/aiConfig';

export interface AIServiceConfig {
  implementation: 'mock' | 'real';
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
 * Mock implementation of AIService
 * Provides realistic responses without external API calls
 */
class MockAIService implements IAIService {
  async generateAssignmentQuestions(params: {
    prompt: string;
    assignmentType?: string;
    gradeLevel?: string;
    subject?: string;
    count?: number;
  }): Promise<string[]> {
    await this.simulateDelay(800);

    const count = params.count || 5;
    const questions: string[] = [];

    // Generate sample questions based on type
    const types: Record<string, string[]> = {
      essay: [
        'Analyze the main argument and provide your critical perspective.',
        'Compare and contrast the different viewpoints presented.',
        'Synthesize the information to draw original conclusions.',
        'Evaluate the validity of the claims made.',
        'Propose solutions based on the evidence presented.',
      ],
      multiple_choice: [
        'Which of the following best describes...?',
        'According to the passage, what is...?',
        'What can be inferred from the text?',
        'The author primarily argues that...',
        'Which example best illustrates the concept?',
      ],
      short_answer: [
        'Define the key concept in your own words.',
        'How does this relate to previous lessons?',
        'Provide an example from real life.',
        'Explain the reasoning behind your answer.',
        'Describe the process step by step.',
      ],
    };

    const baseQuestions = types[params.assignmentType || 'essay'] || types.essay;
    for (let i = 0; i < count && i < baseQuestions.length; i++) {
      questions.push(baseQuestions[i]);
    }

    return questions;
  }

  async generateAssignment(params: {
    prompt: string;
    type: string;
    gradeLevel: string;
    subject: string;
    wordCount?: number;
  }): Promise<string> {
    await this.simulateDelay(1200);

    const templates: Record<string, string> = {
      essay: `Essay Assignment: ${params.prompt}\n\nGrade Level: ${params.gradeLevel}\nSubject: ${params.subject}\n\nInstructions:\n1. Write a well-structured essay addressing the prompt\n2. Support your arguments with evidence\n3. Use clear, academic language\n4. Include an introduction, body, and conclusion`,
      research_paper: `Research Paper Assignment: ${params.prompt}\n\nGrade Level: ${params.gradeLevel}\nSubject: ${params.subject}\n\nRequirements:\n1. Conduct research using peer-reviewed sources\n2. Present original analysis\n3. Follow proper scholarly format\n4. Include bibliography with at least 5 sources`,
      project: `Project Assignment: ${params.prompt}\n\nGrade Level: ${params.gradeLevel}\nSubject: ${params.subject}\n\nDeliverables:\n1. Project proposal\n2. Progress documentation\n3. Final deliverable\n4. Reflection on learning process`,
    };

    return templates[params.type] || templates.essay;
  }

  async analyzeTags(params: {
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<Array<{ name: string; confidenceScore: number; description: string }>> {
    await this.simulateDelay(800);

    const tags: Array<{ name: string; confidenceScore: number; description: string }> = [];
    const text = params.text.toLowerCase();

    // Analyze text for quality indicators
    const wordCount = params.text.split(/\s+/).length;
    const sentences = params.text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (wordCount > 500) {
      tags.push({
        name: 'comprehensive',
        confidenceScore: 0.85,
        description: 'The assignment covers substantial content',
      });
    }

    if (sentences.length > 10) {
      tags.push({
        name: 'well-organized',
        confidenceScore: 0.78,
        description: 'Clear structure with multiple sections',
      });
    }

    // Check for clarity
    const transitionWords = ['however', 'moreover', 'therefore', 'furthermore'];
    const hasTransitions = transitionWords.some(word => text.includes(word));
    if (hasTransitions) {
      tags.push({
        name: 'clear-flow',
        confidenceScore: 0.82,
        description: 'Good use of transition words',
      });
    }

    return tags.length > 0 ? tags : [
      {
        name: 'needs-clarification',
        confidenceScore: 0.7,
        description: 'Could benefit from more detail',
      },
    ];
  }

  async breakDownProblems(params: {
    text: string;
    assignmentType?: string;
  }): Promise<Array<{ id: string; text: string }>> {
    await this.simulateDelay(1000);

    const problems: Array<{ id: string; text: string }> = [];
    const paragraphs = params.text.split(/\n\n+/).filter(p => p.trim().length > 0);

    paragraphs.slice(0, 5).forEach((p, i) => {
      const trimmed = p.trim();
      if (trimmed.length > 20) {
        problems.push({
          id: `problem-${i + 1}`,
          text: trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : ''),
        });
      }
    });

    return problems.length > 0 ? problems : [
      { id: 'problem-1', text: params.text.substring(0, 200) },
    ];
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
    await this.simulateDelay(600);

    return {
      timeOnTask: Math.floor(Math.random() * 120) + 30,
      confusionSignals: Math.floor(Math.random() * 5),
      engagementScore: Math.random() * 0.5 + 0.5,
      perceivedSuccess: Math.random(),
    };
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
    await this.simulateDelay(1200);

    return {
      feedback: 'Good effort shown in this assignment. Consider adding more detailed examples and deeper analysis.',
      strengths: ['Clear writing', 'Good organization', 'Addresses the prompt'],
      improvements: ['Add more evidence', 'Develop arguments further'],
      score: 85,
    };
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
    await this.simulateDelay(1000);

    return [
      {
        studentPersona: params.studentProfile,
        feedbackType: 'strength',
        content: 'Showed strong engagement with the material and completed most problems correctly.',
      },
      {
        studentPersona: params.studentProfile,
        feedbackType: 'suggestion',
        content: 'Consider taking more time on multi-part problems to ensure all parts are addressed.',
      },
    ];
  }

  async rewriteAssignment(params: {
    originalText: string;
    tags: Array<{ name: string; description: string }>;
    targetChanges?: string[];
  }): Promise<{
    rewrittenText: string;
    summaryOfChanges: string;
  }> {
    await this.simulateDelay(1200);

    let rewrittenText = params.originalText
      .replace(/\bvery\b/gi, 'extremely')
      .replace(/\breally\b/gi, 'notably');

    return {
      rewrittenText,
      summaryOfChanges: `Improved clarity and replaced vague modifiers. Applied ${params.tags.length} suggested improvements.`,
    };
  }

  async generateAccessibilityVariant(params: {
    originalText: string;
    overlay: string;
  }): Promise<string> {
    await this.simulateDelay(1000);

    let variantText = params.originalText;

    switch (params.overlay) {
      case 'adhd':
        // Break into shorter paragraphs, add visual breaks
        variantText = params.originalText
          .split(/\n\n+/)
          .map(para => `\n${para}\n`)
          .join('---\n');
        break;
      case 'dyslexic':
        // Use simpler words, shorter sentences
        variantText = params.originalText
          .split('. ')
          .map(sent => (sent.length > 100 ? sent.substring(0, 100) + '.' : sent + '.'))
          .join(' ');
        break;
      case 'esl':
        // Simpler vocabulary, clearer structure
        variantText = params.originalText.replace(/sophisticated|complex/gi, 'detailed');
        break;
    }

    return variantText;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Gemini AI Service for Writer/Generator
 * Calls Google Generative AI (Gemini) for real assignment generation
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

  constructor(config: AIServiceConfig = { implementation: 'mock' }) {
    this.config = config;
    this.implementation = this.createImplementation(config);
  }

  private createImplementation(config: AIServiceConfig): IAIService {
    const isDev = import.meta.env.DEV;
    const enableMockAI = import.meta.env.VITE_ENABLE_MOCK_AI === 'true';
    
    // Enforce real AI in production/preview
    if (!isDev) {
      if (config.implementation === 'mock') {
        throw new Error('Mock AI is not allowed in production/preview. Real AI is required.');
      }
      // Force real mode in production
      if (!config.apiKey) {
        throw new Error('Production build requires VITE_GOOGLE_API_KEY for real AI.');
      }
    }
    
    if (config.implementation === 'real' && config.apiKey) {
      // Prefer Gemini (Google API) if apiKey looks like Google API key
      if (config.apiKey.startsWith('AIza')) {
        console.log('🔌 Using Gemini AI for Writer/Generator');
        return new GeminiAIService({
          apiKey: config.apiKey,
          timeout: config.timeout,
        });
      }
      // Fall back to generic RealAIService for custom backends
      if (config.apiUrl) {
        return new RealAIService({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          timeout: config.timeout,
        });
      }
    }
    
    // Only allow mock AI in development with explicit flag
    if (isDev && enableMockAI) {
      console.warn('⚠️  Using Mock AI - development mode only');
      return new MockAIService();
    }
    
    // If we get here, no valid AI is configured
    throw new Error('No AI service available. Configure VITE_GOOGLE_API_KEY or set VITE_ENABLE_MOCK_AI=true in development.');
  }

  setImplementation(type: 'mock' | 'real', config?: { apiKey: string; apiUrl: string; timeout?: number }): void {
    this.config.implementation = type;
    if (type === 'real' && config) {
      this.config.apiKey = config.apiKey;
      this.config.apiUrl = config.apiUrl;
      this.config.timeout = config.timeout;
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
const isDev = import.meta.env.DEV;
const enableMockAI = import.meta.env.VITE_ENABLE_MOCK_AI === 'true';
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

// In production/preview, real API key is mandatory
// In development, allow mock AI only with explicit opt-in
let useRealAPI: boolean;
if (!isDev) {
  // Production/preview: must have real API key
  if (!googleApiKey) {
    throw new Error('Production build requires VITE_GOOGLE_API_KEY environment variable.');
  }
  useRealAPI = true;
} else {
  // Development: prefer real API key, fall back to mock with flag
  useRealAPI = !!googleApiKey && !enableMockAI;
}

export const aiService = new AIServiceManager({
  implementation: useRealAPI ? 'real' : 'mock',
  apiKey: googleApiKey,
  apiUrl: import.meta.env.VITE_REACT_APP_API_URL,
});

export default aiService;
