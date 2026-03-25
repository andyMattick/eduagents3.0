export interface SectionStructure {
  id: string;
  title?: string;
  taskType: string | null;
  itemIds: string[];

  distributions: {
    bloom: Record<string, number>;
    difficulty: Record<string, number>;
    surfaceForm: Record<string, number>;
    taskType: Record<string, number>;
  };

  conceptCoverage: string[];

  sectionTemplate: {
    id: string;
    taskType: string | null;
    secondaryTaskTypes?: string[];
    itemCount: number;
    conceptCount: number;
    dominantSurfaceForm: string | null;
    dominantTaskType?: string | null;
    secondarySurfaceForms?: string[];
    structurePattern?: string;
    difficultyDistribution?: Record<string, number>;
    bloomDistribution?: Record<string, number>;
    surfaceFormDistribution?: Record<string, number>;
    taskTypeDistribution?: Record<string, number>;
  };
}
