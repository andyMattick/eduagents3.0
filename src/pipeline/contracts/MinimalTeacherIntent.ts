export interface MinimalTeacherIntent {
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName?: string | null;
  topic: string;
  studentLevel: string;

  assessmentType:
    | "bellRinger"
    | "exitTicket"
    | "quiz"
    | "test"
    | "worksheet"
    | "testReview";

  time: number;

  additionalDetails?: string | null;

  sourceDocuments?: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  exampleAssessment?: {
    id: string;
    content: string;
  };
}
