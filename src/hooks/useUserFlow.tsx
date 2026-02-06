import { createContext, useContext, useState, ReactNode } from 'react';

export type UserGoal = 'create' | 'analyze';

export interface UserFlowState {
  // Step 1: Goal Selection
  goal: UserGoal | null;
  setGoal: (goal: UserGoal) => void;

  // Step 2: Source Document Selection
  hasSourceDocs: boolean | null;
  setHasSourceDocs: (hasSourceDocs: boolean) => void;

  // Uploaded/Selected files
  sourceFile: File | null;
  setSourceFile: (file: File | null) => void;

  assignmentFile: File | null;
  setAssignmentFile: (file: File | null) => void;

  // Intent capture data (when no source docs)
  intentData: {
    topic: string;
    gradeLevel: string;
    assignmentType: string;
    bloomTargets: string[];
  } | null;
  setIntentData: (data: UserFlowState['intentData']) => void;

  // Extracted data
  extractedTags: string[];
  setExtractedTags: (tags: string[]) => void;

  // Reset flow
  reset: () => void;

  // Get current route based on state
  getCurrentRoute: () => string;
}

const UserFlowContext = createContext<UserFlowState | undefined>(undefined);

export function UserFlowProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [hasSourceDocs, setHasSourceDocs] = useState<boolean | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [intentData, setIntentData] = useState<UserFlowState['intentData']>(null);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);

  const reset = () => {
    setGoal(null);
    setHasSourceDocs(null);
    setSourceFile(null);
    setAssignmentFile(null);
    setIntentData(null);
    setExtractedTags([]);
  };

  const getCurrentRoute = (): string => {
    // Step 1: No goal selected
    if (!goal) {
      return '/goal-selection';
    }

    // Step 2: No source doc decision made
    if (hasSourceDocs === null) {
      return '/source-selection';
    }

    // Step 3+: Route based on goal + hasSourceDocs
    if (goal === 'create') {
      if (hasSourceDocs) {
        if (!sourceFile) {
          return '/source-upload';
        }
        return '/generate-assignment';
      } else {
        if (!intentData) {
          return '/intent-capture';
        }
        return '/generate-assignment';
      }
    } else if (goal === 'analyze') {
      if (hasSourceDocs) {
        if (!sourceFile || !assignmentFile) {
          return '/source-upload';
        }
        return '/analyze-assignment';
      } else {
        if (!assignmentFile) {
          return '/assignment-upload';
        }
        return '/analyze-assignment';
      }
    }

    return '/goal-selection';
  };

  const value: UserFlowState = {
    goal,
    setGoal,
    hasSourceDocs,
    setHasSourceDocs,
    sourceFile,
    setSourceFile,
    assignmentFile,
    setAssignmentFile,
    intentData,
    setIntentData,
    extractedTags,
    setExtractedTags,
    reset,
    getCurrentRoute,
  };

  return <UserFlowContext.Provider value={value}>{children}</UserFlowContext.Provider>;
}

export function useUserFlow(): UserFlowState {
  const context = useContext(UserFlowContext);
  if (!context) {
    throw new Error('useUserFlow must be used within UserFlowProvider');
  }
  return context;
}
