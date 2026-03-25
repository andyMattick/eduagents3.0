export interface AnalyzedItem {
  id: string;
  rawPrompt: string;
  taskType: string;
  subItems: AnalyzedItem[];
  surfaceForm: string;
  representations: string[];
  bloomSignals: string[];
  difficultySignals: string[];
  concepts: string[];
  formatting: string;
  surfaceArea: string;
}
