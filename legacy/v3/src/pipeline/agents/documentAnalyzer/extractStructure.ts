import type { DocumentDiagram, DocumentSection, DocumentTable } from "pipeline/contracts";

export interface StructureResult {
  sections: DocumentSection[];
  tables: DocumentTable[];
  diagrams: DocumentDiagram[];
}

function looksLikeHeading(line: string): boolean {
  if (!line) return false;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^(chapter|section|lesson|unit)\s+\d+/i.test(line)) return true;
  return line.length <= 80 && line === line.toUpperCase() && /[A-Z]{3,}/.test(line);
}

export function extractStructure(text: string): StructureResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const sections: DocumentSection[] = [];
  const tables: DocumentTable[] = [];
  const diagrams: DocumentDiagram[] = [];

  lines.forEach((line, index) => {
    if (looksLikeHeading(line)) {
      sections.push({ id: `section-${sections.length + 1}`, heading: line, content: line });
      return;
    }

    if (/\||\t|\btable\b/i.test(line)) {
      tables.push({ id: `table-${tables.length + 1}`, preview: line.slice(0, 140) });
    }

    if (/\b(diagram|graph|chart|figure|plot)\b/i.test(line)) {
      diagrams.push({ id: `diagram-${diagrams.length + 1}`, label: line.slice(0, 140) });
    }

    if (index < 14 && line.length >= 12) {
      sections.push({ id: `section-${sections.length + 1}`, heading: line.slice(0, 80), content: line });
    }
  });

  return {
    sections: sections.slice(0, 40),
    tables: tables.slice(0, 20),
    diagrams: diagrams.slice(0, 20),
  };
}
