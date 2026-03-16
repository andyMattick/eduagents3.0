export interface SectionTemplate {
  id: string;
  taskType: string;
  secondaryTaskTypes: string[];
  dominantSurfaceForm: string;
  secondarySurfaceForms: string[];
  itemCount: number;
  conceptCount: number;
  structurePattern: string;
  difficultyDistribution: Record<string, number>;
  bloomDistribution: Record<string, number>;
  surfaceFormDistribution: Record<string, number>;
  taskTypeDistribution: Record<string, number>;
}

export interface SectionStructure {
  id: string;
  title?: string;
  itemIds: string[];
  taskType: string | null;
  distributions: {
    bloom: Record<string, number>;
    difficulty: Record<string, number>;
    surfaceForm: Record<string, number>;
    taskType: Record<string, number>;
  };
  conceptCoverage: string[];
  sectionTemplate: SectionTemplate;
}
