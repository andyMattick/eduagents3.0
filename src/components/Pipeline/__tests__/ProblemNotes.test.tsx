/**
 * ProblemNotes Component Tests
 * 
 * Integration tests for problem-level notes UI
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProblemNotes } from '../ProblemNotes';

// Mock the service
vi.mock('../../../services/teacherNotesService', () => ({
  saveTeacherNote: vi.fn().mockResolvedValue({
    id: 'note-1',
    teacherId: 'user-1',
    documentId: 'doc-1',
    problemId: 'prob-1',
    note: 'Test note',
    category: 'clarity',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }),
  getProblemNotes: vi.fn().mockResolvedValue([]),
  updateTeacherNote: vi.fn(),
  deleteTeacherNote: vi.fn(),
}));

describe('ProblemNotes Component', () => {
  const props = {
    problemId: 'prob-1',
    documentId: 'doc-1',
    teacherId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    render(<ProblemNotes {...props} />);
    expect(screen.getByText(/Add New Note/i)).toBeInTheDocument();
  });

  it('should render compact mode button when no notes exist', () => {
    const { rerender } = render(<ProblemNotes {...props} isCompact={true} />);
    expect(screen.getByText(/\+ Add Note/i)).toBeInTheDocument();
  });

  it('should display category selector', () => {
    render(<ProblemNotes {...props} />);
    const select = screen.getByDisplayValue('General Note');
    expect(select).toBeInTheDocument();
  });

  it('should save a note when save button is clicked', async () => {
    const mockOnNoteSaved = vi.fn();
    render(
      <ProblemNotes
        {...props}
        onNoteSaved={mockOnNoteSaved}
      />
    );

    const textarea = screen.getByPlaceholderText(/Add a note/i);
    const saveButton = screen.getByText(/Save Note/i);

    fireEvent.change(textarea, { target: { value: 'Test note content' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnNoteSaved).toHaveBeenCalled();
    });
  });

  it('should disable save button when textarea is empty', () => {
    render(<ProblemNotes {...props} />);
    const saveButton = screen.getByText(/Save Note/i) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});
