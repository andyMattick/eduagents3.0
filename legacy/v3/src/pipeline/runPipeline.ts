import { UnifiedAssessmentRequest } from "pipeline/contracts";
import { analyzeDocument } from "./agents/documentAnalyzer";
import { storeDocumentForRAG } from "./agents/documentAnalyzer/storeDocumentForRAG";
import { runOrchestrator, type OrchestratorIntent } from "./orchestrator";

type PipelineProgressHandler = (items: any[]) => void;

export interface PipelineDispatchRequest {
  intent: OrchestratorIntent;
  input: any;
  depth?: number;
  onItemsProgress?: PipelineProgressHandler;
  file?: File | null;
}

function isPipelineDispatchRequest(value: unknown): value is PipelineDispatchRequest {
  return !!value && typeof value === "object" && "intent" in value && "input" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function maybeAttachFileContext(intent: OrchestratorIntent, input: any, file?: File | null) {
  if (!file) return input;

  const insights = await analyzeDocument(file);
  const rawText = String(insights.rawText ?? "").trim();

  if (rawText.length > 50) {
    storeDocumentForRAG(file.name, rawText, {
      source: "runPipeline",
      intent,
    });
  }

  if (!isRecord(input)) {
    return input;
  }

  if (intent === "create") {
    const sourceDocuments = Array.isArray(input.sourceDocuments) ? input.sourceDocuments : [];

    return {
      ...input,
      sourceDocuments: [
        ...sourceDocuments,
        {
          id: `upload-${sourceDocuments.length + 1}`,
          name: file.name,
          content: rawText,
        },
      ],
    };
  }

  return {
    ...input,
    fileName: typeof input.fileName === "string" ? input.fileName : file.name,
    text: typeof input.text === "string" ? input.text : rawText,
  };
}

export async function runPipeline(
  request: UnifiedAssessmentRequest | PipelineDispatchRequest,
  depth: number = 0,
  onItemsProgress?: PipelineProgressHandler
) {
  if (isPipelineDispatchRequest(request)) {
    const input = await maybeAttachFileContext(request.intent, request.input, request.file);

    return runOrchestrator({
      intent: request.intent,
      input,
      depth: request.depth ?? depth,
      onItemsProgress: request.onItemsProgress ?? onItemsProgress,
    });
  }

  return runOrchestrator({
    intent: "create",
    input: request,
    depth,
    onItemsProgress,
  });
}
