/**
 * Save assignment problems to the Problem Bank
 * Converts Asteroids to UniversalProblems and saves them with deduplication
 */

import { Asteroid } from '../../types/simulation';
import { UniversalProblem } from '../../types/universalPayloads';
import { asteroidToUniversalProblem } from './asteroidToUniversalProblem';
import { upsertProblemToProblemBank } from '../../services/teacherSystemService';

export interface SaveProblremsToProblemBankOptions {
  teacherId: string;
  asteroids: Asteroid[];
  documentId: string;
  assignmentId: string;
  subject: string;
  sectionId?: string;
  createdBy: string;
}

export interface SaveResult {
  successCount: number;
  failureCount: number;
  savedProblemIds: string[];
  errors: Array<{ asteroidId: string; error: string }>;
}

/**
 * Save all asteroids from an assignment to the problem bank
 * 
 * Flow:
 * 1. Convert each Asteroid to UniversalProblem
 * 2. Call upsertProblemToProblemBank for each
 * 3. Collect results and return summary
 * 
 * @returns SaveResult with success count, saved IDs, and any errors
 */
export async function saveAsteroidsToProblemBank(
  options: SaveProblremsToProblemBankOptions,
): Promise<SaveResult> {
  const {
    teacherId,
    asteroids,
    documentId,
    assignmentId,
    subject,
    sectionId = 'S1',
    createdBy,
  } = options;

  const result: SaveResult = {
    successCount: 0,
    failureCount: 0,
    savedProblemIds: [],
    errors: [],
  };

  if (!asteroids || asteroids.length === 0) {
    console.warn('No asteroids to save to problem bank');
    return result;
  }

  // Convert and save each asteroid
  for (const asteroid of asteroids) {
    try {
      // Convert Asteroid to UniversalProblem
      const universalProblem = asteroidToUniversalProblem(
        asteroid,
        documentId,
        sectionId,
        subject,
      );

      // Save to problem bank using upsert (handles deduplication automatically)
      const entryId = await upsertProblemToProblemBank(
        teacherId,
        universalProblem,
        documentId,
        assignmentId,
        createdBy,
      );

      result.successCount++;
      result.savedProblemIds.push(entryId);
    } catch (error) {
      result.failureCount++;
      result.errors.push({
        asteroidId: asteroid.ProblemId || 'unknown',
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(
        `Error saving asteroid ${asteroid.ProblemId} to problem bank:`,
        error,
      );
    }
  }

  return result;
}
