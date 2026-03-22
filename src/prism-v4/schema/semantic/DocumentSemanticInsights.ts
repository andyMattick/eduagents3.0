export interface DocumentSemanticInsights {
  id: string;           // semanticId
  documentId: string;

  summary: string;      // teacher-facing summary
  keyConcepts: {
    id: string;
    text: string;
    role: "core" | "supporting";
  }[];

  prereqs: string[];    // prerequisite ideas/skills
  misconceptions: string[];

  vocabulary: {
    term: string;
    tier: "basic" | "academic" | "domain";
    note?: string;
  }[];

  difficultyProfile: {
    overall: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
    readingLevel: number | null;
    spikes: {
      sectionId?: string;
      reason: string;
    }[];
  };

  studentTraps: {
    pattern: string;
    whoStruggles: string;
    why: string;
  }[];

  sections: {
    id: string;
    title?: string;
    summary: string;
    difficulty?: "easy" | "medium" | "hard";
  }[];

  metadata: {
    lengthTokens: number;
    domain: string;
    confidence: number;
  };
}
