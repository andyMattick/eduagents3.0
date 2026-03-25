	import type { ProblemTagVector } from "../semantic";
    
    export interface Problem {
	  problemId: string;
	  localProblemId?: string;
	  problemGroupId?: string;
	  canonicalProblemId?: string;
	  rootProblemId?: string;
	  parentProblemId?: string | null;
	  problemNumber?: number;
	  partIndex?: number;
	  partLabel?: string;
	  teacherLabel?: string;
	  stemText?: string;
	  partText?: string;
	  displayOrder?: number;
	  createdAt?: string;
	
	  // Raw + cleaned text
	  rawText: string;
	  cleanedText?: string;
	
	  // Optional media
	  mediaUrls?: string[];
	
	  // Answer key
	  correctAnswer?: string | string[] | number | number[] | Record<string, any>;
	  rubric?: {
	    levels: {
	      label: string;
	      description: string;
	      score: number;
	    }[];
	  };
	
	  // Metadata
	  sourceType: "document" | "manual" | "itemBank" | "imported";
	  sourceDocumentId?: string;
	  sourcePageNumber?: number;
	
	  // Link to semantic fingerprint
	  tags?: ProblemTagVector;

	  narrative?: {
		whatProblemAsks?: string;
		reasoningPath?: string;
		studentStruggles?: string;
		complexity?: string;
		skillsTouched?: string;
		connections?: string;
		scaffolding?: string;
		enrichment?: string;
		standards?: string;
		whyThisInterpretation?: string;
	};

  // ⭐ NEW: Differentiation hooks
		scaffolds?: string[];
		enrichments?: string[];

  // ⭐ NEW: Anti-cheating analysis
	antiCheating?: {
		vulnerabilitySummary?: string;
		suggestedChanges?: string[];
	};
	}
