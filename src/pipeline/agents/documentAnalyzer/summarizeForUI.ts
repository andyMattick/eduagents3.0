import type { DocumentInsights } from "@/pipeline/contracts";

export interface UISummary {
  sections: string[];
  vocab: string[];
  concepts: string[];
  examples: string[];
  formulas: string[];
  diagrams: string[];
  metadata: DocumentInsights["metadata"];
}

export function summarizeForUI(insights: DocumentInsights): UISummary {
  return {
    sections: insights.sections.map((section) => section.heading).slice(0, 8),
    vocab: insights.vocab.slice(0, 20),
    concepts: insights.concepts.slice(0, 20),
    examples: insights.examples.map((example) => example.text).slice(0, 10),
    formulas: insights.formulas.slice(0, 15),
    diagrams: insights.diagrams.map((diagram) => diagram.label).slice(0, 8),
    metadata: insights.metadata,
  };
}
