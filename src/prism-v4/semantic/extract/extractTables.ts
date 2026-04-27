import { AzureExtractResult } from "../../schema/semantic/AzureExtractResult";
import { Problem } from "../../schema/domain/Problem";

export function extractTables(
  azure: AzureExtractResult,
  problems: Problem[]
): Record<string, NonNullable<AzureExtractResult["tables"]>> {
  const tables = azure.tables ?? [];
  if (!tables.length) return {};

  const byProblem: Record<string, NonNullable<AzureExtractResult["tables"]>> = {};
  for (const p of problems) {
    byProblem[p.problemId] = [];
  }

  for (const table of tables) {
    const pageNumber = table.pageNumber ?? 1;
    let closest: Problem | null = null;
    let bestDistance = Infinity;

    for (const p of problems) {
      const dist = Math.abs((p.sourcePageNumber ?? 1) - pageNumber);
      if (dist < bestDistance) {
        bestDistance = dist;
        closest = p;
      }
    }

    if (closest) {
      byProblem[closest.problemId].push(table);
    }
  }

  return byProblem;
}
