export interface UnifiedAnalyzerOutput {
  document_type: string;
  structure: UnifiedSectionStructure[];
  items: UnifiedItem[];
  concepts: UnifiedConceptGraph;
  style: UnifiedTeacherStyleProfile;
  template: UnifiedTemplateProfile;
  metadata: UnifiedMetadata;
}

export interface UnifiedSectionStructure {
  id: string;
  title: string | null;
  itemIds: string[];
  taskType: string | null;
}

export interface UnifiedItem {
  id: string;
  type: string;
  source_text: string;
  normalized_text: string;
  concepts: string[];
  difficulty: number;
  style_features: Record<string, any>;
}

export interface UnifiedConceptGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
}

export interface UnifiedTeacherStyleProfile {
  voice: string;
  question_type_preferences: Record<string, number>;
  rigor_curve: number[];
  pacing: string;
  formatting_patterns: string[];
}

export interface UnifiedTemplateProfile {
  sections: Array<{
    title: string | null;
    count: number;
    type: string | null;
  }>;
  question_distribution: Record<string, number>;
  difficulty_curve: number[];
  pacing: string;
}

export interface UnifiedMetadata {
  domain: string;
  reading_level: string;
  length: number;
  confidence: number;
}
