// types/Trace.ts

export type AgentTrace = {
  agent: string;
  input: any;
  output: any;
  startedAt: number;
  finishedAt: number;
  errors?: string[];
  violations?: any[];
};

export type PipelineTrace = {
  runId: string;
  capability: ("write" | "playtest" | "compare")[];
  steps: AgentTrace[];
  startedAt: number;
  finishedAt?: number;
};
