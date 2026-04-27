import type { AzureExtractResult } from "../schema/semantic";

export interface IngestionSection {
  sectionId: string;
  title?: string;
  text: string;
}

export interface IngestionPipelineResult {
  canonical: AzureExtractResult;
  sections: IngestionSection[];
  rawAzureRetained: boolean;
}
