import { createContext, useContext, useState, ReactNode } from 'react';
import { CustomSection } from '../components/Pipeline/SectionBuilder';

export type UserGoal = 'create' | 'analyze';

export interface GeneratedProblem {
  id: string;
  sectionId?: string; // optional, if grouped by section
  text: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  questionFormat: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response' | 'fill-blank';
  problemType?: 'procedural' | 'conceptual' | 'application' | 'mixed';
  complexity: 'low' | 'medium' | 'high';
  novelty: 'low' | 'medium' | 'high';
  estimatedTimeMinutes: number; // estimated time for this problem
  hasTip: boolean;
  tips?: string;
  sourceReference?: string; // optional: pointer to source doc section
  rubric?: {
    criteria: string[];
    expectations: string;
  };
}

export interface GeneratedSection {
  sectionName: string;
  topic: string;
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed' | 'ai-decide';
  problems: GeneratedProblem[];
  includeTips: boolean;
}

export interface GeneratedAssignment {
  assignmentType: string;
  title: string;
  topic: string;
  estimatedTime: number;
  questionCount: number;
  assessmentType?: 'formative' | 'summative';
  sections: GeneratedSection[];
  bloomDistribution: Record<string, number>;
  organizationMode: 'ai-generated' | 'manual';
  timestamp: string;
}

export interface SourceAwareIntentData {
  // Source-aware assignment intent (used when hasSourceDocs === true)
  assignmentType: 'Test' | 'Quiz' | 'Warm-up' | 'Exit Ticket' | 'Practice Set' | 'Project' | 'Other';
  otherAssignmentType?: string;
  questionCount?: number;
  estimatedTime?: number;
  assessmentType?: 'formative' | 'summative';
  sectionStrategy?: 'manual' | 'ai-generated';
  customSections?: CustomSection[];
  skillsAndStandards?: string[];
}

export interface StandardIntentData {
  // Standard intent (used when hasSourceDocs === false)
  topic: string;
  gradeLevel: string;
  assignmentType: string;
  bloomTargets: string[];
}

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

  // Standard intent capture data (when hasSourceDocs === false)
  intentData: StandardIntentData | null;
  setIntentData: (data: StandardIntentData | null) => void;

  // Source-aware intent capture data (when goal === "create" && hasSourceDocs === true)
  sourceAwareIntentData: SourceAwareIntentData | null;
  setSourceAwareIntentData: (data: SourceAwareIntentData | null) => void;

  // Generated assignment preview data
  generatedAssignment: GeneratedAssignment | null;
  setGeneratedAssignment: (data: GeneratedAssignment | null) => void;

  // Extracted data
  extractedTags: string[];
  setExtractedTags: (tags: string[]) => void;

  // Classroom Analysis & Simulation Results
  readyForClassroomAnalysis: boolean;
  setReadyForClassroomAnalysis: (ready: boolean) => void;

  classDefinition: any;
  setClassDefinition: (classDefinition: any) => void;

  studentFeedback: any[];
  setStudentFeedback: (feedback: any[]) => void;

  readyForEditing: boolean;
  setReadyForEditing: (ready: boolean) => void;

  readyForRewrite: boolean;
  setReadyForRewrite: (ready: boolean) => void;

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
  const [intentData, setIntentData] = useState<StandardIntentData | null>(null);
  const [sourceAwareIntentData, setSourceAwareIntentData] = useState<SourceAwareIntentData | null>(null);
  const [generatedAssignment, setGeneratedAssignment] = useState<GeneratedAssignment | null>(null);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [readyForClassroomAnalysis, setReadyForClassroomAnalysis] = useState(false);
  const [classDefinition, setClassDefinition] = useState<any>(null);
  const [studentFeedback, setStudentFeedback] = useState<any[]>([]);
  const [readyForEditing, setReadyForEditing] = useState(false);
  const [readyForRewrite, setReadyForRewrite] = useState(false);

  const reset = () => {
    setGoal(null);
    setHasSourceDocs(null);
    setSourceFile(null);
    setAssignmentFile(null);
    setIntentData(null);
    setSourceAwareIntentData(null);
    setGeneratedAssignment(null);
    setExtractedTags([]);
    setReadyForClassroomAnalysis(false);
    setClassDefinition(null);
    setStudentFeedback([]);
    setReadyForEditing(false);
    setReadyForRewrite(false);
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
        // After source upload, show source-aware intent capture
        if (!sourceAwareIntentData) {
          return '/source-aware-intent';
        }
        // After intent capture, show assignment preview
        if (!generatedAssignment) {
          return '/generate-assignment';
        }
        // After generation, show preview or classroom analysis
        if (readyForClassroomAnalysis && !studentFeedback.length) {
          return '/class-builder';
        }
        // After simulation, allow editing or go to rewrite
        if (studentFeedback.length > 0) {
          if (readyForRewrite) {
            return '/ai-rewrite-placeholder';
          }
          return readyForEditing ? '/edit-assignment' : '/rewrite-assignment';
        }
        return '/assignment-preview';
      } else {
        // Standard intent capture (no source docs)
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
    sourceAwareIntentData,
    setSourceAwareIntentData,
    generatedAssignment,
    setGeneratedAssignment,
    extractedTags,
    setExtractedTags,
    readyForClassroomAnalysis,
    setReadyForClassroomAnalysis,
    classDefinition,
    setClassDefinition,
    studentFeedback,
    setStudentFeedback,
    readyForEditing,
    setReadyForEditing,
    readyForRewrite,
    setReadyForRewrite,
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
