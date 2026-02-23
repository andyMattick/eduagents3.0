// utils/runAgent.ts
import { PipelineTrace } from "@/types/Trace";
import { logAgentStep } from "@/utils/trace";

export async function runAgent<TInput, TOutput>(
  trace: PipelineTrace,
  agentName: string,
  agentFn: (input: TInput) => Promise<TOutput>,
  input: TInput
): Promise<TOutput> {
  const startedAt = Date.now();

  try {
    const output = await agentFn(input);

    logAgentStep(trace, agentName, { ...input, _startedAt: startedAt }, output);
    return output;
  } catch (err: any) {
    logAgentStep(
      trace,
      agentName,
      { ...input, _startedAt: startedAt },
      null,
      [err.message]
    );
    throw err;
  }
}
