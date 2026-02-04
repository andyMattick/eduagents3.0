/**
 * Teacher Notepad Context & Hook
 * 
 * Provides persistent notepad state across all pipeline steps
 * Teachers can jot down thoughts, observations, and refinement ideas
 */

import React, { createContext, useContext, useState } from 'react';

export interface NotepadEntry {
  id: string;
  timestamp: string;
  text: string;
  tag?: 'observation' | 'suggestion' | 'fix' | 'todo';
  linkedProblemId?: string;
  linkedStudentId?: string;
}

interface NotepadContextType {
  entries: NotepadEntry[];
  addEntry: (text: string, tag?: NotepadEntry['tag'], linkedProblemId?: string, linkedStudentId?: string) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  exportNotes: () => string;
}

const NotepadContext = createContext<NotepadContextType | undefined>(undefined);

export const NotepadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<NotepadEntry[]>([]);

  const addEntry = (text: string, tag?: NotepadEntry['tag'], linkedProblemId?: string, linkedStudentId?: string) => {
    const newEntry: NotepadEntry = {
      id: `note_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      text,
      tag,
      linkedProblemId,
      linkedStudentId,
    };
    setEntries([newEntry, ...entries]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const clearAll = () => {
    setEntries([]);
  };

  const exportNotes = () => {
    return entries
      .map((e) => `[${e.timestamp}] ${e.tag ? `(${e.tag.toUpperCase()})` : ''}\n${e.text}`)
      .join('\n\n---\n\n');
  };

  return (
    <NotepadContext.Provider value={{ entries, addEntry, removeEntry, clearAll, exportNotes }}>
      {children}
    </NotepadContext.Provider>
  );
};

export const useNotepad = () => {
  const context = useContext(NotepadContext);
  if (!context) {
    throw new Error('useNotepad must be used within NotepadProvider');
  }
  return context;
};
