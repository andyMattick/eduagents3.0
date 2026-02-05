/**
 * Prompt Construction & Exposure System
 * 
 * Builds and exposes the prompt sent to simulateStudents()
 * for auditing and debugging purposes
 */

import { SimulateStudentsPayload } from '../simulation/simulateStudents';

/**
 * Full prompt context sent to AI/mock agent
 */
export interface SimulateStudentsPrompt {
  systemPrompt: string;
  userPrompt: string;
  metadata: {
    assignmentDifficulty: string;
    gradeLevel: string;
    subject: string;
    learnerProfiles: string[];
    bloomLevelDistribution?: Record<string, number>;
    estimatedTimeMinutes?: number;
  };
  timestamp: string;
  payloadId?: string; // Reference to SimulateStudentsPayload
}

// Global storage for last prompt
let lastSimulateStudentsPrompt: SimulateStudentsPrompt | null = null;

/**
 * Get the last prompt sent to simulateStudents
 */
export function getLastSimulateStudentsPrompt(): SimulateStudentsPrompt | null {
  return lastSimulateStudentsPrompt;
}

/**
 * Clear the stored prompt
 */
export function clearSimulateStudentsPrompt(): void {
  lastSimulateStudentsPrompt = null;
}

/**
 * Build system prompt for student simulation
 */
export function buildSystemPrompt(metadata: {
  gradeLevel: string;
  subject: string;
  learnerProfiles: string[];
}): string {
  const profileList = metadata.learnerProfiles.join(', ') || 'various learner types';
  
  return `You are an expert educational analyst providing detailed, constructive feedback on student assignments.

Your task is to simulate feedback from diverse student personas analyzing a student assignment.

Context:
- Grade Level: ${metadata.gradeLevel}
- Subject: ${metadata.subject}
- Student Profiles Being Analyzed: ${profileList}

Instructions:
1. Provide feedback from the perspective of different student learners (visual learners, struggling readers, gifted students, etc.)
2. Be specific about what works well and what could be improved
3. Consider how the assignment difficulty impacts different learner types
4. Provide actionable suggestions aligned with the grade level and subject
5. Estimate engagement and understanding for each persona
6. Identify at-risk learner profiles and explain why they might struggle`;
}

/**
 * Build user prompt with assignment details
 */
export function buildUserPrompt(
  assignmentText: string,
  metadata: {
    wordCount: number;
    sentenceCount: number;
    bloomLevels: Record<string, number>;
    difficulty: string;
    type: string;
    estimatedTimeMinutes?: number;
  }
): string {
  const bloomSummary = Object.entries(metadata.bloomLevels || {})
    .filter(([_, val]) => val > 0)
    .map(([level, percent]) => `${percent.toFixed(0)}% ${level}`)
    .join(', ') || 'mixed Bloom levels';

  return `Analyze the following ${metadata.type} assignment:

═══════════════════════════════════════════════════════════════
ASSIGNMENT TEXT (${metadata.wordCount} words, ${metadata.sentenceCount} sentences):
═══════════════════════════════════════════════════════════════
${assignmentText}
═══════════════════════════════════════════════════════════════

ASSIGNMENT METADATA:
- Difficulty Level: ${metadata.difficulty}
- Type: ${metadata.type}
- Bloom's Taxonomy Distribution: ${bloomSummary}
- Estimated Completion Time: ${metadata.estimatedTimeMinutes ? `${metadata.estimatedTimeMinutes} minutes` : 'not estimated'}

ANALYSIS REQUEST:
Please provide detailed feedback considering:
1. Clarity and Readability for the target grade level
2. Cognitive Demand (based on Bloom levels and question complexity)
3. Engagement potential for different learner types
4. Alignment with subject standards
5. Time management implications
6. Accessibility for struggling readers and ELL students

Format your response as structured feedback from different student personas.`;
}

/**
 * Construct full prompt for audit trail
 */
export function constructFullPrompt(
  assignmentText: string,
  payload: SimulateStudentsPayload,
  metadata?: {
    bloomLevels?: Record<string, number>;
    estimatedTimeMinutes?: number;
  }
): SimulateStudentsPrompt {
  const systemPrompt = buildSystemPrompt({
    gradeLevel: payload.assignmentMetadata.gradeLevel || 'Unknown',
    subject: payload.assignmentMetadata.subject || 'General',
    learnerProfiles: payload.assignmentMetadata.learnerProfiles || [],
  });

  const userPrompt = buildUserPrompt(assignmentText, {
    wordCount: payload.textMetadata.wordCount,
    sentenceCount: payload.textMetadata.sentenceCount,
    bloomLevels: metadata?.bloomLevels || {},
    difficulty: payload.assignmentMetadata.difficulty,
    type: payload.assignmentMetadata.type,
    estimatedTimeMinutes: metadata?.estimatedTimeMinutes,
  });

  const prompt: SimulateStudentsPrompt = {
    systemPrompt,
    userPrompt,
    metadata: {
      assignmentDifficulty: payload.assignmentMetadata.difficulty,
      gradeLevel: payload.assignmentMetadata.gradeLevel || 'Unknown',
      subject: payload.assignmentMetadata.subject || 'General',
      learnerProfiles: payload.assignmentMetadata.learnerProfiles || [],
      bloomLevelDistribution: metadata?.bloomLevels,
      estimatedTimeMinutes: metadata?.estimatedTimeMinutes,
    },
    timestamp: new Date().toISOString(),
  };

  // Store globally for debugging
  lastSimulateStudentsPrompt = prompt;


  return prompt;
}

/**
 * Format prompt for display in UI
 */
export function formatPromptForDisplay(prompt: SimulateStudentsPrompt): {
  systemPrompt: string;
  userPrompt: string;
  summary: string;
} {
  return {
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    summary: `
System Prompt (${prompt.systemPrompt.length} chars):
${prompt.systemPrompt.substring(0, 200)}...

User Prompt (${prompt.userPrompt.length} chars):
${prompt.userPrompt.substring(0, 200)}...

Metadata:
- Difficulty: ${prompt.metadata.assignmentDifficulty}
- Grade Level: ${prompt.metadata.gradeLevel}
- Subject: ${prompt.metadata.subject}
- Learner Profiles: ${prompt.metadata.learnerProfiles.join(', ')}
- Estimated Time: ${prompt.metadata.estimatedTimeMinutes ? `${prompt.metadata.estimatedTimeMinutes} min` : 'N/A'}
    `,
  };
}

/**
 * Expose both payload and prompt on window for debugging
 */
export function exposePromptingSystemToWindow(): void {
  if (typeof window !== 'undefined') {
    (window as any).getLastSimulateStudentsPrompt = getLastSimulateStudentsPrompt;
    (window as any).clearSimulateStudentsPrompt = clearSimulateStudentsPrompt;
  }
}
