export interface AssignmentVersion {
  content: string;
  summaryOfChanges: string;
  appliedTags: string[];
}

export interface TagChange {
  tag: string;
  delta: number;
  fromConfidence?: number;
  toConfidence?: number;
}
