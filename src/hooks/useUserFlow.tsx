import { createContext, useContext, useState, ReactNode } from 'react';
import { CustomSection } from '../components/Pipeline/SectionBuilder';
import { UnifiedAssessmentResponse } from "@/components/Pipeline/contracts/assessmentContracts";

export type UserGoal = 'create' | 'analyze';

export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface GeneratedProblem {
  id: string;
  sectionId?: string;
  problemText: string;
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed';
  bloomLevel: BloomLevel; // 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create
  questionFormat: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response' | 'fill-blank';
  complexity: 'low' | 'medium' | 'high';
  novelty: 'low' | 'medium' | 'high';
  estimatedTime: number; // minutes
  problemLength: number; // word count
  hasTip: boolean;
  tipText?: string;
  options?: string[]; // for multiple choice
  correctAnswer?: string | string[]; // answer key
  sourceReference?: string;
  rubric?: {
    criteria: string[];
    expectations: string;
  };
}

export interface GeneratedSection {
  sectionId: string;
  sectionName: string;
  instructions: string;
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed' | 'ai-decide';
  problems: GeneratedProblem[];
  includeTips: boolean;
}

export interface GeneratedAssignment {
  assignmentId: string;
  assignmentType: string;
  title: string;
  topic: string;
  estimatedTime: number;
  questionCount: number;
  assessmentType?: 'formative' | 'summative';
  sourceFile?: { name?: string; type?: string };
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
  generatedAssignment: UnifiedAssessmentResponse | null;
  setGeneratedAssignment: (a: UnifiedAssessmentResponse | null) => void;


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

  // Version tracking for before/after comparison
  assignmentVersions: Array<{
    versionNumber: number;
    versionLabel: string; // e.g., "Pre-Analysis (V1)", "Post-Analysis (Final)"
    content: GeneratedAssignment;
    timestamp: string;
    description: string;
  }>;
  saveAssignmentVersion: (versionLabel: string, description: string, assignment: GeneratedAssignment) => void;

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
  const [generatedAssignment, setGeneratedAssignment] = useState<UnifiedAssessmentResponse | null>(null);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [readyForClassroomAnalysis, setReadyForClassroomAnalysis] = useState(false);
  const [classDefinition, setClassDefinition] = useState<any>(null);
  const [studentFeedback, setStudentFeedback] = useState<any[]>([]);
  const [readyForEditing, setReadyForEditing] = useState(false);
  const [readyForRewrite, setReadyForRewrite] = useState(false);
  const [assignmentVersions, setAssignmentVersions] = useState<Array<{
    versionNumber: number;
    versionLabel: string;
    content: GeneratedAssignment;
    timestamp: string;
    description: string;
  }>>([]);

  const saveAssignmentVersion = (versionLabel: string, description: string, assignment: GeneratedAssignment) => {
    const newVersion = {
      versionNumber: assignmentVersions.length + 1,
      versionLabel,
      content: assignment,
      timestamp: new Date().toISOString(),
      description,
    };
    setAssignmentVersions([...assignmentVersions, newVersion]);
  };

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
    setAssignmentVersions([]);
  };

  const getCurrentRoute = (): string => {
    // Step 0: No goal selected - show unified Launchpad
    if (!goal) {
      return '/launchpad';
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
        // After intent capture, generate assignment (stays on /source-aware-intent until generated)
        if (!generatedAssignment) {
          return '/source-aware-intent';
        }
        // After generation, show preview or classroom analysis
        if (generatedAssignment && readyForEditing && !studentFeedback.length) {
          return '/edit-assignment';
        }
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
        // After intent capture, generate assignment (stays on /intent-capture until generated)
        if (!generatedAssignment) {
          return '/intent-capture';
        }
        // After generation, follow same flow as source-based creation
        if (generatedAssignment && readyForEditing && !studentFeedback.length) {
          return '/edit-assignment';
        }
        if (readyForClassroomAnalysis && !studentFeedback.length) {
          return '/class-builder';
        }
        if (studentFeedback.length > 0) {
          if (readyForRewrite) {
            return '/ai-rewrite-placeholder';
          }
          return readyForEditing ? '/edit-assignment' : '/rewrite-assignment';
        }
        return '/assignment-preview';
      }
    } else if (goal === 'analyze') {
      // Analyze existing assignment they authored
      if (hasSourceDocs) {
        // They have reference material to help analyze
        if (!sourceFile || !assignmentFile) {
          return '/source-upload';
        }
        // Both files uploaded, now analyze and generate
        if (!generatedAssignment) {
          return '/assignment-analysis';
        }
        // After generation, show preview
        if (readyForClassroomAnalysis && !studentFeedback.length) {
          return '/class-builder';
        }
        if (studentFeedback.length > 0) {
          if (readyForRewrite) {
            return '/ai-rewrite-placeholder';
          }
          return readyForEditing ? '/edit-assignment' : '/rewrite-assignment';
        }
        return '/assignment-preview';
      } else {
        // Just the assignment to analyze, no reference material
        if (!assignmentFile) {
          return '/assignment-upload';
        }
        // Assignment uploaded, now analyze and generate
        if (!generatedAssignment) {
          return '/assignment-analysis';
        }
        // After generation, show preview
        if (readyForClassroomAnalysis && !studentFeedback.length) {
          return '/class-builder';
        }
        if (studentFeedback.length > 0) {
          if (readyForRewrite) {
            return '/ai-rewrite-placeholder';
          }
          return readyForEditing ? '/edit-assignment' : '/rewrite-assignment';
        }
        return '/assignment-preview';
      }
    }

    return '/launchpad';
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
    assignmentVersions,
    saveAssignmentVersion,
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
