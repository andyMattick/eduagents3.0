export interface AnalyzedItem {
  id: string;
  rawPrompt: string;
  rawAnswer?: string | null;

  surfaceForm: string;
  taskType: string;
  representations: string[];

  bloomSignals: string[];
  difficultySignals: string[];
  concepts: string[];

  formatting: string;
  surfaceArea: "short" | "medium" | "long";

  subItems?: AnalyzedItem[];
}
