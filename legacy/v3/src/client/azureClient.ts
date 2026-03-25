/**
 * src/client/azureClient.ts — Client-side Azure Document Intelligence wrapper
 *
 * Re-exports extractAzureText from the document analyzer for convenience.
 * All callers that need Azure extraction can import from here.
 */

export { extractAzureText } from "../pipeline/agents/documentAnalyzer/extractAzureText";
export type { AzureExtractResult } from "../pipeline/agents/documentAnalyzer/extractAzureText";
