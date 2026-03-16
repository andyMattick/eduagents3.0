import type { WriterItemMetadata } from "../types";

export interface WriterTemplateSlot {
  domain?: string | null;
  topic?: string | null;
  sharedContext?: string | null;
  grade?: string | number | null;
  metadata?: {
    taskType?: string | null;
    [key: string]: unknown;
  };
}

export interface TemplateOutput {
  prompt: string;
  answer: string | null;
  options?: string[] | null;
  metadata: Partial<WriterItemMetadata>;
}
