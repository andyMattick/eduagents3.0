/**
 * concurrency.ts
 *
 * Shared concurrency utilities for the pipeline.
 */

/**
 * withConcurrencyLimit — run an array of async task factories with a maximum
 * number of tasks in flight at any time.
 *
 * - Output order is preserved: results[i] corresponds to tasks[i].
 * - Errors propagate: if a task throws, the error bubbles up. Wrap individual
 *   tasks in try/catch if you need fault isolation per task.
 *
 * @param limit   Maximum number of concurrent tasks.
 * @param tasks   Array of zero-argument async functions to execute.
 */
export async function withConcurrencyLimit<T>(
  limit: number,
  tasks: (() => Promise<T>)[]
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker)
  );

  return results;
}
