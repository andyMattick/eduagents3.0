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
    itemCount: number;
    conceptCount: number;
    dominantSurfaceForm: string | null;
    dominantTaskType: string | null;
  };
}
