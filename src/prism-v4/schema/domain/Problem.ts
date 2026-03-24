	import type { ProblemTagVector } from "../semantic";
    
    export interface Problem {
	  problemId: string;
	  canonicalProblemId?: string;
	  rootProblemId?: string;
	  parentProblemId?: string;
	  problemNumber?: number;
	  partLabel?: string;
	  teacherLabel?: string;
	  stemText?: string;
	  partText?: string;
	
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
	}
