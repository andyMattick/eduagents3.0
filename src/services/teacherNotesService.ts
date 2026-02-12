/**
 * Teacher Notes Service
 * 
 * CRUD operations for persistent teacher annotations stored in Supabase.
 * Handles document-level and problem-level notes.
 */

import { getSupabase } from './teacherSystemService';
import {
  TeacherNote,
  CreateTeacherNoteRequest,
  UpdateTeacherNoteRequest,
  OrganizedTeacherNotes,
} from '../types/teacherNotes';

// ============================================================================
// CREATE
// ============================================================================

/**
 * Save a new teacher note (document-level or problem-level)
 */
export async function saveTeacherNote(
  teacherId: string,
  request: CreateTeacherNoteRequest
): Promise<TeacherNote> {
  const db = getSupabase();

  const { data, error } = await db
    .from('teacher_notes')
    .insert({
      teacher_id: teacherId,
      document_id: request.documentId,
      problem_id: request.problemId || null,
      note: request.note,
      category: request.category || 'other',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save teacher note: ${error.message}`);
  }

  return mapRowToTeacherNote(data);
}

// ============================================================================
// READ
// ============================================================================

/**
 * Get all notes for a specific document
 */
export async function getTeacherNotes(
  documentId: string,
  teacherId: string
): Promise<TeacherNote[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from('teacher_notes')
    .select('*')
    .eq('document_id', documentId)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch teacher notes: ${error.message}`);
  }

  return (data || []).map(mapRowToTeacherNote);
}

/**
 * Get all notes for a specific problem
 */
export async function getProblemNotes(
  documentId: string,
  problemId: string,
  teacherId: string
): Promise<TeacherNote[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from('teacher_notes')
    .select('*')
    .eq('document_id', documentId)
    .eq('problem_id', problemId)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch problem notes: ${error.message}`);
  }

  return (data || []).map(mapRowToTeacherNote);
}

/**
 * Get document-level notes only
 */
export async function getDocumentLevelNotes(
  documentId: string,
  teacherId: string
): Promise<TeacherNote[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from('teacher_notes')
    .select('*')
    .eq('document_id', documentId)
    .eq('teacher_id', teacherId)
    .is('problem_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch document-level notes: ${error.message}`);
  }

  return (data || []).map(mapRowToTeacherNote);
}

/**
 * Get all notes organized by context (document-level and by problem)
 */
export async function getOrganizedTeacherNotes(
  documentId: string,
  teacherId: string
): Promise<OrganizedTeacherNotes> {
  const allNotes = await getTeacherNotes(documentId, teacherId);

  const documentLevel = allNotes.filter((n) => !n.problemId);
  const byProblem: Record<string, TeacherNote[]> = {};

  for (const note of allNotes) {
    if (note.problemId) {
      if (!byProblem[note.problemId]) {
        byProblem[note.problemId] = [];
      }
      byProblem[note.problemId].push(note);
    }
  }

  return { documentLevel, byProblem };
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update an existing teacher note
 */
export async function updateTeacherNote(
  noteId: string,
  teacherId: string,
  request: UpdateTeacherNoteRequest
): Promise<TeacherNote> {
  const db = getSupabase();

  const { data, error } = await db
    .from('teacher_notes')
    .update({
      note: request.note,
      category: request.category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('teacher_id', teacherId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update teacher note: ${error.message}`);
  }

  return mapRowToTeacherNote(data);
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a teacher note
 */
export async function deleteTeacherNote(
  noteId: string,
  teacherId: string
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('teacher_notes')
    .delete()
    .eq('id', noteId)
    .eq('teacher_id', teacherId);

  if (error) {
    throw new Error(`Failed to delete teacher note: ${error.message}`);
  }
}

/**
 * Delete all notes for a specific document
 */
export async function deleteDocumentNotes(
  documentId: string,
  teacherId: string
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('teacher_notes')
    .delete()
    .eq('document_id', documentId)
    .eq('teacher_id', teacherId);

  if (error) {
    throw new Error(`Failed to delete document notes: ${error.message}`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map a database row to a TeacherNote object
 */
function mapRowToTeacherNote(row: any): TeacherNote {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    documentId: row.document_id,
    problemId: row.problem_id || undefined,
    note: row.note,
    category: row.category as TeacherNote['category'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
