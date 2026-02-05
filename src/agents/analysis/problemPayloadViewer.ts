/**
 * Problem Payload Viewer
 * Exposes the complete problem structure in a formatted, teacher-friendly way
 */

import { ExtractedProblem } from './documentStructureParser';
import { AsteroidOptimizedProblem } from './asteroidOptimizedGenerator';

/**
 * Internal payload format for viewing
 * Matches the user's requested schema exactly
 */
export interface ProblemPayload {
  problemId: string;
  sectionId: string;
  text: string;
  isMultipart: boolean;
  bloomLevels: string[]; // Convert BloomLevel[] to string[]
  problemType: string;
  complexity: number;
  novelty: number;
  structure: 'single-part' | 'multi-part';
  length: number;
  similarity: number;
  
  // Extended metadata (not in schema but useful for teachers)
  estimatedTimeMinutes?: number;
  linguisticComplexity?: number;
  subparts?: Array<{
    id: string;
    text: string;
    bloomLevels: string[];
    order: number;
  }>;
  generatedPrompt?: string;
  rationale?: string;
  scaffoldingTips?: string[];
}

/**
 * Convert ExtractedProblem to ProblemPayload
 */
export function extractedProblemToPayload(problem: ExtractedProblem): ProblemPayload {
  return {
    problemId: problem.problemId,
    sectionId: problem.sectionId,
    text: problem.text,
    isMultipart: problem.isMultipart,
    bloomLevels: problem.bloomLevels,
    problemType: problem.problemType,
    complexity: Number(problem.complexity.toFixed(2)),
    novelty: Number(problem.novelty.toFixed(2)),
    structure: problem.structure,
    length: problem.length,
    similarity: Number(problem.similarity.toFixed(2)),
    estimatedTimeMinutes: problem.estimatedTimeMinutes,
    linguisticComplexity: problem.linguisticComplexity ? Number(problem.linguisticComplexity.toFixed(2)) : undefined,
    subparts: problem.subparts?.map(sp => ({
      id: sp.id,
      text: sp.text,
      bloomLevels: sp.bloomLevels,
      order: sp.order,
    })),
  };
}

/**
 * Convert AsteroidOptimizedProblem to ProblemPayload
 */
export function asteroidProblemToPayload(problem: AsteroidOptimizedProblem): ProblemPayload {
  const payload = extractedProblemToPayload(problem);
  
  // Add extra fields specific to optimized problems
  return {
    ...payload,
    generatedPrompt: problem.generatedPrompt,
    rationale: problem.rationale,
    scaffoldingTips: problem.scaffoldingTips,
  };
}

/**
 * Format payload as JSON (for copy-paste, API calls, etc.)
 */
export function formatPayloadAsJSON(payload: ProblemPayload, pretty: boolean = true): string {
  if (pretty) {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}

/**
 * Format payload as a human-readable table
 */
export function formatPayloadAsTable(payload: ProblemPayload): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(60));
  lines.push(`PROBLEM PAYLOAD: ${payload.problemId}`);
  lines.push('═'.repeat(60));
  lines.push('');
  
  lines.push(`Section ID:           ${payload.sectionId}`);
  lines.push(`Problem Type:         ${payload.problemType}`);
  lines.push(`Is Multipart:         ${payload.isMultipart ? 'Yes' : 'No'}`);
  lines.push(`Structure:            ${payload.structure}`);
  lines.push('');
  
  lines.push('LEARNING METRICS:');
  lines.push(`  Bloom Levels:       ${payload.bloomLevels.join(', ')}`);
  lines.push(`  Complexity:         ${(payload.complexity * 100).toFixed(1)}%`);
  lines.push(`  Novelty Score:      ${(payload.novelty * 100).toFixed(1)}%`);
  lines.push(`  Similarity:         ${(payload.similarity * 100).toFixed(1)}%`);
  
  if (payload.linguisticComplexity !== undefined) {
    lines.push(`  Linguistic Complex: ${(payload.linguisticComplexity * 100).toFixed(1)}%`);
  }
  
  lines.push('');
  lines.push('CONTENT METRICS:');
  lines.push(`  Word Count:         ${payload.length}`);
  
  if (payload.estimatedTimeMinutes !== undefined) {
    lines.push(`  Est. Time:          ${payload.estimatedTimeMinutes} minutes`);
  }
  
  lines.push('');
  lines.push('PROBLEM TEXT:');
  lines.push('─'.repeat(60));
  
  // Wrap text to 60 chars
  const wrapped = wrapText(payload.text, 60);
  lines.push(wrapped);
  
  lines.push('─'.repeat(60));
  
  if (payload.subparts && payload.subparts.length > 0) {
    lines.push('');
    lines.push('SUBPARTS:');
    for (const subpart of payload.subparts) {
      lines.push(`  [${subpart.id.toUpperCase()}] (${subpart.bloomLevels.join(', ')})`);
      const subWrapped = wrapText(subpart.text, 56, 4);
      lines.push(subWrapped);
      lines.push('');
    }
  }
  
  if (payload.rationale) {
    lines.push('');
    lines.push('RATIONALE:');
    const ratWrapped = wrapText(payload.rationale, 60);
    lines.push(ratWrapped);
  }
  
  if (payload.scaffoldingTips && payload.scaffoldingTips.length > 0) {
    lines.push('');
    lines.push('SCAFFOLDING TIPS:');
    for (const tip of payload.scaffoldingTips) {
      const tipWrapped = wrapText(`• ${tip}`, 58, 2);
      lines.push(tipWrapped);
    }
  }
  
  lines.push('');
  lines.push('═'.repeat(60));
  
  return lines.join('\n');
}

/**
 * Format payload as structured text (key: value format)
 */
export function formatPayloadAsStructured(payload: ProblemPayload): string {
  const lines: string[] = [];
  
  lines.push(`[${payload.problemId}] ${payload.structure}`);
  lines.push('');
  
  // Header
  lines.push(`Problem ID:       ${payload.problemId}`);
  lines.push(`Section ID:       ${payload.sectionId}`);
  lines.push(`Problem Type:     ${payload.problemType}`);
  lines.push(`Is Multipart:     ${payload.isMultipart}`);
  
  lines.push('');
  lines.push('Educational Metrics:');
  lines.push(`  blomLevels: [${payload.bloomLevels.join(', ')}]`);
  lines.push(`  complexity: ${payload.complexity}`);
  lines.push(`  novelty: ${payload.novelty}`);
  lines.push(`  similarity: ${payload.similarity}`);
  
  if (payload.linguisticComplexity !== undefined) {
    lines.push(`  linguisticComplexity: ${payload.linguisticComplexity}`);
  }
  
  lines.push('');
  lines.push('Content:');
  lines.push(`  structure: "${payload.structure}"`);
  lines.push(`  length: ${payload.length}`);
  
  if (payload.estimatedTimeMinutes !== undefined) {
    lines.push(`  estimatedTimeMinutes: ${payload.estimatedTimeMinutes}`);
  }
  
  lines.push('');
  lines.push('Problem Text:');
  lines.push('  """');
  
  const textLines = payload.text.split('\n');
  for (const line of textLines) {
    lines.push(`  ${line}`);
  }
  
  lines.push('  """');
  
  return lines.join('\n');
}

/**
 * Helper: Wrap text to specified width
 */
function wrapText(text: string, width: number, indent: number = 0): string {
  const indentStr = ' '.repeat(indent);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length > width) {
      if (currentLine) lines.push(indentStr + currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  
  if (currentLine) lines.push(indentStr + currentLine);
  
  return lines.join('\n');
}

/**
 * Create a downloadable payload file (JSON)
 */
export function generatePayloadFile(
  payload: ProblemPayload,
  filename: string = `problem-${payload.problemId}.json`
): Blob {
  const json = formatPayloadAsJSON(payload);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Generate CSV for multiple problem payloads (for bulk analysis)
 */
export function generatePayloadsAsCSV(payloads: ProblemPayload[]): string {
  if (payloads.length === 0) return '';
  
  const headers = [
    'Problem ID',
    'Section ID',
    'Problem Type',
    'Is Multipart',
    'Bloom Level',
    'Complexity',
    'Novelty',
    'Similarity',
    'Word Count',
    'Est. Time (min)',
  ];
  
  const rows: string[] = [headers.join(',')];
  
  for (const payload of payloads) {
    rows.push([
      payload.problemId,
      payload.sectionId,
      payload.problemType,
      payload.isMultipart ? 'Yes' : 'No',
      payload.bloomLevels.join(';'),
      payload.complexity.toFixed(2),
      payload.novelty.toFixed(2),
      payload.similarity.toFixed(2),
      payload.length,
      payload.estimatedTimeMinutes ?? 'N/A',
    ].map(v => `"${v}"`).join(','));
  }
  
  return rows.join('\n');
}
