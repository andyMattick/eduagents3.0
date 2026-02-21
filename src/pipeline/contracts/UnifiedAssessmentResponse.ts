export interface UnifiedAssessmentResponse {
  architectBlueprint: any;
  writerDraft: any;
  gatekeeperFinal: any;

  metadata: {
    pipelineVersion: string;
    timestamp: string;
    durationMs: number;
  };

  logs: {
    architectPrompt: string;
    architectOutput: string;

    writerPrompt: string;
    writerOutput: string;

    gatekeeperPrompt: string;
    gatekeeperOutput: string;
  };
}
