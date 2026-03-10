import { runCreatePipeline } from "./create";
import { runDocumentView } from "./document";
import { runAnalyzePipeline } from "./analyze";
import { runComparePipeline } from "./compare";
import { runTestPipeline } from "./test";

export type OrchestratorIntent =
  | "create"
  | "analyze"
  | "compare"
  | "test"
  | "summary"
  | "concepts"
  | "difficulty"
  | "raw";


export async function runOrchestrator(options: {
  intent: OrchestratorIntent;
  input: any;
  depth?: number;
  onItemsProgress?: (items: any[]) => void;
}) {
  const { intent, input, depth = 0, onItemsProgress } = options;

  switch (intent) {
    case "create":
      return runCreatePipeline(input, depth, onItemsProgress);

    case "analyze":
      return runAnalyzePipeline(input);

    case "compare":
      return runComparePipeline(input);

    case "test":
      return runTestPipeline(input);

    case "summary":
    case "concepts":
    case "difficulty":
    case "raw":
      return runDocumentView(intent, input);

    default:
      throw new Error(`Unknown orchestrator intent: ${intent}`);
  }
}
