import type { AzureExtractResult } from "../../schema/semantic/AzureExtractResult";
import type { NormalizedAzureLayout } from "../azure/azureNormalizer";

export function mapAzureToCanonical(normalized: NormalizedAzureLayout, fileName: string): AzureExtractResult {
  return {
    fileName,
    content: normalized.content || normalized.readingOrder.join("\n\n"),
    pages: normalized.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text,
    })),
    paragraphs: normalized.paragraphs.map((paragraph) => ({
      text: paragraph.text,
      pageNumber: paragraph.pageNumber,
      role: paragraph.role,
    })),
    tables: normalized.tables.map((table) => ({
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      pageNumber: table.pageNumber,
      cells: table.cells.map((cell) => ({
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        text: cell.text,
      })),
    })),
    readingOrder: [...normalized.readingOrder],
  };
}
