export interface UnifiedAssessmentRequest {
  // Teacher context
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName: string | null;
  topic: string;

  // Assessment context
  assessmentType:
    | "bellRinger"
    | "exitTicket"
    | "quiz"
    | "test"
    | "worksheet"
    | "testReview";

  studentLevel: string;
  time: number;

  // Additional teacher notes
  additionalDetails: string | null;

  // Optional teacher-provided materials
  sourceDocuments: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  exampleAssessment?: {
    id: string;
    content: string;
  };
}
