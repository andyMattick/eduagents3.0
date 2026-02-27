// utils/trace.ts

import { PipelineTrace, AgentTrace } from "@/types/Trace";

export function createTrace(capability: PipelineTrace["capability"]): PipelineTrace {
  return {
    runId: crypto.randomUUID(),
    capability,
    steps: [],
    startedAt: Date.now(),
  };
}

export function logAgentStep(
  trace: PipelineTrace,
  agent: string,
  input: any,
  output: any,
  errors?: string[],
  violations?: any[]
) {
  const step: AgentTrace = {
    agent,
    input,
    output,
    errors,
    violations,
    startedAt: Date.now(),
    finishedAt: Date.now(),
    duration: 0, // This will be updated after the step is completed
  };

  trace.steps.push(step);
}
