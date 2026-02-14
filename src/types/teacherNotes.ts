/**
 * Teacher Notes Types
 * 
 * Definitions for persistent teacher annotations at document and problem levels.
 * Notes are storage-only annotations that never mutate UniversalProblem.
 */

/**
 * Represents a single teacher note
 */
export interface TeacherNote {
  id: string;
  teacherId: string;
  documentId: string;
  problemId?: string;              // undefined = document-level note
  note: string;
  category?: "clarity" | "difficulty" | "alignment" | "typo" | "other";
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a request to create or update a teacher note
 */
export interface CreateTeacherNoteRequest {
  documentId: string;
  problemId?: string;
  note: string;
  category?: "clarity" | "difficulty" | "alignment" | "typo" | "other";
}

/**
 * Represents a request to update an existing teacher note
 */
export interface UpdateTeacherNoteRequest {
  note?: string;
  category?: "clarity" | "difficulty" | "alignment" | "typo" | "other";
}

/**
 * Represents a note organized by context
 */
export interface OrganizedTeacherNotes {
  documentLevel: TeacherNote[];
  byProblem: Record<string, TeacherNote[]>;
}
