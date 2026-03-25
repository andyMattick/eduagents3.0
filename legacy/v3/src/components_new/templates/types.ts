import { DerivedTemplate } from "pipeline/contracts/deriveTemplate";

export interface TemplateOption {
  id: string;
  label: string;
}

export interface TemplateRecord {
  id: string;
  label: string;
  subject?: string;
  itemType?: string;
  cognitiveIntent?: string;
  difficulty?: string;
  sharedContext?: string;
  configurableFields?: Record<string, unknown>;
  explanation?: string;
  previewItems?: unknown[];
  isTeacherTemplate?: boolean;
  examples?: string[];
  inferred?: Record<string, unknown>;
}

export type { DerivedTemplate };
