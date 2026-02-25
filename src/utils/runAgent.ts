import { PipelineTrace } from "@/types/Trace";

export async function runAgent(
  trace: PipelineTrace,
  label: string,
  fn: (input: any) => Promise<any>,
  input: any
) {
  const startedAt = Date.now();

  try {
    const output = await fn(input);

    trace.steps.push({
      agent: label,
      input,
      output,
      errors: [],
      startedAt,
      finishedAt: Date.now(),
      duration: Date.now() - startedAt,
    });

    return output; // ⭐ THIS IS THE FIX
  } catch (err: any) {
    trace.steps.push({
      agent: label,
      input,
      output: null,
      errors: [err.message],
      startedAt,
      finishedAt: Date.now(),
      duration: Date.now() - startedAt,
    });

    throw err;
  }
}
