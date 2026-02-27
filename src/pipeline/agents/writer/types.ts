export interface GeneratedItem {
  slotId: string;
  questionType: string;
  prompt: string;

  // Optional for MCQ or other structured types
  options?: string[];

  // Optional for short/extended response
  answer?: string;

  // Extensible metadata for future features
  metadata?: Record<string, any>;
}
