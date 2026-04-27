// @ts-nocheck
import { UnifiedAnalyzerOutput } from "./unifiedSchema";

export function validateAnalyzerOutput(obj: any): obj is UnifiedAnalyzerOutput {
  if (!obj) return false;
  if (!Array.isArray(obj.structure)) return false;
  if (!Array.isArray(obj.items)) return false;
  if (!obj.style) return false;
  if (!obj.template) return false;
  if (!obj.metadata) return false;
  return true;
}
