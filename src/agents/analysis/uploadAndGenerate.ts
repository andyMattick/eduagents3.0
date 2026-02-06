/**
 * Phase 3: Main Upload & Generate API
 * 
 * Orchestrates: file handling → intent extraction → optimized assignment generation
 */

import { extractIntentFromMaterials, refineIntentTags } from './intentExtraction';
import {
  generateAsteroidOptimizedAssignment,
  validateAssignmentDesign,
} from './optimizedAssignmentGeneration';
import {
  AssignmentType,
  AssignmentIntentTags,
  AsteroidOptimizedAssignment,
  AssignmentGenerationSession,
} from '../../types/assignmentGeneration';

/**
 * Parse PDF, DOCX, or text files (simplified - in production use pdfjs, mammoth, etc.)
 */
async function extractTextFromFile(
  file: File | { name: string; content: string }
): Promise<string> {
  if ('content' in file) {
    return file.content;
  }

  // For File objects, read as text (production would handle different file types)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Main entry point: Upload teacher materials and generate optimized assignment
 * 
 * Workflow:
 * 1. Extract text from uploaded file
 * 2. Extract pedagogical intent from text
 * 3. Generate optimized assignment based on intent and type
 * 4. Validate and return
 */
export async function uploadAndGenerateAssignment(options: {
  file: File | { name: string; content: string };
  assignmentType: AssignmentType;
  topic?: string;
  gradeLevel?: string;
  subject?: string;
  problemCount?: number;
  intentOverrides?: Partial<AssignmentIntentTags>;
  onProgress?: (step: string, data?: any) => void;
}): Promise<{
  session: AssignmentGenerationSession;
  assignment: AsteroidOptimizedAssignment;
}> {
  const sessionId = `gen-${Date.now()}`;
  const session: AssignmentGenerationSession = {
    id: sessionId,
    sessionStart: new Date().toISOString(),
    status: 'uploading',
  };

  try {
    // Step 1: Extract text from file
    options.onProgress?.('Uploading file...');
    session.status = 'uploading';
    session.currentStep = 'File extraction';

    const extractedText = await extractTextFromFile(options.file);
    session.extractedText = extractedText;
    session.uploadedFile = {
      name: (options.file as any).name,
      type: (options.file as any).name.endsWith('.pdf')
        ? 'pdf'
        : (options.file as any).name.endsWith('.docx')
          ? 'docx'
          : 'text',
      size: extractedText.length,
    };

    options.onProgress?.('Text extracted', {
      characterCount: extractedText.length,
    });

    // Step 2: Extract pedagogical intent
    options.onProgress?.('Analyzing instructional intent...');
    session.status = 'extracting';
    session.currentStep = 'Intent extraction';

    let intentTags = extractIntentFromMaterials(
      extractedText,
      options.topic || 'General',
      options.gradeLevel
    );

    // Apply user overrides if provided
    if (options.intentOverrides) {
      intentTags = refineIntentTags(intentTags, options.intentOverrides);
    }

    session.intentTags = intentTags;

    options.onProgress?.('Intent analyzed', {
      bloomLevels: Object.keys(intentTags.inferredBloomDistribution),
      tone: intentTags.instructionalTone,
      confidence: intentTags.extractionConfidence,
    });

    // Step 3: Generate optimized assignment
    options.onProgress?.('Generating optimized assignment...');
    session.status = 'generating';
    session.currentStep = 'Assignment generation';

    const assignment = generateAsteroidOptimizedAssignment(intentTags, options.assignmentType, {
      gradeLevel: options.gradeLevel,
      subject: options.subject,
      problemCount: options.problemCount,
    });

    // Add source context
    assignment.sourceContext = {
      fileName: session.uploadedFile?.name,
      uploadDate: session.sessionStart,
      contentType: session.uploadedFile?.type,
    };

    options.onProgress?.('Assignment generated', {
      problemCount: assignment.asteroids.length,
      estimatedTime: assignment.estimatedTimeMinutes,
    });

    // Validate assignment design
    validateAssignmentDesign(assignment);
    
    session.status = 'complete';
    session.generatedAssignment = assignment;

    return { session, assignment };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    session.status = 'error';
    session.errorMessage = errorMessage;
    // Assignment generation failed
    throw error;
  }
}

/**
 * Quick generation with minimal configuration (sensible defaults)
 */
export async function quickGenerateAssignment(
  file: File | { name: string; content: string },
  assignmentType: AssignmentType = 'practice-set'
): Promise<AsteroidOptimizedAssignment> {
  const { assignment } = await uploadAndGenerateAssignment({
    file,
    assignmentType,
  });
  return assignment;
}

/**
 * Regenerate assignment with different parameters (reuse extraction)
 */
export function regenerateAssignmentFromIntent(
  intent: AssignmentIntentTags,
  newAssignmentType: AssignmentType,
  options?: {
    gradeLevel?: string;
    subject?: string;
    problemCount?: number;
  }
): AsteroidOptimizedAssignment {
  // Regenerate assignment
  return generateAsteroidOptimizedAssignment(intent, newAssignmentType, options);
}

/**
 * Batch generate multiple variations of an assignment
 */
export function generateAssignmentVariations(
  intent: AssignmentIntentTags,
  _baseType: AssignmentType,
  variations: AssignmentType[] = ['quiz', 'practice-set', 'project']
): AsteroidOptimizedAssignment[] {
  // Generate variations
  return variations.map(type => generateAsteroidOptimizedAssignment(intent, type));
}

/**
 * Export assignment data for external processing
 */
export function exportAssignmentData(
  assignment: AsteroidOptimizedAssignment,
  format: 'json' | 'csv' = 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(assignment, null, 2);
  } else {
    // CSV format
    const headers = [
      'Problem ID',
      'Bloom Level',
      'Problem Text',
      'Complexity',
      'Novelty',
      'Has Tips',
      'Multi-Part',
    ];
    const rows = assignment.asteroids.map(a => [
      a.ProblemId,
      a.BloomLevel,
      a.ProblemText,
      a.LinguisticComplexity.toFixed(2),
      a.NoveltyScore.toFixed(2),
      a.HasTips ? 'Yes' : 'No',
      a.MultiPart ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
