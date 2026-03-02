export interface GeneratedItem {
  slotId: string;
  questionType: string;
  prompt: string;

  // Optional for MCQ or other structured types
  options?: string[];

  // Optional for short/extended response
  answer?: string;

  /**
   * Passage-based items: the reading passage text.
   * The Writer emits this as a top-level key instead of embedding the passage in `prompt`.
   */
  passage?: string;

  /**
   * Passage-based sub-questions — each has its own prompt + model answer.
   */
  questions?: Array<{ prompt: string; answer: string }>;

  // Extensible metadata for future features
  metadata?: Record<string, any>;
}
