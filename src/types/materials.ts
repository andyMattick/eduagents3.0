/**
 * Materials Hub types for managing lesson plans, notes, rubrics, and more
 */

export type MaterialType = 
  | 'lesson_plan'
  | 'notes'
  | 'reference_material'
  | 'rubric'
  | 'assessment_rubric'
  | 'student_sample'
  | 'exemplar';

export interface PredefinedTag {
  name: string;
  category: 'grade_level' | 'subject' | 'topic' | 'bloom_level';
  value: string;
}

export interface Material {
  id: string;
  filename: string;
  materialType: MaterialType;
  content: string;
  predefinedTags: PredefinedTag[];
  customTags: string[];
  description?: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface AIWriterAction {
  type: 'enhance' | 'generate_assignment';
  material: Material;
  targetGradeLevel?: string;
  targetSubject?: string;
  additionalInstructions?: string;
}

export interface MaterialsHubState {
  materials: Material[];
  selectedMaterial?: Material;
  selectedAction?: 'browse' | 'upload' | 'tag' | 'send_to_ai';
  isLoading: boolean;
  error?: string;
}
