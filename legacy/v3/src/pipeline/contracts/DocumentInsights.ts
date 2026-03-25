export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentSection {
  id: string;
  heading: string;
  content: string;
}

export interface DocumentExample {
  text: string;
  type: "question" | "example" | "worked";
}

export interface DocumentTable {
  id: string;
  preview: string;
}

export interface DocumentDiagram {
  id: string;
  label: string;
}

export interface DocumentInsights {
  rawText: string;
  pages: DocumentPage[];
  sections: DocumentSection[];
  vocab: string[];
  formulas: string[];
  entities: string[];
  examples: DocumentExample[];
  concepts: string[];
  tables: DocumentTable[];
  diagrams: DocumentDiagram[];
  metadata: {
    gradeEstimate: string | null;
    subjectEstimate: string | null;
    topicCandidates: string[];
    difficulty: string | null;
    readingLevel: number | null;
  };
  confidence: Record<string, number>;
  flags: {
    unreadable: boolean;
    partiallyReadable?: boolean;
    scanned: boolean;
    lowConfidence: boolean;
  };
}
